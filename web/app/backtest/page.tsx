'use client';

import { BarChart3, TrendingUp, TrendingDown, Download } from 'lucide-react';

export default function BacktestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Backtest Results</h1>
        <p className="text-sm text-gray-500">Historical performance replay using TxLINE archived data</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-white">Run a Backtest</h3>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Replay historical TxLINE odds data through the arena&apos;s strategy agents to evaluate
          performance over past matches. Results include P&amp;L, win rate, Sharpe ratio, and
          per-agent breakdowns.
        </p>
        <div className="flex gap-3">
          <button className="btn btn-primary">
            <TrendingUp className="h-4 w-4 inline mr-1" />
            Run Backtest
          </button>
          <button className="btn btn-secondary">
            <Download className="h-4 w-4 inline mr-1" />
            Export Results
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <BacktestStat label="Total Return" value="+12.4%" positive />
        <BacktestStat label="Sharpe Ratio" value="1.82" />
        <BacktestStat label="Max Drawdown" value="-8.3%" negative />
        <BacktestStat label="Win Rate" value="58.3%" />
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-4">Agent Performance Comparison</h3>
        <div className="space-y-3">
          {[
            { name: 'Momentum', pnl: 45.2, winRate: 62, color: 'bg-accent-green' },
            { name: 'Mean Reversion', pnl: -12.8, winRate: 45, color: 'bg-accent-red' },
            { name: 'Value', pnl: 28.6, winRate: 55, color: 'bg-accent-green' },
            { name: 'Market Maker', pnl: 15.4, winRate: 58, color: 'bg-accent-green' },
          ].map((agent) => (
            <div key={agent.name} className="flex items-center gap-4">
              <span className="w-32 text-sm font-medium text-white">{agent.name}</span>
              <div className="flex-1 h-6 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full ${agent.color} transition-all`}
                  style={{ width: `${Math.min(100, Math.abs(agent.pnl) * 2)}%` }}
                />
              </div>
              <span className={`w-20 text-right text-sm font-semibold ${agent.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                {agent.pnl >= 0 ? '+' : ''}{agent.pnl.toFixed(1)} USDC
              </span>
              <span className="w-16 text-right text-xs text-gray-500">{agent.winRate}% WR</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-4">Equity Curve</h3>
        <div className="h-64 flex items-end justify-between gap-1">
          {Array.from({ length: 40 }).map((_, i) => {
            const height = 30 + Math.sin(i * 0.3) * 15 + i * 0.8 + Math.random() * 10;
            return (
              <div
                key={i}
                className="flex-1 bg-accent/30 rounded-t hover:bg-accent/50 transition-colors"
                style={{ height: `${Math.min(100, height)}%` }}
              />
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">Simulated 40-match backtest period</p>
      </div>
    </div>
  );
}

function BacktestStat({ label, value, positive, negative }: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="card">
      <p className="stat-label">{label}</p>
      <p className={`mt-2 stat-value ${positive ? 'text-accent-green' : negative ? 'text-accent-red' : ''}`}>
        {value}
      </p>
    </div>
  );
}
