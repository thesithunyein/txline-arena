import { Signal } from './signal';
import { ScoreUpdate } from '../txline/types';

export interface PredictionResult {
  signalId: string;
  fixtureId: number;
  signalDirection: string;
  signalSide: string;
  actualOutcome: string;
  predicted: boolean;
  timestamp: number;
}

export class PredictionTracker {
  private pendingSignals: Map<number, Signal[]> = new Map();

  trackSignal(signal: Signal): void {
    const existing = this.pendingSignals.get(signal.fixtureId) || [];
    existing.push(signal);
    this.pendingSignals.set(signal.fixtureId, existing);
  }

  settleFixture(fixtureId: number, finalScore: ScoreUpdate): PredictionResult[] {
    const signals = this.pendingSignals.get(fixtureId) || [];
    if (signals.length === 0) return [];

    const homeScore = finalScore.homeScore;
    const awayScore = finalScore.awayScore;
    const actualOutcome = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw';

    const results: PredictionResult[] = signals.map((signal) => {
      const predicted = signal.side === actualOutcome;
      return {
        signalId: signal.id,
        fixtureId,
        signalDirection: signal.direction,
        signalSide: signal.side,
        actualOutcome,
        predicted,
        timestamp: Date.now(),
      };
    });

    this.pendingSignals.delete(fixtureId);
    return results;
  }

  getPendingSignals(fixtureId: number): Signal[] {
    return this.pendingSignals.get(fixtureId) || [];
  }

  getStats(): { totalPending: number; fixturesTracked: number } {
    let total = 0;
    for (const signals of this.pendingSignals.values()) {
      total += signals.length;
    }
    return { totalPending: total, fixturesTracked: this.pendingSignals.size };
  }
}
