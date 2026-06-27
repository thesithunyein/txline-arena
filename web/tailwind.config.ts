import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0e14',
          card: '#111722',
          hover: '#1a2332',
        },
        accent: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          green: '#22c55e',
          red: '#ef4444',
          yellow: '#eab308',
          purple: '#a855f7',
        },
      },
    },
  },
  plugins: [],
};

export default config;
