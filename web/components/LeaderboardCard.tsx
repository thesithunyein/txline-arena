'use client';

import { LeaderboardEntry } from '../lib/api';
import { formatPnl, formatPct } from '../lib/utils';
import { Trophy, Medal } from 'lucide-react';

export function LeaderboardCard({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  if (leaderboard.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-3">Leaderboard</h3>
        <p className="text-sm text-gray-500">No agents registered yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-4 w-4 text-accent-yellow" />
        <h3 className="text-sm font-semibold text-white">Leaderboard</h3>
      </div>
      <div className="space-y-3">
        {leaderboard.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                entry.rank === 1 ? 'bg-accent-yellow/20 text-accent-yellow' :
                entry.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                entry.rank === 3 ? 'bg-orange-500/20 text-orange-500' :
                'bg-white/5 text-gray-500'
              }`}>
                {entry.rank}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{entry.name}</p>
                <p className="text-xs text-gray-500">{entry.totalPositions} positions</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${entry.totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                {formatPnl(entry.totalPnl)}
              </p>
              <p className="text-xs text-gray-500">{formatPct(entry.roi)} ROI</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
