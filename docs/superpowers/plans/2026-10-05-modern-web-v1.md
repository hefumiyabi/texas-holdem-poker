# Modern Web V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a mobile-first React poker experience with secure guest sessions, private invite rooms, the existing Python game engine, and a Render-ready single-instance deployment.

**Architecture:** A React/TypeScript/Vite client consumes versioned REST and Socket.IO contracts from the existing Flask service. The server remains authoritative for identity, room membership, actions, and game state; SQLite persists sessions and private-room metadata.

**Tech Stack:** Python 3.12, Flask, Flask-SocketIO threading mode, SQLite, React, TypeScript, Vite, Vitest, Testing Library, Docker, Render.

**Spec:** Approved user plan in the 2026-10-05 conversation.

## Global Constraints

- Mobile portrait is primary; active play must fit without page scrolling at 390x844.
- Chinese is default and English remains available for every core flow.
- Guest identity comes only from a secure HttpOnly cookie, never a client-supplied player id.
- Rooms are private by default and joinable by a unique six-character code.
- Existing poker engine behavior and tests must remain green.
- Production is one Render instance with `/var/data` persistence and no eventlet.

## Review Focus

- Reusing a nickname must create a distinct guest identity and never take over another seat.
- A socket must not act in a room that its authenticated guest has not joined.
- Reconnect within 30 seconds must restore the same identity, seat, and hole cards.
- User-controlled names and room titles must render as text, never executable markup.
- Invalid or stale room codes must fail without leaking private room state.

---

### Task 1: Secure guest sessions and private rooms

**Files:**
- Modify: `database.py`, `app.py`
- Create: `tests/test_v1_api.py`

**Interfaces:**
- Produces REST endpoints under `/api/v1`, a `poker_session` cookie, six-character room codes, and authenticated room helpers consumed by Task 2.

- [ ] Write failing API tests for unique guest identity, cookie restore/logout, private room creation/preview/join, authorization, and input validation.
- [ ] Run the focused tests and verify failures are caused by missing v1 behavior.
- [ ] Add idempotent schema migrations, session hashing/expiry, room-code lookup, REST handlers, same-origin configuration, and basic rate limits.
- [ ] Run focused and existing Python suites, then commit.

### Task 2: Authenticated Socket.IO v1 contract

**Files:**
- Modify: `app.py`
- Create: `tests/test_v1_socket.py`

**Interfaces:**
- Consumes the authenticated session and room helpers from Task 1.
- Produces `room:*`, `hand:*`, `turn:*`, `player:*`, `round:*`, `action:*`, `connection:*`, and versioned error events for Task 3.

- [ ] Write failing Socket.IO tests for authentication, room membership, host-only operations, action authorization, snapshots, and reconnect behavior.
- [ ] Run the focused tests and verify expected failures.
- [ ] Implement the v1 socket adapter around the existing engine without changing rules.
- [ ] Remove sensitive card logging, run all Python tests, then commit.

### Task 3: Mobile-first React experience

**Files:**
- Create: `frontend/`
- Modify: `app.py`

**Interfaces:**
- Consumes Task 1 REST and Task 2 Socket.IO contracts.
- Produces `/`, `/room/:code`, and `/table/:code` routes plus a production bundle served by Flask.

- [ ] Scaffold React/TypeScript/Vite test infrastructure and write failing tests for guest entry, create/join flow, table reducer, legal actions, bet sizing, language, sound, and reconnect banners.
- [ ] Run frontend tests and verify expected failures.
- [ ] Implement the dark navy/green/gold mobile experience, responsive desktop layout, bottom action rail, drawers, accessible controls, reduced motion, and bilingual copy.
- [ ] Build the production bundle, serve it from Flask while preserving `/legacy/*`, run frontend and Python suites, then commit.

### Task 4: Production packaging and acceptance

**Files:**
- Create: `Dockerfile`, `render.yaml`, `.dockerignore`
- Modify: `requirements.txt`, `README.md`
- Test: `tests/test_production_config.py`

**Interfaces:**
- Consumes the built frontend and Flask app.
- Produces a one-worker Render service using `/var/data`, `/healthz`, `$PORT`, secure cookies, and exact allowed origins.

- [ ] Write failing production-configuration tests for health, data paths, secrets, debug mode, cookie security, and no eventlet.
- [ ] Run the focused tests and verify expected failures.
- [ ] Add the multi-stage image, Render blueprint, environment validation, structured non-sensitive logging, and deployment documentation.
- [ ] Run Python, frontend, build, and browser acceptance checks at 390x844, 768x1024, and 1440x900; commit the verified result.
