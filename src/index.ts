import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

import { ArenaManager, ArenaEvent } from './arena/manager';
import { MomentumAgent } from './agents/momentum';
import { MeanReversionAgent } from './agents/reversion';
import { ValueAgent } from './agents/value';
import { MarketMakerAgent } from './agents/marketMaker';
import { Server } from './server/index';
import { TxLineStreamManager } from './txline/stream';
import { getFixtures } from './txline/client';
import { setApiToken } from './txline/auth';
import { SimulationEngine } from './simulation/generator';
import { MatchInfo } from './txline/types';
import { MatchRecord } from './db/schema';
import { sendSignalAlert, sendPositionAlert, sendSettlementAlert, sendLeaderboardAlert, isTelegramEnabled } from './alerts/telegram';
import { getDb, closeDb } from './db/database';
import { seedDemoHistoryIfEmpty, seedMatchesOnlyIfEmpty } from './db/seed';

const PORT = parseInt(process.env.PORT || '3001');
const LIVE_MODE = process.env.LIVE_MODE !== 'false';
const BANKROLL = parseFloat(process.env.AGENT_BANKROLL || '1000');

async function main(): Promise<void> {
  console.log('=== TxLINE Arena — Starting ===');
  console.log(`Mode: ${LIVE_MODE ? 'LIVE' : 'SIMULATION'}`);
  console.log(`Telegram: ${isTelegramEnabled() ? 'enabled' : 'disabled'}`);

  await getDb();

  const arena = new ArenaManager();

  const agents = [
    new MomentumAgent(BANKROLL),
    new MeanReversionAgent(BANKROLL),
    new ValueAgent(BANKROLL),
    new MarketMakerAgent(BANKROLL),
  ];

  for (const agent of agents) {
    arena.registerAgent(agent);
    console.log(`Registered agent: ${agent.name} — ${agent.strategy}`);
  }

  arena.addEventListener((event: ArenaEvent) => {
    switch (event.type) {
      case 'signal':
        console.log(`[SIGNAL] ${event.data.match} — ${event.data.selection} ${event.data.direction} (z=${event.data.zScore.toFixed(2)})`);
        sendSignalAlert(event.data);
        break;
      case 'position_open':
        console.log(`[OPEN] ${event.data.agentName} → ${event.data.side} @ ${event.data.odds} (stake: ${event.data.stake})`);
        sendPositionAlert(event.data);
        break;
      case 'position_settle':
        console.log(`[SETTLE] ${event.data.agentName} — ${event.data.won ? 'WON' : 'LOST'} P&L: ${event.data.pnl.toFixed(2)}`);
        sendSettlementAlert(event.data);
        break;
      case 'leaderboard_update':
        sendLeaderboardAlert(event.data);
        break;
      case 'match_end':
        console.log(`[MATCH END] Fixture ${event.data.fixtureId} — ${event.data.homeScore}-${event.data.awayScore}`);
        break;
    }
  });

  const server = new Server(arena, PORT);
  await server.start();

  if (LIVE_MODE) {
    const apiToken = process.env.TXLINE_API_TOKEN;
    if (!apiToken) {
      console.error('No TXLINE_API_TOKEN set. Set it in .env or run npm run activate.');
      console.log('Falling back to SIMULATION mode...');
      await startSimulation(arena);
    } else {
      setApiToken(apiToken);
      await startLive(arena);
    }
  } else {
    await startSimulation(arena);
  }

  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await server.stop();
    closeDb();
    process.exit(0);
  });
}

async function startLive(arena: ArenaManager): Promise<void> {
  console.log('Starting LIVE mode — connecting to TxLINE streams...');

  try {
    const fixtures = await getFixtures();
    console.log(`Retrieved ${fixtures.length} fixtures from TxLINE`);

    const matchRecords: MatchRecord[] = [];
    for (const fixture of fixtures) {
      const match: MatchInfo = {
        fixtureId: fixture.FixtureId,
        home: fixture.Participant1,
        away: fixture.Participant2,
        competition: fixture.CompetitionName,
        startTime: fixture.StartTime,
        status: fixture.Status,
        homeScore: 0,
        awayScore: 0,
        phase: 'PRE',
      };
      arena.updateMatchInfo(match);
      matchRecords.push({
        fixtureId: match.fixtureId,
        home: match.home,
        away: match.away,
        competition: match.competition,
        startTime: match.startTime,
        status: match.status,
        homeScore: 0,
        awayScore: 0,
        phase: match.phase,
        lastUpdated: Date.now(),
      });
    }

    // Live mode: fixture metadata only — agents build real history from TxLINE streams
    await seedMatchesOnlyIfEmpty(matchRecords);
  } catch (err) {
    console.error('Failed to fetch fixtures:', err);
    console.log('Falling back to SIMULATION mode...');
    await startSimulation(arena);
    return;
  }

  const streamManager = new TxLineStreamManager();
  await streamManager.start({
    onOdds: (update) => arena.processOddsUpdate(update),
    onScores: (score) => arena.processScoreUpdate(score),
    onError: (err) => console.error('Stream error:', err.message),
    onReconnect: (attempt) => console.log(`Stream reconnecting (attempt ${attempt})...`),
  });

  console.log('Live streams connected. Arena is running.');
}

async function startSimulation(arena: ArenaManager): Promise<void> {
  console.log('Starting SIMULATION mode...');

  const simMatches: MatchInfo[] = [];
  const teams = [
    { home: 'Brazil', away: 'Argentina' },
    { home: 'France', away: 'Germany' },
    { home: 'Spain', away: 'Portugal' },
    { home: 'England', away: 'Netherlands' },
  ];

  for (let i = 0; i < teams.length; i++) {
    const match: MatchInfo = {
      fixtureId: 100000 + i,
      home: teams[i].home,
      away: teams[i].away,
      competition: 'World Cup 2026',
      startTime: Date.now() - i * 60000,
      status: 'live',
      homeScore: 0,
      awayScore: 0,
      phase: 'H1',
    };
    simMatches.push(match);
    arena.updateMatchInfo(match);
  }

  // Simulation: seed replay history so the dashboard is never empty for judges
  await seedDemoHistoryIfEmpty(simMatches.map(m => ({
    fixtureId: m.fixtureId,
    home: m.home,
    away: m.away,
    competition: m.competition,
    startTime: m.startTime,
    status: m.status,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    phase: m.phase,
    lastUpdated: Date.now(),
  })));

  const sim = new SimulationEngine({
    onOdds: (update) => arena.processOddsUpdate(update),
    onScore: (score) => arena.processScoreUpdate(score),
  });

  sim.initialize(simMatches);
  sim.start(3000);

  console.log(`Simulation running with ${simMatches.length} matches.`);
  console.log('Arena is live. Dashboard available at http://localhost:' + PORT);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
