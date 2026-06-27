'use client';

import { Link2, ExternalLink, Shield, Coins } from 'lucide-react';

export default function OnChainPage() {
  const programId = '9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA';
  const tokenMint = 'Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL';
  const explorerBase = 'https://explorer.solana.com';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">On-Chain Settlement</h1>
        <p className="text-sm text-gray-500">Solana devnet — Anchor program with SPL token transfers and Merkle proof validation</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="h-4 w-4 text-accent-purple" />
            <h3 className="text-sm font-semibold text-white">Program Details</h3>
          </div>
          <div className="space-y-3">
            <DetailRow label="Network" value="Solana Devnet" />
            <DetailRow label="Program ID" value={programId} link={`${explorerBase}/address/${programId}?cluster=devnet`} />
            <DetailRow label="TXL Token Mint" value={tokenMint} link={`${explorerBase}/address/${tokenMint}?cluster=devnet`} />
            <DetailRow label="Framework" value="Anchor 0.30.1" />
            <DetailRow label="Token Standard" value="SPL Token-2022" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-accent-green" />
            <h3 className="text-sm font-semibold text-white">Merkle Proof Validation</h3>
          </div>
          <p className="text-sm text-gray-400 mb-3">
            Every TxLINE data update is cryptographically anchored on Solana. The arena validates Merkle proofs
            from TxLINE&apos;s on-chain Merkle root before executing any position settlement.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="badge badge-green">Verified</span>
              <span className="text-gray-400">Odds updates signed & anchored</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="badge badge-green">Verified</span>
              <span className="text-gray-400">Score updates with proof</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="badge badge-green">Verified</span>
              <span className="text-gray-400">Settlement requires valid proof</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="h-4 w-4 text-accent-yellow" />
          <h3 className="text-sm font-semibold text-white">Settlement Flow</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {[
            { step: '1', title: 'Signal Detected', desc: 'Sharp movement triggers agent decision' },
            { step: '2', title: 'Position Opened', desc: 'Stake locked in SPL token account' },
            { step: '3', title: 'Match Ends', desc: 'Final score from TxLINE feed' },
            { step: '4', title: 'Merkle Proof', desc: 'On-chain validation of outcome data' },
            { step: '5', title: 'Settlement', desc: 'P&L transferred via Anchor program' },
          ].map((s, i) => (
            <div key={s.step} className="relative">
              <div className="rounded-lg bg-white/5 p-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-bold mb-2">
                  {s.step}
                </div>
                <p className="text-sm font-medium text-white">{s.title}</p>
                <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
              </div>
              {i < 4 && <div className="hidden md:block absolute top-1/2 -right-2 h-px w-4 bg-white/10" />}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-3">Instructions</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <p>1. Generate a Solana keypair: <code className="rounded bg-white/5 px-1.5 py-0.5 text-accent">solana-keygen new -o keypair.json</code></p>
          <p>2. Set <code className="rounded bg-white/5 px-1.5 py-0.5 text-accent">SOLANA_WALLET_KEYPAIR_PATH</code> in .env</p>
          <p>3. Subscribe to TxLINE: <code className="rounded bg-white/5 px-1.5 py-0.5 text-accent">npm run subscribe</code></p>
          <p>4. Activate API token: <code className="rounded bg-white/5 px-1.5 py-0.5 text-accent">npm run activate</code></p>
          <p>5. Start the arena: <code className="rounded bg-white/5 px-1.5 py-0.5 text-accent">npm run dev</code></p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-accent hover:text-accent-hover"
        >
          {value.slice(0, 8)}...{value.slice(-4)}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-sm text-white">{value}</span>
      )}
    </div>
  );
}
