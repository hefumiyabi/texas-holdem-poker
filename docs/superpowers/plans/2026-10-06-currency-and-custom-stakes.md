# Currency and Custom Stakes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let friend-room hosts choose CNY or JPY, select or enter a buy-in, configure blinds, and see that currency consistently across the live table.

**Architecture:** Persist a strict currency code beside each table, expose it through the existing room contract, and keep Flask authoritative for numeric validation. Extend the focused friend-room sheet for configuration, then pass one shared formatter from the room snapshot into all monetary table components.

**Tech Stack:** Flask, SQLite, React 19, TypeScript, Vite, Vitest, Testing Library

**Spec:** `docs/plans/2026-10-06-currency-and-custom-stakes-design.md`

## Global Constraints

- Only `CNY` and `JPY` are accepted; UI labels are `¥` and `JP¥`.
- CNY presets are 1,000 / 5,000 / 10,000; JPY presets are 10,000 / 200,000 / 500,000.
- Custom buy-in range is 100 through 10,000,000 inclusive.
- Small blind is at least 1; big blind is greater than small blind; both are below the buy-in.
- Friend-room table sizes stay exactly 2, 4, or 6.
- Bot challenge behavior is unchanged and defaults to CNY.
- This remains virtual-chip play with no payment or cash-out behavior.

## Review Focus

- Reject invalid currency and non-integer or boolean monetary inputs at the server boundary.
- Existing SQLite databases must gain a default CNY column without losing rooms.
- Switching currency must update presets and defaults without submitting stale values.
- Custom amount and blind errors must be announced inline and must not call the API.
- Every visible table amount must use the same room currency, including action confirmations and results.
- The expanded setup sheet must remain usable at 390×844 without trapping fields below an unreachable footer.

---

### Task 1: Currency Persistence and Room Contract

**Files:**
- Modify: `database.py`
- Modify: `app.py`
- Modify: `tests/test_database.py`
- Modify: `tests/test_v1_api.py`
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/api.test.ts`

**Interfaces:**
- Produces: `CurrencyCode = 'CNY' | 'JPY'`.
- Produces: `FriendRoomConfig { seatCount; currency; initialChips; smallBlind; bigBlind }`.
- Produces: room previews and snapshots containing `currency`.
- Consumes: `POST /api/v1/rooms` fields `currency`, `initial_chips`, `small_blind`, and `big_blind`.

- [ ] **Step 1: Add failing database tests** for the idempotent `currency` migration, default CNY, and explicit JPY persistence.
- [ ] **Step 2: Run the focused database tests** and verify they fail because currency is absent.
- [ ] **Step 3: Add failing API tests** for valid JPY/custom stakes plus invalid currency, fractional/boolean amounts, bounds, and blind relationships.
- [ ] **Step 4: Run the focused API tests** and verify the current preset-only validation fails the valid custom case.
- [ ] **Step 5: Add a failing frontend API test** requiring the complete configuration payload.
- [ ] **Step 6: Implement schema migration, persistence, strict validation, response fields, and TypeScript/API contracts.**
- [ ] **Step 7: Run all focused tests** and require them to pass.
- [ ] **Step 8: Commit** with `feat: persist room currency and custom stakes`.

### Task 2: Friend Room Currency and Stake Controls

**Files:**
- Modify: `frontend/src/components/FriendRoomSetup.tsx`
- Modify: `frontend/src/components/FriendRoomSetup.test.tsx`
- Modify: `frontend/src/i18n.ts`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: `FriendRoomConfig` from Task 1.
- Produces: currency toggle, currency-specific presets, custom buy-in, and small/big blind inputs.
- Submits: one validated configuration to `onCreate`.

- [ ] **Step 1: Add failing component tests** for CNY defaults and exact submission.
- [ ] **Step 2: Add failing tests** for JPY switch, JPY presets, custom buy-in, and custom blinds.
- [ ] **Step 3: Add failing validation tests** proving invalid inputs announce errors and skip `onCreate`.
- [ ] **Step 4: Run the focused test file** and confirm the new assertions fail.
- [ ] **Step 5: Implement controls, state transitions, localized copy, inline validation, and accessible numeric labels.**
- [ ] **Step 6: Add responsive sheet styles** with a scrollable form body and 44px controls.
- [ ] **Step 7: Run focused tests** and require them to pass.
- [ ] **Step 8: Commit** with `feat: configure currency and stakes in friend rooms`.

### Task 3: Consistent Table Money Formatting

**Files:**
- Create: `frontend/src/currency.ts`
- Create: `frontend/src/currency.test.ts`
- Modify: `frontend/src/pages/TablePage.tsx`
- Modify: `frontend/src/components/PokerBoard.tsx`
- Modify: `frontend/src/components/PlayerSeat.tsx`
- Modify: `frontend/src/components/BotSeat.tsx`
- Modify: `frontend/src/components/HeroStack.tsx`
- Modify: `frontend/src/components/ActionRail.tsx`
- Modify: `frontend/src/components/HandResultCard.tsx`
- Modify: corresponding component tests

**Interfaces:**
- Produces: `formatMoney(value, currency)` returning `¥1,000` or `JP¥10,000`.
- Consumes: `snapshot.room.currency`, falling back to CNY for old snapshots.
- Produces: one `currency` prop threaded to monetary components.

- [ ] **Step 1: Add failing formatter tests** for CNY, JPY, separators, and safe fallback.
- [ ] **Step 2: Add failing component tests** for pot/blinds, seats, hero chips, call/raise confirmation, and result payouts in JPY.
- [ ] **Step 3: Run focused tests** and verify raw locale-number output fails expectations.
- [ ] **Step 4: Implement the formatter and thread the room currency through TablePage and all monetary components.**
- [ ] **Step 5: Run focused tests** and require them to pass.
- [ ] **Step 6: Commit** with `feat: format table amounts by room currency`.

### Task 4: Full Verification and Deployment

**Files:**
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: tested production bundle and deployed Render revision.

- [ ] **Step 1: Run the complete frontend test suite** and require all tests to pass.
- [ ] **Step 2: Run the production frontend build** and require success.
- [ ] **Step 3: Run the complete backend test suite** and record the exact passing count.
- [ ] **Step 4: Exercise CNY presets and JPY custom creation locally at 390×844**, then verify invite, entry, refresh persistence, table labels, and no console errors.
- [ ] **Step 5: Update `design-qa.md`** with exact commands and browser evidence.
- [ ] **Step 6: Commit** with `docs: record currency and stakes verification`.
- [ ] **Step 7: Push the deploy branch and wait for Render Live.**
- [ ] **Step 8: Verify public `/healthz`, built assets, and the new setup flow.**
