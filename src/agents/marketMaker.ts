import { BaseAgent, AgentDecision } from './base';
import { Signal } from '../engine/signal';
import { ConsensusOdds, SelectionSide } from '../txline/types';

export class MarketMakerAgent extends BaseAgent {
  private readonly baseSpread: number;
  private readonly volMultiplier: number;
  private inventory: Map<string, number> = new Map(); // side -> net exposure

  constructor(bankroll: number = 1000, baseSpread: number = 0.05, volMultiplier: number = 0.02) {
    super('Market Maker', 'Quote buy/sell prices around consensus odds — profit from spread, hedge inventory', bankroll);
    this.baseSpread = baseSpread;
    this.volMultiplier = volMultiplier;
  }

  onSignal(signal: Signal, consensus: ConsensusOdds | null): AgentDecision | null {
    if (this.isPaused() || !consensus) return null;

    const volatility = Math.abs(signal.pctChange) / 100;
    const spread = this.baseSpread + volatility * this.volMultiplier;

    const side = signal.side;
    const consensusOdds = side === 'home' ? consensus.homeOdds : side === 'away' ? consensus.awayOdds : consensus.drawOdds;
    if (!consensusOdds) return null;

    const buyOdds = consensusOdds * (1 - spread / 2);
    const sellOdds = consensusOdds * (1 + spread / 2);

    const netExposure = this.inventory.get(side) || 0;

    if (signal.direction === 'lengthening' && netExposure < 50) {
      const existing = this.getOpenPositionsForFixture(signal.fixtureId);
      if (existing.some((p) => p.side === side)) return null;

      const stake = Math.min(this.getBankroll() * 0.05, 20);
      if (stake < 1) return null;

      this.inventory.set(side, netExposure + stake);
      return {
        action: 'open',
        side,
        stake: Math.round(stake * 100) / 100,
        odds: buyOdds,
        reason: `MM Buy: ${side} at ${buyOdds.toFixed(2)} (spread=${(spread * 100).toFixed(1)}%, vol=${(volatility * 100).toFixed(1)}%)`,
      };
    }

    if (signal.direction === 'shortening' && netExposure > -50) {
      const oppositeSide: SelectionSide = side === 'home' ? 'away' : 'home';
      const existing = this.getOpenPositionsForFixture(signal.fixtureId);
      if (existing.some((p) => p.side === oppositeSide)) return null;

      const stake = Math.min(this.getBankroll() * 0.05, 20);
      if (stake < 1) return null;

      this.inventory.set(oppositeSide, (this.inventory.get(oppositeSide) || 0) + stake);
      return {
        action: 'open',
        side: oppositeSide,
        stake: Math.round(stake * 100) / 100,
        odds: sellOdds,
        reason: `MM Sell: ${oppositeSide} at ${sellOdds.toFixed(2)} (spread=${(spread * 100).toFixed(1)}%, hedging ${side})`,
      };
    }

    return null;
  }

  decide(_consensus: ConsensusOdds | null, _fixtureId: number): AgentDecision | null {
    return null;
  }

  getInventory(): Map<string, number> {
    return new Map(this.inventory);
  }
}
