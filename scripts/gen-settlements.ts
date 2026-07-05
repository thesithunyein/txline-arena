// Generate REAL Solana devnet settlement transactions for seed data.
//
// This script creates a set of representative settlement records, anchors each
// one on-chain via the SPL Memo program, and outputs a JSON file with the real
// tx signatures that can be embedded into seed.ts.
//
//   npx ts-node scripts/gen-settlements.ts

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import { anchorSettlement, explorerUrl, SettlementRecord } from '../src/chain/settlement';

const AGENTS = ['Momentum', 'Mean Reversion', 'Value', 'Market Maker'];
const FIXTURES = [
  { fixtureId: 18187298, home: 'Brazil', away: 'Norway' },
  { fixtureId: 18192996, home: 'Mexico', away: 'England' },
  { fixtureId: 18182864, home: 'Australia', away: 'Brazil' },
  { fixtureId: 18182808, home: 'Australia', away: 'Brazil' },
  { fixtureId: 18143850, home: 'Vietnam', away: 'Myanmar' },
  { fixtureId: 18193785, home: 'USA', away: 'Belgium' },
];

async function main(): Promise<void> {
  const keypairPath = process.env.SOLANA_WALLET_KEYPAIR_PATH || path.join(process.cwd(), 'keypair.json');
  if (!fs.existsSync(keypairPath)) {
    console.error('No keypair found. Run: npx ts-node scripts/gen-keypair.ts');
    process.exit(1);
  }

  const wallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8'))));
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  console.log('Wallet:', wallet.publicKey.toBase58());

  let balance = await connection.getBalance(wallet.publicKey);
  console.log(`Devnet balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance < 0.05 * LAMPORTS_PER_SOL) {
    console.log('Low balance — requesting airdrop...');
    try {
      const sig = await connection.requestAirdrop(wallet.publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig);
      balance = await connection.getBalance(wallet.publicKey);
      console.log(`New balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    } catch (err: any) {
      console.error('Airdrop failed:', err?.message || err);
      console.log('Continuing with existing balance...');
    }
  }

  // Generate 15 settlement records that match our seed data pattern
  const records: (SettlementRecord & { agentIdx: number; fixtureIdx: number; posIdx: number })[] = [];
  let posIdx = 0;
  for (let i = 0; i < 15; i++) {
    const agentIdx = i % AGENTS.length;
    const fixtureIdx = i % FIXTURES.length;
    const fixture = FIXTURES[fixtureIdx];
    const side = i % 2 === 0 ? 'home' : 'away';
    const won = i % 3 !== 0; // ~67% win rate
    const pnl = won ? Number((20 + (i * 7) % 60).toFixed(2)) : -Number((20 + (i * 5) % 40).toFixed(2));

    records.push({
      positionId: `pos_${posIdx.toString(16).padStart(12, '0')}`,
      agentName: AGENTS[agentIdx],
      fixtureId: fixture.fixtureId,
      side,
      outcome: won ? side : (side === 'home' ? 'away' : 'home'),
      won,
      pnl,
      agentIdx,
      fixtureIdx,
      posIdx,
    } as any);
    posIdx++;
  }

  console.log(`\nAnchoring ${records.length} settlement(s) on devnet...\n`);

  const results: { posIdx: number; agentName: string; fixtureId: number; side: string; won: boolean; pnl: number; txSignature: string; explorerUrl: string }[] = [];

  for (const rec of records) {
    try {
      const sig = await anchorSettlement(rec);
      if (sig) {
        const url = explorerUrl(sig);
        console.log(`✓ ${rec.positionId} (${rec.agentName}, pnl=${rec.pnl}) →`);
        console.log(`  ${url}\n`);
        results.push({
          posIdx: (rec as any).posIdx,
          agentName: rec.agentName,
          fixtureId: rec.fixtureId,
          side: rec.side,
          won: rec.won,
          pnl: rec.pnl,
          txSignature: sig,
          explorerUrl: url,
        });
      }
      // Small delay between txs to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    } catch (err: any) {
      console.error(`✗ ${rec.positionId}: ${err?.message || err}`);
    }
  }

  // Write results to a file for embedding into seed
  const outputPath = path.join(process.cwd(), 'real_settlements.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${results.length} real tx signatures to ${outputPath}`);
  console.log('Done. Open the Explorer links above to verify on-chain.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
