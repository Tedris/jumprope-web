---
phase: 01-render-shell-foundation
verified: 2026-10-15T12:30:00Z
status: human_needed
score: 9/10 must-haves verified
covered_files:
  - ".planning/phases/01-render-shell-foundation/01-01-PLAN.md"
  - ".planning/phases/01-render-shell-foundation/01-01-SUMMARY.md"
  - ".planning/phases/01-render-shell-foundation/01-02-PLAN.md"
  - ".planning/phases/01-render-shell-foundation/01-02-SUMMARY.md"
  - "css/style.css"
  - "index.html"
  - "js/game.js"
  - "js/interpolate.js"
  - "js/render3d.js"
  - "js/shell.js"
  - "tests/boundary.test.js"
  - "tests/interpolate.test.js"
  - "tests/startrun.test.js"
covered_digest: "v3:sha256:63c8eaeb10cdb939eb8dcc86a4d882de5a288016e129f64a278d89bf859d8c6b"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Serve the repo (python3 -m http.server), open index.html, play one full run idle → running → choose → over; confirm devtools Network shows cdn.jsdelivr.net three.module.js AND three.core.js both 200; the obstacle box sweeps in sync with skip scoring; jump (space/tap) clears the rope; HUD shows score/best/status text (ROADMAP SC-1, SC-4 human half — also the [SUS] package-load verification from the RESEARCH legitimacy audit)"
    expected: "Complete run through the WebGL placeholder shell; three resolves only via the pinned importmap URL; visuals stay in sync with scoring"
    why_human: "Requires a browser with WebGL; headless checks cover the static contract only"
  - test: "With devtools CPU throttling (4-6x), play a run and watch the obstacle sweep across the rope-phase wrap (once per revolution)"
    expected: "Obstacle keeps sweeping forward through the wrap — no visible snap-back or drift from scoring (ROADMAP SC-4 perceptual half)"
    why_human: "Perceptual smoothness under load; the arithmetic is unit-pinned (tests/interpolate.test.js, naive-lerp injection turns it red) but perceived motion needs eyes — the INTERPOLATION-NOT-PROVEN flag from STATE.md/RESEARCH A2"
advisory:
  - finding: "ROADMAP Phase 1 declares Mode: mvp but the goal text is not in User Story form (user-story.validate → valid:false). Plan 01-01 derives a compliant story from the goal; verification proceeded against that derived story per explicit instruction."
    category: other
    reason: "Format contract only — all four success criteria are concrete and were verified mechanically. Running /gsd-mvp-phase 1 would formalize the story slot; nothing else would change."
    evidence_status: "none provided"
---

# Phase 1: Render-Shell Foundation Verification Report

**Phase Goal:** The game plays end-to-end through a WebGL shell while the simulation core stays pure, single-clocked, and Node-testable — the boundary every later phase depends on
**Verified:** 2026-10-15T12:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## User Flow Coverage (MVP mode, story derived per plan 01-01)

*As a player, I want to play a full run through the new WebGL shell while the simulation core stays pure and Node-testable, so that every later phase builds on a proven sim/render seam.*

| Step | Expected | Evidence | Status |
| ---- | -------- | -------- | ------ |
| Start a run | space/tap → `startRun()` single path (js/shell.js:48) | Both entry sites (shell.js:48, :61) destructure `startRun()`; `startRun()` in game.js:8-14 | ✓ VERIFIED (code) |
| Play under WebGL | one real WebGL frame per rAF from read-only sim state | shell.js:103 `scene.render({run, rope, player, prevPhase, alpha, best})`; render3d.js:42-47 | ✓ VERIFIED (code) / browser smoke ⚠️ HUMAN |
| Choose an upgrade | offer appears at cadence skips, applied on pick | `tickRun` → `pickTwo(UPGRADES, rng)` (game.js:34); shell.js:57 `applyUpgrade`; determinism pinned | ✓ VERIFIED |
| Trip and restart | over → best saved → fresh run via same path | shell.js:58-62, best-save before reset, verbatim | ✓ VERIFIED (code) |
| Sim stays pure/Node-testable | `node --test tests/` green, frozen files untouched | 36/36 pass; 4 originals byte-identical to phase-start baseline | ✓ VERIFIED |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | Full run playable in browser via importmap-pinned three@0.186.1 WebGL scene (01-01, SC-1) | ⚠️ NEEDS-HUMAN | Static half all green (importmap single + pinned + before module script; sole importer; state machine tested). Browser end-to-end can't run headless → human item 1 |
| 2 | render3d.js sole `three` importer; shell.js sole owner of document/performance.now/rAF/localStorage (01-01, ARCH-01) | ✓ VERIFIED | Re-ran plan greps: GATE-1/2/3 PASS; `git grep WebGLRenderer` → js/render3d.js only; browser-IO lines all in js/shell.js |
| 3 | Canvas 2D draw() gone — exactly one render path (01-01, D-02) | ✓ VERIFIED | `getContext` matches nothing in js/; no `draw` routine outside render3d.js; no fallback flag |
| 4 | Drawn position = lerpPhase(prevPhase, rope.phase, alpha); canonical phase clock is the only visual time source (01-01, SC-4) | ✓ VERIFIED | render3d.js:43 sole position computation; shell.js:90 prevPhase captured before each step, :103 alpha = acc/STEP; frozen states set prev = curr (shell.js:98); no rAF/now in render3d.js |
| 5 | One startRun() path; tickRun 5th rng param always supplied by shell (01-01, ARCH-02) | ✓ VERIFIED | game.js:20 `rng = Math.random` default; shell.js:91 passes rng 5th; both resets via startRun(); `0.33` appears exactly once in js/ (GATE-4 PASS) |
| 6 | `node --test tests/` exits 0, four pre-existing files byte-unchanged, two fence files added (01-02, SC-2) | ✓ VERIFIED | Ran it: 36 pass / 0 fail; blob-hash check vs phase-start baseline passes for all four; last commit touching them (838983f) predates the phase |
| 7 | Any static OR dynamic `three` reference in the test-reachable graph fails boundary.test.js with named offenders (01-02, ARCH-01) | ✓ VERIFIED | Ran both adversarial probes myself: static injection → red with `three (imported by ...rope.js)`; `import('three')` injection → red likewise; SPECIFIER_RE includes the `import(` alternation; entry points derived from tests/*.test.js at runtime, no hardcoded list |
| 8 | Dual-init literal or Math.random in any form outside the default-param line fails boundary.test.js (01-02, SC-3, ARCH-02) | ✓ VERIFIED | GATE-4/5 PASS on the clean tree; injected `export const _bad = Math.random;` into rope.js → boundary red; restored clean |
| 9 | Wall-clock/DOM/storage reference outside shell.js fails boundary.test.js (01-02) | ✓ VERIFIED | Injected `performance.now()` into game.js → boundary red; restored clean |
| 10 | Wrap-forward lerpPhase pinned; naive lerp turns the suite red (01-02, SC-4 arithmetic) | ✓ VERIFIED | Replaced lerpPhase with naive lerp → tests/interpolate.test.js red (5 tests, wrap case asserts < 0.02 where naive yields ≈ 0.5); restored clean |

**Prohibitions (plan frontmatter):**
- No second render path — **verified dead** (truth 3; no getContext/2D context anywhere in js/).
- Renderer never feeds back into sim — **verified**: render3d.js imports only `./interpolate.js`; render body assigns only to THREE meshes; no rAF, no now-calls, no sim function calls.
- Four pre-existing test files byte-unchanged — **verified** (truth 6).

**Score:** 9/10 truths verified (0 present, behavior-unverified; 1 routed to human)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `js/shell.js` | impure browser shell, sole IO owner | ✓ VERIFIED | 111 lines; intents consumed at step boundaries; spiral clamp kept verbatim; HUD via textContent only (T-01-02); bootstrap guard moved here, not duplicated |
| `js/render3d.js` | sole three importer, createScene→render(view) | ✓ VERIFIED | Flat MeshBasicMaterial placeholder scene, setSize updateStyle=false, read-only view |
| `js/interpolate.js` | pure wrap-aware lerpPhase | ✓ VERIFIED | 7 lines, no imports, double-modulo normalization |
| `js/game.js` | pure exports + startRun/START_PHASE/ROPE_PERIOD + rng param | ✓ VERIFIED | 62 lines; shell half + Canvas 2D draw + bootstrap removed; 4-positional-arg surface intact |
| `index.html` | one importmap before module script, pinned URL, HUD div | ✓ VERIFIED | one map in head (three@0.186.1 jsdelivr, SRI-deferral comment), entry js/shell.js, #hud spans |
| `css/style.css` | #hud overlay only | ✓ VERIFIED | #hud rules added; canvas aspect-ratio/pixelated rules untouched |
| `tests/boundary.test.js` | derived-entry graph walk + debt greps | ✓ VERIFIED | No hardcoded module list; dynamic-import-aware RE; all four probes have demonstrated teeth |
| `tests/interpolate.test.js` | five lerpPhase pins | ✓ VERIFIED | 5/5 pass; naive-lerp injection proves the wrap pin |
| `tests/startrun.test.js` | startRun + rng determinism pins (added by 01-01 for TDD RED without touching frozen files) | ✓ VERIFIED | 3 tests pass |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| index.html importmap | js/render3d.js `'three'` | map declared in head before module script | ✓ WIRED | exactly one map; sole bare-three specifier in the tree |
| shell frame loop | tickRun 5th rng arg + startRun() at both resets | consumeIntents / step loop | ✓ WIRED | shell.js:48, :61, :91 |
| prevPhase capture → lerpPhase call | shell.js:90 → shell.js:103 → render3d.js:43 | render(view) payload | ✓ WIRED | prev captured BEFORE each step; alpha after the while-loop |
| tests/*.test.js imports | js/game.js exports | createRun/tickRun/applyUpgrade/loadBest/saveBest | ✓ WIRED | frozen game.test.js passes unchanged |
| SPECIFIER_RE | static + dynamic forms | `(?:\bfrom\s*|\bimport\s*\(\s*)` | ✓ WIRED | dynamic injection probe red |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| render3d.js | `phase`, `player.y` | view payload from shell's live sim state → lerpPhase | Yes — live rope/player each frame | ✓ FLOWING |
| shell.js HUD | score/best/offer strings | run/localStorage via loadBest/saveBest | Yes | ✓ FLOWING |
| boundary.test.js | graph/bare sets | filesystem walk of real test-imported modules | Yes — derived, not hardcoded | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full suite green | `node --test tests/` | 36 pass / 0 fail, 66 ms | ✓ PASS |
| Frozen-file integrity | git hash-object vs phase-start baseline | all four identical | ✓ PASS |
| three-injection tooth (static) | append `import * as THREE from "three"` to rope.js, run boundary test | red, offender `three (imported by .../js/rope.js)` | ✓ PASS |
| three-injection tooth (dynamic) | append `() => import('three')` to rope.js | red, offender listed | ✓ PASS |
| Math.random-leak tooth | append paren-free reference to rope.js | boundary red | ✓ PASS |
| browser-IO-leak tooth | append `performance.now()` to game.js | boundary red | ✓ PASS |
| naive-lerp tooth | swap lerpPhase body, run interpolate test | red on wrap case | ✓ PASS |
| rng determinism | plan 01-01 Task 2 node one-liner | identical offers, status choose | ✓ PASS |

All probes restored the tree clean (`git diff` empty for probed files).

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention probes declared or present; the phase's probe-equivalents are the plan `<verify>` gates and adversarial tooth-checks — all executed above directly. Step 7c: SKIPPED (no declared probe scripts).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| ARCH-01 | 01-01, 01-02 | Sim core pure/framework-free/Node-testable; 3D shell owns the only `three` import | ✓ SATISFIED | Truths 2, 7, 9; permanent fence in tests/boundary.test.js with demonstrated teeth |
| ARCH-02 | 01-01, 01-02 | Single run-reset path; injected rng; dual 0.33 init + inline Math.random gone | ✓ SATISFIED | Truths 5, 8; GATE-4/5/6 pass; determinism pinned |

No orphaned requirements: REQUIREMENTS.md maps exactly ARCH-01/ARCH-02 to Phase 1, both claimed by both plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No TBD/FIXME/XXX/TODO markers in any phase-modified file | ℹ️ Info | clean |
| js/shell.js | 52-64 | WR-04 (from 01-REVIEW, still open in disposition): `holdFrom` not cleared on choose/over release branches | ℹ️ Info (tracked) | latent stale-input edge; next running press overwrites holdFrom — not goal-blocking, already an open review item |

Known open findings factored (not duplicated): WR-01/WR-02/WR-03 are hardener-side bypass vectors of the *detectors* — the current tree genuinely satisfies all three properties they defend (verified directly above); WR-04 above; UI-REVIEW's CDN silent-brick finding is folded into human item 1 (network-tab check during the smoke).

### Human Verification Required

#### 1. Browser full-run smoke (SC-1, SC-4 perceptual half, T-01-SC load verification)

**Test:** Serve the repo (`python3 -m http.server`), open index.html. Devtools Network: `three.module.js` and `three.core.js` both 200. Play one full run idle → running → choose → over; jump with space/tap; watch the obstacle sweep against scoring; restart from over.
**Expected:** WebGL flat-box scene renders; obstacle syncs with skip scoring with no visible drift; HUD shows score/best/status; run restarts cleanly.
**Why human:** Requires a browser + WebGL; headless checks proved the static contract only.

#### 2. Drift-under-load wrap check (SC-4)

**Test:** Devtools CPU throttling 4-6x, play a run, watch the obstacle through the once-per-revolution phase wrap.
**Expected:** Sweep stays forward through the wrap — no snap-back, no scoring desync.
**Why human:** Perceptual smoothness under load; the arithmetic is unit-pinned (naive-lerp injection goes red) but perceived motion needs eyes — carries the INTERPOLATION-NOT-PROVEN flag.

### Gaps Summary

No gaps. Every mechanical half of ROADMAP criteria 1-4 is verified green with empirically re-demonstrated fence teeth; the four pre-existing test files are byte-identical to the phase-start baseline; both ARCH requirements are satisfied and permanently fenced. What remains is the two-item end-of-phase browser UAT that the plans themselves deferred (human_verify_mode=end-of-phase), which is why status is `human_needed`, not `passed`.

---

_Verified: 2026-10-15T12:30:00Z_
_Verifier: the agent (gsd-verifier)_
