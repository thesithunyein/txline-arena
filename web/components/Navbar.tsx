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
    <nav className="sticky top-0 z-50 border-b border-white/[0.04] bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-purple shadow-[0_2px_12px_rgba(59,130,246,0.3)] transition-transform group-hover:scale-105">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-white leading-none">TxLINE Arena</span>
            <span className="text-[10px] text-gray-500 leading-none mt-0.5">Autonomous Trading</span>
          </div>
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

      <div className="flex items-center gap-1 overflow-x-auto px-4 pb-2.5 md:hidden [&::-webkit-scrollbar]:hidden">
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
      <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', isLive ? 'bg-accent-green' : 'bg-accent-yellow')} />
      {isLive ? 'LIVE' : 'SIMULATION'}
    </span>
  );
}
