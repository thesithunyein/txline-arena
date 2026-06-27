import { OddsWindow } from './oddsWindow';
import { Signal, createSignal } from './signal';
import { OddsUpdate, SelectionSide } from '../txline/types';

export interface DetectorConfig {
  zScoreThreshold: number;
  pctChangeThreshold: number;
  windowSize: number;
}

export interface DetectorCallbacks {
  onSignal: (signal: Signal) => void;
  getMatchName?: (fixtureId: number) => string;
}

export class SharpMovementDetector {
  private window: OddsWindow;
  private config: DetectorConfig;
  private callbacks: DetectorCallbacks;

  constructor(config: Partial<DetectorConfig> = {}, callbacks: DetectorCallbacks) {
    this.config = {
      zScoreThreshold: config.zScoreThreshold ?? 2.0,
      pctChangeThreshold: config.pctChangeThreshold ?? 10,
      windowSize: config.windowSize ?? 20,
    };
    this.callbacks = callbacks;
    this.window = new OddsWindow(this.config.windowSize);
  }

  processUpdate(update: OddsUpdate): Signal | null {
    const { fixtureId, market, bookmaker, selection, newOdds, oldOdds } = update;

    this.window.add(fixtureId, market, bookmaker, selection, newOdds);

    const stats = this.window.getStats(fixtureId, market, bookmaker, selection);
    if (!stats || stats.count < 3 || stats.stdDev === 0) return null;

    const zScore = (newOdds - stats.mean) / stats.stdDev;
    const pctChange = ((newOdds - oldOdds) / oldOdds) * 100;

    const zTriggered = Math.abs(zScore) >= this.config.zScoreThreshold;
    const pctTriggered = Math.abs(pctChange) >= this.config.pctChangeThreshold;

    if (!zTriggered && !pctTriggered) return null;

    const side = this.inferSide(selection);
    const matchName = this.callbacks.getMatchName?.(fixtureId) || `Fixture ${fixtureId}`;

    const signal = createSignal({
      fixtureId,
      match: matchName,
      market,
      bookmaker,
      selection,
      side,
      oldOdds,
      newOdds,
      pctChange,
      zScore,
    });

    this.callbacks.onSignal(signal);
    return signal;
  }

  private inferSide(selection: string): SelectionSide {
    const lower = selection.toLowerCase().trim();
    if (lower === '1' || lower === 'home' || lower === 'h') return 'home';
    if (lower === '2' || lower === 'away' || lower === 'a') return 'away';
    if (lower === 'x' || lower === 'draw' || lower === 'd') return 'draw';
    return 'home';
  }

  getWindow(): OddsWindow {
    return this.window;
  }

  clearFixture(fixtureId: number): void {
    this.window.clear(fixtureId);
  }
}
