'use client';

import { Link2, ExternalLink, Shield, Coins } from 'lucide-react';

export default function OnChainPage() {
  const programId = '9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA';
  const tokenMint = 'Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL';
  const explorerBase = 'https://explorer.solana.com';

  return (
    <div className="space-y-10">
      <div className="text-center">
        <h1 className="page-header mb-3">On-Chain & Data Integrity</h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          TxLINE anchors every World Cup data update on Solana. The arena subscribes to that feed with a
          real devnet transaction and verifies each update before any agent acts on it.
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
            <h3 className="text-sm font-semibold text-gray-900">Data Integrity Verification</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            TxLINE cryptographically anchors its feed on Solana. Before acting on a score, the arena calls the
            TxLINE <code className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-900 font-mono text-xs">stat-validation</code> endpoint
            to confirm the update is authentic — so settlement is driven only by verified outcome data.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="badge badge-green">Verified</span>
              <span className="text-gray-500">Odds &amp; scores sourced from anchored feed</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="badge badge-green">Verified</span>
              <span className="text-gray-500">Final score confirmed via stat-validation</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="badge badge-green">Deterministic</span>
              <span className="text-gray-500">Settlement is reproducible &amp; auditable</span>
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
            { step: '1', title: 'Signal Detected', desc: 'Z-score sharp movement triggers agent decision' },
            { step: '2', title: 'Position Opened', desc: 'Agent stakes from its tracked bankroll' },
            { step: '3', title: 'Match Ends', desc: 'Final score pulled from TxLINE feed' },
            { step: '4', title: 'Outcome Verified', desc: 'TxLINE stat-validation confirms the result' },
            { step: '5', title: 'Settled', desc: 'Deterministic P&L on the auditable ledger' },
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-5">How to run the on-chain flow</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p className="flex items-start gap-3"><span className="text-gray-400 font-mono text-xs mt-0.5">1.</span> Generate a Solana keypair: <code className="rounded bg-gray-100 px-2 py-0.5 text-gray-900 font-mono text-xs">solana-keygen new -o keypair.json</code></p>
            <p className="flex items-start gap-3"><span className="text-gray-400 font-mono text-xs mt-0.5">2.</span> Set <code className="rounded bg-gray-100 px-2 py-0.5 text-gray-900 font-mono text-xs">SOLANA_WALLET_KEYPAIR_PATH</code> in .env</p>
            <p className="flex items-start gap-3"><span className="text-gray-400 font-mono text-xs mt-0.5">3.</span> Subscribe to TxLINE on devnet: <code className="rounded bg-gray-100 px-2 py-0.5 text-gray-900 font-mono text-xs">npm run subscribe</code></p>
            <p className="flex items-start gap-3"><span className="text-gray-400 font-mono text-xs mt-0.5">4.</span> Activate API token: <code className="rounded bg-gray-100 px-2 py-0.5 text-gray-900 font-mono text-xs">npm run activate</code></p>
            <p className="flex items-start gap-3"><span className="text-gray-400 font-mono text-xs mt-0.5">5.</span> Start the arena: <code className="rounded bg-gray-100 px-2 py-0.5 text-gray-900 font-mono text-xs">npm run dev</code></p>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-5">What&apos;s on-chain today vs. roadmap</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="badge badge-green mt-0.5">Live</span>
              <span className="text-gray-600">Real devnet subscription transaction to the TxLINE program for data access.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="badge badge-green mt-0.5">Live</span>
              <span className="text-gray-600">Consuming TxLINE&apos;s Solana-anchored odds &amp; score feed.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="badge badge-green mt-0.5">Live</span>
              <span className="text-gray-600">Outcome verification via the stat-validation endpoint before settlement.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="badge badge-yellow mt-0.5">Roadmap</span>
              <span className="text-gray-600">Anchor program to escrow stakes &amp; record each settlement as an on-chain SPL transfer.</span>
            </div>
          </div>
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
