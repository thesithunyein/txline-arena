import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '../components/Navbar';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'TxLINE Arena — Autonomous In-Play Trading Agents',
    template: '%s · TxLINE Arena',
  },
  description:
    'Multi-agent autonomous trading arena with on-chain settlement on Solana, powered by TxLINE real-time sports data.',
  applicationName: 'TxLINE Arena',
  openGraph: {
    title: 'TxLINE Arena',
    description:
      'Autonomous trading agents on real-time sports data with Solana on-chain settlement.',
    type: 'website',
    siteName: 'TxLINE Arena',
  },
  twitter: {
    card: 'summary',
    title: 'TxLINE Arena',
    description:
      'Autonomous trading agents on real-time sports data with Solana on-chain settlement.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fafafa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`light ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-bg text-gray-900 antialiased">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 animate-fade-in pb-24 md:pb-10">
          {children}
        </main>
        <footer className="border-t border-gray-200 py-8 mt-12 mb-16 md:mb-0">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <p className="text-sm text-gray-400">
              TxLINE Arena — Autonomous multi-agent trading arena
            </p>
            <p className="text-sm text-gray-400">
              Powered by{' '}
              <a href="https://txline.txodds.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-900 transition-colors font-medium">
                TxLINE
              </a>
              {' · '}
              <a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-900 transition-colors font-medium">
                Solana
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
