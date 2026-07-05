import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

import * as anchor from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { Keypair, Connection, LAMPORTS_PER_SOL, SystemProgram, PublicKey } from '@solana/web3.js';
import fs from 'fs';

// Free World Cup tier per https://txline.txodds.com/documentation/worldcup
// Service level 1 = World Cup & Int Friendlies (60-second delay), free on devnet
const SERVICE_LEVEL_ID = parseInt(process.env.TXLINE_SERVICE_LEVEL_ID || '1');
const DURATION_WEEKS = parseInt(process.env.TXLINE_DURATION_WEEKS || '4');

const NETWORK = (process.env.TXLINE_NETWORK || 'devnet') as 'mainnet' | 'devnet';
const CONFIG = {
  mainnet: {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    apiOrigin: 'https://txline.txodds.com',
    programId: new PublicKey('9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA'),
    txlTokenMint: new PublicKey('Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL'),
  },
  devnet: {
    rpcUrl: 'https://api.devnet.solana.com',
    apiOrigin: 'https://txline-dev.txodds.com',
    programId: new PublicKey('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J'),
    txlTokenMint: new PublicKey('4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG'),
  },
} as const;

async function main(): Promise<void> {
  const { rpcUrl, apiOrigin, programId, txlTokenMint } = CONFIG[NETWORK];

  const keypairPath = process.env.SOLANA_WALLET_KEYPAIR_PATH || 'keypair.json';
  if (!fs.existsSync(keypairPath)) {
    console.error('No Solana keypair found. Generate one with: npx ts-node scripts/gen-keypair.ts');
    console.error('Then set SOLANA_WALLET_KEYPAIR_PATH in .env');
    process.exit(1);
  }

  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')));
  const keypair = Keypair.fromSecretKey(secretKey);
  console.log('Network:', NETWORK);
  console.log('Wallet public key:', keypair.publicKey.toBase58());

  const connection = new Connection(process.env.SOLANA_RPC_URL || rpcUrl, 'confirmed');

  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`SOL balance: ${balance / LAMPORTS_PER_SOL}`);

  if (NETWORK === 'devnet' && balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log('Low balance. Requesting airdrop...');
    try {
      const sig = await connection.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig);
      console.log('Airdrop received');
    } catch (err: any) {
      console.error('Airdrop failed (rate limited?). Fund manually at https://faucet.solana.com');
      console.error(err.message);
      process.exit(1);
    }
  }

  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  console.log('Fetching program IDL from chain...');
  const idl = await anchor.Program.fetchIdl(programId, provider);
  if (!idl) {
    console.error('Could not fetch IDL for program', programId.toBase58());
    console.error('Download idl/txoracle.json from the TxLINE docs and place it in the repo.');
    process.exit(1);
  }
  const program = new anchor.Program(idl, provider);

  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_treasury_v2')],
    program.programId
  );
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    txlTokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pricing_matrix')],
    program.programId
  );
  const userTokenAccount = getAssociatedTokenAddressSync(
    txlTokenMint,
    keypair.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log(`Subscribing to service level ${SERVICE_LEVEL_ID} for ${DURATION_WEEKS} weeks...`);

  try {
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      keypair.publicKey,
      userTokenAccount,
      keypair.publicKey,
      txlTokenMint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const txSig = await (program.methods as any)
      .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
      .preInstructions([createAtaIx])
      .accounts({
        user: keypair.publicKey,
        pricingMatrix: pricingMatrixPda,
        tokenMint: txlTokenMint,
        userTokenAccount,
        tokenTreasuryVault,
        tokenTreasuryPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('Subscription transaction:', txSig);
    console.log(`Explorer: https://explorer.solana.com/tx/${txSig}?cluster=${NETWORK === 'devnet' ? 'devnet' : 'mainnet-beta'}`);
    console.log('\nNow set in .env:');
    console.log(`TXLINE_SUBSCRIPTION_TX_SIG=${txSig}`);
    console.log(`TXLINE_BASE_URL=${apiOrigin}`);
    console.log('Then run: npm run activate');
  } catch (err: any) {
    console.error('Subscription failed:', err.message);
    if (err.logs) console.error('Logs:', err.logs);
  }
}

main().catch(console.error);
