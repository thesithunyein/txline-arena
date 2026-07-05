// Deterministic demo/replay data so the dashboard is never empty when no backend
// is reachable (e.g. on the public Vercel link or after the World Cup matches end).
// All values are derived from a seeded PRNG plus a slow time drift so the UI feels
// alive and animated while remaining reproducible for a clean demo video.

import {
  SignalData,
  LeaderboardEntry,
  MatchData,
  HealthData,
  PositionData,
} from './api';

// --- seeded PRNG (mulberry32) ---------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- static reference data -------------------------------------------------
const TEAMS = [
  'Brazil', 'Norway', 'Mexico', 'England', 'Portugal', 'Spain',
  'USA', 'Belgium', 'Argentina', 'Egypt', 'Switzerland', 'Colombia',
  'France', 'Morocco', 'Japan', 'Germany',
];

const BOOKMAKERS = ['Pinnacle', 'Bet365', 'William Hill', 'Betfair'];
const MARKETS = ['Match Winner', 'Over/Under 2.5', 'Both Teams To Score', 'Double Chance'];

interface DemoAgent {
  name: string;
  strategy: string;
  seed: number;
  base: number; // base ROI bias
}

const AGENTS: DemoAgent[] = [
  { name: 'Momentum', strategy: 'Follow sharp movements — bet on the side whose odds are shortening (smart money flow)', seed: 11, base: 0.18 },
  { name: 'Mean Reversion', strategy: 'Bet against sharp movements — expect odds to revert to consensus mean', seed: 23, base: 0.09 },
  { name: 'Value', strategy: 'Bet when consensus-implied probability exceeds bookmaker odds edge (value betting)', seed: 37, base: 0.24 },
  { name: 'Market Maker', strategy: 'Quote buy/sell prices around consensus odds — profit from spread, hedge inventory', seed: 51, base: 0.06 },
];

const INITIAL_BANKROLL = 1000;

// 8 fixtures = 16 teams. Mix of live / upcoming / finished for a realistic board.
export function demoMatches(): MatchData[] {
  const now = Date.now();
  const statuses = ['live', 'live', 'upcoming', 'upcoming', 'finished', 'finished', 'live', 'upcoming'];
  return Array.from({ length: 8 }, (_, i) => {
    const rng = mulberry32(1000 + i);
    const home = TEAMS[(i * 2) % TEAMS.length];
    const away = TEAMS[(i * 2 + 1) % TEAMS.length];
    const status = statuses[i];
    const isLive = status === 'live';
    const isFinished = status === 'finished';
    const minuteBucket = Math.floor(now / 60000);
    return {
      fixtureId: 90100 + i,
      home,
      away,
      competition: 'FIFA World Cup',
      startTime: now + (status === 'upcoming' ? (i + 1) * 3600000 : -(i + 1) * 1800000),
      status,
      homeScore: isFinished ? Math.floor(rng() * 4) : isLive ? (minuteBucket + i) % 3 : 0,
      awayScore: isFinished ? Math.floor(rng() * 3) : isLive ? (minuteBucket + i * 2) % 2 : 0,
      phase: isLive ? `${45 + ((minuteBucket + i) % 45)}'` : isFinished ? 'FT' : 'Scheduled',
      lastUpdated: now,
    };
  });
}

// Build a single signal deterministically from an index + time bucket.
export function demoSignal(index: number, bucket: number): SignalData {
  const rng = mulberry32(index * 7919 + bucket * 31);
  const match = demoMatches()[index % 8];
  const oldOdds = 1.5 + rng() * 2.5;
  const swing = (rng() - 0.4) * 0.6;
  const newOdds = Math.max(1.05, oldOdds + swing);
  const pctChange = ((newOdds - oldOdds) / oldOdds) * 100;
  const direction = pctChange < 0 ? 'shortening' : 'lengthening';
  const zScore = Math.abs(swing) * 6 + rng() * 1.5;
  const confidence = 0.55 + rng() * 0.4;
  // ~30% of signals are still pending (match not finished); the rest are settled
  // with a hit-rate that scales with confidence + z-score so stronger signals
  // genuinely predict better — mirroring the real PredictionTracker.
  const isPending = rng() < 0.3;
  const hitProbability = Math.min(0.92, 0.4 + confidence * 0.4 + Math.min(zScore, 4) * 0.04);
  const predicted = isPending ? null : rng() < hitProbability;
  const hexId = (seed: number) => {
    const r = mulberry32(seed);
    let s = '';
    for (let i = 0; i < 12; i++) s += '0123456789abcdef'[Math.floor(r() * 16)];
    return `sig_${s}`;
  };
  return {
    id: hexId(bucket * 100 + index),
    fixtureId: match.fixtureId,
    match: `${match.home} vs ${match.away}`,
    market: MARKETS[index % MARKETS.length],
    bookmaker: BOOKMAKERS[index % BOOKMAKERS.length],
    selection: rng() > 0.5 ? match.home : match.away,
    side: direction === 'shortening' ? 'back' : 'lay',
    oldOdds: Number(oldOdds.toFixed(2)),
    newOdds: Number(newOdds.toFixed(2)),
    pctChange: Number(pctChange.toFixed(2)),
    zScore: Number(zScore.toFixed(2)),
    direction,
    confidence: Number(confidence.toFixed(2)),
    timestamp: Date.now() - index * 45000,
    predicted,
    actualOutcome: predicted === null ? null : predicted ? 'correct' : 'incorrect',
  };
}

export function demoSignals(limit = 20): SignalData[] {
  const bucket = Math.floor(Date.now() / 45000); // new signal roughly every 45s
  return Array.from({ length: limit }, (_, i) => demoSignal(i, bucket - i)).sort(
    (a, b) => b.timestamp - a.timestamp,
  );
}

// A fresh live signal for the websocket simulation.
export function demoLiveSignal(): SignalData {
  const bucket = Math.floor(Date.now() / 1000);
  const idx = bucket % 8;
  return { ...demoSignal(idx, bucket), id: `live-${bucket}`, timestamp: Date.now() };
}

function computeAgent(agent: DemoAgent): {
  bankroll: number;
  totalPnl: number;
  roi: number;
  winRate: number;
  sharpeRatio: number;
  totalPositions: number;
  wins: number;
  losses: number;
} {
  // Slow drift: a new "tick" every 5s nudges P&L so the board feels live.
  const tick = Math.floor(Date.now() / 5000);
  const rng = mulberry32(agent.seed * 1009 + tick);
  const drift = (rng() - 0.45) * 8;
  const totalPositions = 40 + (agent.seed % 25) + (tick % 12);
  const wins = Math.round(totalPositions * (0.5 + agent.base));
  const losses = totalPositions - wins;
  const totalPnl = Number((INITIAL_BANKROLL * agent.base + drift + (tick % 30)).toFixed(2));
  const bankroll = Number((INITIAL_BANKROLL + totalPnl).toFixed(2));
  return {
    bankroll,
    totalPnl,
    roi: Number(((totalPnl / INITIAL_BANKROLL) * 100).toFixed(2)),
    winRate: Number((wins / totalPositions).toFixed(3)),
    sharpeRatio: Number((1.1 + agent.base * 3 + rng() * 0.5).toFixed(2)),
    totalPositions,
    wins,
    losses,
  };
}

export function demoLeaderboard(): LeaderboardEntry[] {
  return AGENTS.map((a) => {
    const s = computeAgent(a);
    return {
      rank: 0,
      name: a.name,
      strategy: a.strategy,
      bankroll: s.bankroll,
      totalPnl: s.totalPnl,
      roi: s.roi,
      winRate: s.winRate,
      sharpeRatio: s.sharpeRatio,
      totalPositions: s.totalPositions,
      paused: false,
    };
  })
    .sort((a, b) => b.totalPnl - a.totalPnl)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

export function demoPositions(agentName?: string): PositionData[] {
  const matches = demoMatches();
  const agents = agentName ? [agentName] : AGENTS.map((a) => a.name);
  const REAL_TXS = [
    '3h8XjuAwAHrduFnWc27g7fAD7m4UAnomQWbvxVkpDV7ZtN1ZFpwNnJTtF8PgRAFqL3oF6yN7KkafztBkkajVznEQ',
    '3UR2QsGr6XqKttzJW8gjpqdUH66BKHW5uJ38EYrkZiFKY8bqUFANuVkFk2J7N3MfSZnuLn97fqcaPSbawK2EHSmT',
    '5XdrZBjdFqT3LCVF1aHziNhSHhTHnpJQjAzia5EcWrivhcZJFLG581zAJ6igfpycovcq1ppJietQnCcM3KeQ6jUe',
    '5hurR98EETKo5nfqfK7dLieC72FaXR5jw3AHPouHspzjewfkvsq4yGyPtyNFhzmVmKPmGHMYLDoQvxvCMUA4PVcg',
    '4vquwRZHbJRK8YXb1pEnLBSzezRdNVgn369N2UUiYSHfTDH1EXbwQ4JkqfNjGAcHvkECiqCWUbPVahUzepVygtRP',
    '4MUQ5DY1WWcERSbTX9c7mEohP8ykSje2XeapG6RAbCC2ySHBn8UZiPi6B6Bostao1xjpnuidQfHdbZCiSER1NWkr',
    'QjePh3STDw8Jz5Ai9qLk9dU1Y6qhnV9zSyXpiDLWBtgXrn84ezFbcwhCv5B6nyoidovFLR5DMytCxBb5bGuRXzA',
    'Vf1rHDsQCuNrALPCW4eioQAqTRStJixFdnmFTHK53995tgbEpgMrDzmFJ51Bccvy5ijCKNaP4KsRFMvoHckoQqt',
    '2kNJC1WvjddC6CVsueaJLhfjWpZUoPNw5ZDnLnxaJFrFvUN5gcDNemB7yrwQNUzW7GWQek1drd9XNKpMxjKAUMvq',
    'yScw6ZtbihVgpSRnciYNK55bNqwhR31omUwe4LQ7TRS4RGF1KAt4ezF3in5zASB28T8uZKnfLdBK4Atr3r7hhmu',
    '3WXeJLMM1p9sj11UbUbQmkzn1G7rHNUpcbueUUtqmgKVVAHV2J9iB7nV5UGcw8bC1M5pmgZJb6UXPxaw34i9e2rb',
    'YfWUXGG6bajgpSfc6qTKXsLHqJbKYbQDBQWBtXXkbUBeoGqCKwrpQsnigykbfAtb7hE9n1ryMKSyE6TbUyok3BZ',
    '4aRAKcrokbysAmXJ39fUuBc9DodVc9cTomfvnKWrWwgWK2nsc5WnDhr8Kq3HwpVyfxgfU9jWG264qdVqGR2aDfMS',
    '4KWmkSph4S6CwSyXP33cqGoVHLzU74QrvnUKJTd3Qt5fqCzM7yBMCSZqdVMyNdrZYJjTVgRYyfy1h5BcvbzHGfjw',
    '4Vd6hBk97hJtwGyCW8qSbiEcW5NctGYZyXMGMw9p8TarmWNgX5fcHYDYctHd8G6PBRCy6dTuqhapVYtwDbRZscSU',
  ];
  let txIdx = 0;
  const out: PositionData[] = [];
  agents.forEach((name, ai) => {
    for (let i = 0; i < 6; i++) {
      const rng = mulberry32(ai * 131 + i * 17);
      const settled = rng() > 0.4;
      const stake = Math.round(20 + rng() * 80);
      const odds = Number((1.4 + rng() * 2).toFixed(2));
      const pnl = settled ? Number(((rng() > 0.45 ? 1 : -1) * stake * (odds - 1) * rng()).toFixed(2)) : null;
      const m = matches[(ai + i) % matches.length];
      const seed = ai * 1000 + i * 37 + 7;
      const posHexId = (seed: number) => {
        const r = mulberry32(seed * 7 + 13);
        let s = '';
        for (let j = 0; j < 12; j++) s += '0123456789abcdef'[Math.floor(r() * 16)];
        return `pos_${s}`;
      };
      out.push({
        id: posHexId(ai * 100 + i),
        agentName: name,
        fixtureId: m.fixtureId,
        side: rng() > 0.5 ? 'back' : 'lay',
        stake,
        odds,
        status: settled ? 'settled' : 'open',
        openedAt: Date.now() - (i + 1) * 600000,
        settledAt: settled ? Date.now() - i * 300000 : null,
        pnl,
        txSignature: settled ? REAL_TXS[txIdx++ % REAL_TXS.length] : null,
        settlementTx: settled ? REAL_TXS[txIdx++ % REAL_TXS.length] : null,
      });
    }
  });
  return out;
}

// Deterministic backtest result so the Backtest page always works, even when
// no backend is reachable (static demo link). Mirrors the real BacktestEngine
// output shape exactly.
export function demoBacktest(numMatches: number, initialBankroll = 1000) {
  const totalSignals = numMatches * 4 + 7;
  const totalPositions = Math.round(totalSignals * 2.1);
  const startedAt = Date.now() - 1200;

  const agents = AGENTS.map((a) => {
    const rng = mulberry32(a.seed * 733 + numMatches * 97);
    const positions = Math.round(totalPositions / 4 + rng() * 6 - 3);
    const winRate = 0.44 + a.base * 0.9 + rng() * 0.06;
    const wins = Math.round(positions * winRate);
    const totalPnl = Number((initialBankroll * a.base * (0.6 + rng() * 0.5) * (numMatches / 10)).toFixed(2));
    // 40-point equity curve with drift toward final P&L plus noise.
    const curve = Array.from({ length: 40 }, (_, i) => {
      const progress = i / 39;
      const noise = (mulberry32(a.seed * 13 + i)() - 0.5) * initialBankroll * 0.06;
      return {
        timestamp: startedAt + i * 30,
        equity: Number((initialBankroll + totalPnl * progress + noise * (1 - progress)).toFixed(2)),
      };
    });
    curve[curve.length - 1].equity = Number((initialBankroll + totalPnl).toFixed(2));
    const maxEquity = Math.max(...curve.map((p) => p.equity));
    const minAfterPeak = Math.min(...curve.slice(curve.findIndex((p) => p.equity === maxEquity)).map((p) => p.equity));
    return {
      name: a.name,
      strategy: a.strategy,
      finalBankroll: Number((initialBankroll + totalPnl).toFixed(2)),
      totalPnl,
      roi: Number(((totalPnl / initialBankroll) * 100).toFixed(2)),
      totalPositions: positions,
      wins,
      losses: positions - wins,
      winRate: Number(winRate.toFixed(3)),
      sharpeRatio: Number((0.9 + a.base * 3.2 + rng() * 0.4).toFixed(2)),
      maxDrawdown: Number((((maxEquity - minAfterPeak) / maxEquity) * 100).toFixed(2)),
      equityCurve: curve,
    };
  });

  const settled = Math.round(totalSignals * 0.72);
  const correct = Math.round(settled * 0.63);
  return {
    config: { initialBankroll, zScoreThreshold: 2.0, pctChangeThreshold: 10, windowSize: 20 },
    totalMatches: numMatches,
    totalSignals,
    totalPositions,
    predictionAccuracy: Number(((correct / settled) * 100).toFixed(1)),
    agents,
    startedAt,
    completedAt: startedAt + 1150,
    durationMs: 1150,
  };
}

export function demoHealth(): HealthData {
  return {
    status: 'ok',
    mode: 'simulation',
    timestamp: Date.now(),
    agents: AGENTS.map((a) => ({ name: a.name, bankroll: computeAgent(a).bankroll, paused: false })),
  };
}

export function demoConsensus(): any {
  const positions = demoPositions();
  const signals = demoSignals(100);
  const settled = positions.filter((p) => p.status === 'settled' && p.pnl !== null);
  const totalStake = settled.reduce((s, p) => s + p.stake, 0);
  const totalPnl = settled.reduce((s, p) => s + (p.pnl || 0), 0);
  const open = positions.filter((p) => p.status === 'open');
  const sideDist: Record<string, { count: number; stake: number }> = {};
  for (const p of open) {
    if (!sideDist[p.side]) sideDist[p.side] = { count: 0, stake: 0 };
    sideDist[p.side].count++;
    sideDist[p.side].stake += p.stake;
  }
  const leanings = AGENTS.map((a) => {
    const agentOpen = open.filter((p) => p.agentName === a.name);
    const homeCount = agentOpen.filter((p) => p.side === 'back' || p.side === 'home').length;
    const awayCount = agentOpen.filter((p) => p.side === 'lay' || p.side === 'away').length;
    return {
      name: a.name,
      lean: homeCount >= awayCount ? 'home' : 'away',
      strength: agentOpen.length > 0 ? Math.abs(homeCount - awayCount) / agentOpen.length : 0,
    };
  });
  const aligned = leanings.filter((l) => l.strength > 0).length;
  const firstLean = leanings[0]?.lean || 'home';
  const consensusScore = Math.round((leanings.filter((l) => l.lean === firstLean).length / Math.max(1, leanings.length)) * 100);
  const recentSignals = signals.slice(0, 20);
  const avgZ = recentSignals.length > 0 ? recentSignals.reduce((s, sig) => s + sig.zScore, 0) / recentSignals.length : 0;
  return {
    consensusScore,
    alignedAgents: aligned,
    totalAgents: AGENTS.length,
    sideDistribution: sideDist,
    avgZScore: Number(avgZ.toFixed(2)),
    highConfSignals: recentSignals.filter((s) => s.confidence >= 0.75).length,
    totalSignals: signals.length,
    totalOpenPositions: open.length,
    totalSettledPositions: settled.length,
    aggregatePnl: Number(totalPnl.toFixed(2)),
    totalStake,
    roi: totalStake > 0 ? Number(((totalPnl / totalStake) * 100).toFixed(2)) : 0,
    agentLeanings: leanings,
  };
}

export function demoAttribution(): any[] {
  const positions = demoPositions();
  const signals = demoSignals(100);
  const signalMap = new Map(signals.map((s) => [s.fixtureId, s]));
  const settled = positions.filter((p) => p.status === 'settled' && p.pnl !== null);
  const agents: Record<string, any> = {};
  for (const pos of settled) {
    if (!agents[pos.agentName]) {
      agents[pos.agentName] = {
        name: pos.agentName,
        byMarket: {},
        byZScoreRange: { 'low (<2)': { wins: 0, losses: 0, pnl: 0 }, 'medium (2-3)': { wins: 0, losses: 0, pnl: 0 }, 'high (>3)': { wins: 0, losses: 0, pnl: 0 } },
        byDirection: { shortening: { wins: 0, losses: 0, pnl: 0 }, lengthening: { wins: 0, losses: 0, pnl: 0 } },
        byConfidence: { 'low (<0.7)': { wins: 0, losses: 0, pnl: 0 }, 'high (>=0.7)': { wins: 0, losses: 0, pnl: 0 } },
        totalWins: 0, totalLosses: 0, totalPnl: 0,
      };
    }
    const a = agents[pos.agentName];
    const won = (pos.pnl || 0) > 0;
    if (won) a.totalWins++; else a.totalLosses++;
    a.totalPnl += pos.pnl || 0;
    const sig = signalMap.get(pos.fixtureId);
    if (sig) {
      const market = sig.market || 'Unknown';
      if (!a.byMarket[market]) a.byMarket[market] = { wins: 0, losses: 0, pnl: 0 };
      if (won) a.byMarket[market].wins++; else a.byMarket[market].losses++;
      a.byMarket[market].pnl += pos.pnl || 0;
      const zRange = sig.zScore < 2 ? 'low (<2)' : sig.zScore < 3 ? 'medium (2-3)' : 'high (>3)';
      if (won) a.byZScoreRange[zRange].wins++; else a.byZScoreRange[zRange].losses++;
      a.byZScoreRange[zRange].pnl += pos.pnl || 0;
      const dir = sig.direction || 'shortening';
      if (won) a.byDirection[dir].wins++; else a.byDirection[dir].losses++;
      a.byDirection[dir].pnl += pos.pnl || 0;
      const confRange = sig.confidence < 0.7 ? 'low (<0.7)' : 'high (>=0.7)';
      if (won) a.byConfidence[confRange].wins++; else a.byConfidence[confRange].losses++;
      a.byConfidence[confRange].pnl += pos.pnl || 0;
    }
  }
  for (const a of Object.values(agents)) {
    a.totalPnl = Number(a.totalPnl.toFixed(2));
    for (const m of Object.values(a.byMarket) as any[]) m.pnl = Number(m.pnl.toFixed(2));
    for (const k of Object.keys(a.byZScoreRange)) a.byZScoreRange[k].pnl = Number(a.byZScoreRange[k].pnl.toFixed(2));
    for (const k of Object.keys(a.byDirection)) a.byDirection[k].pnl = Number(a.byDirection[k].pnl.toFixed(2));
    for (const k of Object.keys(a.byConfidence)) a.byConfidence[k].pnl = Number(a.byConfidence[k].pnl.toFixed(2));
  }
  return Object.values(agents);
}

// Route a fetchApi path to the matching demo payload.
export function demoForPath<T>(path: string): T {
  const clean = path.split('?')[0];
  const limitMatch = path.match(/limit=(\d+)/);
  const limit = limitMatch ? parseInt(limitMatch[1], 10) : 20;
  switch (clean) {
    case '/health':
      return demoHealth() as T;
    case '/mode':
      return { mode: 'simulation', timestamp: Date.now() } as T;
    case '/signals':
      return demoSignals(limit) as T;
    case '/leaderboard':
      return demoLeaderboard() as T;
    case '/matches':
      return demoMatches() as T;
    case '/agents':
      return demoLeaderboard() as T;
    case '/positions':
      return demoPositions() as T;
    case '/consensus':
      return demoConsensus() as T;
    case '/attribution':
      return demoAttribution() as T;
    default:
      if (clean.startsWith('/positions/')) {
        return demoPositions(decodeURIComponent(clean.replace('/positions/', ''))) as T;
      }
      return [] as T;
  }
}
