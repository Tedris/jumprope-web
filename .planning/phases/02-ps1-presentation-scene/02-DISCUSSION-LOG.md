# Phase 2: PS1 Presentation & Scene - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-16
**Phase:** 02-ps1-presentation-scene
**Areas discussed:** PS1 look pipeline, 3D rope geometry, Character build & animation, Camera/stage/depth cues

---

## Todo fold (cross_reference_todos)

| Option | Description | Selected |
|--------|-------------|----------|
| Fold into Phase 2 | The 3D rope becomes an explicit deliverable in CONTEXT.md decisions | ✓ |
| Reviewed, don't fold | Noted as deferred; scene rebuild covers it implicitly | |

**User's choice:** Fold into Phase 2
**Notes:** Todo "Bring back a proper 3D jump rope to the WebGL scene" (90% match) — live scene has a 2D-sim-aligned bar and floating cube, no real rotating 3D rope.

## Area selection

User initially selected only "PS1 look pipeline"; advanced through the other three areas via "Next area" prompts.

## PS1 look pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed 320x240 (4:3) | Render 320x240 always, stretch to window; distorted on modern windows | |
| 240 rows, window aspect | Lock vertical res, width follows window aspect | ✓ |
| Scale factor of window | 1/3 or 1/4 of window size; varies per machine | |

**User's choice:** 240 rows, window aspect

| Option | Description | Selected |
|--------|-------------|----------|
| Fullscreen Bayer pass | One post pass: ~15-bit quantize + Bayer 4x4 | ✓ |
| Per-material dither | onBeforeCompile per material; not screen-aligned | |
| Quantize only, no dither | Flatter, hard banding | |

**User's choice:** Fullscreen Bayer pass

| Option | Description | Selected |
|--------|-------------|----------|
| Full pixel-grid snap | Screen-space vertex snap; signature crawl | ✓ |
| Subtle wobble | Hint of instability, less authentic | |
| Wobble on scenery only | Character/rope stay crisp | |

**User's choice:** Full pixel-grid snap

| Option | Description | Selected |
|--------|-------------|----------|
| Throwaway spike page | Standalone HTML proving pipeline on three@0.186.1 before render3d.js | ✓ |
| Prototype in-scene directly | Faster, risks entangling unproven shaders | |

**User's choice:** Throwaway spike page

| Option | Description | Selected |
|--------|-------------|----------|
| Vertex-lit, 1 light | Per-vertex directional shading, flat facets | ✓ |
| Unlit flat colors | Phase 1 approach; silhouette-only form read | |
| Two-tone toon bands | Hard light/shadow split; more shader work | |

**User's choice:** Vertex-lit, 1 light

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, simple fog | Distance fog matched to sky color | ✓ |
| No fog | World ends abruptly | |

**User's choice:** Yes, simple fog

| Option | Description | Selected |
|--------|-------------|----------|
| Keep bright palette | Prototype cream/tan; cheerful, high contrast | |
| Moody PS1 palette | Dusty blues/greens, dim sky; dither shines in shadows | ✓ |
| You decide | Researcher/planner picks per references | |

**User's choice:** Moody PS1 palette

## 3D rope geometry

| Option | Description | Selected |
|--------|-------------|----------|
| Rotating arc around player | Tube/line over head, under feet, phase-driven; replaces bar | ✓ |
| Animated 3D bar | Straight bar lifted/tilted through cycle | |

**User's choice:** Rotating arc around player

| Option | Description | Selected |
|--------|-------------|----------|
| Bright thin tube | Pale yellow/white; stands out at low res | ✓ |
| Dark rope, light stage | Inverted contrast; risks dithered-shadow loss | |
| Phase-tinted rope | Color shifts near feet window | |

**User's choice:** Bright thin tube

| Option | Description | Selected |
|--------|-------------|----------|
| Rope settles at feet | Rest position + short shake on tripped flag | ✓ |
| Defer to Phase 4 | All trip visuals in juice phase | |

**User's choice:** Rope settles at feet

| Option | Description | Selected |
|--------|-------------|----------|
| Rigid circular arc | Perfectly predictable, mechanical | |
| Slight sag, phase-locked | Organic whip, timing stays phase-locked | ✓ |
| You decide | Planner picks simplest that reads well | |

**User's choice:** Slight sag, phase-locked

| Option | Description | Selected |
|--------|-------------|----------|
| Visible handles | Small dark handle boxes in hands | ✓ |
| No handles yet | Cleaner silhouette | |

**User's choice:** Visible handles

## Character build & animation

| Option | Description | Selected |
|--------|-------------|----------|
| Primitive assembly in code | Boxes/cylinders parented PS1-style; no assets | ✓ |
| Hand-authored mesh data | Vertex arrays/JSON; more organic, new file pattern | |

**User's choice:** Primitive assembly in code

| Option | Description | Selected |
|--------|-------------|----------|
| Procedural from phase clock | Pure functions of rope.phase + player.y | ✓ |
| Animation clips | AnimationMixer; second timing system, drift risk | |

**User's choice:** Procedural from phase clock

Personality cues (multi-select): **Big-head proportions ✓**, **Trailing scarf/ponytail ✓**, **Idle animation ✓** — all three selected.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep rose accent | Prototype rose (#c94f6d) continuity, pops vs moody stage | ✓ |
| Decide during spike | Pick fresh palette once stage mood set | |

**User's choice:** Keep rose accent

| Option | Description | Selected |
|--------|-------------|----------|
| Dot eyes | 1-2 pixel-block eyes; cheap charm at 240p | ✓ |
| Faceless | Pure silhouette, moodier | |

**User's choice:** Dot eyes

## Camera, stage & depth cues

| Option | Description | Selected |
|--------|-------------|----------|
| Side-on, slight angle | Rope arc reads cleanly, some 3D depth | ✓ |
| Pure side view | Max readability, flattest | |
| Strong 3/4 view | Sells 3D, hurts low-res judgment read | |

**User's choice:** Side-on, slight angle

| Option | Description | Selected |
|--------|-------------|----------|
| Blob shadow disc | Shrinks/fades with jump height | ✓ |
| Real shadow casting | Shadow maps; heavy, blurry at 240p | |

**User's choice:** Blob shadow disc

| Option | Description | Selected |
|--------|-------------|----------|
| Sparse horizon props | Fog-faded floor + distant silhouettes | ✓ |
| Empty stage | Floor + fog only | |
| Detailed arena | Walls/crates/lamps; noise near judgment zone | |

**User's choice:** Sparse horizon props

## the agent's Discretion

- Camera exact position/height/framing within the side-on-slight-angle envelope
- Specific palette values (tunable during the spike)
- Handle/scarf geometry details; scene-graph organization in render3d.js
- Shader mechanics (RT wiring, Bayer pass, vertex snap technique) — settled by the spike
- Precompile strategy for the no-first-frame-freeze criterion

## Deferred Ideas

- Trip juice beyond rope-settling (hitstop/particles) — Phase 4
- Letterbox/resize handling of low-res framebuffer — Phase 5
- prefers-reduced-motion dampening of wobble — Phase 5
