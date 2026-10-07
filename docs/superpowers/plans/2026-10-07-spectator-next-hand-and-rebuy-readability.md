# Spectator Next Hand and Rebuy Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a busted spectator manually start the next bot-only hand and make the rebuy action clearly legible.

**Architecture:** Extend the existing `BustedControls` callback surface with an optional next-hand action and route it to the existing `round:vote` socket command. Adjust the server vote boundary only for the no-active-human case, preserving normal human voting. Add a dedicated rebuy class for high-contrast styling.

**Tech Stack:** React, TypeScript, Vitest, Flask-SocketIO, Python unittest, CSS

**Spec:** `docs/plans/2026-10-07-spectator-next-hand-and-rebuy-readability-design.md`

## Global Constraints

- Keep all changes local; do not push or deploy.
- Do not introduce an automatic infinite bot-hand loop.
- Preserve existing human next-round voting and rebuy limits.
- Use the existing `round:vote` socket command.

## Review Focus

- A busted player who has not selected spectate still sees “继续观看”, not “观看下一局”.
- A spectator sees “观看下一局” only when the table is finished.
- A spectator cannot bypass active human votes.
- A single eligible bot is still rejected because a hand requires two funded players.
- The rebuy action remains accessible by its full label and its click handler still fires once.

---

### Task 1: Spectator next-hand control

**Files:**
- Modify: `frontend/src/components/BustedControls.tsx`
- Modify: `frontend/src/components/BustedControls.test.tsx`
- Modify: `frontend/src/pages/TablePage.tsx`
- Modify: `frontend/src/i18n.ts`
- Modify: `tests/test_v1_socket.py`
- Modify: `app.py`

**Interfaces:**
- Consumes: existing `round:vote` Socket.IO command.
- Produces: optional `onWatchNext?: () => void` prop and `watchNextHand` translation key.

- [ ] **Step 1: Write failing frontend and socket tests**

Assert that a spectating player renders “观看下一局” and invokes `onWatchNext`, and that a spectator vote starts a finished hand when at least two funded bots and no funded humans remain. Assert that funded humans still gate normal voting.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- --run frontend/src/components/BustedControls.test.tsx` and `python -m unittest tests.test_v1_socket.V1SocketTestCase.test_spectator_can_start_next_bot_only_hand`

Expected: FAIL because the prop/control and bot-only vote branch do not exist.

- [ ] **Step 3: Implement the minimal control and vote branch**

Add `onWatchNext?: () => void`, emit `round:vote` from `TablePage` only for a finished spectator, and permit the voting spectator to start when `human_ids` is empty and at least two funded bots are eligible.

- [ ] **Step 4: Run focused tests and verify pass**

Run the focused frontend and backend commands from Step 2.

Expected: PASS.

### Task 2: Rebuy button readability

**Files:**
- Modify: `frontend/src/components/BustedControls.tsx`
- Modify: `frontend/src/components/BustedControls.test.tsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: existing `gold-button` behavior.
- Produces: dedicated `rebuy-button` class.

- [ ] **Step 1: Write a failing class/style regression test**

Assert that the rebuy action includes `rebuy-button`, and that its CSS pins a 14px size, 800 weight, dark text, solid high-contrast gold background, full opacity, and no text shadow.

- [ ] **Step 2: Run focused test and verify failure**

Run: `npm test -- --run frontend/src/components/BustedControls.test.tsx frontend/src/pages/TablePage.layout.test.ts`

Expected: FAIL because the dedicated class and declarations do not exist.

- [ ] **Step 3: Implement the dedicated style**

Add `rebuy-button` to the existing action and define the scoped CSS declarations without changing other gold buttons.

- [ ] **Step 4: Verify the complete local build**

Run: `npm test -- --run`, `npm run build`, and `python -m unittest discover -s tests`.

Expected: all tests and build PASS.

