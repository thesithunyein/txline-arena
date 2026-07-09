'use client';

import { useEffect, useState } from 'react';
import { Bot, Pause, TrendingUp, TrendingDown, DollarSign, Repeat, ExternalLink } from 'lucide-react';
import { fetchApi, AgentData, PositionData, LeaderboardEntry, MatchData } from '../../lib/api';
import { useWebSocket, ArenaEvent } from '../../lib/ws';
import { formatPnl, formatPct } from '../../lib/utils';
import { Flag } from '../../components/Flag';

const AGENT_ICONS: Record<string, any> = {
  Momentum: TrendingUp,
  'Mean Reversion': TrendingDown,
  Value: DollarSign,
  'Market Maker': Repeat,
};

const AGENT_COLORS: Record<string, string> = {
  Momentum: 'bg-emerald-100 text-emerald-600',
  'Mean Reversion': 'bg-red-100 text-red-600',
  Value: 'bg-blue-100 text-blue-600',
  'Market Maker': 'bg-violet-100 text-violet-600',
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [a, lb, p, m] = await Promise.all([
        fetchApi<AgentData[]>('/agents'),
        fetchApi<LeaderboardEntry[]>('/leaderboard'),
        fetchApi<PositionData[]>('/positions?limit=80'),
        fetchApi<MatchData[]>('/matches'),
      ]);
      setAgents(a);
      setLeaderboard(lb);
      setPositions(p);
      setMatches(m);
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
  const matchLabel = (fixtureId: number) => {
    const m = matches.find((x) => x.fixtureId === fixtureId);
    if (!m) return <span>#{fixtureId}</span>;
    return (
      <span className="inline-flex items-center gap-1.5">
        <Flag team={m.home} size={14} />
        {m.home}
        <span className="text-gray-400 font-normal">vs</span>
        <Flag team={m.away} size={14} />
        {m.away}
      </span>
    );
  };

  return (
    <div className="space-y-10">
      <div className="text-center">
        <h1 className="page-header mb-3">Trading Agents</h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Autonomous strategy agents competing in the arena. Click an agent to filter its positions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {agents.map((agent) => (
          <div
            key={agent.name}
            className={`card card-hover cursor-pointer ${selectedAgent === agent.name ? 'border-gray-900 ring-1 ring-gray-900' : ''}`}
            onClick={() => setSelectedAgent(selectedAgent === agent.name ? null : agent.name)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${AGENT_COLORS[agent.name] || 'bg-gray-100 text-gray-700'}`}>
                  {(() => {
                    const Icon = AGENT_ICONS[agent.name] || Bot;
                    return <Icon className="h-5 w-5" />;
                  })()}
                </div>
                <span className="font-semibold text-gray-900 text-sm">{agent.name}</span>
              </div>
              {agent.paused && <span className="badge badge-yellow"><Pause className="h-3 w-3" /> Paused</span>}
            </div>
            <p className="text-xs text-gray-500 mb-5 line-clamp-2 leading-relaxed">{agent.strategy}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1">Bankroll</p>
                <p className="font-semibold text-gray-900 tabular-nums">{agent.bankroll.toFixed(0)} USDC</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">P&L</p>
                <p className={`font-semibold tabular-nums ${agent.totalPnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatPnl(agent.totalPnl)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Win Rate</p>
                <p className="font-semibold text-gray-900 tabular-nums">{(agent.winRate * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">ROI</p>
                <p className={`font-semibold tabular-nums ${agent.roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatPct(agent.roi)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-gray-900">
            Positions {selectedAgent && `— ${selectedAgent}`}
          </h3>
          <span className="badge badge-gray">{agentPositions.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="pb-3 pr-4 font-medium">Agent</th>
                <th className="pb-3 pr-4 font-medium">Match</th>
                <th className="pb-3 pr-4 font-medium">Side</th>
                <th className="pb-3 pr-4 text-right font-medium">Stake</th>
                <th className="pb-3 pr-4 text-right font-medium">Odds</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 text-right font-medium">P&L</th>
                <th className="pb-3 text-right font-medium">On-Chain</th>
              </tr>
            </thead>
            <tbody>
              {agentPositions.map((pos) => (
                <tr key={pos.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 pr-4 text-gray-900 font-medium">{pos.agentName}</td>
                  <td className="py-3 pr-4 text-gray-600">{matchLabel(pos.fixtureId)}</td>
                  <td className="py-3 pr-4">
                    <span className="badge badge-blue capitalize">{pos.side}</span>
                  </td>
                  <td className="py-3 pr-4 text-right text-gray-900 tabular-nums">{pos.stake.toFixed(2)}</td>
                  <td className="py-3 pr-4 text-right text-gray-900 tabular-nums">{pos.odds.toFixed(2)}</td>
                  <td className="py-3 pr-4">
                    {pos.status === 'open' ? (
                      <span className="badge badge-yellow">Open</span>
                    ) : (
                      <span className="badge badge-gray">Settled</span>
                    )}
                  </td>
                  <td className={`py-3 pr-4 text-right font-semibold tabular-nums ${pos.pnl !== null ? (pos.pnl >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-500'}`}>
                    {pos.pnl !== null ? formatPnl(pos.pnl) : '—'}
                  </td>
                  <td className="py-3 text-right">
                    {pos.settlementTx ? (
                      <a
                        href={`https://explorer.solana.com/tx/${pos.settlementTx}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors font-mono text-xs"
                      >
                        {pos.settlementTx.slice(0, 6)}…{pos.settlementTx.slice(-4)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {agentPositions.length === 0 && (
            <p className="text-sm text-gray-500 py-12 text-center">No positions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
