import { BaseAgent, AgentDecision } from './base';
import { Signal } from '../engine/signal';
import { ConsensusOdds, SelectionSide } from '../txline/types';
import { kellyStake, edge } from './kelly';

export class ValueAgent extends BaseAgent {
  private readonly edgeThreshold: number;

  constructor(bankroll: number = 1000, edgeThreshold: number = 0.05) {
    super('Value', 'Bet when consensus-implied probability exceeds bookmaker odds edge (value betting)', bankroll);
    this.edgeThreshold = edgeThreshold;
  }

  onSignal(_signal: Signal, consensus: ConsensusOdds | null): AgentDecision | null {
    if (this.isPaused() || !consensus) return null;
    return null;
  }

  decide(consensus: ConsensusOdds | null, fixtureId: number): AgentDecision | null {
    if (this.isPaused() || !consensus) return null;

    const sides: { side: SelectionSide; odds: number; prob: number }[] = [
      { side: 'home', odds: consensus.homeOdds, prob: consensus.homeImpliedProb },
      { side: 'away', odds: consensus.awayOdds, prob: consensus.awayImpliedProb },
    ];

    if (consensus.drawOdds > 0) {
      sides.push({ side: 'draw', odds: consensus.drawOdds, prob: consensus.drawImpliedProb });
    }

    let bestSide: { side: SelectionSide; odds: number; prob: number } | null = null;
    let bestEdge = 0;

    for (const s of sides) {
      const e = edge(s.prob, s.odds);
      if (e > bestEdge && e > this.edgeThreshold) {
        bestEdge = e;
        bestSide = s;
      }
    }

    if (!bestSide) return null;

    const existing = this.getOpenPositionsForFixture(fixtureId);
    if (existing.some((p) => p.side === bestSide!.side)) return null;

    const stake = kellyStake(this.getBankroll(), bestSide.odds, bestSide.prob);
    if (stake < 1) return null;

    return {
      action: 'open',
      side: bestSide.side,
      stake: Math.round(stake * 100) / 100,
      odds: bestSide.odds,
      reason: `Value: ${bestSide.side} edge=${(bestEdge * 100).toFixed(1)}% (prob=${(bestSide.prob * 100).toFixed(1)}% vs implied=${((1 / bestSide.odds) * 100).toFixed(1)}%)`,
    };
  }
}
