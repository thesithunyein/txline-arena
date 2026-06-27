import { Signal } from '../engine/signal';
import { ScoreUpdate, ConsensusOdds, SelectionSide } from '../txline/types';

export interface Position {
  id: string;
  fixtureId: number;
  side: SelectionSide;
  stake: number;
  odds: number;
  openedAt: number;
  status: 'open' | 'settled';
  pnl?: number;
}

export interface AgentStats {
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

export interface AgentDecision {
  action: 'open' | 'hold' | 'close';
  side?: SelectionSide;
  stake?: number;
  odds?: number;
  reason: string;
}

export abstract class BaseAgent {
  readonly name: string;
  readonly strategy: string;
  protected bankroll: number;
  protected positions: Position[] = [];
  protected pnlHistory: number[] = [];
  protected wins = 0;
  protected losses = 0;
  protected paused = false;
  protected pausedUntil: number | null = null;

  constructor(name: string, strategy: string, bankroll: number = 1000) {
    this.name = name;
    this.strategy = strategy;
    this.bankroll = bankroll;
  }

  abstract onSignal(signal: Signal, consensus: ConsensusOdds | null): AgentDecision | null;

  onScoreUpdate(_score: ScoreUpdate): void {}

  abstract decide(consensus: ConsensusOdds | null, fixtureId: number): AgentDecision | null;

  openPosition(fixtureId: number, side: SelectionSide, stake: number, odds: number): Position {
    const position: Position = {
      id: `${this.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fixtureId,
      side,
      stake,
      odds,
      openedAt: Date.now(),
      status: 'open',
    };
    this.positions.push(position);
    this.bankroll -= stake;
    return position;
  }

  settlePosition(positionId: string, won: boolean): { position: Position; pnl: number } | null {
    const pos = this.positions.find((p) => p.id === positionId && p.status === 'open');
    if (!pos) return null;

    const pnl = won ? pos.stake * (pos.odds - 1) : -pos.stake;
    pos.status = 'settled';
    pos.pnl = pnl;
    this.bankroll += won ? pos.stake + pos.stake * (pos.odds - 1) : 0;
    this.pnlHistory.push(pnl);
    if (won) this.wins++;
    else this.losses++;

    return { position: pos, pnl };
  }

  getOpenPositions(): Position[] {
    return this.positions.filter((p) => p.status === 'open');
  }

  getOpenPositionsForFixture(fixtureId: number): Position[] {
    return this.positions.filter((p) => p.status === 'open' && p.fixtureId === fixtureId);
  }

  getBankroll(): number {
    return this.bankroll;
  }

  isPaused(): boolean {
    if (this.paused && this.pausedUntil && Date.now() > this.pausedUntil) {
      this.paused = false;
      this.pausedUntil = null;
    }
    return this.paused;
  }

  pause(durationMs: number): void {
    this.paused = true;
    this.pausedUntil = Date.now() + durationMs;
  }

  unpause(): void {
    this.paused = false;
    this.pausedUntil = null;
  }

  getStats(): AgentStats {
    const total = this.wins + this.losses;
    const winRate = total > 0 ? this.wins / total : 0;
    const initialBankroll = 1000;
    const roi = ((this.bankroll + this.getOpenPositions().reduce((s, p) => s + p.stake, 0) - initialBankroll) / initialBankroll) * 100;
    const sharpe = this.computeSharpe();

    return {
      name: this.name,
      strategy: this.strategy,
      bankroll: this.bankroll,
      totalPnl: this.pnlHistory.reduce((a, b) => a + b, 0),
      totalPositions: total,
      wins: this.wins,
      losses: this.losses,
      winRate,
      roi,
      sharpeRatio: sharpe,
      paused: this.paused,
    };
  }

  private computeSharpe(): number {
    if (this.pnlHistory.length < 2) return 0;
    const mean = this.pnlHistory.reduce((a, b) => a + b, 0) / this.pnlHistory.length;
    const variance = this.pnlHistory.reduce((a, b) => a + (b - mean) ** 2, 0) / this.pnlHistory.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return (mean / stdDev) * Math.sqrt(252); // Annualized
  }

  getPnlHistory(): number[] {
    return [...this.pnlHistory];
  }
}
