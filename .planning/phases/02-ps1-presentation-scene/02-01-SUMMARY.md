---
phase: 02-ps1-presentation-scene
plan: 01
subsystem: ui
tags: [threejs, ps1-shader, bayer-dither, vertex-snap, render-target, spike]

requires:
  - phase: 01-render-shell-foundation
    provides: "pinned three@0.186.1 importmap in index.html (byte-identical reuse), createScene render-only boundary"
provides:
  - ".planning/spikes/ps1-look.html — throwaway PS1-look spike proving the full pipeline on the pinned three build"
  - "## Look Decisions section — canonical tuning values (S=2 snap, 31-level Bayer-4x4, fog 7–22, light 2.4, palette hexes) for mechanical port in plan 02-02"
  - "Confirmed onBeforeCompile + customProgramCacheKey snap injection works on three@0.186.1 (no addons/TSL migration needed)"
affects: [02-ps1-presentation-scene render3d scene build, later visual tuning phases]

actuals:
  tokens: 3200
  tasks: 2
  commits: 2
  plan_head_before: 44bf9352a6d8ea653c5faa3d9611bd6ff8d4b732
  plan_head_after: 18c3feb8aa5a0dcdfe5b5fee27c28636874e2b26

tech-stack:
  added: []
  patterns:
    - "Low-res RT pipeline: WebGLRenderTarget(INTERNAL_H=240, NearestFilter, mipmaps off) -> ortho post-quad with sRGB-then-Bayer/quantize single pass"
    - "Screen-space vertex snap via onBeforeCompile after #include <project_vertex>, w preserved, customProgramCacheKey='ps1-snap'"
    - "Dither cell indexed at floor(vUv * uInternalRes) — internal-pixel space, never gl_FragCoord"

key-files:
  created:
    - .planning/spikes/ps1-look.html
  modified: []

key-decisions:
  - "Look sign-off approved as-rendered with zero knob changes: snap S=2 internal px, INTERNAL_H=240, 31-level (~15-bit) Bayer-4x4 floor quantize (standard matrix, A1 confirmed), palette #2a3440 sky / #3a4a42 floor / #1d2630 prop / #c94f6d rose / #f4f0d8 rope, fog 7–22, one white DirectionalLight intensity 2.4 at (-4, 7, 3)"
  - "No ambient fill needed — RESEARCH open question 3 resolved by directional-light intensity alone, keeping D-05 literal"
  - "onBeforeCompile snap injection proven on the pinned build — addons/RetroPassNode migration (T-02-02 escalation path) not triggered"

patterns-established:
  - "Spike-first look settlement: ROADMAP criterion 1's look-spike mandate satisfied with a committed, sign-off-annotated artifact before any shipping file is touched"

requirements-completed: [PRES-01]

coverage:
  - id: D1
    description: "Spike page proves the full PS1 pipeline (240-row Nearest RT -> onBeforeCompile vertex snap -> sRGB-then-Bayer/15-bit single pass) on the exact pinned three@0.186.1 importmap URL, with no second CDN origin and the shipping suite untouched"
    requirement: PRES-01
    verification:
      - kind: other
        ref: "bash: pinned-URL grep gate (index.html URL present, no other CDN host) && pipeline-identifier grep gate (>=6 hits) && node --test tests/ (42/42 green)"
        status: pass
    human_judgment: false
  - id: D2
    description: "PS1 look authenticity sign-off — chunky pixels, Bayer texture, vertex crawl, brightness/palette readability, fog edge, no hitches; canonical values recorded in ## Look Decisions"
    requirement: PRES-01
    verification:
      - kind: manual_procedural
        ref: "checkpoint:human-verify Task 2 — developer browsed the served spike page and responded \"approved\""
        status: pass
    human_judgment: true
    rationale: "Visual authenticity of the PS1 look is an aesthetic judgment; automated gates can only prove the pipeline is wired, not that the frame reads as PS1."

duration: ~15min active (checkpoint wait excluded)
completed: 2026-10-17
status: complete
---

# Phase 02 Plan 01: PS1 Look Spike Summary

**PS1-look recipe proven end-to-end on pinned three@0.186.1 — 240-row Nearest render target, screen-space vertex snap (S=2), and a single sRGB-then-Bayer/15-bit final pass — with a human sign-off recording every canonical tuning value in the spike's `## Look Decisions` section for mechanical porting in plan 02-02.**

## Performance

- **Duration:** ~15 min active work (Task 1 automation + Task 2 sign-off; human checkpoint wait excluded)
- **Started:** 2026-10-17T02:08:46Z
- **Completed:** 2026-10-17T02:16:00Z
- **Tasks:** 2
- **Files modified:** 1 (created)

## Accomplishments
- `.planning/spikes/ps1-look.html` — standalone throwaway spike rendering a continuously rotating probe scene through the complete PS1 pipeline on the exact pinned jsdelivr three@0.186.1 URL (byte-identical to `index.html:12`; no addons entry, no second origin, T-02-01)
- Full pipeline implemented in `createScene` port order: `WebGLRenderer({antialias:false})` pixelRatio 1 → `WebGLRenderTarget(240 rows, NearestFilter, mipmaps off)` → flat-shaded Lambert world materials with `onBeforeCompile` NDC snap (`customProgramCacheKey='ps1-snap'`) → one ortho post-quad applying sRGB encode → Bayer 4×4 → 31-level floor quantize indexed at `floor(vUv * uInternalRes)` → precompile of both scenes
- Developer look sign-off captured at the blocking checkpoint: **"approved"** as rendered, no knob changes; `## Look Decisions` appended inside an HTML comment with concrete values for every knob and explicit "no changes" annotations
- `onBeforeCompile` architecture validated on the pinned build — the T-02-02 addons/`RetroPassNode` escalation was not needed; the bright `MeshBasicMaterial` rope stand-in confirms the snap stays world-only

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the PS1-look spike page** — `c3fae4e` (feat)
2. **Task 2: Look sign-off — record canonical values in ## Look Decisions** — `18c3feb` (docs)

**Plan metadata:** (this plan's docs commit, following)

## Files Created/Modified
- `.planning/spikes/ps1-look.html` - Throwaway PS1 look-spike (never imported by `js/` or `tests/`, D-04): probe scene + full render pipeline + appended `## Look Decisions` sign-off contract consumed verbatim by plan 02-02

## Decisions Made
- All tuning knobs signed off at their committed spike values — snap block S=2 internal px (`uSnapGrid = (internalW/4, 120)`), 31 quantize levels/channel (~15-bit) with the standard 4×4 Bayer matrix (Assumption A1 confirmed), sky `#2a3440` / floor `#3a4a42` / prop `#1d2630` / rose `#c94f6d` / pale `#f4f0d8`, fog near/far 7/22 matched to sky, single white `DirectionalLight` intensity 2.4 at (-4, 7, 3)
- No ambient light: brightness handled via directional intensity alone, keeping D-05 (one directional light, vertex-lit flat Lambert) literal — resolves RESEARCH open question 3
- Floor calmness kept via geometry sparsity (single 40×12 quad) rather than a weakened snap, per Pitfall 7

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Checkpoint continuation: the `## Look Decisions` append and plan close-out were completed by the continuation agent after the human "approved" response; the recorded values are the committed Task-1 values verbatim, matching what was approved on screen.
- `node --test tests/` was green (42/42) before and after the plan; `git diff 44bf935..HEAD` confirms `.planning/spikes/ps1-look.html` is the only file touched — nothing under `js/`, `tests/`, `css/`, or `index.html` changed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 02-02 can port the recipe into `js/render3d.js` mechanically: the `## Look Decisions` table in the spike is the complete numeric contract (no browser needed).
- Precompile-during-idle (ROADMAP criterion 4) still needs wiring in the shipping shell — the spike proves the `renderer.compile` pattern for both scenes.
- STATE blocker "onBeforeCompile chunk names unverified against three@0.186.1" is now resolved — the anchor was proven working in the spike.

---
*Phase: 02-ps1-presentation-scene*
*Completed: 2026-10-17*

## Self-Check: PASSED

- `.planning/spikes/ps1-look.html` exists with `## Look Decisions` section
- Commits c3fae4e, 18c3feb confirmed ancestors of HEAD
