'use client';

import { useEffect, useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Bot, Zap, Trophy } from 'lucide-react';
import { fetchApi, SignalData, LeaderboardEntry, MatchData, HealthData } from '../lib/api';
import { useWebSocket, ArenaEvent } from '../lib/ws';
import { formatPnl, formatPct, formatTime } from '../lib/utils';
import { LeaderboardCard } from '../components/LeaderboardCard';
import { LiveSignalsCard } from '../components/LiveSignalsCard';
import { MatchesCard } from '../components/MatchesCard';

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
          fetchApi<SignalData[]>('/signals?limit=20').catch(() => []),
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
  const totalPositions = leaderboard.reduce((sum, a) => sum + a.totalPositions, 0);
  const totalSignals = signals.length + liveSignals.length;
  const liveMatches = matches.filter((m) => m.status === 'live' || m.status === 'inplay');

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Arena Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time autonomous trading powered by TxLINE</p>
        </div>
        <div className="flex items-center gap-2">
          {health ? (
            <span className={`badge ${health.mode === 'live' ? 'badge-green' : 'badge-yellow'}`}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: health.mode === 'live' ? '#22c55e' : '#eab308' }} />
              {health.mode === 'live' ? 'LIVE DATA' : 'SIMULATION MODE'}
            </span>
          ) : (
            <span className="badge badge-gray">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
              Connecting...
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Trophy} label="Total P&L" value={formatPnl(totalPnl)} positive={totalPnl >= 0} accent="green" />
        <StatCard icon={Bot} label="Active Agents" value={String(leaderboard.length)} accent="blue" />
        <StatCard icon={Zap} label="Signals Detected" value={String(totalSignals)} accent="yellow" />
        <StatCard icon={Activity} label="Live Matches" value={String(liveMatches.length)} accent="purple" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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

function StatCard({ icon: Icon, label, value, positive, accent }: {
  icon: any;
  label: string;
  value: string;
  positive?: boolean;
  accent?: 'green' | 'blue' | 'yellow' | 'purple';
}) {
  const accentMap = {
    green: 'text-accent-green bg-accent-green/10',
    blue: 'text-accent bg-accent/10',
    yellow: 'text-accent-yellow bg-accent-yellow/10',
    purple: 'text-accent-purple bg-accent-purple/10',
  };
  const iconClass = accent ? accentMap[accent] : 'text-gray-600 bg-white/5';

  return (
    <div className="card card-hover animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <span className="stat-label">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className={`stat-value ${positive === true ? 'text-accent-green' : positive === false ? 'text-accent-red' : ''}`}>
        {value}
      </p>
    </div>
  );
}
