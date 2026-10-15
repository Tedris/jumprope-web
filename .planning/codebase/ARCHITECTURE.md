---
last_mapped_commit: 838983f2419d6a82c5167acf9b351994fe9cfa7a
last_mapped_at: 2026-10-15
---
# Architecture

**Analysis Date:** 2026-10-15

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Browser (index.html)                      │
│              <canvas id="game"> + module load                │
└──────────────────────────┬──────────────────────────────────┘
                           │ import (ES modules)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Runtime Shell — js/game.js                   │
│   startGame(): rAF loop, fixed-step 1/120s, input events,    │
│   canvas 2D rendering, localStorage best-score persistence   │
└──────────────┬──────────────────────────────┬───────────────┘
               │ tickRun(run, rope, player)   │ draw()
               ▼                              ▼
┌──────────────────────────────┐   ┌─────────────────────────┐
│  Pure Simulation Core        │   │  Canvas rendering        │
│  js/game.js (tickRun)        │   │  js/game.js (draw)       │
│  ├─ js/rope.js   (phase/geo) │   │  vector shapes only,     │
│  ├─ js/player.js (physics)   │   │  no DOM outside canvas   │
│  └─ js/upgrades.js (effects) │   └─────────────────────────┘
└──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  localStorage ('jumprope-best') via loadBest/saveBest        │
└─────────────────────────────────────────────────────────────┘
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

**Overall:** Functional core / imperative shell with immutable state transitions.

**Key Characteristics:**
- All simulation functions are **pure**: they take state objects and return new state (`{ ...state, changed }` spread copies). No mutation anywhere in simulation code (verified by test "updateRope does not mutate" in `tests/rope.test.js`).
- Factory functions (`createRope`, `createPlayer`, `createRun`, `freshEffects`) return plain POJO state objects — no classes anywhere.
- The impure shell (`startGame`) is the only place holding mutable module state, closed over in a single function; a `typeof document !== 'undefined'` guard (`js/game.js:238`) makes the module importable under Node for tests.
- **Fixed-timestep loop:** physics runs at `STEP = 1/120` s inside an accumulator in `frame()` (`js/game.js:224–234`); accumulator clamped to 0.25 s to avoid spiral-of-death.

## Layers

**Simulation core (pure, testable in Node):**
- Purpose: All game rules and physics; zero browser API usage.
- Location: `js/rope.js`, `js/player.js`, `js/upgrades.js`, and the top exported functions of `js/game.js` (lines 1–51).
- Contains: Factory functions, transition functions (`updateRope`, `updatePlayer`, `tickRun`, `applyUpgrade`), predicates (`atFeet`, `clearsRope`, `shouldOfferUpgrade`).
- Depends on: Nothing (except each other via imports in `tickRun`).
- Used by: The runtime shell and all files in `tests/`.

**Runtime shell (impure, browser-only):**
- Purpose: Frame loop, input handling, rendering, storage.
- Location: `js/game.js` lines 53–240 (`startGame` and below).
- Contains: `requestAnimationFrame` loop, canvas 2D draw code, pointer/keyboard listeners, `localStorage` access.
- Depends on: Simulation core + browser APIs (`canvas`, `performance.now`, `localStorage`, `requestAnimationFrame`).
- Used by: `index.html` via `<script type="module" src="js/game.js">`.

## Data Flow

### Primary Request Path (frame tick)

1. `requestAnimationFrame` fires `frame(now)` (`js/game.js:224`) — accumulates elapsed time.
2. While accumulator ≥ STEP, `step()` runs (`js/game.js:101–111`) — only when `run.status === 'running'`.
3. `tickRun` advances rope and player (`js/game.js:9–31`): `updateRope(rope, dt * effects.ropeMul)` and `updatePlayer(player, dt, 1800 / effects.floatMul)`.
4. **Scoring event:** edge-detect `atFeet` transition false→true (`js/game.js:14–16`); if `clearsRope(y, 18 / windowMul)` → score/skip increment, else `status = 'over'` + `tripped`.
5. Every 10th skip (`shouldOfferUpgrade`), status becomes `'choose'` and `offer = pickTwo(UPGRADES, Math.random)` (`js/game.js:21–24`).
6. `draw()` renders score, player, rope obstacle, and status overlays (`js/game.js:113–222`).
7. On trip, `saveBest(localStorage, best)` persists the high score (`js/game.js:107–110`).

### Input / State-Machine Path

Run states: `idle → running → (choose ↔ running) → over → running (restart)`.

1. `press()` (`js/game.js:70–78`): from `idle`, starts the run; while `running`, records `holdFrom` timestamp for variable-height jump.
2. `release()` (`js/game.js:80–94`): while `running`, computes hold duration and calls `jump(player, hold)`; in `choose`, applies `offer[0]` via `applyUpgrade`; in `over`, saves best and resets to a fresh run.
3. Triggered by `pointerdown`/`pointerup` on the canvas and `keydown`/`keyup` for Space (`js/game.js:96–99`).

**State Management:** Three plain state objects (`run`, `rope`, `player`) live as closure variables in `startGame`; every tick replaces them with the return values of `tickRun`. No frameworks, no reactive state.

## Key Abstractions

**Run (game-run state):**
- Purpose: Aggregate of status/score/skips/effects/offer for one playthrough.
- Examples: `js/game.js:5–7` (`createRun`)
- Pattern: Immutable record; transitions return copies.

**Effects (upgrade multiplier set):**
- Purpose: Numeric multipliers that bend simulation constants (`floatMul` → gravity, `ropeMul` → rope speed, `windowMul` → clearance threshold, `scoreMul` → points per skip).
- Examples: `js/upgrades.js:12–14` (`freshEffects`), `js/upgrades.js:1–10` (`UPGRADES` with `apply: s => ({...s, ...})` closures)
- Pattern: Data + behavior in one object; upgrades are pure endofunctions over the effects record.

**Rope phase (canonical clock):**
- Purpose: Single normalized 0–1 rotation phase drives everything — scoring window (`atFeet` at 0.45–0.55), obstacle x-position (`obstacleX`), and visual bob/sway in `draw()`.
- Examples: `js/rope.js`
- Pattern: Phase is the game's master timeline; player position is judged against it.

## Entry Points

**Browser:**
- Location: `index.html` → `js/game.js` (auto-invoked at `js/game.js:238–240`)
- Triggers: Page load; `startGame(document.getElementById('game'))` runs at module evaluation.
- Responsibilities: Boots the rAF loop and binds all input listeners.

**Test (Node):**
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

**What happens:** `tickRun` calls `pickTwo(UPGRADES, Math.random)` (`js/game.js:23`), so run-level determinism depends on tests stubbing `Math.random` rather than injecting an rng parameter.
**Why it's wrong:** The rest of the codebase injects nondeterminism as a parameter (`pickTwo`'s `rng` arg); the `tickRun` call site hides it, making tick-level deterministic tests harder.
**Do this instead:** If tick determinism is needed in tests, thread an `rng` parameter through `tickRun` (defaulting to `Math.random`) rather than relying on the module-level reference.

### Dual state initialization

**What happens:** Initial rope/player state is duplicated in three places: `createRope(1.3)` + `createPlayer()` (`js/game.js:62–63`), and inline literals `{ phase: 0.33, period: 1.3 }` in `press()` and `release()` (`js/game.js:74, 90–91`).
**Why it's wrong:** The magic `phase: 0.33` restart value must stay in sync manually across two reset paths.
**Do this instead:** Centralize the reset in one helper (e.g., `resetRunState()`) that the idle-start and game-over paths both call.

## Error Handling

**Strategy:** Defensive try/catch confined to the storage boundary; everything else assumes valid internal state.

**Patterns:**
- `loadBest`/`saveBest` wrap `localStorage` in try/catch and degrade to session-only scores (`js/game.js:37–51`).
- No exceptions thrown from simulation code; invalid states are represented as data (`status: 'over'`, `tripped: true` flag) rather than errors.

## Cross-Cutting Concerns

**Logging:** None — no `console.*` calls anywhere.
**Validation:** None external; internal-only state. Optionality handled with null-defaults (`offer: null`, `holdFrom: null`).
**Authentication:** Not applicable.

---

*Architecture analysis: 2026-10-15*
