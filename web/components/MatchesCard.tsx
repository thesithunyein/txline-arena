'use client';

import { MatchData } from '../lib/api';
import { Activity } from 'lucide-react';

export function MatchesCard({ matches }: { matches: MatchData[] }) {
  const live = matches.filter((m) => m.status === 'live' || m.status === 'inplay');
  const finished = matches.filter((m) => m.status === 'finished' || m.status === 'ft');
  const upcoming = matches.filter((m) => !live.includes(m) && !finished.includes(m));

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
          <Activity className="h-4 w-4 text-gray-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Matches</h3>
        {live.length > 0 && <span className="badge badge-green ml-auto"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />{live.length} live</span>}
      </div>
      {matches.length === 0 ? (
        <div className="py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center">
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">No matches loaded.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {live.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-3 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
              <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-3">Upcoming</p>
              <div className="space-y-2">
                {upcoming.slice(0, 5).map((m) => (
                  <MatchRow key={m.fixtureId} match={m} />
                ))}
              </div>
            </div>
          )}
          {finished.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-3">Finished</p>
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
    <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 transition-all hover:bg-gray-100">
      <div className="flex items-center gap-3 min-w-0">
        {isLive && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{match.home} vs {match.away}</p>
          <p className="text-xs text-gray-500 truncate">{match.competition}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {(isLive || isFinished) && (
          <p className="text-sm font-bold text-gray-900 tabular-nums">{match.homeScore} - {match.awayScore}</p>
        )}
        <p className="text-xs text-gray-500">{match.phase}</p>
      </div>
    </div>
  );
}
