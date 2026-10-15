---
last_mapped_commit: 838983f2419d6a82c5167acf9b351994fe9cfa7a
last_mapped_at: 2026-10-15
---
# Coding Conventions

**Analysis Date:** 2026-10-15

## Naming Patterns

**Files:**
- Lowercase single-word module files in `js/` (`rope.js`, `player.js`, `upgrades.js`, `game.js`)
- Tests mirror their module name: `tests/<module>.test.js` (`tests/player.test.js` tests `js/player.js`)

**Functions:**
- `camelCase` for all functions (`createRope`, `updatePlayer`, `clearsRope`, `shouldOfferUpgrade`)
- Factory functions prefixed `create*` returning a fresh plain object: `createRun()` (`js/game.js:5`), `createPlayer()` (`js/player.js:1`), `createRope()` (`js/rope.js:1`)
- Update functions prefixed `update*`, returning a **new** object, never mutating: `updateRope` (`js/rope.js:5`), `updatePlayer` (`js/player.js:13`)
- Predicate functions read as questions: `atFeet()`, `clearsRope()`, `shouldOfferUpgrade()`

**Variables:**
- `camelCase` locals; module-level constants `UPPER_SNAKE` for fixed values (`W`, `H`, `STEP` in `js/game.js:53-55`, `UPGRADES` in `js/upgrades.js:1`)

**Types:**
- No TypeScript. State is plain object literals with implicit shapes:
  - Rope: `{ phase, period }` (`js/rope.js:1-3`)
  - Player: `{ y, vy, grounded, squash, squashVel }` (`js/player.js:1-3`)
  - Run: `{ status, score, skips, effects, offer }` (`js/game.js:5-7`)
  - Effects: `{ floatMul, ropeMul, scoreMul, windowMul }` (`js/upgrades.js:12-14`)
- Naming convention `*Mul` suffix for multiplier effect fields.

## Code Style

**Formatting:**
- No formatter configured (no Prettier/Biome/EditorConfig detected). De facto style:
  - 2-space indentation
  - Single quotes for strings
  - Semicolons required
  - Line length kept short (~80-100 cols); upgrade entries wrap `apply` lambda onto second line (`js/upgrades.js:2-9`)
- Note: `js/game.js:62-65` and `70-78` contain stray 4-space indentation inside `startGame` — do not propagate; use 2 spaces.

**Linting:**
- None configured. Keep code warning-free under default Node ESM strictness.

## Import Organization

**Order:**
1. Local module imports at top of file, relative paths with explicit `.js` extension (`js/game.js:1-3`)
2. Node builtins in tests only: `node:test`, then `node:assert/strict` (`tests/*.test.js:1-2`)

**Path Aliases:**
- None. Always relative with `.js` extension (required by browser native ESM and Node ESM).

## Error Handling

**Patterns:**
- Pure logic modules (`rope.js`, `player.js`, `upgrades.js`) throw nothing and never mutate — they return new state objects.
- External I/O is wrapped in `try/catch` with silent graceful degradation, never rethrown:
  ```js
  export function loadBest(storage) {
    try {
      return Number(storage.getItem('jumprope-best')) || 0;
    } catch {
      return 0;
    }
  }
  ```
  (`js/game.js:37-51` — both `loadBest` and `saveBest`; optional-chaining-free `catch {}` binding)
- Feature detection guard for browser-only boot code:
  ```js
  if (typeof document !== 'undefined') { startGame(document.getElementById('game')); }
  ```
  (`js/game.js:238-240`) — keeps modules importable from Node tests.
- Invalid input is coerced, not rejected: `Number(...) || 0` (`js/game.js:39`).

## Logging

**Framework:** None (no console calls in source).

**Patterns:**
- Do not add `console.log` to pure modules; the canvas `draw()` renders status text instead (`js/game.js:202-221`).

## Comments

**When to Comment:**
- Sparse. Only for non-obvious fallbacks, e.g. `// storage unavailable; best score is session-only` (`js/game.js:49`).
- No section-divider or WHAT-restating comments.

**JSDoc/TSDoc:**
- Not used.

## Function Design

**Size:** Small and single-purpose — most under 15 lines; only `tickRun` (`js/game.js:9-31`, 23 lines) and `draw` (`js/game.js:113-222`) exceed that, both justified (game loop / rendering).

**Parameters:**
- Positional primitives; options via default parameters: `createRope(period = 0.9)`, `updatePlayer(player, dt, gravity = 1800)`, `obstacleX(phase, width, cx = width / 2)`
- Dependency injection for randomness: `pickTwo(upgrades, rng)` takes an `rng` function so tests pass seeded stubs (`js/upgrades.js:16`, used at `js/game.js:23` with `Math.random`)
- Storage injection: `loadBest(storage)` / `saveBest(storage, score)` take a storage object; `localStorage` supplied only at the call sites in `startGame` (`js/game.js:66, 89, 109`)

**Return Values:**
- State updates return a composite result object, never mutate arguments:
  ```js
  return { run: {...}, rope: nextRope, player: nextPlayer, tripped };
  ```
  (`js/game.js:30`)
- Immutable updates via object spread: `{ ...run, score, skips, status, offer }` (`js/game.js:30`, `js/player.js:10`, `js/upgrades.js:3`)

## Module Design

**Exports:**
- Named exports only — no default exports anywhere.
- Each module follows the "model module" pattern: `create*` factory + `update*` + predicates, all pure. `js/game.js` additionally holds the impure `startGame(canvas)` shell (DOM, canvas, rAF, input) at the bottom, with all testable logic kept above it as pure functions.

**Barrel Files:**
- None. `js/game.js` imports directly from sibling modules and re-exposes the composition API (`js/game.js:1-3`).

**Ownership rule to preserve:**
- Pure, deterministic logic lives in `js/*.js` exported functions (testable in Node).
- Impure concerns (canvas rendering, `performance.now()`, `requestAnimationFrame`, DOM events, `localStorage`) live only inside `startGame` in `js/game.js`.

---

*Convention analysis: 2026-10-15*
