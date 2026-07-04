# TxLINE Arena

**Autonomous In-Play Trading Agent Platform on Solana**

TxLINE Arena is a multi-agent autonomous trading arena that ingests real-time TxLINE sports data feeds, detects sharp odds movements, and runs competing strategy agents. It activates data access with a real Solana devnet transaction and verifies every outcome against TxLINE's Solana-anchored feed before settling positions deterministically.

## Overview

- **Sharp Movement Detection**: Z-score and percentage-change based detection on live TxLINE odds streams, with prediction tracking
- **4 Strategy Agents**: Momentum, Mean Reversion, Value, and Market Maker — each with Kelly Criterion position sizing
- **Agent vs Agent Arena**: Agents compete on the same TxLINE feed; leaderboard ranks by P&L, ROI, win rate, Sharpe ratio
- **Circuit Breaker**: Auto-pauses agents after consecutive losses to prevent capital drain
- **On-Chain Data Access**: Real Solana devnet subscription transaction to the TxLINE program; outcomes verified via the TxLINE `stat-validation` endpoint before deterministic settlement
- **Prediction Accuracy Tracking**: Every signal is scored against the eventual match result to measure real predictive edge
- **Simulation / Replay Mode**: Deterministic synthetic data engine so the dashboard always demonstrates the product, even after matches end
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
│               │   Deterministic Settlement +     │       │
│               │  TxLINE stat-validation check    │       │
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
- A Solana keypair (for the on-chain TxLINE data subscription)

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

# Fund it on devnet
solana airdrop 2 <pubkey> --url devnet

# Subscribe to TxLINE on-chain
npm run subscribe

# Activate your API token
npm run activate

# Anchor real settlement transactions on devnet (SPL Memo + SHA-256)
npm run settle-onchain
```

Set `SETTLEMENT_ONCHAIN=true` in `.env` to have the arena anchor every position
settlement on Solana devnet automatically — each settled position gets a real,
publicly verifiable transaction signature viewable on Solana Explorer.

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
| `POST /api/token/activate` | Activate API token with Solana wallet signature |
| `GET /api/fixtures/snapshot` | Fetch World Cup match fixtures |
| `GET /api/odds/snapshot/:fixtureId` | Current consensus odds for a fixture |
| `GET /api/odds/updates/:epochDay/:hourOfDay/:interval` | Historical odds updates (backtesting) |
| `GET /api/scores/snapshot/:fixtureId` | Current score state |
| `GET /api/scores/updates/:fixtureId` | Score updates for a fixture |
| `GET /api/scores/historical/:fixtureId` | Full historical score timeline (gzip) |
| `GET /api/scores/stat-validation` | Verify a score/stat update before settlement |
| `GET /api/odds/stream` (SSE) | Live odds stream feeding the detector |
| `GET /api/scores/stream` (SSE) | Live score stream driving settlement |

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
│   ├── chain/           # On-chain settlement anchoring (SPL Memo)
│   │   └── settlement.ts
│   ├── db/              # Database (lowdb)
│   │   ├── schema.ts
│   │   └── database.ts
│   ├── alerts/          # Telegram notifications
│   │   └── telegram.ts
│   ├── server/          # REST API + WebSocket
│   │   └── index.ts
│   └── index.ts         # Main entry point
├── scripts/             # Solana + backtest scripts
│   ├── subscribe.ts
│   ├── activate.ts
│   ├── settle-onchain.ts
│   └── backtest.ts
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
├── tests/              # Unit tests (Jest)
│   ├── engine.test.ts
│   ├── agents.test.ts
│   └── backtest.test.ts
├── package.json
├── tsconfig.json
├── vercel.json         # Vercel deployment config
├── render.yaml         # Render deployment config
└── .env.example
```

## Deployment

### Frontend — Vercel

1. Push repo to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Framework preset: Next.js
4. Root directory: `web`
5. Deploy — `vercel.json` handles API proxying to the backend

### Backend — Render.com (Free Tier)

1. Create a new Web Service on [render.com](https://render.com)
2. Connect your GitHub repo
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Set environment variables from `.env.example`
6. Set `LIVE_MODE=true` for live TxLINE data

### Environment Variables for Production

Set all variables from `.env.example` in your Render dashboard. Set `LIVE_MODE=true` for live TxLINE data.

## Testing

```bash
npm test
```

Runs unit tests for:
- Sharp movement detector (z-score, odds window, signal generation)
- Strategy agents (momentum, reversion, value, market maker, settlement)
- Backtest engine (equity curves, max drawdown, signal detection)

## TxLINE API Experience

### What we loved

- **Single normalised JSON schema** across all competitions — made ingestion trivial. No need to handle different formats for different leagues.
- **Cryptographic anchoring on Solana** — combined with the `stat-validation` endpoint, this gave us a trustable source of truth so our autonomous agents settle only on verified outcome data.
- **Real-time SSE streams** — the streaming endpoints for odds and scores were fast and reliable, perfect for our sharp movement detection cycle.
- **Zero-cost access during the hackathon** — waiving commercial data fees let us focus on building rather than budgeting.

### Where we hit friction

- **Auth flow complexity** — the guest JWT → Solana signature → API token activation flow took some iteration to get right. More code examples in the quickstart would help.
- **Stream reconnection** — SSE connections occasionally dropped; we had to implement exponential backoff reconnection. A heartbeat/ping mechanism would be helpful.
- **Historical data access** — for backtesting, we needed historical odds snapshots. A dedicated historical endpoint with pagination would be better than scraping the live feed.
- **Rate limit documentation** — the rate limits weren't clearly documented. We implemented a conservative token-bucket limiter (60 req/min) but had to guess the actual limits.

## License

MIT
