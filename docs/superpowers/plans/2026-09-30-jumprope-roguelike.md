# Jump Rope Roguelike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A one-button browser jump-rope roguelike: time the rope, hold to jump higher, stack upgrades every 10 skips, chase a high score.

**Architecture:** Vanilla HTML/CSS/JS on Canvas 2D, no build step. Pure logic modules (`rope.js`, `player.js`, `upgrades.js`, plus logic functions in `game.js`) are tested with `node --test`; `game.js` also holds the fixed-timestep loop, state machine, and all drawing. Sprites later = swap draw calls only.

**Tech Stack:** HTML5 Canvas 2D, ES modules, `node --test` (Node >= 18). No dependencies.

**Spec:** `docs/superpowers/specs/2026-09-30-jumprope-roguelike-design.md`

## Global Constraints

- No frameworks, no bundlers, no npm dependencies. `package.json` only holds `{"type": "module"}`.
- All JS is ES modules loaded via `<script type="module">`.
- Every logic function is pure (state in, state out); drawing happens only in `game.js`.
- Tests run with `node --test tests/` from the project root.
- Files: `index.html`, `css/style.css`, `js/game.js`, `js/player.js`, `js/rope.js`, `js/upgrades.js`, tests in `tests/`.
- Best score persists under localStorage key `jumprope-best`.

---

### Task 1: Scaffold + rope timing module

**Files:**
- Create: `package.json`, `index.html`, `css/style.css`, `js/rope.js`, `tests/rope.test.js`

**Interfaces:**
- Produces: `createRope(period?) -> {phase, period}`; `updateRope(rope, dt) -> rope` (new object); `atFeet(rope) -> boolean` (true while `phase` in [0.45, 0.55]).

- [ ] **Step 1: Create scaffold files**

`package.json`:

```json
{
  "name": "jumprope-web",
  "private": true,
  "type": "module"
}
```

`index.html` (minimal — grows in Task 5):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Jump Rope Roguelike</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <canvas id="game"></canvas>
  <script type="module" src="js/game.js"></script>
</body>
</html>
```

The CSS below scales the canvas to fit the viewport while keeping the 3:4 aspect ratio. Scaling is CSS-only, so no JS resize handler is needed; the backing-store size stays fixed at 480x640 (set in Task 5).

`css/style.css`:

```css
html, body { margin: 0; height: 100%; background: #1a1a2e; }
body { display: grid; place-items: center; }
canvas {
  image-rendering: pixelated;
  background: #f7f3e8;
  max-height: 95vh;
  aspect-ratio: 3 / 4;
  width: auto;
  height: auto;
}
```

- [ ] **Step 2: Write the failing test**

`tests/rope.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRope, updateRope, atFeet } from '../js/rope.js';

test('createRope starts at top of arc', () => {
  assert.equal(createRope(0.9).phase, 0);
});

test('updateRope advances phase by dt/period and wraps', () => {
  const r = updateRope({ phase: 0.9, period: 1 }, 0.3);
  assert.equal(r.phase, 0.2);
});

test('updateRope does not mutate', () => {
  const r = createRope(1);
  updateRope(r, 0.1);
  assert.equal(r.phase, 0);
});

test('atFeet true near mid-cycle only', () => {
  assert.equal(atFeet({ phase: 0.5 }), true);
  assert.equal(atFeet({ phase: 0.1 }), false);
});
```

- [ ] **Step 3: Run tests, verify failure**

Run: `node --test tests/`
Expected: FAIL — cannot find module `js/rope.js` (module-not-found error).

- [ ] **Step 4: Implement `js/rope.js`**

```js
export function createRope(period = 0.9) {
  return { phase: 0, period };
}

export function updateRope(rope, dt) {
  return { ...rope, phase: (rope.phase + dt / rope.period) % 1 };
}

export function atFeet(rope) {
  return rope.phase >= 0.45 && rope.phase <= 0.55;
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `node --test tests/`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json index.html css js/rope.js tests/rope.test.js
git commit -m "feat: scaffold project and rope swing cycle logic"
```

---

### Task 2: Player jump physics with bounce squash

**Files:**
- Create: `js/player.js`, `tests/player.test.js`

**Interfaces:**
- Consumes: nothing from other modules.
- Produces: `createPlayer() -> {y, vy, grounded, squash, squashVel}`; `jumpVelocity(holdSeconds) -> number`; `jump(player, holdSeconds) -> player`; `updatePlayer(player, dt, gravity?) -> player`; `clearsRope(playerY, minHeight?) -> boolean` (default `minHeight = 18`).

- [ ] **Step 1: Write the failing test**

`tests/player.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, jumpVelocity, jump, updatePlayer, clearsRope } from '../js/player.js';

test('hold duration increases jump velocity, capped at 0.5s', () => {
  assert.equal(jumpVelocity(0), 350);
  assert.equal(jumpVelocity(0.25), 475);
  assert.equal(jumpVelocity(2), 600);
});

test('jump sets upward velocity and ungrounds', () => {
  const p = jump(createPlayer(), 0.2);
  assert.equal(p.vy, 450);
  assert.equal(p.grounded, false);
});

test('player falls back to ground and regrounds', () => {
  let p = jump(createPlayer(), 0);
  for (let i = 0; i < 60; i++) p = updatePlayer(p, 1 / 60);
  assert.equal(p.grounded, true);
  assert.equal(p.y, 0);
});

test('landing compresses squash below 1', () => {
  let p = jump(createPlayer(), 0);
  for (let i = 0; i < 60; i++) p = updatePlayer(p, 1 / 60);
  assert.ok(p.squash < 1);
});

test('squash springs back toward 1 over time', () => {
  let p = jump(createPlayer(), 0);
  for (let i = 0; i < 120; i++) p = updatePlayer(p, 1 / 60);
  assert.ok(Math.abs(p.squash - 1) < 0.05);
});

test('clearsRope checks height threshold', () => {
  assert.equal(clearsRope(20), true);
  assert.equal(clearsRope(5), false);
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `node --test tests/`
Expected: FAIL — module `js/player.js` not found.

- [ ] **Step 3: Implement `js/player.js`**

```js
export function createPlayer() {
  return { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };
}

export function jumpVelocity(holdSeconds) {
  return 350 + Math.min(holdSeconds, 0.5) * 500;
}

export function jump(player, holdSeconds) {
  return { ...player, vy: jumpVelocity(holdSeconds), grounded: false };
}

export function updatePlayer(player, dt, gravity = 1800) {
  let { y, vy, grounded, squash, squashVel } = player;
  vy -= gravity * dt;
  y += vy * dt;
  if (y <= 0) {
    if (!grounded) {
      squash = 0.6;
      squashVel = 0;
    }
    y = 0;
    vy = 0;
    grounded = true;
  } else {
    grounded = false;
  }
  if (squash !== 1) {
    const stiffness = 300;
    const damping = 18;
    squashVel += (stiffness * (1 - squash) - damping * squashVel) * dt;
    squash += squashVel * dt;
  }
  return { y, vy, grounded, squash, squashVel };
}

export function clearsRope(playerY, minHeight = 18) {
  return playerY >= minHeight;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `node --test tests/`
Expected: PASS (all rope + player tests).

- [ ] **Step 5: Commit**

```bash
git add js/player.js tests/player.test.js
git commit -m "feat: player jump physics with squash-and-stretch spring"
```

---

### Task 3: Upgrade pool and effects stacking

**Files:**
- Create: `js/upgrades.js`, `tests/upgrades.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `UPGRADES` array of `{id, name, desc, apply(effects) -> effects}`; `freshEffects() -> {floatMul, ropeMul, scoreMul, windowMul}`; `pickTwo(upgrades, rng) -> [upgrade, upgrade]` (distinct); `shouldOfferUpgrade(skips) -> boolean` (every multiple of 10, never at 0).

- [ ] **Step 1: Write the failing test**

`tests/upgrades.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADES, freshEffects, pickTwo, shouldOfferUpgrade } from '../js/upgrades.js';

test('effects start neutral', () => {
  assert.deepEqual(freshEffects(), { floatMul: 1, ropeMul: 1, scoreMul: 1, windowMul: 1 });
});

test('effects stack multiplicatively', () => {
  const multi = UPGRADES.find(u => u.id === 'multi');
  const once = multi.apply(freshEffects());
  const twice = multi.apply(once);
  assert.equal(once.scoreMul, 2);
  assert.equal(twice.scoreMul, 3);
});

test('pickTwo returns two distinct upgrades for any rng seed', () => {
  for (const seed of [0, 0.5, 0.99]) {
    let i = 0;
    const rng = () => [seed, seed][i++ % 2];
    const [a, b] = pickTwo(UPGRADES, rng);
    assert.notEqual(a.id, b.id);
  }
});

test('upgrade offered every tenth skip only', () => {
  assert.equal(shouldOfferUpgrade(0), false);
  assert.equal(shouldOfferUpgrade(10), true);
  assert.equal(shouldOfferUpgrade(20), true);
  assert.equal(shouldOfferUpgrade(9), false);
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `node --test tests/`
Expected: FAIL — module `js/upgrades.js` not found.

- [ ] **Step 3: Implement `js/upgrades.js`**

```js
export const UPGRADES = [
  { id: 'float', name: 'Cloud Shoes', desc: '+15% hang time',
    apply: s => ({ ...s, floatMul: s.floatMul * 1.15 }) },
  { id: 'slowrope', name: 'Heavy Rope', desc: 'Rope swings slower',
    apply: s => ({ ...s, ropeMul: s.ropeMul * 1.1 }) },
  { id: 'multi', name: 'Golden Handle', desc: '+1 skip score',
    apply: s => ({ ...s, scoreMul: s.scoreMul + 1 }) },
  { id: 'window', name: 'Wide Stance', desc: '+10% clearance forgiveness',
    apply: s => ({ ...s, windowMul: s.windowMul * 1.1 }) },
];

export function freshEffects() {
  return { floatMul: 1, ropeMul: 1, scoreMul: 1, windowMul: 1 };
}

export function pickTwo(upgrades, rng) {
  const a = Math.floor(rng() * upgrades.length);
  let b = Math.floor(rng() * upgrades.length);
  if (b === a) b = (b + 1) % upgrades.length;
  return [upgrades[a], upgrades[b]];
}

export function shouldOfferUpgrade(skips) {
  return skips > 0 && skips % 10 === 0;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `node --test tests/`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add js/upgrades.js tests/upgrades.test.js
git commit -m "feat: upgrade pool with stacking effects and choose-2 picker"
```

---

### Task 4: Game run logic, scoring, best score

**Files:**
- Create: `js/game.js` (logic functions in this task; loop + drawing added in Task 5), `tests/game.test.js`

**Interfaces:**
- Consumes: `createRope`, `updateRope`, `atFeet` from `js/rope.js`; `createPlayer`, `jump`, `updatePlayer`, `clearsRope` from `js/player.js`; `UPGRADES`, `freshEffects`, `pickTwo`, `shouldOfferUpgrade` from `js/upgrades.js`.
- Produces: `createRun() -> {status: 'running', score, skips, effects, offer}`; `tickRun(run, rope, player, dt) -> {run, rope, player, tripped}`; `applyUpgrade(run, upgrade) -> run`; `loadBest(storage) -> number`; `saveBest(storage, score) -> void`.

- [ ] **Step 1: Write the failing test**

`tests/game.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, tickRun, applyUpgrade, loadBest, saveBest } from '../js/game.js';
import { createRope } from '../js/rope.js';
import { createPlayer } from '../js/player.js';
import { UPGRADES } from '../js/upgrades.js';

test('new run starts clean', () => {
  const run = createRun();
  assert.equal(run.score, 0);
  assert.equal(run.status, 'running');
});

test('clearing the rope scores and counts a skip', () => {
  const rope = { phase: 0.44, period: 0.9 };
  const player = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
  const { run } = tickRun(createRun(), rope, player, 1 / 60);
  assert.equal(run.score, 1);
  assert.equal(run.skips, 1);
});

test('caught by rope ends run', () => {
  const rope = { phase: 0.44, period: 0.9 };
  const player = { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };
  const { run, tripped } = tickRun(createRun(), rope, player, 1 / 60);
  assert.equal(tripped, true);
  assert.equal(run.status, 'over');
});

test('score multiplier from upgrades applies per skip', () => {
  const multi = UPGRADES.find(u => u.id === 'multi');
  let run = applyUpgrade(createRun(), multi);
  const rope = { phase: 0.44, period: 0.9 };
  const player = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
  ({ run } = tickRun(run, rope, player, 1 / 60));
  assert.equal(run.score, 2);
});

test('upgrade offered at tenth skip', () => {
  let run = createRun();
  run = { ...run, skips: 9 };
  const rope = { phase: 0.44, period: 0.9 };
  const player = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
  ({ run } = tickRun(run, rope, player, 1 / 60));
  assert.equal(run.status, 'choose');
  assert.equal(run.offer.length, 2);
});

test('best score round-trips through storage', () => {
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  assert.equal(loadBest(storage), 0);
  saveBest(storage, 42);
  assert.equal(loadBest(storage), 42);
});

test('blocked storage falls back gracefully', () => {
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(loadBest(storage), 0);
  saveBest(storage, 7);
});
```

Note on `throw new Error(...)`: use `throw new Error('blocked')` exactly.

- [ ] **Step 2: Run tests, verify failure**

Run: `node --test tests/`
Expected: FAIL — module `js/game.js` not found.

- [ ] **Step 3: Implement logic half of `js/game.js`**

```js
import { createRope, updateRope, atFeet } from './rope.js';
import { createPlayer, jump, updatePlayer, clearsRope } from './player.js';
import { UPGRADES, freshEffects, pickTwo, shouldOfferUpgrade } from './upgrades.js';

export function createRun() {
  return { status: 'running', score: 0, skips: 0, effects: freshEffects(), offer: null };
}

export function tickRun(run, rope, player, dt) {
  const nextRope = updateRope(rope, dt * run.effects.ropeMul);
  const nextPlayer = updatePlayer(player, dt);
  let { score, skips, status, offer } = run;
  let tripped = false;
  const wasFeet = atFeet(rope);
  const isFeet = atFeet(nextRope);
  if (!wasFeet && isFeet) {
    const minHeight = 18 / run.effects.windowMul;
    if (clearsRope(nextPlayer.y, minHeight)) {
      score += run.effects.scoreMul;
      skips += 1;
      if (shouldOfferUpgrade(skips)) {
        status = 'choose';
        offer = pickTwo(UPGRADES, Math.random);
      }
    } else {
      status = 'over';
      tripped = true;
    }
  }
  return { run: { ...run, score, skips, status, offer }, rope: nextRope, player: nextPlayer, tripped };
}

export function applyUpgrade(run, upgrade) {
  return { ...run, effects: upgrade.apply(run.effects), offer: null, status: 'running' };
}

export function loadBest(storage) {
  try {
    return Number(storage.getItem('jumprope-best')) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(storage, score) {
  try {
    storage.setItem('jumprope-best', String(score));
  } catch {
    // storage unavailable; best score is session-only
  }
}
```

Note: `tickRun` is a pure crossing-edge detector — score/trip only when the rope enters the feet window that frame, so a single crossing cannot double-score.

- [ ] **Step 4: Run tests, verify pass**

Run: `node --test tests/`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add js/game.js tests/game.test.js
git commit -m "feat: run scoring, trip detection, upgrade offers, best score storage"
```

---

### Task 5: Game loop, input, rendering, wiring

**Files:**
- Modify: `js/game.js` (append loop + drawing), `index.html`, `css/style.css`

**Interfaces:**
- Consumes: every exported function from Tasks 1-4.
- Produces: browser-visible game; exported `startGame(canvas)` for bootstrapping.

This task is verified manually in a browser (rendering + feel are not unit-testable here). Logic was already tested in Task 4.

- [ ] **Step 1: Append loop and rendering to `js/game.js`**

Append after the Task 4 functions:

```js
const W = 480;
const H = 640;
const STEP = 1 / 120;

export function startGame(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;

  let rope = createRope(0.9);
  let player = createPlayer();
  let run = createRun();
  let holdFrom = null;
  let best = loadBest(localStorage);
  let acc = 0;
  let last = performance.now();

  function press() {
    if (run.status === 'running') {
      holdFrom = performance.now();
    }
  }

  function release() {
    if (run.status === 'running' && holdFrom !== null) {
      const hold = (performance.now() - holdFrom) / 1000;
      player = jump(player, hold);
      holdFrom = null;
    } else if (run.status === 'choose' && run.offer) {
      run = applyUpgrade(run, run.offer[0]);
    } else if (run.status === 'over') {
      best = Math.max(best, run.score);
      saveBest(localStorage, best);
      rope = createRope(0.9);
      player = createPlayer();
      run = createRun();
    }
  }

  canvas.addEventListener('pointerdown', press);
  canvas.addEventListener('pointerup', release);
  window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); press(); } });
  window.addEventListener('keyup', e => { if (e.code === 'Space') release(); });

  function step() {
    const out = tickRun(run, rope, player, STEP);
    run = out.run;
    rope = out.rope;
    player = out.player;
  }

  function draw() {
    ctx.fillStyle = '#f7f3e8';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#3a3a55';
    ctx.beginPath();
    ctx.moveTo(0, H - 80);
    ctx.lineTo(W, H - 80);
    ctx.stroke();

    const cx = W / 2;
    const feet = H - 80;
    const sq = player.squash;
    const bodyH = 70 * (2 - sq);
    const bodyW = 46 * sq;
    const yBase = feet - player.y;
    ctx.fillStyle = '#c94f6d';
    ctx.fillRect(cx - bodyW / 2, yBase - bodyH, bodyW, bodyH);
    ctx.beginPath();
    ctx.arc(cx, yBase - bodyH - 16, 18 * Math.sqrt(sq), 0, Math.PI * 2);
    ctx.fill();

    const angle = rope.phase * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#7a5c3e';
    ctx.beginPath();
    ctx.arc(cx, yBase - bodyH - 16, 60, angle - Math.PI / 2, angle + Math.PI / 2);
    ctx.stroke();

    ctx.fillStyle = '#222';
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(run.score), cx, 60);
    ctx.font = '16px sans-serif';
    ctx.fillText('best ' + Math.max(best, run.score), cx, 84);

    if (run.status === 'choose' && run.offer) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(40, 240, W - 80, 140);
      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.fillText(run.offer[0].name + ' — ' + run.offer[0].desc, cx, 290);
      ctx.fillText('tap / space to pick', cx, 350);
    }
    if (run.status === 'over') {
      ctx.fillStyle = '#222';
      ctx.font = '28px sans-serif';
      ctx.fillText('Tripped! Score ' + run.score, cx, 300);
    }
    if (run.status === 'running' && run.skips === 0) {
      ctx.fillStyle = '#555';
      ctx.font = '18px sans-serif';
      ctx.fillText('press space / tap when the rope comes', cx, 140);
    }
  }

  function frame(now) {
    acc += (now - last) / 1000;
    last = now;
    if (acc > 0.25) acc = 0.25;
    while (acc >= STEP) {
      step();
      acc -= STEP;
    }
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (typeof document !== 'undefined') {
  startGame(document.getElementById('game'));
}
```

- [ ] **Step 2: Re-run unit tests**

Run: `node --test tests/`
Expected: PASS — the `typeof document` guard keeps `js/game.js` importable under Node.

- [ ] **Step 3: Manual browser verification**

Open `index.html` in a browser (or `python3 -m http.server` in the project root and visit `http://localhost:8000`). Verify:
- Scarlet bounces on space/tap, squash-and-stretch on landing.
- Score ticks on well-timed skips; mistimed jump trips and ends the run.
- At skip 10 the upgrade banner appears and a press picks it and resumes.
- Best score survives a page reload.

- [ ] **Step 4: Commit**

```bash
git add js/game.js index.html css/style.css
git commit -m "feat: game loop, input, canvas rendering and wiring"
```
