'use client';

import { useEffect, useState } from 'react';
import { Activity, Bot, Zap, Trophy } from 'lucide-react';
import { fetchApi, SignalData, LeaderboardEntry, MatchData, HealthData } from '../lib/api';
import { useWebSocket, ArenaEvent } from '../lib/ws';
import { formatPnl } from '../lib/utils';
import { LeaderboardCard } from '../components/LeaderboardCard';
import { LiveSignalsCard } from '../components/LiveSignalsCard';
import { MatchesCard } from '../components/MatchesCard';
import { PredictionAccuracyCard } from '../components/PredictionAccuracyCard';
import { ConsensusCard } from '../components/ConsensusCard';
import { AttributionCard } from '../components/AttributionCard';

export default function OverviewPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [liveSignals, setLiveSignals] = useState<SignalData[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [h, s, lb, m] = await Promise.all([
          fetchApi<HealthData>('/health').catch(() => null),
          fetchApi<SignalData[]>('/signals?limit=200').catch(() => []),
          fetchApi<LeaderboardEntry[]>('/leaderboard').catch(() => []),
          fetchApi<MatchData[]>('/matches').catch(() => []),
        ]);
        if (h) setHealth(h);
        setSignals(s);
        setLeaderboard(lb);
        setMatches(m);
      } catch {}
    }
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  useWebSocket((event: ArenaEvent) => {
    if (event.type === 'signal') {
      setLiveSignals((prev) => [event.data, ...prev].slice(0, 10));
    }
  });

  const totalPnl = leaderboard.reduce((sum, a) => sum + a.totalPnl, 0);
  const totalSignals = signals.length + liveSignals.length;
  const liveMatches = matches.filter((m) => m.status === 'live' || m.status === 'inplay');

  return (
    <div className="space-y-10">
      <div className="relative text-center py-8 sm:py-12 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16,185,129,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(6,182,212,0.1) 0%, transparent 50%)' }} />
        <div className="relative px-4">
          <h1 className="page-header mb-4 text-balance">
            Autonomous trading on{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              real-time sports data
            </span>
            .
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto text-balance">
            Multi-agent arena that detects sharp odds movements, opens positions, and settles on Solana — all from one dashboard.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6">
            {health ? (
              <span className={`badge ${health.mode === 'live' ? 'badge-green' : 'badge-yellow'}`}>
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: health.mode === 'live' ? '#10b981' : '#f59e0b' }} />
                {health.mode === 'live' ? 'LIVE DATA' : 'SIMULATION MODE'}
              </span>
            ) : (
              <span className="badge badge-gray">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                Connecting...
              </span>
            )}
            <span className="badge badge-blue">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-900" />
              Solana Devnet
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Trophy} label="Total P&L" value={formatPnl(totalPnl)} positive={totalPnl >= 0} delay={0} />
        <StatCard icon={Bot} label="Active Agents" value={String(leaderboard.length)} delay={75} />
        <StatCard icon={Zap} label="Signals Detected" value={String(totalSignals)} delay={150} />
        <StatCard icon={Activity} label="Live Matches" value={String(liveMatches.length)} delay={225} />
      </div>

      <PredictionAccuracyCard signals={signals} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ConsensusCard />
        <AttributionCard />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <LiveSignalsCard signals={liveSignals.length > 0 ? liveSignals : signals.slice(0, 10)} />
          <MatchesCard matches={matches} />
        </div>
        <div>
          <LeaderboardCard leaderboard={leaderboard} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, positive, delay = 0 }: {
  icon: any;
  label: string;
  value: string;
  positive?: boolean;
  delay?: number;
}) {
  return (
    <div className="card card-hover animate-slide-up" style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}>
      <div className="flex items-center justify-between mb-4">
        <span className="stat-label">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
      </div>
      <p className={`stat-value ${positive === true ? 'text-emerald-600' : positive === false ? 'text-red-600' : ''}`}>
        {value}
      </p>
    </div>
  );
}
