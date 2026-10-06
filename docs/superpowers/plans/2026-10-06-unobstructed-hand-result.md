# Unobstructed Hand Result Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the completed-hand result out of the card-review area and make its details collapsible.

**Architecture:** Keep the existing `HandResultCard` data interface. Add local expanded state and an accessible toggle, then position the card below the header with a compact collapsed modifier.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS.

**Spec:** `docs/plans/2026-10-06-unobstructed-hand-result-design.md`

## Global Constraints

- Never cover community cards, hero cards, or the next-hand control at 390×844.
- Preserve all showdown and split-pot information.
- Provide complete Chinese and English toggle labels.

## Review Focus

- A long winner name must not widen the result beyond the viewport; component positioning remains constrained to `88vw`.
- Collapsing must hide detailed cards without discarding result state; the same button restores them.
- Fold-win results must remain privacy-safe after toggling; existing fold-win test remains green.
- The result must not create document overflow at 390×844; browser QA measures both axes.
- The toggle must remain keyboard and screen-reader accessible; the component test selects it by accessible name.

---

### Task 1: Collapsible Top Result Bar

**Files:**
- Modify: `frontend/src/components/HandResultCard.tsx`
- Modify: `frontend/src/components/HandResultCard.test.tsx`
- Modify: `frontend/src/styles.css`
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: existing `HandResultCard({ language, result })` props.
- Produces: the same component with local `collapsed: boolean` state and accessible expand/collapse controls.

- [ ] **Step 1: Write the failing component test** that clicks `收起结果`, verifies hand details disappear, clicks `查看结果`, and verifies they return.
- [ ] **Step 2: Run** `npm test -- --run src/components/HandResultCard.test.tsx` and verify RED.
- [ ] **Step 3: Implement** the toggle without changing result data or privacy rules.
- [ ] **Step 4: Move** `.hand-result-card` to a fixed top position below the header and add a compact collapsed style.
- [ ] **Step 5: Run** the focused test, full frontend suite, and production build; verify PASS.
- [ ] **Step 6: Browser-test** at 390×844 and record no overflow or overlap in `design-qa.md`.
- [ ] **Step 7: Commit** `fix: keep hand results clear of the board`.
