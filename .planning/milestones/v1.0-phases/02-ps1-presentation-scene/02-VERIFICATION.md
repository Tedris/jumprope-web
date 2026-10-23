---
phase: 02-ps1-presentation-scene
verified: 2026-10-17T04:15:28Z
status: passed
score: 10/10 must-haves verified
covered_files:
  - ".planning/phases/02-ps1-presentation-scene/02-01-PLAN.md"
  - ".planning/phases/02-ps1-presentation-scene/02-01-SUMMARY.md"
  - ".planning/phases/02-ps1-presentation-scene/02-02-PLAN.md"
  - ".planning/phases/02-ps1-presentation-scene/02-02-SUMMARY.md"
  - ".planning/phases/02-ps1-presentation-scene/02-03-PLAN.md"
  - ".planning/phases/02-ps1-presentation-scene/02-03-SUMMARY.md"
  - ".planning/phases/02-ps1-presentation-scene/02-UI-SPEC.md"
  - ".planning/spikes/ps1-look.html"
  - "css/style.css"
  - "js/render3d.js"
  - "js/shell.js"
  - "tests/render3d.test.js"
covered_digest: "v3:sha256:b48d692729c47fb445d06b8bda6100e5bf133d9391c614d18511023c63023e7b"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 8/10
  gaps_closed:
    - "Rope arrival readable purely from the frame (PRES-03/SC3) — theta⇔feet behavior human-verified by the user-passed rope-feet beat-coincidence UAT check on commit bbf09f0; root-cause fixes e2a03d2 (toSRGB decode→encode) + 51c1348/bbf09f0 (rope re-axed to hands-axis forward sweep with hand-to-hand arc) landed first"
    - "Full-window-size render through live resize, no first-frame hitch (SC4) — human-verified by the user-passed look-parity/resize/hitch UAT check on commit bbf09f0"
    - "End-of-phase visual UAT (look parity, stage readability, personality + trip, HUD legibility) — all four checks PASSED by the user on the deployed GitHub Pages build; sign-off recorded in 02-UI-SPEC.md '## UAT Amendment (2026-10-17)'"
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "Rope-arc readability at ropeMul-modified rope speeds"
    addressed_in: "Phase 3"
    evidence: "Phase 3 (Card Catalogue Realness) introduces the speed cards; plan 02-03's flagged-assumption row records this as a Phase 3 regression check. Default-period readability is this phase's scope and was covered by the passed end-of-phase UAT."
  - truth: "Letterbox/legibility of the low-res framebuffer at odd window aspect ratios"
    addressed_in: "Phase 5"
    evidence: "02-CONTEXT.md deferred list: 'Letterbox/resize handling of the low-res framebuffer at odd window sizes — Phase 5'; Phase 5 goal covers real-world browser behavior legibility."
  - truth: "prefers-reduced-motion dampening of the vertex wobble"
    addressed_in: "Phase 5"
    evidence: "02-CONTEXT.md deferred list: 'Reduced-motion dampening of the vertex wobble — Phase 5 wires prefers-reduced-motion'; Phase 5 success criterion 2."
advisory:
  - finding: "WR-02 CI coverage gap — running/over pose branches and the resize-poll path are still exercised by no automated test"
    category: other
    reason: "Pre-existing recommendation, not a blocker: the behavior it hid was closed by the user-passed UAT (beat coincidence + resize/first-frame checks on bbf09f0). A render-pose regression test remains a worthwhile follow-up so a future sign/axis error cannot ship silently."
    evidence_status: "none provided"
---

# Phase 02: PS1 Presentation & Scene Verification Report

**Phase Goal:** The milestone headline — the game looks authentically PS1 and an original character's rope arrival is readable purely from the frame
**Verified:** 2026-10-17T04:15:28Z
**Status:** passed
**Re-verification:** Yes — after gap closure (UAT complete + root-cause fixes through commit bbf09f0)

> **MVP-mode note (carried):** the phase carries `mode: mvp` but the ROADMAP goal is not in
> User Story form (`user-story.validate` → invalid). Verification proceeded goal-backward; the
> three PLAN objectives *are* well-formed User Stories and anchor the flow table below.

## What Changed Since Last Verification

Since the prior `human_needed` report, four source commits and the UAT sign-off landed:

```
a44fbc8  js/render3d.js  — UAT look pass (light/fog/limbs round; later reverted as misdiagnosis)
e2a03d2  js/render3d.js  — toSRGB was the sRGB DECODE formula — every pixel crushed toward black
51c1348  js/render3d.js  — rope sweeps about the hands axis, not the screen axis
bbf09f0  js/render3d.js  — rope sweeps forward over the head (rotation.x = +theta, camera at +Z)
eeb1288  02-UI-SPEC.md   — UAT Amendment: all four checks PASSED on deployed build at bbf09f0
```

`git diff 086f600..HEAD` (prior verify → now) touches only `js/render3d.js`, the spike page, and
the UI-SPEC amendment doc — `shell.js`, `interpolate.js`, `css/style.css`, and all `tests/` are
untouched. Full suite re-run green. The two previously behavior-unverified truths are now closed
by recorded human verification; the CR-01-era CSS fix is unchanged.

## User Flow Coverage

| Step | Expected | Evidence | Status |
| ---- | -------- | -------- | ------ |
| Look | Frame reads authentically PS1: chunky pixels, Bayer crawl, vertex wobble, moody palette | `js/render3d.js:10-66,264-280` full pipeline with **correct** sRGB encode (`:43-44`); user-approved on deployed build at bbf09f0 (02-UI-SPEC.md UAT Amendment) | ✓ VERIFIED (human UAT) |
| Play | The actual game runs through the pipeline at full window size, resize-safe, hitch-free | `js/shell.js:11-13,46` window-sized buffer + resize listener; `js/render3d.js` precompile pair; user-passed resize/first-frame UAT check | ✓ VERIFIED (human UAT) |
| See the jumper | Original chibi character animated off the rope-phase clock | `js/render3d.js:130-215` rig built once from primitives; every pose quantity derives from `lerpPhase` theta; user-passed personality UAT check | ✓ VERIFIED |
| Judge the beat | Rope arrival readable purely from the picture (fixed camera, blob shadow, bright arc, feet-sync) | Fixed camera `:257-262`; shadow `:376-377`; unlit pale arc `:239-243`; hands-axis forward sweep `:362` with theta=π⇔feet pin `:356-361`; user-passed beat-coincidence UAT check | ✓ VERIFIED (human UAT) |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | PS1-style pipeline (240-row nearest RT → vertex snap → single sRGB-then-Bayer/15-bit pass) ships in `js/render3d.js`, settled by a look-spike on the pinned `three@0.186.1` (SC1) | ✓ VERIFIED | `js/render3d.js:69-78,43-46,53-56,264-280,379-383`; the pass is the **correct encode** now (`1.055*pow(c,1/2.4)-0.055`, linear-segment mix at 0.0031308) — the crushed-black DECODE bug is gone; user approved brightness/parity on bbf09f0 |
| 2 | Human look sign-off recorded as canonical values, ported as named constants; amended values supersede the spike table where the UAT Amendment says so (SC1, D-01–D-07) | ✓ VERIFIED | Constants `:10-31` match the spike `## Look Decisions` table (240/S2/hexes/fog 7-22/light 2.4) **and** the amended contract (UAT Amendment row 4: look knobs reverted to spike values); spike byte-parity on the pinned URL |
| 3 | Game renders at the browser's full window size, correct through live resize, with precompile so no first-frame freeze (SC4) | ✓ VERIFIED (human-verified) | Wiring unchanged since prior verify (`js/shell.js:11-13,46`; passive poll + dual `renderer.compile` in render3d); resize/first-frame UAT check **passed by the user** on the deployed build at bbf09f0 (02-UI-SPEC.md UAT Amendment) |
| 4 | The 2D bar/obstacle model (`worldX`/`CENTER`/`EDGE`/obstacle mesh) is gone from the renderer (D-08) | ✓ VERIFIED | `grep -E "worldX\|CENTER\|EDGE" js/render3d.js` → no matches |
| 5 | `createScene(canvas) -> { render }` contract still holds, pinned by the extended-stub test with `now` on the sample view | ✓ VERIFIED | `node --test tests/render3d.test.js` 3/3; full suite 42/42 re-run green |
| 6 | ARCH-01/ARCH-02 boundary fence green (three only in render3d; IO tokens shell-only; no RNG in renderer) | ✓ VERIFIED | `node --test tests/boundary.test.js` 5/5; render3d imports only `three` + `./interpolate.js`; zero `Math.random`/`Date`/rAF/storage tokens |
| 7 | Original phase-animated chibi character with personality — rig, scarf lag, idle bob/twirl, damped trip settle, all deterministic and status-gated (PRES-02, SC2) | ✓ VERIFIED | `js/render3d.js:130-215,326-353,371-373`; zero `new THREE` inside `render()`; trip settle closed-form in `view.now` deltas (`:347-348`); user-passed personality/trip UAT check |
| 8 | Rope readable purely from the frame: fixed camera, sag-baked hand-to-hand arc sweeping the hands axis, blob-shadow depth cue, theta = π ⇔ feet at the score tick (PRES-03, SC3) | ✓ VERIFIED (human-verified) | Forward sweep `ropePivot.rotation.x = theta` (`:362`); geometry math holds — curve bulge at local +Y, `R_x(π)` maps +Y→−Y, so tube low point lands at the feet inside atFeet's 0.45–0.55 window (`:216-233,356-361`); handles at ±0.5 with hands out to grips (`:190-197,245-251`); fixed camera never touched (`:257-262`); user-passed rope-feet beat-coincidence UAT check on bbf09f0 |
| 9 | HUD readouts (score/best/prompt) legible per the UI-SPEC color contract | ✓ VERIFIED | `css/style.css` unchanged since the CR-01 fix (2accc65): `#hud #f4f0d8` on `#2a3440` ≈ 12.9:1; HUD-legibility UAT check **passed by the user** |
| 10 | Supply-chain/purity invariants hold: pinned single CDN origin, no addons, no build step, spike quarantined, WebGL layer never feeds back into sim | ✓ VERIFIED | Pinned URL byte-identical `index.html:12` ↔ spike; `git grep three/addons -- js/` empty; zero view/run field mutations in render3d; `index.html`/`package.json` untouched |

**Score:** 10/10 truths verified (0 present, behavior-unverified — the two prior ones closed by recorded human UAT sign-off)

### Deferred Items

| # | Item | Addressed In | Evidence |
| - | ---- | ------------ | -------- |
| 1 | Rope readability at `ropeMul`-modified speeds | Phase 3 | 02-03 flagged-assumption row; Phase 3 ships the speed cards |
| 2 | Odd-aspect-ratio letterbox handling | Phase 5 | 02-CONTEXT.md deferred list |
| 3 | `prefers-reduced-motion` dampening | Phase 5 | 02-CONTEXT.md deferred list; Phase 5 SC2 |

### Advisory (New Scope, Unevidenced)

| # | Finding | Category | Why Advisory |
| - | ------- | -------- | ------------ |
| 1 | WR-02: running/over pose branches + resize-poll path still have no automated test | other | Pre-existing recommendation. The behavior it hid is closed by the user-passed UAT on bbf09f0; a render-pose regression test would prevent a future silent sign/axis error. Not a blocker. |

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `.planning/spikes/ps1-look.html` | Throwaway spike + `## Look Decisions` | ✓ VERIFIED | Sign-off table intact; pinned URL byte-identical; quarantined from `js/`/`tests/` |
| `js/render3d.js` | Rebuilt pipeline + rig/rope/stage scene, amended rope axis + sRGB encode | ✓ VERIFIED | 387 lines; all plan-named internals present; amended-contract values in place (see Truths 1, 2, 8) |
| `tests/render3d.test.js` | Extended stub + `now: 0` contract view | ✓ VERIFIED | 3/3 pass; untouched since prior verify |
| `js/shell.js` | Window-sized buffer, resize listener, `now` payload | ✓ VERIFIED | Untouched since prior verify |
| `css/style.css` | Full-viewport canvas + sky background + HUD contract color | ✓ VERIFIED | Untouched since the CR-01/IN-04 fix (2accc65) |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `js/shell.js frame()` | `scene.render({ run, rope, player, prevPhase, alpha, best, now })` | single call site | ✓ WIRED | shell untouched since prior verify; one call site |
| `js/shell.js` resize | `js/render3d.js` | canvas.width/height poll only | ✓ WIRED | no listener/`window` ref in render3d |
| spike/amended look contract | named constants in `js/render3d.js` | verbatim port + recorded amendment | ✓ WIRED | spike table ↔ `:10-31`; deltas limited to the signed-off UAT Amendment rows |
| `lerpPhase` theta | rope pivot / arms / scarf | `theta = phase * 2π`, `rotation.x = +theta` (hands-axis forward sweep) | ✓ WIRED | render3d 300-301, 362-365, 371-373 — axis updated per amendment, still single-clock |
| `player.y * WORLD_PER_PIXEL` | rig height, tuck gate, shadow scale+opacity | one mapping, three consumers | ✓ WIRED | render3d 355 → 366-368, 376-377 |
| `view.now` | idle bob/twirl + trip-shake envelope | cosmetic reads, status-gated | ✓ WIRED | render3d 326-335, 347-348; running branch reads no `view.now` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `js/render3d.js` pose math | `phase`, `playerY`, `squash`, `status` | live shell payload from sim state | Yes — per-frame sim output | ✓ FLOWING |
| `js/render3d.js` cosmetic motion | `view.now` | rAF timestamp (`js/shell.js`) | Yes — frame clock | ✓ FLOWING |
| HUD text | `run.score` etc. | `updateHud()` DOM writes (`js/shell.js`) | Yes — contract `#f4f0d8` (≈12.9:1) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full suite green | `node --test tests/` | 42 tests, 42 pass, 0 fail | ✓ PASS |
| Contract pins on extended stub | `node --test tests/render3d.test.js` | 3/3 pass | ✓ PASS |
| Boundary fence | `node --test tests/boundary.test.js` | 5/5 pass | ✓ PASS |
| sRGB encode formula | `grep toSRGB js/render3d.js` | `1.055 * pow(c, 1/2.4) - 0.055` | ✓ PASS |
| Rope sweep axis | `grep rotation.x js/render3d.js` | running branch `ropePivot.rotation.x = theta` | ✓ PASS |
| Amended look knobs reverted | grep `LOOK_KNOB` defaults | fog 7/22, light 2.4, fov 40 | ✓ PASS |
| UAT sign-off commit is ancestor | `git merge-base --is-ancestor bbf09f0 HEAD` | true | ✓ PASS |
| Regression scope | `git diff --stat 086f600..HEAD` | render3d.js + spike + UI-SPEC docs only | ✓ PASS (shell/css/tests untouched) |

### Probe Execution

Step: SKIPPED — no `scripts/*/tests/probe-*.sh` exist and the phase declares no runnable probes; the 02-01 decision probe was the spike page itself, verified as artifact + gates + recorded human sign-off (now extended by the deployed-build UAT sign-off).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| PRES-01 | 02-01, 02-02 | PS1-style scene: low internal res, nearest upscale, ordered dither, vertex-snap wobble | ✓ SATISFIED | Truths 1-6, 9-10; browser-parity human-checked and passed on bbf09f0 |
| PRES-02 | 02-03 | Original low-poly skipping character with personality, phase-clock animated | ✓ SATISFIED | Truth 7; personality UAT check passed |
| PRES-03 | 02-03 | Rope arrival readable purely from the frame | ✓ SATISFIED | Truth 8 — code math coherently re-derived for the hands-axis sweep **and** beat-coincidence UAT check passed by the user |

No orphaned requirements: REQUIREMENTS.md maps exactly PRES-01/02/03 to Phase 2 and all three appear in plan `requirements:` fields (PRES-01 in 02-01/02-02, PRES-02+03 in 02-03). All IDs accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `js/render3d.js` | ~300-307 | `prevPhase`/`view.rope.phase`/sub-objects unguarded vs "coerce at every read" claim | ⚠️ Warning | Hardening gap only — shell always supplies the full payload today (WR-01); unchanged, advisory |
| `js/render3d.js` | 46 | Bayer comment "standard 4x4 matrix"; GLSL column-major makes it the transpose | ℹ️ Info | Visually identical; matches approved pipeline — annotate, don't "fix" (IN-01) |
| `js/render3d.js` | over branch | Rig squash scale not reset on game-over | ⚠️ Warning | Over screen can freeze mid-squash (IN-03) — Phase 4 owns trip juice; unchanged, advisory |
| `js/render3d.js` | 22-29 | `?light=&fogNear=&fogFar=` live-tuning hook added during UAT | ℹ️ Info | Browser-only, `Number`-coerced, Node/tests take shipped defaults; boundary fence green. Could be trimmed post-UAT; harmless as-is |

No TBD/FIXME/XXX markers in any phase-modified file; no stub/empty-data patterns; no `console.log` in the render/shell paths.

### Gaps Summary

No gaps. Both items that held the prior report at `human_needed` are closed by recorded human
verification on the deployed GitHub Pages build at commit **bbf09f0**, and each had a real
root-cause fix in source first: (1) the final pass carried the sRGB **decode** formula, crushing
every pixel toward black — corrected to the proper encode in e2a03d2; (2) the rope spun in the
screen plane (static circle silhouette) — re-axed to a hands-axis forward sweep
(`rotation.x = +theta`) with hand-to-hand arc geometry in 51c1348/bbf09f0. The theta = π ⇔ feet
mapping re-derived cleanly under the new axis (bulge at curve-local +Y; `R_x(π)` maps +Y→−Y),
and the user-passed beat-coincidence check confirms the visual-feet/score-tick alignment that CI
cannot see (WR-02 remains as a coverage recommendation, not a blocker). All 42 tests, the
contract-pin suite, the boundary fence, and every supply-chain/purity prohibition re-check green.

---

_Verified: 2026-10-17T04:15:28Z_
_Verifier: the agent (gsd-verifier)_
