'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BarChart3, Bot, Link2, Trophy, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { href: '/', label: 'Overview', icon: Activity },
  { href: '/signals', label: 'Signals', icon: Zap },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/onchain', label: 'On-Chain', icon: Link2 },
  { href: '/backtest', label: 'Backtest', icon: BarChart3 },
];

export function Navbar() {
  const pathname = usePathname();
  const [mode, setMode] = useState<'live' | 'simulation' | null>(null);

  useEffect(() => {
    fetch('/api/mode')
      .then((r) => r.json())
      .then((d) => setMode(d.mode))
      .catch(() => setMode(null));
    const interval = setInterval(() => {
      fetch('/api/mode')
        .then((r) => r.json())
        .then((d) => setMode(d.mode))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white transition-transform group-hover:scale-105">
            <Trophy className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold text-gray-900 tracking-tight">TxLINE Arena</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('nav-link', active && 'nav-link-active')}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <ModeBadge mode={mode} />
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto px-4 pb-3 md:hidden [&::-webkit-scrollbar]:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('nav-link whitespace-nowrap', active && 'nav-link-active')}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ModeBadge({ mode }: { mode: 'live' | 'simulation' | null }) {
  if (mode === null) {
    return (
      <span className="badge badge-gray">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
        Connecting
      </span>
    );
  }

  const isLive = mode === 'live';
  return (
    <span className={cn('badge', isLive ? 'badge-green' : 'badge-yellow')}>
      <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', isLive ? 'bg-emerald-500' : 'bg-amber-500')} />
      {isLive ? 'LIVE' : 'SIMULATION'}
    </span>
  );
}
