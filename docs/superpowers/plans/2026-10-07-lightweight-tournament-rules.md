# Lightweight Tournament Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict turn sequencing, click-based bet sizing, human-only rebuys, timed blinds, one-hour live-instance recovery, and complete per-hand chip settlement to bot challenges and private friend tournaments.

**Architecture:** Extend the existing single-process `Table` and SQLite room records instead of introducing another engine or service. Server snapshots remain authoritative; all clocks are event-derived, all mutations are serialized by the per-table lock, and React only renders validated server state.

**Tech Stack:** Python 3.12, Flask, Flask-SocketIO threading mode, SQLite, React 19, TypeScript, Vite, Vitest, Testing Library.

**Spec:** `docs/plans/2026-10-07-lightweight-tournament-rules-design.md`

## Global Constraints

- Keep the existing Render Free single-instance architecture; add no Redis, PostgreSQL, paid service, or continuous polling worker.
- Do not push GitHub or deploy Render until the user explicitly approves the locally tested result.
- Human turns have no timeout and never auto-check or auto-fold while connected.
- A live service retains disconnected seats for 3,600 seconds; Render spin-down, restart, and ephemeral-disk loss remain outside the guarantee.
- Blind levels last exactly 600 seconds of effective tournament time and apply only when a new hand starts.
- Human rebuy allowance is `0 | 1 | 2 | 3 | unlimited`, defaulting to one; bots can never rebuy.
- Preserve server-authoritative integer validation, currency formatting, side pots, split pots, card privacy, and chip conservation.
- Keep GTO calculations limited to human turns and use the existing per-state cache.

## Review Focus

- A bot that finishes thinking after the turn or hand changed must discard its decision without touching chips; Task 3 adds a stale-token race test.
- Two simultaneous rebuy requests must issue exactly one stack and consume one allowance; Task 6 adds an atomic concurrency test.
- Custom odd-valued blinds, a pause immediately before a level boundary, and reconnect after the boundary must produce one deterministic next level; Task 5 adds fake-clock rounding and pause tests.
- Fold wins, returned uncalled chips, split pots, and side pots must report net change without leaking folded cards; Task 7 adds accounting and privacy tests.
- A connected idle player, a transient disconnect under 3,600 seconds, an expired disconnect, and an explicit leave must remain four distinct outcomes; Task 5 adds socket lifecycle tests.

---

### Task 1: Persist Tournament Configuration and Player State

**Files:**
- Modify: `database.py` (`init_database`, `create_table`, `create_challenge_room`, table-player update helpers)
- Modify: `app.py` (`create_private_room_v1`, `_room_preview`, `_room_details`, `_table_from_record`)
- Modify: `tests/test_database.py`
- Modify: `tests/test_v1_api.py`

**Interfaces:**
- Consumes: existing room creation fields and idempotent SQLite migration pattern.
- Produces: room fields `rebuy_limit: Optional[int]`, `blind_level_seconds: int`, `tournament_elapsed_seconds: float`, `tournament_clock_anchor: Optional[float]`, `blind_level: int`, `clock_paused: bool`; player fields `rebuys_used: int`, `tournament_status: str`, `disconnected_at: Optional[float]`.
- Produces: `PokerDatabase.update_tournament_runtime(table_id: str, *, elapsed_seconds: float, clock_anchor: Optional[float], blind_level: int, clock_paused: bool) -> bool`.

- [ ] **Step 1: Add failing migration and persistence tests** named `test_tournament_columns_migrate_idempotently`, `test_room_persists_finite_and_unlimited_rebuy_limits`, and `test_table_player_persists_tournament_state`; assert defaults `1`, `600`, `0`, `active`, and `None` for unlimited.
- [ ] **Step 2: Run the focused database tests** with `.venv/bin/python -m unittest tests.test_database`; require failures because the columns and update helper do not exist.
- [ ] **Step 3: Implement the idempotent schema migration and database signatures**; represent unlimited rebuys as SQL `NULL`, not a magic high integer.
- [ ] **Step 4: Add failing API tests** named `test_room_accepts_supported_rebuy_limits` and `test_room_rejects_invalid_rebuy_limits`; accept JSON `0..3` or `"unlimited"`, reject booleans, floats, other strings, negatives, and values above three.
- [ ] **Step 5: Run the API tests** with `.venv/bin/python -m unittest tests.test_v1_api`; require the new cases to fail before implementation.
- [ ] **Step 6: Thread tournament configuration through creation, reconstruction, previews, and details**, translating JSON `"unlimited"` to `None` and back.
- [ ] **Step 7: Run focused backend tests** with `.venv/bin/python -m unittest tests.test_database tests.test_v1_api`; require all to pass.
- [ ] **Step 8: Commit** with `feat: persist tournament configuration`.

### Task 2: Configure Human Rebuys in Both Setup Flows

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/i18n.ts`
- Modify: `frontend/src/components/ChallengeSetup.tsx`
- Modify: `frontend/src/components/ChallengeSetup.test.tsx`
- Modify: `frontend/src/components/FriendRoomSetup.tsx`
- Modify: `frontend/src/components/FriendRoomSetup.test.tsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: Task 1 API field `rebuy_limit` with `0 | 1 | 2 | 3 | "unlimited"`.
- Produces: `type RebuyLimit = 0 | 1 | 2 | 3 | 'unlimited'`; `ChallengeConfig.rebuyLimit` and `FriendRoomConfig.rebuyLimit`.

- [ ] **Step 1: Add failing component tests** that assert both dialogs default to one rebuy, expose `0 / 1 / 2 / 3 / 无限`, and submit the selected value exactly once.
- [ ] **Step 2: Run the setup tests** with `npm --prefix frontend test -- --run src/components/ChallengeSetup.test.tsx src/components/FriendRoomSetup.test.tsx`; require failures for the missing control.
- [ ] **Step 3: Add the shared type, API serialization, translations, and compact choice controls**; make the copy explicitly say that the allowance applies only to humans.
- [ ] **Step 4: Verify short-phone layout** in component styles so the sticky create/start button remains reachable at 390×844.
- [ ] **Step 5: Run the focused tests and production type build** with `npm --prefix frontend test -- --run src/components/ChallengeSetup.test.tsx src/components/FriendRoomSetup.test.tsx src/api.test.ts && npm --prefix frontend run build`.
- [ ] **Step 6: Commit** with `feat: configure human tournament rebuys`.

### Task 3: Enforce a Server Turn Token and Cancel Stale Bot Decisions

**Files:**
- Modify: `poker_engine/table.py` (`start_new_hand`, `process_player_action`, game-flow transitions, bot action processing, `get_table_state`)
- Modify: `app.py` (`_process_bot_actions_locked`, `handle_v1_player_action`)
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/pages/TablePage.tsx`
- Create: `tests/test_turn_order.py`
- Modify: `tests/test_v1_socket.py`

**Interfaces:**
- Consumes: the existing per-table `RLock` and authoritative `current_player_id`.
- Produces: `Table.action_revision: int`, `Table.get_turn_token() -> str`, snapshot `table.turn_token: Optional[str]`, and `player:act.turn_token`.
- Produces: `Table.process_one_bot_action(expected_turn_token: str) -> Dict`, which performs no sleep and returns `stale_turn=True` without mutation when the token no longer matches.

- [ ] **Step 1: Add failing engine tests** for correct heads-up and multi-seat pre/post-flop order, plus `test_human_turn_blocks_all_later_bots` and `test_stale_bot_turn_token_cannot_mutate_table`.
- [ ] **Step 2: Run the rule tests** with `.venv/bin/python -m unittest tests.test_turn_order`; require the stale-token case to fail.
- [ ] **Step 3: Implement action revision and stable turn-token generation**; advance the revision after every accepted action, hand start, street transition, forced fold, and hand completion.
- [ ] **Step 4: Split bot execution into one decision per commit** so the app sleeps outside the table lock, then acquires the table lock and calls `process_one_bot_action` with the captured token.
- [ ] **Step 5: Add failing Socket tests** for duplicate human submission, an out-of-turn actor, and a bot whose sleep overlaps a human/state change; assert pot, bets, chips, and revision remain unchanged for rejected commands.
- [ ] **Step 6: Require and send the snapshot turn token in modern `player:act` commands**, returning `stale_turn` for old or duplicate tokens while leaving legacy endpoints unchanged.
- [ ] **Step 7: Run focused engine and Socket tests** with `.venv/bin/python -m unittest tests.test_turn_order tests.test_v1_socket && .venv/bin/python tests/test_table_rules.py`; require all to pass.
- [ ] **Step 8: Commit** with `fix: enforce strict tournament turn order`.

### Task 4: Replace the Bet Slider with Legal Click Presets

**Files:**
- Modify: `frontend/src/game/actions.ts`
- Modify: `frontend/src/game/actions.test.ts`
- Modify: `frontend/src/components/ActionRail.tsx`
- Modify: `frontend/src/components/ActionRail.test.tsx`
- Modify: `frontend/src/i18n.ts`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: `TableInfo.pot`, `current_bet`, `min_bet`, `min_raise_to`, `big_blind`; `Player.current_bet` and `chips`.
- Produces: `getBetPresets(input: { pot: number; currentBet: number; playerBet: number; min: number; max: number; bigBlind: number }): { id: 'half-pot' | 'three-quarter-pot' | 'pot' | '3x' | '4x' | '6x' | 'all-in'; label: string; amount: number }[]`.

- [ ] **Step 1: Replace preset tests with failing exact-formula cases**: unopened pot fractions use the pot; facing a bet uses `target = currentBet + fraction × (pot + toCall)`; multipliers use `currentBet` or the big blind; every value clamps to `[min, max]`.
- [ ] **Step 2: Run** `npm --prefix frontend test -- --run src/game/actions.test.ts`; require formula failures against the old four presets.
- [ ] **Step 3: Implement the pure preset calculator** with integer rounding and deterministic clamp behavior.
- [ ] **Step 4: Add failing ActionRail tests** asserting no range slider, all seven preset buttons display their final formatted amount, custom amount requires confirmation, and disabled/non-turn controls cannot submit.
- [ ] **Step 5: Implement the two-row click grid and custom integer input**, retaining explicit all-in and server-confirmed action handling.
- [ ] **Step 6: Run focused frontend tests and build** with `npm --prefix frontend test -- --run src/game/actions.test.ts src/components/ActionRail.test.tsx src/pages/TablePage.layout.test.ts && npm --prefix frontend run build`.
- [ ] **Step 7: Commit** with `feat: add click based tournament bet sizing`.

### Task 5: Add the Event-Derived Blind Clock and One-Hour Live Recovery

**Files:**
- Modify: `poker_engine/table.py`
- Modify: `app.py` (`handle_disconnect`, room join, cleanup, snapshots, new heartbeat event)
- Modify: `database.py`
- Modify: `frontend/src/socket.ts`
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/components/PokerBoard.tsx`
- Modify: `frontend/src/components/PokerBoard.test.tsx`
- Modify: `tests/test_blind_structure.py`
- Modify: `tests/test_v1_socket.py`

**Interfaces:**
- Consumes: Task 1 runtime fields and Task 3 turn locking.
- Produces: `Table.resume_tournament_clock(now: float)`, `pause_tournament_clock(now: float)`, `effective_tournament_seconds(now: float) -> float`, and `apply_blind_level_for_next_hand(now: float)`.
- Produces: `room:heartbeat`; snapshot fields `blind_level`, `blind_seconds_remaining`, `next_small_blind`, `next_big_blind`, `tournament_paused`.

- [ ] **Step 1: Add fake-clock blind tests** for 599/600 seconds, hand-boundary-only application, the approved multiplier sequence, odd custom blind rounding, and pause/resume immediately across a boundary.
- [ ] **Step 2: Run** `.venv/bin/python -m unittest tests.test_blind_structure`; require failures against hand-count doubling.
- [ ] **Step 3: Implement event-derived effective time and blind calculation** using `[1, 1.5, 2, 3, 4, 5, 7.5] × 10ⁿ`, rational integer math, and half-up rounding; persist runtime only on meaningful events, not every second.
- [ ] **Step 4: Add failing Socket lifecycle tests** for connected idle, reconnect at 3,599 seconds, expiration at 3,600 seconds, explicit leave, paused current actor, and non-current disconnect preserving seat order.
- [ ] **Step 5: Replace 30-second V1 removal with `disconnected_at` state and lazy expiry**; keep gameplay status separate from connection state so a non-current disconnected player retains his position, pause when that seat becomes current, do not create one-hour sleeping tasks, and fold/observe only after expiry.
- [ ] **Step 6: Add `room:heartbeat` and a five-minute client heartbeat while the table route is mounted**; heartbeat updates activity only and performs no game calculation.
- [ ] **Step 7: Render current/next blinds and remaining time from snapshot timestamps**, showing a paused label without requiring per-second server messages.
- [ ] **Step 8: Run focused backend/frontend tests** with `.venv/bin/python -m unittest tests.test_blind_structure tests.test_v1_socket && npm --prefix frontend test -- --run src/components/PokerBoard.test.tsx`.
- [ ] **Step 9: Commit** with `feat: add lightweight tournament clock and recovery`.

### Task 6: Implement Human Rebuy, Spectate, and Exit Outcomes

**Files:**
- Modify: `database.py`
- Modify: `poker_engine/player.py`
- Modify: `poker_engine/table.py`
- Modify: `app.py`
- Create: `frontend/src/components/BustedControls.tsx`
- Create: `frontend/src/components/BustedControls.test.tsx`
- Modify: `frontend/src/pages/TablePage.tsx`
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/i18n.ts`
- Modify: `frontend/src/styles.css`
- Modify: `tests/test_v1_socket.py`

**Interfaces:**
- Consumes: Task 1 `rebuy_limit`, `rebuys_used`, and `tournament_status`.
- Produces: `PokerDatabase.try_rebuy_player(table_id: str, player_id: str, initial_chips: int) -> Dict` with an atomic `BEGIN IMMEDIATE` transaction.
- Produces: Socket commands `player:rebuy` and `player:spectate`; snapshot self fields `rebuy_limit`, `rebuys_used`, `rebuys_remaining`, `can_rebuy`, `tournament_status`.

- [ ] **Step 1: Add failing backend tests** for 0/1/2/3/unlimited limits, rejection during a hand, rejection for non-broke humans, permanent bot rejection, and one-stack-only behavior under two concurrent requests.
- [ ] **Step 2: Run** `.venv/bin/python -m unittest tests.test_v1_socket`; require the new commands to fail.
- [ ] **Step 3: Implement atomic rebuy and spectate transitions** under the table state lock and database transaction; restore exactly `initial_chips`, never the global user wallet balance.
- [ ] **Step 4: Add failing component tests** for `重新买入 / 继续观看 / 退出牌桌`, remaining-count copy, hidden rebuy after exhaustion, and spectator re-entry between hands.
- [ ] **Step 5: Implement `BustedControls` and wire commands into `TablePage`**, keeping active-hand cards and result content unobstructed.
- [ ] **Step 6: Run focused tests and build** with `.venv/bin/python -m unittest tests.test_v1_socket && npm --prefix frontend test -- --run src/components/BustedControls.test.tsx src/pages/TablePage.layout.test.ts && npm --prefix frontend run build`.
- [ ] **Step 7: Commit** with `feat: add human tournament rebuy flow`.

### Task 7: Produce Complete Net-Chip Hand Settlements

**Files:**
- Modify: `poker_engine/table.py` (`start_new_hand`, `settle_hand`, `_sanitize_hand_result`)
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/components/HandResultCard.tsx`
- Modify: `frontend/src/components/HandResultCard.test.tsx`
- Modify: `tests/test_hand_results.py`
- Modify: `tests/test_table_rules.py`

**Interfaces:**
- Consumes: existing pot builder, returned-uncalled-chip logic, and privacy sanitizer.
- Produces: sanitized `player_results[]` entries `{ player_id, nickname, is_bot, invested, payout, net, starting_chips, final_chips, revealed, hole_cards?, hand_name?, hand_description? }`.
- Produces: `HandResultCard` prop `viewerId: string`, used to select the viewer's authoritative result row.

- [ ] **Step 1: Add failing settlement tests** for ordinary showdown, fold win with an uncalled return, split pot with odd chip, and multi-side-pot result; assert `net == final_chips - starting_chips` and `sum(net) == 0` for every hand.
- [ ] **Step 2: Add privacy assertions** that folded/mucked hole cards remain absent while every participant still receives an amount row.
- [ ] **Step 3: Run** `.venv/bin/python -m unittest tests.test_hand_results && .venv/bin/python tests/test_table_rules.py`; require failures for missing starting/net fields.
- [ ] **Step 4: Capture hand-start stacks before blinds and construct server-authoritative result rows** from actual final stacks, total bets, winnings, and returns.
- [ ] **Step 5: Add failing HandResultCard tests** for viewer net result, invested amount, payout, final stack, expandable all-player rows, split pot, and non-overlap collapse behavior.
- [ ] **Step 6: Update result types and card presentation**, showing signed currency amounts and retaining the existing winning-hand explanation.
- [ ] **Step 7: Run focused backend/frontend tests and build** with `.venv/bin/python -m unittest tests.test_hand_results && .venv/bin/python tests/test_table_rules.py && npm --prefix frontend test -- --run src/components/HandResultCard.test.tsx src/pages/TablePage.layout.test.ts && npm --prefix frontend run build`.
- [ ] **Step 8: Commit** with `feat: add complete hand chip settlements`.

### Task 8: Full Local Verification and User Handoff

**Files:**
- Modify: `design-qa.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: Tasks 1–7.
- Produces: a locally verified build and explicit instructions for the user to test without any remote push.

- [ ] **Step 1: Run the complete frontend suite** with `npm --prefix frontend test -- --run`; record the exact passing file and test counts.
- [ ] **Step 2: Run the production frontend build** with `npm --prefix frontend run build`; require TypeScript and Vite success.
- [ ] **Step 3: Run the complete backend suite** with `.venv/bin/python -m unittest discover -s tests`; record the exact passing count.
- [ ] **Step 4: Run a lightweight local socket smoke test** for 10 rooms and 60 connections; require no duplicate actions, mutation exceptions, or stuck bot loops, and record peak process memory/CPU observed.
- [ ] **Step 5: Exercise two-browser acceptance locally**: strict human pause order, all bet presets, bot elimination without rebuy, each human rebuy limit, spectate/exit, 10-minute fake-clock blind transition, and reconnect before/after the one-hour fake deadline.
- [ ] **Step 6: Check 390×844, 768×1024, and 1440×900 layouts**; require no document scroll during a hand and no overlap among cards, result panel, busted controls, or action buttons.
- [ ] **Step 7: Update QA and README** with exact evidence and the Render Free limitation; do not claim restart-safe persistence.
- [ ] **Step 8: Commit** with `docs: record local tournament verification`.
- [ ] **Step 9: Start the local server and give the user the local URL**; stop before any `git push`, Render action, PR, or merge.
