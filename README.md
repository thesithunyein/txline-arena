# TxLINE Arena

**Autonomous In-Play Trading Agent Platform on Solana**

TxLINE Arena is a multi-agent autonomous trading arena that ingests real-time TxLINE sports data feeds, detects sharp odds movements, and executes strategy-driven positions with on-chain settlement on Solana devnet.

## Overview

- **Sharp Movement Detection**: Z-score and percentage-change based detection on live TxLINE odds streams, with prediction tracking
- **4 Strategy Agents**: Momentum, Mean Reversion, Value, and Market Maker — each with Kelly Criterion position sizing
- **Agent vs Agent Arena**: Agents compete on the same TxLINE feed; leaderboard ranks by P&L, ROI, win rate, Sharpe ratio
- **Circuit Breaker**: Auto-pauses agents after consecutive losses to prevent capital drain
- **On-Chain Settlement**: Solana Anchor program with SPL token transfers and Merkle proof validation
- **Simulation Mode**: GBM-calibrated synthetic data engine for demos when no live matches
- **Real-Time Dashboard**: Next.js 14 dashboard with WebSocket live updates
- **Telegram Alerts**: Real-time signal, position, and settlement notifications

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     TxLINE Arena                          │
│                                                          │
│  ┌─────────────┐   ┌──────────────┐   ┌───────────────┐  │
│  │  TxLINE API │──▶│  Detector    │──▶│  Arena Manager│  │
│  │  (REST/SSE) │   │  (Z-score)   │   │  (Orchestrator)│  │
│  └─────────────┘   └──────────────┘   └───────┬───────┘  │
│                                                │          │
│                    ┌───────────────────────────┼──┐       │
│                    │                           │  │       │
│               ┌────▼────┐  ┌────────┐  ┌──────▼──┐      │
│               │Momentum │  │Reversion│  │  Value  │      │
│               │  Agent  │  │  Agent  │  │  Agent  │      │
│               └────┬────┘  └───┬────┘  └────┬────┘      │
│                    │           │            │            │
│               ┌────▼───────────▼────────────▼────┐       │
│               │       Market Maker Agent         │       │
│               └────────────┬─────────────────────┘       │
│                            │                             │
│               ┌────────────▼─────────────────────┐       │
│               │    Circuit Breaker + Leaderboard │       │
│               └────────────┬─────────────────────┘       │
│                            │                             │
│               ┌────────────▼─────────────────────┐       │
│               │     Solana Devnet Settlement     │       │
│               │   (Anchor + SPL + Merkle Proof)  │       │
│               └──────────────────────────────────┘       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ REST API │  │ WebSocket│  │  Next.js Dashboard   │   │
│  │ (Express)│  │  Server  │  │  (Real-time UI)      │   │
│  └──────────┘  └──────────┘  └──────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Backend**: Node.js 18+, TypeScript, Express, ws (WebSocket)
- **Frontend**: Next.js 14, React 18, TailwindCSS, lucide-react
- **Database**: lowdb (JSON file-based, zero native dependencies)
- **Blockchain**: Solana (Anchor, @solana/web3.js, SPL Token-2022)
- **Data Source**: TxLINE API (REST + SSE streams)
- **Alerts**: Telegram Bot API

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- A Solana keypair (for on-chain settlement)

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/txline-arena.git
cd txline-arena

# Install backend dependencies
npm install

# Install frontend dependencies
cd web && npm install && cd ..

# Copy environment template
cp .env.example .env
```

### Configuration

Edit `.env` with your settings:

```env
# TxLINE API
TXLINE_BASE_URL=https://txline.txodds.com
TXLINE_API_TOKEN=your_token_here

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WALLET_KEYPAIR_PATH=./keypair.json

# Server
PORT=3001
LIVE_MODE=true

# Detection thresholds
DETECTION_Z_SCORE_THRESHOLD=2.0
DETECTION_PCT_CHANGE_THRESHOLD=10
ODDS_WINDOW_SIZE=20

# Agents
AGENT_BANKROLL=1000

# Telegram (optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_ID=
```

### Solana Setup (Optional — for on-chain settlement)

```bash
# Generate a keypair
solana-keygen new -o keypair.json

# Subscribe to TxLINE on-chain
npm run subscribe

# Activate your API token
npm run activate
```

### Running

```bash
# Start the backend (arena + API + WebSocket)
npm run dev

# In another terminal, start the dashboard
cd web && npm run dev
```

- **Backend API**: http://localhost:3001
- **Dashboard**: http://localhost:3000
- **WebSocket**: ws://localhost:3001/ws

### Simulation Mode

Set `LIVE_MODE=false` in `.env` to run with synthetic data (no TxLINE API needed):

```bash
LIVE_MODE=false npm run dev
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | System health, mode, agent status |
| `GET /api/signals` | Recent sharp movement signals |
| `GET /api/agents` | Agent stats (bankroll, P&L, win rate) |
| `GET /api/agents/:name/positions` | Agent positions (filter by status) |
| `GET /api/positions` | All positions across agents |
| `GET /api/leaderboard` | Agent rankings |
| `GET /api/matches` | Match fixtures and live scores |
| `GET /api/mode` | Current operating mode |
| `WS /ws` | Real-time arena events |

## TxLINE Endpoints Used

| TxLINE Endpoint | Usage |
|----------------|-------|
| `POST /auth/guest/start` | Guest JWT for initial auth |
| `POST /api/token/activate` | Activate API token with Solana signature |
| `GET /api/fixtures` | Fetch match fixtures |
| `GET /api/odds/:fixtureId` | Fetch current odds for a fixture |
| `GET /api/scores/:fixtureId` | Fetch live scores |
| `GET /api/historical/:fixtureId` | Historical odds data for backtesting |
| `GET /api/stats/validate` | Validate Merkle proof for data integrity |
| `SSE /stream/odds` | Live odds stream |
| `SSE /stream/scores` | Live score stream |

## Strategy Agents

### Momentum Agent
Bets on sides where odds are **shortening** (smart money flowing in). Uses Kelly Criterion for stake sizing based on signal confidence and z-score.

### Mean Reversion Agent
Bets **against** sharp movements, expecting odds to revert to the consensus mean. Adjusted probability with Kelly sizing.

### Value Agent
Identifies **value bets** by comparing consensus-implied probability with bookmaker odds. Opens positions when edge exceeds threshold.

### Market Maker Agent
Quotes **buy/sell prices** around consensus odds, profiting from the spread. Dynamically adjusts spread based on volatility and hedges inventory.

## Risk Management

- **Kelly Criterion**: Optimal bet sizing based on edge and odds
- **Circuit Breaker**: Pauses agent after 3 consecutive losses (30-min cooldown)
- **Bankroll Management**: Max 25% of bankroll per position
- **Position Limits**: One open position per fixture per agent

## Project Structure

```
txline-arena/
├── src/
│   ├── txline/          # TxLINE API integration
│   │   ├── types.ts     # TypeScript interfaces
│   │   ├── auth.ts      # JWT + Solana signature auth
│   │   ├── client.ts    # REST API client
│   │   ├── stream.ts    # SSE stream manager
│   │   └── rateLimiter.ts
│   ├── engine/          # Sharp movement detection
│   │   ├── signal.ts    # Signal interface
│   │   ├── oddsWindow.ts # Sliding window stats
│   │   ├── detector.ts  # Z-score + pct change detector
│   │   └── predictor.ts # Prediction tracker
│   ├── agents/          # Strategy agents
│   │   ├── base.ts      # BaseAgent abstract class
│   │   ├── kelly.ts     # Kelly Criterion utils
│   │   ├── momentum.ts
│   │   ├── reversion.ts
│   │   ├── value.ts
│   │   └── marketMaker.ts
│   ├── arena/           # Arena management
│   │   ├── manager.ts   # Central orchestrator
│   │   ├── leaderboard.ts
│   │   └── circuitBreaker.ts
│   ├── simulation/      # Synthetic data engine
│   │   └── generator.ts
│   ├── db/              # Database (lowdb)
│   │   ├── schema.ts
│   │   └── database.ts
│   ├── alerts/          # Telegram notifications
│   │   └── telegram.ts
│   ├── server/          # REST API + WebSocket
│   │   └── index.ts
│   └── index.ts         # Main entry point
├── scripts/             # Solana scripts
│   ├── subscribe.ts
│   └── activate.ts
├── web/                 # Next.js dashboard
│   ├── app/
│   │   ├── page.tsx         # Overview
│   │   ├── signals/page.tsx # Sharp movements
│   │   ├── agents/page.tsx  # Agent details
│   │   ├── onchain/page.tsx # Solana settlement
│   │   └── backtest/page.tsx
│   ├── components/
│   ├── lib/
│   └── ...
├── package.json
├── tsconfig.json
└── .env.example
```

## Deployment

### Render.com (Free Tier)

1. **Backend**: Web Service — build command `npm run build`, start command `npm start`
2. **Frontend**: Static Site — build command `cd web && npm run build`, publish directory `web/out`

### Environment Variables for Production

Set all variables from `.env.example` in your Render dashboard. Set `LIVE_MODE=true` for live TxLINE data.

## License

MIT
