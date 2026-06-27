import { SelectionSide } from '../txline/types';

export type SignalDirection = 'shortening' | 'lengthening';

export interface Signal {
  id: string;
  fixtureId: number;
  match: string;
  market: string;
  bookmaker: string;
  selection: string;
  side: SelectionSide;
  oldOdds: number;
  newOdds: number;
  pctChange: number;
  zScore: number;
  direction: SignalDirection;
  confidence: number;
  timestamp: number;
}

export function createSignal(params: {
  fixtureId: number;
  match: string;
  market: string;
  bookmaker: string;
  selection: string;
  side: SelectionSide;
  oldOdds: number;
  newOdds: number;
  pctChange: number;
  zScore: number;
}): Signal {
  const direction: SignalDirection = params.newOdds < params.oldOdds ? 'shortening' : 'lengthening';
  const confidence = Math.min(1, Math.abs(params.zScore) / 5);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    fixtureId: params.fixtureId,
    match: params.match,
    market: params.market,
    bookmaker: params.bookmaker,
    selection: params.selection,
    side: params.side,
    oldOdds: params.oldOdds,
    newOdds: params.newOdds,
    pctChange: params.pctChange,
    zScore: params.zScore,
    direction,
    confidence,
    timestamp: Date.now(),
  };
}
