'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BarChart3, Bot, Github, Link2, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchApi } from '../lib/api';
import { Logo } from './Logo';

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
    const load = () =>
      fetchApi<{ mode: 'live' | 'simulation' }>('/mode')
        .then((d) => setMode(d.mode))
        .catch(() => setMode('simulation'));
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Logo className="h-9 w-9 rounded-xl transition-transform group-hover:scale-105" />
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
          <a
            href="https://github.com/thesithunyein/txline-arena"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Mobile bottom tab bar — native app feel */}
      <div className="bottom-nav fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around border-t border-gray-200 bg-white/95 backdrop-blur-xl md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                active ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-emerald-600')} />
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
