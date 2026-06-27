import { BacktestEngine, generateSyntheticBacktestData } from '../src/backtest/engine';

describe('BacktestEngine', () => {
  test('should run backtest and produce results', () => {
    const data = generateSyntheticBacktestData(5);
    const engine = new BacktestEngine({ initialBankroll: 1000 });
    const result = engine.run(data);

    expect(result.totalMatches).toBe(5);
    expect(result.agents.length).toBe(4);
    expect(result.completedAt).toBeGreaterThan(result.startedAt);
  });

  test('should have equity curves for each agent', () => {
    const data = generateSyntheticBacktestData(3);
    const engine = new BacktestEngine();
    const result = engine.run(data);

    for (const agent of result.agents) {
      expect(agent.equityCurve.length).toBeGreaterThan(0);
      expect(agent.equityCurve[0].equity).toBe(1000);
    }
  });

  test('should compute max drawdown', () => {
    const data = generateSyntheticBacktestData(5);
    const engine = new BacktestEngine();
    const result = engine.run(data);

    for (const agent of result.agents) {
      expect(agent.maxDrawdown).toBeGreaterThanOrEqual(0);
    }
  });

  test('should detect signals during backtest', () => {
    const data = generateSyntheticBacktestData(10);
    const engine = new BacktestEngine({ zScoreThreshold: 1.5, pctChangeThreshold: 5 });
    const result = engine.run(data);

    expect(result.totalSignals).toBeGreaterThan(0);
  });

  test('should generate correct number of matches', () => {
    const data5 = generateSyntheticBacktestData(5);
    expect(data5.length).toBe(5);

    const data20 = generateSyntheticBacktestData(20);
    expect(data20.length).toBe(20);
  });

  test('each match should have odds updates and final score', () => {
    const data = generateSyntheticBacktestData(3);
    for (const match of data) {
      expect(match.oddsUpdates.length).toBeGreaterThan(0);
      expect(match.finalScore).toBeDefined();
      expect(match.finalScore.home).toBeGreaterThanOrEqual(0);
      expect(match.finalScore.away).toBeGreaterThanOrEqual(0);
    }
  });
});
