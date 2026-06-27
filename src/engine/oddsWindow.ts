export class OddsWindow {
  private window: Map<string, number[]> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 20) {
    this.maxSize = maxSize;
  }

  private key(fixtureId: number, market: string, bookmaker: string, selection: string): string {
    return `${fixtureId}:${market}:${bookmaker}:${selection}`;
  }

  add(fixtureId: number, market: string, bookmaker: string, selection: string, odds: number): void {
    const k = this.key(fixtureId, market, bookmaker, selection);
    if (!this.window.has(k)) {
      this.window.set(k, []);
    }
    const arr = this.window.get(k)!;
    arr.push(odds);
    if (arr.length > this.maxSize) {
      arr.shift();
    }
  }

  getStats(fixtureId: number, market: string, bookmaker: string, selection: string): {
    mean: number;
    stdDev: number;
    count: number;
    last: number;
  } | null {
    const k = this.key(fixtureId, market, bookmaker, selection);
    const arr = this.window.get(k);
    if (!arr || arr.length < 2) return null;

    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      stdDev,
      count: arr.length,
      last: arr[arr.length - 1],
    };
  }

  clear(fixtureId?: number): void {
    if (fixtureId) {
      for (const k of this.window.keys()) {
        if (k.startsWith(`${fixtureId}:`)) {
          this.window.delete(k);
        }
      }
    } else {
      this.window.clear();
    }
  }

  size(): number {
    return this.window.size;
  }
}
