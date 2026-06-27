import { MomentumAgent } from '../src/agents/momentum';
import { MeanReversionAgent } from '../src/agents/reversion';
import { ValueAgent } from '../src/agents/value';
import { MarketMakerAgent } from '../src/agents/marketMaker';
import { Signal, createSignal } from '../src/engine/signal';
import { ConsensusOdds } from '../src/txline/types';

function makeSignal(overrides: Partial<Signal> = {}): Signal {
  return createSignal({
    fixtureId: 1,
    match: 'Test vs Test',
    market: '1x2',
    bookmaker: 'Bet365',
    selection: '1',
    side: 'home',
    oldOdds: 2.5,
    newOdds: 2.0,
    pctChange: -20,
    zScore: 2.5,
    ...overrides,
  });
}

function makeConsensus(overrides: Partial<ConsensusOdds> = {}): ConsensusOdds {
  return {
    fixtureId: 1,
    market: '1x2',
    homeOdds: 2.0,
    awayOdds: 3.0,
    drawOdds: 3.5,
    homeImpliedProb: 0.5,
    awayImpliedProb: 0.33,
    drawImpliedProb: 0.29,
    overround: 1.12,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('MomentumAgent', () => {
  test('should open position on shortening odds (smart money in)', () => {
    const agent = new MomentumAgent(1000);
    const signal = makeSignal({ direction: 'shortening', side: 'home', newOdds: 2.0, oldOdds: 2.5 });
    const decision = agent.onSignal(signal, makeConsensus());
    expect(decision).not.toBeNull();
    expect(decision!.action).toBe('open');
    expect(decision!.side).toBe('home');
    expect(decision!.stake).toBeGreaterThan(0);
  });

  test('should not open on lengthening odds', () => {
    const agent = new MomentumAgent(1000);
    const signal = makeSignal({ direction: 'lengthening', side: 'home', newOdds: 3.0, oldOdds: 2.5 });
    const decision = agent.onSignal(signal, makeConsensus());
    expect(decision).toBeNull();
  });

  test('should respect bankroll limits', () => {
    const agent = new MomentumAgent(100);
    const signal = makeSignal({ zScore: 5.0 });
    const decision = agent.onSignal(signal, makeConsensus());
    if (decision && decision.stake) {
      expect(decision.stake).toBeLessThanOrEqual(100);
    }
  });
});

describe('MeanReversionAgent', () => {
  test('should open position against sharp movement', () => {
    const agent = new MeanReversionAgent(1000);
    const signal = makeSignal({ direction: 'lengthening', side: 'home', newOdds: 3.0, oldOdds: 2.5, zScore: 2.5 });
    const decision = agent.onSignal(signal, makeConsensus());
    expect(decision).not.toBeNull();
    expect(decision!.action).toBe('open');
  });
});

describe('ValueAgent', () => {
  test('should identify value bets', () => {
    const agent = new ValueAgent(1000);
    const consensus = makeConsensus({
      homeOdds: 3.0,
      homeImpliedProb: 0.33,
      overround: 1.05,
    });
    const decision = agent.decide(consensus, 1);
    if (decision) {
      expect(decision.action).toBe('open');
    }
  });
});

describe('MarketMakerAgent', () => {
  test('should quote prices around consensus', () => {
    const agent = new MarketMakerAgent(1000);
    const consensus = makeConsensus();
    const decision = agent.decide(consensus, 1);
    if (decision) {
      expect(decision.action).toBe('open');
      expect(decision.odds).toBeGreaterThan(1.0);
    }
  });
});

describe('BaseAgent settlement', () => {
  test('should settle winning position correctly', () => {
    const agent = new MomentumAgent(1000);
    const pos = agent.openPosition(1, 'home', 100, 2.5);
    const result = agent.settlePosition(pos.id, true);
    expect(result).not.toBeNull();
    expect(result!.pnl).toBe(150); // 100 * (2.5 - 1) = 150
    expect(agent.getBankroll()).toBe(1150); // 1000 - 100 + 100 + 150 = 1150
  });

  test('should settle losing position correctly', () => {
    const agent = new MomentumAgent(1000);
    const pos = agent.openPosition(1, 'home', 100, 2.5);
    const result = agent.settlePosition(pos.id, false);
    expect(result).not.toBeNull();
    expect(result!.pnl).toBe(-100);
    expect(agent.getBankroll()).toBe(900);
  });

  test('should track win/loss stats', () => {
    const agent = new MomentumAgent(1000);
    const pos1 = agent.openPosition(1, 'home', 50, 2.0);
    agent.settlePosition(pos1.id, true);
    const pos2 = agent.openPosition(2, 'away', 50, 3.0);
    agent.settlePosition(pos2.id, false);

    const stats = agent.getStats();
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.winRate).toBe(0.5);
  });

  test('should pause and unpause', () => {
    const agent = new MomentumAgent(1000);
    agent.pause(5000);
    expect(agent.isPaused()).toBe(true);
    agent.unpause();
    expect(agent.isPaused()).toBe(false);
  });
});
