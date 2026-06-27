import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

import { Keypair, Connection, LAMPORTS_PER_SOL, SystemProgram, Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js';
import fs from 'fs';

const TXLINE_BASE_URL = process.env.TXLINE_BASE_URL || 'https://txline.txodds.com';
const SERVICE_LEVEL_ID = parseInt(process.env.TXLINE_SERVICE_LEVEL_ID || '12');
const DURATION_WEEKS = parseInt(process.env.TXLINE_DURATION_WEEKS || '4');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

const TXLINE_PROGRAM_ID = new PublicKey('9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA');
const TXL_TOKEN_MINT = new PublicKey('Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL');

async function main(): Promise<void> {
  const keypairPath = process.env.SOLANA_WALLET_KEYPAIR_PATH;
  if (!keypairPath || !fs.existsSync(keypairPath)) {
    console.error('No Solana keypair found. Generate one with: solana-keygen new -o keypair.json');
    console.error('Then set SOLANA_WALLET_KEYPAIR_PATH in .env');
    process.exit(1);
  }

  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')));
  const keypair = Keypair.fromSecretKey(secretKey);
  console.log('Wallet public key:', keypair.publicKey.toBase58());

  const connection = new Connection(RPC_URL, 'confirmed');

  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`Devnet SOL balance: ${balance / LAMPORTS_PER_SOL}`);

  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log('Low balance. Requesting airdrop...');
    const sig = await connection.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);
    console.log('Airdrop received');
  }

  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_treasury_v2')],
    TXLINE_PROGRAM_ID
  );
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pricing_matrix')],
    TXLINE_PROGRAM_ID
  );

  console.log('Token Treasury PDA:', tokenTreasuryPda.toBase58());
  console.log('Pricing Matrix PDA:', pricingMatrixPda.toBase58());
  console.log(`Subscribing to service level ${SERVICE_LEVEL_ID} for ${DURATION_WEEKS} weeks...`);

  const data = Buffer.alloc(1 + 1 + 1);
  data.writeUInt8(7, 0);
  data.writeUInt8(SERVICE_LEVEL_ID, 1);
  data.writeUInt8(DURATION_WEEKS, 2);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: pricingMatrixPda, isSigner: false, isWritable: true },
      { pubkey: TXL_TOKEN_MINT, isSigner: false, isWritable: false },
      { pubkey: tokenTreasuryPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: TXLINE_PROGRAM_ID,
    data,
  });

  const tx = new Transaction().add(instruction);
  try {
    const txSig = await connection.sendTransaction(tx, [keypair]);
    await connection.confirmTransaction(txSig);
    console.log('Subscription transaction:', txSig);
    console.log('\nNow run: npm run activate');
    console.log('Set TXLINE_SUBSCRIPTION_TX_SIG=' + txSig + ' in .env');
  } catch (err: any) {
    console.error('Subscription failed:', err.message);
    if (err.logs) console.error('Logs:', err.logs);
  }
}

main().catch(console.error);
