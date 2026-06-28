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
    <html lang="en" className="light">
      <body className="min-h-screen bg-bg text-gray-900 antialiased">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 animate-fade-in">
          {children}
        </main>
        <footer className="border-t border-gray-200 py-8 mt-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-gray-400 text-center">
              TxLINE Arena — Autonomous multi-agent trading arena powered by{' '}
              <a href="https://txline.txodds.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-900 transition-colors">
                TxLINE
              </a>
              {' and '}
              <a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-900 transition-colors">
                Solana
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
