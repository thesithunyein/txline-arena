import axios from 'axios';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '';
const enabled = BOT_TOKEN && CHANNEL_ID;

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendMessage(text: string): Promise<void> {
  if (!enabled) return;

  try {
    await axios.post(`${API_BASE}/sendMessage`, {
      chat_id: CHANNEL_ID,
      text,
      parse_mode: 'Markdown',
    });
  } catch {
    // Telegram errors don't affect the arena
  }
}

export async function sendSignalAlert(signal: {
  match: string;
  market: string;
  selection: string;
  direction: string;
  zScore: number;
  pctChange: number;
  oldOdds: number;
  newOdds: number;
}): Promise<void> {
  const emoji = signal.direction === 'shortening' ? '📉' : '📈';
  await sendMessage(
    `${emoji} *Sharp Movement Detected*\n` +
    `Match: ${signal.match}\n` +
    `Market: ${signal.market} — ${signal.selection}\n` +
    `Direction: ${signal.direction}\n` +
    `Odds: ${signal.oldOdds.toFixed(2)} → ${signal.newOdds.toFixed(2)} (${signal.pctChange.toFixed(1)}%)\n` +
    `Z-Score: ${signal.zScore.toFixed(2)}`
  );
}

export async function sendPositionAlert(data: {
  agentName: string;
  side: string;
  stake: number;
  odds: number;
  fixtureId: number;
}): Promise<void> {
  await sendMessage(
    `🎯 *Position Opened*\n` +
    `Agent: ${data.agentName}\n` +
    `Side: ${data.side} @ ${data.odds.toFixed(2)}\n` +
    `Stake: ${data.stake.toFixed(2)} USDC`
  );
}

export async function sendSettlementAlert(data: {
  agentName: string;
  side: string;
  won: boolean;
  pnl: number;
  bankroll: number;
}): Promise<void> {
  const emoji = data.won ? '✅' : '❌';
  await sendMessage(
    `${emoji} *Position Settled*\n` +
    `Agent: ${data.agentName}\n` +
    `Result: ${data.won ? 'WON' : 'LOST'}\n` +
    `P&L: ${data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(2)} USDC\n` +
    `Bankroll: ${data.bankroll.toFixed(2)} USDC`
  );
}

export async function sendLeaderboardAlert(rankings: Array<{
  rank: number;
  name: string;
  totalPnl: number;
  roi: number;
}>): Promise<void> {
  if (rankings.length === 0) return;
  const top = rankings.slice(0, 3);
  const lines = top.map((r) => `${r.rank}. ${r.name} — P&L: ${r.totalPnl >= 0 ? '+' : ''}${r.totalPnl.toFixed(2)} USDC (${r.roi.toFixed(1)}% ROI)`);
  await sendMessage(`🏆 *Leaderboard Update*\n${lines.join('\n')}`);
}

export function isTelegramEnabled(): boolean {
  return !!enabled;
}
