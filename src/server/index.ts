import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { ArenaManager, ArenaEvent } from '../arena/manager';
import { getRecentSignals, getAgentPositions, getLeaderboard as getDbLeaderboard, getMatches, getAllPositions } from '../db/database';
import { BacktestEngine, generateSyntheticBacktestData } from '../backtest/engine';

function computeConsensusIndex(positions: any[], signals: any[]): any {
  const settled = positions.filter((p) => p.status === 'settled' && p.pnl !== null);
  const totalStake = settled.reduce((s, p) => s + p.stake, 0);
  const totalPnl = settled.reduce((s, p) => s + p.pnl, 0);

  // Aggregate positions by side to see where smart money is leaning
  const openPositions = positions.filter((p) => p.status === 'open');
  const sideCounts: Record<string, { count: number; stake: number }> = {};
  for (const p of openPositions) {
    if (!sideCounts[p.side]) sideCounts[p.side] = { count: 0, stake: 0 };
    sideCounts[p.side].count++;
    sideCounts[p.side].stake += p.stake;
  }

  // Per-agent consensus: are agents aligned or diverging?
  const agentPositions: Record<string, any[]> = {};
  for (const p of openPositions) {
    if (!agentPositions[p.agentName]) agentPositions[p.agentName] = [];
    agentPositions[p.agentName].push(p);
  }

  // Confidence: 0-100 based on agreement among agents
  const agentLeanings = Object.entries(agentPositions).map(([name, positions]) => {
    const homeCount = positions.filter(p => p.side === 'home').length;
    const awayCount = positions.filter(p => p.side === 'away').length;
    return { name, lean: homeCount > awayCount ? 'home' : 'away', strength: Math.abs(homeCount - awayCount) / Math.max(1, positions.length) };
  });
  const alignedAgents = agentLeanings.filter(a => a.strength > 0).length;
  const consensusScore = agentLeanings.length > 0
    ? Math.round((agentLeanings.filter(a => a.lean === agentLeanings[0]?.lean).length / agentLeanings.length) * 100)
    : 0;

  // Signal strength: average z-score of recent signals
  const recentSignals = signals.slice(0, 20);
  const avgZScore = recentSignals.length > 0
    ? Number((recentSignals.reduce((s, sig) => s + sig.zScore, 0) / recentSignals.length).toFixed(2))
    : 0;
  const highConfSignals = recentSignals.filter(s => s.confidence >= 0.75).length;

  return {
    consensusScore,
    alignedAgents,
    totalAgents: Object.keys(agentPositions).length || 4,
    sideDistribution: sideCounts,
    avgZScore,
    highConfSignals,
    totalSignals: signals.length,
    totalOpenPositions: openPositions.length,
    totalSettledPositions: settled.length,
    aggregatePnl: Number(totalPnl.toFixed(2)),
    totalStake: totalStake,
    roi: totalStake > 0 ? Number(((totalPnl / totalStake) * 100).toFixed(2)) : 0,
    agentLeanings,
  };
}

function computeAttribution(positions: any[], signals: any[]): any {
  // Performance attribution: which signal characteristics drive each agent's edge
  const settled = positions.filter((p) => p.status === 'settled' && p.pnl !== null);
  const signalMap = new Map(signals.map(s => [s.fixtureId, s]));

  const agents: Record<string, any> = {};
  for (const pos of settled) {
    if (!agents[pos.agentName]) {
      agents[pos.agentName] = {
        name: pos.agentName,
        byMarket: {} as Record<string, { wins: number; losses: number; pnl: number }>,
        byZScoreRange: { 'low (<2)': { wins: 0, losses: 0, pnl: 0 }, 'medium (2-3)': { wins: 0, losses: 0, pnl: 0 }, 'high (>3)': { wins: 0, losses: 0, pnl: 0 } },
        byDirection: { shortening: { wins: 0, losses: 0, pnl: 0 }, lengthening: { wins: 0, losses: 0, pnl: 0 } },
        byConfidence: { 'low (<0.7)': { wins: 0, losses: 0, pnl: 0 }, 'high (>=0.7)': { wins: 0, losses: 0, pnl: 0 } },
        totalWins: 0, totalLosses: 0, totalPnl: 0,
      };
    }
    const a = agents[pos.agentName];
    const won = pos.pnl > 0;
    if (won) a.totalWins++; else a.totalLosses++;
    a.totalPnl += pos.pnl;

    // Match signal to position via fixtureId
    const sig = signalMap.get(pos.fixtureId);
    if (sig) {
      // By market
      const market = sig.market || 'Unknown';
      if (!a.byMarket[market]) a.byMarket[market] = { wins: 0, losses: 0, pnl: 0 };
      if (won) a.byMarket[market].wins++; else a.byMarket[market].losses++;
      a.byMarket[market].pnl += pos.pnl;

      // By z-score range
      const zRange = sig.zScore < 2 ? 'low (<2)' : sig.zScore < 3 ? 'medium (2-3)' : 'high (>3)';
      if (won) a.byZScoreRange[zRange].wins++; else a.byZScoreRange[zRange].losses++;
      a.byZScoreRange[zRange].pnl += pos.pnl;

      // By direction
      const dir = sig.direction || 'shortening';
      if (won) a.byDirection[dir].wins++; else a.byDirection[dir].losses++;
      a.byDirection[dir].pnl += pos.pnl;

      // By confidence
      const confRange = sig.confidence < 0.7 ? 'low (<0.7)' : 'high (>=0.7)';
      if (won) a.byConfidence[confRange].wins++; else a.byConfidence[confRange].losses++;
      a.byConfidence[confRange].pnl += pos.pnl;
    }
  }

  // Round pnl values
  for (const a of Object.values(agents)) {
    a.totalPnl = Number(a.totalPnl.toFixed(2));
    for (const m of Object.values(a.byMarket) as any[]) m.pnl = Number(m.pnl.toFixed(2));
    for (const k of Object.keys(a.byZScoreRange)) a.byZScoreRange[k].pnl = Number(a.byZScoreRange[k].pnl.toFixed(2));
    for (const k of Object.keys(a.byDirection)) a.byDirection[k].pnl = Number(a.byDirection[k].pnl.toFixed(2));
    for (const k of Object.keys(a.byConfidence)) a.byConfidence[k].pnl = Number(a.byConfidence[k].pnl.toFixed(2));
  }

  return Object.values(agents);
}

export class Server {
  private app: express.Application;
  private httpServer: http.Server;
  private wss: WebSocketServer;
  private arena: ArenaManager;
  private wsClients: Set<WebSocket> = new Set();
  private port: number;

  constructor(arena: ArenaManager, port: number = 3001) {
    this.port = port;
    this.arena = arena;
    this.app = express();
    this.httpServer = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.httpServer, path: '/ws' });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    const healthHandler = (_req: any, res: any) => {
      res.json({
        status: 'ok',
        mode: process.env.LIVE_MODE === 'true' ? 'live' : 'simulation',
        timestamp: Date.now(),
        agents: this.arena.getAgents().map((a) => ({
          name: a.name,
          bankroll: a.getBankroll(),
          paused: a.isPaused(),
        })),
      });
    };

    this.app.get('/health', healthHandler);
    this.app.get('/api/health', healthHandler);

    this.app.get('/api/signals', async (_req, res) => {
      const limit = parseInt(_req.query.limit as string) || 50;
      res.json(await getRecentSignals(limit));
    });

    this.app.get('/api/agents', async (_req, res) => {
      const inMemory = this.arena.getAgents().map((a) => a.getStats());
      const dbAgents = await getDbLeaderboard();
      const dbMap = new Map(dbAgents.map(a => [a.name, a]));
      const merged = inMemory.map(stats => {
        const db = dbMap.get(stats.name);
        if (db) {
          return {
            ...stats,
            bankroll: db.bankroll,
            totalPnl: db.totalPnl,
            totalPositions: db.totalPositions,
            wins: db.wins,
            losses: db.losses,
            winRate: db.totalPositions > 0 ? db.wins / db.totalPositions : 0,
            roi: db.bankroll > 0 ? (db.totalPnl / (db.bankroll - db.totalPnl)) * 100 : 0,
            paused: db.paused,
          };
        }
        return stats;
      });
      res.json(merged);
    });

    this.app.get('/api/agents/:name/positions', async (req, res) => {
      const status = req.query.status as string | undefined;
      res.json(await getAgentPositions(req.params.name, status));
    });

    this.app.get('/api/positions', async (_req, res) => {
      res.json(await getAllPositions());
    });

    this.app.get('/api/leaderboard', async (_req, res) => {
      const inMemory = this.arena.getLeaderboard().getRankings();
      const dbAgents = await getDbLeaderboard();
      const dbMap = new Map(dbAgents.map(a => [a.name, a]));
      const merged = inMemory.map(entry => {
        const db = dbMap.get(entry.name);
        if (db) {
          return {
            ...entry,
            bankroll: db.bankroll,
            totalPnl: db.totalPnl,
            totalPositions: db.totalPositions,
            winRate: db.totalPositions > 0 ? db.wins / db.totalPositions : 0,
            roi: db.bankroll > 0 ? (db.totalPnl / (db.bankroll - db.totalPnl)) * 100 : 0,
            paused: db.paused,
          };
        }
        return entry;
      });
      merged.sort((a, b) => b.totalPnl - a.totalPnl);
      merged.forEach((e, i) => { e.rank = i + 1; });
      res.json(merged);
    });

    this.app.get('/api/matches', async (_req, res) => {
      res.json(await getMatches());
    });

    this.app.get('/api/consensus', async (_req, res) => {
      const [positions, signals] = await Promise.all([getAllPositions(), getRecentSignals(200)]);
      res.json(computeConsensusIndex(positions, signals));
    });

    this.app.get('/api/attribution', async (_req, res) => {
      const [positions, signals] = await Promise.all([getAllPositions(), getRecentSignals(200)]);
      res.json(computeAttribution(positions, signals));
    });

    this.app.get('/api/mode', (_req, res) => {
      res.json({
        mode: process.env.LIVE_MODE === 'true' ? 'live' : 'simulation',
        timestamp: Date.now(),
      });
    });

    this.app.post('/api/backtest', (req, res) => {
      const numMatches = Math.min(parseInt(req.body?.matches as string) || 10, 50);
      const data = generateSyntheticBacktestData(numMatches);
      const engine = new BacktestEngine({
        initialBankroll: parseFloat(req.body?.bankroll as string) || 1000,
        zScoreThreshold: parseFloat(req.body?.zThreshold as string) || 2.0,
        pctChangeThreshold: parseFloat(req.body?.pctThreshold as string) || 10,
        windowSize: parseInt(req.body?.windowSize as string) || 20,
      });
      const result = engine.run(data);
      res.json(result);
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      this.wsClients.add(ws);
      ws.on('close', () => {
        this.wsClients.delete(ws);
      });
      ws.on('error', () => {
        this.wsClients.delete(ws);
      });
    });

    this.arena.addEventListener((event: ArenaEvent) => {
      const message = JSON.stringify(event);
      for (const client of this.wsClients) {
        if (client.readyState === 1) {
          client.send(message);
        }
      }
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        console.log(`Server running on port ${this.port}`);
        console.log(`WebSocket on ws://localhost:${this.port}/ws`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close();
      this.httpServer.close(() => resolve());
    });
  }
}
