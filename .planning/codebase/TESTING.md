---
last_mapped_commit: 838983f2419d6a82c5167acf9b351994fe9cfa7a
last_mapped_at: 2026-10-15
---
# Testing Patterns

**Analysis Date:** 2026-10-15

## Test Framework

**Runner:**
- Node.js built-in test runner (`node:test`) — no test framework dependency
- No config file; discovery by directory: `tests/`
- Runtime: Node v26 (ESM — `"type": "module"` in `package.json`)

**Assertion Library:**
- `node:assert/strict` (always imported as `assert`)

**Run Commands:**

```bash
node --test tests/            # Run all tests (23 tests, ~75ms)
node --test tests/game.test.js  # Run one suite
node --test --test-reporter=spec tests/  # Verbose output
```

There is no npm test script — `package.json` defines no scripts.

## Test File Organization

**Location:**
- Separate `tests/` directory (NOT co-located with `js/`)

**Naming:**
- `tests/<module>.test.js` — one test file per source module:
  ```
  js/rope.js      → tests/rope.test.js
  js/player.js    → tests/player.test.js
  js/upgrades.js  → tests/upgrades.test.js
  js/game.js      → tests/game.test.js
  ```

**Structure:**
- Flat `test()` calls at top level — no `describe()` suites (suites count is 0).

## Test Structure

**Suite Organization:**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, tickRun, applyUpgrade, loadBest, saveBest } from '../js/game.js';

test('new run starts clean', () => {
  const run = createRun();
  assert.equal(run.score, 0);
  assert.equal(run.status, 'running');
});
```

(`tests/game.test.js:1-12`)

**Patterns:**
- Test names are lowercase declarative sentences describing behavior (`'caught by rope ends run'`, `'squash springs back toward 1 over time'`)
- Arrange inline: state objects are hand-built literals at the edge of behavior, e.g. `const rope = { phase: 0.44, period: 0.9 }` to place the rope just before the feet window (`tests/game.test.js:15`)
- Simulation via fixed-step loops instead of time mocking: `for (let i = 0; i < 60; i++) p = updatePlayer(p, 1 / 60);` (`tests/player.test.js:19`)
- Every source module has tests; `game.test.js` exercises cross-module composition (`tickRun` with real rope/player/upgrades).

## Mocking

**Framework:** None — manual dependency injection instead.

**Patterns:**
- Injectable RNG for nondeterminism:
  ```js
  test('pickTwo returns two distinct upgrades for any rng seed', () => {
    for (const seed of [0, 0.5, 0.99]) {
      let i = 0;
      const rng = () => [seed, seed][i++ % 2];
      const [a, b] = pickTwo(UPGRADES, rng);
      assert.notEqual(a.id, b.id);
    }
  });
  ```
  (`tests/upgrades.test.js:17-24`)
- In-memory storage fake replacing `localStorage` (Map-backed, duck-typed):
  ```js
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  ```
  (`tests/game.test.js:49-55`)
- Fault injection for error paths — throwing storage stub:
  ```js
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(loadBest(storage), 0);
  ```
  (`tests/game.test.js:57-61`)
- No `t.mock()` / module mocking anywhere; the pure-function architecture makes it unnecessary.

**What to Mock (inject):**
- Randomness (`rng`), storage (`localStorage`), time (pass explicit `dt` values)

**What NOT to Mock:**
- Collaborating modules in `game.test.js` — rope/player/upgrades are used for real to test integration behavior (`tests/game.test.js:14-28`)
- The DOM — `startGame` / `draw` are not tested (see Coverage below)

## Fixtures and Factories

**Test Data:**
- Source `create*` factories are reused in tests: `createRun()`, `createPlayer()`, `createRope(0.9)`
- When mid-state is needed, plain literals with spread-free explicit fields:
  ```js
  const player = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
  run = { ...run, skips: 9 };   // targeted override via spread
  ```
  (`tests/game.test.js:16, 41`)

**Location:**
- Inline in each test file; no shared fixtures/helpers directory.

## Coverage

**Requirements:** None enforced (no c8/nyc config).

**View Coverage:**

```bash
node --test --experimental-test-coverage tests/
```

## Test Types

**Unit Tests:**
- Per-module behavior of pure functions (`tests/rope.test.js`, `tests/player.test.js`, `tests/upgrades.test.js`)

**Integration Tests:**
- `tests/game.test.js` composes real modules through `tickRun`/`applyUpgrade` — scoring, trip detection, upgrade offers, and persistence round-trip.

**E2E Tests:**
- None. No browser automation; `startGame` (canvas/DOM/rAF shell, `js/game.js:57-236`) is untested.

## Common Patterns

**Async Testing:**
- Not needed — the entire tested surface is synchronous. If async code is added, `node:test` supports `async () => {}` test bodies natively.

**Immutability Regression Tests:**
- Explicit "does not mutate" checks guard the functional-core contract:
  ```js
  test('updateRope does not mutate', () => {
    const r = createRope(1);
    updateRope(r, 0.1);
    assert.equal(r.phase, 0);
  });
  ```
  (`tests/rope.test.js:14-18`) — add an equivalent test for any new `update*` function.

**Threshold / Boundary Tests:**
- Behavior boundaries are asserted from both sides (`atFeet` at 0.5 vs 0.1, `clearsRope(20)` vs `clearsRope(5)`, `shouldOfferUpgrade` at 0/9/10/20) (`tests/rope.test.js:20-23`, `tests/player.test.js:36-39`, `tests/upgrades.test.js:26-31`).

**Physics Convergence Tests:**
- Assert eventual state after simulated steps with a tolerance:
  ```js
  for (let i = 0; i < 120; i++) p = updatePlayer(p, 1 / 60);
  assert.ok(Math.abs(p.squash - 1) < 0.05);
  ```
  (`tests/player.test.js:30-34`)

---

*Testing analysis: 2026-10-15*
