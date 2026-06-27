import { OddsWindow } from '../src/engine/oddsWindow';
import { SharpMovementDetector } from '../src/engine/detector';
import { OddsUpdate } from '../src/txline/types';

describe('OddsWindow', () => {
  let window: OddsWindow;

  beforeEach(() => {
    window = new OddsWindow(10);
  });

  test('should add and retrieve odds', () => {
    window.add(1, '1x2', 'Bet365', '1', 2.0);
    window.add(1, '1x2', 'Bet365', '1', 2.1);
    const stats = window.getStats(1, '1x2', 'Bet365', '1');
    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(2);
    expect(stats!.mean).toBeCloseTo(2.05, 2);
  });

  test('should compute mean and stdDev correctly', () => {
    const values = [2.0, 2.1, 1.9, 2.0, 2.05];
    for (const v of values) {
      window.add(1, '1x2', 'Bet365', '1', v);
    }
    const stats = window.getStats(1, '1x2', 'Bet365', '1');
    expect(stats!.count).toBe(5);
    expect(stats!.mean).toBeCloseTo(2.01, 2);
    expect(stats!.stdDev).toBeGreaterThan(0);
  });

  test('should respect window size limit', () => {
    for (let i = 0; i < 15; i++) {
      window.add(1, '1x2', 'Bet365', '1', 2.0 + i * 0.01);
    }
    const stats = window.getStats(1, '1x2', 'Bet365', '1');
    expect(stats!.count).toBe(10);
  });

  test('should clear fixture data', () => {
    window.add(1, '1x2', 'Bet365', '1', 2.0);
    window.add(1, '1x2', 'Bet365', '1', 2.1);
    window.clear(1);
    const stats = window.getStats(1, '1x2', 'Bet365', '1');
    expect(stats).toBeNull();
  });
});

describe('SharpMovementDetector', () => {
  test('should detect sharp movement when z-score exceeds threshold', () => {
    const signals: any[] = [];
    const detector = new SharpMovementDetector(
      { zScoreThreshold: 1.5, pctChangeThreshold: 5, windowSize: 10 },
      { onSignal: (s) => signals.push(s) }
    );

    for (let i = 0; i < 10; i++) {
      detector.processUpdate({
        fixtureId: 1,
        bookmaker: 'Bet365',
        market: '1x2',
        selection: '1',
        oldOdds: 2.0,
        newOdds: 2.0 + (Math.random() - 0.5) * 0.02,
        timestamp: Date.now() + i * 1000,
        seq: i,
      });
    }

    const signal = detector.processUpdate({
      fixtureId: 1,
      bookmaker: 'Bet365',
      market: '1x2',
      selection: '1',
      oldOdds: 2.0,
      newOdds: 2.5,
      timestamp: Date.now() + 11 * 1000,
      seq: 11,
    });

    expect(signal).not.toBeNull();
    expect(signal!.zScore).toBeGreaterThan(1.5);
    expect(signals.length).toBeGreaterThan(0);
  });

  test('should not trigger on small movements', () => {
    const detector = new SharpMovementDetector(
      { zScoreThreshold: 3.0, pctChangeThreshold: 20, windowSize: 10 },
      { onSignal: () => {} }
    );

    for (let i = 0; i < 10; i++) {
      const signal = detector.processUpdate({
        fixtureId: 1,
        bookmaker: 'Bet365',
        market: '1x2',
        selection: '1',
        oldOdds: 2.0,
        newOdds: 2.0 + (Math.random() - 0.5) * 0.01,
        timestamp: Date.now() + i * 1000,
        seq: i,
      });
      expect(signal).toBeNull();
    }
  });

  test('should infer correct side from selection', () => {
    const detector = new SharpMovementDetector(
      { zScoreThreshold: 0.5, pctChangeThreshold: 1, windowSize: 5 },
      { onSignal: () => {} }
    );

    for (let i = 0; i < 5; i++) {
      detector.processUpdate({
        fixtureId: 1, bookmaker: 'B', market: '1x2', selection: 'X',
        oldOdds: 3.0, newOdds: 3.0, timestamp: Date.now() + i * 1000, seq: i,
      });
    }

    const signal = detector.processUpdate({
      fixtureId: 1, bookmaker: 'B', market: '1x2', selection: 'X',
      oldOdds: 3.0, newOdds: 3.5, timestamp: Date.now() + 6 * 1000, seq: 6,
    });

    expect(signal).not.toBeNull();
    expect(signal!.side).toBe('draw');
  });
});
