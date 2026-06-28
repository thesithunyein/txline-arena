'use client';

import { useEffect, useState } from 'react';
import { Zap, TrendingDown, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { fetchApi, SignalData } from '../../lib/api';
import { useWebSocket, ArenaEvent } from '../../lib/ws';
import { formatTime, formatPct } from '../../lib/utils';

export default function SignalsPage() {
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [filter, setFilter] = useState<'all' | 'shortening' | 'lengthening'>('all');

  useEffect(() => {
    fetchApi<SignalData[]>('/signals?limit=100').then(setSignals).catch(() => {});
  }, []);

  useWebSocket((event: ArenaEvent) => {
    if (event.type === 'signal') {
      setSignals((prev) => [event.data, ...prev].slice(0, 100));
    }
  });

  const filtered = filter === 'all' ? signals : signals.filter((s) => s.direction === filter);
  const correct = signals.filter((s) => s.predicted === true).length;
  const total = signals.filter((s) => s.predicted !== null).length;
  const accuracy = total > 0 ? (correct / total) * 100 : 0;

  return (
    <div className="space-y-10">
      <div className="text-center">
        <h1 className="page-header mb-3">Sharp Movement Signals</h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Real-time odds movement detection with prediction tracking.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card card-hover">
          <p className="stat-label">Total Signals</p>
          <p className="mt-3 stat-value">{signals.length}</p>
        </div>
        <div className="card card-hover">
          <p className="stat-label">Shortening</p>
          <p className="mt-3 stat-value text-emerald-600">{signals.filter((s) => s.direction === 'shortening').length}</p>
        </div>
        <div className="card card-hover">
          <p className="stat-label">Lengthening</p>
          <p className="mt-3 stat-value text-red-600">{signals.filter((s) => s.direction === 'lengthening').length}</p>
        </div>
        <div className="card card-hover">
          <p className="stat-label">Prediction Accuracy</p>
          <p className="mt-3 stat-value">{accuracy.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">{correct}/{total} settled</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'shortening', 'lengthening'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
          >
            {f === 'all' ? 'All' : f === 'shortening' ? 'Shortening' : 'Lengthening'}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="pb-3 pr-4 font-medium">Time</th>
                <th className="pb-3 pr-4 font-medium">Match</th>
                <th className="pb-3 pr-4 font-medium">Selection</th>
                <th className="pb-3 pr-4 font-medium">Direction</th>
                <th className="pb-3 pr-4 text-right font-medium">Odds</th>
                <th className="pb-3 pr-4 text-right font-medium">Change</th>
                <th className="pb-3 pr-4 text-right font-medium">Z-Score</th>
                <th className="pb-3 text-right font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((signal) => (
                <tr key={signal.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 pr-4 text-gray-500">{formatTime(signal.timestamp)}</td>
                  <td className="py-3 pr-4 text-gray-900 font-medium">{signal.match}</td>
                  <td className="py-3 pr-4 text-gray-600">{signal.selection}</td>
                  <td className="py-3 pr-4">
                    {signal.direction === 'shortening' ? (
                      <span className="badge badge-green"><TrendingDown className="h-3 w-3" /> Short</span>
                    ) : (
                      <span className="badge badge-red"><TrendingUp className="h-3 w-3" /> Long</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right text-gray-900 tabular-nums">
                    {signal.oldOdds.toFixed(2)} → {signal.newOdds.toFixed(2)}
                  </td>
                  <td className={`py-3 pr-4 text-right tabular-nums ${signal.pctChange >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatPct(signal.pctChange)}
                  </td>
                  <td className="py-3 pr-4 text-right text-gray-600 tabular-nums">{signal.zScore.toFixed(2)}</td>
                  <td className="py-3 text-right">
                    {signal.predicted === true && <span className="badge badge-green"><CheckCircle className="h-3 w-3" /> Correct</span>}
                    {signal.predicted === false && <span className="badge badge-red"><XCircle className="h-3 w-3" /> Wrong</span>}
                    {signal.predicted === null && <span className="badge badge-gray">Pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-sm text-gray-500 py-12 text-center">No signals detected yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
