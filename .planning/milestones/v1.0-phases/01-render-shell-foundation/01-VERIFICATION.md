---
phase: 01-render-shell-foundation
verified: 2026-10-16T02:30:00Z
status: passed
score: 12/13 must-haves verified
covered_files:
  - ".planning/phases/01-render-shell-foundation/01-01-PLAN.md"
  - ".planning/phases/01-render-shell-foundation/01-01-SUMMARY.md"
  - ".planning/phases/01-render-shell-foundation/01-02-PLAN.md"
  - ".planning/phases/01-render-shell-foundation/01-02-SUMMARY.md"
  - ".planning/phases/01-render-shell-foundation/01-03-PLAN.md"
  - ".planning/phases/01-render-shell-foundation/01-03-SUMMARY.md"
  - "css/style.css"
  - "index.html"
  - "js/game.js"
  - "js/interpolate.js"
  - "js/render3d.js"
  - "js/shell.js"
  - "tests/boundary.test.js"
  - "tests/interpolate.test.js"
  - "tests/render3d.test.js"
  - "tests/shell.test.js"
  - "tests/startrun.test.js"
covered_digest: "v3:sha256:b131d9b31189818f7cb672739296ca9022b041a1c9088a286d66b7fc0c40529f"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 9/10
  gaps_closed:
    - "G-01-1: scene.render TypeError froze the rAF loop at 'press space / tap to start' — closed by plan 01-03 (ce8cb6c RED pin, 6343dea createScene returns { render }, a5ca11b render-throw isolation), plus 094edba automating the T-01-08 frame-loop-survival and D-02 no-2D-path tests in tests/shell.test.js"
  gaps_remaining: []
  regressions: []
advisory:
  - finding: "ROADMAP Phase 1 declares Mode: mvp but the goal text is not in User Story form (user-story.validate → valid:false). Plan 01-01 derives a compliant story from the goal; verification proceeded against that derived story per explicit instruction."
    category: other
    reason: "Format contract only — all four success criteria are concrete and were verified mechanically. Running /gsd-mvp-phase 1 would formalize the story slot; nothing else would change."
    evidence_status: "none provided"
human_verification:
  - test: "Serve the repo (python3 -m http.server), open index.html, play one full run idle → running → choose → over; confirm devtools Network shows cdn.jsdelivr.net three.module.js AND three.core.js both 200; the obstacle box sweeps in sync with skip scoring; jump (space/tap) clears the rope; HUD shows score/best/status text (ROADMAP SC-1, SC-4 human half — also the [SUS] package-load verification from the RESEARCH legitimacy audit)"
    expected: "Complete run through the WebGL placeholder shell; three resolves only via the pinned importmap URL; visuals stay in sync with scoring"
    why_human: "Requires a browser with WebGL; headless checks cover the static contract and the loop/input contract (tests/shell.test.js) only. Now unblocked — the G-01-1 freeze that previously failed this smoke at frame one is fixed and pinned."
  - test: "With devtools CPU throttling (4-6x), play a run and watch the obstacle sweep across the rope-phase wrap (once per revolution)"
    expected: "Obstacle keeps sweeping forward through the wrap — no visible snap-back or drift from scoring (ROADMAP SC-4 perceptual half)"
    why_human: "Perceptual smoothness under load; the arithmetic is unit-pinned (tests/interpolate.test.js, naive-lerp injection turns it red) but perceived motion needs eyes — the INTERPOLATION-NOT-PROVEN flag from STATE.md/RESEARCH A2"
---

# Phase 1: Render-Shell Foundation Verification Report

**Phase Goal:** The game plays end-to-end through a WebGL shell while the simulation core stays pure, single-clocked, and Node-testable — the boundary every later phase depends on
**Verified:** 2026-10-16T02:30:00Z
**Status:** human_needed
**Re-verification:** Yes — regenerated after gap-closure plan 01-03 (G-01-1) plus follow-up test automation 094edba

## Goal Achievement — Gap G-01-1 Closure (focus of this round)

| Item | Evidence | Status |
| ---- | -------- | ------ |
| Commits `ce8cb6c`, `6343dea`, `a5ca11b` present, ancestors of HEAD | `git merge-base --is-ancestor` ×3 → PASS | ✓ VERIFIED |
| `createScene` returns `{ render }` (contract fixed at the factory, create\*-convention) | js/render3d.js:42-49 — named `render(view)` function, `return { render };` | ✓ VERIFIED |
| Call site `scene.render({...})` (shell.js:104) matches the contract | Both sides read directly; seam resolved | ✓ VERIFIED |
| Contract pinned by WebGL-free / three-free Node test | tests/render3d.test.js — source-rewritten data:/file: URL import, three stubbed; 3/3 pass | ✓ VERIFIED |
| Pin has teeth: old bare-closure shape goes red with the `G-01-1 contract` marker | Injected `return render;` back into render3d.js → suite red, 2 × "G-01-1 contract" in TAP diagnostics; restored clean | ✓ VERIFIED |
| Renderer throw cannot kill the rAF loop (T-01-08 belt) | shell.js:103-108 — try/catch around scene.render with `console.error('render failed:', err)`; rAF re-arm at :108 unconditional | ✓ VERIFIED |
| Frame-loop survival is behaviorally tested, not just present | tests/shell.test.js (094edba) boots the REAL js/shell.js in Node with a throwing render stub and asserts (a) rAF re-arms across 3 consecutive throws, (b) a space press on idle transitions to running while the renderer is broken. Both pass; removing the try/catch turns both red (injected probe, restored) | ✓ VERIFIED (behavioral) |
| New test files evade the boundary walk as designed (prohibition) | No `from`/`import(` relative literal into js/ in tests/render3d.test.js or tests/shell.test.js (grep clean); boundary.test.js passes with them present (no new entry, no bare `three` recorded); ARCH-01 injection tooth still red-correct | ✓ VERIFIED |
| Frozen files untouched by the fix | `git diff --name-only 89daa00..HEAD` scope: js/render3d.js, js/shell.js, tests/render3d.test.js, tests/shell.test.js only; four frozen test files byte-identical to their pre-phase commits | ✓ VERIFIED |

## User Flow Coverage (MVP mode, story derived per plan 01-01)

*As a player, I want to play a full run through the new WebGL shell while the simulation core stays pure and Node-testable, so that every later phase builds on a proven sim/render seam.*

| Step | Expected | Evidence | Status |
| ---- | -------- | -------- | ------ |
| Start a run | space/tap → `startRun()` single path | shell.js:48, :61 destructure `startRun()`; the G-01-1 freeze at this step is closed and pinned | ✓ VERIFIED (code + regression tests) / browser smoke ⚠️ HUMAN |
| Play under WebGL | one real WebGL frame per rAF from read-only sim state | shell.js:104 `scene.render({...})` ↔ render3d.js `{ render }`; render body assigns only THREE meshes | ✓ VERIFIED (code) / browser smoke ⚠️ HUMAN |
| Choose an upgrade | offer at cadence skips, applied on pick | game.js `tickRun` → `pickTwo(UPGRADES, rng)`; shell.js:57; determinism pinned by startrun/boundary tests | ✓ VERIFIED |
| Trip and restart | over → best saved → fresh run via same path | shell.js:58-61, save before reset, verbatim | ✓ VERIFIED (code) |
| Sim stays pure/Node-testable | `node --test tests/` green, frozen files untouched | 42/42 pass; four originals byte-identical; boundary fence green | ✓ VERIFIED |

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | Full run playable in browser via importmap-pinned three@0.186.1 WebGL scene (SC-1) | ⚠️ NEEDS-HUMAN | Static half all green (one importmap, pinned, before module script; sole three importer; state machine + loop survival tested headlessly). The prior blocker (G-01-1 freeze at frame one) is closed — the smoke is now expected to pass. Browser end-to-end can't run headless → human item 1 |
| 2 | render3d.js sole `three` importer; shell.js sole owner of document/performance.now/rAF/localStorage (ARCH-01) | ✓ VERIFIED | Regression gates re-run: sole-importer PASS, browser-IO-only-shell PASS; boundary tooth re-demonstrated (three-injection → red, offender named) |
| 3 | Canvas 2D draw() gone — exactly one render path (D-02) | ✓ VERIFIED | `getContext` grep clean, now permanently pinned by tests/shell.test.js D-02 test (no CanvasRenderingContext2D API survives in js/) |
| 4 | Drawn position = lerpPhase(prevPhase, rope.phase, alpha); canonical phase clock is the only visual time source (SC-4) | ✓ VERIFIED | render3d.js:43 sole position computation; shell.js:90 prevPhase captured before each step, :104 alpha = acc/STEP; no clock access in render3d.js |
| 5 | One startRun() path; tickRun 5th rng param always supplied by shell (ARCH-02) | ✓ VERIFIED | `0.33` appears exactly once in js/ (GATE PASS); all Math.random matches in sim files are the default-param line (GATE PASS); shell.js:91 passes rng; both resets via startRun() |
| 6 | `node --test tests/` exits 0, four pre-existing files byte-unchanged | ✓ VERIFIED | Ran it: 42 pass / 0 fail (70 ms); blob-hash check vs each file's only (pre-phase) commit passes for all four |
| 7 | Any static OR dynamic `three` reference in the test-reachable graph fails boundary.test.js with named offenders (ARCH-01) | ✓ VERIFIED | Re-ran the static-injection probe this round: red with `three (imported by .../js/rope.js)`; dynamic-form alternation verified in prior round, SPECIFIER_RE unchanged (regression-clean) |
| 8 | Dual-init literal or Math.random in any form outside the default-param line fails boundary.test.js (SC-3, ARCH-02) | ✓ VERIFIED | GATES 4/5 PASS on the clean tree; fence source unchanged since the prior round's demonstrated injections |
| 9 | Wall-clock/DOM/storage reference outside shell.js fails boundary.test.js | ✓ VERIFIED | Browser-IO gate PASS this round; fence file unmodified since the demonstrated `performance.now()`-injection tooth |
| 10 | Wrap-forward lerpPhase pinned; naive lerp turns the suite red (SC-4 arithmetic) | ✓ VERIFIED | interpolate tests 5/5 green; implementation and tests unmodified since the prior round's naive-lerp tooth |
| 11 | createScene returns a plain object with a callable .render — G-01-1 contract pinned in Node without WebGL/three | ✓ VERIFIED | render3d.js:49 + tests/render3d.test.js 3/3; injected old shape → red with `G-01-1 contract` marker |
| 12 | A throw inside scene.render no longer kills the frame loop; input stays live | ✓ VERIFIED | shell.js:103-108 belt; tests/shell.test.js drives the real shell through 3 consecutive render throws (loop re-arms, errors logged) and a broken-renderer idle→running transition; belt removal turns both tests red — behavioral evidence, not presence |
| 13 | G-01-1 headline: serving the repo and tapping/space starts a run | ⚠️ NEEDS-HUMAN (browser half) | Headless half fully proven (truth 12); the real-browser first-frame survival depends on the real three/WebGLRenderer path → folded into human item 1 |

**Prohibitions (plan frontmatter):**
- No second render path — **verified dead + permanently pinned** (truth 3, D-02 test).
- Renderer never feeds back into sim — **verified**: render3d.js imports only `./interpolate.js`; render body assigns only THREE meshes; no clocks, no rAF, no sim calls.
- Four pre-existing test files byte-unchanged across all three plans — **verified** (truth 6).
- New test files must not register render3d.js/shell.js as boundary-graph entries — **verified** (no relative specifiers visible to SPECIFIER_RE; boundary green with them present).
- Fix must not move frame-timing/DOM into the renderer — **verified** (browser-IO gate PASS with render3d.js in scope).

**Score:** 12/13 truths verified (0 present, behavior-unverified; 1 browser-end-to-end routed to human)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `js/render3d.js` | sole three importer; `createScene(canvas)` → `{ render }` | ✓ VERIFIED | 50 lines; contract fixed per create\*-factory convention; read-only over view |
| `js/shell.js` | sole IO owner; frame loop survives render throws | ✓ VERIFIED | try/catch isolated to the scene.render call only; accumulator, consumeIntents, tickRun, updateHud stay outside the try |
| `js/interpolate.js` | pure wrap-aware lerpPhase | ✓ VERIFIED | unchanged; still dependency-free |
| `js/game.js` | pure exports + startRun/START_PHASE/ROPE_PERIOD + rng param | ✓ VERIFIED | unchanged since prior verification; gates re-passed |
| `index.html` | one importmap before module script, pinned URL, HUD div | ✓ VERIFIED | one map (line 12) before module script (line 24), three@0.186.1 pinned |
| `tests/render3d.test.js` | createScene contract pin, no boundary-walk entry | ✓ VERIFIED | data:/file: URL mechanism; marker only in assertion messages |
| `tests/shell.test.js` | T-01-08 behavioral automation + permanent D-02 fence | ✓ VERIFIED | boots real shell.js under stubbed globals; same specifier-rewrite mechanism |
| `tests/boundary.test.js` / `tests/interpolate.test.js` / `tests/startrun.test.js` | permanent fences | ✓ VERIFIED | unmodified; all teeth re-demonstrated or regression-clean |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| shell.js:104 `scene.render(view)` | render3d.js `return { render }` | call-site ↔ factory return shape (the seam that broke) | ✓ WIRED | the exact G-01-1 link; pinned by tests/render3d.test.js |
| frame() renderer throw | catch → console.error → rAF re-arm (shell.js:108) | try/catch isolation, unconditional re-arm | ✓ WIRED | proven by throwing-stub boot in tests/shell.test.js |
| index.html importmap | js/render3d.js `'three'` | map declared in head before module script | ✓ WIRED | one map; sole bare-three specifier |
| shell frame loop | tickRun 5th rng arg + startRun() at both resets | consumeIntents / step loop | ✓ WIRED | shell.js:48, :61, :91 |
| prevPhase capture → lerpPhase call | shell.js:90 → :104 → render3d.js:43 | render(view) payload | ✓ WIRED | prev captured BEFORE each step |
| tests/*.test.js imports | js/game.js exports | frozen 4-positional-arg surface | ✓ WIRED | frozen game.test.js green unchanged |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| render3d.js | `phase`, `player.y` | view payload from shell's live sim state → lerpPhase | Yes — live rope/player each frame | ✓ FLOWING |
| shell.js HUD | score/best/offer strings | run/localStorage via loadBest/saveBest | Yes | ✓ FLOWING |
| tests/shell.test.js | view log | real shell.js frame loop, real game/rope/player | Yes — real simulation driving the stub renderer | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full suite green | `node --test tests/` | 42 pass / 0 fail, 70 ms | ✓ PASS |
| Frozen-file integrity | git hash-object vs each file's only commit | all four identical | ✓ PASS |
| G-01-1 contract tooth | `return render;` injected into render3d.js → render3d.test.js | red, 2 × "G-01-1 contract" marker | ✓ PASS |
| Frame-loop belt tooth | try/catch removed from shell.js frame() → shell.test.js | 2 T-01-08 tests red, D-02 stays green | ✓ PASS |
| three-injection tooth (ARCH-01) | append `import * as THREE from 'three'` to rope.js → boundary.test.js | red, offender `three (imported by .../js/rope.js)` | ✓ PASS |
| Clean-tree boundary re-run | `node --test tests/boundary.test.js` | 5 pass / 0 fail | ✓ PASS |

All probes restored the tree clean (`git status --porcelain js/ tests/` empty).

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention probes declared or present. Step 7c: SKIPPED (no declared probe scripts); the phase's probe-equivalents are the plan `<verify>` gates and adversarial tooth-checks — all executed above directly.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| ARCH-01 | 01-01, 01-02, 01-03 | Sim core pure/framework-free/Node-testable; 3D shell owns the only `three` import | ✓ SATISFIED | Truths 2, 7, 9, 11, 12; permanent boundary fence with re-demonstrated teeth; the gap fix kept the fence intact |
| ARCH-02 | 01-01, 01-02 | Single run-reset path; injected rng; dual 0.33 init + inline Math.random gone | ✓ SATISFIED | Truth 5; GATES 4/5 pass; determinism pinned |

No orphaned requirements: REQUIREMENTS.md maps exactly ARCH-01/ARCH-02 to Phase 1; both claimed by plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No TBD/FIXME/XXX/TODO/placeholder markers in any phase-modified file | ℹ️ Info | clean |
| js/shell.js | 106 | WR-04 (01-03 review, tracked open): `console.error` on every frame under persistent renderer failure floods the console | ℹ️ Info (tracked) | noise under a broken-renderer scenario; input stays live — not goal-blocking |
| js/shell.js | 52-64 | WR-04 (01 review, tracked open): `holdFrom` not cleared on choose/over release branches | ℹ️ Info (tracked) | latent stale-input edge; next press overwrites it — not goal-blocking |

Known open findings factored (not duplicated): WR-01/WR-02/WR-03 are hardener-side bypass vectors of the *detectors* — the current tree genuinely satisfies the properties they defend (re-verified this round); the UI-audit CDN silent-brick finding is folded into human item 1 (network-tab check during the smoke).

### Human Verification Required

#### 1. Browser full-run smoke (SC-1, SC-4 perceptual half, T-01-SC load verification) — now unblocked

**Test:** Serve the repo (`python3 -m http.server`), open index.html. Devtools Network: `three.module.js` and `three.core.js` both 200. Play one full run idle → running → choose → over; jump with space/tap; watch the obstacle sweep against scoring; restart from over.
**Expected:** WebGL flat-box scene renders from the first frame; obstacle syncs with skip scoring with no visible drift; HUD shows score/best/status; run restarts cleanly. The G-01-1 freeze ("press space / tap to start" unresponsive) must not reproduce.
**Why human:** Requires a browser + WebGL + the real three build; headless checks proved the loop/input contract (tests/shell.test.js) and the static contract but not the real renderer path.

#### 2. Drift-under-load wrap check (SC-4) — now unblocked

**Test:** Devtools CPU throttling 4-6x, play a run, watch the obstacle through the once-per-revolution phase wrap.
**Expected:** Sweep stays forward through the wrap — no snap-back, no scoring desync.
**Why human:** Perceptual smoothness under load; the arithmetic is unit-pinned (naive-lerp injection goes red) but perceived motion needs eyes — carries the INTERPOLATION-NOT-PROVEN flag.

01-UAT.md already tracks both items (Test 2's blocked_by Test 1 is now lifted); it was not reset.

### Gaps Summary

No gaps. G-01-1 is closed with the strongest available headless evidence: the contract fix is pinned by a Node test that goes red against the exact old shape, and the frame-loop survival invariant is now behaviorally automated (real shell.js booted under a throwing renderer — re-arms and keeps consuming input). All prior mechanical fences re-passed with teeth re-demonstrated; the suite grew 36 → 42, all green; frozen files byte-identical. What remains is the two-item end-of-phase browser UAT (human_verify_mode=end-of-phase), which is why status is `human_needed`, not `passed`.

---

_Verified: 2026-10-16T02:30:00Z_
_Verifier: the agent (gsd-verifier)_
