'use client';

import { Link2, ExternalLink, Shield, Coins } from 'lucide-react';

export default function OnChainPage() {
  const programId = '9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA';
  const tokenMint = 'Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL';
  const explorerBase = 'https://explorer.solana.com';

  return (
    <div className="space-y-10">
      <div className="text-center">
        <h1 className="page-header mb-3">On-Chain Settlement</h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Solana devnet — Anchor program with SPL token transfers and Merkle proof validation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
              <Link2 className="h-4 w-4 text-gray-700" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Program Details</h3>
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
          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
              <Shield className="h-4 w-4 text-gray-700" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Merkle Proof Validation</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            Every TxLINE data update is cryptographically anchored on Solana. The arena validates Merkle proofs
            from TxLINE&apos;s on-chain Merkle root before executing any position settlement.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="badge badge-green">Verified</span>
              <span className="text-gray-500">Odds updates signed & anchored</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="badge badge-green">Verified</span>
              <span className="text-gray-500">Score updates with proof</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="badge badge-green">Verified</span>
              <span className="text-gray-500">Settlement requires valid proof</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <Coins className="h-4 w-4 text-gray-700" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Settlement Flow</h3>
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
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 transition-all hover:bg-gray-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-white text-xs font-bold mb-3">
                  {s.step}
                </div>
                <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
              </div>
              {i < 4 && <div className="hidden md:block absolute top-1/2 -right-2 h-px w-4 bg-gray-200" />}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-5">Instructions</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <p className="flex items-start gap-3"><span className="text-gray-400 font-mono text-xs mt-0.5">1.</span> Generate a Solana keypair: <code className="rounded bg-gray-100 px-2 py-0.5 text-gray-900 font-mono text-xs">solana-keygen new -o keypair.json</code></p>
          <p className="flex items-start gap-3"><span className="text-gray-400 font-mono text-xs mt-0.5">2.</span> Set <code className="rounded bg-gray-100 px-2 py-0.5 text-gray-900 font-mono text-xs">SOLANA_WALLET_KEYPAIR_PATH</code> in .env</p>
          <p className="flex items-start gap-3"><span className="text-gray-400 font-mono text-xs mt-0.5">3.</span> Subscribe to TxLINE: <code className="rounded bg-gray-100 px-2 py-0.5 text-gray-900 font-mono text-xs">npm run subscribe</code></p>
          <p className="flex items-start gap-3"><span className="text-gray-400 font-mono text-xs mt-0.5">4.</span> Activate API token: <code className="rounded bg-gray-100 px-2 py-0.5 text-gray-900 font-mono text-xs">npm run activate</code></p>
          <p className="flex items-start gap-3"><span className="text-gray-400 font-mono text-xs mt-0.5">5.</span> Start the arena: <code className="rounded bg-gray-100 px-2 py-0.5 text-gray-900 font-mono text-xs">npm run dev</code></p>
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
          className="flex items-center gap-1 text-sm text-gray-900 hover:text-gray-600 transition-colors"
        >
          {value.slice(0, 8)}...{value.slice(-4)}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-sm text-gray-900">{value}</span>
      )}
    </div>
  );
}
