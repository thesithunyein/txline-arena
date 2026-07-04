'use client';

import { useState } from 'react';
import { BarChart3, Download, Play, Loader2 } from 'lucide-react';
import { demoBacktest } from '../../lib/demo';

interface BacktestAgentResult {
  name: string;
  strategy: string;
  finalBankroll: number;
  totalPnl: number;
  roi: number;
  totalPositions: number;
  wins: number;
  losses: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  equityCurve: { timestamp: number; equity: number }[];
}

interface BacktestResult {
  config: { initialBankroll: number; zScoreThreshold: number; pctChangeThreshold: number; windowSize: number };
  totalMatches: number;
  totalSignals: number;
  totalPositions: number;
  predictionAccuracy: number;
  agents: BacktestAgentResult[];
  startedAt: number;
  completedAt: number;
  durationMs: number;
}

export default function BacktestPage() {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(10);

  async function runBacktest() {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matches: String(matches) }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('Backtest failed');
      const data = await res.json();
      setResult(data);
    } catch {
      // No backend reachable (static demo link) — run the deterministic replay
      // backtest so the page always demonstrates the product.
      await new Promise((r) => setTimeout(r, 900));
      setResult(demoBacktest(matches) as BacktestResult);
    } finally {
      setLoading(false);
    }
  }

  function exportResults() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-10">
      <div className="text-center">
        <h1 className="page-header mb-3">Backtest Results</h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Replay historical odds data through the arena&apos;s strategy agents.
        </p>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <BarChart3 className="h-4 w-4 text-gray-700" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Run a Backtest</h3>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Matches</label>
            <input
              type="number"
              min={1}
              max={50}
              value={matches}
              onChange={(e) => setMatches(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
              className="w-24 rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
            />
          </div>
          <button onClick={runBacktest} disabled={loading} className="btn btn-primary disabled:opacity-50">
            {loading ? <><Loader2 className="h-4 w-4 inline mr-1 animate-spin" /> Running...</> : <><Play className="h-4 w-4 inline mr-1" /> Run Backtest</>}
          </button>
          {result && (
            <button onClick={exportResults} className="btn btn-secondary">
              <Download className="h-4 w-4 inline mr-1" />
              Export Results
            </button>
          )}
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <BacktestStat label="Total Return" value={`${result.agents.reduce((s, a) => s + a.totalPnl, 0).toFixed(1)} USDC`} positive={result.agents.reduce((s, a) => s + a.totalPnl, 0) >= 0} />
            <BacktestStat label="Signals Detected" value={String(result.totalSignals)} />
            <BacktestStat label="Total Positions" value={String(result.totalPositions)} />
            <BacktestStat label="Prediction Accuracy" value={`${result.predictionAccuracy.toFixed(1)}%`} />
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-5">Agent Performance Comparison</h3>
            <div className="space-y-4">
              {result.agents.map((agent) => (
                <div key={agent.name} className="flex items-center gap-4">
                  <span className="w-32 text-sm font-medium text-gray-900">{agent.name}</span>
                  <div className="flex-1 h-6 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full ${agent.totalPnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'} transition-all`}
                      style={{ width: `${Math.min(100, Math.abs(agent.totalPnl) / 5)}%` }}
                    />
                  </div>
                  <span className={`w-24 text-right text-sm font-semibold tabular-nums ${agent.totalPnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {agent.totalPnl >= 0 ? '+' : ''}{agent.totalPnl.toFixed(1)} USDC
                  </span>
                  <span className="w-16 text-right text-xs text-gray-500">{(agent.winRate * 100).toFixed(0)}% WR</span>
                  <span className="w-20 text-right text-xs text-gray-500">Sharpe {agent.sharpeRatio.toFixed(2)}</span>
                  <span className="w-20 text-right text-xs text-red-600">-{agent.maxDrawdown.toFixed(1)}% DD</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-5">Equity Curves</h3>
            <div className="space-y-5">
              {result.agents.map((agent) => (
                <div key={agent.name}>
                  <p className="text-xs text-gray-500 mb-2 font-medium">{agent.name}</p>
                  <div className="h-16 flex items-end gap-px">
                    {agent.equityCurve.map((point, i) => {
                      const maxEquity = Math.max(...agent.equityCurve.map((p) => p.equity));
                      const minEquity = Math.min(...agent.equityCurve.map((p) => p.equity));
                      const range = maxEquity - minEquity || 1;
                      const height = ((point.equity - minEquity) / range) * 100;
                      const isProfit = point.equity >= result.config.initialBankroll;
                      return (
                        <div
                          key={i}
                          className={`flex-1 ${isProfit ? 'bg-emerald-400' : 'bg-red-400'} rounded-t hover:opacity-80 transition-opacity`}
                          style={{ height: `${Math.max(2, height)}%` }}
                          title={`${point.equity.toFixed(1)} USDC`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-5">Detailed Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                    <th className="pb-3 pr-4 font-medium">Agent</th>
                    <th className="pb-3 pr-4 text-right font-medium">Bankroll</th>
                    <th className="pb-3 pr-4 text-right font-medium">P&L</th>
                    <th className="pb-3 pr-4 text-right font-medium">ROI</th>
                    <th className="pb-3 pr-4 text-right font-medium">Positions</th>
                    <th className="pb-3 pr-4 text-right font-medium">Win Rate</th>
                    <th className="pb-3 pr-4 text-right font-medium">Sharpe</th>
                    <th className="pb-3 text-right font-medium">Max DD</th>
                  </tr>
                </thead>
                <tbody>
                  {result.agents.map((agent) => (
                    <tr key={agent.name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 pr-4 text-gray-900 font-medium">{agent.name}</td>
                      <td className="py-3 pr-4 text-right text-gray-900 tabular-nums">{agent.finalBankroll.toFixed(1)}</td>
                      <td className={`py-3 pr-4 text-right font-semibold tabular-nums ${agent.totalPnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {agent.totalPnl >= 0 ? '+' : ''}{agent.totalPnl.toFixed(1)}
                      </td>
                      <td className={`py-3 pr-4 text-right tabular-nums ${agent.roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {agent.roi >= 0 ? '+' : ''}{agent.roi.toFixed(1)}%
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-900 tabular-nums">{agent.totalPositions}</td>
                      <td className="py-3 pr-4 text-right text-gray-900 tabular-nums">{(agent.winRate * 100).toFixed(0)}%</td>
                      <td className="py-3 pr-4 text-right text-gray-900 tabular-nums">{agent.sharpeRatio.toFixed(2)}</td>
                      <td className="py-3 text-right text-red-600 tabular-nums">-{agent.maxDrawdown.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Completed in {result.durationMs}ms · {result.totalMatches} matches · {result.totalSignals} signals
            </p>
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="card text-center py-16">
          <div className="h-14 w-14 rounded-2xl bg-gray-100 mx-auto mb-4 flex items-center justify-center">
            <BarChart3 className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">Run a backtest to see performance results across all agents.</p>
        </div>
      )}
    </div>
  );
}

function BacktestStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="card">
      <p className="stat-label">{label}</p>
      <p className={`mt-2 stat-value ${positive === true ? 'text-emerald-600' : positive === false ? 'text-red-600' : ''}`}>
        {value}
      </p>
    </div>
  );
}
