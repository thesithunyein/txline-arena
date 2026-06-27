import { BaseAgent, AgentDecision } from './base';
import { Signal } from '../engine/signal';
import { ConsensusOdds, SelectionSide } from '../txline/types';
import { kellyStake } from './kelly';

export class MeanReversionAgent extends BaseAgent {
  constructor(bankroll: number = 1000) {
    super('Mean Reversion', 'Bet against sharp movements — expect odds to revert to consensus mean', bankroll);
  }

  onSignal(signal: Signal, consensus: ConsensusOdds | null): AgentDecision | null {
    if (this.isPaused()) return null;
    if (signal.direction !== 'lengthening') return null;

    const side = signal.side;
    const odds = signal.newOdds;
    const winProb = consensus ? (side === 'home' ? consensus.homeImpliedProb : side === 'away' ? consensus.awayImpliedProb : consensus.drawImpliedProb) : 0.3;

    const adjustedProb = winProb + Math.min(0.15, Math.abs(signal.zScore) * 0.03);
    const stake = kellyStake(this.getBankroll(), odds, adjustedProb);
    if (stake < 1) return null;

    const existing = this.getOpenPositionsForFixture(signal.fixtureId);
    if (existing.some((p) => p.side === side)) return null;

    return {
      action: 'open',
      side,
      stake: Math.round(stake * 100) / 100,
      odds,
      reason: `Reversion: ${side} odds drifting (z=${signal.zScore.toFixed(2)}, expecting mean reversion)`,
    };
  }

  decide(consensus: ConsensusOdds | null, _fixtureId: number): AgentDecision | null {
    return null;
  }
}
