# Character Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the selected “人格牌局” mobile React experience with a one-click bot challenge flow, fair human-like bot personalities, clear poker controls, and retained friend invitations.

**Architecture:** Keep Flask and the existing poker engine authoritative. Add a small, deterministic bot-profile layer around existing strategies; expose only validated difficulty/persona metadata through the existing v1 REST and Socket.IO contracts. Split the React table into focused lineup, table-header, seats, board, and action components while preserving the reducer-driven socket snapshot flow.

**Tech Stack:** Python 3.9+/Flask/Flask-SocketIO/SQLite, React 19, TypeScript, Vite, Vitest, Testing Library, Phosphor Icons.

**Spec:** `docs/plans/2026-10-06-character-table-design.md`

## Global Constraints

- Build from `backup/modern-web-v1` in the isolated `modern-character-table` worktree; do not modify the stable old runtime or `main`.
- Public bots never inspect opponent hole cards; `GOD` remains test-only and is rejected by public v1 endpoints.
- Mobile portrait gameplay fits at `390×844` without document scrolling.
- Chinese is the default language; core added copy has English translations.
- The server remains authoritative for identity, membership, legal actions, bot creation, and game state.
- New behavior follows red-green-refactor; the entire frontend and Python suites run after each task.

## Review Focus

- Malformed difficulty, persona, seat count, or repeated create requests must not add unauthorized or duplicate bots.
- A non-host or a host during an active hand must not change the bot lineup.
- Seeded mixed strategies must be reproducible while never requesting illegal poker actions.
- Long nicknames, translated labels, small heights, and enlarged text must not cover cards or action buttons.
- Invite-friend remains usable without becoming the primary path or leaking private room state.

---

### Task 1: Restore a trustworthy bot-test baseline

**Files:**
- Modify: `tests/test_bot_games.py`
- Test: `tests/test_table_rules.py`, `tests/test_bot_games.py`

**Interfaces:**
- Consumes: `Table._execute_action(player, action, amount, strict)`.
- Produces: a bot-action observer that ignores normal `Player` actions and reports illegal requests per `BotLevel` without global collection failures.

- [ ] **Step 1: Add a pytest regression assertion that imports `test_bot_games` and then executes a non-bot `_execute_action` without reading `bot_level`.**
- [ ] **Step 2: Run the focused test and verify it fails with `AttributeError: 'Player' object has no attribute 'bot_level'`.**
- [ ] **Step 3: Guard the instrumentation with `isinstance(player, Bot)` and restore the patched method after the simulation.**
- [ ] **Step 4: Run `.venv/bin/python -m pytest -q`; expect collection and all rules/bot tests to complete.**
- [ ] **Step 5: Commit the baseline-test repair.**

### Task 2: Add fair difficulty and personality profiles

**Files:**
- Create: `poker_engine/bot_profiles.py`
- Modify: `poker_engine/bot.py`, `poker_engine/table.py`, `poker_engine/player.py`
- Create: `tests/test_bot_profiles.py`

**Interfaces:**
- Produces: `BotPersona`, `BotProfile`, `get_bot_profile(persona)`, and `Bot(..., level, persona, rng=None)`; `Bot.to_dict()` adds safe persona metadata.
- Consumes: existing `BotLevel`, equity helpers, legal-action correction, and opponent-pattern hooks.

- [ ] **Step 1: Write failing tests for the five persona definitions, safe serialization, seeded repeatability, public-level fairness, persona frequency differences, and legal actions across representative preflop/postflop states.**
- [ ] **Step 2: Run `tests/test_bot_profiles.py`; verify failures are caused by missing profile APIs.**
- [ ] **Step 3: Implement immutable persona parameters for preflop looseness, aggression, bluff frequency, slow-play frequency, and sizing preference; inject a seeded `random.Random` source into strategy branching.**
- [ ] **Step 4: Apply persona offsets to beginner/intermediate/advanced decisions without replacing table legality checks; prevent public strategy code from invoking `_god_strategy`.**
- [ ] **Step 5: Run bot-profile, bot-game, equity, and table-rule tests; expect all green, then commit.**

### Task 3: Create a bot challenge room atomically

**Files:**
- Modify: `app.py`, `database.py`, `db_adapter.py`
- Modify: `tests/test_v1_api.py`, `tests/test_v1_socket.py`

**Interfaces:**
- `POST /api/v1/rooms` consumes optional `{mode, difficulty, seat_count, personas}` and returns the existing room representation.
- `bot:add` consumes `{level, persona}` and publishes a refreshed `room:snapshot`.
- Snapshots expose `bot_level`, `bot_persona`, and `persona_label`, never hidden cards or strategy parameters.

- [ ] **Step 1: Write failing API tests for default challenge creation, 2/4/6 seats, validated personas, atomic rollback, and rejection of `god`.**
- [ ] **Step 2: Run focused API tests and verify expected contract failures.**
- [ ] **Step 3: Implement validated challenge configuration and a shared server-side bot factory that creates the lineup in one transaction.**
- [ ] **Step 4: Write failing socket tests for host-only waiting-stage add/remove/replace, invalid persona, full table, and public `god` rejection.**
- [ ] **Step 5: Implement the socket behavior using the shared bot factory, then run all Python tests and commit.**

### Task 4: Build the single-player challenge entry flow

**Files:**
- Create: `frontend/src/components/ChallengeSetup.tsx`, `frontend/src/components/ChallengeSetup.test.tsx`
- Modify: `frontend/src/api.ts`, `frontend/src/pages/HomePage.tsx`, `frontend/src/types.ts`, `frontend/src/i18n.ts`, `frontend/src/styles.css`

**Interfaces:**
- Produces `ChallengeConfig` with `difficulty`, `seatCount`, and ordered `personas` for `api.createRoom(config)`.
- Routes a successful challenge creation directly to `/table/:code`.

- [ ] **Step 1: Write failing interaction tests for opening setup, choosing difficulty/table size, automatic persona lineup, keyboard labels, loading/error states, and direct navigation after creation.**
- [ ] **Step 2: Run the focused Vitest file and verify missing-component/behavior failures.**
- [ ] **Step 3: Implement the focused home hero and bottom-sheet setup with “挑战机器人” as primary CTA and “加入好友牌局” as secondary.**
- [ ] **Step 4: Add bilingual copy and API types, then run the frontend suite and commit.**

### Task 5: Recreate the selected Character Table

**Files:**
- Create: `frontend/public/avatars/*.webp`
- Create: `frontend/src/components/TableHeader.tsx`, `BotSeat.tsx`, `PokerBoard.tsx`, `LineupDrawer.tsx`
- Create: corresponding `*.test.tsx` files
- Modify: `frontend/src/pages/TablePage.tsx`, `frontend/src/components/ActionRail.tsx`, `frontend/src/components/PlayerSeat.tsx`, `frontend/src/styles.css`, `frontend/src/i18n.ts`

**Interfaces:**
- Consumes the existing reducer snapshot plus Task 3 persona metadata.
- Produces a no-scroll table, functional lineup drawer, friend sharing, visible bot thinking/timer states, and legal-action-only command dock.

- [ ] **Step 1: Generate and inspect five cohesive avatar assets matching the selected visual target; store optimized WebP files with stable persona filenames.**
- [ ] **Step 2: Write failing component tests for persona display, active timer/thinking state, empty-seat actions, friend sharing, legal action labels, raise-sheet presets, and reduced-motion behavior.**
- [ ] **Step 3: Run focused tests and verify failures are caused by missing components/states.**
- [ ] **Step 4: Implement the selected warm lounge composition at `390×844`, using Phosphor icons and real avatar assets; keep gameplay controls fixed and accessible.**
- [ ] **Step 5: Add responsive tablet/desktop adaptations without changing mobile hierarchy; run tests and production build, then commit.**

### Task 6: Browser acceptance and design QA

**Files:**
- Create: `design-qa.md`
- Modify: implementation files only when QA identifies P0/P1/P2 findings

**Interfaces:**
- Consumes visual truth `exec-144c75b5-31f1-4323-9543-7394a0dccd83.png` and the running local React/Flask app.
- Produces browser screenshots and a `design-qa.md` with `final result: passed`.

- [ ] **Step 1: Run the full Python suite, frontend tests, TypeScript build, and production bundle.**
- [ ] **Step 2: Start the local app and open it in the Codex in-app browser; complete nickname → challenge setup → six-player table → raise interaction → invite copy.**
- [ ] **Step 3: Capture the same mid-hand state at `390×844`; check console errors, overflow, keyboard focus, reduced motion, and `768×1024`/`1440×900` resilience.**
- [ ] **Step 4: Compare the source and implementation in one visual QA input; record findings, fix every P0/P1/P2, and repeat until passed.**
- [ ] **Step 5: Save `design-qa.md` with evidence, commands, interaction results, comparison history, and `final result: passed`; keep the verified preview running and commit.**
