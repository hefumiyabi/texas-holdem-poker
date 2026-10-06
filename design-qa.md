# Character Table Design QA

Date: 2026-10-06

Visual reference: `/Users/guangkaichen/.codex/generated_images/01a105cb-5b26-7e00-bd35-adb163f725a7/exec-144c75b5-31f1-4323-9543-7394a0dccd83.png`

## Automated verification

- `npm test`: 21 files, 43 tests passed.
- `npm run build`: TypeScript and Vite production build passed.
- `.venv/bin/python -m unittest discover -s tests`: 58 tests passed.
- Browser console: no warnings or errors during the complete flow.

## Browser acceptance

Completed in the Codex in-app browser against `http://127.0.0.1:8899`:

1. Entered a nickname and opened the bot challenge setup.
2. Selected the 5,000 buy-in and created a six-player intermediate table with five distinct personas.
3. Verified the hero and all five bots each entered with exactly 5,000 chips, including with a cached older guest session.
4. Verified all five optimized WebP portraits loaded and matched their persona labels.
5. Started a hand and observed the active bot timer and “思考中” state.
6. Reached the human turn, opened raise sizing, and verified `½池 / ¾池 / 满池 / 全下`.
7. Verified hole cards and community cards remain visible while raise sizing is open.
8. Completed the hand through the river and reached “准备下一局”.
9. Exercised the friend-invite action and reduced-motion preference.
10. Verified the raise confirmation uses a high-contrast gold button with a distinct bold amount (`确认 64`).
11. Verified a `跟注 $10` action toast appears immediately, disappears after 1.2 seconds, and leaves the hero cards unobstructed.
12. Verified the 30-second human countdown, persistent folded badges, and difficulty-based bot thinking state are visible on the correct seats.
13. Verified the compact GTO reference expands to show equity, pot odds, and a plain-language recommendation without covering the action buttons.
14. Reached a real showdown and verified the result card exposed both legal hands, named the winning `A高同花`, and explained that it beat `A高牌` while leaving the hero cards visible.
15. Verified current blinds and the number of hands until the next increase are visible; the second hand correctly changed the countdown from five to four.
16. Verified the completed-hand result remains bounded above the board on 390×844: the showdown panel measured `y=70..238.5`, and the post-review fold-win panel measured `y=70..183` while community cards began at `y=363.75`. Neither overlapped the board, hero cards, or next-hand control.
17. Verified the collapsed result retains its hand/reason summary, measures `y=70..134`, and its expand/collapse control has a 44 px-high touch target.
18. Verified the home screen now exposes three distinct paths: bot challenge, friend-room creation, and room-code entry.
19. Opened the friend-room setup at `390×844`, confirmed the 6-player / 1,000 defaults, selected 4 players / 5,000, and created room `GNALJK`.
20. Verified the created state shows the six-character code, copy confirmation, system-share action, and remains in the dialog until “进入牌桌” is pressed.
21. Entered the new room and confirmed the authoritative 5,000 buy-in appeared in both the seat and the dedicated hero chip bar; after posting the small blind, both updated to 4,990.

## Responsive evidence

- `390×844`: `scrollWidth = 390`, `scrollHeight = 844`; no document scrolling. Hero stack `y=595..694`, hero cards `y=625..694`, action rail `y=740..844`; 46 px non-overlap gap.
- `768×1024`: `scrollWidth = 768`, `scrollHeight = 1024`; table bounds remain within the viewport.
- `1440×686`: `scrollWidth = 1440`, `scrollHeight = 686`; hero stack `y=464..566`, hero cards `y=497..566`, action rail `y=578..686`; 12 px non-overlap gap.
- `1440×900`: `scrollWidth = 1440`, `scrollHeight = 900`; hero stack `y=678..780`, hero cards `y=711..780`, action rail `y=792..900`; 12 px non-overlap gap.

## Comparison and fixes

The implementation retains the selected reference’s warm private-lounge atmosphere, dark emerald felt, copper-gold trim, large portrait seats, centered pot/cards, and quiet top controls without copying external brand assets.

- P1: persona portraits returned 404 because Flask served only `/assets/*`. Added a tested `/avatars/*` production route.
- P1: the first raise sheet covered the hero cards at `390×844`. Converted it to a compact sizing mode and moved the hero seat/cards above it.
- P1: production bot logs printed hidden cards. Removed the log and added a privacy regression test.
- P1: fair public bots could receive opponent objects containing hole cards. Replaced those with public-only player views; only the explicitly non-public GOD test bot retains omniscient state.
- P1: legacy sockets could still create GOD bots, and bot edits could race with hand start. Restricted legacy levels and serialized lineup/start operations per table.
- P1: concurrent next-hand votes could start two hands. Moved finished-stage validation, voting, and hand start under the same table lock, with a second stage guard.
- P1: an older cached guest stack overrode the selected challenge buy-in. Challenge tables now construct table-scoped players from the persisted seat stack.
- P2: seeded post-flop bots used an unseeded equity sampler. Routed the bot RNG into equity calculations for reproducible decisions.
- P2: starting a next hand with fewer than two eligible players mutated statuses before failing. It now returns a clear error without changing table state.
- P2: lineup editing stopped after a completed hand and nine-seat positioning was incomplete. Enabled between-hand edits and added all nine unique seat coordinates.
- P2: added explicit 1,000 / 5,000 / 10,000 buy-in controls and kept the setup sheet scroll-safe on short phones.
- P2: the raise confirmation inherited the dark generic sheet-button background. Added a dedicated high-contrast confirmation treatment and bold tabular amount.
- P2: resolved-action messages persisted over the hero area. Moved them to the top of the stage, made them pointer-transparent, and auto-clear them after 1.2 seconds or immediately on hand completion.
- P2: hand completion did not explain why a player won. Added a privacy-safe result card with revealed cards, the winning hand category/description, and the strongest defeated hand.
- P2: blind stakes never progressed. Added a stable five-hand blind level that doubles only when a new hand begins and exposes the next increase in the table UI.
- P1: disconnect cleanup and forced-blind all-ins could leave an actorless hand running. Cleanup now preserves committed all-in chips through settlement, folds expired active seats safely, and immediately settles actorless starts.
- P1: reconstructed tables lost their hand number and table-scoped stacks. Completed-hand progress now persists atomically and restores the correct blind level and chips.
- P1: one bot completion log printed the raw result object, including mucked cards after a fold. Replaced it with scalar showdown metadata and added a log privacy regression test.
- P2: the turn ring lacked a visible countdown and split pots named only the first winner. Added visible remaining seconds plus explicit winner/payout chips for every split-pot winner.
- P2: the full hand-result card covered the community cards during review. Moved it below the header, added an accessible collapse/restore control, and measured zero overlap at 390×844.
- P2: the first collapsed summary omitted the winning category and used a very small toggle. Kept the hand category/fold reason visible and raised the toggle to a measured 44 px touch height.
- P2: the original bottom utility navigation competed with primary actions. Replaced it with top-level lineup, invite, and settings controls.
- P1: the self-seat chip line could disappear behind the cards and action rail. Added a dedicated server-authoritative nickname/chip bar above the hero hand and measured non-negative gaps at all target viewports.
- P2: the home screen mixed room creation into the bot path. Added a separate friend-room setup with exact 2/4/6 seat and 1,000/5,000/10,000 buy-in presets, followed by an invitation state before entering the table.
- Recheck: all P1/P2 findings fixed; browser console clean; no overflow at target viewports.

final result: passed
