import { BaseAgent, AgentDecision, Position } from './base';
import { Signal } from '../engine/signal';
import { ConsensusOdds, SelectionSide } from '../txline/types';
import { kellyStake } from './kelly';

export class MomentumAgent extends BaseAgent {
  constructor(bankroll: number = 1000) {
    super('Momentum', 'Follow sharp movements — bet on the side whose odds are shortening (smart money flow)', bankroll);
  }

  onSignal(signal: Signal, consensus: ConsensusOdds | null): AgentDecision | null {
    if (this.isPaused()) return null;
    if (signal.direction !== 'shortening') return null;

    const side = signal.side;
    const odds = signal.newOdds;
    const winProb = consensus ? (side === 'home' ? consensus.homeImpliedProb : side === 'away' ? consensus.awayImpliedProb : consensus.drawImpliedProb) : 0.4;

    const stake = kellyStake(this.getBankroll(), odds, winProb + signal.confidence * 0.1);
    if (stake < 1) return null;

    const existing = this.getOpenPositionsForFixture(signal.fixtureId);
    if (existing.some((p) => p.side === side)) return null;

    return {
      action: 'open',
      side,
      stake: Math.round(stake * 100) / 100,
      odds,
      reason: `Momentum: ${side} odds shortening (z=${signal.zScore.toFixed(2)}, ${signal.pctChange.toFixed(1)}%)`,
    };
  }

  decide(consensus: ConsensusOdds | null, _fixtureId: number): AgentDecision | null {
    return null;
  }
}
