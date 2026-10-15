# Pitfalls Research

**Domain:** Browser 3D demake (Three.js render shell over a pure fixed-timestep sim core) + WebAudio + roguelike card catalogue
**Researched:** 2026-10-15
**Confidence:** MEDIUM (core claims verified against official docs, live CDN probes, and a local Node experiment; balance/asset sections are community-consensus, LOW-MEDIUM)

## Critical Pitfalls

### Pitfall 1: Three.js import bleeds into the test graph and kills the Node suite

**What goes wrong:**
The repo's 26 Node tests import `js/game.js`, which today imports only `rope.js`/`player.js`/`upgrades.js`. The moment any module in that import graph pulls in `three` (bare specifier or CDN URL), `node --test tests/` dies with `ERR_MODULE_NOT_FOUND`. Verified empirically on this machine (Node v26.8.1): a package.json `imports` map pointing `"three"` at an `https://` URL throws immediately — Node does not execute import maps and rejects URL targets.

**Why it happens:**
Developers wire the Three.js renderer directly into `js/game.js` (the file that already holds both `tickRun` and the shell), because that's the one file tests and browser already share. The `typeof document !== 'undefined'` guard (`js/game.js:238`) guards *execution*, not *import* — a top-level `import * as THREE from 'three'` fails at module resolution before any guard runs.

**How to avoid:**
- New rule: `three` is imported by exactly one new file (e.g. `js/render-three.js`). The shell (`game.js` or a new `main.js`) wires sim ↔ renderer; tests import only the pure core, which never touches that file.
- Keep the dependency direction one-way: `render-three.js → (nothing in core)`; core → (nothing). Mirrors the existing DAG guarantee in ARCHITECTURE.md.
- Add a smoke test `node --test tests/` to package.json scripts + CI **before** the render phase starts, so breakage is caught the same commit it's introduced (CONCERNS.md already flags "no npm scripts" as the enabling condition).

**Warning signs:**
`node --test` errors on import instead of assertion; someone adds an import map to package.json "to fix tests"; test files start mocking `three`.

**Phase to address:** Three.js render-shell introduction — make "Node suite still green with zero changes to test files" an explicit exit criterion of the shell phase.

---

### Pitfall 2: Silent audio — AudioContext created outside a user gesture

**What goes wrong:**
Audio code creates `new AudioContext()` at page load and starts the music loop immediately. Per MDN's autoplay guide, browsers block Web Audio playback until *sticky user activation*: the context sits in `state === 'suspended'`, everything "plays" into the void, and on some browsers `start()` throws `NotAllowedError`. On iOS/Safari the context may also get interrupted on lock/notification and never resumed.

**Why it happens:**
WebAudio fails *silently* — no console error for a suspended context. Desktop Chrome dev testing often works (developer has already clicked the page), so it ships broken for cold visits and mobile.

**How to avoid:**
- Lazily construct the AudioContext and call `ctx.resume()` inside the existing `press()` handler (`js/game.js:70`) — the game is one-button, so a first-gesture unlock hook already exists on every input path (pointer + Space).
- Re-check `ctx.state !== 'running'` and resume on each subsequent press (handles tab-hide interruptions).
- Preload/decode buffers at boot but no-op playback until ready — a tap before `decodeAudioData` resolves must not throw (decode race).
- Test path: fresh hard reload → never click → press Space; audio must begin exactly at that first interaction.

**Warning signs:**
"Works after I click somewhere first"; `ctx.state === 'suspended'` in DevTools; audio dead on phone but fine on desktop.

**Phase to address:** Audio phase — include a "cold-load, first-tap makes sound" acceptance test on desktop Chromium and iOS Safari.

---

### Pitfall 3: Two clocks — THREE.Clock vs the STEP accumulator (dt-units + interpolation)

**What goes wrong:**
The shell currently owns one time source: the `performance.now` accumulator with `STEP = 1/120` and the 0.25 s spiral clamp (`js/game.js:224-234`). Introducing Three.js invites `clock.getDelta()` into the loop. If any visual smoothing, music drift, or rope angle computation consumes `getDelta()` (wall-clock seconds since last call) while the sim consumes fixed `STEP` counts, the two timelines diverge: rope wobble jitters, or the drawn rope position desyncs from the collision logic — the exact failure CONCERNS.md's "rope/player collision timing coupling" warns about, now with a 3D renderer to make it glaring.

Second-order issue: at 60 fps display / 120 Hz sim, the accumulator alternates 1-and-2 steps per frame with a leftover remainder. Without interpolating between previous and current state (alpha = `acc / STEP`), motion shows subtlebeat stutter that wasn't visible in the 2D prototype because everything was driven directly off `rope.phase`.

**Why it happens:**
Every Three.js tutorial uses `THREE.Clock`; devs paste it next to the existing rAF loop without designating a single canonical clock.

**How to avoid:**
- Declare `performance.now` + accumulator the only time source; render reads state, never advances time. Do not instantiate `THREE.Clock` at all (or only for `getElapsedTime()` on an idle-audio-ambient track, documented as such).
- Rope visual angle must be derived from `rope.phase` (canonical clock, per ARCHITECTURE.md) inside `draw()`, exactly as `draw()` does today (`js/game.js:142, 187`) — not from wall time.
- If 120→60 stutter is visible after the swap, add previous/current-state lerp (Gaffer "final touch"); if not visible, skip it — the rope is the only fast-moving object.
- Keep the 0.25 s clamp. If it's ever removed, note `js/rope.js:5-9` wrap breaks when `dt/period >= 1` (CONCERNS "Fragile wrap") — fix with `((phase % 1) + 1) % 1` before making period/rate tunable.

**Warning signs:**
Rope box visibly ahead of/behind the score flash; behavior differs at 60 vs 144 Hz monitors; two `dt` variables in `frame()`.

**Phase to address:** Render-shell phase, at the moment `frame()` is rewritten. Add a multi-cycle test asserting exactly one score event per rope cycle (already recommended in CONCERNS test-gaps).

---

### Pitfall 4: CDN drift and module-identity breaks

**What goes wrong:**
Four distinct failure modes, all observed patterns from the three.js ecosystem:
1. **Unpinned URLs** (`@latest` or bare `three` on esm.sh) silently ship a new major version overnight; three.js breaks API every few releases (color-management, TSL migration, WebGPURenderer churn).
2. **Two THREE instances**: importmap maps `"three"` to v0.170 but `"three/addons/"` (or some other import source like a CDN-skinned copy) to a different version/build → `instanceof` checks fail, materials render black, "Can't restore object from JSON" ghosts.
3. **Split build**: verified via live probe — `three@0.180.0`'s `build/three.module.js` does `import { ... } from './three.core.js'`, while `three@0.170.0` is a single self-contained file. Copying just `three.module.js` into a `vendor/` folder silently breaks on newer versions; vendoring must take the whole `build/` pair.
4. **CDN outage/CORS**: the game is fully static; if the CDN is unreachable, the game is a white screen. Also, nothing here fixes `file://` — ES modules require an HTTP origin regardless (already flagged in CONCERNS "Serve/dev tooling").

**Why it happens:**
The project deliberately breaks its zero-dependency rule exactly once (PROJECT.md constraint), and copy-paste CDN snippets from tutorials of different vintages mix sources.

**How to avoid:**
- One pinned exact version (`three@0.1xx.y`) in **both** importmap entries (`"three"` and `"three/addons/"`), same origin, in `index.html`; nothing else imports from any other URL.
- Commit a vendored fallback copy of the pinned `build/three.module.js` **and** `three.core.js` under `vendor/`; either reference it directly (simplest: no importmap needed for a core-only game — no addons here) or add a tiny loader with fallback. Vendoring also kills the outage class and keeps "static files only" intact.
- Never mix UMD-era snippets: script-tag `<script src="three.min.js">` tutorials refer to a build that no longer ships.
- Document `python3 -m http.server` or `npx serve` in README — module + `file://` = CORS error on first try.

**Warning signs:**
Two different `three` URLs in the repo; `THREE.Vector3 instanceof`-style bugs; blank page with a network error to unpkg/jsdelivr; "works online, breaks offline".

**Phase to address:** Render-shell phase, first work item — pin + vendor + serve-instructions before any scene code is written.

---

### Pitfall 5: PS1 shader shortcuts that break lighting, readability, or the render target

**What goes wrong:**
- **Wrong snap space**: rounding raw clip coordinates (ignoring `w`) makes wobble scale with camera distance and geometry explode near the camera. Correct recipe (pixelwolf, Aug 2026): divide `clip.xy / clip.w` → snap to a virtual-resolution grid → multiply `w` back.
- **Lighting artifacts**: vertex-snapping the position *after* normals are computed makes flat/Gouraud shading disagree with the snapped silhouette — faces flicker. PS1-authentic fix is flat shading (per-face normal), which the aesthetic wants anyway.
- **Noise instead of quantization**: random jitter shimmers when the camera is still; quantization must be stable at rest.
- **Snapping UI/quad geometry**: vertex-snapping the card-choice overlay or score text makes it unreadable — snapping must be per-material with an off switch.
- **Resize/dpr issues**: low internal resolution implemented via `WebGLRenderTarget` must be resized in the window-resize handler (Three.js does NOT auto-resize manual targets), `magFilter = NearestFilter` or the upscale blurs/halos, and `setPixelRatio(devicePixelRatio)` fights the low-res intent on HiDPI screens.
- Hand-rolled shaders also risk precision artifacts (mediump position overflow at large coordinates — snap in screen space, not object space).

**Why it happens:**
The PS1 look is a *stack* (low internal res + snap + nearest + dither + limited lighting); devs implement one piece (usually a copy-pasted snap snippet) from a tutorial that assumed the rest.

**How to avoid:**
- Prefer the coherent stack in one place: three.js now ships a `RetroPassNode` (vertex snapping + affine mapping + 0.25-scale low res) in the TSL nodes API, and community libs (e.g. `three-psx`) exist — evaluate using one instead of hand-writing (it's CDN-loadable as part of three's addons). Note it lives in `three/addons/` → reinforces Pitfall 4's "map both entries to one version".
- Expose "virtual resolution" and "snap strength" as tunables; test long walls, near-camera geometry, and a still camera (must be rock-stable).
- Keep text/UI in DOM overlay (HTML/CSS) rather than in-scene text meshes — sidesteps snapping, fonts, and a whole asset class.
- Do **not** try to unit-test shaders; verify with a visual checklist per "Looks Done But Isn't" below.

**Warning signs:**
Wobble present while camera is stationary; text/cards shimmer; scene blurs after window resize; someone spends > 1 day tuning one shader.

**Phase to address:** PS1-presentation phase. Timebox shader work; a "good-enough look spike" precedes full scene work.

---

### Pitfall 6: Card catalogue balance explosions — on a choice system that doesn't exist yet

**What goes wrong:**
The effects model is pure multiplicative endofunctions over 4 knobs (`freshEffects` in `js/upgrades.js`: `floatMul/ropeMul/windowMul/scoreMul` applied by spread). Extending 4 → ~15+ cards with multiplicative stacking means: (a) two rope-speed cards compound (1.2 × 1.2, then 1.44 × 1.2 …) until `ropeMul` collides with the *known wrap bug* in `js/rope.js:5-9` (CONCERNS: breaks when `dt/period >= 1`, i.e. period under ~0.06 s at STEP=1/120) — a balance change silently triggers a latent engine bug; (b) late-run offer pools full of already-stacked cards become dead picks; (c) balance at 1 copy ≠ balance at 5 copies, and nothing in the current test suite simulates multi-cycle runs (test gap already flagged).

And upstream of all balance: `pickTwo()` offers two cards but `release()` applies `run.offer[0]` always (`js/game.js:86`) — the choice mechanic is fake (CONCERNS tech-debt #1). Shipping a catalogue on a fake choice means all catalogue tuning is untestable through play.

**Why it happens:**
Each card is tuned in isolation at N=1 ("feels fine"), stacking math is checked only by playtesters, and the offer logic (`pickTwo` ignores ownership history) never got a "already owned 4×, cap reached" rule.

**How to avoid:**
- Fix real choice (left/right halves or 1/2 keys) in the **same phase as, or before,** catalogue expansion.
- Give every card an explicit `maxStack`; make `pickTwo` filter capped-owned cards out of the pool (falls back gracefully — note `pickTwo` already assumes `upgrades.length >= 2`, another CONCERNS scaling limit).
- Prefer additive/one-shot card effects over multipliers for most of the catalogue; reserve one intentional multiplier line per knob.
- Write a headless 1000-tick simulation test with scripted card picks — cheap because the core is already pure; assert no NaN/negative gravity, `period * ropeMul` stays inside the safe wrap bound, one score event per cycle.
- Fix the rope wrap (`((phase % 1) + 1) % 1`) *before* shipping any ropeMul-stacking card.

**Warning signs:**
"It's fun until you get 3 of X"; tuning sessions change constants in 3 places (the dual-init duplication makes cadence changes diverge — see Debt below); playtests always pick the same card.

**Phase to address:** Card-catalogue phase, after the render shell. Sequencing note: this pitfall's mitigation (pure-core sim tests) is only cheap if Pitfall 1's boundary held.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Duplicated rope-reset literals (`{ phase: 0.33, period: 1.3 }` at `js/game.js:62,74,90`) carried into the new shell | Rewrite ships faster | 3-place cadence drift; git history shows repeated "tune: slower cycle" commits already suffered this — and a 3D renderer doubles the tuning sites (scene scale too) | Never — extract `resetRunState()`/`initialRope()` **during** the shell rewrite, not after |
| `Math.random` inline at `js/game.js:23` inside `tickRun` | No signature change | Core-tick determinism impossible; replay-based card balance tests (Pitfall 6 mitigation) blocked | Never past the card phase — thread `rng` param (default `Math.random`) as CONCERNS prescribes |
| Loading three from CDN without vendored copy | One fewer file | Outage = white screen; no offline dev | Only with exact-version pin + importmap; add vendored fallback in same phase |
| DOM overlay for UI instead of in-scene 3D UI | Sidesteps shader/ snapping/font pain | Slightly less "diegetic" PS1 look | Acceptable — recommended |
| Box-primitive character instead of a real low-poly model | Zero asset pipeline | Weaker charm ceiling | Acceptable for v1; revisit only after the loop is joyful |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Three.js via importmap | Map `"three"` and `"three/addons/"` to different versions/origins | Single pinned version, single origin, both entries in one `<script type="importmap">` in `index.html` |
| Three.js vendoring (newer versions) | Copy only `three.module.js` | `three.module.js` imports `./three.core.js` since ~r167+ (verified at r180) — vendor both files or use CDN-with-pin |
| ES modules + local dev | Double-click `index.html` (`file://`) | HTTP origin required (already true today per CONCERNS); document `python3 -m http.server` in README |
| WebAudio unlock | `new AudioContext()` at module load | Construct lazily + `resume()` inside existing `press()` gesture hook; poll `ctx.state`, no policy-change event exists |
| WebAudio SFX nodes | Reuse a played `AudioBufferSourceNode` / never disconnect | One-shot sources: create per play, `disconnect()` in `onended`; exactly ONE AudioContext, reused forever (MDN guidance) |
| Music vs rope clock | Drifting a beat against free-running rope phase | Audio follows gameplay (PROJECT.md decision): SFX triggered by sim events (`tripped`, score edge in `tickRun`), music as non-beat-locked loop |
| localStorage | (unchanged) keep `loadBest/saveBest(storage)` params | No new browser API in core files; persistence stays at shell boundary |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-frame allocation in the render layer (new `Vector3`/`Color`/material each frame) | Periodic GC hitches visible as wobble hitches | Pre-allocate scene-graph objects at boot; mutate in place in render | Mid-run on low-end mobile; the sim's 120 Hz immutability (360 objects/s, CONCERNS) is fine — don't "fix" it, but don't replicate it in render |
| Re-creating WebGLRenderTarget every resize without dispose | VRAM creep, context loss after many resizes | Resize (or recreate + `dispose()` old) inside the resize handler | Several window resizes / orientation flips on mobile |
| Rebuilding materials/meshes per frame for card UI | Frame drops during `choose` state | Build card meshes/DOM once per offer, toggle visibility | First time the catalogue makes 2+ cards visible |
| Compiling shaders during first gameplay frame | 100-500 ms freeze at run start | `renderer.compile(scene, camera)` / render one hidden frame during `idle` | Every cold start on a new GPU/driver |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Loading `three` from an unpinned third-party CDN URL | Content swap / supply-chain vector on a page that also runs user-side `localStorage` writes | Exact-version pin + committed vendored copy (also fixes Pitfall 4's outage class). SRI hashes are a weaker alternative since vendoring removes the network trust need entirely |
| Trusting `jumprope-best` key format when adding new storage keys | Trivial, display-only (CONCERNS already rates it fine) | Keep `loadBest/saveBest` try/catch guards; no server surface this milestone |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Card overlay in 3D with tiny snapped text | Choice screen unreadable → players tap randomly, builds feel random | DOM/HTML overlay cards (also fixes the fake-choice visibility problem) |
| Audio unlock only on page load, not first tap | "The game is silent" on first visit | First-press resume + a one-time "tap to start" title (doubles as the sticky-activation gesture) |
| Wobble/dither dialed to full authenticity | Motion sickness, unreadable hit window — the jump timing IS the product (Core Value) | Snap strength tunable; verify the exact frame where the rope passes the feet still reads clearly at gameplay speed |
| Choosing visual fidelity over input feel during the swap | Canvas-era input bug (stuck hold, `js/game.js:70-84`, no `pointercancel`/`blur`) resurfaces in the new shell and gets blamed on WebGL | Port the input reducer with `pointercancel` + `window.blur` clears; test status × event matrix per CONCERNS "safe modification" advice to extract `handleEvent(state, event)` |

## "Looks Done But Isn't" Checklist

- [ ] **Render shell:** Node tests unchanged and green with three.js in the repo — verify `node --test tests/` in CI, and that no core file imports three (grep the import graph).
- [ ] **Render shell:** works from cold offline checkout (vendored fallback) and from an HTTP server; blank-screen failure impossible to confuse with a crash.
- [ ] **PS1 look:** still camera → zero shimmer; resize window → no blur/halos; HiDPI laptop → pixel grid uniform; score/card text legible.
- [ ] **Audio:** first tap on a cold page produces sound on Chrome, Firefox, iOS Safari; tab-switch-away/back doesn't kill it; 20-run session doesn't leak nodes (check `ctx` node counts in DevTools).
- [ ] **Card catalogue:** choice is real (offer[1] reachable); every card has a maxStack; 1000-tick scripted-run test passes; rope never wraps through the fragile path (`dt/period >= 1` unreachable).
- [ ] **Timestep:** `frame()` contains exactly one time source; no `THREE.Clock` advancing anything.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Three imported into core/test graph | LOW if early / MEDIUM late | Move renderer behind `js/render-three.js`; rewire shell; revert test-side hacks; add CI gate |
| Two THREE instances / version drift | LOW | Set both importmap entries to one pinned version; clear CDN cache; retest |
| Silent AudioContext | LOW | Add resume-on-press; state-poll guard |
| Balance explosion | HIGH if shipped | Roll back to additive effects; add stack caps; rerun scripted sim tests; rebalance at N-stack |
| Shader rabbit hole (days sunk) | MEDIUM | Cut to plain flat-shaded low-res (no custom GLSL); re-add passes one at a time behind toggles; or adopt RetroPassNode/community lib wholesale |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. three in test graph | Render-shell setup (first task) | CI runs `npm test` unchanged; import-graph grep |
| 4. CDN drift/vendoring | Render-shell setup (first task) | Offline load of game with network disabled; one pinned version in repo |
| 3. Two clocks / interpolation | Render-shell wiring | 60 Hz vs 144 Hz monitors identical feel; multi-cycle score test |
| Dual-init + rng determinism (debt) | Render-shell rewrite | Single `resetRunState()`; `tickRun(..., rng)` threaded |
| 5. PS1 shader stack | Presentation/shader phase | Visual checklist; still-camera stability test |
| 2. Audio autoplay | Audio phase | Cold-load first-tap test incl. iOS |
| 6. Catalogue balance + fake choice | Card-catalogue phase (after shell) | Headless 1000-tick sim tests; offer[1] reachable in play |

**Sequencing guidance for the roadmapper:** the render shell (with its boundary/vendoring/clock guardrails) must land **before** the card-catalogue phase, because the catalogue's cheap mitigation (pure-core scripted simulation tests) depends on the core staying Node-importable; audio can run parallel to either (its only coupling is the `press()` gesture hook). Shader polish should timebox-spike before committing scene content budget, so the asset scope decision (primitives vs modeled character) is made with evidence.

## Sources

- MDN: Autoplay guide for media and Web Audio APIs (fetched 2026-10; updated 2026-09) — suspended contexts, sticky activation, no policy-change event. MEDIUM confidence.
- MDN: AudioContext reference (fetched 2026-10) — one-context reuse guidance, resume()/state. MEDIUM confidence.
- Gaffer On Games, "Fix Your Timestep!" (canonical; fetched 2026-10) — accumulator, spiral-of-death clamp, alpha-interpolation. HIGH confidence.
- pixelwolf.net, "Why PS1 Geometry Wobbles…" (2026-08-31, fetched) + related ordered-dithering/affine posts — snap-in-NDC recipe, noise-vs-quantization, coherent-stack advice. MEDIUM confidence.
- three.js official docs page `RetroPassNode` (via search snippet 2026-10) — vertex snap + affine + 0.25-res pass exists in the nodes API. MEDIUM confidence.
- Live CDN probes (this session, HIGH/verified): `three@0.170.0` package.json exports (`three/addons/*` → examples/jsm); `three@0.180.0` `three.module.js` imports `./three.core.js` (200 OK).
- Local experiment (verified): Node v26.8.1 rejects URL-valued `imports` map — `ERR_MODULE_NOT_FOUND` for bare `three`.
- three.js forum, "How to use addons in Three.js" — importmap convention for addons; GitHub issue #29342 (addons path confusion). MEDIUM.
- Reddit r/gamedesign "So you want to make a roguelike deck-builder" series; hayao.dev Balatro design-codex note (multiplier-explosion fantasy) — community balance consensus. LOW-MEDIUM.
- `.planning/codebase/CONCERNS.md` + `ARCHITECTURE.md` and source files `js/game.js`, `js/rope.js`, `js/upgrades.js` (read in full) — all code spot references verified against source.

---
*Pitfalls research for: jumprope-web — Three.js render shell + WebAudio + card catalogue milestone*
*Researched: 2026-10-15*
