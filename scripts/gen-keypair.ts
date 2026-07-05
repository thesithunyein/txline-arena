import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

const outPath = path.resolve(process.cwd(), 'keypair.json');

if (fs.existsSync(outPath)) {
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(outPath, 'utf-8')));
  const existing = Keypair.fromSecretKey(secretKey);
  console.log('Keypair already exists at', outPath);
  console.log('Public key:', existing.publicKey.toBase58());
  process.exit(0);
}

const keypair = Keypair.generate();
fs.writeFileSync(outPath, JSON.stringify(Array.from(keypair.secretKey)));
console.log('Generated new keypair at', outPath);
console.log('Public key:', keypair.publicKey.toBase58());
