'use client';

import { LeaderboardEntry } from '../lib/api';
import { formatPnl, formatPct } from '../lib/utils';
import { Trophy } from 'lucide-react';

export function LeaderboardCard({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  if (leaderboard.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-4 w-4 text-accent-yellow" />
          <h3 className="text-sm font-semibold text-white">Leaderboard</h3>
        </div>
        <div className="py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-white/5 mx-auto mb-3 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-gray-600" />
          </div>
          <p className="text-sm text-gray-500">No agents registered yet.</p>
        </div>
      </div>
    );
  }

  const maxPnl = Math.max(...leaderboard.map((e) => Math.abs(e.totalPnl)), 1);

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-yellow/10">
          <Trophy className="h-4 w-4 text-accent-yellow" />
        </div>
        <h3 className="text-sm font-semibold text-white">Leaderboard</h3>
      </div>
      <div className="space-y-3">
        {leaderboard.map((entry) => {
          const isPositive = entry.totalPnl >= 0;
          const barWidth = (Math.abs(entry.totalPnl) / maxPnl) * 100;
          return (
            <div key={entry.name} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                    entry.rank === 1 ? 'bg-accent-yellow/15 text-accent-yellow' :
                    entry.rank === 2 ? 'bg-gray-400/15 text-gray-300' :
                    entry.rank === 3 ? 'bg-orange-500/15 text-orange-400' :
                    'bg-white/5 text-gray-500'
                  }`}>
                    {entry.rank}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{entry.name}</p>
                    <p className="text-[11px] text-gray-500">{entry.totalPositions} positions · {formatPct(entry.roi)} ROI</p>
                  </div>
                </div>
                <p className={`text-sm font-semibold tabular-nums ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
                  {formatPnl(entry.totalPnl)}
                </p>
              </div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden ml-9">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isPositive ? 'bg-accent-green/60' : 'bg-accent-red/60'}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
