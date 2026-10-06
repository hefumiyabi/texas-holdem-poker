# Friend Room Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable friend-room creation and invitation flow to the home screen while keeping the viewer's chip count visible above their cards.

**Architecture:** Keep the existing Flask room endpoint authoritative, but give private-room creation a typed frontend contract separate from bot challenges. Add one focused React dialog with setup and invitation-success states, wire it into `HomePage`, and render a dedicated viewer stack label whose position follows the existing responsive card safety rules.

**Tech Stack:** Flask, SQLite, React 19, TypeScript, Vite, Vitest, Testing Library, CSS media queries

**Spec:** `docs/plans/2026-10-06-friend-room-entry-design.md`

## Global Constraints

- Friend rooms remain private and use six-character invitation codes.
- Supported table sizes are exactly 2, 4, and 6 players.
- Supported buy-ins are exactly 1,000, 5,000, and 10,000 chips.
- The flow must support Chinese and English.
- No public matchmaking, accounts, chat, or real-money behavior is added.
- Server snapshots remain authoritative for chip totals.

## Review Focus

- Repeated create clicks must produce only one request; `FriendRoomSetup` tests the busy state.
- A missing Web Share API must still allow link copying; `FriendRoomSetup` tests the clipboard fallback.
- A cancelled system share must keep the success screen usable; `FriendRoomSetup` tests that the invite state remains visible.
- An unsupported seat count or buy-in must return HTTP 400; `test_v1_api.py` covers both classes.
- A low-height landscape viewport must keep viewer chips, cards, and actions separated; the layout regression test and browser measurement cover it.

---

### Task 1: Private Room Creation Contract

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api.ts`
- Create: `frontend/src/api.test.ts`
- Modify: `tests/test_v1_api.py`

**Interfaces:**
- Produces: `FriendRoomConfig { seatCount: 2 | 4 | 6; initialChips: 1000 | 5000 | 10000 }`.
- Produces: `api.createFriendRoom(config: FriendRoomConfig): Promise<{ success: true; room: RoomInfo }>`.
- Consumes: existing `POST /api/v1/rooms` private mode.

- [ ] **Step 1: Write failing backend tests** asserting each allowed buy-in is preserved in room details and unsupported `seat_count` / `initial_chips` values return 400.
- [ ] **Step 2: Run `python -m unittest tests.test_v1_api.ModernV1ApiTests`** and verify the new assertions expose any contract gap.
- [ ] **Step 3: Write a failing frontend API test** asserting `createFriendRoom({ seatCount: 4, initialChips: 5000 })` posts `{ title: '好友之夜', max_players: 4, initial_chips: 5000 }` without bot mode fields.
- [ ] **Step 4: Run the focused Vitest file** and verify it fails because `createFriendRoom` is missing.
- [ ] **Step 5: Add `FriendRoomConfig` and implement `api.createFriendRoom`** while leaving `api.createRoom` for bot challenges unchanged.
- [ ] **Step 6: Run the focused backend and frontend tests** and verify both pass.
- [ ] **Step 7: Commit** with `feat: add friend room creation contract`.

### Task 2: Friend Room Setup and Invitation Dialog

**Files:**
- Create: `frontend/src/components/FriendRoomSetup.tsx`
- Create: `frontend/src/components/FriendRoomSetup.test.tsx`
- Modify: `frontend/src/pages/HomePage.tsx`
- Modify: `frontend/src/i18n.ts`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: `api.createFriendRoom(config)` from Task 1.
- Produces: `FriendRoomSetup({ language, onClose, onCreate, onEnter })` with setup and created-room states.
- Created-room state consumes `RoomInfo.join_code` and `RoomInfo.invite_url`.

- [ ] **Step 1: Write failing component tests** for the new home button, default 6-player/1,000 selections, 2/4/6 and 1,000/5,000/10,000 selection submission, duplicate-submit prevention, and inline API errors.
- [ ] **Step 2: Run the focused test** and verify failure because the dialog does not exist.
- [ ] **Step 3: Add failing invitation-state tests** for room-code display, clipboard copy, Web Share, cancelled share, and navigation only after “进入牌桌”.
- [ ] **Step 4: Implement the dialog and typed home wiring** using existing choice-grid and sheet visual patterns without difficulty or persona controls.
- [ ] **Step 5: Add Chinese and English copy** for create, setup, invite, copy, system share, and enter actions.
- [ ] **Step 6: Add responsive home grid and dialog styles** so the three home paths remain distinct and touch targets stay at least 44px.
- [ ] **Step 7: Run the focused tests** and verify all dialog and home behaviors pass.
- [ ] **Step 8: Commit** with `feat: add friend room invite flow`.

### Task 3: Viewer Chip Visibility

**Files:**
- Create: `frontend/src/components/HeroStack.tsx`
- Create: `frontend/src/components/HeroStack.test.tsx`
- Modify: `frontend/src/pages/TablePage.tsx`
- Modify: `frontend/src/pages/TablePage.layout.test.ts`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: the existing `viewer: Player` selected from the authoritative room snapshot.
- Produces: `HeroStack({ player }: { player: Player })` displaying the viewer nickname and `player.chips.toLocaleString()` above `.hero-hand`.

- [ ] **Step 1: Write a failing `HeroStack` component test** that requires the viewer nickname and current chip total.
- [ ] **Step 2: Extend the layout regression test** to require hero-stack positioning inside the mobile and short-landscape safety zones.
- [ ] **Step 3: Run the focused tests** and verify both fail for the missing viewer stack.
- [ ] **Step 4: Render the viewer stack beside the existing hero hand** and mark the duplicate self-seat chip line as visually secondary.
- [ ] **Step 5: Add responsive CSS** keeping the stack above the cards and below the self avatar without intersecting the action rail.
- [ ] **Step 6: Run the focused tests** and verify they pass.
- [ ] **Step 7: Commit** with `fix: keep viewer chips visible at the table`.

### Task 4: End-to-End Verification and Deployment

**Files:**
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: all earlier tasks.
- Produces: deployed Render commit and measured viewport evidence.

- [ ] **Step 1: Run `npm test` in `frontend`** and require all tests to pass.
- [ ] **Step 2: Run `npm run build` in `frontend`** and require a successful production bundle.
- [ ] **Step 3: Run `python -m unittest discover -s tests`** and record the exact passing count.
- [ ] **Step 4: Exercise create → configure → share/copy → enter in a local browser** at 390×844.
- [ ] **Step 5: Measure viewer-stack, hero-hand, and action-rail bounds** at 390×844, 1440×686, and 1440×900; all gaps must be non-negative and the document must not scroll.
- [ ] **Step 6: Update `design-qa.md`** with the tested flow and measured layout evidence.
- [ ] **Step 7: Push `modern-character-table` to the deploy remote and wait for Render Live.**
- [ ] **Step 8: Verify public `/healthz`, matching built assets, invitation flow, and console error absence.**
