'use client';

import { MatchData } from '../lib/api';
import { Activity } from 'lucide-react';

export function MatchesCard({ matches }: { matches: MatchData[] }) {
  const live = matches.filter((m) => m.status === 'live' || m.status === 'inplay');
  const upcoming = matches.filter((m) => m.status === 'notstarted' || m.status === 'pre');
  const finished = matches.filter((m) => m.status === 'finished' || m.status === 'ft');

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-white">Matches</h3>
      </div>
      {matches.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No matches loaded.</p>
      ) : (
        <div className="space-y-4">
          {live.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Live</p>
              <div className="space-y-2">
                {live.map((m) => (
                  <MatchRow key={m.fixtureId} match={m} />
                ))}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Upcoming</p>
              <div className="space-y-2">
                {upcoming.slice(0, 5).map((m) => (
                  <MatchRow key={m.fixtureId} match={m} />
                ))}
              </div>
            </div>
          )}
          {finished.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Finished</p>
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
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
      <div className="flex items-center gap-2">
        {isLive && <span className="h-2 w-2 rounded-full bg-accent-green animate-pulse" />}
        <div>
          <p className="text-sm font-medium text-white">{match.home} vs {match.away}</p>
          <p className="text-xs text-gray-500">{match.competition}</p>
        </div>
      </div>
      <div className="text-right">
        {isLive || match.status === 'finished' || match.status === 'ft' ? (
          <p className="text-sm font-bold text-white">{match.homeScore} - {match.awayScore}</p>
        ) : null}
        <p className="text-xs text-gray-500">{match.phase}</p>
      </div>
    </div>
  );
}
