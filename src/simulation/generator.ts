import { OddsUpdate, ScoreUpdate, MatchInfo, GamePhase } from '../txline/types';

interface GBMParams {
  drift: number;
  volatility: number;
  initialOdds: number;
}

export class SimulationEngine {
  private fixtures: MatchInfo[] = [];
  private oddsParams: Map<number, Map<string, GBMParams>> = new Map();
  private running = false;
  private intervalId: NodeJS.Timeout | null = null;
  private scoreIntervalId: NodeJS.Timeout | null = null;

  private onOdds: (update: OddsUpdate) => void;
  private onScore: (update: ScoreUpdate) => void;
  private onMatchStart?: (match: MatchInfo) => void;

  constructor(callbacks: {
    onOdds: (update: OddsUpdate) => void;
    onScore: (update: ScoreUpdate) => void;
    onMatchStart?: (match: MatchInfo) => void;
  }) {
    this.onOdds = callbacks.onOdds;
    this.onScore = callbacks.onScore;
    this.onMatchStart = callbacks.onMatchStart;
  }

  initialize(matches: MatchInfo[]): void {
    this.fixtures = matches;

    for (const match of matches) {
      const params = new Map<string, GBMParams>();
      const markets = ['1x2', 'match_winner'];

      for (const market of markets) {
        params.set(`home:${market}`, {
          drift: -0.001 + Math.random() * 0.002,
          volatility: 0.02 + Math.random() * 0.03,
          initialOdds: 1.5 + Math.random() * 2.5,
        });
        params.set(`away:${market}`, {
          drift: -0.001 + Math.random() * 0.002,
          volatility: 0.02 + Math.random() * 0.03,
          initialOdds: 1.5 + Math.random() * 2.5,
        });
        params.set(`draw:${market}`, {
          drift: 0,
          volatility: 0.015 + Math.random() * 0.02,
          initialOdds: 2.8 + Math.random() * 1.5,
        });
      }

      this.oddsParams.set(match.fixtureId, params);
    }
  }

  start(intervalMs: number = 5000): void {
    if (this.running) return;
    this.running = true;

    this.intervalId = setInterval(() => {
      this.generateOddsUpdates();
    }, intervalMs);

    this.scoreIntervalId = setInterval(() => {
      this.generateScoreUpdates();
    }, 15000);
  }

  stop(): void {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.scoreIntervalId) {
      clearInterval(this.scoreIntervalId);
      this.scoreIntervalId = null;
    }
  }

  private generateOddsUpdates(): void {
    for (const match of this.fixtures) {
      if (match.status !== 'live' && match.status !== 'inplay') continue;

      const params = this.oddsParams.get(match.fixtureId);
      if (!params) continue;

      const bookmakers = ['Bet365', 'William Hill', 'Pinnacle', 'Betfair'];
      const bookmaker = bookmakers[Math.floor(Math.random() * bookmakers.length)];
      const market = '1x2';

      for (const side of ['home', 'away', 'draw']) {
        const key = `${side}:${market}`;
        const p = params.get(key);
        if (!p) continue;

        const dt = 1 / 12; // 5-second intervals
        const randomShock = this.gaussianRandom() * p.volatility * Math.sqrt(dt);
        const drift = p.drift * dt;
        const newOdds = Math.max(1.01, p.initialOdds * Math.exp(drift + randomShock));
        p.initialOdds = newOdds;

        const oldOdds = newOdds * (1 + (Math.random() - 0.5) * 0.02);

        const update: OddsUpdate = {
          fixtureId: match.fixtureId,
          bookmaker,
          market,
          selection: side === 'home' ? '1' : side === 'away' ? '2' : 'X',
          oldOdds: Math.round(oldOdds * 100) / 100,
          newOdds: Math.round(newOdds * 100) / 100,
          timestamp: Date.now(),
          seq: Math.floor(Math.random() * 100000),
        };

        this.onOdds(update);
      }
    }
  }

  private generateScoreUpdates(): void {
    for (const match of this.fixtures) {
      if (match.status !== 'live' && match.status !== 'inplay') continue;

      const goalChance = 0.08;
      if (Math.random() < goalChance) {
        if (Math.random() < 0.5) {
          match.homeScore++;
        } else {
          match.awayScore++;
        }
      }

      const phases: GamePhase[] = ['H1', 'H2', 'FT'];
      const phaseIdx = Math.min(2, Math.floor((Date.now() - match.startTime) / (45 * 60 * 1000)));
      match.phase = phases[phaseIdx] || 'FT';

      if (match.phase === 'FT') {
        match.status = 'finished';
      }

      const update: ScoreUpdate = {
        fixtureId: match.fixtureId,
        seq: Math.floor(Math.random() * 100000),
        ts: Date.now(),
        gameState: match.phase,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        period: phaseIdx + 1,
      };

      this.onScore(update);
    }
  }

  private gaussianRandom(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  isRunning(): boolean {
    return this.running;
  }

  getFixtures(): MatchInfo[] {
    return [...this.fixtures];
  }
}
