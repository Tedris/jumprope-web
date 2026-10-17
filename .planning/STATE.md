---
gsd_state_version: "1.0"
current_phase: 03
current_phase_name: Card Catalogue Realness
status: executing
stopped_at: Completed 03-01-PLAN.md
last_updated: "2026-10-17T06:55:18.105Z"
last_activity: 2026-10-17
last_activity_desc: Phase 03 execution started
state_head: 349986d1463fd2ab37320529c0a90b36901b69de
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 9
  completed_plans: 7
  percent: 40
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-16)

**Core value:** One button, one rope, one perfect rhythm loop — the jump-timing feel must be joyful before anything else works.
**Current focus:** Phase 03 — Card Catalogue Realness

## Current Position

Phase: 03 (Card Catalogue Realness) — EXECUTING
Plan: 2 of 3
Status: Ready to execute
Last activity: 2026-10-17 — Phase 03 execution started

Progress: [████░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0.0 hours

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 15min | 2 tasks | 7 files |
| Phase 01 P02 | 10min | 2 tasks | 3 files |
| Phase 01 P03 | 4 min | 3 tasks | 3 files |
| Phase 02 P01 | 15min | 2 tasks | 1 files |
| Phase 02 P02 | 7min | 2 tasks | 4 files |
| Phase 02 P03 | 7min | 3 tasks | 3 files |
| Phase 03 P01 | 12min | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- (init): Demake the spirit of Scarlet Skips, not the letter; original character/cards
- (init): Three.js r186 via pinned importmap is the one sanctioned dependency — render shell only
- (init): Audio follows gameplay; rope phase is the canonical clock, no beat-lock
- (research): Pure-core boundary must be secured first — `node --test` green with zero `three` imports in the sim graph
- [Phase 01]: startRun() preserves the 0.33-phase / 0.1-hold-jump lead-in verbatim (~0.43 s to feet window; RESEARCH A4 — no test pins either)
- [Phase 01]: rng injected as tickRun optional 5th default param (rng = Math.random); shell always overrides — flagged assumption A1 stands
- [Phase 01]: three pinned to exact jsdelivr URL (0.186.1) with deliberate SRI deferral recorded inline (T-01-01); package.json stays dependency-free
- [Phase 01]: TDD RED carried by new tests/startrun.test.js — four frozen test files stay byte-identical; plan 01-02 must not duplicate the determinism pin
- [Phase 01]: boundary fence derives walk entries from tests/*.test.js imports at runtime; same graph set drives the three-check and the Math.random grep
- [Phase 01]: js/game.js reached via await import() in boundary test 4 so adversarial 'three' taints surface via the walk offender list, not a loader crash
- [Phase 01]: set git.allow_default_branch_commits=true: branching_strategy is none and all history is on master (#3819 guard override)
- [Phase 01]: plan-mandated startRun/determinism pins kept in boundary.test.js despite startrun.test.js overlap — fence self-containment wins
- [Phase 01]: createScene fixed on the render3d side (returns { render }) rather than the shell call site — create*-factory convention wins; pinned by WebGL-free data: URL stub-import test
- [Phase 01]: shell frame() wraps only scene.render in try/catch; rAF re-arms unconditionally so a renderer throw can no longer freeze input (T-01-08)
- [Phase 02]: PS1 look signed off as-rendered: snap S=2, 31-level Bayer-4x4, fog 7-22, one light 2.4 — canonical values in spike ## Look Decisions (02-02 ports verbatim)
- [Phase 02]: onBeforeCompile vertex-snap injection proven on pinned three@0.186.1 — addons/RetroPassNode migration not needed (T-02-02 closed); no ambient fill, D-05 literal
- [Phase 02]: PS1 pipeline shipped: spike recipe ported verbatim into createScene (RT+snap+Bayer single pass, dual compile); spike camera framing ported so fog-near doesn't darken the signed-off frame
- [Phase 02]: shell view payload gains render-only view.now (rAF timestamp); canvas buffer window-sized via coerced windowSize(); resize stays one-way through render3d's passive poll
- [Phase 02]: theta convention pinned: bulge at curve-local +Y, ropePivot.rotation.z = -theta, theta = PI puts the sagged low point at the feet (atFeet 0.45-0.55)
- [Phase 02]: D-16 camera at (2.6, 2.2, 8.6)/lookAt(0,1,0) with fov 50->40 so the jumper keeps the spike's frame size at the farther vantage
- [Phase 02]: Idle/trip cosmetics are the only view.now readers in render3d.js; trip shake is the verbatim closed-form sin(d*42)*exp(-d/200) — zero RNG/accumulators (T-02-08/09)
- [Phase 03]: pickOffers promoted canonical, pickTwo kept as add-alongside shim (frozen distinct-pair pin)
- [Phase 03]: shell.js reads CARDS via game.js re-export — frozen bootShell harness rewrites only game/rope/player/render3d specifiers
- [Phase 03]: D-07 lock init as reentryAt=-LEAD_IN_MS (expired); confirm clears holdFrom — cold-start press safety + no stale charge across freeze

### Pending Todos

- [2026-10-16] [ui] Bring back a proper 3D jump rope to the WebGL scene — [todo file](.planning/todos/pending/2026-10-16-bring-back-a-proper-3d-jump-rope-to-the-webgl-scene.md)

### Blockers/Concerns

- Phase 2: mandatory ½-day look-spike — `onBeforeCompile` chunk names unverified against `three@0.186.1` (fallback: `RetroPassNode` or plain flat-shaded low-res)
- Phase 3: "extra ropes" multi-window scoring — spike-or-defer decision inside the phase; rope-wrap fix must precede any ropeMul-stacking card

## Deferred Items

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-10-17T06:55:18.058Z
Stopped at: Completed 03-01-PLAN.md
Resume file: None
