---
phase: 05-accessibility-polish
plan: 02
subsystem: ui
tags: [reduced-motion, matchMedia, prefers-reduced-motion, uniforms, snap-grid, shake, particles, render3d, shell, ui-02]

requires:
  - phase: 05-accessibility-polish (plan 01)
    provides: tests/polish.test.js bootShell-copy harness (mq stub slot, canvas.style, document.hidden) this plan's live-switch legs extend
  - phase: 02-ps1-presentation-scene
    provides: the uSnapGrid vertex-snap uniform pair (SNAP_S = 2) and the deferred reduced-motion wiring (02-CONTEXT D-03)
  - phase: 04-feel-audio
    provides: the juice signal + uShake post-pass uniform (D-N06) and the particle pool (D-N12) this plan gates

provides:
  - live-switching prefers-reduced-motion read (typeof-guarded matchMedia + change event) threaded as one boolean through the one-way view payload
  - SNAP_OFF = 0.25 + snapGridFor() shared by BOTH uSnapGrid write sites — a resize can never re-apply the wobble (Pitfall 12 regression-locked)
  - reducedMotion branches in render3d: shake amplitude zeroed at the single juiceShake write, particle flight pinned (spawn/fade/lifetime stay), trip-settle holds exactly -PI, idle bob/twirl at rest
  - tests/render3d.test.js THREE_STUB extended: Node.add records children + Scene self-registers, so uniforms and the particle pool are reachable for dampen assertions

affects: [accessibility-polish, reduced-motion, resize-letterbox, input-hardening]

actuals:
  tokens: 3226
  tasks: 3
  commits: 4
  plan_head_before: e0588f43dc6425ab9d0bd38c270c02ade4506230
  plan_head_after: 59eb1c4

tech-stack:
  added: []
  patterns:
    - "browser prefs arrive ONLY as one-way view payload fields consumed like view.now — render3d gains no window/matchMedia reference (BROWSER_IO_RE stays green)"
    - "one shared snapGridFor(reduced) helper for every write of a size-derived uniform, so resize and flag-change paths cannot disagree (Pitfall 12)"
    - "uniform-level dampen assertions via the child-recording THREE_STUB (Group.add records, ShaderMaterial retains uniforms)"

key-files:
  created:
    - .planning/tdd-red-evidence-05-02-t1.json
    - .planning/tdd-red-evidence-05-02-t2.json
  modified:
    - js/shell.js
    - js/render3d.js
    - tests/polish.test.js
    - tests/render3d.test.js

key-decisions:
  - "SNAP_OFF = 0.25 sub-pixel snap grid for wobble-off (RESEARCH A3) — never Infinity/0 (GLSL floor NaN)"
  - "Cosmetics pinned per resolved Open Q3: trip-settle holds exactly -Math.PI, idle bob 0 / twirl frozen; hitstop stays (stillness, not motion)"
  - "Phase-3's deferred HUD flash dampening CLOSED as no-op — D-05 protects the HUD channel (RESEARCH A6)"
  - "Particle dampening pins only the per-frame position writes; spawn, the opacity ramp and the 0.45 s lifetime stay live (D-05 static/fade-only)"

patterns-established:
  - "matchMedia read behind the typeof guard mirrors the AudioContext guard; change-event only, addListener banned"
  - "the reduced flag is stored on first read in render() BEFORE the passive size poll, so a same-frame resize re-derives through snapGridFor with the fresh value"

requirements-completed: [UI-02]

coverage:
  - id: D1
    description: "Boot read + live mid-session OS toggle flips the view payload's reducedMotion both ways on the very next frame, with no pause/restart and no persistence (D-06)"
    requirement: UI-02
    verification:
      - kind: integration
        ref: "tests/polish.test.js#the boot view payload carries reducedMotion false and a change subscription exists (D-06)"
        status: pass
      - kind: integration
        ref: "tests/polish.test.js#a live matchMedia change flips the view payload both ways, next frame, no restart (D-06)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Under reduced motion the vertex-snap wobble drops to the 0.25 px sub-pixel grid and HOLDS across a canvas resize (Pitfall 12)"
    requirement: UI-02
    verification:
      - kind: unit
        ref: "tests/render3d.test.js#reduced motion holds the sub-pixel snap grid even across a canvas resize (Pitfall 12)"
        status: pass
    human_judgment: true
    rationale: "The uniform values are pinned; whether a 0.25 px snap reads as visually wobble-free is RESEARCH A3 — the end-of-phase devtools-emulation UAT leg signs that off"
  - id: D3
    description: "The post-pass shake uniform stays the still vector after a shake > 0 juice signal under reduced motion; the identical signal without it jitters (gate proof) (D-05)"
    requirement: UI-02
    verification:
      - kind: unit
        ref: "tests/render3d.test.js#reduced motion pins uShake at zero; the same signal without it jitters the UV offset (D-05)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Particles still spawn and fade under reduced motion while their flight positions stay pinned at the spawn point; the 0.45 s lifetime retires the burst as today (D-05 static/fade-only)"
    requirement: UI-02
    verification:
      - kind: unit
        ref: "tests/render3d.test.js#reduced motion pins particle flight while spawn, opacity fade and lifetime stay live (D-05)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Cosmetic still endpoints (trip settle exactly -PI, idle bob 0 / twirl frozen) with the running pose, rope pivot, arms/legs, blob shadow and HUD channels byte-identical and hitstop kept (D-05, Open Q3 resolution)"
    requirement: UI-02
    verification:
      - kind: other
        ref: "grep -n reducedMotion js/render3d.js → zero hits in the running-pose/blob-shadow region; cosmetics pinned by D-05 code comments"
        status: pass
    human_judgment: true
    rationale: "Untouched protected channels are grep-pinned, but 'judgment-relevant motion unchanged' and the still-endpoint looks are the end-of-phase devtools UAT leg"
  - id: D6
    description: "Real OS / devtools prefers-reduced-motion toggle visibly kills wobble and shake live while rope/character judgment stays identical"
    requirement: UI-02
    verification: []
    human_judgment: true
    rationale: "No Node harness can observe the rendered frame or a real media-query toggle — manual UAT leg from the plan's verification block (end-of-phase per human_verify_mode)"

duration: 11min
completed: 2026-10-22
status: complete
---

# Phase 5 Plan 2: Reduced Motion End-to-End Summary

**`prefers-reduced-motion` wired end-to-end: a typeof-guarded live matchMedia subscription flips one boolean through the one-way view payload, and render3d dampens exactly the PS1 motion layer — sub-pixel snap grid (resize-proof via one shared `snapGridFor`), zeroed shake uniform, pinned particle flight, cosmetic still endpoints — while rope, character rig, blob shadow, HUD and hitstop stay byte-identical.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-10-22T17:47:05Z
- **Completed:** 2026-10-22T17:59:30Z
- **Tasks:** 3
- **Files modified:** 4 (+2 RED-evidence artifacts)

## Accomplishments

- **Task 1 (TDD):** shell reads `(prefers-reduced-motion: reduce)` at boot behind the mandatory `typeof window.matchMedia === 'function'` guard and subscribes `addEventListener('change')`, threading `reducedMotion` into the existing `scene.render` payload. Two polish.test.js legs pin boot-false + both-direction live flips on the next pumped frame with no pause/suspend side effects. All five pre-existing boot harnesses stay green untouched — the guard short-circuits.
- **Task 2:** render3d dampens the four motion sites through one stored flag: `SNAP_OFF = 0.25` + `snapGridFor(reduced)` shared by the uSnapGrid init **and** `applyBufferSize` (Pitfall 12), `juiceShake = reduced ? 0 : …` at its single write site, particle position block wrapped in `if (!reduced)` (spawn/opacity/lifetime kept), trip-settle → exactly `-Math.PI`, idle bob/twirl → still endpoints. The running-pose branch and blob shadow gained zero reduced-motion code (D-05).
- **Task 3:** THREE_STUB `Node.add` records children and `Scene` self-registers, making `postScene.children[0].material.uniforms.uShake`, the probed `uSnapGrid` (via a material's `onBeforeCompile` probe shader) and the 16-quad particle pool observable. Three dampen legs pass, including the resize-under-dampening regression lock. Full suite **113 pass / 0 fail** (baseline 108).

## Task Commits

Each task was committed atomically (TDD pairs):

1. **Task 1 RED:** failing D-06 view-payload legs — `bd079f1` (test; classifier `RED_EVIDENCE_OK`)
2. **Task 1 GREEN:** shell matchMedia read + subscription + payload flag — `d6c4d62` (feat)
3. **Task 3 RED:** failing render3d dampen legs + child-recording stub — `e474207` (test; classifier `RED_EVIDENCE_OK`)
4. **Task 2 GREEN:** render3d dampening implementation — `59eb1c4` (feat)

**Plan metadata:** committed with this SUMMARY (docs commit)

## Files Created/Modified

- `js/shell.js` — `motionQ` typeof-guarded matchMedia handle, `reducedMotion` closure flag + change-event subscription, payload key in the `scene.render` call
- `js/render3d.js` — `SNAP_OFF`, `snapGridFor()`, stored `reducedMotion` flag consumed before the size poll, shake gate, particle `if (!reduced)` position wrap, trip/idle cosmetic still endpoints
- `tests/polish.test.js` — mq stub with test-visible emit hook in the harness window stub; 2 UI-02 legs (7 → 9 legs)
- `tests/render3d.test.js` — THREE_STUB child recording + Scene registry, `bootDampenScene`/`snapGridUniform` helpers, 3 dampen legs (3 → 6 legs)

## Decisions Made

- **Flag stored in `render()` before the passive size poll** — a resize landing in the same frame as a preference flip re-derives the grid through `snapGridFor` with the fresh value; the flag-change branch writes the uniform that very frame (D-06 "next frame" contract both directions).
- **`0.25` sub-pixel snap instead of disabling the snap injection** — keeps the shader path identical (no recompile, no cache-key fork), and `grid ≈ 2×internal px` stays safely inside float32 exact-integer range (RESEARCH A3).
- **Cosmetics dampen to still endpoints, hitstop stays** — the pinned resolution of RESEARCH Open Q3/A4, each site carrying a D-05/Open-Q3 comment reference; the Phase-3 deferred HUD flash dampening is closed as a no-op because D-05 protects the HUD channel (A6).

## Deviations from Plan

### Ordering / test-refinement notes

**1. [Ordering — TDD contract] Task 3's render3d dampen tests ran RED before Task 2's implementation**
- **Found during:** Tasks 2–3
- **Issue:** the plan orders implementation (Task 2) before observability (Task 3), but this dispatch's MVP-TDD contract requires a RED commit containing the failing test before any behavior-adding implementation step.
- **Fix:** Task 3's test content (stub extension + 3 dampen legs) was written, verified red with classifier `RED_EVIDENCE_OK` (`e474207`), and only then Task 2's render3d implementation landed (`59eb1c4`). Task content is exactly as specified; only the two tasks' commit order swapped.
- **Verification:** RED report shows exactly the 3 target uniform assertions failing (uShake -0.0043 vs 0, snap 45 vs 360, particle x 0.32 vs 0) against the unmodified renderer.

**2. [Rule 1 - Test bug] Dampen leg normalizes `-0` in the uShake assertion**
- **Found during:** Task 2 GREEN
- **Issue:** with amplitude gated to 0, `0 * exp(-jt/50) * sin(jt*0.55)` yields `-0` through a negative sine term; `assert.strictEqual` distinguishes `-0` from `0`, failing a numerically-correct still vector.
- **Fix:** the test compares `uShake.value.x + 0` (the implementation is unchanged — `-0` is exact zero for the shader).
- **Files modified:** tests/render3d.test.js
- **Committed in:** `59eb1c4` (part of the GREEN commit)

---

**Total deviations:** 2 (1 TDD-mandated task-order swap, 1 test-side `-0` normalization)
**Impact on plan:** No scope change — every task's stated content shipped verbatim; the swap strengthens the TDD audit trail (two clean `test → feat` pairs).

**Operational note (not a deviation):** the plan's `awk '/ pass /{p=$3} …'` acceptance commands were run with `\$3` escaped so the outer shell does not eat the field reference; semantics unchanged (same note as 05-01).

## Verification Summary

| Gate | Result |
|------|--------|
| polish.test.js ≥ 9 (Task 1) | 9 pass / 0 fail |
| render3d.test.js ≥ 6 (Task 3) | 6 pass / 0 fail |
| Full suite ≥ 105, fail 0 | **113 pass / 0 fail** (baseline 108 + 5 new legs) |
| `grep -c snapGridFor js/render3d.js` ≥ 3 | 5 |
| No `reducedMotion` in running-pose/blob-shadow region | pass (all hits at ≤ line 351, region starts ~line 406) |
| Purity fence (`git diff --quiet` on frozen sim-core/test files) | rc 0 |
| `addListener(` absent from shell.js; typeof-guard present | pass |
| TDD gate: `test(05-02)` RED before `feat(05-02)` | satisfied twice (`bd079f1→d6c4d62`, `e474207→59eb1c4`) |
| RED evidence classifier | `RED_EVIDENCE_OK` × 2 (`.planning/tdd-red-evidence-05-02-t{1,2}.json`) |

## Known Stubs

None — no placeholder values or unwired paths introduced; every dampen site is wired and pinned by a passing test.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plans 05-03/05-04 build on the pause lifecycle from 05-01; this plan touched none of their seams beyond the shared view payload (additive key only).
- End-of-phase UAT item (coverage D2/D5/D6): devtools-emulate `prefers-reduced-motion` → wobble/shake vanish live both directions, rope/character judgment unchanged; verify the 0.25 px grid reads as crawl-free (A3).
- UI-02 is declared only by this plan → marked complete (no shared-ID wait).

## Self-Check: PASSED

- Files on disk: `js/shell.js`, `js/render3d.js`, `tests/polish.test.js`, `tests/render3d.test.js`, both evidence JSONs — all FOUND
- Commits ancestors of HEAD: `bd079f1`, `d6c4d62`, `e474207`, `59eb1c4` — all FOUND
- Measured commit count from ledger `e0588f4..HEAD`: 4

---
*Phase: 05-accessibility-polish*
*Completed: 2026-10-22*
