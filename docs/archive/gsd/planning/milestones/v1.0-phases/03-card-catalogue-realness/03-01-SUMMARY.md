---
phase: 03-card-catalogue-realness
plan: 01
subsystem: gameplay-hud
tags: [card-pick, one-button-input, upgrades, hud, weighted-draw, node-test]

requires:
  - phase: 01-render-shell-foundation
    provides: shell/sim split, injected-rng DI, single startRun lead-in path, bootShell data-URL test harness
  - phase: 02-ps1-presentation-scene
    provides: PS1 render pipeline (untouched), HUD DOM overlay styling context
provides:
  - "CARDS catalogue records with icon/role/color/rarity/cap + UPGRADES alias + RARITY_WEIGHT + pickOffers + isAvailable (js/upgrades.js)"
  - "leadIn()/resumeRun()/applyCard() + run.owned on createRun + cap-filtered offer hook in tickRun (js/game.js)"
  - "shell pick reducer: cycling cursor press / 0.8s hold-confirm / D-07 re-entry lock + multi-line offer prompt + owned icon strip (js/shell.js)"
  - "#hud-owned span, pre-line prompt CSS, .role-* color classes (index.html / css/style.css)"
  - "tests/pickflow.test.js — bootShell-copy integration proof of the whole pick flow"
affects: [03-02 offer-count escalation and catalogue expansion, 03-03 headless-sim, phase-4 audio-cues-on-pick]

actuals:
  tokens: 6733
  tasks: 2
  commits: 2
  plan_head_before: dec6c275f2ae59ce2c00639ce7cd5fe4285de127
  plan_head_after: 349986d1463fd2ab37320529c0a90b36901b69de

tech-stack:
  added: []
  patterns:
    - "inverse-CDF weighted draw with splice-removal (distinct without replacement, availability-filtered)"
    - "shell-side pick reducer with wall-clock fill cue driven every STEP regardless of status"
    - "single leadIn() helper shared by startRun and resumeRun (ARCH-02)"
    - "catalogue re-export through game.js so shell gains no new relative specifier (frozen bootShell harness constraint)"

key-files:
  created:
    - tests/pickflow.test.js
  modified:
    - js/upgrades.js
    - js/game.js
    - js/shell.js
    - index.html
    - css/style.css
    - tests/shell.test.js

key-decisions:
  - "pickOffers PROMOTED to canonical offer generator; pickTwo kept as a 2-line add-alongside shim (frozen tests/upgrades.test.js)"
  - "shell.js reads CARDS via a game.js re-export — the frozen bootShell harness rewrites only game/rope/player/render3d specifiers, so a direct './upgrades.js' import in shell.js would crash every existing shell test"
  - "reentryAt initializes to -LEAD_IN_MS (lock starts expired) — with 0 a cold-start press inside the first 450 ms of process life would be silently swallowed under node:test"
  - "confirm also clears holdFrom — covers the frozen-hold-through-freeze edge so a stale charge can never leak post-pick"
  - "reachability invariant split: real-shell leg on the length-2 offer (cycling+wrap) plus a pure-seam leg cycling a real pickOffers 3-draw — length-3 offers arrive with 03-02's offerCount escalation"

patterns-established:
  - "Pick gesture contract: press = cycle + (re)arm hold, hold ≥ 0.8 s = confirm-while-held, early release = cancel, confirm-release swallowed, running-input locked LEAD_IN_MS after re-entry"
  - "Offer-line prompt format: '> ' cursor + icon + name + ' ×owned/cap' (+ [#####] fill on the active line); role tint via className toggle"

requirements-completed: [CARD-01, CARD-02, CARD-04, CARD-05, CARD-06]

coverage:
  - id: D1
    description: "One-button pick flow: cycling cursor over freeze offers, 0.8s hold-confirm applies the card instantly, lead-in re-entry with input locked"
    requirement: CARD-01
    verification:
      - kind: integration
        ref: "tests/pickflow.test.js#hold confirms once while held; release and lock never charge a jump (D-03/D-05/D-07)"
        status: pass
      - kind: integration
        ref: "tests/pickflow.test.js#press cycles the cursor and wraps past the last offer (D-02)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Card identity on offers: icon + name per line, role-color className follows the highlighted card, cleared outside choose"
    requirement: CARD-02
    verification:
      - kind: integration
        ref: "tests/pickflow.test.js#choose renders one offer line per card: cursor, icon, name, cap readout"
        status: pass
    human_judgment: false
  - id: D3
    description: "Stack caps + availability: dead picks filtered, empty pool never freezes, '×owned/cap' readout on every offer line"
    requirement: CARD-04
    verification:
      - kind: unit
        ref: "tests/pickflow.test.js#exhausted pool skips the freeze; a one-card pool still offers one line"
        status: pass
    human_judgment: false
  - id: D4
    description: "Owned-card icon strip in #hud-owned reflects run.owned during the run"
    requirement: CARD-06
    verification:
      - kind: integration
        ref: "tests/pickflow.test.js#hold confirms once while held; release and lock never charge a jump (D-03/D-05/D-07)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Pick gesture reads as 'committing' without a tutorial at 240p-adjacent DOM prompt (perceptual criterion 1)"
    verification: []
    human_judgment: true
    rationale: "RESEARCH sampling-rate note: criterion 1 is perceptual — does the freeze→browse→hold→flash→lead-in rhythm feel deliberate? Only a browser UAT can sign off; scheduled end-of-phase per human_verify_mode."

duration: 12min
completed: 2026-10-17
status: complete
---

# Phase 3 Plan 01: Card Pick Flow Realness Summary

**One-button card pick end-to-end: rarity/cap-filtered `pickOffers` offers a cycling-cursor freeze the player browses with presses and commits with a dedicated 0.8 s hold; the card lands in `run.effects`/`run.owned` instantly and the run re-enters through the shared `leadIn()` with input locked — the `offer[0]` auto-apply debt is gone.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-10-17T06:41:18Z
- **Completed:** 2026-10-17T06:53:28Z
- **Tasks:** 2 (1 tracer + 1 auto; tracer feedback gate re-run green before expansion)
- **Files modified:** 7

## Accomplishments
- Catalogue metadata layer (icon/role/color/rarity/cap) on all four cards, `RARITY_WEIGHT` 70/25/5, `isAvailable`, and inverse-CDF `pickOffers` with splice-removal — `pickTwo` survives as a shim over it (frozen distinct-pair pin holds)
- `leadIn()`/`resumeRun()`/`applyCard()` in game.js; `run.owned` tracked per card; tickRun's cadence hook is cap-filtered and never freezes on an exhausted pool (Pitfall 6)
- Shell pick reducer replaces `run.offer[0]` (zero occurrences remain): press = cycle with wrap, hold ≥ 0.8 s = confirm-while-held, early release = cancel, confirm-release swallowed, D-07 lock for LEAD_IN_MS after re-entry
- Multi-line prompt (cursor glyph, icon, name, `×owned/cap` readout, fill cue on the active line, one uppercase confirm flash) + `#hud-owned` icon strip + `.role-*` tint classes
- `tests/pickflow.test.js`: 5 integration/probe tests via a bootShell-copy harness — scripted jumper reaches the freeze deterministically, cycles, hold-confirms, and proves the release never charges a jump; full suite 47/47, six frozen test files byte-identical

## Task Commits

1. **Task 1: Real one-button card pick, end-to-end (tracer)** — `d7c71d5` (feat)
2. **Task 2: Role color on the offer prompt + confirm-cue legibility** — `349986d` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `js/upgrades.js` - CARDS catalogue + metadata, UPGRADES alias, RARITY_WEIGHT, isAvailable, pickOffers, pickTwo shim
- `js/game.js` - leadIn/resumeRun/applyCard, run.owned, pickOffers-powered cadence hook, CARDS re-export for the shell HUD
- `js/shell.js` - pick reducer (cycle/hold-confirm/lock), multi-line prompt, fill cue, flash, icon strip, role-class toggle
- `index.html` - `#hud-owned` span in #hud
- `css/style.css` - pre-line prompt, owned-strip size, .role-sky/slate/amber/mint
- `tests/shell.test.js` - bootShell hud stub map += hud-owned (one line, assertions untouched)
- `tests/pickflow.test.js` - new: integration proof of the whole pick flow (5 tests)

## Decisions Made
- `pickOffers` promoted canonical; `pickTwo` add-alongside as a shim to keep the frozen distinct-pair test green (assumption-delta ruling in the plan).
- Shell reads the catalogue through a `game.js` re-export: the frozen bootShell harness only rewrites the game/rope/player/render3d specifiers, so any new relative specifier in shell.js would break every existing shell test (Pitfall 7's mechanism applied to imports).
- `reentryAt = -LEAD_IN_MS` init (lock starts expired) and `holdFrom = null` in the confirm block — see Deviations.
- Offer-line format `' ×N/C'` with `' ×N'` fallback for non-finite caps, exactly per plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `reentryAt` init 0 → -LEAD_IN_MS**
- **Found during:** Task 1 (pickflow harness development)
- **Issue:** with the planned `reentryAt = 0`, any press while `performance.now() < 450` (fresh Node test process) was silently swallowed by the D-07 lock — the scripted jumper never moved
- **Fix:** initialize the lock expired (`-LEAD_IN_MS`); behavior identical in a browser where uptime always exceeds the window
- **Files modified:** js/shell.js
- **Verification:** pickflow passes deterministically; browser behavior unchanged
- **Committed in:** d7c71d5 (task commit)

**2. [Rule 1 - Bug] stale `holdFrom` across a held-through freeze**
- **Found during:** Task 1 (reducer review)
- **Issue:** if the cadence freeze landed between press-consume and release, `holdFrom` survived into the post-pick run; a later release could charge a jump from a pre-pick timestamp
- **Fix:** confirm also clears `holdFrom`
- **Files modified:** js/shell.js
- **Verification:** vy monotonicity + ≤400-ceiling assertions in the hold-confirm test
- **Committed in:** d7c71d5 (task commit)

**3. [Rule 3 - Blocking] CARDS routed to the shell via game.js re-export**
- **Found during:** Task 1 (icon-strip wiring)
- **Issue:** `import { CARDS } from './upgrades.js'` in shell.js is unresolvable inside bootShell's data-URL module (frozen harness rewrites only 4 specifiers) — every existing shell test would crash
- **Fix:** `export { CARDS } from './upgrades.js';` in js/game.js (already in the harness's rewrite + boundary graph)
- **Files modified:** js/game.js, js/shell.js
- **Verification:** full suite green including all bootShell tests
- **Committed in:** d7c71d5 (task commit)

### Interpretations

**4. Reachability invariant legs** — the length-3 half of the invariant runs at the pure seam (real `pickOffers` 3-draw + real `applyCard` per index) because count is fixed at 2 in the shell until 03-02's `offerCount`; the length-2 leg cycles the real shell cursor. Both legs assert every index visited + confirmable. (pickflow tests 2 and 4.)

---

**Total deviations:** 3 auto-fixed (2 bug, 1 blocking) + 1 interpretation
**Impact on plan:** All auto-fixes required for the tracer to prove out on real modules; no scope creep. Count stays 2 per plan (03-02 escalates).

## Issues Encountered
- Test harness lesson: the shell accumulates `(now - last)`, so integration tests must keep ONE continuous frame clock across the drive-to-choose phase (a restarted `performance.now()` clock runs the accumulator negative and the STEP loop silently stops). Harness returns its clock state for this reason.

## Known Stubs
None — every surface is wired: offers from the real catalogue, effects applied through the real `apply` closures, HUD from live `run.owned`.

## Next Phase Readiness
- 03-02 can extend: catalogue records (add feather/tally/windup/widebrim + `.role-ember`), `offerCount(skips)` escalation plugs straight into `tickRun`'s hook and the shell's modulo cycling (no other change needed); the length-3 invariant leg in pickflow will then run against the real shell path too
- 03-03's headless-sim can reuse `resumeRun`/`applyCard` directly (pure)
- No blockers; frozen contracts verified byte-identical; `.role-ember` intentionally absent until 03-02 adds ember-colored cards

---
*Phase: 03-card-catalogue-realness*
*Completed: 2026-10-17*

## Self-Check: PASSED
- All 8 claimed files present on disk.
- Task commits `d7c71d5`, `349986d` are ancestors of HEAD.
- Debt grep: 0 occurrences of `run.offer[0]` in js/shell.js.
- `id="hud-owned"` in index.html; `'hud-owned'` stub key in tests/shell.test.js.
