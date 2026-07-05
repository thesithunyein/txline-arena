import { getDb } from './database';
import { SignalRecord, PositionRecord, AgentRecord, MatchRecord } from './schema';

const BOOKMAKERS = ['Pinnacle', 'Bet365', 'William Hill', 'Betfair'];
const MARKETS = ['Match Winner', 'Over/Under 2.5', 'Both Teams To Score', 'Double Chance'];
const AGENT_NAMES = ['Momentum', 'Mean Reversion', 'Value', 'Market Maker'];
const AGENT_STRATEGIES: Record<string, string> = {
  'Momentum': 'Follow sharp movements — bet on the side whose odds are shortening (smart money flow)',
  'Mean Reversion': 'Bet against sharp movements — expect odds to revert to consensus mean',
  'Value': 'Bet when consensus-implied probability exceeds bookmaker odds edge (value betting)',
  'Market Maker': 'Quote buy/sell prices around consensus odds — profit from spread, hedge inventory',
};

function seededRandom(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateTxSignature(rng: () => number): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let sig = '';
  for (let i = 0; i < 88; i++) {
    sig += chars[Math.floor(rng() * chars.length)];
  }
  return sig;
}

function generateId(prefix: string, rng: () => number): string {
  const chars = '0123456789abcdef';
  let id = `${prefix}_`;
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(rng() * chars.length)];
  }
  return id;
}

export async function seedIfEmpty(matches: MatchRecord[]): Promise<boolean> {
  const db = await getDb();

  if (db.data.signals.length > 0) {
    return false;
  }

  console.log('[SEED] Database is empty — seeding historical data for demo...');

  const rng = seededRandom(42);
  const now = Date.now();
  const signals: SignalRecord[] = [];
  const positions: PositionRecord[] = [];
  const agents: AgentRecord[] = [];

  // Use real fixture IDs from TxLINE, fall back to synthetic if none
  const fixtureIds = matches.length > 0
    ? matches.slice(0, 6).map(m => ({ fixtureId: m.fixtureId, home: m.home, away: m.away }))
    : [
        { fixtureId: 18187298, home: 'Brazil', away: 'Norway' },
        { fixtureId: 18192996, home: 'Mexico', away: 'England' },
        { fixtureId: 18198205, home: 'Portugal', away: 'Spain' },
        { fixtureId: 18193785, home: 'USA', away: 'Belgium' },
        { fixtureId: 18202701, home: 'Argentina', away: 'Egypt' },
        { fixtureId: 18202783, home: 'Switzerland', away: 'Colombia' },
      ];

  // Generate 120 signals over the past 12 hours
  for (let i = 0; i < 120; i++) {
    const fixture = fixtureIds[i % fixtureIds.length];
    const oldOdds = 1.5 + rng() * 2.5;
    const swing = (rng() - 0.4) * 0.6;
    const newOdds = Math.max(1.05, oldOdds + swing);
    const pctChange = ((newOdds - oldOdds) / oldOdds) * 100;
    const direction = pctChange < 0 ? 'shortening' : 'lengthening';
    const zScore = Math.abs(swing) * 6 + rng() * 1.5;
    const confidence = Math.min(1, 0.55 + rng() * 0.4);
    const isPending = rng() < 0.15;
    const hitProb = Math.min(0.92, 0.4 + confidence * 0.4 + Math.min(zScore, 4) * 0.04);
    const predicted = isPending ? null : rng() < hitProb;
    const side = direction === 'shortening' ? 'home' : 'away';
    const selection = rng() > 0.5 ? fixture.home : fixture.away;
    const market = MARKETS[i % MARKETS.length];
    const bookmaker = BOOKMAKERS[i % BOOKMAKERS.length];
    const timestamp = now - (120 - i) * 180000 - Math.floor(rng() * 60000);

    signals.push({
      id: generateId('sig', rng),
      fixtureId: fixture.fixtureId,
      match: `${fixture.home} vs ${fixture.away}`,
      market,
      bookmaker,
      selection,
      side,
      oldOdds: Number(oldOdds.toFixed(2)),
      newOdds: Number(newOdds.toFixed(2)),
      pctChange: Number(pctChange.toFixed(2)),
      zScore: Number(zScore.toFixed(2)),
      direction,
      confidence: Number(confidence.toFixed(2)),
      timestamp,
      predicted,
      actualOutcome: predicted === null ? null : predicted ? 'correct' : 'incorrect',
    });
  }

  // Generate positions for each agent
  const agentStats: Record<string, { pnl: number; positions: number; wins: number; losses: number; bankroll: number }> = {};
  for (const name of AGENT_NAMES) {
    agentStats[name] = { pnl: 0, positions: 0, wins: 0, losses: 0, bankroll: 1000 };
  }

  for (let i = 0; i < 60; i++) {
    const agentName = AGENT_NAMES[i % AGENT_NAMES.length];
    const fixture = fixtureIds[i % fixtureIds.length];
    const settled = rng() > 0.3;
    const stake = Math.round(20 + rng() * 80);
    const odds = Number((1.4 + rng() * 2).toFixed(2));
    const side = rng() > 0.5 ? 'home' : 'away';
    const won = settled ? rng() > 0.45 : false;
    const pnl = settled ? Number((won ? stake * (odds - 1) : -stake).toFixed(2)) : null;
    const openedAt = now - (60 - i) * 360000 - Math.floor(rng() * 120000);
    const settledAt = settled ? openedAt + Math.floor(rng() * 300000) : null;
    const txSig = settled ? generateTxSignature(rng) : null;

    positions.push({
      id: generateId('pos', rng),
      agentName,
      fixtureId: fixture.fixtureId,
      side,
      stake,
      odds,
      status: settled ? 'settled' : 'open',
      openedAt,
      settledAt,
      pnl,
      txSignature: null,
      settlementTx: txSig,
    });

    if (settled && pnl !== null) {
      agentStats[agentName].pnl += pnl;
      agentStats[agentName].positions += 1;
      if (won) agentStats[agentName].wins += 1;
      else agentStats[agentName].losses += 1;
      agentStats[agentName].bankroll += pnl;
    }
  }

  // Build agent records
  for (const name of AGENT_NAMES) {
    const s = agentStats[name];
    const totalPositions = s.positions + Math.floor(rng() * 5);
    const winRate = s.positions > 0 ? s.wins / s.positions : 0;
    agents.push({
      name,
      strategy: AGENT_STRATEGIES[name],
      bankroll: Number(s.bankroll.toFixed(2)),
      tokenAccount: null,
      totalPnl: Number(s.pnl.toFixed(2)),
      totalPositions,
      wins: s.wins,
      losses: s.losses,
      consecutiveLosses: 0,
      paused: false,
      pausedUntil: null,
    });
  }

  // Write to DB
  db.data.signals = signals;
  db.data.positions = positions;
  db.data.agents = agents;
  await db.write();

  console.log(`[SEED] Seeded ${signals.length} signals, ${positions.length} positions, ${agents.length} agents`);
  return true;
}
