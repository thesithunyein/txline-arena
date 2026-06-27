const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
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
