# Project Research Summary

**Project:** Jumprope Web — PS1-Style Rope-Jump Roguelike Demake (spirit of Scarlet Skips)
**Domain:** Browser 3D game — Three.js render shell over a pure fixed-timestep sim core, static-file delivery, no build step
**Researched:** 2026-10-15
**Confidence:** MEDIUM-HIGH overall (stack and seams verified against registry/CDNs/official docs; PS1 shader specifics flagged for a phase-level spike)

## Executive Summary

This is a brownfield evolution: a working vanilla-JS Canvas prototype with a proven pure-functional core (120 Hz fixed-step sim, Node-testable, 26 green tests) gains a Three.js WebGL render shell, a PS1 presentation layer, WebAudio, and a real upgrade-card catalogue. Experts build this shape of product by making the render layer a *pure consumer* of simulation state: the sim never learns the renderer exists, events flow as return values from `tickRun` (not dispatches), and the only dependency break — `three@0.186.1` via a pinned importmap in `index.html` — is contained to a `js/render3d/` module subtree that Node tests never load. The stack decision is essentially settled: Three.js (r186, ~130 KB compressed, WebGL2-only since r163) served as-published from jsDelivr, native WebAudio for procedural SFX plus one looping music buffer, and zero new tooling — "installation" is an 8-line `index.html` edit.

The PS1 look is ~70% low internal resolution (render into a ~320×180-ish `WebGLRenderTarget`, nearest-filter upscale), plus a ~15-line `onBeforeCompile` vertex-snap and a Bayer dither in the composite shader — deliberately hand-rolled, skipping `EffectComposer` and skipping affine-texture emulation entirely by using texture-free flat/vertex-colored geometry. This pipeline is the one genuinely version-fragile area (chunk-name surgery in `onBeforeCompile`) and warrants a half-day spike before full scene work is budgeted.

The dominant risks are architectural, not visual: (1) a single stray `three` import in the sim/test graph kills `node --test` (Node ignores import maps — verified empirically); (2) two clocks — a pasted `THREE.Clock` desyncing the drawn rope from the canonical `rope.phase`; (3) silent audio from a suspended `AudioContext` (fixed by resuming inside the existing one-button `press()` gesture); (4) building the card catalogue on the current *fake choice* (`release()` always applies `offer[0]`) and a multiplicative-only effects model, which makes balance untestable and invites rope-speed stacking into the known `js/rope.js` wrap bug. Every mitigation is cheap if sequenced right: land the shell boundary and clock discipline first, fix real choice and stack caps before catalogue expansion, and keep the core Node-importable so a 1000-tick scripted simulation test can carry balance.

## Key Findings

### Recommended Stack (see STACK.md)

Three.js is the single sanctioned dependency, loaded via importmap with an exact pin; everything else is browser-native. The sim core must never import `three` — that keeps `node --test tests/` green offline with zero config.

**Core technologies:**
- **Three.js `three@0.186.1` (pinned)** — WebGL2 render shell only — smallest API that fits "render an immutable state each frame"; addons load via importmap if ever needed; huge PS1-shader prior art
- **Import maps (browser built-in)** — map `"three"` / `"three/addons/"` to pinned jsDelivr URLs — required because addon files import bare `'three'`; makes vendoring a one-line escape hatch
- **Web Audio API** — SFX + looping music — zero deps, sample-accurate; procedural oscillator/noise SFX, one preloaded looping `AudioBuffer`; autoplay solved by `ctx.resume()` inside the existing `press()` handler
- **Existing shell plumbing unchanged** — rAF fixed-step loop (`STEP = 1/120`, 0.25 s clamp), pointer/keyboard input, localStorage — only the draw layer is replaced

**Key stack rules:** no `three.module.min.js` (removed from package); never `@latest`/range URLs; no `EffectComposer`; no esm.sh/jsDelivr mixing (duplicate module instances); no npm install step at all.

### Expected Features (see FEATURES.md)

The feature expansion is anchored to the Scarlet Skips reference (10 cards, pick-1-of-3 at level-up, color+icon identity, multiplicative stacking, offer filtering) — demaking its design *roles* (margin/volume/risk/foundation/pace/luck), not its card list.

**Must have (table stakes):**
- Rope-arrival readability in 3D — the timing judgment moment must stay legible (fixed camera, rope vs feet depth cues, shadow blob)
- Card identity at a glance — name, icon, color-coded by role; rarity affecting drop odds; stack caps (`maxStacks`)
- Offer generator never presents a dead pick — availability predicate filter (mirrors Scarlet's reinforce rule)
- Input forgiveness near the ground (~0.1 s buffer against the rope-phase clock) — do early, it's independent of everything else
- Distinct SFX for jump/skip/near-miss/trip/card-pick; looping track that never locks the rope; autoplay-policy-respecting audio
- Owned-cards icon strip; mute/volume persisted; tab-hidden self-pause; `prefers-reduced-motion` support

**Should have (competitive):**
- Full PS1 presentation stack — low-res + nearest upscale, vertex-snap wobble, Bayer dither, flat shading (demake fans audit each touch)
- Original low-poly character with phase-driven idle animation personality
- Cards with rules beyond multipliers (conditional/synergy, airtime-float) — "extra ropes" held back unless a multi-window scoring spike proves cheap
- Near-miss detection + escalating combo feedback; one big compounding score-multiplier number; rarity-escalating offer cadence

**Defer (v2+):**
- Extra-ropes multiplicity (only invasive sim change — high risk this cycle)
- Luck mechanic (Scarlet itself doesn't document its effect — invent only if catalogue feels thin)
- Meta progression, beat-locked audio, in-scene 3D UI text (use DOM overlay instead)

### Architecture Approach (see ARCHITECTURE.md)

Split the existing `js/game.js` along the seam already visible in the file: pure half → `js/run.js`, shell half → `js/main.js`. Add a **pure** view-model layer (`js/view/model.js`) that interpolates `prevSim → currSim` by `alpha = acc/STEP` into a frame descriptor, and two browser-only leaves (`js/render3d/`, `js/audio/`) that are the only modules allowed to touch `three`/DOM/`AudioContext`. Data flow is strictly one-way: sim → view → render/audio. Events are return values from `tickRun` drained by the shell — no bus, no emitter.

**Major components:**
1. `js/run.js` + `rope.js`/`player.js`/`upgrades.js` — pure rules; `tickRun` returns `{run, rope, player, events[]}` with injectable `rng`
2. `js/view/model.js` — pure, Node-tested view model; phase-aware interpolation (naive lerp breaks at the 0/1 rope-phase wrap)
3. `js/render3d/` (`renderer.js`, `stage.js`, `ps1.js`) — persistent scene graph built once, mutated per frame; hand-rolled two-pass PS1 pipeline (low-res RT → nearest-upscale quad with dither); vertex snap via `onBeforeCompile`
4. `js/audio/audio.js` — lazy AudioContext, gesture-resume, event→SFX table, music scheduling; consumes drained events only
5. `js/main.js` — imperative shell: rAF + accumulator (single canonical clock), input intents, event drain, localStorage, resize

### Critical Pitfalls (top from PITFALLS.md)

1. **`three` bleeds into the test graph** — Node ignores import maps and rejects URL imports (verified locally); a single transitive `three` import dies all 26 tests at collection. Keep `three` imports inside `js/render3d/`; add a grep-boundary test and run `node --test` in CI *before* the shell phase; "tests unchanged and green" is an explicit shell-phase exit criterion.
2. **Two clocks** — pasting `THREE.Clock.getDelta()` beside the STEP accumulator desyncs rope visuals from collision logic (the rendered rope desyncs from scoring). Declare `performance.now` + accumulator the only time source; rope visuals derive from `rope.phase`; add prev/curr interpolation since 3D exposes temporal aliasing Canvas hid.
3. **Silent audio** — `AudioContext` created at page load sits `suspended` and fails with no console error. Construct lazily, `resume()` inside the existing `press()` gesture, re-check `ctx.state` on later presses; acceptance test: cold load, first tap makes sound (Chrome, Firefox, iOS Safari).
4. **CDN drift / module identity breaks** — unpinned URLs, split `three.module.js`+`three.core.js` vendoring gotcha, dual-CDN double-instance. Pin one exact version, one origin, both importmap entries; commit a vendored fallback of the whole `build/` pair; document HTTP-serve requirement (no `file://`).
5. **Card catalogue built on fake choice + latent wrap bug** — `release()` always applies `offer[0]`; pure-multiplier stacking compounds past the `js/rope.js:5-9` wrap boundary (`dt/period >= 1`). Fix real choice *before* catalogue expansion; fix the rope wrap (`((phase % 1) + 1) % 1`) *before* shipping any ropeMul-stacking card; give every card `maxStack` + availability filter; prefer additive effects, one multiplier line per knob; back it with a headless 1000-tick scripted-card test (cheap only if the pure-core boundary held).

## Implications for Roadmap

Research converges (FEATURES.md "MVP Recommendation" + PITFALLS.md "Pitfall-to-Phase Mapping") on a 5-phase structure. The ordering rule underlying all of it: **the pure-core boundary must be secured before anything else gets cheaper or harder.**

### Phase 1: Render-Shell Foundation (the split + the guardrails)
**Rationale:** Everything downstream depends on the sim staying Node-importable and single-clocked, and PITFALLS explicitly orders boundary/vendoring/clock work as "first work item, before any scene code." The rewrite is also the one cheap moment to pay down the two named debt items (dual-init `phase: 0.33` duplication, inline `Math.random`).
**Delivers:** `js/game.js` split into `run.js`/`main.js`; importmap edit in `index.html` with pinned `three@0.186.1` + vendored fallback; a minimal Three.js scene rendering the sim state (flat boxes are fine) through the two-pass low-res pipeline; single `resetRunState()`; `tickRun(..., rng)` threaded; prev/curr-state interpolation skeleton with phase-aware `renderPhase`; DOM-overlay UI decision in place.
**Uses:** Three.js importmap pattern, fixed-timestep interpolation (Gaffer), events-as-return-values (GPP).
**Avoids:** Pitfalls 1 (test-graph bleed — exit criterion: `node --test tests/` green, test files byte-identical), 3 (two clocks), 4 (CDN drift), and the dual-init/rng debt pattern.

### Phase 2: PS1 Presentation & Scene
**Rationale:** The milestone headline, but timebox a look-spike *first* — `onBeforeCompile` chunk names are the only version-fragile piece in the stack (both STACK.md and ARCHITECTURE.md flag this), and the spike settles the primitives-vs-modeled-character asset decision with evidence.
**Delivers:** Vertex snapping (per-material, off for UI), Bayer dither + 5-bit quantize in the composite shader, `ColorManagement.enabled = false`, fog, flat-shaded low-poly original character with phase-driven idle animation and blob shadow, fixed camera rig, resize/HiDPI handling, shader precompile during `idle` to avoid first-frame freeze.
**Uses:** STACK.md PS1 technique table; ARCHITECTURE.md Pattern 4 (hand-rolled pipeline, no EffectComposer); evaluate three's `RetroPassNode` as a shortcut.
**Avoids:** Pitfall 5 — snap in NDC (`clip.xy/clip.w`), stable-at-rest quantization, snapping disabled on UI, RT resize handled.

### Phase 3: Card Catalogue Realness
**Rationale:** Must follow the shell (its cheap safety net — pure-core scripted simulation tests — only exists if Phase 1's boundary held), and PITFALLS is explicit: real choice *before or with* catalogue expansion, rope-wrap fix *before* any ropeMul-stacking card.
**Delivers:** Real pick (offer[0] vs offer[1] reachable); card data model with `color`/`icon`/`rarity`/`maxStack`/`available(state)`; 6–10 original cards spanning Scarlet's design roles; dead-pick-filtered weighted offers with rarity-escalating cadence; owned-cards HUD strip; rope-wrap hardening; headless 1000-tick scripted-card sim tests asserting no NaN, safe wrap bounds, one score event per cycle.
**Avoids:** Pitfall 6 (balance explosion on fake choice); anti-feature "trap cards."

### Phase 4: Feel & Audio
**Rationale:** Input buffering is independent of everything and FEATURES says do it early — pull it to the front of this phase (or into Phase 1 if sequencing allows). Audio is fully parallel to card work (its only coupling is the `press()` gesture hook). Juice rides on the event stream established in Phase 1.
**Delivers:** ~0.1 s phase-clock input buffer (a timer field on state — sim stays pure); near-miss window + `nearMiss` event; shell-side hitstop/shake/particles scaled by event significance; procedural WebAudio SFX (jump/skip/near-miss/trip/pick), looping music buffer, master gain + persisted mute/volume; `visibilitychange` suspend/resume.
**Avoids:** Pitfall 2 (silent audio — cold-load first-tap acceptance test); beat-lock anti-feature (audio follows gameplay, never drives phase); per-event `AudioContext` creation.

### Phase 5: Accessibility & Polish
**Rationale:** Table stakes that cut across everything built in Phases 1–4 — cheapest to audit once the effects exist; small enough to not be its own epic if the roadmapper prefers folding (reduced-motion flag belongs to Phase 2's shader tunables, visibility-pause to Phase 4).
**Delivers:** `prefers-reduced-motion` dampening of wobble/shake (render-shell flag only); tab-hidden self-pause hardened for audio; low-res UI legibility at all window sizes; input-reducer hardening (`pointercancel`/`blur` stuck-hold fixes ported into the new shell).

### Phase Ordering Rationale

- **Boundary before features:** every phase's testing strategy (scripted sim runs, unchanged test suite) depends on the sim core staying `three`-free — so the shell split + CI gate is Phase 1, task one.
- **Headline second, not first:** the PS1 look rides on the shell but is scoped after it so the shader spike has a working two-pass pipeline to instrument, and the character-asset decision doesn't block core plumbing.
- **Catalogue after shell, deliberately:** its mitigations (pure-core balance tests) require Node-importability; and its risks (fake choice, wrap bug) are pre-existing code the shell rewrite cleans up first.
- **Feel/audio last-but-parallel:** coupling only to the event stream (Phase 1) and the gesture hook (Phase 1 shell), so it slots flexibly; input buffer pulled early because it's trivial and protects the Core Value (jump-timing joy) while everything else churns.

### Research Flags

Phases likely needing deeper research/spike during planning:
- **Phase 2 (PS1 Presentation):** mandatory ½-day look-spike — verify `onBeforeCompile` `project_vertex` injection and `ColorManagement` behavior against `three@0.186.1` specifically; evaluate TSL `RetroPassNode` as an alternative. Both STACK.md and ARCHITECTURE.md carry MEDIUM confidence here (no search provider during research; chunk strings unverified).
- **Phase 3 (Catalogue):** needs a mini-design pass on the "extra ropes" multi-window scoring question before committing — FEATURES says hold it unless a spike proves cheap.

Phases with standard patterns (skip research-phase):
- **Phase 1:** importmap + fixed-timestep interpolation + event-queue pattern are HIGH-confidence, verified against official docs.
- **Phase 4:** WebAudio procedural SFX and the gesture-resume pattern are well-trodden (MDN HIGH); juice params are tuning, not research.
- **Phase 5:** standards-driven (WCAG 2.3.3, `prefers-reduced-motion`) — well documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Version/CDN/build-file facts verified against npm registry and live CDNs; PS1 shader specifics MEDIUM (flagged for Phase 2 spike) |
| Features | MEDIUM | Prototype baseline HIGH; Steam-confirmed reference facts MEDIUM; community card catalogue details LOW-MEDIUM (design inspiration only); juice/buffer norms consistent across many weak sources |
| Architecture | HIGH (seams) / MEDIUM (shader internals) | Loading/timestep/event patterns verified against official docs and source; scene-graph idiom and GLSL math from standard practice, to be validated in spike |
| Pitfalls | MEDIUM | Core claims verified against official docs, live CDN probes, and a local Node experiment; balance/asset sections are community consensus |

**Overall confidence:** MEDIUM-HIGH — stack and architecture decisions are safe to lock; visual-pipeline internals and card balance need in-phase validation.

### Gaps to Address

- **`onBeforeCompile` chunk names vs 0.186.1:** unverified — resolve with the Phase 2 spike before scheduling full shader work; fallback is `RetroPassNode` or plain flat-shaded low-res.
- **"Extra ropes" multi-window scoring cost:** unknown sim invasiveness — spike-or-defer decision inside Phase 3.
- **Character asset route:** hand-coded `BufferGeometry` vs Blender `.glb` — decide after the Phase 2 look-spike with evidence; primitives acceptable for v1.
- **Luck card semantics:** reference game itself undocumented — invent only if the catalogue feels thin at Phase 3 review.
- **Interpolation necessity:** whether 120→60 Hz stutter is visible after the swap — PITFALLS allows skipping full prev/curr lerp if not; check during Phase 1 UAT on 60 vs 144 Hz.

## Sources

### Primary (HIGH confidence)
- npm registry + live jsDelivr/unpkg/esm.sh probes — `three@0.186.1` manifest, build-file layout (`three.module.js` → `three.core.js`), absent minified build, addon bare-import behavior
- three.js official docs (`docs/llms.txt`, installation guide) — importmap+CDN pattern, WebGL1 removal (r163)
- Node.js official ESM docs — no import-map support (the test-boundary constraint); local Node v26.8.1 experiment confirming URL-import rejection
- Gaffer on Games — *Fix Your Timestep!* (accumulator + interpolation); Game Programming Patterns — *Event Queue*
- MDN — import maps (Baseline status, `integrity`), AudioContext/autoplay policy
- Repo source (`js/game.js`, `js/rope.js`, `js/upgrades.js`) + `.planning/codebase/` — all code spot-references verified

### Secondary (MEDIUM confidence)
- pixelwolf.net PS1 geometry-wobble analysis (citing Copetti) — snap-in-NDC recipe, coherent-stack advice
- three.js `EffectComposer` source read at master — why hand-rolled wins here; `RetroPassNode` existence (search snippet)
- Scarlet Skips Steam page — 10 cards, pick-1-of-3, example effects
- Local CDN probes at r170/r180 — split-build vendoring gotcha

### Tertiary (LOW confidence)
- Scarlet Skips fan wikis/guides — card names from footage (design inspiration only)
- Coyote-time primers, roguelike-deck-builder balance threads, community PS1 shader gists — directionally consistent, individually weak

---
*Research completed: 2026-10-15*
*Ready for roadmap: yes*
