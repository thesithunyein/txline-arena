import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '../components/Navbar';

export const metadata: Metadata = {
  title: 'TxLINE Arena — Autonomous In-Play Trading Agent Platform',
  description: 'Multi-agent autonomous trading arena with on-chain settlement on Solana, powered by TxLINE real-time sports data.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏆</text></svg>',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-gray-200 antialiased">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
          {children}
        </main>
        <footer className="border-t border-white/[0.04] py-6 mt-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs text-gray-600 text-center">
              TxLINE Arena — Powered by{' '}
              <a href="https://txline.txodds.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-accent transition-colors">
                TxLINE
              </a>
              {' · '}
              <a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-accent transition-colors">
                Solana
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
