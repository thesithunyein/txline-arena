'use client';

import { useEffect, useState } from 'react';
import { Microscope } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface AttributionData {
  name: string;
  byMarket: Record<string, { wins: number; losses: number; pnl: number }>;
  byZScoreRange: Record<string, { wins: number; losses: number; pnl: number }>;
  byDirection: Record<string, { wins: number; losses: number; pnl: number }>;
  byConfidence: Record<string, { wins: number; losses: number; pnl: number }>;
  totalWins: number;
  totalLosses: number;
  totalPnl: number;
}

export function AttributionCard() {
  const [data, setData] = useState<AttributionData[]>([]);

  useEffect(() => {
    fetchApi<AttributionData[]>('/attribution').then(setData).catch(() => setData([]));
  }, []);

  if (data.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
            <Microscope className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Performance Attribution</h3>
        </div>
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500">No attribution data yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
          <Microscope className="h-4 w-4 text-blue-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Performance Attribution</h3>
        <span className="badge badge-blue ml-auto">Innovation</span>
      </div>

      <p className="text-xs text-gray-500 mb-6">
        Decomposes each agent&apos;s P&amp;L by signal characteristics — revealing which edge sources drive returns.
      </p>

      <div className="space-y-6">
        {data.map((agent) => {
          const totalSettled = agent.totalWins + agent.totalLosses;
          const winRate = totalSettled > 0 ? ((agent.totalWins / totalSettled) * 100).toFixed(0) : '0';
          return (
            <div key={agent.name} className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-900">{agent.name}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500">{winRate}% win rate</span>
                  <span className={`font-semibold tabular-nums ${agent.totalPnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {agent.totalPnl >= 0 ? '+' : ''}{agent.totalPnl.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* By Z-Score Range */}
              <AttributionRow
                label="By Z-Score"
                buckets={agent.byZScoreRange}
              />

              {/* By Direction */}
              <AttributionRow
                label="By Direction"
                buckets={agent.byDirection}
              />

              {/* By Confidence */}
              <AttributionRow
                label="By Confidence"
                buckets={agent.byConfidence}
              />

              {/* By Market */}
              {Object.keys(agent.byMarket).length > 0 && (
                <AttributionRow
                  label="By Market"
                  buckets={agent.byMarket}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AttributionRow({ label, buckets }: { label: string; buckets: Record<string, { wins: number; losses: number; pnl: number }> }) {
  const entries = Object.entries(buckets).filter(([, v]) => v.wins + v.losses > 0);
  if (entries.length === 0) return null;

  return (
    <div className="mb-3 last:mb-0">
      <p className="text-[11px] text-gray-500 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {entries.map(([key, val]) => {
          const total = val.wins + val.losses;
          const winPct = total > 0 ? (val.wins / total) * 100 : 0;
          return (
            <div
              key={key}
              className={`rounded-lg px-2.5 py-1.5 text-xs border ${val.pnl >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}
            >
              <span className="text-gray-700 font-medium">{key}</span>
              <span className="text-gray-400 mx-1.5">·</span>
              <span className={val.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                {val.pnl >= 0 ? '+' : ''}{val.pnl.toFixed(1)}
              </span>
              <span className="text-gray-400 ml-1.5">({winPct.toFixed(0)}% W)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
