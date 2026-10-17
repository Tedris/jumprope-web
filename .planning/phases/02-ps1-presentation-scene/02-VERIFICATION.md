---
phase: 02-ps1-presentation-scene
verified: 2026-10-17T03:19:04Z
status: gaps_found
score: 7/10 must-haves verified
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
covered_digest: "v3:sha256:1e4fbd73fb114e8447e2040ce7d5a78f3318cca781dc0477bb17f3338b897a43"
behavior_unverified: 2
overrides_applied: 0
gaps:
  - truth: "Player can read the score / best / prompt HUD text on screen (UI-SPEC Typography contract: #hud color #f4f0d8)"
    status: failed
    reason: >-
      Plan 02-02 shipped the dark sky background half of the UI-SPEC color change
      (canvas/page background -> #2a3440, css/style.css:8) but left #hud at
      color: #222 (css/style.css:18) — contrast ~1.26:1, so score, best, and the
      "press space / tap to start" prompt are effectively invisible. 02-UI-SPEC.md
      explicitly directs the checker to treat this as a documented visible defect,
      not a silent pass; 02-REVIEW.md CR-01 (critical) confirms it and the
      disposition is still `open`. The sky-color sweep is also incomplete in
      `html, body` (#1a1a2e, IN-04).
    artifacts:
      - path: "css/style.css"
        issue: "line 18 `color: #222` clashes with the dark backdrop introduced at line 8; line 1 body background #1a1a2e is a foreign color vs the sky-hex contract"
      - path: ".planning/phases/02-ps1-presentation-scene/02-UI-SPEC.md"
        issue: "binds #hud { color: #f4f0d8 } (lines 83-88) — shipped background half without the paired text half"
    missing:
      - "#hud color: #f4f0d8 (UI-SPEC contract value, one-line change)"
      - "html/body background -> #2a3440 (IN-04, same root concern)"
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
---

# Phase 02: PS1 Presentation & Scene Verification Report

**Phase Goal:** The milestone headline — the game looks authentically PS1 and an original character's rope arrival is readable purely from the frame
**Verified:** 2026-10-17T03:19:04Z
**Status:** gaps_found
**Re-verification:** No — initial verification

> **MVP-mode note:** the phase carries `mode: mvp` but the ROADMAP goal is not in
> User Story form (`user-story.validate` → invalid). Per `verify-mvp-mode.md` this is a
> surfaced discrepancy — run `/gsd-mvp-phase 02` to set a User Story goal if a formal
> user-flow UAT script is wanted. Verification proceeded goal-backward; the three PLAN
> objectives *are* well-formed User Stories and anchor the flow table below.

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
| 1 | PS1-style pipeline (240-row nearest RT → vertex snap → single sRGB-then-Bayer/15-bit pass) ships in `js/render3d.js`, settled by a look-spike on the pinned `three@0.186.1` (SC1) | ✓ VERIFIED | `js/render3d.js:69-78,51-66,27-46,248-263,358-362`; spike URL byte-identical to `index.html:12` (gate exit 0, no second CDN host); spike artifact 236 lines, substantive |
| 2 | Human look sign-off recorded as canonical `## Look Decisions` values, ported verbatim as named constants (SC1, D-01–D-07) | ✓ VERIFIED | Spike lines 199-234 (all knobs concrete, "no changes" explicit); `js/render3d.js:10-21` matches table verbatim (240, S=2, hexes, fog 7/22, light 2.4 @ (-4,7,3)); 02-01-SUMMARY records "approved" |
| 3 | Game renders at the browser's full window size, correct through live resize, with precompile so no first-frame freeze (SC4) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Wired: `js/shell.js:11-13,46,109`, `js/render3d.js:265-278` + dual `renderer.compile` at 277-278; but the poll path is never test-driven (WR-02) and hitch/parity is perceptual — see behavior_unverified_items |
| 4 | The 2D bar/obstacle model (`worldX`/`CENTER`/`EDGE`/obstacle mesh) is gone from the renderer (D-08) | ✓ VERIFIED | `git grep worldX\|CENTER\|EDGE -- js/render3d.js` → no matches |
| 5 | `createScene(canvas) -> { render }` contract still holds, pinned by the extended-stub test with `now` on the sample view | ✓ VERIFIED | `tests/render3d.test.js` 3/3 pass; `now: 0` at line 120; full suite 42/42 |
| 6 | ARCH-01/ARCH-02 boundary fence green (three only in render3d; IO tokens shell-only; no RNG in renderer) | ✓ VERIFIED | `node --test tests/boundary.test.js` 5/5; IO-token grep on `js/render3d.js` empty; `Math.random`/mixer/loader greps empty |
| 7 | Original phase-animated chibi character with personality — rig, scarf lag, idle bob/twirl, damped trip settle, all deterministic and status-gated (PRES-02, SC2) | ✓ VERIFIED | `js/render3d.js:130-201` rig; `:314-335` idle/over branches; `:350-352` scarf lag `beat - k*0.4`; zero `new THREE` inside `render()`; `view.now` reads confined to idle/over branches; zero RNG; `0.33` literal still unique to `js/game.js` |
| 8 | Rope readable purely from the frame: fixed camera, sag-baked arc with handles, blob-shadow depth cue, theta = PI ⇔ feet at the score tick (PRES-03, SC3) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | All elements present and wired (`:241-246`, `:203-235`, `:355-356`, comment-pin at `:338-342`); shadow formulas match Pattern 6 verbatim; but no test executes the running/over pose branches (WR-02) — the feet-sync invariant is unexercised; see behavior_unverified_items |
| 9 | HUD readouts (score/best/prompt) are legible per the UI-SPEC color contract | ✗ FAILED | `css/style.css:18` `color: #222` vs the `#2a3440` backdrop shipped at line 8 → ≈1.26:1 contrast; UI-SPEC binds `#hud { color: #f4f0d8 }` (02-UI-SPEC.md:85) and forbids a silent pass; CR-01 critical, disposition `open` |
| 10 | Supply-chain/purity invariants hold: pinned single CDN origin, no addons, no build step, spike quarantined from the shipping graph, WebGL layer never feeds back into sim | ✓ VERIFIED | Spike contains only the pinned URL (gate exit 0); `git grep three/addons -- js/` empty; `index.html`/`package.json` byte-untouched through the phase; only `three` + `./interpolate.js` imported by `js/render3d.js`; spike referenced from `js/` only in a comment; no view-field writes in the render path |

**Score:** 7/10 truths verified (2 present, behavior-unverified)

### Deferred Items

| # | Item | Addressed In | Evidence |
| - | ---- | ------------ | -------- |
| 1 | Rope readability at `ropeMul`-modified speeds | Phase 3 | 02-03 flagged-assumption row; Phase 3 ships the speed cards |
| 2 | Odd-aspect-ratio letterbox handling | Phase 5 | 02-CONTEXT.md deferred list |
| 3 | `prefers-reduced-motion` dampening | Phase 5 | 02-CONTEXT.md deferred list; Phase 5 SC2 |

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `.planning/spikes/ps1-look.html` | Throwaway spike with full recipe + `## Look Decisions` | ✓ VERIFIED | 236 lines; all 6 pipeline identifiers present (gate exit 0); sign-off table complete |
| `js/render3d.js` | Rebuilt pipeline + rig/rope/stage scene | ✓ VERIFIED | 366 lines; all plan-named internals present (`INTERNAL_H`, `applyVertexSnap`, `uSnapGrid`, `uInternalRes`, `bayer4`, `toSRGB`, `postScene`/`postCamera`/`ditherMat`, rig tree, `ropePivot`, shadow, silhouettes) |
| `tests/render3d.test.js` | Extended stub + `now: 0` contract view | ✓ VERIFIED | Stub covers the full Phase-2 surface incl. Plan-03 symbols; 3/3 pass; relative-specifier invariant intact |
| `js/shell.js` | Window-sized buffer, resize listener, `now` payload | ✓ VERIFIED | `windowSize()` 11-13; listener at 46; `now` in payload at 109; try/catch isolation unchanged (108-112) |
| `css/style.css` | Full-viewport canvas rule + sky background | ⚠️ PARTIAL | Canvas rule correct (3-9, no aspect-ratio/max-height); but the paired `#hud` text color was not shipped (Truth 9 gap) |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `js/shell.js frame()` | `scene.render({ run, rope, player, prevPhase, alpha, best, now })` | single call site | ✓ WIRED | `js/shell.js:109` — exactly one call site; `now` is the rAF param, no new IO |
| `js/shell.js` resize | `js/render3d.js` | canvas.width/height property poll only | ✓ WIRED | shell 46 → render3d 291-295; no listener or `window` reference in render3d |
| spike `## Look Decisions` | named constants in `js/render3d.js` | verbatim port | ✓ WIRED | spike 208-221 ↔ render3d 10-21, values match |
| `lerpPhase` theta | rope pivot / arms / scarf | `theta = phase * 2π`, `rotation.z = -theta` | ✓ WIRED | render3d 300-301, 342-344, 350-352; convention comment cites `rope.js:11-13` |
| `player.y * WORLD_PER_PIXEL` | rig height, tuck gate, shadow scale+opacity | one mapping, three consumers | ✓ WIRED | render3d 302 → 337, 345, 355-356 |
| `view.now` | idle bob/twirl + trip-shake envelope | cosmetic reads, status-gated | ✓ WIRED | render3d 317-320, 330-331; running branch reads no `view.now` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `js/render3d.js` pose math | `phase`, `playerY`, `squash`, `status` | live shell payload from `game.js`/`rope.js`/`player.js` sim state | Yes — per-frame sim output | ✓ FLOWING |
| `js/render3d.js` cosmetic motion | `view.now` | rAF timestamp (`js/shell.js:88,109`) | Yes — frame clock | ✓ FLOWING |
| HUD text | `run.score` etc. | `updateHud()` DOM writes (`js/shell.js:72-86`) | Yes — but rendered at ≈1.26:1 contrast | ⚠️ STATIC-VISUAL (see CR-01 gap) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full suite green | `node --test tests/` | 42 tests, 42 pass, 0 fail | ✓ PASS |
| Contract pins on extended stub | `node --test tests/render3d.test.js` | 3/3 pass | ✓ PASS |
| Boundary fence | `node --test tests/boundary.test.js` | 5/5 pass | ✓ PASS |
| Spike pinned-URL gate | URL-identity + second-host grep | exit 0 | ✓ PASS |
| Spike pipeline-identifier gate | ≥6 identifier hits | exit 0 | ✓ PASS |
| IO-token gate on render3d.js | git grep performance/Date/rAF/localStorage/document | no matches | ✓ PASS |
| No per-frame geometry | `new THREE` inside `render()` window | 0 matches; single `TubeGeometry` site | ✓ PASS |
| Dual rope-init literal | `git grep -c "0[.]33" -- js/` | only `js/game.js:1` | ✓ PASS |
| Documented commits exist | `verify.commits` × 7 | all valid ancestors | ✓ PASS |

### Probe Execution

Step: SKIPPED — no `scripts/*/tests/probe-*.sh` exist and the phase declares no runnable probes; the 02-01 decision probe was the spike page itself, verified as artifact + gates + recorded human sign-off.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| PRES-01 | 02-01, 02-02 | PS1-style scene: low internal res, nearest upscale, ordered dither, vertex-snap wobble | ✓ SATISFIED | Truths 1-2, 4-6 above; browser-parity check rides the UAT |
| PRES-02 | 02-03 | Original low-poly skipping character with personality, phase-clock animated | ✓ SATISFIED | Truth 7; experience check rides the UAT |
| PRES-03 | 02-03 | Rope arrival readable purely from the frame | ⚠️ NEEDS HUMAN | Truth 8 — wired and comment-pinned but the feet-sync invariant is unexercised in CI (WR-02); UAT item below |

No orphaned requirements: REQUIREMENTS.md maps exactly PRES-01/02/03 to Phase 2 and all three appear in plan `requirements:` fields.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `css/style.css` | 18 | `#hud color: #222` over dark sky shipped by this phase | 🛑 Blocker | Core readouts + start prompt effectively invisible (CR-01; UI-SPEC forbids silent pass) — the phase gap |
| `css/style.css` | 1 | `html, body` background `#1a1a2e` vs sky-hex contract | ℹ️ Info | Foreign flash on overscroll/init (IN-04); bundle into the one-line fix above |
| `js/render3d.js` | 300-307 | `prevPhase`/`view.rope.phase`/sub-objects unguarded vs the "coerce at every read" claim | ⚠️ Warning | Hardening gap only — the shell always supplies the full payload today (WR-01) |
| `js/render3d.js` | 36-39 | Bayer comment says "standard matrix" but GLSL column-major makes it the transpose | ℹ️ Info | Visually identical; matches the approved spike bit-for-bit — annotate, don't "fix" (IN-01) |
| `js/render3d.js` | 304-305, 329 | Rig squash scale written unconditionally; `over` branch never resets it | ⚠️ Warning | Game-over screen can freeze mid-squash (IN-03) — Phase 4 owns trip juice, but the settle pose is this phase's |
| `js/render3d.js` | 319↔342 | Rope pivot orientation teleports on idle→running / over→running | ℹ️ Info | One-frame cosmetic snap at the run-start beat (IN-02) — polish candidate |

No TBD/FIXME/XXX markers in any phase-modified file; no stub/empty-data patterns; no `console.log` in the render/shell paths.

### Human Verification Required

The four end-of-phase UAT items deferred by the plans (per `human_verify_mode=end-of-phase`) plus the two behavior-unverified truths:

1. **PS1 look parity + resize + first-frame** — Serve repo root, open `index.html` at one small and one large window; compare against the signed-off spike; resize during play; watch load and first space-press (CPU-throttle pass optional). Expected: correct brightness (no dark linear-RT frame), spike-identical crawl/dither, no hitch.
2. **Rope-feet beat coincidence (PRES-03 bridge)** — Start a run; the rope's low point must hit the feet on the exact score-tick beats, several cycles running; arms track, legs tuck only airborne, camera never moves.
3. **Stage readability** — Silhouettes fade into fog without crowding the judgment zone; blob shadow shrinks/fades continuously through a jump; rope stays readable against the floor at both arc extremes.
4. **Personality and trip** — Idle screen breathes (bob + slow twirl); scarf trails a beat; a trip drops the rope to the feet with a short shake then stillness; scores unchanged vs Phase 1.
5. **HUD legibility (after the gap fix)** — Confirm score/best/prompt are readable over the dark sky once `#hud` gets the contract color.

### Gaps Summary

The phase's engineering substance is genuinely delivered: the full PS1 pipeline ports the signed-off spike recipe verbatim into the shipping renderer, the original phase-animated rig and rotating rope arc are real, deterministic, and boundary-fenced, and all 42 tests + fences are green with every documented commit verified. One blocker stands between this and goal-complete: **plan 02-02 shipped the dark sky background without the paired `#hud` text color**, leaving the game's core readouts at ≈1.26:1 contrast — a defect the phase's own UI-SPEC explicitly says must not be silently passed, and CR-01 in the (still untriaged) code review. The fix is one CSS line (`#hud { color: #f4f0d8 }`), plus the `html, body` background for completeness. Two perceptual invariants (feet-sync readability, resize/hitch correctness) are present and wired but unexercised by CI — they are routed to the end-of-phase UAT rather than counted as gaps.

---

_Verified: 2026-10-17T03:19:04Z_
_Verifier: the agent (gsd-verifier)_
