---
phase: 02-ps1-presentation-scene
verified: 2026-10-17T03:23:45Z
status: human_needed
score: 8/10 must-haves verified
covered_files:
  - ".planning/phases/02-ps1-presentation-scene/02-01-PLAN.md"
  - ".planning/phases/02-ps1-presentation-scene/02-01-SUMMARY.md"
  - ".planning/phases/02-ps1-presentation-scene/02-02-PLAN.md"
  - ".planning/phases/02-ps1-presentation-scene/02-02-SUMMARY.md"
  - ".planning/phases/02-ps1-presentation-scene/02-03-PLAN.md"
  - ".planning/phases/02-ps1-presentation-scene/02-03-SUMMARY.md"
  - ".planning/spikes/ps1-look.html"
  - "css/style.css"
  - "js/render3d.js"
  - "js/shell.js"
  - "tests/render3d.test.js"
covered_digest: "v3:sha256:667244d2af9e85ac63a784c5b9a63f677ae9bfe5e9d2ef86cb9f11d756338d29"
behavior_unverified: 2
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 7/10
  gaps_closed:
    - "HUD readouts (score/best/prompt) legible per the UI-SPEC color contract — #hud color now #f4f0d8 (CR-01)"
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "Rope-arc readability at ropeMul-modified rope speeds"
    addressed_in: "Phase 3"
    evidence: "Phase 3 (Card Catalogue Realness) introduces the speed cards; plan 02-03's flagged-assumption row records this as a Phase 3 regression check. Default-period readability is this phase's scope and is covered by the end-of-phase UAT."
  - truth: "Letterbox/legibility of the low-res framebuffer at odd window aspect ratios"
    addressed_in: "Phase 5"
    evidence: "02-CONTEXT.md deferred list: 'Letterbox/resize handling of the low-res framebuffer at odd window sizes — Phase 5'; Phase 5 goal covers real-world browser behavior legibility."
  - truth: "prefers-reduced-motion dampening of the vertex wobble"
    addressed_in: "Phase 5"
    evidence: "02-CONTEXT.md deferred list: 'Reduced-motion dampening of the vertex wobble — Phase 5 wires prefers-reduced-motion'; Phase 5 success criterion 2."
behavior_unverified_items:
  - truth: "Rope arrival is readable purely from the frame — the theta = PI <=> feet-at-rest mapping makes the tube's low point land on the feet exactly inside atFeet's 0.45-0.55 window where the score tick fires"
    test: "Serve the repo root, start a run, watch several cycles: the rope's low point must reach the feet on the exact beats where the score increments; also try a trip — the rope must settle at the feet with a short shake then stillness."
    expected: "Visual feet-arrival and score ticks coincide cycle after cycle; the frozen over-branch pose shows the rope resting at the feet."
    why_human: >-
      The mapping is code-present and comment-pinned (js/render3d.js:338-342) but no
      test exercises the running/over pose branches — tests/render3d.test.js drives only
      the idle branch (02-REVIEW.md WR-02), so the theta->rotation->pixels chain that the
      PRES-03 judgment depends on is never executed in CI. A sign or axis error would be
      invisible to all 42 automated tests.
  - truth: "The scene renders correctly at the browser's full window size through a live resize, with no first-frame shader hitch"
    test: "Serve index.html at one small and one large window, resize while playing, and watch page load plus the first space-press that starts a run (optionally with CPU throttling, per the Phase 1 precedent)."
    expected: "Dither pattern stays chunky and moiré-free at both sizes; the frame stays correct during resize; no freeze at load or first press."
    why_human: >-
      The passive resize poll (applyBufferSize) and the two renderer.compile calls are
      present and correctly placed (js/render3d.js:265-278, 291-295), but the poll path is
      never driven by a test (WR-02) and hitch/parity timing is perceptual.
human_verification:
  - test: "PS1 look parity + resize + first-frame — serve repo root, open index.html at one small and one large window; compare against the signed-off spike; resize during play; watch load and first space-press (CPU-throttle pass optional)."
    expected: "Correct brightness (no dark linear-RT frame), spike-identical crawl/dither, no hitch during resize or first press."
    why_human: "Perceptual parity against the approved spike and shader-hitch timing can't be checked by grep; the resize poll path is never test-driven (WR-02)."
  - test: "Rope-feet beat coincidence (PRES-03 bridge) — start a run; the rope's low point must hit the feet on the exact score-tick beats, several cycles running; arms track, legs tuck only airborne, camera never moves."
    expected: "Visual feet-arrival and score ticks coincide cycle after cycle; frozen over-pose rests the rope at the feet."
    why_human: "Running/over pose branches are unexercised in CI (WR-02); a sign/axis error in the theta->pixels chain is invisible to all 42 tests."
  - test: "Stage readability — silhouettes fade into fog without crowding the judgment zone; blob shadow shrinks/fades continuously through a jump; rope stays readable against the floor at both arc extremes."
    expected: "Clean depth cues; nothing crowds the jump-timing read zone."
    why_human: "Judgment-zone legibility and fog falloff are perceptual."
  - test: "Personality and trip — idle screen breathes (bob + slow twirl); scarf trails a beat; a trip drops the rope to the feet with a short shake then stillness; scores unchanged vs Phase 1."
    expected: "Character reads as alive at rest; trip animates and settles; score math unchanged."
    why_human: "Motion feel and determinism-vs-Phase-1 score parity are experiential checks."
  - test: "HUD legibility (regression confirmation) — after commit 2accc65, confirm score/best/prompt are readable over the dark #2a3440 sky."
    expected: "#hud text (#f4f0d8) clearly legible against the dark backdrop; page/canvas edges show the sky hex, no #1a1a2e flash."
    why_human: "Programmatic value now matches the contract, but final rendered contrast is a visual confirmation."
---

# Phase 02: PS1 Presentation & Scene Verification Report

**Phase Goal:** The milestone headline — the game looks authentically PS1 and an original character's rope arrival is readable purely from the frame
**Verified:** 2026-10-17T03:23:45Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (CR-01 fix commit 2accc65)

> **MVP-mode note:** the phase carries `mode: mvp` but the ROADMAP goal is not in
> User Story form (`user-story.validate` → invalid). Per `verify-mvp-mode.md` this is a
> surfaced discrepancy — run `/gsd-mvp-phase 02` to set a User Story goal if a formal
> user-flow UAT script is wanted. Verification proceeded goal-backward; the three PLAN
> objectives *are* well-formed User Stories and anchor the flow table below.

## What Changed Since Last Verification

The sole blocker from the initial report — **CR-01** (`#hud` text `#222` over the dark sky
shipped at `css/style.css:8`, ≈1.26:1 contrast) — was closed by commit **2accc65**
("apply UI-SPEC contract colors — HUD #f4f0d8, page bg sky #2a3440 (CR-01, IN-04)").
That commit is the *only* source change since the prior `verified:` timestamp:

```
2accc65  css/style.css       — #hud color #222 → #f4f0d8 (line 18); html/body bg #1a1a2e → #2a3440 (line 1)
ca0e34a  02-REVIEW-DISPOSITION.md — CR-01/IN-04 triaged to `fixed` in the ledger
e97a014  02-VERIFICATION.md  — prior report
```

`git diff e97a014..HEAD` touches **no** `js/`, `tests/`, `index.html`, or `package.json`
files → no regression surface beyond the CSS fix. Fences (42/42 + 5/5 boundary) re-run green.
The IN-04 info item (foreign `#1a1a2e` page background) was folded into the same commit and
is likewise resolved.

## User Flow Coverage

Derived from the PLAN-level user-story objectives (the ROADMAP goal slot is prose, see note above).

| Step | Expected | Evidence | Status |
| ---- | -------- | -------- | ------ |
| Look | Frame reads authentically PS1: chunky pixels, Bayer crawl, vertex wobble, moody palette | `js/render3d.js:10-66,248-263` full pipeline; human sign-off recorded at the 02-01 checkpoint ("approved", `## Look Decisions` at spike lines 199-234) | ✓ (programmatic + recorded sign-off) |
| Play | The actual game runs through the pipeline at full window size | `js/shell.js:11-13,46` window-sized buffer + resize listener; `js/render3d.js:291-295` passive poll; 42/42 tests | ⚠ live-browser check deferred to UAT |
| See the jumper | Original chibi character (big head, dot-block eyes, rose accent, scarf) animated off the rope-phase clock | `js/render3d.js:130-201` rig built once from primitives; `:300-352` every running-pose quantity derives from `lerpPhase` theta | ✓ |
| Judge the beat | Rope arrival readable purely from the picture (fixed camera, blob shadow, bright arc, feet-sync) | `js/render3d.js:241-246` fixed camera; `:120-128,355-356` Pattern-6 shadow; `:203-235` sag-baked arc; `:338-342` theta⇔feet pin | ⚠ behavior-unverified in CI (see below) |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | PS1-style pipeline (240-row nearest RT → vertex snap → single sRGB-then-Bayer/15-bit pass) ships in `js/render3d.js`, settled by a look-spike on the pinned `three@0.186.1` (SC1) | ✓ VERIFIED | `js/render3d.js:69-78,51-66,27-46,248-263,358-362`; spike URL byte-identical to `index.html:12`; regression: file unchanged since prior verify |
| 2 | Human look sign-off recorded as canonical `## Look Decisions` values, ported verbatim as named constants (SC1, D-01–D-07) | ✓ VERIFIED | Spike lines 199-234; `js/render3d.js:10-21` matches table verbatim; 02-01-SUMMARY records "approved" |
| 3 | Game renders at the browser's full window size, correct through live resize, with precompile so no first-frame freeze (SC4) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Wired: `js/shell.js:11-13,46,109`, `js/render3d.js:265-278` + dual `renderer.compile`; poll path never test-driven (WR-02), hitch/parity perceptual — see behavior_unverified_items |
| 4 | The 2D bar/obstacle model (`worldX`/`CENTER`/`EDGE`/obstacle mesh) is gone from the renderer (D-08) | ✓ VERIFIED | `git grep worldX\|CENTER\|EDGE -- js/render3d.js` → no matches; file unchanged since prior verify |
| 5 | `createScene(canvas) -> { render }` contract still holds, pinned by the extended-stub test with `now` on the sample view | ✓ VERIFIED | `node --test tests/render3d.test.js` 3/3; `now: 0` at line 120; full suite 42/42 re-run green |
| 6 | ARCH-01/ARCH-02 boundary fence green (three only in render3d; IO tokens shell-only; no RNG in renderer) | ✓ VERIFIED | `node --test tests/boundary.test.js` 5/5 re-run green |
| 7 | Original phase-animated chibi character with personality — rig, scarf lag, idle bob/twirl, damped trip settle, all deterministic and status-gated (PRES-02, SC2) | ✓ VERIFIED | `js/render3d.js:130-201,314-335,350-352`; zero `new THREE` inside `render()`; zero RNG; unchanged since prior verify |
| 8 | Rope readable purely from the frame: fixed camera, sag-baked arc with handles, blob-shadow depth cue, theta = PI ⇔ feet at the score tick (PRES-03, SC3) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | All elements present/wired (`:241-246,203-235,355-356`, comment-pin `:338-342`); running/over pose branches unexercised in CI (WR-02) — feet-sync invariant unexercised; see behavior_unverified_items |
| 9 | HUD readouts (score/best/prompt) are legible per the UI-SPEC color contract | ✓ VERIFIED **(gap closed)** | `css/style.css:18` now `color: #f4f0d8` — matches UI-SPEC contract (02-UI-SPEC.md:85,99); `#f4f0d8` on `#2a3440` ≈ 12.9:1. Page/canvas bg `#2a3440` (lines 1,8). CR-01 & IN-04 both `fixed` in ledger (commit 2accc65) |
| 10 | Supply-chain/purity invariants hold: pinned single CDN origin, no addons, no build step, spike quarantined from the shipping graph, WebGL layer never feeds back into sim | ✓ VERIFIED | Spike contains only the pinned URL; `git grep three/addons -- js/` empty; `index.html`/`package.json` byte-untouched through the phase; unchanged since prior verify |

**Score:** 8/10 truths verified (2 present, behavior-unverified)

### Deferred Items

| # | Item | Addressed In | Evidence |
| - | ---- | ------------ | -------- |
| 1 | Rope readability at `ropeMul`-modified speeds | Phase 3 | 02-03 flagged-assumption row; Phase 3 ships the speed cards |
| 2 | Odd-aspect-ratio letterbox handling | Phase 5 | 02-CONTEXT.md deferred list |
| 3 | `prefers-reduced-motion` dampening | Phase 5 | 02-CONTEXT.md deferred list; Phase 5 SC2 |

### Advisory (New Scope, Unevidenced)

None. The only source change since the prior verification is the `css/style.css` gap fix; no new-scope concerns were introduced. Pre-existing warnings (WR-01 unguarded payload reads, IN-03 over-branch squash reset) are unchanged from the initial report and remain advisory — no new deterministic evidence surfaced them.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `.planning/spikes/ps1-look.html` | Throwaway spike with full recipe + `## Look Decisions` | ✓ VERIFIED | 236 lines; all 6 pipeline identifiers present; sign-off table complete |
| `js/render3d.js` | Rebuilt pipeline + rig/rope/stage scene | ✓ VERIFIED | 366 lines; all plan-named internals present; unchanged since prior verify |
| `tests/render3d.test.js` | Extended stub + `now: 0` contract view | ✓ VERIFIED | 3/3 pass; relative-specifier invariant intact |
| `js/shell.js` | Window-sized buffer, resize listener, `now` payload | ✓ VERIFIED | `windowSize()` 11-13; listener 46; `now` in payload 109; unchanged since prior verify |
| `css/style.css` | Full-viewport canvas rule + sky background + **HUD contract color** | ✓ VERIFIED | Canvas rule correct (3-9); `#hud color #f4f0d8` (18) and page/canvas bg `#2a3440` (1,8) now match the UI-SPEC — the prior PARTIAL is resolved |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `js/shell.js frame()` | `scene.render({ run, rope, player, prevPhase, alpha, best, now })` | single call site | ✓ WIRED | `js/shell.js:109` — exactly one call site; `now` is the rAF param, no new IO |
| `js/shell.js` resize | `js/render3d.js` | canvas.width/height property poll only | ✓ WIRED | shell 46 → render3d 291-295; no listener/`window` ref in render3d |
| spike `## Look Decisions` | named constants in `js/render3d.js` | verbatim port | ✓ WIRED | spike 208-221 ↔ render3d 10-21, values match |
| `lerpPhase` theta | rope pivot / arms / scarf | `theta = phase * 2π`, `rotation.z = -theta` | ✓ WIRED | render3d 300-301, 342-344, 350-352 |
| `player.y * WORLD_PER_PIXEL` | rig height, tuck gate, shadow scale+opacity | one mapping, three consumers | ✓ WIRED | render3d 302 → 337, 345, 355-356 |
| `view.now` | idle bob/twirl + trip-shake envelope | cosmetic reads, status-gated | ✓ WIRED | render3d 317-320, 330-331; running branch reads no `view.now` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `js/render3d.js` pose math | `phase`, `playerY`, `squash`, `status` | live shell payload from sim state | Yes — per-frame sim output | ✓ FLOWING |
| `js/render3d.js` cosmetic motion | `view.now` | rAF timestamp (`js/shell.js:88,109`) | Yes — frame clock | ✓ FLOWING |
| HUD text | `run.score` etc. | `updateHud()` DOM writes (`js/shell.js:72-86`) | Yes — now rendered at contract `#f4f0d8` (≈12.9:1) | ✓ FLOWING (CR-01 resolved) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full suite green | `node --test tests/` | 42 tests, 42 pass, 0 fail | ✓ PASS |
| Contract pins on extended stub | `node --test tests/render3d.test.js` | 3/3 pass | ✓ PASS |
| Boundary fence | `node --test tests/boundary.test.js` | 5/5 pass | ✓ PASS |
| HUD contract value | `grep` `css/style.css:18` | `color: #f4f0d8` | ✓ PASS |
| Page/canvas sky hex | `grep` `css/style.css:1,8` | `#2a3440` both | ✓ PASS |
| Gap fix is a valid ancestor | `git merge-base --is-ancestor 2accc65 HEAD` | true | ✓ PASS |
| Documented commits exist | `verify.commits 2accc65 ca0e34a` | all valid | ✓ PASS |
| Regression scope | `git diff e97a014..HEAD` | css + disposition docs only | ✓ PASS (no js/tests touched) |

### Probe Execution

Step: SKIPPED — no `scripts/*/tests/probe-*.sh` exist and the phase declares no runnable probes; the 02-01 decision probe was the spike page itself, verified as artifact + gates + recorded human sign-off.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| PRES-01 | 02-01, 02-02 | PS1-style scene: low internal res, nearest upscale, ordered dither, vertex-snap wobble | ✓ SATISFIED | Truths 1-2, 4-6, 9; browser-parity check rides the UAT |
| PRES-02 | 02-03 | Original low-poly skipping character with personality, phase-clock animated | ✓ SATISFIED | Truth 7; experience check rides the UAT |
| PRES-03 | 02-03 | Rope arrival readable purely from the frame | ⚠️ NEEDS HUMAN | Truth 8 — wired and comment-pinned but the feet-sync invariant is unexercised in CI (WR-02); UAT item above |

No orphaned requirements: REQUIREMENTS.md maps exactly PRES-01/02/03 to Phase 2 and all three appear in plan `requirements:` fields (PRES-01 in 02-01/02-02, PRES-02+03 in 02-03). All IDs accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `css/style.css` | 18 | (was) `#hud color: #222` over dark sky | ✅ RESOLVED | Fixed in 2accc65 → `#f4f0d8` (CR-01 closed) |
| `css/style.css` | 1 | (was) `html, body` background `#1a1a2e` | ✅ RESOLVED | Fixed in 2accc65 → `#2a3440` (IN-04 closed) |
| `js/render3d.js` | 300-307 | `prevPhase`/`view.rope.phase`/sub-objects unguarded vs "coerce at every read" claim | ⚠️ Warning | Hardening gap only — shell always supplies the full payload today (WR-01); unchanged, advisory |
| `js/render3d.js` | 36-39 | Bayer comment says "standard matrix" but GLSL column-major makes it the transpose | ℹ️ Info | Visually identical; matches approved spike bit-for-bit — annotate, don't "fix" (IN-01) |
| `js/render3d.js` | 304-305, 329 | Rig squash scale written unconditionally; `over` branch never resets it | ⚠️ Warning | Game-over screen can freeze mid-squash (IN-03) — Phase 4 owns trip juice (unchanged, advisory) |
| `js/render3d.js` | 319↔342 | Rope pivot orientation teleports on idle→running / over→running | ℹ️ Info | One-frame cosmetic snap at run-start beat (IN-02) — polish candidate |

No TBD/FIXME/XXX markers in any phase-modified file; no stub/empty-data patterns; no `console.log` in the render/shell paths.

### Human Verification Required

No programmatic gaps remain. Five end-of-phase UAT items (per `human_verify_mode=end-of-phase`) plus the two behavior-unverified truths:

1. **PS1 look parity + resize + first-frame** — Serve repo root, open `index.html` at one small and one large window; compare against the signed-off spike; resize during play; watch load and first space-press. Expected: correct brightness, spike-identical crawl/dither, no hitch.
2. **Rope-feet beat coincidence (PRES-03 bridge)** — Start a run; the rope's low point must hit the feet on the exact score-tick beats, several cycles; arms track, legs tuck only airborne, camera never moves.
3. **Stage readability** — Silhouettes fade into fog without crowding the judgment zone; blob shadow shrinks/fades continuously through a jump; rope readable against the floor at both arc extremes.
4. **Personality and trip** — Idle screen breathes (bob + slow twirl); scarf trails a beat; a trip drops the rope to the feet with a short shake then stillness; scores unchanged vs Phase 1.
5. **HUD legibility (regression confirmation)** — Confirm score/best/prompt are readable over the dark `#2a3440` sky now that `#hud` carries the contract `#f4f0d8`.

### Gaps Summary

No blocking gaps remain. The initial report's single blocker, **CR-01** (HUD text at ≈1.26:1 contrast), is closed by commit **2accc65**: `#hud` now carries the UI-SPEC contract value `#f4f0d8` and the page/canvas background is the sky hex `#2a3440` (also retiring the IN-04 foreign-background flash). The fix is the only source change since the prior verification — no `js/`/`tests/` files touched — and the full suite (42/42), boundary fence (5/5), and the HUD contract grep all re-check green. The phase's engineering substance was already delivered; the milestone headline is now unblocked in source. What remains for a human is the perceptual layer: the two behavior-unverified truths (feet-sync rope readability PRES-03, resize/first-frame SC4) plus the four end-of-phase visual UAT checks — none observable by grep because the running/over pose branches and the resize-poll path are unexercised in CI (WR-02).

---

_Verified: 2026-10-17T03:23:45Z_
_Verifier: the agent (gsd-verifier)_
