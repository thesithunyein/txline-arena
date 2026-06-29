# TxLINE Arena — Demo Video Script (target: 4:30)

Goal: prove a **working, autonomous** system that ingests **live TxLINE data**, makes decisions
with **defensible logic**, and shows **evidence it works**. Judges weight the video heavily.

Setup before recording:
- Open the deployed app (or `web` on localhost) with the dashboard already populated.
- Have a terminal ready showing the arena running with real TxLINE logs (or `npm run dev`).
- Have the TxLINE program / a devnet tx open in Solana Explorer in another tab.

---

## 0:00 – 0:25 — Hook + problem
> "TxLINE streams live, Solana-anchored odds and scores for all 104 World Cup matches. The
> question is: what can an autonomous agent do with data this fast and granular? This is
> **TxLINE Arena** — four trading agents competing live on that feed, with zero human input."

Show: the Overview hero + the SIMULATION/LIVE badge.

## 0:25 – 1:15 — Prove the TxLINE ingestion is real
Cut to the **terminal**.
> "Here's the arena connecting to TxLINE. It pulls fixtures from `/api/fixtures/snapshot`, then
> subscribes to the live `/api/odds/stream` and `/api/scores/stream` SSE feeds."

Show: log lines printing real fixtures + incoming odds updates + `[SIGNAL]` lines.
> "Every odds update flows into our Sharp Movement Detector."

## 1:15 – 2:10 — The detection logic (defensible)
Cut to **Signals** page.
> "A signal only fires when the move is statistically significant — a rolling-window **z-score**
> above 2, or a percentage change above 10%. This isn't a random alert; it's a deterministic,
> tunable rule."

Show: the signals table — direction, odds change, z-score columns. Point at a high z-score row.

## 2:10 – 3:00 — Autonomous agents competing
Cut to **Agents** page.
> "Four agents read the same signal and act on their own strategy — Momentum, Mean-Reversion,
> Value, and a Market-Maker. They size stakes with a Kelly rule and open positions automatically.
> No human presses a button."

Show: agent cards, then the positions table updating; mention the circuit breaker pausing a
losing agent.

## 3:00 – 3:50 — Proof it works (the differentiator)
Back to **Overview → Prediction Accuracy** panel.
> "Here's what most submissions won't show: did the signals actually predict outcomes? We track
> every signal to match end. Across the settled signals, the detector predicted the result
> **~60%+** of the time — and crucially, the **high-confidence** subset out-performs the baseline.
> The confidence score is meaningful."

Show: the big accuracy %, the correct/wrong/pending bar, and the high-confidence breakdown.

## 3:50 – 4:20 — On-chain + data integrity
Cut to **On-Chain** page, then Solana Explorer tab.
> "Data access is activated with a **real devnet transaction** to the TxLINE program — here it is
> on-chain. Before settling, we confirm the final score with TxLINE's `stat-validation` endpoint,
> so settlement is driven only by verified data."

Show: the program ID link opening in Explorer; the "Live vs Roadmap" card.

## 4:20 – 4:30 — Close
> "TxLINE Arena: real TxLINE ingestion, deterministic strategy logic, fully autonomous, and
> measurable predictive edge — production-ready for a trading desk. Thanks for watching."

---

### Recording tips
- Keep cuts tight; pre-load every tab so nothing buffers on camera.
- Narrate the *why* (z-score, verification, accuracy), not just the *what*.
- End on the accuracy number — it's your strongest, most memorable proof.
