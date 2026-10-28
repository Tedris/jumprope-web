# Architecture: Jumprope Web

> Carried forward from GSD codebase maps (see `docs/archive/gsd/planning/codebase/`,
> mapped 2026-10-15 — pre-v1.0) and updated against the shipped v1.0 tree.
> Source of truth is the code itself; this document is the spine for new work.

## System Overview

```text
Browser (index.html)
  └─ importmap pins three@0.186.1 (CDN) ──────────────┐
       │                                              ▼
  js/shell.js ──────────────────► js/render3d.js  (sole `three` consumer)
   rAF fixed-step loop,              PS1 pipeline: 240-row Nearest RT,
   input, pause/visibility,          vertex snap, sRGB→Bayer/15-bit pass,
   audio lifecycle, resize           chibi rig + sag-baked rope, dither
       │  one-way view payload (immutable sim state + cosmetic clock)
       ▼
  js/game.js (pure run orchestration: createRun/tickRun/applyUpgrade)
    ├─ js/rope.js        phase clock, atFeet window, obstacle geometry
    ├─ js/player.js      hold-to-jump physics, gravity, squash-spring
    ├─ js/upgrades.js    UPGRADES catalogue, effects multipliers, pickOffers
    └─ js/interpolate.js lerpPhase (wrap-aware phase interpolation)
  js/audio.js — leaf: procedural WebAudio SFX fed by the shell's event
                channel; zero references from the sim import graph
  localStorage ('jumprope-best', mute/volume) via injected storage seam
```

## The One Rule That Matters

**Pure functional core / imperative shell.** Simulation code
(`game.js`/`rope.js`/`player.js`/`upgrades.js`/`interpolate.js`) never touches
DOM, `Date`, `Math.random`, or storage, never mutates (spread copies only), and
imports nothing browser-side. The WebGL layer never feeds back into game logic
— the shell passes a one-way, immutable view payload to `render3d.js`.
This is enforced mechanically by the derived-entry import-graph walk in
`tests/boundary.test.js` (fails on any `three` reference or browser IO in the
test-reachable sim graph).

## Layers

| Layer | Files | Purity | Notes |
|-------|-------|--------|-------|
| Simulation core | `js/game.js`, `js/rope.js`, `js/player.js`, `js/upgrades.js`, `js/interpolate.js` | Pure, Node-importable | Factory `create*` + `update*` returning new state; predicates read as questions; rng injected as a parameter (`tickRun`'s 5th arg) |
| Runtime shell | `js/shell.js` | Impure | rAF loop, fixed `STEP = 1/120` accumulator (clamped 0.25 s), pointer/keyboard/visibility input, pause, storage seam, resize/letterbox |
| Renderer | `js/render3d.js` | Impure; sole `three` consumer | PS1 recipe: low-res Nearest render target, NDC vertex snap, single sRGB-then-Bayer/15-bit post pass; poses only from `lerpPhase` theta |
| Audio | `js/audio.js` | Leaf, impure | Five procedural SFX voices, master bus, gesture-lifecycle AudioContext, suspend/resume guards; sim graph stays audio-free |

## Key Abstractions

- **Run** — immutable record `{ status, score, skips, effects, owned, offer, ... }`;
  states `idle → running ↔ choose → over → (restart)`. Invalid states are data
  (`status: 'over'`, `tripped: true`), never thrown errors.
- **Rope phase** — the canonical 0–1 clock: scoring window (`atFeet` 0.45–0.55),
  rope geometry, character pose, and visuals all derive from it. Audio follows
  gameplay; nothing beat-locks.
- **Effects** — upgrade multipliers (`floatMul`/`ropeMul`/`scoreMul`/`windowMul`)
  as pure endofunctions over an effects record; `ropeMul` capped per-card so
  stacked speed cards stay inside the rope-wrap bound by construction.
- **Cross-cutting singletons** — one shared handler per concern:
  `releaseEverything()` (all input-loss paths), `resumeRun()` (all resume paths),
  `snapGridFor()` (reduced-motion snap grid). Do not duplicate per path.

## Invariants & Guardrails

- Dependency graph is a DAG; no circular imports.
- No module-scope mutable state outside the shell closure; `typeof document`
  guards keep all modules importable under Node.
- Reduced motion dampens cosmetics only — rope timing and judgment stay
  byte-identical; the flag is never persisted.
- Frozen-test discipline: existing `tests/*.test.js` files stay byte-identical;
  new behavior is pinned by new test files. Test expectations derive from
  card/metadata records, not hardcoded tables.
- Every factory return contract gets a Node-side contract test in the same
  change that introduces it; gesture/audio guards get red-green test legs when
  written, not at verification. (v1.0 retrospective lessons.)

## Delivery & Tooling

- Plain ES modules, no build step, no npm deps (`package.json` is
  `{ type: "module" }` only); Three.js via importmap-pinned CDN, render shell
  only.
- Tests: `node --test tests/` (Node ≥ 18, `node:test` + `node:assert/strict`);
  deterministic via seeded rng injection; includes the 1000-tick headless-sim
  balance gate.
- Serve with any static HTTP server (`npx serve .` / `python3 -m http.server`).

## Known Debt

- WR-02: reduced-motion idle pose still animates arms/scarf off wall-clock
  `beat` (`js/render3d.js:387`) — one-line fix.
- `audio/track.ogg` content missing (mechanism shipped; degrades to silence).
