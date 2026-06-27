'use client';

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

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">TxLINE Arena</span>
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
          <ModeBadge />
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden">
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

function ModeBadge() {
  return (
    <span className="badge badge-blue">
      <span className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse" />
      Live
    </span>
  );
}
