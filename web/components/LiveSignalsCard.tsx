'use client';

import { SignalData } from '../lib/api';
import { formatPct } from '../lib/utils';
import { Zap, TrendingDown, TrendingUp } from 'lucide-react';

export function LiveSignalsCard({ signals }: { signals: SignalData[] }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
          <Zap className="h-4 w-4 text-gray-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Sharp Movements</h3>
        <span className="badge badge-gray ml-auto">{signals.length} recent</span>
      </div>
      {signals.length === 0 ? (
        <div className="py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center">
            <Zap className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">Waiting for sharp odds movements...</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {signals.map((signal) => (
            <div key={signal.id} className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-4 py-3.5 transition-all hover:bg-gray-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                  signal.direction === 'shortening' ? 'bg-emerald-100' : 'bg-red-100'
                }`}>
                  {signal.direction === 'shortening' ? (
                    <TrendingDown className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{signal.match}</p>
                  <p className="text-xs text-gray-500">
                    {signal.selection} · {signal.bookmaker} · z={signal.zScore.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-gray-900 tabular-nums">
                  {signal.oldOdds.toFixed(2)} → {signal.newOdds.toFixed(2)}
                </p>
                <p className={`text-xs tabular-nums ${signal.pctChange >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
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
