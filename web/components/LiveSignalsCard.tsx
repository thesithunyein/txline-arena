'use client';

import { SignalData } from '../lib/api';
import { formatTime, formatPct } from '../lib/utils';
import { Zap, TrendingDown, TrendingUp } from 'lucide-react';

export function LiveSignalsCard({ signals }: { signals: SignalData[] }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-yellow/10">
          <Zap className="h-4 w-4 text-accent-yellow" />
        </div>
        <h3 className="text-sm font-semibold text-white">Sharp Movements</h3>
        <span className="badge badge-gray ml-auto">{signals.length} recent</span>
      </div>
      {signals.length === 0 ? (
        <div className="py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-white/5 mx-auto mb-3 flex items-center justify-center">
            <Zap className="h-5 w-5 text-gray-600" />
          </div>
          <p className="text-sm text-gray-500">Waiting for sharp odds movements...</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {signals.map((signal) => (
            <div key={signal.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.04] px-3.5 py-3 transition-all hover:bg-white/[0.06] hover:border-white/[0.08]">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${
                  signal.direction === 'shortening' ? 'bg-accent-green/10' : 'bg-accent-red/10'
                }`}>
                  {signal.direction === 'shortening' ? (
                    <TrendingDown className="h-4 w-4 text-accent-green" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-accent-red" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{signal.match}</p>
                  <p className="text-[11px] text-gray-500">
                    {signal.selection} · {signal.bookmaker} · z={signal.zScore.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-white tabular-nums">
                  {signal.oldOdds.toFixed(2)} → {signal.newOdds.toFixed(2)}
                </p>
                <p className={`text-[11px] tabular-nums ${signal.pctChange >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
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
