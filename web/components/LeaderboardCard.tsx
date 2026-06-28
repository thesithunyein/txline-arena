'use client';

import { LeaderboardEntry } from '../lib/api';
import { formatPnl, formatPct } from '../lib/utils';
import { Trophy } from 'lucide-react';

export function LeaderboardCard({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  if (leaderboard.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <Trophy className="h-4 w-4 text-gray-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Leaderboard</h3>
        </div>
        <div className="py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">No agents registered yet.</p>
        </div>
      </div>
    );
  }

  const maxPnl = Math.max(...leaderboard.map((e) => Math.abs(e.totalPnl)), 1);

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
          <Trophy className="h-4 w-4 text-gray-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Leaderboard</h3>
      </div>
      <div className="space-y-4">
        {leaderboard.map((entry) => {
          const isPositive = entry.totalPnl >= 0;
          const barWidth = (Math.abs(entry.totalPnl) / maxPnl) * 100;
          return (
            <div key={entry.name} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    entry.rank === 1 ? 'bg-amber-100 text-amber-700' :
                    entry.rank === 2 ? 'bg-gray-100 text-gray-600' :
                    entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {entry.rank}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{entry.name}</p>
                    <p className="text-xs text-gray-500">{entry.totalPositions} positions · {formatPct(entry.roi)} ROI</p>
                  </div>
                </div>
                <p className={`text-sm font-semibold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatPnl(entry.totalPnl)}
                </p>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden ml-10">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
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
