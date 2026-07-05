'use client';

import { useEffect, useState } from 'react';
import { Brain, TrendingUp, Users, Gauge } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface ConsensusData {
  consensusScore: number;
  alignedAgents: number;
  totalAgents: number;
  sideDistribution: Record<string, { count: number; stake: number }>;
  avgZScore: number;
  highConfSignals: number;
  totalSignals: number;
  totalOpenPositions: number;
  totalSettledPositions: number;
  aggregatePnl: number;
  totalStake: number;
  roi: number;
  agentLeanings: { name: string; lean: string; strength: number }[];
}

export function ConsensusCard() {
  const [data, setData] = useState<ConsensusData | null>(null);

  useEffect(() => {
    fetchApi<ConsensusData>('/consensus').then(setData).catch(() => setData(null));
    const interval = setInterval(() => {
      fetchApi<ConsensusData>('/consensus').then(setData).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100">
            <Brain className="h-4 w-4 text-violet-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Smart Money Consensus</h3>
        </div>
        <div className="py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center">
            <Brain className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">Loading consensus data...</p>
        </div>
      </div>
    );
  }

  const scoreColor = data.consensusScore >= 75 ? 'text-emerald-600' : data.consensusScore >= 50 ? 'text-amber-600' : 'text-gray-600';
  const scoreBg = data.consensusScore >= 75 ? 'from-emerald-500 to-teal-500' : data.consensusScore >= 50 ? 'from-amber-500 to-orange-500' : 'from-gray-400 to-gray-500';

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100">
          <Brain className="h-4 w-4 text-violet-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Smart Money Consensus</h3>
        <span className="badge badge-purple ml-auto">Innovation</span>
      </div>

      {/* Consensus Score Gauge */}
      <div className="flex items-end gap-3 mb-2">
        <span className={`text-5xl font-bold tracking-tight tabular-nums ${scoreColor}`}>
          {data.consensusScore}
        </span>
        <span className="text-sm text-gray-500 mb-2">/ 100 alignment</span>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        {data.alignedAgents} of {data.totalAgents} agents agree on direction
      </p>

      {/* Score Bar */}
      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden mb-6">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${scoreBg} transition-all duration-700`}
          style={{ width: `${data.consensusScore}%` }}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <ConsensusStat icon={Gauge} label="Avg Z-Score" value={data.avgZScore.toFixed(2)} />
        <ConsensusStat icon={TrendingUp} label="ROI" value={`${data.roi >= 0 ? '+' : ''}${data.roi}%`} positive={data.roi >= 0} />
        <ConsensusStat icon={Users} label="Open Pos." value={String(data.totalOpenPositions)} />
      </div>

      {/* Agent Leanings */}
      {data.agentLeanings.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-3">Agent Alignment</p>
          <div className="space-y-2">
            {data.agentLeanings.map((agent) => (
              <div key={agent.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-sm font-medium text-gray-900">{agent.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{agent.lean === 'home' ? 'Home lean' : 'Away lean'}</span>
                  <div className="h-1.5 w-16 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${agent.lean === 'home' ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${agent.strength * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Aggregates all agent positions into a real-time consensus signal — a novel &quot;smart money index&quot; derived from autonomous strategy alignment.
      </p>
    </div>
  );
}

function ConsensusStat({ icon: Icon, label, value, positive }: { icon: any; label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
        <p className="text-[11px] text-gray-500">{label}</p>
      </div>
      <p className={`text-lg font-semibold tabular-nums ${positive === true ? 'text-emerald-600' : positive === false ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}
