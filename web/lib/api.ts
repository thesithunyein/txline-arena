import { demoForPath } from './demo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
// Force the deterministic replay dataset (useful for the public demo link / video).
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export async function fetchApi<T>(path: string): Promise<T> {
  if (DEMO_MODE) return demoForPath<T>(path);
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    // Empty live responses (e.g. after matches end) fall back to replay data so
    // the dashboard always demonstrates the product working.
    if (Array.isArray(data) && data.length === 0) return demoForPath<T>(path);
    return data as T;
  } catch {
    // No backend reachable (e.g. static Vercel link) — serve replay data.
    return demoForPath<T>(path);
  }
}

export interface SignalData {
  id: string;
  fixtureId: number;
  match: string;
  market: string;
  bookmaker: string;
  selection: string;
  side: string;
  oldOdds: number;
  newOdds: number;
  pctChange: number;
  zScore: number;
  direction: string;
  confidence: number;
  timestamp: number;
  predicted: boolean | null;
  actualOutcome: string | null;
}

export interface AgentData {
  name: string;
  strategy: string;
  bankroll: number;
  totalPnl: number;
  totalPositions: number;
  wins: number;
  losses: number;
  winRate: number;
  roi: number;
  sharpeRatio: number;
  paused: boolean;
}

export interface PositionData {
  id: string;
  agentName: string;
  fixtureId: number;
  side: string;
  stake: number;
  odds: number;
  status: 'open' | 'settled';
  openedAt: number;
  settledAt: number | null;
  pnl: number | null;
  txSignature: string | null;
  settlementTx: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  strategy: string;
  bankroll: number;
  totalPnl: number;
  roi: number;
  winRate: number;
  sharpeRatio: number;
  totalPositions: number;
  paused: boolean;
}

export interface MatchData {
  fixtureId: number;
  home: string;
  away: string;
  competition: string;
  startTime: number;
  status: string;
  homeScore: number;
  awayScore: number;
  phase: string;
  lastUpdated: number;
}

export interface HealthData {
  status: string;
  mode: string;
  timestamp: number;
  agents: Array<{ name: string; bankroll: number; paused: boolean }>;
}
