export interface Fixture {
  FixtureId: number;
  CompetitionId: number;
  CompetitionName: string;
  Participant1: string;
  Participant2: string;
  StartTime: number;
  Sport: string;
  Status: string;
}

export interface OddsEntry {
  fixtureId: number;
  bookmaker: string;
  market: string;
  selection: string;
  odds: number;
  timestamp: number;
  updateSeq?: number;
}

export interface OddsUpdate {
  fixtureId: number;
  bookmaker: string;
  market: string;
  selection: string;
  oldOdds: number;
  newOdds: number;
  timestamp: number;
  seq: number;
}

export interface ScoreUpdate {
  fixtureId: number;
  seq: number;
  ts: number;
  gameState: string;
  homeScore: number;
  awayScore: number;
  period: number;
  stats?: ScoreStat[];
}

export interface ScoreStat {
  statKey: number;
  statValue: number;
}

export interface StatValidationResponse {
  summary: {
    fixtureId: number;
    updateStats: {
      updateCount: number;
      minTimestamp: number;
      maxTimestamp: number;
    };
    eventStatsSubTreeRoot: string;
  };
  subTreeProof: MerkleNode[];
  mainTreeProof: MerkleNode[];
  statToProve: {
    statKey: number;
    statValue: number;
  };
  eventStatRoot: string;
  statProof: MerkleNode[];
  statToProve2?: {
    statKey: number;
    statValue: number;
  };
  statProof2?: MerkleNode[];
}

export interface MerkleNode {
  hash: string;
  isRightSibling: boolean;
}

export interface AuthResponse {
  token: string;
}

export interface TokenActivationResponse {
  token: string;
}

export interface StreamEvent {
  type: 'odds' | 'scores';
  data: OddsUpdate | ScoreUpdate;
  raw: string;
}

export type GamePhase = 'H1' | 'H2' | 'ET1' | 'ET2' | 'PE' | 'PRE' | 'HT' | 'FT' | 'LIVE';

export interface MatchInfo {
  fixtureId: number;
  home: string;
  away: string;
  competition: string;
  startTime: number;
  status: string;
  homeScore: number;
  awayScore: number;
  phase: GamePhase;
}

export type SelectionSide = 'home' | 'away' | 'draw';

export interface ConsensusOdds {
  fixtureId: number;
  market: string;
  homeOdds: number;
  awayOdds: number;
  drawOdds: number;
  homeImpliedProb: number;
  awayImpliedProb: number;
  drawImpliedProb: number;
  overround: number;
  timestamp: number;
}
