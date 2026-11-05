# AGENTS.md — Jumprope Web

## Project

**Jumprope Web — PS1-Style Rope-Jump Roguelike Demake**

A browser-based, one-button jump-rope roguelike in the spirit of *Scarlet Skips* (Yerk Games, 2026) — a demake, not a clone. A vanilla-JS Canvas prototype evolved into a low-end 3D PS1-style game: an original low-poly character skipping rope in a dithered, vertex-wobbling scene, with runs punctuated by pick-two upgrade cards. **v1.0 shipped 2026-10-22.**

**Core Value:** One button, one rope, one perfect rhythm loop — the jump-timing feel must be joyful before anything else works.

**Thesis (v2):** an incremental in disguise — the game opens as a humble demake and escalates (upgrades, then tech trees, then more) until players can't quite believe where the gameplay went; surprise-by-escalation is the product. Authoritative wording in `_bmad-output/planning-artifacts/prd.md`.

### Constraints

- **Tech stack**: Three.js via CDN for rendering only — keeps deployment static-file-only, no build step
- **Architecture**: simulation core stays pure and framework-free; WebGL layer never feeds back into game logic (enforced by `tests/boundary.test.js`)
- **Performance**: PS1 aesthetic is a feature — low internal render resolution, no post-processing beyond simple dithering
- **Delivery**: static files only (any static host; still no server component)

## Technology Stack

- JavaScript (ES Modules, `type: "module"`) — app code in `js/*.js`, tests in `tests/*.js`; no TypeScript, no build step, no bundler
- Zero npm dependencies (`package.json` is `{ name, private, type: "module" }` only); Three.js via importmap-pinned CDN (`three@0.186.1`), used only by `js/render3d.js`
- Browser: ES modules, WebGL (Three.js) + 2D canvas UI, `requestAnimationFrame`, Pointer/Keyboard Events, WebAudio, `localStorage`
- Tests: Node.js built-in runner — `node --test tests/` (Node ≥ 18, `node:assert/strict`); deterministic via seeded-rng injection
- Serve with any static HTTP server (ES modules require HTTP, not `file://`), e.g. `npx serve .` or `python3 -m http.server`
- Tunables are inline constants (physics step `STEP = 1/120`, gravity `1800`, rope period `1.3s`); no environment variables or config files

## Architecture

Functional core / imperative shell. Details and the full map live in
[`_bmad-output/planning-artifacts/architecture.md`](_bmad-output/planning-artifacts/architecture.md).

| Layer | Files | Purity |
|-------|-------|--------|
| Simulation core | `js/game.js`, `js/rope.js`, `js/player.js`, `js/upgrades.js`, `js/interpolate.js` | Pure, Node-importable, immutable transitions |
| Runtime shell | `js/shell.js` | Impure: rAF fixed-step loop, input, pause, storage seam, resize |
| Renderer | `js/render3d.js` | Impure; sole `three` consumer; PS1 pipeline |
| Audio | `js/audio.js` | Leaf; procedural WebAudio SFX; absent from the sim import graph |

The rope's normalized 0–1 phase is the canonical clock driving scoring, geometry, and pose. Invalid states are data (`status: 'over'`), never thrown errors.

## Conventions

- Lowercase single-word module files in `js/`; tests mirror module names (`tests/<module>.test.js`)
- `camelCase` functions; factory `create*` returning fresh plain objects; `update*` returning a **new** object, never mutating; predicates read as questions (`atFeet()`, `clearsRope()`)
- Module-level constants `UPPER_SNAKE`; multiplier effect fields use a `*Mul` suffix
- Named exports only; relative imports always with `.js` extension
- Dependency injection for nondeterminism and I/O: rng passed as a parameter, storage objects injected (`loadBest(storage)`); `localStorage`/DOM/`performance.now()` live only in the shell
- State updates via object spread (`{ ...run, score }`); plain POJOs, no classes
- 2-space indentation; sparse comments (non-obvious fallbacks only); no `console.*` in pure modules
- Frozen-test discipline: existing test files stay byte-identical — **except** legs explicitly re-authorized in writing by the story text that ships the replacement behavior (interim fences only, e.g. Story 1.2 re-contracting Story 1.1's provisional trip legs); the diff must show no other existing-file changes. New behavior is pinned by new test files; test expectations derive from records/metadata, not hardcoded tables
- One shared handler per cross-cutting concern (`releaseEverything()`, `resumeRun()`, `snapGridFor()`) — no per-path duplication
- New factory contracts get a Node-side contract test in the same change; gesture/audio guards get red-green test legs when written, not at verification

## Workflow: BMAD

Project management runs on [BMAD](https://bmadcode.com/) (installed under `_bmad/`, skills under `.agents/skills/`, output under `_bmad-output/`). Modules: **core**, **bmm** (BMad Method), and **gds** (Game Dev Studio).

- **Planning artifacts**: `_bmad-output/planning-artifacts/` — `prd.md` (product truth, v1.0 state, v2 candidates) and `architecture.md` (technical spine)
- **Agents (bmm)**: `bmad-agent-analyst` (Mary), `bmad-agent-pm` (John), `bmad-agent-architect` (Winston), `bmad-agent-dev` (Amelia), `bmad-agent-ux-designer` (Sally); `bmad-help` recommends the right next step
- **Agents (gds)**: `gds-agent-game-designer` (Samus), `gds-agent-game-architect` (Cloud), `gds-agent-game-dev` (Link), `gds-agent-game-solo-dev` (Indie), `gds-agent-tech-writer` (Paige) — plus game workflows: `gds-create-game-brief`, `gds-gdd`, `gds-ux`, `gds-create-epics-and-stories`, `gds-sprint-planning`, `gds-dev-story`, `gds-playtest-plan`, `gds-retrospective`
- **Typical cycle**: `bmad-prd` → `gds-gdd` (game design) → `gds-create-epics-and-stories` → `gds-sprint-planning` → `gds-dev-story` per story → `gds-retrospective`
- **Legacy GSD artifacts**: archived read-only under `docs/archive/gsd/` — do not extend; consult for history (v1.0 phase detail, retrospectives, decisions)

## Housekeeping

- Run tests before committing: `node --test tests/`
- When a story workflow ends with its status set to `done`, commit the full change set (code, tests, story/tracking artifacts) and push
- `index.html` and `package.json` are deliberately near-frozen; touching them needs justification (the boundary fence tests grep for regressions around them)
