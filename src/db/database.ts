import { JSONFilePreset } from 'lowdb/node';
import { Low } from 'lowdb';
import { DbSchema, SignalRecord, PositionRecord, AgentRecord, MatchRecord, createDefaultSchema } from './schema';
import { Signal } from '../engine/signal';
import { MatchInfo } from '../txline/types';
import path from 'path';

let db: Low<DbSchema> | null = null;

export async function getDb(): Promise<Low<DbSchema>> {
  if (db) return db;

  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'txline_arena.json');
  const defaultData = createDefaultSchema();
  db = await JSONFilePreset<DbSchema>(dbPath, defaultData);
  await db.read();

  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.write();
    db = null;
  }
}

export async function insertSignal(signal: Signal): Promise<void> {
  const database = await getDb();
  const record: SignalRecord = {
    id: signal.id,
    fixtureId: signal.fixtureId,
    match: signal.match,
    market: signal.market,
    bookmaker: signal.bookmaker,
    selection: signal.selection,
    side: signal.side,
    oldOdds: signal.oldOdds,
    newOdds: signal.newOdds,
    pctChange: signal.pctChange,
    zScore: signal.zScore,
    direction: signal.direction,
    confidence: signal.confidence,
    timestamp: signal.timestamp,
    predicted: null,
    actualOutcome: null,
  };
  database.data.signals.push(record);
  if (database.data.signals.length > 500) {
    database.data.signals = database.data.signals.slice(-500);
  }
  await database.write();
}

export async function updateSignalPrediction(signalId: string, predicted: boolean, actualOutcome: string): Promise<void> {
  const database = await getDb();
  const signal = database.data.signals.find((s) => s.id === signalId);
  if (signal) {
    signal.predicted = predicted;
    signal.actualOutcome = actualOutcome;
    await database.write();
  }
}

export async function insertPosition(pos: {
  id: string;
  agentName: string;
  fixtureId: number;
  side: string;
  stake: number;
  odds: number;
  txSignature?: string;
}): Promise<void> {
  const database = await getDb();
  const record: PositionRecord = {
    id: pos.id,
    agentName: pos.agentName,
    fixtureId: pos.fixtureId,
    side: pos.side,
    stake: pos.stake,
    odds: pos.odds,
    status: 'open',
    openedAt: Date.now(),
    settledAt: null,
    pnl: null,
    txSignature: pos.txSignature || null,
    settlementTx: null,
  };
  database.data.positions.push(record);
  if (database.data.positions.length > 1000) {
    database.data.positions = database.data.positions.slice(-1000);
  }
  await database.write();
}

export async function settlePosition(positionId: string, pnl: number, settlementTx?: string): Promise<void> {
  const database = await getDb();
  const pos = database.data.positions.find((p) => p.id === positionId);
  if (pos) {
    pos.status = 'settled';
    pos.settledAt = Date.now();
    pos.pnl = pnl;
    pos.settlementTx = settlementTx || null;
    await database.write();
  }
}

export async function upsertMatch(match: MatchInfo): Promise<void> {
  const database = await getDb();
  const idx = database.data.matches.findIndex((m) => m.fixtureId === match.fixtureId);
  const record: MatchRecord = {
    fixtureId: match.fixtureId,
    home: match.home,
    away: match.away,
    competition: match.competition,
    startTime: match.startTime,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    phase: match.phase,
    lastUpdated: Date.now(),
  };
  if (idx >= 0) {
    database.data.matches[idx] = record;
  } else {
    database.data.matches.push(record);
  }
  await database.write();
}

export async function upsertAgent(agent: {
  name: string;
  strategy: string;
  tokenAccount?: string;
  bankroll?: number;
}): Promise<void> {
  const database = await getDb();
  const existing = database.data.agents.find((a) => a.name === agent.name);
  if (!existing) {
    const record: AgentRecord = {
      name: agent.name,
      strategy: agent.strategy,
      bankroll: agent.bankroll ?? 1000,
      tokenAccount: agent.tokenAccount || null,
      totalPnl: 0,
      totalPositions: 0,
      wins: 0,
      losses: 0,
      consecutiveLosses: 0,
      paused: false,
      pausedUntil: null,
    };
    database.data.agents.push(record);
    await database.write();
  }
}

export async function updateAgentStats(name: string, pnlDelta: number, won: boolean): Promise<void> {
  const database = await getDb();
  const agent = database.data.agents.find((a) => a.name === name);
  if (!agent) return;

  agent.totalPnl += pnlDelta;
  agent.totalPositions += 1;
  if (won) {
    agent.wins += 1;
    agent.consecutiveLosses = 0;
  } else {
    agent.losses += 1;
    agent.consecutiveLosses += 1;
  }
  agent.bankroll += pnlDelta;
  await database.write();
}

export async function setAgentPaused(name: string, pausedUntil: number | null): Promise<void> {
  const database = await getDb();
  const agent = database.data.agents.find((a) => a.name === name);
  if (agent) {
    agent.paused = pausedUntil !== null;
    agent.pausedUntil = pausedUntil;
    await database.write();
  }
}

export async function getRecentSignals(limit: number = 50): Promise<SignalRecord[]> {
  const database = await getDb();
  return [...database.data.signals].reverse().slice(0, limit);
}

export async function getAgentPositions(agentName: string, status?: string): Promise<PositionRecord[]> {
  const database = await getDb();
  let positions = database.data.positions.filter((p) => p.agentName === agentName);
  if (status) {
    positions = positions.filter((p) => p.status === status);
  }
  return [...positions].reverse();
}

export async function getAllPositions(): Promise<PositionRecord[]> {
  const database = await getDb();
  return [...database.data.positions].reverse();
}

export async function getLeaderboard(): Promise<AgentRecord[]> {
  const database = await getDb();
  return [...database.data.agents].sort((a, b) => b.totalPnl - a.totalPnl);
}

export async function getMatches(status?: string): Promise<MatchRecord[]> {
  const database = await getDb();
  let matches = database.data.matches;
  if (status) {
    matches = matches.filter((m) => m.status === status);
  }
  return [...matches].sort((a, b) => a.startTime - b.startTime);
}

export async function getMatchName(fixtureId: number): Promise<string | null> {
  const database = await getDb();
  const match = database.data.matches.find((m) => m.fixtureId === fixtureId);
  if (!match) return null;
  return `${match.home} vs ${match.away}`;
}
