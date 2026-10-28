---
phase: 05-accessibility-polish
plan: 03
subsystem: ui
tags: [resize, letterbox, aspect-clamp, contain-fit, canvas-style, shell, css, ui-03]

requires:
  - phase: 02-ps1-presentation-scene
    provides: the passive canvas.width/height poll in render3d (RT, snap grid, camera aspect) that the band math feeds — zero geometry changes there
  - phase: 05-accessibility-polish (plan 01)
    provides: the tests/polish.test.js bootShell-copy harness (canvas.style stub already present) this plan's UI-03 legs extend
  - phase: 05-accessibility-polish (plan 02)
    provides: the resize-proof snapGridFor helper — a letterbox resize re-derives the dampened grid, no wobble re-application

provides:
  - applyWindowSize() in js/shell.js — one contain-fit clamp-band computation [3:4, 2:1] writing BOTH canvas.style.width/height and canvas.width/height, driving boot sizing and the existing resize listener (no orientationchange listener, D-10)
  - css/style.css black page background as the letterbox bar color (D-07); the full-viewport canvas stretch removed so the shell's style writes own the box (Pitfall 9)
  - canvas style: {} on every one of the five data-URL boot harnesses (shell/audio/pickflow/juice/feelcap + already-present polish) — the authoritative five-copy sweep
  - four UI-03 legs in tests/polish.test.js: extreme-aspect band clamps, 480×640 passthrough identity, and the 0/undefined/1×1 finite-dims coercion guard

affects: [resize-letterbox, input-hardening, reduced-motion]

actuals:
  tokens: 4100
  tasks: 3
  commits: 2
  plan_head_before: 0d5811e267e21e43b78612ddcc1d8efd8c353a0e
  plan_head_after: 8375c79

tech-stack:
  added: []
  patterns:
    - "contain-fit band math: aspect = clamp(w/h, MIN, MAX); dw = round(min(w, h*aspect)); dh = round(min(h, w/aspect)) — CSS box and buffer written together, always (Pitfall 9)"
    - "windowSize() Number(x) || 480/640 coercion is the sole NaN/0 input gate feeding the band math; Math.max(2, …) floor guards a physically tiny window (T-05-05)"
    - "any canvas.style write in the boot path requires the style: {} stub in ALL FIVE data-URL harnesses in the same change (Pitfall 5 five-copy correction)"

key-files:
  created:
    - .planning/tdd-red-evidence-05-03.json
  modified:
    - js/shell.js
    - css/style.css
    - tests/polish.test.js
    - tests/shell.test.js
    - tests/audio.test.js
    - tests/pickflow.test.js
    - tests/juice.test.js
    - tests/feelcap.test.js

key-decisions:
  - "Clamp band pinned exactly [3/4, 2] (RESEARCH A5): the 480×640 harness fallback sits on the 3:4 edge, so MIN must not exceed 0.75 — pinned by the passthrough and floor legs"
  - "Letterbox is DOM-only: zero changes to js/render3d.js — its passive poll consumes the clamped canvas.width/height as-is (git diff --quiet rc 0)"
  - "No orientationchange listener and no new static ./ import in shell.js (D-10, Pitfall 7)"

patterns-established:
  - "boot-time canvas.style writes: applyWindowSize() runs at boot AND from the resize listener — one function, both paths (D-10 re-derives on the next frame via the passive poll)"

requirements-completed: [UI-03]

coverage:
  - id: D1
    description: "Extreme aspects (2000×400, 300×900) land inside the clamp band [0.75, 2] (800×400 / 300×400 contain-fit) with canvas.style writes matching the buffer"
    requirement: UI-03
    verification:
      - kind: integration
        ref: "tests/polish.test.js#resize to 2000×400 clamps to the 2:1 band edge: 800×400 box, style writes match (D-07)"
        status: pass
      - kind: integration
        ref: "tests/polish.test.js#resize to 300×900 holds the 3:4 floor: 300×400 box, style writes match the buffer (D-07)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A normal 480×640 window computes dw/dh = innerWidth/innerHeight — buffer byte-identical to the old passthrough, style writes exact (CONTEXT specifics §3)"
    requirement: UI-03
    verification:
      - kind: integration
        ref: "tests/polish.test.js#a normal 480×640 window is the exact passthrough — no band, no margins (CONTEXT specifics §3)"
        status: pass
      - kind: integration
        ref: "node --test tests/ (113 pre-existing legs green on the new boot path)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Garbage window metrics (innerWidth 0/undefined, 1×1) never produce NaN or <2 buffer dimensions — coercion + Math.max(2, …) floor (T-05-05)"
    requirement: UI-03
    verification:
      - kind: integration
        ref: "tests/polish.test.js#garbage window metrics (0 / undefined / 1×1) coerce — buffer dims stay finite and ≥ 2 (T-05-05)"
        status: pass
    human_judgment: false
  - id: D4
    description: "All five data-URL boot harnesses boot green with the boot-time canvas.style write (five-copy style: {} sweep) and js/render3d.js stays byte-identical"
    requirement: UI-03
    verification:
      - kind: unit
        ref: "node --test tests/ → 117 pass / 0 fail; grep -c 'style: {}' ≥1 ×5; git diff --quiet HEAD -- js/render3d.js rc 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "Real browser drag to ~1000×300 shows vertical black bars and an undistorted frame (Pitfall 9 check); normal windows pixel-identical to pre-phase"
    requirement: UI-03
    verification: []
    human_judgment: true
    rationale: "Manual UAT leg from the plan's verification block (end-of-phase per human_verify_mode) — no Node harness can observe the rendered letterbox or the actual upscale sampling"

duration: 6min
completed: 2026-10-22
status: complete
---

# Phase 5 Plan 3: Resize & Letterbox Legibility Summary

**One `applyWindowSize()` contain-fit computation in the shell — clamp band [3:4, 2:1], writing the CSS box and the backing buffer together at boot and from the existing resize listener — with a black page background as the letterbox, `js/render3d.js` untouched, and normal windows pixel-identical to the old passthrough.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-10-22T18:05:46Z
- **Completed:** 2026-10-22T18:11:39Z
- **Tasks:** 3
- **Files modified:** 8 (+1 RED-evidence artifact)

## Accomplishments

- **Task 1 (GREEN, with Task 2):** `ASPECT_MIN = 3 / 4` / `ASPECT_MAX = 2 / 1` module constants + `applyWindowSize()` inside `startGame` — RESEARCH Pattern 3 arithmetic inline behind the `windowSize()` coercion, `canvas.style.width/height` and `[canvas.width, canvas.height]` written together with the `Math.max(2, …)` floor. Replaced BOTH the boot sizing line and the resize-handler body; one listener, no `orientationchange`, no new static `./` import. `css/style.css`: `html, body` background → `#000`, full-viewport canvas stretch removed, `image-rendering: pixelated` kept, `#hud` untouched (D-09). `js/render3d.js` byte-identical.
- **Task 2 (same commit):** `style: {}` added to the four boot-harness canvas stubs that lacked it (shell/audio Part B/pickflow/juice/feelcap; polish already had it from 05-01) — the boot-time style write and the harness sweep landed in the one change, exactly as must_haves' Pitfall 5 five-copy truth demands. Full boot fleet green.
- **Task 3 (RED first):** settable `innerWidth`/`innerHeight` on the polish harness window stub (defaults mirror the 480×640 fallback, so the existing 9 legs boot passthrough unchanged) + 4 UI-03 legs: 2000×400 → 800×400 band clamp with style writes, 300×900 → 300×400 floor hold, 480×640 exact passthrough, and the 0/undefined/1×1 finite-dims guard (T-05-05). RED classified `RED_EVIDENCE_OK` (exactly the 4 target legs failing on the planned assertions against the unmodified shell).

## Task Commits

Each task's content was committed atomically (TDD order — see Deviations):

1. **Task 3: UI-03 resize legs (RED)** — `6932590` (test; classifier `RED_EVIDENCE_OK`, `.planning/tdd-red-evidence-05-03.json`)
2. **Task 1 + Task 2: band math + CSS + harness sweep (GREEN)** — `8375c79` (feat)

**Plan metadata:** committed with this SUMMARY (docs commit)

## Files Created/Modified

- `js/shell.js` — `ASPECT_MIN`/`ASPECT_MAX` module constants; `applyWindowSize()` (contain-fit band math) at boot + in the `resize` listener; the old inline `windowSize()` writes at both sites are gone
- `css/style.css` — `html, body { background: #000 }` (letterbox bars); canvas box now sized by the shell's style writes (vw/vh stretch deleted), pixelated kept
- `tests/polish.test.js` — harness: settable `innerWidth`/`innerHeight` + exposed `canvas`/`window`; +4 UI-03 legs (9 → 13)
- `tests/shell.test.js`, `tests/audio.test.js`, `tests/pickflow.test.js`, `tests/juice.test.js`, `tests/feelcap.test.js` — canvas stub `style: {}` (one line each)
- `.planning/tdd-red-evidence-05-03.json` — RED evidence artifact

## Decisions Made

- **Band pinned exactly [3/4, 2]** (the plan's flagged assumption, RESEARCH A5): CONTEXT says "roughly"; the 480×640 harness fallback sits on the 3:4 edge so MIN must not exceed 0.75 — both edges now pinned by assertions, and the passthrough leg proves in-band windows see no band at all.
- **Letterbox stays DOM-only:** the shell writes the clamped box; `render3d`'s passive poll re-derives RT/snap/camera from `canvas.width/height` as-is — its diff is empty by the task's own gate.
- **`canvas.style.width = dw + 'px'` before the buffer write**, buffer floored with `Math.max(2, …)` post-coercion — `Math.min/max` never sees NaN (T-05-05 mitigation as written in the threat register).

## Deviations from Plan

### Ordering / commit-granularity notes

**1. [Ordering — TDD contract] Task 3's UI-03 legs were committed RED before Task 1's implementation**
- **Found during:** Tasks 1–3
- **Issue:** the plan orders implementation (Task 1) before tests (Task 3), but this dispatch's MVP-TDD contract requires a RED commit containing the failing test before any behavior-adding implementation step.
- **Fix:** Task 3's content was written, verified red with classifier `RED_EVIDENCE_OK` (`6932590` — exactly the 4 target legs failing on the planned band/floor/passthrough/floor-guard assertions), and only then Task 1's implementation landed (`8375c79`). Task content is exactly as specified; only the commit order swapped (same resolution as 05-02 deviation 1).
- **Verification:** RED TAP report: 13 tests, 9 pass / 4 fail, all four failures are `AssertionError` on the planned assertions.

**2. [Plan must_haves — same-change coupling] Task 2's harness sweep landed inside the Task 1 GREEN commit**
- **Found during:** Task 2
- **Issue:** must_haves requires "every canvas stub gained style: {} in the same change" as the boot style write — a standalone Task 2 commit is inert and a standalone Task 1 commit would leave the boot harnesses crashing at that commit (bisect-hostile).
- **Fix:** one `feat(05-03)` commit carries shell + CSS + the four stub lines; Task 2's `fail 0` verify was run on the combined commit, which is where its done-criterion ("boot green with the boot-time canvas.style write") is actually observable. 3 tasks → 2 production commits.

---

**Total deviations:** 2 (1 TDD-mandated task-order swap, 1 plan-mandated commit merge) — no code-level deviations.
**Impact on plan:** No scope change; every task's stated content shipped verbatim. The swap strengthens the TDD audit trail (one clean `test → feat` pair).

**Operational note (not a deviation):** the plan's `awk '/ pass /{p=$3} …'` acceptance commands were run with `\$3` escaped so the outer shell does not eat the field reference; semantics unchanged (same note as 05-01/05-02).

## Verification Summary

| Gate | Result |
|------|--------|
| ASPECT_MIN/ASPECT_MAX present; boot + resize both call applyWindowSize | pass (`js/shell.js:32-33,50,196`) |
| No new static `from './` specifier added to shell.js | pass (diff grep empty) |
| css canvas rule vw/vh-free; html/body `#000` | pass (grep clean) |
| `git diff --quiet HEAD -- js/render3d.js` rc 0 | pass — letterbox is DOM-only |
| `grep -c "style: {}"` ≥ 1 ×5 harness files | 1 each (×6 incl. polish) |
| polish.test.js ≥ 13 pass | 13 pass / 0 fail |
| Full suite ≥ 108, fail 0 | **117 pass / 0 fail** (113 baseline + 4 legs) |
| ARCH-01 / BROWSER_IO_RE boundary legs | green inside the suite |
| TDD gate: `test(05-03)` RED before `feat(05-03)` | satisfied (`6932590` → `8375c79`) |
| RED evidence classifier | `RED_EVIDENCE_OK` (`.planning/tdd-red-evidence-05-03.json`) |

## Known Stubs

None — no placeholder values or unwired paths introduced; every band/letterbox site is wired and pinned by passing tests.

## Threat Surface

No new surface beyond the plan's `<threat_model>`: T-05-05 mitigated (coercion + finite-dims leg), T-05-06 accepted as amortized (passive poll unchanged), T-05-SC clean (zero packages; importmap untouched). No threat flags.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- 05-04 (input-loss hardening) builds on the same polish.test.js harness; this plan left it with settable window metrics, `canvas.style`, `document.hidden` and the mq emit hook — no seams of its own beyond the resize listener.
- UI-03 is declared only by this plan → marked complete (no shared-ID wait).
- End-of-phase UAT item (coverage D5): drag the window to ~1000×300 → vertical black bars, undistorted frame; normal-size window → pixel-identical to pre-phase.

## Self-Check: PASSED

- Files on disk: `js/shell.js`, `css/style.css`, `tests/polish.test.js`, all four swept harnesses, evidence JSON — all FOUND
- Commits ancestors of HEAD: `6932590`, `8375c79` — both FOUND
- Measured commit count from ledger `0d5811e..HEAD`: 2

---
*Phase: 05-accessibility-polish*
*Completed: 2026-10-22*
