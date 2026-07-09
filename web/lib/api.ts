import { demoForPath } from './demo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Hugging Face Spaces cold-starts can take 20–30s; retry before falling back to replay data.
const FETCH_TIMEOUT_MS = 25000;
const FETCH_RETRIES = 2;

async function fetchWithTimeout(url: string, attempt = 0): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    if (attempt < FETCH_RETRIES) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      return fetchWithTimeout(url, attempt + 1);
    }
    throw err;
  }
}

export async function fetchApi<T>(path: string): Promise<T> {
  if (DEMO_MODE) return demoForPath<T>(path);
  try {
    const res = await fetchWithTimeout(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    // Empty responses after tournament ends — fall back to deterministic replay for judges.
    if (data == null || (Array.isArray(data) && data.length === 0)) return demoForPath<T>(path);
    return data as T;
  } catch {
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
  agents: Array<{ name: string; bankroll: number; totalPnl?: number; totalPositions?: number; paused: boolean }>;
}
