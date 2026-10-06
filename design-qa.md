# Character Table Design QA

Date: 2026-10-06

Visual reference: `/Users/guangkaichen/.codex/generated_images/01a105cb-5b26-7e00-bd35-adb163f725a7/exec-144c75b5-31f1-4323-9543-7394a0dccd83.png`

## Automated verification

- `npm test`: 14 files, 22 tests passed.
- `npm run build`: TypeScript and Vite production build passed.
- `.venv/bin/python -m pytest -q`: 41 tests passed.
- Browser console: no warnings or errors during the complete flow.

## Browser acceptance

Completed in the Codex in-app browser against `http://127.0.0.1:8899`:

1. Entered a nickname and opened the bot challenge setup.
2. Created the default six-player intermediate table with five distinct personas.
3. Verified all five optimized WebP portraits loaded and matched their persona labels.
4. Started a hand and observed the active bot timer and “思考中” state.
5. Reached the human turn, opened raise sizing, and verified `½池 / ¾池 / 满池 / 全下`.
6. Verified hole cards and community cards remain visible while raise sizing is open.
7. Completed the hand through the river and reached “准备下一局”.
8. Exercised the friend-invite action and reduced-motion preference.

## Responsive evidence

- `390×844`: `scrollWidth = 390`, `scrollHeight = 844`; no document scrolling, cards and actions remain visible.
- `768×1024`: `scrollWidth = 768`, `scrollHeight = 1024`; table bounds remain within the viewport.
- `1440×900`: `scrollWidth = 1440`, `scrollHeight = 900`; table bounds `340..1100`, action rail `0..1440`.

## Comparison and fixes

The implementation retains the selected reference’s warm private-lounge atmosphere, dark emerald felt, copper-gold trim, large portrait seats, centered pot/cards, and quiet top controls without copying external brand assets.

- P1: persona portraits returned 404 because Flask served only `/assets/*`. Added a tested `/avatars/*` production route.
- P1: the first raise sheet covered the hero cards at `390×844`. Converted it to a compact sizing mode and moved the hero seat/cards above it.
- P1: production bot logs printed hidden cards. Removed the log and added a privacy regression test.
- P2: the original bottom utility navigation competed with primary actions. Replaced it with top-level lineup, invite, and settings controls.
- Recheck: all P1/P2 findings fixed; browser console clean; no overflow at target viewports.

final result: passed
