'use client';

import { MatchData } from '../lib/api';
import { Activity } from 'lucide-react';

export function MatchesCard({ matches }: { matches: MatchData[] }) {
  const live = matches.filter((m) => m.status === 'live' || m.status === 'inplay');
  const upcoming = matches.filter((m) => m.status === 'notstarted' || m.status === 'pre');
  const finished = matches.filter((m) => m.status === 'finished' || m.status === 'ft');

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
          <Activity className="h-4 w-4 text-accent" />
        </div>
        <h3 className="text-sm font-semibold text-white">Matches</h3>
        {live.length > 0 && <span className="badge badge-green ml-auto"><span className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse" />{live.length} live</span>}
      </div>
      {matches.length === 0 ? (
        <div className="py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-white/5 mx-auto mb-3 flex items-center justify-center">
            <Activity className="h-5 w-5 text-gray-600" />
          </div>
          <p className="text-sm text-gray-500">No matches loaded.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {live.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-2.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse" />
                Live
              </p>
              <div className="space-y-2">
                {live.map((m) => (
                  <MatchRow key={m.fixtureId} match={m} />
                ))}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-2.5">Upcoming</p>
              <div className="space-y-2">
                {upcoming.slice(0, 5).map((m) => (
                  <MatchRow key={m.fixtureId} match={m} />
                ))}
              </div>
            </div>
          )}
          {finished.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-2.5">Finished</p>
              <div className="space-y-2">
                {finished.slice(0, 5).map((m) => (
                  <MatchRow key={m.fixtureId} match={m} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchRow({ match }: { match: MatchData }) {
  const isLive = match.status === 'live' || match.status === 'inplay';
  const isFinished = match.status === 'finished' || match.status === 'ft';

  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.04] px-3.5 py-2.5 transition-all hover:bg-white/[0.06]">
      <div className="flex items-center gap-2.5 min-w-0">
        {isLive && <span className="h-2 w-2 rounded-full bg-accent-green animate-pulse flex-shrink-0" />}
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{match.home} vs {match.away}</p>
          <p className="text-[11px] text-gray-500 truncate">{match.competition}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {(isLive || isFinished) && (
          <p className="text-sm font-bold text-white tabular-nums">{match.homeScore} - {match.awayScore}</p>
        )}
        <p className="text-[11px] text-gray-500">{match.phase}</p>
      </div>
    </div>
  );
}
