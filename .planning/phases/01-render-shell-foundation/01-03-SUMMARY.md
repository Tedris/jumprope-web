---
phase: 01-render-shell-foundation
plan: 03
subsystem: render-shell
tags: [three, raf-loop, regression-test, gap-closure, data-url-import]

requires:
  - phase: 01-render-shell-foundation
    provides: "01-01 importmap + render shell scaffolding; 01-02 interpolate/shell wiring (the scene.render(view) call site this plan repairs)"
provides:
  - "createScene(canvas) now returns a plain { render } object, matching the create*-factory convention and the shell.js:103 call site"
  - "tests/render3d.test.js — Node-level contract pin for the createScene return shape via source-rewritten data:/file: URL import with a stubbed three (no WebGL, no three install)"
  - "shell frame loop survives a scene.render throw: try/catch + console.error, requestAnimationFrame re-arms unconditionally"
affects: [01-render-shell-foundation UAT, phase-02-scene-render]

actuals:
  tokens: 1150
  tasks: 3
  commits: 3
plan_head_before: 89daa005f9e2c84ef81ec71ed3e5cde7fa15ac2c
plan_head_after: a5ca11bab7ce57e80551ba39e49a58c40670d469

tech-stack:
  added: []
  patterns:
    - "Source-rewritten data: URL import in tests to load a three-dependent module in Node with a stubbed renderer, without registering js/render3d.js as a boundary-graph entry"

key-files:
  created:
    - tests/render3d.test.js
  modified:
    - js/render3d.js
    - js/shell.js

key-decisions:
  - "Fixed the contract on the render3d side (createScene returns { render }) rather than changing the shell.js call site — honors the create*-factory convention and the debug-session-endorsed direction"
  - "Contract pin uses regex-specifier rewriting (no literal relative import of js/render3d.js) so tests/boundary.test.js entryPoints() never registers render3d.js and the ARCH-01 three-fence stays green"

requirements-completed: [ARCH-01]

coverage:
  - id: D1
    description: "createScene returns a plain object with a callable .render method; scene.render(view) executes against a stubbed renderer without throwing"
    requirement: "ARCH-01"
    verification:
      - kind: unit
        ref: "tests/render3d.test.js#createScene returns a plain object, not the bare render closure"
        status: pass
      - kind: unit
        ref: "tests/render3d.test.js#the returned object exposes a render function"
        status: pass
      - kind: unit
        ref: "tests/render3d.test.js#scene.render runs against the stubbed renderer without throwing"
        status: pass
    human_judgment: false
  - id: D2
    description: "A throw inside scene.render no longer kills the rAF frame loop — the loop re-arms and input stays live"
    verification:
      - kind: other
        ref: "throwaway Node experiment (module.registerHooks three stub + forced renderer.render throw): loop re-armed every frame, 8 render failures logged, idle tap transitioned to running — script not committed by design"
        status: pass
    human_judgment: true
    rationale: "The belt is only fully proven in a real browser; UAT Test 1 replay (serve repo, tap/space starts a run) is the permanent confirmation and is deferred to end-of-phase verification (human_verify_mode: end-of-phase)"
  - id: D3
    description: "Full Node suite green including the boundary fence — no new walk entry, four frozen test files byte-unchanged"
    verification:
      - kind: integration
        ref: "node --test tests/ (39/39 pass; git diff 89daa00..HEAD touches only js/render3d.js, js/shell.js, tests/render3d.test.js)"
        status: pass
    human_judgment: false

duration: 4 min
completed: 2026-10-16
status: complete
---

# Phase 1 Plan 03: G-01-1 Gap Closure Summary

**createScene now returns a plain `{ render }` object matching the shell's `scene.render(view)` call site, pinned by a WebGL-free Node contract test, and the frame loop catches renderer throws so the rAF loop can never again freeze at "press space / tap to start".**

## Performance

- **Duration:** 4 min
- **Started:** 2026-10-16T01:45:43Z
- **Completed:** 2026-10-16T01:49:20Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Closed G-01-1: the first-frame `TypeError: scene.render is not a function` that permanently killed the rAF loop (input dead while the idle prompt sat frozen) is gone — `createScene` honors the create\*-factory convention (js/render3d.js returns `{ render }`).
- New `tests/render3d.test.js` pins the return contract in Node with neither WebGL nor the three package: reads js/render3d.js, rewrites the `three` specifier to a data: URL stub and the interpolate specifier to a `file:` URL, imports the result. RED proof carried the exact `G-01-1 contract` marker on the two shape assertions and the exact G-01-1 symptom (`scene.render is not a function`) on the behavior test.
- Frame-loop belt (T-01-08): `scene.render` isolated in try/catch inside `frame()` with `console.error('render failed:', err)`; `requestAnimationFrame(frame)` re-arms unconditionally, so a future renderer throw degrades to a broken picture with live input, not a frozen game.
- ARCH-01 fence verified intact: the boundary graph gained no `render3d.js` entry (no SPECIFIER_RE-visible relative specifier in the new test); `node --test tests/` 39/39 green; the four frozen test files plus boundary/interpolate tests are byte-unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: Failing contract pin — tests/render3d.test.js (RED)** — `ce8cb6c` (test)
2. **Task 2: Align createScene return contract — object with render method (GREEN)** — `6343dea` (fix)
3. **Task 3: Make the frame loop survive a render throw — js/shell.js** — `a5ca11b` (fix)

**Plan metadata:** committed with this SUMMARY (docs commit).

_Note: TDD tasks may have multiple commits (test → feat → refactor) — here RED and GREEN landed as the plan-specified test/fix pair._

## Files Created/Modified

- `tests/render3d.test.js` — createScene return-contract pin via source-rewritten data:/file: URL import with a stubbed three; `G-01-1 contract` marker lives only inside the two shape-assertion failure messages
- `js/render3d.js` — `createScene` hoists the render closure to a named function and returns `{ render }`; no behavior change inside render; still zero wall-clock/DOM references
- `js/shell.js` — `frame()` wraps only the `scene.render({...})` call in try/catch with `console.error`; rAF re-arm unconditional (shell layer is the sanctioned place for console)

## Decisions Made

- Fixed the render3d side instead of calling the returned function at shell.js:103 — matches the create\*-factory convention (`createRun`/`createPlayer`/`createRope` all return plain objects) and the debug-session-endorsed direction.
- Test pin obtains createScene through runtime specifier rewriting (regex replace, data: URL import) so `tests/boundary.test.js` `entryPoints()` never sees a relative specifier into js/ — the ARCH-01 walk neither picks up render3d.js nor records bare `three`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- First RED attempt failed for the wrong reason: the three-stub's base class was missing the `setSize` no-op, so `createScene` threw `TypeError: renderer.setSize is not a function` (a stub-side error, marker absent). Fixed inside Task 1 before committing; the committed RED then failed exactly on the contract assertions with the `G-01-1 contract` marker plus the authentic `scene.render is not a function` symptom on the behavior test.
- Task 3's forced-throw experiment (temporary /tmp script, deliberately uncommitted per plan) initially reported FAIL on its own bookkeeping — the idle prompt was sampled before the deferred first driven frame. After reordering, the experiment passed: loop re-armed every frame, 8 renderer throws logged, and a pointer tap on the idle screen transitioned to `running` — input stayed live through the whole failure storm.
- Browser smoke (UAT Test 1 replay) not run here — `human_verify_mode: end-of-phase` routes it to the phase verifier; the Node-level evidence above plus the throw experiment cover it until then. UAT Test 2 (drift-under-load) is now unblocked.

## Verification Evidence

- `node --test tests/render3d.test.js` RED at Task 1: 2 AssertionError failures containing `G-01-1 contract`, 1 failure carrying the G-01-1 runtime symptom — gate `grep -c "G-01-1 contract" > 0` passed.
- `node --test tests/` exit 0 after Tasks 2 and 3 (39 tests, 39 pass).
- `git diff --stat 89daa00..a5ca11b`: only js/render3d.js, js/shell.js, tests/render3d.test.js. Frozen tests untouched; zero file deletions in any plan commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- UAT Test 1 (idle → tap → running → jump → card → over → restart browser smoke) is ready to run and is expected to pass; Test 2 (drift-under-load wrap check) is unblocked.
- Phase 02 can build on the corrected `createScene` contract; the Node pin makes any future shape drift at the shell↔renderer seam fail immediately in `node --test`.

## Self-Check: PASSED

- Files present on disk: `tests/render3d.test.js`, `js/render3d.js`, `js/shell.js`
- Commits ancestors of HEAD: `ce8cb6c`, `6343dea`, `a5ca11b`

---
*Phase: 01-render-shell-foundation*
*Completed: 2026-10-16*
