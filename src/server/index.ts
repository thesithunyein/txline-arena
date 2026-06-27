import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { ArenaManager, ArenaEvent } from '../arena/manager';
import { getRecentSignals, getAgentPositions, getLeaderboard, getMatches, getAllPositions } from '../db/database';

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
    this.app.get('/health', (_req, res) => {
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
    });

    this.app.get('/api/signals', async (_req, res) => {
      const limit = parseInt(_req.query.limit as string) || 50;
      res.json(await getRecentSignals(limit));
    });

    this.app.get('/api/agents', (_req, res) => {
      const agents = this.arena.getAgents().map((a) => a.getStats());
      res.json(agents);
    });

    this.app.get('/api/agents/:name/positions', async (req, res) => {
      const status = req.query.status as string | undefined;
      res.json(await getAgentPositions(req.params.name, status));
    });

    this.app.get('/api/positions', async (_req, res) => {
      res.json(await getAllPositions());
    });

    this.app.get('/api/leaderboard', (_req, res) => {
      res.json(this.arena.getLeaderboard().getRankings());
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
