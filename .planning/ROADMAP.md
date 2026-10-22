# Roadmap: Jumprope Web

## Overview

A brownfield evolution of a working vanilla-JS Canvas prototype into a PS1-style 3D one-button jump-rope roguelike. The journey starts by securing the pure-core/shell boundary (everything downstream gets cheaper or harder depending on it), then paints on the PS1 look — the milestone headline — makes the card game real, gives the jump-timing feel its forgiveness and audio feedback, and finishes with the accessibility and shell hardening that make it shipworthy. Each phase is a vertical slice: the game stays playable end-to-end throughout.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Render-Shell Foundation** - Split sim from shell, pin Three.js via importmap, render the playable game as placeholder 3D with one canonical clock (completed 2026-10-16)
- [x] **Phase 2: PS1 Presentation & Scene** - Low-res dithered wobble look, original low-poly character, readable fixed-camera rope judgment
- [x] **Phase 3: Card Catalogue Realness** - Real card choice, identity/rarity/stack caps/dead-pick filtering, 6–10+ card catalogue with owned-card HUD (completed 2026-10-17)
- [x] **Phase 4: Feel & Audio** - Input forgiveness, significance-scaled juice, near-miss callouts, full WebAudio SFX + loop with persisted mute/volume (completed 2026-10-22)
- [ ] **Phase 5: Accessibility & Polish** - Pause/hidden-tab handling, reduced motion, resize-legible low-res UI

## Phase Details

### Phase 1: Render-Shell Foundation

**Goal**: The game plays end-to-end through a WebGL shell while the simulation core stays pure, single-clocked, and Node-testable — the boundary every later phase depends on
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: ARCH-01, ARCH-02
**Success Criteria**:
  1. Player can play a full run (idle → running → choose → over) rendered by a Three.js WebGL shell (placeholder flat-box scene is fine) reading immutable simulation state each frame via an importmap-pinned `three@0.186.1`
  2. `node --test tests/` passes with test files unchanged, and no module in the sim/test import graph touches `three` (a grep-boundary test enforces it)
  3. Starting or resetting a run goes through one single code path, and all sim randomness flows through an injected `rng` — the dual `phase: 0.33` init and inline `Math.random` in `tickRun` are gone
  4. The drawn rope derives from the canonical `rope.phase` clock (one time source, prev/curr interpolation) — visuals never drift from scoring under load

**Plans**: 3/3 plans complete
**Wave 1**
- [x] 01-01-PLAN.md — Walking Skeleton: three-file split, importmap-pinned WebGL shell, single startRun path + injected rng

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md — Mechanical fences: import-graph boundary test, ARCH-02 debt greps, lerpPhase unit pinning

**Wave 3** *(gap closure G-01-1, blocked on Waves 1–2 completion)*
- [x] 01-03-PLAN.md — Fix createScene return contract (scene.render TypeError froze rAF loop), Node contract pin, render-throw isolation

**UI hint**: yes

### Phase 2: PS1 Presentation & Scene

**Goal**: The milestone headline — the game looks authentically PS1 and an original character's rope arrival is readable purely from the frame
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: PRES-01, PRES-02, PRES-03
**Success Criteria**:
  1. Player sees the game in a PS1-style 3D scene: low internal render resolution, nearest-neighbor upscale, ordered dithering, and vertex-snap wobble on world geometry (settled by a look-spike against `three@0.186.1` before full scene work)
  2. Player sees an original low-poly skipping character with personality, animated from the rope-phase clock — not a Scarlet Skips lookalike
  3. Player can judge rope arrival purely from the frame: fixed camera, blob-shadow depth cue, rope readable against the floor through the whole arc
  4. The scene renders correctly at the browser's full window size without first-frame shader freeze (precompile during idle)

**Plans**: 3/3 plans executed

**Wave 1**
- [x] 02-01-PLAN.md — Look-spike: PS1 pipeline proven on pinned three@0.186.1 + human look sign-off (## Look Decisions)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 02-02-PLAN.md — Port pipeline into render3d.js (RT/Bayer/snap/precompile) + window-sized shell buffer + view.now

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 02-03-PLAN.md — Character rig, rotating rope arc, camera/stage/blob shadow, personality + idle + trip animation

**UI hint**: yes

### Phase 3: Card Catalogue Realness

**Goal**: The pick-two moment becomes a real decision — an expanded, balanced original catalogue where every offer is meaningful and every choice lands
**Mode:** mvp
**Depends on**: Phases 1 and 2
**Requirements**: CARD-01, CARD-02, CARD-03, CARD-04, CARD-05, CARD-06, CARD-07
**Success Criteria**:
  1. Player chooses 1 of 2–3 offered cards at cadence pauses and the chosen card applies instantly — any offered card is reachable, never silently `offer[0]`
  2. Cards have at-a-glance identity (name, icon, role color) and a rarity (common/uncommon/rare) that visibly affects drop odds
  3. Cards stack up to visible per-card caps, and offers are filtered so a dead pick can never appear
  4. Player sees their owned cards as an icon strip during the run
  5. The catalogue holds 6–10+ original cards spanning margin/volume/risk/foundation/pace roles, passes a 1000-tick headless scripted-card simulation (no NaN, rope phase stays in safe wrap bounds, one score event per cycle)

**Plans**: 3/3 plans complete

**Wave 1**
- [x] 03-01-PLAN.md — Tracer: real one-button pick flow — catalogue metadata, pickOffers/caps/owned in sim, cycling-cursor + hold-confirm reducer in shell, lead-in re-entry, HUD offers + icon strip

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 03-02-PLAN.md — Catalogue expansion to 8 cards across five roles, rarity/cap/escalation unit suite (offer size 2→3 at skip 31)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 03-03-PLAN.md — 1000-tick headless scripted-card simulation gate (criterion 5) + ropeMul cap-policy bound

**UI hint**: yes

### Phase 4: Feel & Audio

**Goal**: The core-value loop feels joyful and sounds alive — presses are forgiven, moments get juice, and audio just works from the first tap
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: FEEL-01, FEEL-02, FEEL-03, AUD-01, AUD-02, AUD-03, AUD-04
**Success Criteria**:
  1. A press slightly early or late (~0.1 s) around the timing moment is forgiven instead of tripping — via an input-buffer timer on the phase clock, sim stays pure
  2. Skips, near-misses, and trips produce juice (hitstop, shake, particles) scaled by significance; near-misses register as a distinct event with callout and streak feedback
  3. Player hears distinct SFX for jump, skip, near-miss, trip, and card-pick over a looping vibe track — and the rope never locks to the music
  4. Audio "just works": cold load, the first press produces sound (Chrome, Firefox, iOS Safari), no silent broken state
  5. Player can mute and set volume; settings persist across sessions

**Plans**: TBD
- [x] 04-01-PLAN.md
- [x] 04-02-PLAN.md
- [x] 04-03-PLAN.md
- [x] 04-04-PLAN.md

### Phase 5: Accessibility & Polish

**Goal**: The game respects system preferences and survives real-world browser behavior without breaking judgment or legibility
**Mode:** mvp
**Depends on**: Phases 1, 2, 3, and 4
**Requirements**: UI-01, UI-02, UI-03
**Success Criteria**:
  1. Game pauses on demand and auto-pauses when the tab is hidden (audio suspends and resumes with it)
  2. `prefers-reduced-motion` dampens wobble and shake automatically, without disabling gameplay readability
  3. The low-res UI stays legible at any window size (resize/letterbox handling)
  4. No stuck-hold state after blur or `pointercancel` — input reducer hardening ported into the new shell

**Plans**: 1/4 plans executed
**Wave 1**
- [x] 05-01-PLAN.md — Tracer: manual + tab-hidden pause with audio suspend and resumeRun lead-in re-entry (UI-01)

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 05-02-PLAN.md — Live prefers-reduced-motion: wobble/shake/particle/cosmetic dampening (UI-02)

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 05-03-PLAN.md — Clamp-band resize + DOM letterbox, five-harness style stubs (UI-03)

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 05-04-PLAN.md — release-everything input-loss hardening + phase integration gate (criterion 4)

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Render-Shell Foundation | 3/3 | Complete    | 2026-10-16 |
| 2. PS1 Presentation & Scene | 3/3 | Complete    | 2026-10-17 |
| 3. Card Catalogue Realness | 3/3 | Complete    | 2026-10-17 |
| 4. Feel & Audio | 4/4 | Complete    | 2026-10-22 |
| 5. Accessibility & Polish | 1/4 | In Progress | - |

## Backlog

### Phase 999.1: Follow-up — Phase 4 deferred UAT follow-up: Test 6 (BACKLOG)

**Goal:** Resolve the UAT checkpoint deferred during Phase 4 verification
**Source phase:** 4
**Deferred at:** 2026-10-22 during /gsd-verify-work 4 session completion
**Follow-ups:**
- [ ] Test 6: Supply a music track at audio/track.ogg (loop under rope, shared master bus, no beat-lock) — mechanism shipped and test-pinned; content intentionally deferred at UAT acceptance. (deferred 2026-10-22)
