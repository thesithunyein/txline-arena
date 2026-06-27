import { BaseAgent, AgentStats } from '../agents/base';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  strategy: string;
  bankroll: number;
  totalPnl: number;
  roi: number;
  winRate: number;
  sharpeRatio: number;
  totalPositions: number;
  paused: boolean;
}

export class Leaderboard {
  private agents: BaseAgent[] = [];

  registerAgent(agent: BaseAgent): void {
    this.agents.push(agent);
  }

  getRankings(): LeaderboardEntry[] {
    const entries = this.agents.map((agent) => {
      const stats = agent.getStats();
      return {
        rank: 0,
        name: stats.name,
        strategy: stats.strategy,
        bankroll: stats.bankroll,
        totalPnl: stats.totalPnl,
        roi: stats.roi,
        winRate: stats.winRate,
        sharpeRatio: stats.sharpeRatio,
        totalPositions: stats.totalPositions,
        paused: stats.paused,
      };
    });

    entries.sort((a, b) => b.totalPnl - a.totalPnl);
    entries.forEach((e, i) => { e.rank = i + 1; });

    return entries;
  }

  getTopAgent(): LeaderboardEntry | null {
    const rankings = this.getRankings();
    return rankings.length > 0 ? rankings[0] : null;
  }

  getAgentByName(name: string): BaseAgent | undefined {
    return this.agents.find((a) => a.name === name);
  }

  getAllAgents(): BaseAgent[] {
    return [...this.agents];
  }
}
