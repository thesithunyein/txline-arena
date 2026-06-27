export interface DbSchema {
  signals: SignalRecord[];
  positions: PositionRecord[];
  agents: AgentRecord[];
  matches: MatchRecord[];
  oddsHistory: OddsRecord[];
}

export interface SignalRecord {
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

export interface PositionRecord {
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

export interface AgentRecord {
  name: string;
  strategy: string;
  bankroll: number;
  tokenAccount: string | null;
  totalPnl: number;
  totalPositions: number;
  wins: number;
  losses: number;
  consecutiveLosses: number;
  paused: boolean;
  pausedUntil: number | null;
}

export interface MatchRecord {
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

export interface OddsRecord {
  id: number;
  fixtureId: number;
  market: string;
  bookmaker: string;
  selection: string;
  odds: number;
  timestamp: number;
}

export function createDefaultSchema(): DbSchema {
  return {
    signals: [],
    positions: [],
    agents: [],
    matches: [],
    oddsHistory: [],
  };
}
