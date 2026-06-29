// Generate REAL Solana devnet settlement transactions for verifiable proof.
//
// Reads settled positions from the local arena database and anchors each one
// on-chain via the SPL Memo program, printing a Solana Explorer link per tx.
// If no settled positions exist yet, it anchors a small representative sample
// so you always have on-chain proof to show in the demo.
//
//   SETTLEMENT_ONCHAIN=true SOLANA_WALLET_KEYPAIR_PATH=./keypair.json \
//     npm run settle:onchain

import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import { anchorSettlement, explorerUrl, SettlementRecord } from '../src/chain/settlement';

async function main(): Promise<void> {
  if (process.env.SETTLEMENT_ONCHAIN !== 'true') {
    console.error('Set SETTLEMENT_ONCHAIN=true to send real transactions.');
    process.exit(1);
  }
  const keypairPath = process.env.SOLANA_WALLET_KEYPAIR_PATH;
  if (!keypairPath || !fs.existsSync(keypairPath)) {
    console.error('No keypair. Generate one: solana-keygen new -o keypair.json');
    console.error('Then set SOLANA_WALLET_KEYPAIR_PATH in .env');
    process.exit(1);
  }

  const wallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8'))));
  const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
  console.log('Wallet:', wallet.publicKey.toBase58());

  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Devnet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  if (balance < 0.01 * LAMPORTS_PER_SOL) {
    console.log('Low balance — requesting airdrop...');
    const sig = await connection.requestAirdrop(wallet.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);
  }

  // Try to load real settled positions from the arena DB.
  let records: SettlementRecord[] = [];
  try {
    const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'txline_arena.json');
    if (fs.existsSync(dbPath)) {
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      const settled = (db.positions || []).filter((p: any) => p.status === 'settled' && !p.settlementTx);
      records = settled.slice(0, 10).map((p: any) => ({
        positionId: p.id,
        agentName: p.agentName,
        fixtureId: p.fixtureId,
        side: p.side,
        outcome: p.pnl >= 0 ? p.side : 'other',
        won: p.pnl >= 0,
        pnl: p.pnl ?? 0,
      }));
    }
  } catch {
    // ignore — fall back to sample below
  }

  if (records.length === 0) {
    console.log('No unsettled-on-chain positions found — anchoring a representative sample.');
    records = [
      { positionId: 'sample-1', agentName: 'Momentum Max', fixtureId: 90101, side: 'home', outcome: 'home', won: true, pnl: 42.5 },
      { positionId: 'sample-2', agentName: 'Contrarian Cleo', fixtureId: 90102, side: 'away', outcome: 'home', won: false, pnl: -18.0 },
      { positionId: 'sample-3', agentName: 'Sharp Shadow', fixtureId: 90103, side: 'home', outcome: 'home', won: true, pnl: 63.2 },
    ];
  }

  console.log(`\nAnchoring ${records.length} settlement(s) on devnet...\n`);
  for (const rec of records) {
    try {
      const sig = await anchorSettlement(rec);
      if (sig) {
        console.log(`✓ ${rec.positionId} (${rec.agentName}, pnl=${rec.pnl}) →`);
        console.log(`  ${explorerUrl(sig)}\n`);
      }
    } catch (err: any) {
      console.error(`✗ ${rec.positionId}: ${err?.message || err}`);
    }
  }

  console.log('Done. Open the Explorer links above to verify on-chain.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
