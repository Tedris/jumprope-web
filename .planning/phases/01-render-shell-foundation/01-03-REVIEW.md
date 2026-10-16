---
phase: 01-render-shell-foundation
reviewed: 2026-10-15T22:05:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - js/render3d.js
  - js/shell.js
  - tests/render3d.test.js
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 01: Code Review Report — Plan 01-03 Incremental (Gap Closure)

**Reviewed:** 2026-10-15T22:05:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Incremental review of the G-01-1 gap closure (commits `ce8cb6c`, `6343dea`, `a5ca11b`). The core fix is correct: `createScene` now returns `{ render }` per the `create*`-factory convention (`js/render3d.js:49`), the shell call site resolves, and the rAF loop re-arms unconditionally after an isolated `scene.render` throw (`js/shell.js:103-108`). Full suite passes (39/39) and the ARCH-01 three-fence in `tests/boundary.test.js` holds against the data-URL stubbing technique.

No blockers found in the incremental scope. The main residual concern is that the "freeze vector" was closed only for the `scene.render` call itself — every other throw site in `frame()` still kills the loop permanently, and renderer *construction* failure bypasses the loop entirely. The new test pins the return contract but does not pin the project's "renderer never feeds back into game logic" invariant, which is the more durable contract to lock down.

## Critical Issues

None.

## Warnings

### WR-01: rAF-freeze class is only closed for `scene.render`, not the rest of `frame()`

**File:** `js/shell.js:83-108`
**Issue:** The commit message claims to close "the G-01-1 freeze vector (T-01-08)", but only the `scene.render` call is protected. `consumeIntents()` (line 88), `tickRun` (line 91), `loadBest`/`saveBest` paths, and `updateHud()` (line 102) all remain outside any guard — a throw in any of them escapes `frame()` before `requestAnimationFrame(frame)` at line 108 re-arms, freezing the game forever with the exact same failure mode G-01-1 had. `updateHud` is the realistic candidate: it dereferences `hudScore`/`hudBest`/`hudPrompt` captured at lines 15-17 via `getElementById`, which return `null` silently if an `#hud-*` id is renamed or removed in `index.html` — then `hudScore.textContent` throws a `TypeError` on every frame's first HUD write and the loop dies.
**Fix:** Move the re-arm into a `finally`, so the loop survives throws anywhere in the frame body:
```js
function frame(now) {
  try {
    // ...existing body: accumulator, consumeIntents, tickRun, updateHud...
    try {
      scene.render({ run, rope, player, prevPhase, alpha: acc / STEP, best });
    } catch (err) {
      console.error('render failed:', err);
    }
  } catch (err) {
    console.error('frame failed:', err);
  }
  requestAnimationFrame(frame);
}
```
(Keep the inner render catch so a persistent renderer failure doesn't also skip simulation stepping.)

### WR-02: WebGL context creation failure yields a blank page with no feedback

**File:** `js/render3d.js:13`, `js/shell.js:13`
**Issue:** `new THREE.WebGLRenderer({ canvas })` throws when WebGL is unavailable (old hardware, disabled GPU, some in-app browsers). The throw happens in `startGame` at `js/shell.js:13` — before input listeners (lines 38-41) and before the first `requestAnimationFrame` (line 110) — so the game silently never boots: blank canvas, dead keyboard/touch handlers, no HUD message. This contradicts the project's stated degradation pattern (try/catch with silent graceful degradation, cf. `loadBest`/`saveBest` in `js/game.js`).
**Fix:** Guard construction in the shell and degrade to a readable HUD state:
```js
let scene;
try {
  scene = createScene(canvas);
} catch (err) {
  console.error('3D unavailable:', err);
  hudPrompt.textContent = 'WebGL not supported on this device';
  return;
}
```
(or have `createScene` return `null` on failure and have the shell skip render calls).

### WR-03: New test pins the return shape but not the "renderer never mutates game state" invariant

**File:** `tests/render3d.test.js:55-80`
**Issue:** The project's primary architectural rule is "the WebGL layer never feeds back into game logic" (AGENTS.md, Architecture). All three new tests would still pass if `render()` grew a line like `view.player.y = 0` or `view.rope.phase = 0` — the mutation direction that matters is unpinned, and nothing else in the suite covers `render3d.js` (the boundary fence deliberately excludes it). This is the natural regression to plant while the contract test exists and gives false confidence.
**Fix:** In the third test, snapshot and compare the view after render:
```js
const view = { run: {}, rope: { phase: 0.5 }, player: { y: 0 }, prevPhase: 0.4, alpha: 0.5, best: 0 };
const before = JSON.stringify(view);
scene.render(view);
assert.strictEqual(JSON.stringify(view), before,
  'renderer must not write back into simulation state');
```

### WR-04: Per-frame `console.error` on persistent render failure floods the console

**File:** `js/shell.js:105-107`
**Issue:** If the render path fails persistently (lost WebGL context, driver quirk), `console.error('render failed:', err)` fires at 60 Hz — tens of thousands of entries per minute, which degrades devtools and buries any other diagnostics. The catch is correct; the reporting is unthrottled.
**Fix:** Log the first failure and a count, e.g. hold a `let renderErrCount = 0` in the closure and only `console.error` when `renderErrCount++ === 0` (optionally re-logging every 300 failures).

## Info

### IN-01: Third test contains no assertion

**File:** `tests/render3d.test.js:69-80`
**Issue:** `scene.render runs against the stubbed renderer without throwing` passes purely by not throwing. That's a valid idiom, but under `node:test` it's indistinguishable from a test that forgot its assertion, and it hides the more valuable assertion noted in WR-03.
**Fix:** Add the WR-03 non-mutation assertion, or at minimum an explicit `assert.ok(true)`-equivalent intent marker; the snapshot check is strictly better.

### IN-02: Import-rewrite stubbing fails with confusing loader errors on any import-form refactor

**File:** `tests/render3d.test.js:46-48`
**Issue:** The two `.replace()` calls match only the exact static form `from 'three'` / `from '...interpolate.js'`. If `render3d.js` is ever refactored (renamed interpolate file, specifier formatting change), the replacements silently no-op and the test dies with an opaque data-URL module-resolution error instead of a clear contract failure. (Verified it currently matches and the suite passes; this is fragility, not a live bug.)
**Fix:** Assert the rewrites applied before importing:
```js
if (!rewritten.includes(THREE_STUB_HREF) || !rewritten.includes(interpolateHref)) {
  throw new Error('render3d.js import form changed; update loadStubbedCreateScene rewrites');
}
```

### IN-03: `createScene` returns no teardown handle

**File:** `js/render3d.js:49`
**Issue:** The returned `{ render }` exposes no `dispose`, so geometries, materials, and the WebGLRenderer context can never be released from application code. Harmless while exactly one scene exists per page load, but it forecloses hot-reload, context-loss recovery (pair with WR-02/WR-04), and any future scene restart.
**Fix:** Include a `dispose` on the returned object (`geometries.forEach(g => g.dispose()); materials...; renderer.dispose()`) even if nothing calls it yet — the factory-returning-object pattern the project follows makes the extension point free.

---

_Reviewed: 2026-10-15T22:05:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
