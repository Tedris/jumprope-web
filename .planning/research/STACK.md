# Stack Research

**Domain:** Browser 3D game — PS1-style demake, static-file delivery, no build step
**Researched:** 2026-10-15
**Confidence:** HIGH (stack/CDN/versions verified against registry and live CDNs) · MEDIUM-HIGH (PS1 shader specifics — established practice, but chunk names need a version-local spike)

## Key Findings

- **Three.js current stable is r186 (`three@0.186.1`)** — verified via npm registry. Pure ESM (`"type": "module"`), MIT. WebGL renderer build transfers **≈130 KB compressed** (two files: `three.module.js` imports `./three.core.js`). No minified build is shipped — do not reference `three.module.min.js`; it no longer exists.
- **The correct no-build pattern is an importmap + direct versioned jsDelivr URLs**, not esm.sh. CDN-hosted addon files (`examples/jsm/*`) import the **bare specifier `'three'`** (verified in `OrbitControls.js@0.186.1`), and the page's import map resolves bare specifiers for *all* modules on the page — including CDN-served ones. This is the pattern documented by three.js itself.
- **Three.js dropped WebGL1 support in r163** (verified in r163 release notes). WebGL2 is required — fine for the repo's "modern evergreen browsers" baseline (WebGL2 is baseline since 2021, Safari 15+).
- **The PS1 look is ~70% resolution, not shaders.** Low internal render resolution (320×180-ish) + nearest-filter upscale + flat shading + one custom pass for vertex snapping and Bayer dither covers the aesthetic. Vertex snapping is a ~15-line `onBeforeCompile` snippet; true affine texture mapping is NOT worth it (GLSL ES has no `noperspective`; the fake requires a depth-reprojection post pass — skip it by using flat-colored/vertex-colored low-poly geometry with no textures).
- **WebAudio needs zero libraries.** One `AudioContext`, unlocked (resumed) inside the existing first-press handler in the `js/game.js` shell, procedural SFX (oscillator + noise-buffer envelopes), one preloaded looping `AudioBufferSourceNode` for music. Autoplay policy is the only real constraint, and the game's one-button start gesture satisfies it naturally.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Three.js (`three`) | **0.186.1** (pinned) | WebGL scene graph, camera, materials, the only render-shell dependency | Smallest API surface that fits "render an immutable state object each frame"; addons load straight off CDN via import map; huge ecosystem of PS1-shader prior art. This is the single deliberate break of the zero-dep rule (PROJECT.md). |
| Import maps (browser built-in) | baseline 2024 (Chrome/Edge 125, Safari 16.4, Firefox 108) | Map `"three"` / `"three/addons/"` to pinned CDN URLs | Required because addon modules import bare `'three'`; makes a future vendored-copy swap a one-line change. No polyfill needed for the repo's browser baseline. |
| Web Audio API (`AudioContext`) | browser built-in | SFX + looping music | Zero deps, sample-accurate scheduling via `AudioContext.currentTime`; any wrapper lib is dead weight at this scope. |
| Existing shell plumbing | unchanged | `requestAnimationFrame` fixed-step loop (`js/game.js:224-235`, `STEP = 1/120`), Pointer/Keyboard events, `localStorage` | Already correct and tested; only the draw layer (`js/game.js:113-222` `draw()` and the 2D context at `js/game.js:58`) is replaced. |

### Recommended import pattern (goes in `index.html`, before the module script)

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"
  }
}
</script>
<script type="module" src="js/game.js"></script>  <!-- existing line, unchanged -->
```

Then in render-shell code (e.g. a new `js/render/renderer.js`):

```js
import * as THREE from 'three';
// addons only if truly needed:
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
```

Rules that follow from verification:
- Pin the **exact** version (`three@0.186.1`, never `@latest`/ranges) — jsDelivr serves versioned URLs with `Cache-Control: max-age=31536000, immutable`, so returning players never re-download.
- The sim core (`js/rope.js`, `js/player.js`, `js/upgrades.js`, pure exports of `js/game.js`) must **never** import `three` — keeps `node --test tests/` green with no network and no resolution of the map (Node ignores browser import maps; the pure modules never touch them).
- Mirror the `typeof document !== 'undefined'` guard pattern (`js/game.js:238`) with a `typeof THREE`/`AudioContext` guard in any module the tests transitively touch.

### PS1 Renderer Techniques (Three.js-specific recommendations)

| Technique | Method | Effort | Notes |
|-----------|--------|--------|-------|
| Low internal resolution | Render the scene into a `WebGLRenderTarget` sized ~320×180 (16:9) or 320×240 (4:3, more authentic), then draw a fullscreen quad with `NearestFilter` magnification. Set `renderer.setPixelRatio(1)`, `antialias: false`. | Low | RT+quad beats the "small canvas + CSS `image-rendering: pixelated`" trick because the quad's fragment shader is also where dither/quantize go — one extra pass total, satisfying PROJECT.md's "no post-processing beyond simple dithering". |
| Vertex snapping / wobble | Inject via `ShaderMaterial` or `material.onBeforeCompile` after the `project_vertex` chunk: quantize `gl_Position.xy` to a virtual grid in NDC (`pos.xy = floor(pos.xy / pos.w * grid) / grid * pos.w` style, ~10-15 lines). | Low | This is THE signature PS1 effect and it's cheap. Chunk names (`project_vertex`) are stable but verify against 0.186.1 in a spike — `onBeforeCompile` string-replacement is version-sensitive. TSL/`NodeMaterial` (`three/tsl` export exists) is the modern alternative; plain `onBeforeCompile` is smaller and fine here. |
| Flat / vertex lighting | `material.flatShading = true` on `MeshLambertMaterial` + deliberately low-poly `BufferGeometry`. | Trivial | True Gouraud (per-vertex) lighting isn't exposed in modern three; the low-res target hides the per-fragment difference. |
| Dithering + color quantize | Ordered 4×4 Bayer dither, quantize output to 5 bits/channel, **in the upscale quad's fragment shader**. | Low | One small GLSL string. No `EffectComposer` — pulling the postprocessing addon chain for one filter is the wrong tradeoff. |
| Affine texture mapping | **Skip.** GLSL ES has no `noperspective`; faking it needs depth-reprojection post shaders (the "three-psx" approach). | — | Sidestep entirely: use **texture-free materials** (flat colors + vertex colors) on low-poly geometry. Textures are where affine wobble matters; a texture-free PS1-style stage loses nothing. |
| Palette purity | `THREE.ColorManagement.enabled = false` (or `renderer.outputColorSpace = LinearSRGBColorSpace`) | Trivial | Since r152 color management defaults to sRGB conversion, which softly blends the crunchy 8-bit palette. Turn it off for raw values. |
| Camera | `PerspectiveCamera`, moderate FOV (50-60°); optional: quantize camera position to a coarse grid per frame for genre-authentic jitter | Trivial | Keep it a data read from sim state; camera logic is presentation, still never feeds back. |
| Character/stage assets | Hand-built `BufferGeometry` in code first; `GLTFLoader` (from `three/addons/`) only if a Blender-made low-poly model later beats coding verts | Med | Zero asset pipeline = zero build step preserved. GLTF loading needs no draco/KTX2 addons at this scale. |

**Renderer flags (verified relevant for 0.186.1):** WebGL2 required (WebGL1 removed r163); `antialias: false`; `powerPreference: 'default'`; no shadows needed (bake fake blob shadow as a dark disc mesh — cheaper and more PS1 than shadow maps).

### WebAudio Layer

| Concern | Recommendation | Why |
|---------|----------------|-----|
| Autoplay policy | Lazily create one `AudioContext`; call `ctx.resume()` inside the existing `press()` input path in the `js/game.js` shell | Browsers start contexts `suspended`; the one-button start/restart gesture is a guaranteed user gesture. No extra "click to enable audio" UI needed. |
| SFX | Procedural: `OscillatorNode` + `GainNode` ADSR envelopes for jumps/clicks; a small pre-generated white-noise `AudioBuffer` (64-128 ms) with a bandpass sweep for the rope whoosh | Zero binary assets, fully code-reviewable, matches the project's code-only aesthetic. Optionally generate buffers at 22050 Hz sample rate for lo-fi crunch. |
| Music | One decoded looping `AudioBuffer` (`source.loop = true`), OGG/MP3 file (≤ ~1 MB) fetched at boot and `decodeAudioData`'d; start/stop via `source.start(ctx.currentTime)` | Gapless loop from buffer start; `currentTime` scheduling avoids `setTimeout` drift. Only asset besides nothing — acceptable. |
| Master control | Single master `GainNode` → destination; mute = gain 0; `document.visibilitychange` → `ctx.suspend()`/`resume()` | Standard; also stops the loop burning battery in background tabs. |
| Testability | Keep audio in the imperative shell (`js/audio.js` or similar), never imported by sim core; guard module-level `AudioContext` access so `node --test` never trips on it | Mirrors the existing purity invariant (`.planning/codebase/ARCHITECTURE.md` "Purity invariant"). |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Static server for dev | Unchanged: `npx serve .` or `python3 -m http.server` | ES modules still require HTTP, not `file://`. |
| `node --test tests/` | Unchanged | Sim core stays Three-free; nothing new to install. `package.json` still needs no dependencies — the import map lives only in `index.html`. |
| No new tools | — | No bundler, transpiler, linter change, or TS introduced by this research. |

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Three.js 0.186 via CDN | Raw WebGL2 | Only if the zero-dep rule were re-absolute. Realistically ~800-1200 extra LOC for matrix math, shaders, and resource plumbing the sim-first architecture doesn't benefit from. PROJECT.md already sanctioned exactly one dependency break. |
| Three.js | Babylon.js | Games needing physics/inspector/heavy asset pipeline. Its CDN ESM story exists but the core is ~3-4 MB compressed vs three's ~130 KB — wrong weight class for a static-file demake. |
| Three.js | PlayCanvas | Teams using the PlayCanvas editor/publishing pipeline. Engine-via-CDN is possible (~1.7 MB) but its entity/scripting runtime assumes an asset pipeline this project deliberately lacks. |
| Three.js WebGL renderer | three's WebGPU build (`three/webgpu`) | Never here — WebGL2 is the widest safe target and the WebGL backend is the mature path in 0.186.x. |
| `onBeforeCompile` snippets | Community PSX shader packages (various gists/repos: "psx shader", "three-psx" postprocess) | Most target older three minor versions and drag in EffectComposer; the effects are small enough to own inline. |
| Raw WebAudio | Howler.js | Shipping many compressed audio files with sprites/3D positional needs. With procedural SFX + one loop, Howler is pure overhead (and another CDN hit). |
| jsDelivr direct build | esm.sh (`https://esm.sh/three@0.186.1`) | esm.sh works (verified 200) and auto-rewrites bare imports (no importmap needed), but serves *transformed* output, adds a third-party transpile dependency, and makes SRI hashes fragile. Prefer serving the as-published file. |
| Import maps | Direct-URL imports without importmap (`import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js'`) | Fine for main-module-only usage, but breaks the moment any addon is imported (bare `'three'` inside addon files won't resolve — verified). Use the importmap from day one; also gives the vendoring escape hatch for free. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `three.module.min.js` / `three.min.js` / UMD `<script>` global | Minified module build removed from the package (verified absent from 0.186.1's `build/`); UMD/global builds are long gone. Stale tutorials still show them. | `build/three.module.js` via importmap. |
| `@latest` or range CDN URLs | Cache poisoning + silent breakage across three's monthly minor releases (API churn is real between r-numbers). | Exact pin `three@0.186.1`; bump deliberately. |
| `EffectComposer` + postprocessing addon chain | A whole render-pass framework for one dither/upscale filter; violates "no post-processing beyond simple dithering". | One `WebGLRenderTarget` + one fullscreen-quad `ShaderMaterial`. |
| Texture-based materials + affine-mapping emulation | Needs depth-reprojection shaders for an effect avoidable by design. | Flat-color/vertex-color low-poly geometry. |
| Importing `three` anywhere in the sim core | Kills Node testability (`node --test` can't resolve the browser import map) and violates the purity invariant. | Keep all `three` imports inside the render shell module graph. |
| Mixing esm.sh and jsDelivr URLs in one importmap | Two transitive graphs of the same lib → duplicate module instances, broken `instanceof`. | Pick jsDelivr for everything under `three/`. |

## Stack Patterns by Variant

**If the CDN is a single point of failure worry (offline LAN demo, flaky hosting):**
- Vendor `three.module.js`, `three.core.js` (and any used addons) into `js/vendor/three/` and change the two importmap lines. Files are as-published; no build needed. Because the importmap is the only coupling point, this is a 2-line, revertible mitigation — decide at ship time, not now.

**If SRI/CSP hardening is later required:**
- Import-map `integrity` metadata does not cover the second-stage fetch of `three.core.js`; the robust answer is the vendored copy above (self-hosted = self-hashed).

**If authoring the character in Blender later beats hand-coding vertices:**
- Add `import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'` and a static `.glb` in `assets/`. Still zero build step; keep export quantized to sane vertex counts (<2k tris).

**If audio wants more PS1 grit:**
- Bitcrush procedurally at buffer-generation time (downsample + quantize into the `AudioBuffer`) rather than adding a runtime WaveShaper effect chain. Static crunch > live DSP at this scope.

## Version Compatibility

| Package / Surface | Compatible With | Notes |
|-------------------|-----------------|-------|
| `three@0.186.1` | WebGL2-capable evergreen browsers (Chrome/Edge, Firefox, Safari ≥15) | WebGL1 support removed in r163; `WebGLRenderer` is the WebGL2 backend. No IE/old-Safari story — consistent with existing repo baseline (`.planning/codebase/STACK.md`). |
| `three@0.186.1` build files | jsDelivr, unpkg (both verified 200, identical bytes); esm.sh (verified, transformed output) | `three.module.js` does `import './three.core.js'` — expect 2 cached requests, both immutable-cached. |
| `three/addons/*` (0.186.1) | The page importmap | Addon files import bare `'three'` (verified); the map resolves it for CDN-served modules too. |
| `three` `"type": "module"` | Repo `package.json` `"type": "module"` | Same ESM semantics the project already uses. |
| Sim core + `node --test` | Node ≥18, **no** `three` resolution | By design: tests never import the render shell; the `typeof document` guard pattern (`js/game.js:238`) extends to `three`/`AudioContext` modules. |
| Three.js minors (r1xx → r1xx+1) | Monthly cadence; `onBeforeCompile` chunk names and default color-management behavior have historically shifted (e.g. r152 color management, r163 WebGL1 removal) | Pin 0.186.1; when bumping, re-run the PS1 shader spike checks (see research flag below). |

## Implications for the Roadmap / Phases

1. **Renderer phase needs a small upfront shader spike** (½ day): confirm on 0.186.1 that (a) RT+nearest-upscale quad pipeline, (b) an `onBeforeCompile` vertex-snap injection into `MeshLambertMaterial`, and (c) `ColorManagement.enabled = false` all behave as expected. `onBeforeCompile` string surgery is the only genuinely version-fragile piece in the whole stack.
2. **The importmap edit in `index.html` is the dependency phase boundary** — everything sim-side stays byte-identical. The draw-layer swap should introduce exactly one new import of `three` (the render shell entry), keeping the break of the zero-dep rule as contained as PROJECT.md intends.
3. **Audio phase is dependency-free** — no CDN, no assets required for SFX (procedural), one optional loop file. Autoplay handling belongs in the same PR as the shell rewrite because it hooks `press()` in `js/game.js`.
4. **No installation step exists at all** — there is nothing to `npm install`; "installation" is literally the 8-line index.html edit above. Keep it that way.

## Installation

```bash
# Nothing to install. The entire dependency surface is this edit to index.html:
# (order matters: importmap must precede the module script)

# <script type="importmap">{ "imports": {
#   "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",
#   "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"
# } }</script>
# <script type="module" src="js/game.js"></script>

# Dev, unchanged:
python3 -m http.server 8080   # or: npx serve .
node --test tests/            # still dependency-free, still offline-capable
```

## Sources

- **npm registry** (`three`, `@types/three` latest metadata) — verified current stable = **0.186.1**; package `exports` map verified (`./addons/*` → `./examples/jsm/*`, `./tsl`, `./webgpu` entries exist) — **HIGH**
- **jsDelivr / unpkg / esm.sh** live HTTP checks — build files reachable and byte-identical on jsDelivr/unpkg; `three.module.js` ≈663 KB raw / **≈130 KB compressed**; `three.module.min.js` absent from `build/`; `three.module.js` imports `./three.core.js`; `examples/jsm/controls/OrbitControls.js` imports bare `'three'` — **HIGH**
- **three.js r163 GitHub release notes** — "Remove WebGL 1 support" verified in changelog — **HIGH**
- **three.js docs / installation guide (threejs.org, reachable)** — importmap + pinned CDN is the documented no-build pattern — **HIGH**
- **MDN Web Audio** (API surface: `AudioContext.resume`, `AudioBufferSourceNode.loop`, autoplay policy) — established standard behavior — **HIGH**
- **PS1 shader technique corpus** (community gists/demos: clip-space vertex quantization, RT low-res + nearest upscale, Bayer dither, affine-mapping via depth reprojection) — established practice, cross-consistent across sources; exact `onBeforeCompile` chunk strings unverified against 0.186.1 — **MEDIUM** (flagged for phase spike)
- Import maps browser baseline (Chrome/Edge 125, Safari 16.4, Firefox 108; no polyfill needed since 2024) — **HIGH**

---
*Stack research for: PS1-style static-hosted browser 3D game (Three.js, no build step)*
*Researched: 2026-10-15*
