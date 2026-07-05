// Real on-chain settlement anchoring on Solana devnet.
//
// Each settled position is anchored as an on-chain transaction using the SPL
// Memo program (already deployed on devnet — no custom program required). The
// memo embeds the position outcome plus a SHA-256 hash of the canonical
// settlement payload, producing a tamper-evident, publicly verifiable record
// that anyone can inspect on Solana Explorer.
//
// This is genuinely on-chain: enable it by setting SETTLEMENT_ONCHAIN=true and
// pointing SOLANA_WALLET_KEYPAIR_PATH at a funded devnet keypair.

import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { createHash } from 'crypto';
import fs from 'fs';

// Canonical SPL Memo program id (live on devnet + mainnet).
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

let connection: Connection | null = null;
let wallet: Keypair | null = null;
let walletResolved = false;

function getWallet(): Keypair | null {
  if (walletResolved) return wallet;
  walletResolved = true;
  try {
    // Containerized deployments: keypair JSON array passed directly via env.
    const inlineKeypair = process.env.SOLANA_WALLET_KEYPAIR;
    if (inlineKeypair) {
      const secret = Uint8Array.from(JSON.parse(inlineKeypair));
      wallet = Keypair.fromSecretKey(secret);
      return wallet;
    }
    const keypairPath = process.env.SOLANA_WALLET_KEYPAIR_PATH;
    if (!keypairPath || !fs.existsSync(keypairPath)) return null;
    const secret = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')));
    wallet = Keypair.fromSecretKey(secret);
  } catch {
    wallet = null;
  }
  return wallet;
}

function getConnection(): Connection {
  if (!connection) connection = new Connection(RPC_URL, 'confirmed');
  return connection;
}

export function isOnChainSettlementEnabled(): boolean {
  return process.env.SETTLEMENT_ONCHAIN === 'true' && getWallet() !== null;
}

export interface SettlementRecord {
  positionId: string;
  agentName: string;
  fixtureId: number;
  side: string;
  outcome: string;
  won: boolean;
  pnl: number;
}

export function settlementHash(rec: SettlementRecord): string {
  // Deterministic canonical encoding so the hash is reproducible by any verifier.
  const canonical = [
    rec.positionId,
    rec.agentName,
    rec.fixtureId,
    rec.side,
    rec.outcome,
    rec.won ? 'win' : 'loss',
    rec.pnl.toFixed(4),
  ].join('|');
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Anchor a settlement on devnet. Returns the real transaction signature, or null
 * if on-chain settlement is disabled / no wallet is configured.
 */
export async function anchorSettlement(rec: SettlementRecord): Promise<string | null> {
  const w = getWallet();
  if (!w || process.env.SETTLEMENT_ONCHAIN !== 'true') return null;

  const conn = getConnection();
  const hash = settlementHash(rec);
  const memo = `TxLINE-Arena|settle|pos=${rec.positionId}|fixture=${rec.fixtureId}|` +
    `${rec.side}|outcome=${rec.outcome}|${rec.won ? 'WIN' : 'LOSS'}|pnl=${rec.pnl.toFixed(2)}|sha256=${hash}`;

  const instruction = new TransactionInstruction({
    keys: [{ pubkey: w.publicKey, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, 'utf-8'),
  });

  const tx = new Transaction().add(instruction);
  const signature = await conn.sendTransaction(tx, [w]);
  await conn.confirmTransaction(signature, 'confirmed');
  return signature;
}

export function explorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
