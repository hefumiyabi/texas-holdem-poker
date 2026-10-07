# Character Table Design QA

Date: 2026-10-07

Visual reference: `/Users/guangkaichen/.codex/generated_images/01a105cb-5b26-7e00-bd35-adb163f725a7/exec-144c75b5-31f1-4323-9543-7394a0dccd83.png`

## Automated verification

- `npm --prefix frontend test -- --run`: 23 files, 61 tests passed.
- `npm --prefix frontend run build`: TypeScript and Vite production build passed (4,638 modules; JS 431.20 kB / gzip 133.75 kB; CSS 37.59 kB / gzip 8.86 kB).
- `.venv/bin/python -m unittest discover -s tests`: 93 tests passed.
- Load smoke: 10 rooms / 60 Socket.IO clients passed in 0.56 s; wrapper wall time 0.99 s, CPU 0.93 s, peak RSS 44.4 MiB.
- Browser console: no warnings or errors during the current local acceptance flow.

## 2026-10-07 local tournament acceptance

Completed against the current local branch at `http://127.0.0.1:8898`; no deploy or push was performed.

1. Verified bot-challenge and friend-room setup both expose human rebuy limits `0 / 1 / 2 / 3 / unlimited`, defaulting to one, with explicit copy that bots never rebuy.
2. Started a heads-up bot challenge and left the human action untouched for 10 seconds. The pot, stacks, turn owner, and enabled human controls did not change; the bot did not act out of order.
3. Opened raise sizing and verified visible, distinct `½ pot / ¾ pot / pot / 3× / 4× / 6× / all-in / custom` targets plus a high-contrast confirmation amount.
4. Verified the table shows the current blind level, a `09:xx` countdown from the default ten-minute level, and the next `15 / 30` level.
5. Reached a completed hand and verified the result card shows viewer net result, invested amount, payout, final stack, reason/hand category, and an expandable all-player view.
6. Created private room `NSDVD2` in one browser context and joined it as `好友QA` from a second independent browser context. Both clients showed authoritative `1,000` stacks and the host start control became enabled.
7. Started that two-human hand and paused the first player for 5 seconds. The second browser remained `观战中` with disabled controls, proving strict human turn order across clients.
8. Automated fake-clock tests cover exact blind-boundary advancement, multi-level overrun display, and pause/resume without counting paused time. Socket tests cover 3,599-second recovery, transition to a retained spectator at 3,600 seconds, and pausing when the disconnected player becomes current.
9. Automated elimination tests cover every human rebuy limit, spectate/leave, and the invariant that bots cannot rebuy.
10. Duplicate turn-token, out-of-turn, stale sleeping-bot, concurrent next-round vote, 244 bot-hand legality, and 2,173 randomized-hand chip-conservation/no-stall regressions all passed.

The one-hour reconnect guarantee is intentionally process-local. A Render Free cold start, redeploy, or process restart can discard active in-memory rooms and its ephemeral SQLite files.

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
12. Verified human turns no longer show a countdown or receive a timeout action; persistent folded badges and difficulty-based bot thinking state remain visible on the correct seats.
13. Verified the compact GTO reference expands to show equity, pot odds, and a plain-language recommendation without covering the action buttons.
14. Reached a real showdown and verified the result card exposed both legal hands, named the winning `A高同花`, and explained that it beat `A高牌` while leaving the hero cards visible.
15. Verified current blinds and the number of hands until the next increase are visible; the second hand correctly changed the countdown from five to four.
16. Verified the completed-hand result remains bounded above the board on 390×844: the showdown panel measured `y=70..238.5`, and the post-review fold-win panel measured `y=70..183` while community cards began at `y=363.75`. Neither overlapped the board, hero cards, or next-hand control.
17. Verified the collapsed result retains its hand/reason summary, measures `y=70..134`, and its expand/collapse control has a 44 px-high touch target.
18. Verified the home screen now exposes three distinct paths: bot challenge, friend-room creation, and room-code entry.
19. Opened the friend-room setup at `390×844`, confirmed the 6-player / 1,000 defaults, selected 4 players / 5,000, and created room `GNALJK`.
20. Verified the created state shows the six-character code, copy confirmation, system-share action, and remains in the dialog until “进入牌桌” is pressed.
21. Entered the new room and confirmed the authoritative 5,000 buy-in appeared in both the seat and the dedicated hero chip bar; after posting the small blind, both updated to 4,990.
22. Repeated the public Render flow with guest `线上验收`: opened the new friend-room setup, selected heads-up, created invitation code `HFVDF2`, and observed no browser warnings or errors.
23. At `390×844`, verified the friend-room form shows CNY defaults (`¥1,000`, `¥10/¥20`), switches to JPY presets (`JP¥10,000 / JP¥200,000 / JP¥500,000`), and exposes custom buy-in and blind inputs.
24. Created JPY room `N33SY8` with `JP¥345,678` and `JP¥750 / JP¥1,500`; entered and refreshed the table, confirming the currency, buy-in, blinds, pot, seat stack, and hero stack persisted with no console warnings or errors.
25. Returned home and created CNY room `CQJWTK` with the 4-player / `¥5,000` preset; entered the table and confirmed `¥10 / ¥20`, `¥0` pot, and `¥5,000` stacks.
26. Verified the deployed Render API by creating JPY room `42VX8L`; the response preserved `currency=JPY`, `initial_chips=345678`, `small_blind=750`, and `big_blind=1500`. The deployed guest gate loaded with no browser warnings or errors.
27. After the final action-formatting review fixes, verified Render served `index-0G_85XtZ.js`, `/healthz` remained healthy, and live JPY room `DBPZYA` preserved `JP¥345,678` with `JP¥750 / JP¥1,500` blinds.

## Responsive evidence

- Current 2026-10-07 measurements at `390×844`, `768×1024`, and `1440×900`: `scrollWidth/scrollHeight` exactly matched each viewport for both active-hand and completed-hand states; neither axis overflowed.
- Active-hand measurements: hero cards ended at `y=694 / 904 / 780`, while the action rail began at `y=740 / 916 / 792`; overlap was false at every target size. Community cards also did not overlap the action rail.
- Completed-hand measurements: the result card occupied `y=70..260` at 390×844 and `y=76..281` at both larger sizes. It did not overlap the community cards, hero cards, or next-hand controls at any target size.

- `390×844`: `scrollWidth = 390`, `scrollHeight = 844`; no document scrolling. Self seat `y=512.7..593.7`, hero stack `y=595..694`, hero cards `y=625..694`, action rail `y=740..844`; 1.3 px seat-to-stack gap and 46 px hand-to-action gap.
- `390×844` currency setup: default form measured `y=191.8..844`, with its create button fully visible at `y=768..822`; the expanded custom form measured `y=114.8..844`, also keeping the create button fully visible at `y=768..822`.
- `390×844` JPY table after refresh: no document scrolling; hero stack `y=595..620`, hero cards `y=625..694`, and controls `y=740..844`, leaving 46 px between the hand and controls.
- `768×1024`: `scrollWidth = 768`, `scrollHeight = 1024`; table bounds remain within the viewport.
- `1440×686`: `scrollWidth = 1440`, `scrollHeight = 686`; self seat `y=350.1..449.1`, hero stack `y=464..566`, hero cards `y=497..566`, action rail `y=578..686`; 14.9 px seat-to-stack gap and 12 px hand-to-action gap.
- `1440×900`: `scrollWidth = 1440`, `scrollHeight = 900`; self seat `y=567.3..666.3`, hero stack `y=678..780`, hero cards `y=711..780`, action rail `y=792..900`; 11.7 px seat-to-stack gap and 12 px hand-to-action gap.

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
- P2: the home screen mixed room creation into the bot path. Added a separate friend-room setup with exact 2/4/6 seats, currency-specific presets, custom buy-in/blinds, and an invitation state before entering the table.
- P1: the private-room endpoint accepted unsupported seats and weakly parsed monetary values. Restricted seats to 2/4/6, currencies to CNY/JPY, enforced integer/range/blind relationships, and persisted currency through an idempotent SQLite migration.
- P2: the first desktop hero stack overlapped the self avatar. Raised the self seat independently at desktop, short-landscape, mobile, and sizing breakpoints and measured positive separation.
- P2: the friend-room dialog declared modal semantics without keyboard focus management. Added initial focus, Tab/Shift+Tab trapping, Escape close, and launcher focus restoration.
- Product change: removed the human 30-second deadline, visible countdown, and timeout auto-check/fold while retaining bot thinking timing.
- Product change: added CNY (`¥`) and JPY (`JP¥`) virtual-chip modes; all live-table monetary labels now follow the room currency, with CNY fallback for legacy rooms and bot challenges.
- P1: live action confirmations and minimum-raise errors still exposed engine strings containing `$`. Socket events now carry structured action, target, minimum, and currency fields; React renders localized `¥` or `JP¥` messages.
- P1: the socket action boundary coerced floats, numeric strings, and booleans into integer bets. It now accepts only actual non-negative integers, with regression coverage proving invalid input cannot mutate chips, pot, or current bet.
- Deployment note: the requested Render Free demo has ephemeral storage. `/var/data` can reset on cold starts or redeploys; durable rooms and sessions require a paid persistent disk or external database.
- Recheck: all P1/P2 findings fixed; browser console clean; no overflow at target viewports.

final result: passed
