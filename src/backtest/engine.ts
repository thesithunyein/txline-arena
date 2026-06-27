import { Signal, createSignal } from '../engine/signal';
import { OddsUpdate, ScoreUpdate, MatchInfo, ConsensusOdds, SelectionSide } from '../txline/types';
import { SharpMovementDetector } from '../engine/detector';
import { BaseAgent, AgentStats, AgentDecision } from '../agents/base';
import { MomentumAgent } from '../agents/momentum';
import { MeanReversionAgent } from '../agents/reversion';
import { ValueAgent } from '../agents/value';
import { MarketMakerAgent } from '../agents/marketMaker';

export interface BacktestConfig {
  initialBankroll: number;
  zScoreThreshold: number;
  pctChangeThreshold: number;
  windowSize: number;
  maxStakePct: number;
}

export interface BacktestMatchData {
  fixtureId: number;
  home: string;
  away: string;
  competition: string;
  oddsUpdates: OddsUpdate[];
  scoreUpdates: ScoreUpdate[];
  finalScore: { home: number; away: number };
}

export interface BacktestAgentResult {
  name: string;
  strategy: string;
  finalBankroll: number;
  totalPnl: number;
  roi: number;
  totalPositions: number;
  wins: number;
  losses: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  equityCurve: { timestamp: number; equity: number }[];
}

export interface BacktestResult {
  config: BacktestConfig;
  totalMatches: number;
  totalSignals: number;
  totalPositions: number;
  predictionAccuracy: number;
  agents: BacktestAgentResult[];
  startedAt: number;
  completedAt: number;
  durationMs: number;
}

export class BacktestEngine {
  private config: BacktestConfig;
  private detector: SharpMovementDetector;
  private agents: BaseAgent[] = [];
  private signals: Signal[] = [];
  private consensusMap: Map<number, ConsensusOdds> = new Map();
  private matchNames: Map<number, string> = new Map();

  constructor(config: Partial<BacktestConfig> = {}) {
    this.config = {
      initialBankroll: config.initialBankroll ?? 1000,
      zScoreThreshold: config.zScoreThreshold ?? 2.0,
      pctChangeThreshold: config.pctChangeThreshold ?? 10,
      windowSize: config.windowSize ?? 20,
      maxStakePct: config.maxStakePct ?? 0.25,
    };

    this.detector = new SharpMovementDetector(
      {
        zScoreThreshold: this.config.zScoreThreshold,
        pctChangeThreshold: this.config.pctChangeThreshold,
        windowSize: this.config.windowSize,
      },
      {
        onSignal: (signal) => this.onSignal(signal),
        getMatchName: (fixtureId) => this.matchNames.get(fixtureId) || `Fixture ${fixtureId}`,
      }
    );

    this.createAgents();
  }

  private createAgents(): void {
    this.agents = [
      new MomentumAgent(this.config.initialBankroll),
      new MeanReversionAgent(this.config.initialBankroll),
      new ValueAgent(this.config.initialBankroll),
      new MarketMakerAgent(this.config.initialBankroll),
    ];
  }

  run(matches: BacktestMatchData[]): BacktestResult {
    const startedAt = Date.now();

    for (const match of matches) {
      this.matchNames.set(match.fixtureId, `${match.home} vs ${match.away}`);
    }

    const allUpdates: { update: OddsUpdate; matchIdx: number }[] = [];
    for (let i = 0; i < matches.length; i++) {
      for (const update of matches[i].oddsUpdates) {
        allUpdates.push({ update, matchIdx: i });
      }
    }
    allUpdates.sort((a, b) => a.update.timestamp - b.update.timestamp);

    const scoreQueue: ScoreUpdate[] = [];
    for (const match of matches) {
      for (const score of match.scoreUpdates) {
        scoreQueue.push(score);
      }
    }
    scoreQueue.sort((a, b) => a.ts - b.ts);

    let scoreIdx = 0;
    for (const { update } of allUpdates) {
      while (scoreIdx < scoreQueue.length && scoreQueue[scoreIdx].ts <= update.timestamp) {
        this.processScore(scoreQueue[scoreIdx]);
        scoreIdx++;
      }

      this.processOdds(update);
    }

    while (scoreIdx < scoreQueue.length) {
      this.processScore(scoreQueue[scoreIdx]);
      scoreIdx++;
    }

    for (const match of matches) {
      this.settleFixture(match.fixtureId, match.finalScore);
    }

    const completedAt = Date.now();
    const agentResults: BacktestAgentResult[] = this.agents.map((agent) => {
      const stats = agent.getStats();
      const pnlHistory = agent.getPnlHistory();
      const equityCurve = this.buildEquityCurve(pnlHistory, this.config.initialBankroll);
      const maxDrawdown = this.computeMaxDrawdown(equityCurve);

      return {
        name: stats.name,
        strategy: stats.strategy,
        finalBankroll: stats.bankroll,
        totalPnl: stats.totalPnl,
        roi: stats.roi,
        totalPositions: stats.totalPositions,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.winRate,
        sharpeRatio: stats.sharpeRatio,
        maxDrawdown,
        equityCurve,
      };
    });

    const correctPredictions = this.signals.filter((s) => {
      const match = matches.find((m) => m.fixtureId === s.fixtureId);
      if (!match) return false;
      const actualWinner = this.getWinner(match.finalScore);
      if (!actualWinner) return false;
      const predictedSide = s.direction === 'shortening' ? s.side : this.oppositeSide(s.side);
      return predictedSide === actualWinner;
    }).length;
    const settledSignals = this.signals.filter((s) => {
      const match = matches.find((m) => m.fixtureId === s.fixtureId);
      return match !== undefined;
    }).length;

    return {
      config: this.config,
      totalMatches: matches.length,
      totalSignals: this.signals.length,
      totalPositions: agentResults.reduce((sum, a) => sum + a.totalPositions, 0),
      predictionAccuracy: settledSignals > 0 ? (correctPredictions / settledSignals) * 100 : 0,
      agents: agentResults,
      startedAt,
      completedAt,
      durationMs: completedAt - startedAt,
    };
  }

  private processOdds(update: OddsUpdate): void {
    this.detector.processUpdate(update);
    this.updateConsensus(update);
  }

  private processScore(score: ScoreUpdate): void {
    for (const agent of this.agents) {
      agent.onScoreUpdate(score);
    }
  }

  private onSignal(signal: Signal): void {
    this.signals.push(signal);
    const consensus = this.consensusMap.get(signal.fixtureId) || null;

    for (const agent of this.agents) {
      if (agent.isPaused()) continue;
      const decision = agent.onSignal(signal, consensus);
      this.executeDecision(agent, decision, signal.fixtureId, consensus);
    }
  }

  private updateConsensus(update: OddsUpdate): void {
    let consensus = this.consensusMap.get(update.fixtureId);
    if (!consensus) {
      consensus = {
        fixtureId: update.fixtureId,
        market: update.market,
        homeOdds: 2.0,
        awayOdds: 2.0,
        drawOdds: 3.0,
        homeImpliedProb: 0.33,
        awayImpliedProb: 0.33,
        drawImpliedProb: 0.34,
        overround: 1.0,
        timestamp: update.timestamp,
      };
    }

    const odds = update.newOdds;
    if (update.selection === '1' || update.selection.toLowerCase() === 'home') {
      consensus.homeOdds = odds;
    } else if (update.selection === '2' || update.selection.toLowerCase() === 'away') {
      consensus.awayOdds = odds;
    } else if (update.selection === 'X' || update.selection.toLowerCase() === 'draw') {
      consensus.drawOdds = odds;
    }

    consensus.homeImpliedProb = 1 / consensus.homeOdds;
    consensus.awayImpliedProb = 1 / consensus.awayOdds;
    consensus.drawImpliedProb = 1 / consensus.drawOdds;
    consensus.overround = consensus.homeImpliedProb + consensus.awayImpliedProb + consensus.drawImpliedProb;
    consensus.timestamp = update.timestamp;

    this.consensusMap.set(update.fixtureId, consensus);

    for (const agent of this.agents) {
      if (agent.isPaused()) continue;
      if (agent.getOpenPositionsForFixture(update.fixtureId).length > 0) continue;
      const decision = agent.decide(consensus, update.fixtureId);
      this.executeDecision(agent, decision, update.fixtureId, consensus);
    }
  }

  private executeDecision(
    agent: BaseAgent,
    decision: AgentDecision | null,
    fixtureId: number,
    consensus: ConsensusOdds | null
  ): void {
    if (!decision || decision.action !== 'open' || !decision.side || !decision.stake || !decision.odds) return;

    const maxStake = agent.getBankroll() * this.config.maxStakePct;
    const stake = Math.min(decision.stake, maxStake, agent.getBankroll());
    if (stake < 1) return;

    agent.openPosition(fixtureId, decision.side, stake, decision.odds);
  }

  private settleFixture(fixtureId: number, finalScore: { home: number; away: number }): void {
    const winner = this.getWinner(finalScore);

    for (const agent of this.agents) {
      const openPositions = agent.getOpenPositionsForFixture(fixtureId);
      for (const pos of openPositions) {
        const won = winner === null ? false : pos.side === winner;
        agent.settlePosition(pos.id, won);
      }
    }
  }

  private getWinner(score: { home: number; away: number }): SelectionSide | null {
    if (score.home > score.away) return 'home';
    if (score.away > score.home) return 'away';
    return 'draw';
  }

  private oppositeSide(side: SelectionSide): SelectionSide {
    if (side === 'home') return 'away';
    if (side === 'away') return 'home';
    return 'draw';
  }

  private buildEquityCurve(pnlHistory: number[], initialBankroll: number): { timestamp: number; equity: number }[] {
    const curve: { timestamp: number; equity: number }[] = [];
    let equity = initialBankroll;
    curve.push({ timestamp: 0, equity });

    for (let i = 0; i < pnlHistory.length; i++) {
      equity += pnlHistory[i];
      curve.push({ timestamp: i + 1, equity });
    }

    return curve;
  }

  private computeMaxDrawdown(curve: { timestamp: number; equity: number }[]): number {
    if (curve.length < 2) return 0;
    let peak = curve[0].equity;
    let maxDD = 0;

    for (const point of curve) {
      if (point.equity > peak) peak = point.equity;
      const dd = ((peak - point.equity) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
    }

    return maxDD;
  }
}

export function generateSyntheticBacktestData(numMatches: number = 10): BacktestMatchData[] {
  const matches: BacktestMatchData[] = [];
  const teams = [
    ['Brazil', 'Argentina'], ['France', 'Germany'], ['Spain', 'Portugal'],
    ['England', 'Netherlands'], ['Italy', 'Belgium'], ['USA', 'Mexico'],
    ['Japan', 'South Korea'], ['Morocco', 'Egypt'], ['Croatia', 'Denmark'],
    ['Colombia', 'Uruguay'], ['Nigeria', 'Senegal'], ['Australia', 'New Zealand'],
  ];
  const competitions = ['World Cup 2026', 'World Cup Qualifiers', 'International Friendly'];

  const baseTime = Date.now() - numMatches * 90 * 60 * 1000;

  for (let i = 0; i < numMatches; i++) {
    const [home, away] = teams[i % teams.length];
    const fixtureId = 200000 + i;
    const startTime = baseTime + i * 90 * 60 * 1000;
    const numUpdates = 30 + Math.floor(Math.random() * 20);

    const oddsUpdates: OddsUpdate[] = [];
    let homeOdds = 1.8 + Math.random() * 1.2;
    let awayOdds = 1.8 + Math.random() * 1.2;
    let drawOdds = 2.8 + Math.random() * 1.0;

    const bookmakers = ['Bet365', 'Pinnacle', 'William Hill', 'Betfair'];

    for (let j = 0; j < numUpdates; j++) {
      const ts = startTime + (j / numUpdates) * 90 * 60 * 1000;
      const bookmaker = bookmakers[j % bookmakers.length];
      const sides = [
        { selection: '1', odds: homeOdds },
        { selection: 'X', odds: drawOdds },
        { selection: '2', odds: awayOdds },
      ];

      for (const side of sides) {
        const shock = (Math.random() - 0.5) * 0.15;
        const newOdds = Math.max(1.01, side.odds * (1 + shock));
        const oldOdds = Math.max(1.01, side.odds);

        if (side.selection === '1') homeOdds = newOdds;
        else if (side.selection === '2') awayOdds = newOdds;
        else drawOdds = newOdds;

        oddsUpdates.push({
          fixtureId,
          bookmaker,
          market: '1x2',
          selection: side.selection,
          oldOdds: Math.round(oldOdds * 100) / 100,
          newOdds: Math.round(newOdds * 100) / 100,
          timestamp: ts,
          seq: j * 3 + sides.indexOf(side),
        });
      }

      if (Math.random() < 0.15) {
        const spikeSide = sides[Math.floor(Math.random() * 3)];
        const spikedOdds = Math.max(1.01, spikeSide.odds * (1 + (Math.random() - 0.5) * 0.4));
        oddsUpdates.push({
          fixtureId,
          bookmaker: 'Pinnacle',
          market: '1x2',
          selection: spikeSide.selection,
          oldOdds: Math.round(spikeSide.odds * 100) / 100,
          newOdds: Math.round(spikedOdds * 100) / 100,
          timestamp: ts + 1000,
          seq: j * 3 + 10,
        });
      }
    }

    const homeScore = Math.floor(Math.random() * 4);
    const awayScore = Math.floor(Math.random() * 3);
    const scoreUpdates: ScoreUpdate[] = [
      { fixtureId, seq: 0, ts: startTime, gameState: 'H1', homeScore: 0, awayScore: 0, period: 1 },
      { fixtureId, seq: 1, ts: startTime + 45 * 60 * 1000, gameState: 'HT', homeScore: Math.floor(homeScore / 2), awayScore: Math.floor(awayScore / 2), period: 1 },
      { fixtureId, seq: 2, ts: startTime + 90 * 60 * 1000, gameState: 'FT', homeScore, awayScore, period: 2 },
    ];

    matches.push({
      fixtureId,
      home,
      away,
      competition: competitions[i % competitions.length],
      oddsUpdates,
      scoreUpdates,
      finalScore: { home: homeScore, away: awayScore },
    });
  }

  return matches;
}
