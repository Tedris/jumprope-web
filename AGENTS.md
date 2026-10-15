<!-- GSD:project-start source:PROJECT.md -->

## Project

**Jumprope Web — PS1-Style Rope-Jump Roguelike Demake**

A browser-based, one-button jump-rope roguelike in the spirit of *Scarlet Skips* (Yerk Games, 2026) — a demake, not a clone. The existing vanilla-JS Canvas prototype (`js/game.js` and friends) is evolved into a low-end 3D PS1-style game: an original low-poly character skipping rope in a dithered, vertex-wobbling scene, with runs punctuated by pick-two upgrade cards.

**Core Value:** One button, one rope, one perfect rhythm loop — the jump-timing feel must be joyful before anything else works.

### Constraints

- **Tech stack**: Three.js via CDN for rendering only — keeps deployment static-file-only, no build step
- **Architecture**: simulation core stays pure and framework-free; WebGL layer never feeds back into game logic
- **Performance**: PS1 aesthetic is a feature — low internal render resolution, no post-processing beyond simple dithering
- **Delivery**: static files only (any static host; still no server component)

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- JavaScript (ES Modules, `type: "module"`) — all application code in `js/*.js` and tests in `tests/*.js`
- HTML5 — single page entry `index.html` (13 lines, canvas-only page)
- CSS — minimal styling in `css/style.css`
- None (no TypeScript, no build languages)

## Runtime

- Browser (modern evergreen browsers): ES modules via `<script type="module">`, Canvas 2D API, `requestAnimationFrame`, Pointer Events, `localStorage`
- Node.js for running tests only (detected v26.8.1 locally); the app itself never runs on Node except when tests import modules directly
- npm — effectively unused
- `package.json` contains only `{ "name": "jumprope-web", "private": true, "type": "module" }` — no dependencies, no devDependencies, no scripts
- Lockfile: missing (no dependencies to lock)

## Frameworks

- None — vanilla JavaScript. Rendering uses the raw Canvas 2D API (`js/game.js:58` `canvas.getContext('2d')`); the game loop is a hand-rolled fixed-timestep `requestAnimationFrame` loop (`js/game.js:224-235`, `STEP = 1/120`).
- Node.js built-in test runner (`node:test`) with `node:assert/strict` — no test framework installed
- Run with: `node --test tests/`
- None. No bundler, no transpiler, no minifier. Source is served directly (any static file server works, e.g. `npx serve .` or `python3 -m http.server`).

## Key Dependencies

- None — zero runtime npm dependencies by design.
- None. All platform features are browser built-ins: `CanvasRenderingContext2D`, `requestAnimationFrame`, `performance.now()`, `localStorage`, Pointer/Keyboard Events.

## Configuration

- No environment variables; no `.env` files present.
- All tunables are inline constants in source: canvas size `W=480, H=640`, physics step `STEP=1/120` (`js/game.js:53-55`), gravity `1800` (`js/player.js:15`, `js/game.js:11`), jump velocity curve (`js/player.js:6-8`), rope period `1.3s` (`js/game.js:62`).
- No build config files exist.

## Platform Requirements

- Any static HTTP server (ES modules require HTTP, not `file://`) plus a modern browser; Node.js ≥ 18 for `node --test`.
- Static file hosting only — the repo is deployable as-is to any static host (GitHub Pages, Netlify, etc.). No server component.

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- Lowercase single-word module files in `js/` (`rope.js`, `player.js`, `upgrades.js`, `game.js`)
- Tests mirror their module name: `tests/<module>.test.js` (`tests/player.test.js` tests `js/player.js`)
- `camelCase` for all functions (`createRope`, `updatePlayer`, `clearsRope`, `shouldOfferUpgrade`)
- Factory functions prefixed `create*` returning a fresh plain object: `createRun()` (`js/game.js:5`), `createPlayer()` (`js/player.js:1`), `createRope()` (`js/rope.js:1`)
- Update functions prefixed `update*`, returning a **new** object, never mutating: `updateRope` (`js/rope.js:5`), `updatePlayer` (`js/player.js:13`)
- Predicate functions read as questions: `atFeet()`, `clearsRope()`, `shouldOfferUpgrade()`
- `camelCase` locals; module-level constants `UPPER_SNAKE` for fixed values (`W`, `H`, `STEP` in `js/game.js:53-55`, `UPGRADES` in `js/upgrades.js:1`)
- No TypeScript. State is plain object literals with implicit shapes:
- Naming convention `*Mul` suffix for multiplier effect fields.

## Code Style

- No formatter configured (no Prettier/Biome/EditorConfig detected). De facto style:
- Note: `js/game.js:62-65` and `70-78` contain stray 4-space indentation inside `startGame` — do not propagate; use 2 spaces.
- None configured. Keep code warning-free under default Node ESM strictness.

## Import Organization

- None. Always relative with `.js` extension (required by browser native ESM and Node ESM).

## Error Handling

- Pure logic modules (`rope.js`, `player.js`, `upgrades.js`) throw nothing and never mutate — they return new state objects.
- External I/O is wrapped in `try/catch` with silent graceful degradation, never rethrown:
- Feature detection guard for browser-only boot code:
- Invalid input is coerced, not rejected: `Number(...) || 0` (`js/game.js:39`).

## Logging

- Do not add `console.log` to pure modules; the canvas `draw()` renders status text instead (`js/game.js:202-221`).

## Comments

- Sparse. Only for non-obvious fallbacks, e.g. `// storage unavailable; best score is session-only` (`js/game.js:49`).
- No section-divider or WHAT-restating comments.
- Not used.

## Function Design

- Positional primitives; options via default parameters: `createRope(period = 0.9)`, `updatePlayer(player, dt, gravity = 1800)`, `obstacleX(phase, width, cx = width / 2)`
- Dependency injection for randomness: `pickTwo(upgrades, rng)` takes an `rng` function so tests pass seeded stubs (`js/upgrades.js:16`, used at `js/game.js:23` with `Math.random`)
- Storage injection: `loadBest(storage)` / `saveBest(storage, score)` take a storage object; `localStorage` supplied only at the call sites in `startGame` (`js/game.js:66, 89, 109`)
- State updates return a composite result object, never mutate arguments:
- Immutable updates via object spread: `{ ...run, score, skips, status, offer }` (`js/game.js:30`, `js/player.js:10`, `js/upgrades.js:3`)

## Module Design

- Named exports only — no default exports anywhere.
- Each module follows the "model module" pattern: `create*` factory + `update*` + predicates, all pure. `js/game.js` additionally holds the impure `startGame(canvas)` shell (DOM, canvas, rAF, input) at the bottom, with all testable logic kept above it as pure functions.
- None. `js/game.js` imports directly from sibling modules and re-exposes the composition API (`js/game.js:1-3`).
- Pure, deterministic logic lives in `js/*.js` exported functions (testable in Node).
- Impure concerns (canvas rendering, `performance.now()`, `requestAnimationFrame`, DOM events, `localStorage`) live only inside `startGame` in `js/game.js`.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Runtime shell | rAF frame loop with fixed-timestep accumulator, input wiring (pointer + space), draw, best-score persistence | `js/game.js` (`startGame`, lines 57–236) |
| Run orchestration | Composes rope/player/upgrades into a tick; detects the feet-crossing scoring event; run state machine | `js/game.js` (`createRun`, `tickRun`, `applyUpgrade`, lines 5–35) |
| Rope model | Rotation phase advancement/wrapping, feet-window detection, obstacle screen position | `js/rope.js` |
| Player physics | Jump velocity from hold time, gravity integration, grounding, squash-spring animation state | `js/player.js` |
| Upgrade system | Effect multipliers (float/rope/score/window), upgrade catalogue, pick-two offer logic, offer cadence | `js/upgrades.js` |
| Persistence | Best score get/set with try/catch guards | `js/game.js` (`loadBest`, `saveBest`, lines 37–51) |

## Pattern Overview

- All simulation functions are **pure**: they take state objects and return new state (`{ ...state, changed }` spread copies). No mutation anywhere in simulation code (verified by test "updateRope does not mutate" in `tests/rope.test.js`).
- Factory functions (`createRope`, `createPlayer`, `createRun`, `freshEffects`) return plain POJO state objects — no classes anywhere.
- The impure shell (`startGame`) is the only place holding mutable module state, closed over in a single function; a `typeof document !== 'undefined'` guard (`js/game.js:238`) makes the module importable under Node for tests.
- **Fixed-timestep loop:** physics runs at `STEP = 1/120` s inside an accumulator in `frame()` (`js/game.js:224–234`); accumulator clamped to 0.25 s to avoid spiral-of-death.

## Layers

- Purpose: All game rules and physics; zero browser API usage.
- Location: `js/rope.js`, `js/player.js`, `js/upgrades.js`, and the top exported functions of `js/game.js` (lines 1–51).
- Contains: Factory functions, transition functions (`updateRope`, `updatePlayer`, `tickRun`, `applyUpgrade`), predicates (`atFeet`, `clearsRope`, `shouldOfferUpgrade`).
- Depends on: Nothing (except each other via imports in `tickRun`).
- Used by: The runtime shell and all files in `tests/`.
- Purpose: Frame loop, input handling, rendering, storage.
- Location: `js/game.js` lines 53–240 (`startGame` and below).
- Contains: `requestAnimationFrame` loop, canvas 2D draw code, pointer/keyboard listeners, `localStorage` access.
- Depends on: Simulation core + browser APIs (`canvas`, `performance.now`, `localStorage`, `requestAnimationFrame`).
- Used by: `index.html` via `<script type="module" src="js/game.js">`.

## Data Flow

### Primary Request Path (frame tick)

### Input / State-Machine Path

## Key Abstractions

- Purpose: Aggregate of status/score/skips/effects/offer for one playthrough.
- Examples: `js/game.js:5–7` (`createRun`)
- Pattern: Immutable record; transitions return copies.
- Purpose: Numeric multipliers that bend simulation constants (`floatMul` → gravity, `ropeMul` → rope speed, `windowMul` → clearance threshold, `scoreMul` → points per skip).
- Examples: `js/upgrades.js:12–14` (`freshEffects`), `js/upgrades.js:1–10` (`UPGRADES` with `apply: s => ({...s, ...})` closures)
- Pattern: Data + behavior in one object; upgrades are pure endofunctions over the effects record.
- Purpose: Single normalized 0–1 rotation phase drives everything — scoring window (`atFeet` at 0.45–0.55), obstacle x-position (`obstacleX`), and visual bob/sway in `draw()`.
- Examples: `js/rope.js`
- Pattern: Phase is the game's master timeline; player position is judged against it.

## Entry Points

- Location: `index.html` → `js/game.js` (auto-invoked at `js/game.js:238–240`)
- Triggers: Page load; `startGame(document.getElementById('game'))` runs at module evaluation.
- Responsibilities: Boots the rAF loop and binds all input listeners.
- Location: `tests/*.test.js` via `node:test`
- Triggers: `node --test tests/`
- Responsibilities: Import the pure exports only; the `typeof document` guard prevents the browser bootstrap from firing.

## Architectural Constraints

- **Threading:** Single-threaded browser event loop; physics is deterministic given equal `dt` (fixed STEP), rendering decoupled from stepping.
- **Global state:** None at module scope except constants (`W`, `H`, `STEP` in `js/game.js:53–55`, `UPGRADES` in `js/upgrades.js`). All mutable state is inside the `startGame` closure.
- **Circular imports:** None — dependency graph is a DAG: `game.js → {rope.js, player.js, upgrades.js}`; `upgrades.js` and `rope.js`/`player.js` import nothing.
- **Purity invariant:** Simulation functions must not touch DOM, `Date`, `Math.random` directly (`tickRun` passes `Math.random` into `pickTwo` as an injectable `rng` — keep randomness injectable), or storage. `loadBest`/`saveBest` take `storage` as a parameter for the same reason.
- **No build step:** Plain ES modules served/loaded directly; `package.json` only sets `"type": "module"`.

## Anti-Patterns

### `Math.random` passed inline at the call site

### Dual state initialization

## Error Handling

- `loadBest`/`saveBest` wrap `localStorage` in try/catch and degrade to session-only scores (`js/game.js:37–51`).
- No exceptions thrown from simulation code; invalid states are represented as data (`status: 'over'`, `tripped: true` flag) rather than errors.

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-fast` for a trivial task inline, with no subagents and no PLAN.md
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
