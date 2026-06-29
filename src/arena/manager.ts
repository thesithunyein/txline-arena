import { BaseAgent, Position, AgentStats } from '../agents/base';
import { Signal } from '../engine/signal';
import { OddsUpdate, ScoreUpdate, ConsensusOdds, SelectionSide, MatchInfo } from '../txline/types';
import { SharpMovementDetector } from '../engine/detector';
import { PredictionTracker } from '../engine/predictor';
import { Leaderboard } from './leaderboard';
import { CircuitBreaker } from './circuitBreaker';
import { computeConsensusOdds } from '../txline/client';
import { insertSignal, insertPosition, settlePosition, upsertMatch, upsertAgent, updateAgentStats, setAgentPaused } from '../db/database';
import { anchorSettlement, isOnChainSettlementEnabled } from '../chain/settlement';

export interface ArenaEvent {
  type: 'signal' | 'position_open' | 'position_settle' | 'score_update' | 'leaderboard_update' | 'match_end';
  data: any;
  timestamp: number;
}

type ArenaEventListener = (event: ArenaEvent) => void;

export class ArenaManager {
  private agents: BaseAgent[] = [];
  private detector: SharpMovementDetector;
  private predictor: PredictionTracker;
  private leaderboard: Leaderboard;
  private circuitBreaker: CircuitBreaker;
  private listeners: ArenaEventListener[] = [];
  private consensusCache: Map<number, ConsensusOdds> = new Map();
  private matches: Map<number, MatchInfo> = new Map();
  private oddsBuffer: Map<number, any[]> = new Map();

  constructor(config?: {
    zScoreThreshold?: number;
    pctChangeThreshold?: number;
    windowSize?: number;
    maxConsecutiveLosses?: number;
    cooldownMs?: number;
  }) {
    this.detector = new SharpMovementDetector(
      {
        zScoreThreshold: config?.zScoreThreshold ?? parseFloat(process.env.DETECTION_Z_SCORE_THRESHOLD || '2.0'),
        pctChangeThreshold: config?.pctChangeThreshold ?? parseFloat(process.env.DETECTION_PCT_CHANGE_THRESHOLD || '10'),
        windowSize: config?.windowSize ?? parseInt(process.env.ODDS_WINDOW_SIZE || '20'),
      },
      {
        onSignal: (signal) => this.handleSignal(signal),
        getMatchName: (fixtureId) => this.matches.get(fixtureId)
          ? `${this.matches.get(fixtureId)!.home} vs ${this.matches.get(fixtureId)!.away}`
          : `Fixture ${fixtureId}`,
      }
    );

    this.predictor = new PredictionTracker();
    this.leaderboard = new Leaderboard();
    this.circuitBreaker = new CircuitBreaker(
      config?.maxConsecutiveLosses ?? 3,
      config?.cooldownMs ?? 30 * 60 * 1000
    );
  }

  registerAgent(agent: BaseAgent): void {
    this.agents.push(agent);
    this.leaderboard.registerAgent(agent);
    upsertAgent({ name: agent.name, strategy: agent.strategy, bankroll: agent.getBankroll() }).catch(() => {});
  }

  addEventListener(listener: ArenaEventListener): void {
    this.listeners.push(listener);
  }

  private emit(event: ArenaEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        // Listener error doesn't affect arena
      }
    }
  }

  processOddsUpdate(update: OddsUpdate): void {
    this.detector.processUpdate(update);

    const fixtureId = update.fixtureId;
    if (!this.oddsBuffer.has(fixtureId)) {
      this.oddsBuffer.set(fixtureId, []);
    }
    const buffer = this.oddsBuffer.get(fixtureId)!;
    buffer.push(update);

    if (buffer.length >= 5) {
      this.updateConsensus(fixtureId);
    }
  }

  private updateConsensus(fixtureId: number): void {
    const buffer = this.oddsBuffer.get(fixtureId);
    if (!buffer || buffer.length === 0) return;

    const oddsEntries = buffer.map((u) => ({
      fixtureId: u.fixtureId,
      bookmaker: u.bookmaker,
      market: u.market,
      selection: u.selection,
      odds: u.newOdds,
      timestamp: u.timestamp,
    }));

    const consensus = computeConsensusOdds(oddsEntries, fixtureId);
    if (consensus) {
      this.consensusCache.set(fixtureId, consensus);
    }
  }

  processScoreUpdate(score: ScoreUpdate): void {
    const match = this.matches.get(score.fixtureId);
    if (match) {
      match.homeScore = score.homeScore;
      match.awayScore = score.awayScore;
      match.phase = score.gameState as any;
      upsertMatch(match).catch(() => {});
    }

    this.emit({
      type: 'score_update',
      data: score,
      timestamp: Date.now(),
    });

    if (score.gameState === 'FT' || score.gameState === 'Finished') {
      this.handleMatchEnd(score);
    }
  }

  updateMatchInfo(match: MatchInfo): void {
    this.matches.set(match.fixtureId, match);
    upsertMatch(match).catch(() => {});
  }

  private handleSignal(signal: Signal): void {
    insertSignal(signal).catch(() => {});
    this.predictor.trackSignal(signal);

    this.emit({
      type: 'signal',
      data: signal,
      timestamp: Date.now(),
    });

    const consensus = this.consensusCache.get(signal.fixtureId) || null;

    for (const agent of this.agents) {
      if (this.circuitBreaker.isAgentPaused(agent)) continue;

      try {
        const decision = agent.onSignal(signal, consensus);
        if (decision && decision.action === 'open' && decision.side && decision.stake && decision.odds) {
          this.executePosition(agent, signal.fixtureId, decision.side, decision.stake, decision.odds);
        }
      } catch (err) {
        // Agent error isolated
      }
    }

    // Also run value agent's periodic decide
    for (const agent of this.agents) {
      if (this.circuitBreaker.isAgentPaused(agent)) continue;
      try {
        const decision = agent.decide(consensus, signal.fixtureId);
        if (decision && decision.action === 'open' && decision.side && decision.stake && decision.odds) {
          this.executePosition(agent, signal.fixtureId, decision.side, decision.stake, decision.odds);
        }
      } catch (err) {
        // Agent error isolated
      }
    }
  }

  private executePosition(agent: BaseAgent, fixtureId: number, side: SelectionSide, stake: number, odds: number): void {
    const position = agent.openPosition(fixtureId, side, stake, odds);

    insertPosition({
      id: position.id,
      agentName: agent.name,
      fixtureId,
      side,
      stake,
      odds,
    }).catch(() => {});

    this.emit({
      type: 'position_open',
      data: {
        positionId: position.id,
        agentName: agent.name,
        fixtureId,
        side,
        stake,
        odds,
        bankroll: agent.getBankroll(),
      },
      timestamp: Date.now(),
    });
  }

  private handleMatchEnd(score: ScoreUpdate): void {
    const fixtureId = score.fixtureId;
    const homeScore = score.homeScore;
    const awayScore = score.awayScore;
    const actualOutcome: SelectionSide = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw';

    const predictions = this.predictor.settleFixture(fixtureId, score);
    for (const pred of predictions) {
      const { updateSignalPrediction } = require('../db/database');
      updateSignalPrediction(pred.signalId, pred.predicted, pred.actualOutcome).catch(() => {});
    }

    for (const agent of this.agents) {
      const openPositions = agent.getOpenPositionsForFixture(fixtureId);
      for (const pos of openPositions) {
        const won = pos.side === actualOutcome;
        const result = agent.settlePosition(pos.id, won);
        if (result) {
          settlePosition(pos.id, result.pnl).catch(() => {});
          updateAgentStats(agent.name, result.pnl, won).catch(() => {});
          this.circuitBreaker.recordResult(agent, won);

          if (agent.isPaused()) {
            setAgentPaused(agent.name, Date.now() + 30 * 60 * 1000).catch(() => {});
          }

          // Anchor the settlement on Solana devnet (non-blocking). When enabled,
          // the real transaction signature is persisted back to the position.
          if (isOnChainSettlementEnabled()) {
            anchorSettlement({
              positionId: pos.id,
              agentName: agent.name,
              fixtureId,
              side: pos.side,
              outcome: actualOutcome,
              won,
              pnl: result.pnl,
            })
              .then((sig) => {
                if (sig) {
                  settlePosition(pos.id, result.pnl, sig).catch(() => {});
                  this.emit({
                    type: 'position_settle',
                    data: { positionId: pos.id, agentName: agent.name, fixtureId, settlementTx: sig, onChain: true },
                    timestamp: Date.now(),
                  });
                }
              })
              .catch((err) => console.error('On-chain settlement failed:', err?.message || err));
          }

          this.emit({
            type: 'position_settle',
            data: {
              positionId: pos.id,
              agentName: agent.name,
              fixtureId,
              side: pos.side,
              actualOutcome,
              won,
              pnl: result.pnl,
              bankroll: agent.getBankroll(),
            },
            timestamp: Date.now(),
          });
        }
      }
    }

    this.detector.clearFixture(fixtureId);
    this.consensusCache.delete(fixtureId);
    this.oddsBuffer.delete(fixtureId);

    this.emit({
      type: 'match_end',
      data: { fixtureId, homeScore, awayScore, actualOutcome },
      timestamp: Date.now(),
    });

    this.emit({
      type: 'leaderboard_update',
      data: this.leaderboard.getRankings(),
      timestamp: Date.now(),
    });
  }

  getLeaderboard(): Leaderboard {
    return this.leaderboard;
  }

  getDetector(): SharpMovementDetector {
    return this.detector;
  }

  getConsensus(fixtureId: number): ConsensusOdds | null {
    return this.consensusCache.get(fixtureId) || null;
  }

  getAgents(): BaseAgent[] {
    return [...this.agents];
  }

  getMatches(): Map<number, MatchInfo> {
    return new Map(this.matches);
  }
}
