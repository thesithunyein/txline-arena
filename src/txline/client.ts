import axios, { AxiosInstance } from 'axios';
import { getApiToken, getGuestJwt } from './auth';
import { defaultRateLimiter } from './rateLimiter';
import { Fixture, OddsEntry, ScoreUpdate, StatValidationResponse, ConsensusOdds } from './types';

const TXLINE_BASE_URL = process.env.TXLINE_BASE_URL || 'https://txline.txodds.com';

let httpClient: AxiosInstance | null = null;

async function getClient(): Promise<AxiosInstance> {
  if (httpClient) {
    return httpClient;
  }

  const apiToken = getApiToken() || process.env.TXLINE_API_TOKEN;
  if (!apiToken) {
    throw new Error('No API token. Run activate.ts or set TXLINE_API_TOKEN in .env');
  }

  const jwt = await getGuestJwt();

  httpClient = axios.create({
    timeout: 30000,
    baseURL: TXLINE_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      'X-Api-Token': apiToken,
    },
  });

  return httpClient;
}

export async function getFixtures(competitionId?: number): Promise<Fixture[]> {
  const client = await getClient();
  await defaultRateLimiter.acquire();

  const params: Record<string, number> = {};
  if (competitionId) params.competitionId = competitionId;

  const response = await client.get('/api/fixtures/snapshot', { params });
  return response.data as Fixture[];
}

export async function getOddsSnapshot(fixtureId: number): Promise<OddsEntry[]> {
  const client = await getClient();
  await defaultRateLimiter.acquire();

  const response = await client.get(`/api/odds/snapshot/${fixtureId}`);
  return response.data as OddsEntry[];
}

export async function getOddsUpdates(epochDay: number, hourOfDay: number, interval: number): Promise<OddsEntry[]> {
  const client = await getClient();
  await defaultRateLimiter.acquire();

  const response = await client.get(`/api/odds/updates/${epochDay}/${hourOfDay}/${interval}`);
  return response.data as OddsEntry[];
}

export async function getScoresSnapshot(fixtureId: number, asOf?: number): Promise<ScoreUpdate[]> {
  const client = await getClient();
  await defaultRateLimiter.acquire();

  const params: Record<string, number> = {};
  if (asOf) params.asOf = asOf;

  const response = await client.get(`/api/scores/snapshot/${fixtureId}`, { params });
  return response.data as ScoreUpdate[];
}

export async function getScoresUpdates(fixtureId: number): Promise<ScoreUpdate[]> {
  const client = await getClient();
  await defaultRateLimiter.acquire();

  const response = await client.get(`/api/scores/updates/${fixtureId}`);
  return response.data as ScoreUpdate[];
}

export async function getHistoricalScores(fixtureId: number): Promise<ScoreUpdate[]> {
  const client = await getClient();
  await defaultRateLimiter.acquire();

  const response = await client.get(`/api/scores/historical/${fixtureId}`, {
    headers: { 'Accept-Encoding': 'gzip' },
  });
  return response.data as ScoreUpdate[];
}

export async function getStatValidation(
  fixtureId: number,
  seq: number,
  statKey: number,
  statKey2?: number
): Promise<StatValidationResponse> {
  const client = await getClient();
  await defaultRateLimiter.acquire();

  const params: Record<string, number> = { fixtureId, seq, statKey };
  if (statKey2) params.statKey2 = statKey2;

  const response = await client.get('/api/scores/stat-validation', { params });
  return response.data as StatValidationResponse;
}

export function computeConsensusOdds(oddsEntries: OddsEntry[], fixtureId: number): ConsensusOdds | null {
  const matchMarkets: Record<string, Record<string, number[]>> = {};

  for (const entry of oddsEntries) {
    const key = `${entry.fixtureId}:${entry.market}`;
    if (!matchMarkets[key]) matchMarkets[key] = {};
    if (!matchMarkets[key][entry.selection]) matchMarkets[key][entry.selection] = [];
    matchMarkets[key][entry.selection].push(entry.odds);
  }

  const matchOddsKey = Object.keys(matchMarkets).find((k) => k.startsWith(`${fixtureId}:`));
  if (!matchOddsKey) return null;

  const market = matchOddsKey.split(':')[1];
  const selections = matchMarkets[matchOddsKey];

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const homeOdds = avg(selections['1'] || selections['home'] || []);
  const awayOdds = avg(selections['2'] || selections['away'] || []);
  const drawOdds = avg(selections['X'] || selections['draw'] || []);

  if (!homeOdds || !awayOdds) return null;

  const homeImpliedProb = homeOdds > 0 ? 1 / homeOdds : 0;
  const awayImpliedProb = awayOdds > 0 ? 1 / awayOdds : 0;
  const drawImpliedProb = drawOdds > 0 ? 1 / drawOdds : 0;
  const overround = homeImpliedProb + awayImpliedProb + drawImpliedProb;

  return {
    fixtureId,
    market,
    homeOdds,
    awayOdds,
    drawOdds,
    homeImpliedProb: overround > 0 ? homeImpliedProb / overround : homeImpliedProb,
    awayImpliedProb: overround > 0 ? awayImpliedProb / overround : awayImpliedProb,
    drawImpliedProb: overround > 0 ? drawImpliedProb / overround : drawImpliedProb,
    overround,
    timestamp: Date.now(),
  };
}
