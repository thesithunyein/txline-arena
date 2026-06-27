import { BaseAgent } from '../agents/base';

export class CircuitBreaker {
  private readonly maxConsecutiveLosses: number;
  private readonly cooldownMs: number;
  private lossCounts: Map<string, number> = new Map();

  constructor(maxConsecutiveLosses: number = 3, cooldownMs: number = 30 * 60 * 1000) {
    this.maxConsecutiveLosses = maxConsecutiveLosses;
    this.cooldownMs = cooldownMs;
  }

  recordResult(agent: BaseAgent, won: boolean): void {
    const name = agent.name;
    if (won) {
      this.lossCounts.set(name, 0);
      return;
    }

    const current = (this.lossCounts.get(name) || 0) + 1;
    this.lossCounts.set(name, current);

    if (current >= this.maxConsecutiveLosses) {
      agent.pause(this.cooldownMs);
      this.lossCounts.set(name, 0);
    }
  }

  isAgentPaused(agent: BaseAgent): boolean {
    return agent.isPaused();
  }

  reset(agentName: string): void {
    this.lossCounts.delete(agentName);
  }

  getLossCount(agentName: string): number {
    return this.lossCounts.get(agentName) || 0;
  }
}
