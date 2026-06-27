'use client';

import { useEffect, useState } from 'react';
import { Bot, Pause, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchApi, AgentData, PositionData, LeaderboardEntry } from '../../lib/api';
import { useWebSocket, ArenaEvent } from '../../lib/ws';
import { formatPnl, formatPct } from '../../lib/utils';

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [a, lb, p] = await Promise.all([
          fetchApi<AgentData[]>('/agents').catch(() => []),
          fetchApi<LeaderboardEntry[]>('/leaderboard').catch(() => []),
          fetchApi<PositionData[]>('/positions').catch(() => []),
        ]);
        setAgents(a);
        setLeaderboard(lb);
        setPositions(p);
      } catch {}
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  useWebSocket((event: ArenaEvent) => {
    if (event.type === 'position_open' || event.type === 'position_settle') {
      fetchApi<PositionData[]>('/positions').then(setPositions).catch(() => {});
      fetchApi<AgentData[]>('/agents').then(setAgents).catch(() => {});
    }
  });

  const agentPositions = selectedAgent ? positions.filter((p) => p.agentName === selectedAgent) : positions;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Trading Agents</h1>
        <p className="text-sm text-gray-500 mt-1">Autonomous strategy agents competing in the arena</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {agents.map((agent) => {
          const lb = leaderboard.find((l) => l.name === agent.name);
          return (
            <div
              key={agent.name}
              className={`card card-hover cursor-pointer ${selectedAgent === agent.name ? 'border-accent/30 glow-blue' : ''}`}
              onClick={() => setSelectedAgent(selectedAgent === agent.name ? null : agent.name)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
                    <Bot className="h-5 w-5 text-accent" />
                  </div>
                  <span className="font-semibold text-white text-sm">{agent.name}</span>
                </div>
                {agent.paused && <span className="badge badge-yellow"><Pause className="h-3 w-3" /> Paused</span>}
              </div>
              <p className="text-[11px] text-gray-500 mb-4 line-clamp-2 leading-relaxed">{agent.strategy}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-gray-500 mb-0.5">Bankroll</p>
                  <p className="font-semibold text-white tabular-nums">{agent.bankroll.toFixed(0)} USDC</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 mb-0.5">P&L</p>
                  <p className={`font-semibold tabular-nums ${agent.totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {formatPnl(agent.totalPnl)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 mb-0.5">Win Rate</p>
                  <p className="font-semibold text-white tabular-nums">{(agent.winRate * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 mb-0.5">ROI</p>
                  <p className={`font-semibold tabular-nums ${agent.roi >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {formatPct(agent.roi)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">
            Positions {selectedAgent && `— ${selectedAgent}`}
          </h3>
          <span className="badge badge-gray">{agentPositions.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-4">Agent</th>
                <th className="pb-3 pr-4">Fixture</th>
                <th className="pb-3 pr-4">Side</th>
                <th className="pb-3 pr-4 text-right">Stake</th>
                <th className="pb-3 pr-4 text-right">Odds</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 text-right">P&L</th>
              </tr>
            </thead>
            <tbody>
              {agentPositions.map((pos) => (
                <tr key={pos.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 pr-4 text-white font-medium">{pos.agentName}</td>
                  <td className="py-3 pr-4 text-gray-400">#{pos.fixtureId}</td>
                  <td className="py-3 pr-4">
                    <span className="badge badge-blue capitalize">{pos.side}</span>
                  </td>
                  <td className="py-3 pr-4 text-right text-white">{pos.stake.toFixed(2)}</td>
                  <td className="py-3 pr-4 text-right text-white">{pos.odds.toFixed(2)}</td>
                  <td className="py-3 pr-4">
                    {pos.status === 'open' ? (
                      <span className="badge badge-yellow">Open</span>
                    ) : (
                      <span className="badge badge-gray">Settled</span>
                    )}
                  </td>
                  <td className={`py-3 text-right font-semibold ${pos.pnl !== null ? (pos.pnl >= 0 ? 'text-accent-green' : 'text-accent-red') : 'text-gray-500'}`}>
                    {pos.pnl !== null ? formatPnl(pos.pnl) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {agentPositions.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">No positions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
