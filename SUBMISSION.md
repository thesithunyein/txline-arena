# TxLINE Arena — Submission

> An autonomous multi-agent arena that ingests TxLINE's live, Solana-anchored World Cup
> odds & score feed, detects sharp odds movements in real time, and runs four competing
> trading strategies head-to-head — tracking whether each signal actually predicted the outcome.

- **Live app:** https://txline-arena.vercel.app
- **Repo:** https://github.com/thesithunyein/txline-arena
- **Demo video:** _<add Loom/YouTube link here>_
- **Network:** Solana Devnet

---

## 1. Core idea

TxLINE streams consensus betting odds and scores for every World Cup match through a single
normalised JSON schema, with each update cryptographically anchored on Solana. **TxLINE Arena**
puts that feed to work autonomously:

1. **Ingest** — subscribe to TxLINE odds & score streams (plus snapshot/history REST endpoints).
2. **Detect** — a `SharpMovementDetector` flags statistically significant odds shifts using a
   rolling-window **z-score** combined with a **percentage-change** threshold.
3. **Decide** — four autonomous agents (Momentum, Mean-Reversion, Value, Market-Maker) read the
   same signal and open positions according to their own strategy, sized with a Kelly-style rule.
4. **Settle** — when a match ends, outcomes are confirmed via TxLINE's `stat-validation` endpoint
   and positions are settled deterministically; a leaderboard ranks the strategies.
5. **Prove** — every signal is tracked against the eventual result, producing a transparent
   **prediction-accuracy** metric that shows whether the detector actually works.

It directly implements the track's "Sharp Movement Detector" and "Agent vs Agent Arena" ideas,
and the Market-Maker agent extends toward the "In-Play Market Maker" idea.

## 2. Technical highlights

- **Deterministic, defensible signal logic** — `src/engine/detector.ts`: a signal fires only when
  `|z-score| ≥ threshold` (default 2.0) **or** `|Δ%| ≥ threshold` (default 10%), computed over a
  rolling window (`src/engine/oddsWindow.ts`). Every parameter is configurable via env.
- **Four isolated strategy agents** — `src/agents/` (momentum, reversion, value, marketMaker) on a
  shared `BaseAgent` with Kelly sizing (`kelly.ts`). Agent errors are isolated so one crash can't
  take down the arena.
- **Prediction tracking** — `src/engine/predictor.ts` records each signal and, at match end, marks
  it correct/incorrect against the real outcome. Surfaced on the dashboard as a live hit-rate,
  broken down by direction and confidence.
- **Resilience for production** — SSE streams auto-reconnect with exponential backoff
  (`src/txline/stream.ts`); a `CircuitBreaker` pauses an agent after consecutive losses; a token-
  bucket `rateLimiter` respects API limits; all writes persist to a JSON datastore via lowdb (`src/db/`).
- **On-chain** — a real Solana **devnet** subscription transaction activates data access
  (`scripts/subscribe.ts`), the API token is activated with a wallet signature
  (`src/txline/auth.ts`), and each settlement is **anchored on-chain** via the SPL Memo
  program with a SHA-256 hash of the canonical payload (`src/chain/settlement.ts`) —
  producing tamper-evident, publicly verifiable settlement records on Solana Explorer.
- **Backtesting** — `src/backtest/` + `scripts/backtest.ts` replay historical odds through the
  same engine to evaluate strategies offline.
- **Never-empty demo** — because the matches finish before judging, the dashboard falls back to a
  deterministic replay dataset so the full product experience is always visible.

## 3. TxLINE endpoints used

REST (`src/txline/client.ts`):

| Endpoint | Purpose |
|---|---|
| `GET /api/fixtures/snapshot` | Load World Cup fixtures / match metadata |
| `GET /api/odds/snapshot/{fixtureId}` | Current consensus odds for a fixture |
| `GET /api/odds/updates/{epochDay}/{hourOfDay}/{interval}` | Historical odds updates (backtest) |
| `GET /api/scores/snapshot/{fixtureId}` | Current score state |
| `GET /api/scores/updates/{fixtureId}` | Score updates for a fixture |
| `GET /api/scores/historical/{fixtureId}` | Full historical score timeline (gzip) |
| `GET /api/scores/stat-validation` | Verify a score/stat update before settlement |

Streaming SSE (`src/txline/stream.ts`):

| Stream | Purpose |
|---|---|
| `GET /api/odds/stream` | Live odds updates feeding the detector |
| `GET /api/scores/stream` | Live score updates driving settlement |

Auth (`src/txline/auth.ts`): guest JWT retrieval + API-token activation via Solana wallet signature.

On-chain (`scripts/subscribe.ts`):

- TxLINE program: `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA` (devnet)
- TXL token mint: `Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL`

## 4. Architecture

```
TxLINE feed ──► OddsStream / ScoresStream (SSE, auto-reconnect)
                      │
                      ▼
            SharpMovementDetector  ──► Signal (z-score + %Δ)
                      │
                      ▼
                 ArenaManager ──► 4 agents decide (isolated) ──► positions
                      │                                            │
        PredictionTracker (hit-rate)                   CircuitBreaker / Kelly sizing
                      │                                            │
                      ▼                                            ▼
              lowdb persistence ◄────────────  match end → stat-validation → settle → anchor on-chain
                      │
                      ▼
        Express REST + WebSocket  ──►  Next.js dashboard (live updates)
```

## 5. How to run

```bash
# Backend (arena)
cp .env.example .env            # set TXLINE_API_TOKEN (or run npm run activate)
npm install
npm run subscribe               # real devnet subscription tx (optional, for live data)
npm run activate                # activate API token via wallet signature
npm run settle-onchain          # anchor real settlement txs on devnet (needs funded wallet)
npm run dev                     # starts arena + API/WS on :3001

# Frontend
cd web && npm install && npm run dev   # dashboard on :3000
```

Set `LIVE_MODE=false` to run the built-in simulation engine, or
`NEXT_PUBLIC_DEMO_MODE=true` on the frontend to force the deterministic replay dataset.
Set `SETTLEMENT_ONCHAIN=true` (with a funded devnet keypair) to anchor every settlement
on Solana as a real transaction.

Tests: `npm test` (engine, agents, backtest).

## 6. TxLINE API feedback

**What we liked most**
- The single normalised JSON schema across odds and scores made it genuinely easy to scale from
  one fixture to the whole tournament without per-competition special-casing.
- Solana-anchored updates plus the `stat-validation` endpoint gave us a clean, trustable source of
  truth for settlement — verifying outcomes mattered for an autonomous trading agent.
- SSE streams were straightforward to consume and kept latency low for the detector.

**Where we hit friction**
- Auth flow (guest JWT + wallet-signature token activation + on-chain subscription) had several
  steps; a quickstart sandbox token would have shortened first-run time.
- Clearer documentation of the selection/market code enumerations (e.g. `1`/`X`/`2` vs labels)
  would have reduced guesswork when normalising consensus odds.
- A documented historical odds endpoint shape for backtesting (epochDay/hour/interval semantics)
  would help — we inferred parameters by experimentation.
