# Live GTO Coach and Showdown Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fair real-time equity guidance to solo bot challenges and an accurate, privacy-safe result card after each hand.

**Architecture:** A focused server-side advisor calculates cached equity, pot odds, and a transparent recommendation from public state only. V1 snapshots carry optional `analysis` and sanitized `last_hand_result`; React renders them in responsive, non-blocking cards.

**Tech Stack:** Python 3, Flask-SocketIO, existing poker equity engine, React 19, TypeScript, Vitest, Testing Library.

**Spec:** `docs/plans/2026-10-06-live-gto-showdown-design.md`

## Global Constraints

- Analysis is available only in `bot_challenge` rooms during an active hand.
- Public analysis must never receive or reveal opponent hole cards.
- Use about 1,500 Monte Carlo samples and cache by visible decision state.
- Label recommendations as estimates, not exact solver output.
- Reveal opponent cards only when `is_showdown=true`.
- Keep the 390×844 active table scroll-free and preserve the hero-card/action gap.

## Review Focus

- Folded or disconnected opponents must not inflate the equity opponent count; Task 1 tests only active contenders.
- Zero-call decisions must produce `pot_odds=0` without division errors; Task 1 covers check/bet recommendations.
- Repeated snapshots of one visible state must hit the cache without sharing results across viewers or hands; Task 2 verifies cache keys and clearing.
- A fold-win result must not include mucked opponent cards; Task 3 asserts the serialized payload omits them.
- Missing/failed analysis must not prevent a normal room snapshot; Task 2 forces an advisor exception and expects a valid snapshot without `analysis`.

---

### Task 1: Fair Decision Advisor

**Files:**
- Create: `poker_engine/advisor.py`
- Create: `tests/test_advisor.py`

**Interfaces:**
- Consumes: `equity_vs_random(hole, board, num_opponents, simulations, rng=None)` and public pot/bet numbers.
- Produces: `calculate_advice(hole_cards, community_cards, active_opponents, pot, current_bet, player_bet, min_raise_to, simulations=1500) -> dict`.

- [ ] **Step 1: Write failing tests** for zero-call advice, pot-odds math, fold/call/raise boundaries, active-opponent counts, deterministic seeded calculation, and a spy proving no opponent card argument exists.
- [ ] **Step 2: Run** `.venv/bin/python -m pytest tests/test_advisor.py -q` and verify RED.
- [ ] **Step 3: Implement** `calculate_advice` returning `equity`, `pot_odds`, `recommended_action`, `reason`, and `sample_size`; clamp numeric outputs to `[0, 1]`.
- [ ] **Step 4: Run** the focused test and verify PASS.
- [ ] **Step 5: Commit** `feat: add fair realtime poker advisor`.

### Task 2: Snapshot Analysis Integration

**Files:**
- Modify: `app.py`
- Modify: `poker_engine/table.py`
- Modify: `tests/test_v1_socket.py`

**Interfaces:**
- Consumes: Task 1 `calculate_advice(...)`.
- Produces: optional `analysis` object in `_v1_snapshot(record, table, viewer_id)` and per-table visible-state cache cleared on a new hand.

- [ ] **Step 1: Write failing socket tests** proving challenge-only analysis, no analysis in private rooms/waiting/finished states, correct active-opponent count, cache reuse/clear, and snapshot survival when advice raises.
- [ ] **Step 2: Run** `.venv/bin/python -m pytest tests/test_v1_socket.py -q -k analysis` and verify RED.
- [ ] **Step 3: Implement** a bounded per-table/viewer cache and append analysis only for the authenticated viewer with two hole cards.
- [ ] **Step 4: Run** focused socket and advisor tests and verify PASS.
- [ ] **Step 5: Commit** `feat: stream fair GTO guidance in challenge snapshots`.

### Task 3: Sanitized Hand Results

**Files:**
- Modify: `poker_engine/table.py`
- Modify: `app.py`
- Modify: `tests/test_v1_socket.py`
- Modify: `tests/test_table_rules.py`

**Interfaces:**
- Produces: `Table.last_hand_result: dict | None`, exposed as `last_hand_result` in V1 snapshots and cleared by `start_new_hand()`.

- [ ] **Step 1: Write failing tests** for showdown winner/hand/cards, split-pot winners, fold-win omission of mucked cards, refresh recovery, and clearing on the next hand.
- [ ] **Step 2: Run** the focused rule/socket tests and verify RED.
- [ ] **Step 3: Implement** one sanitizer that converts engine showdown output to JSON-safe public result data and stores it at hand completion.
- [ ] **Step 4: Remove or redact** debug logging that prints raw `showdown_info` or hole-card-bearing objects.
- [ ] **Step 5: Run** focused tests and verify PASS.
- [ ] **Step 6: Commit** `feat: expose privacy-safe hand results`.

### Task 4: Coach and Result UI

**Files:**
- Create: `frontend/src/components/GtoCoachCard.tsx`
- Create: `frontend/src/components/GtoCoachCard.test.tsx`
- Create: `frontend/src/components/HandResultCard.tsx`
- Create: `frontend/src/components/HandResultCard.test.tsx`
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/i18n.ts`
- Modify: `frontend/src/pages/TablePage.tsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: snapshot `analysis` and `last_hand_result` from Tasks 2–3.
- Produces: responsive `GtoCoachCard` and `HandResultCard` with Chinese/English labels.

- [ ] **Step 1: Write failing component tests** for percentage/odds/action content, estimated-reference label, compact expansion, showdown cards/hand names, and fold-win privacy.
- [ ] **Step 2: Run** `npm test -- --run src/components/GtoCoachCard.test.tsx src/components/HandResultCard.test.tsx` and verify RED.
- [ ] **Step 3: Implement types and both accessible components**; keep the coach hidden when analysis is absent.
- [ ] **Step 4: Integrate into `TablePage`** without changing action submission or result voting.
- [ ] **Step 5: Add responsive CSS** for a compact mobile edge card and fixed desktop side card; the result card must not cover the next-hand control.
- [ ] **Step 6: Run** focused tests and `npm run build`, verify PASS.
- [ ] **Step 7: Commit** `feat: add live coach and showdown result cards`.

### Task 5: End-to-End Verification

**Files:**
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified local preview and updated QA evidence.

- [ ] **Step 1: Run full suites:** `.venv/bin/python -m pytest -q`, `npm test -- --run`, and `npm run build`.
- [ ] **Step 2: Browser-test at 390×844** through pre-flop, flop, action, showdown, refresh, and next hand; measure no page overflow and no overlap with cards/actions.
- [ ] **Step 3: Verify privacy** by completing one showdown and one fold-win; only the showdown may reveal opponent cards.
- [ ] **Step 4: Check 768×1024 and 1440×900**, console warnings/errors, reduced motion, and Chinese/English copy.
- [ ] **Step 5: Update `design-qa.md`** with exact evidence and keep `final result: passed` only if every check succeeds.
- [ ] **Step 6: Request final independent review**, fix any P1/P2, rerun affected verification, and commit `test: verify live GTO and showdown experience`.

