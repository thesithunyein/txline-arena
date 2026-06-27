'use client';

import { SignalData } from '../lib/api';
import { formatTime, formatPct } from '../lib/utils';
import { Zap, TrendingDown, TrendingUp } from 'lucide-react';

export function LiveSignalsCard({ signals }: { signals: SignalData[] }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-4 w-4 text-accent-yellow" />
        <h3 className="text-sm font-semibold text-white">Sharp Movements</h3>
        <span className="badge badge-gray ml-auto">{signals.length} recent</span>
      </div>
      {signals.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">Waiting for sharp odds movements...</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {signals.map((signal) => (
            <div key={signal.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                {signal.direction === 'shortening' ? (
                  <TrendingDown className="h-4 w-4 text-accent-green flex-shrink-0" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-accent-red flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{signal.match}</p>
                  <p className="text-xs text-gray-500">
                    {signal.selection} — {signal.bookmaker} — z={signal.zScore.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-white">
                  {signal.oldOdds.toFixed(2)} → {signal.newOdds.toFixed(2)}
                </p>
                <p className={`text-xs ${signal.pctChange >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                  {formatPct(signal.pctChange)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
