---
last_mapped_commit: 838983f2419d6a82c5167acf9b351994fe9cfa7a
last_mapped_at: 2026-10-15
---
# Codebase Concerns

**Analysis Date:** 2026-10-15

## Tech Debt

**Fake two-choice upgrade system:**
- Issue: `pickTwo()` draws two upgrades and the run state stores both (`run.offer`), but only `offer[0]` is ever rendered or applied. The player has no actual choice — the "choose" mechanic advertised by the design spec is unimplemented.
- Files: `js/upgrades.js:16` (pickTwo), `js/game.js:86` (always applies `offer[0]`), `js/game.js:207` (only renders `offer[0]`)
- Impact: Core roguelike decision-making is missing; the second offered upgrade is dead data in state and tests (`tests/game.test.js:46` only asserts `offer.length === 2`).
- Fix approach: Add a selection affordance (tap left/right half, or 1/2 keys) in `release()`/input handling, and render both offers in `draw()`.

**Nondeterministic core loop (`Math.random` in `tickRun`):**
- Issue: The pure-logic pass calls `pickTwo(UPGRADES, Math.random)` directly, so the core tick cannot be tested deterministically at that seam. `pickTwo` itself takes an injectable `rng` — the seam exists but isn't used from `tickRun`.
- Files: `js/game.js:23`
- Impact: Tests must avoid the upgrade-offer path with seeded randomness; replay/debug reproducibility is impossible.
- Fix approach: Thread an `rng` parameter (defaulting to `Math.random`) through `tickRun`/`createRun`, or pass it via the run object.

**Duplicated, drifting rope-reset literals:**
- Issue: The rope is reset as `{ phase: 0.33, period: 1.3 }` inline in two input handlers, while initial construction uses `createRope(1.3)`. The `0.33` phase and `1.3` period are unexplained magic numbers duplicated across the file (git history shows repeated "tune: slower cycle" commits touching these values).
- Files: `js/game.js:62`, `js/game.js:74`, `js/game.js:90`
- Impact: A tuning change to period must be made in 3 places; easy to reset with a stale value.
- Fix approach: Single `initialRope()` factory (or constants) used by all three sites; same for the magic `jump(player, 0.1)` first-jump hold (`js/game.js:75`, `js/game.js:91`).

**No npm scripts / tooling wiring:**
- Issue: `package.json` contains only `name`, `private`, `type` — no `test` script, no lint/format config, no CI. Tests run only via manual `node --test tests/`.
- Files: `package.json`
- Impact: Nothing enforces that the 26 passing tests keep passing; no static guardrails on conventions.
- Fix approach: Add `"test": "node --test tests/"` and a minimal CI workflow running it.

## Known Bugs

**Stuck hold on missed pointerup:**
- Symptoms: If the player presses on the canvas and releases the pointer outside the window/canvas, `holdFrom` stays set; the next `pointerup` on the canvas fires a jump with a stale (capped-at-0.5s, so max) hold velocity, and the intermediate tap does nothing visible.
- Files: `js/game.js:70-84`, `js/game.js:96-97` (only `pointerdown`/`pointerup` on canvas; no `pointercancel`, `pointerleave`, or `window.blur` handling)
- Trigger: Press on canvas, drag off canvas/window, release, then tap normally.
- Workaround: None in code; alt-tabbing back doesn't clear it either.

**Fragile wrap in `updateRope` for large steps:**
- Symptoms: If `dt/period >= 1` (huge frame hitch combined with a future fast period, or a large `ropeMul`-scaled step), `phase` wraps to a negative or >1 value instead of modulo; `atFeet` may never fire or fire wrongly.
- Files: `js/rope.js:5-9`
- Trigger: Not reachable with current constants (STEP=1/120, period ≥1.3, ropeMul ≤1), but the game-loop clamps `acc` at 0.25s (`js/game.js:227`) and still steps at most 30 times, so any future period reduction below ~0.06s exposes it.
- Workaround: None needed today; use `((phase % 1) + 1) % 1` when making periods tunable.

## Security Considerations

**Client-authoritative high score (localStorage):**
- Risk: `jumprope-best` is trivially editable in DevTools; if a leaderboard/leader-share feature is added, scores are spoofable.
- Files: `js/game.js:37-51`
- Current mitigation: Score is display-only, single-player — no server surface at all.
- Recommendations: Fine as-is. If any persistence beyond the local device is added, validate server-side.

**No XSS/secret surface:** Everything drawn is generated from in-code strings (`run.offer[0].name`); no user input, no network, no secrets. `index.html` loads no third-party scripts. No action needed.

## Performance Bottlenecks

**Per-tick object allocation at 120 Hz:**
- Problem: `tickRun` allocates a new rope, player, and run object (plus spread copies) 120×/second via `updateRope`/`updatePlayer`/`{ ...run }`.
- Files: `js/game.js:9-31`, `js/rope.js:5`, `js/player.js:13`
- Cause: Immutable-return style (a deliberate, test-friendly convention).
- Improvement path: Not worth changing at this scale (~360 small objects/sec is trivial for GC). Revisit only if entity counts grow.

**Full-canvas redraw every rAF frame:**
- Problem: `draw()` issues ~20 path/fill operations and `fillText` per frame with no dirty-checking; fine at 480×640.
- Files: `js/game.js:113-222`
- Cause: Immediate-mode canvas rendering.
- Improvement path: Cache static background/tiles if canvas size or entity count grows; no cache/DPR scaling exists today (canvas is fixed 480×640, CSS-scaled via `css/style.css:3-9` — will look soft on HiDPI beyond `image-rendering: pixelated` styling).

## Fragile Areas

**Input/state machine in `startGame`:**
- Files: `js/game.js:57-111`, `js/game.js:238-240`
- Why fragile: The 5-state machine (`idle/running/choose/over` + implicit `holdFrom`) is spread across `press`, `release`, `step`, and `frame` closures with no tests — all input handling is untested because `startGame` requires a live DOM/canvas and auto-runs at module load (`if (typeof document !== 'undefined')`). Behavior fixes here (key-repeat, pause-during-choose, persist-on-trip) have each needed dedicated fix commits (`036ca1a`).
- Safe modification: Extract the input handlers into a testable reducer (`handleEvent(state, event)`) before adding new controls; keep `startGame` as thin wiring.
- Test coverage: Zero for `press`/`release`/`startGame`; core logic (`tickRun`, physics, upgrades) is well covered.

**Rope/player collision timing coupling:**
- Files: `js/rope.js:11-13` (`atFeet` window 0.45–0.55), `js/game.js:17` (`minHeight = 18 / windowMul`), `js/player.js:37-39`
- Why fragile: Scoring depends on crossing the `atFeet` edge exactly once per cycle (edge-detect `!wasFeet && isFeet`). Changing `period`, `STEP`, or the atFeet window can cause missed or double detections since detection is sample-based, not analytic.
- Safe modification: When tuning any of these constants, run the full test suite and add a multi-cycle simulation test asserting exactly one score event per cycle.

## Scaling Limits

**Game modes / content:**
- Current capacity: 4 hard-coded upgrades, one fixed rope cadence, canvas fixed at 480×640 (`js/game.js:53-54`).
- Limit: `pickTwo` assumes `upgrades.length >= 2`; adding level-scaled difficulty has no data structure (no level/wave concept anywhere).
- Scaling path: Move constants (`W`, `H`, `STEP`, gravity, atFeet window, offer cadence in `shouldOfferUpgrade`) into a single config object.

## Dependencies at Risk

**None material.** Zero runtime dependencies; tests use only `node:test` + `node:assert`. The only "dependency" is the browser canvas/pointer/`localStorage` API surface. No lockfile needed (nothing to lock).

## Missing Critical Features

**Upgrade selection UI (paired with the tech-debt item above):**
- Problem: Players cannot choose between the two offered upgrades; the game silently takes option 0.
- Blocks: The roguelike "build crafting" loop that is the stated design goal (`docs/superpowers/specs/2026-09-30-jumprope-roguelike-design.md`).

**Serve/dev tooling:**
- Problem: No documented way to run locally (ES modules require an HTTP origin; opening `index.html` via `file://` fails module CORS).
- Blocks: Onboarding and any browser-based manual testing workflow.

## Test Coverage Gaps

**Input handling & state transitions (`startGame` closures):**
- What's not tested: `press`/`release` behavior for all status × event combinations, hold-timing via `performance.now`, restart flow, best-score persistence on trip (only the `loadBest`/`saveBest` helpers are tested).
- Files: `js/game.js:57-111`
- Risk: Regressions in the state machine — historically the most-fixed area — ship silently.
- Priority: High

**Multi-cycle simulation:**
- What's not tested: Long-run `tickRun` loops (one score per cycle, no double-count at `atFeet` edges, `floatMul`/`ropeMul` interaction over time).
- Files: `js/game.js:9-31`, `js/rope.js:5-13`
- Risk: Tuning commits silently break scoring cadence.
- Priority: Medium

**`obstacleX`/render alignment invariant:**
- What's not tested: That the drawn obstacle (`js/game.js:187`) is actually at the player when `atFeet` is true (single-point tests exist in `tests/rope.test.js:25-29`, but nothing asserts the render hitbox matches the 0.45–0.55 logic window).
- Files: `js/rope.js:15-17`, `js/game.js:187-189`
- Risk: Visual/logic desync — the box looks like it missed the player.
- Priority: Low

---

*Concerns audit: 2026-10-15*
