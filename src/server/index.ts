import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { ArenaManager, ArenaEvent } from '../arena/manager';
import { getRecentSignals, getAgentPositions, getLeaderboard as getDbLeaderboard, getMatches, getAllPositions } from '../db/database';
import { BacktestEngine, generateSyntheticBacktestData } from '../backtest/engine';

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
