'use client';

import { useState } from 'react';
import { BarChart3, Download, Play, Loader2 } from 'lucide-react';

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
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matches: String(matches) }),
      });
      if (!res.ok) throw new Error('Backtest failed');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Backtest error:', err);
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Backtest Results</h1>
        <p className="text-sm text-gray-500 mt-1">Replay historical odds data through the arena&apos;s strategy agents</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
            <BarChart3 className="h-4 w-4 text-accent" />
          </div>
          <h3 className="text-sm font-semibold text-white">Run a Backtest</h3>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Matches</label>
            <input
              type="number"
              min={1}
              max={50}
              value={matches}
              onChange={(e) => setMatches(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
              className="w-24 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
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
            <h3 className="text-sm font-semibold text-white mb-4">Agent Performance Comparison</h3>
            <div className="space-y-3">
              {result.agents.map((agent) => (
                <div key={agent.name} className="flex items-center gap-4">
                  <span className="w-32 text-sm font-medium text-white">{agent.name}</span>
                  <div className="flex-1 h-6 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full ${agent.totalPnl >= 0 ? 'bg-accent-green' : 'bg-accent-red'} transition-all`}
                      style={{ width: `${Math.min(100, Math.abs(agent.totalPnl) / 5)}%` }}
                    />
                  </div>
                  <span className={`w-24 text-right text-sm font-semibold ${agent.totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {agent.totalPnl >= 0 ? '+' : ''}{agent.totalPnl.toFixed(1)} USDC
                  </span>
                  <span className="w-16 text-right text-xs text-gray-500">{(agent.winRate * 100).toFixed(0)}% WR</span>
                  <span className="w-20 text-right text-xs text-gray-500">Sharpe {agent.sharpeRatio.toFixed(2)}</span>
                  <span className="w-20 text-right text-xs text-accent-red">-{agent.maxDrawdown.toFixed(1)}% DD</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4">Equity Curves</h3>
            <div className="space-y-4">
              {result.agents.map((agent) => (
                <div key={agent.name}>
                  <p className="text-xs text-gray-500 mb-1">{agent.name}</p>
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
                          className={`flex-1 ${isProfit ? 'bg-accent-green/40' : 'bg-accent-red/40'} rounded-t hover:opacity-80 transition-opacity`}
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
            <h3 className="text-sm font-semibold text-white mb-3">Detailed Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="pb-3 pr-4">Agent</th>
                    <th className="pb-3 pr-4 text-right">Bankroll</th>
                    <th className="pb-3 pr-4 text-right">P&L</th>
                    <th className="pb-3 pr-4 text-right">ROI</th>
                    <th className="pb-3 pr-4 text-right">Positions</th>
                    <th className="pb-3 pr-4 text-right">Win Rate</th>
                    <th className="pb-3 pr-4 text-right">Sharpe</th>
                    <th className="pb-3 text-right">Max DD</th>
                  </tr>
                </thead>
                <tbody>
                  {result.agents.map((agent) => (
                    <tr key={agent.name} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 pr-4 text-white font-medium">{agent.name}</td>
                      <td className="py-3 pr-4 text-right text-white">{agent.finalBankroll.toFixed(1)}</td>
                      <td className={`py-3 pr-4 text-right font-semibold ${agent.totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {agent.totalPnl >= 0 ? '+' : ''}{agent.totalPnl.toFixed(1)}
                      </td>
                      <td className={`py-3 pr-4 text-right ${agent.roi >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {agent.roi >= 0 ? '+' : ''}{agent.roi.toFixed(1)}%
                      </td>
                      <td className="py-3 pr-4 text-right text-white">{agent.totalPositions}</td>
                      <td className="py-3 pr-4 text-right text-white">{(agent.winRate * 100).toFixed(0)}%</td>
                      <td className="py-3 pr-4 text-right text-white">{agent.sharpeRatio.toFixed(2)}</td>
                      <td className="py-3 text-right text-accent-red">-{agent.maxDrawdown.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Completed in {result.durationMs}ms · {result.totalMatches} matches · {result.totalSignals} signals
            </p>
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="card text-center py-16">
          <div className="h-14 w-14 rounded-2xl bg-white/5 mx-auto mb-4 flex items-center justify-center">
            <BarChart3 className="h-7 w-7 text-gray-600" />
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
      <p className={`mt-2 stat-value ${positive === true ? 'text-accent-green' : positive === false ? 'text-accent-red' : ''}`}>
        {value}
      </p>
    </div>
  );
}
