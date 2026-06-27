import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import axios from 'axios';
import { Buffer } from 'buffer';
import fs from 'fs';

const TXLINE_BASE_URL = process.env.TXLINE_BASE_URL || 'https://txline.txodds.com';

async function main(): Promise<void> {
  const keypairPath = process.env.SOLANA_WALLET_KEYPAIR_PATH;
  if (!keypairPath || !fs.existsSync(keypairPath)) {
    console.error('No Solana keypair found. Set SOLANA_WALLET_KEYPAIR_PATH in .env');
    process.exit(1);
  }

  const txSig = process.env.TXLINE_SUBSCRIPTION_TX_SIG;
  if (!txSig) {
    console.error('No subscription tx signature. Set TXLINE_SUBSCRIPTION_TX_SIG in .env');
    console.error('You get this from running: npm run subscribe');
    process.exit(1);
  }

  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')));
  const keypair = Keypair.fromSecretKey(secretKey);
  console.log('Wallet:', keypair.publicKey.toBase58());

  console.log('Getting guest JWT...');
  const authResponse = await axios.post(`${TXLINE_BASE_URL}/auth/guest/start`);
  const jwt = authResponse.data.token;

  const selectedLeagues: number[] = [];
  const messageString = `${txSig}:${selectedLeagues.join(',')}:${jwt}`;
  const message = new TextEncoder().encode(messageString);
  const signatureBytes = nacl.sign.detached(message, keypair.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString('base64');

  console.log('Activating API token...');
  const activationResponse = await axios.post(
    `${TXLINE_BASE_URL}/api/token/activate`,
    { txSig, walletSignature, leagues: selectedLeagues },
    { headers: { Authorization: `Bearer ${jwt}` } }
  );

  const apiToken = activationResponse.data.token || activationResponse.data;
  console.log('\n✅ API Token activated successfully!');
  console.log(`Token: ${apiToken}`);
  console.log('\nAdd this to your .env file:');
  console.log(`TXLINE_API_TOKEN=${apiToken}`);
}

main().catch(console.error);
