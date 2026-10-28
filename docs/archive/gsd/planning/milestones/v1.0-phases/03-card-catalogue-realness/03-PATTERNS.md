# Phase 3: Card Catalogue Realness - Pattern Map

**Mapped:** 2026-10-17
**Files analyzed:** 8 (5 modified, 3 created)
**Analogs found:** 8 / 8 (all in-repo — this phase extends existing code; no foreign patterns)

All analog paths verified git-tracked via `git ls-files` (no gitignored mirrors).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `js/upgrades.js` (modify) | model (sim catalogue data) | transform (pure state → state) | itself (`UPGRADES`/`pickTwo`, `js/upgrades.js:1-21`) | exact (in-file extension) |
| `js/game.js` (modify) | service (run orchestration) | transform + batch lead-in | itself (`startRun`/`tickRun`/`applyUpgrade`, `js/game.js:8-46`) | exact (in-file extension) |
| `js/shell.js` (modify) | controller (input reducer + HUD shell) | event-driven + streaming (rAF loop) | itself (`consumeIntents`/`updateHud`, `js/shell.js:48-86`) | exact (in-file extension) |
| `index.html` (modify) | config (markup) | n/a | existing `#hud` span block, `index.html:19-23` | exact |
| `css/style.css` (modify, only if role-color/class toggle needed) | config | n/a | `#hud` block, `css/style.css:10-24` | exact |
| `tests/catalogue.test.js` (create) | test (unit, seeded) | batch | `tests/upgrades.test.js` | role-match (same module under test) |
| `tests/pickflow.test.js` (create) | test (integration, DOM harness) | event-driven | `tests/shell.test.js` `bootShell` harness (`tests/shell.test.js:30-103`) | exact |
| `tests/headless-sim.test.js` (create) | test (headless sim) | batch (1000-tick loop) | `tests/startrun.test.js` (stub-rng + `tickRun` loop idiom, `tests/startrun.test.js:17-28`) | role-match |

No files need RESEARCH.md-invented patterns — every pattern below is excerpted from tracked source in this repo.

## Pattern Assignments

### `js/upgrades.js` (model, pure transform) — MODIFY

**Analog:** itself — extend the existing catalogue record in place.

**Catalogue record pattern** (`js/upgrades.js:1-10`) — the record shape to extend with `icon`/`role`/`color`/`rarity`/`cap`; `apply` stays a pure endofunction over the effects record, verbatim:
```js
export const UPGRADES = [
  { id: 'float', name: 'Cloud Shoes', desc: '+15% hang time',
    apply: s => ({ ...s, floatMul: s.floatMul * 1.15 }) },
  { id: 'slowrope', name: 'Heavy Rope', desc: 'Slower pace',
    apply: s => ({ ...s, ropeMul: s.ropeMul * 0.9 }) },
  // ...
];
```
New records copy the `apply: s => ({ ...s, field: s.field * k })` idiom exactly (spread, never mutate). For NEW effect knobs use the lazy form `apply: s => ({ ...s, riskMul: (s.riskMul ?? 1) * 1.1 })` — never add keys to `freshEffects()` (frozen deepEqual pin at `tests/upgrades.test.js:6`, RESEARCH Pitfall 3).

**Factory pattern** (`js/upgrades.js:12-14`) — frozen at exactly 4 keys; do not touch:
```js
export function freshEffects() {
  return { floatMul: 1, ropeMul: 1, scoreMul: 1, windowMul: 1 };
}
```

**Draw-with-injected-rng pattern** (`js/upgrades.js:16-21`) — `pickTwo(upgrades, rng)` must stay exported with the 2-arg signature and distinct-pair property (frozen import/call at `tests/upgrades.test.js:3,17-24`). A compatibility shim over the new `pickOffers` keeps it green:
```js
export function pickTwo(upgrades, rng) {   // shim form
  return pickOffers(upgrades, {}, 2, rng); // treat metadata-less records as cap: Infinity
}
```
The new `pickOffers(pool, owned, count, rng)` copies this module's DI-for-randomness idiom (rng is a parameter; `Math.random` never appears except as a `rng = Math.random` default-param at the `tickRun` boundary — grep-legal per `tests/boundary.test.js:75`). CDF weighted draw: RESEARCH Pattern 2.

**Predicate pattern** (`js/upgrades.js:23-25`, and `js/rope.js:11-13`): predicates read as questions, return plain booleans:
```js
export function shouldOfferUpgrade(skips) {
  return skips > 0 && skips % 10 === 0;
}
```
New `isAvailable(card, owned)` follows suit: `(owned[card.id] ?? 0) < card.cap`.

---

### `js/game.js` (service, run orchestration) — MODIFY

**Analog:** itself.

**Imports pattern** (`js/game.js:1-3`) — relative with `.js` extension, named imports only:
```js
import { updateRope, atFeet } from './rope.js';
import { jump, createPlayer, updatePlayer, clearsRope } from './player.js';
import { UPGRADES, freshEffects, pickTwo, shouldOfferUpgrade } from './upgrades.js';
```
(Extend line 3 with `CARDS` / `pickOffers` / `isAvailable` when the catalogue is renamed/extended.)

**Lead-in single-path pattern** (`js/game.js:5-14`) — `resumeRun`/`leadIn` MUST reuse these exact constants; never write the literal `phase: 0.33` (ARCH-02 grep in `tests/boundary.test.js:61-62` flags it in every js/ file):
```js
export const START_PHASE = 0.33;
export const ROPE_PERIOD = 1.3;

export function startRun() {
  return {
    rope: { phase: START_PHASE, period: ROPE_PERIOD },
    player: jump(createPlayer(), 0.1),
    run: { ...createRun(), status: 'running' },
  };
}
```
Factor the `{ rope, player }` pair into a `leadIn()` helper used by BOTH `startRun` and the new `resumeRun(run)` (`{ ...run, status: 'running', offer: null }` + fresh lead-in) — RESEARCH Pattern 3 / Pitfall 5 (no drifted constant copies).

**Run record pattern** (`js/game.js:16-18`) — plain POJO factory; adding `owned: {}` is contract-safe (`tests/game.test.js:8-12` pins only `score`/`status`):
```js
export function createRun() {
  return { status: 'running', score: 0, skips: 0, effects: freshEffects(), offer: null };
}
```

**Immutable transition + offer hook pattern** (`js/game.js:20-42`) — `tickRun` reads the feet-window edge, returns `{ run, rope, player, tripped }` composite, spreads run:
```js
export function tickRun(run, rope, player, dt, rng = Math.random) {
  // ...
  if (!wasFeet && isFeet) {
    // ...
      if (shouldOfferUpgrade(skips)) {
        status = 'choose';
        offer = pickTwo(UPGRADES, rng);
      }
  // ...
  return { run: { ...run, score, skips, status, offer }, rope: nextRope, player: nextPlayer, tripped };
}
```
Modification: swap `pickTwo(UPGRADES, rng)` for `pickOffers(CARDS, owned, offerCount(skips), rng)`; **if the result is empty, skip the freeze entirely** (stay `'running'`, don't set `status: 'choose'`) — RESEARCH Pitfall 6.

**applyUpgrade pattern** (`js/game.js:44-46`) — must keep returning a plain run record (frozen usage `tests/game.test.js:32`); rope/player re-entry goes in `resumeRun`, NOT here:
```js
export function applyUpgrade(run, upgrade) {
  return { ...run, effects: upgrade.apply(run.effects), offer: null, status: 'running' };
}
```
New `applyCard(run, card)` copies this shape and adds owned counts: `owned: { ...run.owned, [card.id]: (run.owned[card.id] ?? 0) + 1 }`.

**Error-tolerant I/O pattern** (`js/game.js:48-62`) — untouched this phase, but the house style for any try/catch: silent graceful degradation, never rethrow.

---

### `js/shell.js` (controller, input reducer + HUD) — MODIFY

**Analog:** itself.

**Shell-only impurity pattern** (`js/shell.js:15-32`) — all `performance.now`/DOM/rAF/localStorage lives inside `startGame`'s closure; mechanically enforced by `tests/boundary.test.js:13,103-112`. The pick hold-timer (`pickPressedAt`, `reentryAt`) belongs here as closed-over `let` alongside:
```js
  let holdFrom = null;
  let pressIntent = null;
  let releaseIntent = false;
```

**Input reducer pattern** (`js/shell.js:48-70`) — extend the `consumeIntents()` press/release switch on `run.status`. Replace the `offer[0]` auto-apply debt verbatim at `js/shell.js:61-62`:
```js
      } else if (run.status === 'choose' && run.offer) {
        run = applyUpgrade(run, run.offer[0]);
```
Replacement skeleton (RESEARCH Pattern 3a): press → `pickIdx = (pickIdx + 1) % run.offer.length` + set `pickPressedAt = performance.now()`; frame-tick while held → `pickFill = Math.min(1, (performance.now() - pickPressedAt) / 800)`, confirm at ≥1; release → swallow if `pickDone`, else cancel. Keep the **single-consumption property**: every branch clears `pressIntent`/`releaseIntent` (`js/shell.js:55,68`).

**Existing choose-adjacent press flow** (`js/shell.js:50-54,57-67`) — the `'idle'` and `'over'` branches both restart via `startRun()`; the choose-confirm branch routes via `resumeRun(run)` the same way:
```js
      if (run.status === 'running') {
        holdFrom = pressIntent;
      } else if (run.status === 'idle') {
        ({ rope, player, run } = startRun());
      }
```
D-07 re-entry lock: while `performance.now() - reentryAt < LEAD_IN_MS`, the `'running'` press/release branches early-return (Pitfall 4 leak).

**HUD prompt channel pattern** (`js/shell.js:72-86`) — one `hudPrompt.textContent` string built by an if/else chain on `run.status`; the choose branch (lines 76-77) becomes the multi-line offer list (cursor glyph + fill cue on the active line, `\n`-joined):
```js
  function updateHud() {
    hudScore.textContent = String(run.score);
    hudBest.textContent = 'best ' + Math.max(best, run.score);
    let prompt = '';
    if (run.status === 'choose' && run.offer) {
      prompt = run.offer[0].name + ' — ' + run.offer[0].desc + ' — tap / space to pick';
    } // ...
    hudPrompt.textContent = prompt;
  }
```
`textContent` only, never `innerHTML` (XSS posture, RESEARCH Security §). New `#hud-owned` span: grab it next to lines 19-21 (`const hudOwned = document.getElementById('hud-owned');`) and render `(run.owned[card.id] ?? 0)`-repetitions of `card.icon` joined by spaces.

**Fixed-step loop pattern** (`js/shell.js:88-106`) — unchanged shape; `consumeIntents()` runs every STEP regardless of status (line 93) while `tickRun` is gated behind `run.status === 'running'` (line 94). The pick fill cue reads wall-clock inside this loop — it CANNOT come from `tickRun` dt (Pitfalls 9/3a).

---

### `index.html` (config) — MODIFY

**Analog:** `index.html:19-23`. Copy the existing span element:
```html
  <div id="hud" aria-hidden="true">
    <span id="hud-score"></span>
    <span id="hud-best"></span>
    <span id="hud-prompt"></span>
  </div>
```
Add `<span id="hud-owned"></span>` in the same div, same lowercase-hyphenated `hud-*` id convention. **Paired change (Pitfall 7):** `tests/shell.test.js:33-37` bootShell stub map must gain `'hud-owned': { textContent: '' }` in the same task, or every existing shell test crashes on `undefined.textContent`.

### `css/style.css` (config) — MODIFY (only if multi-line prompt / color needs it)

**Analog:** `css/style.css:10-24`. HUD styling is a single centered flex column, `pointer-events: none`:
```css
#hud {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding-top: 2.5rem;
  color: #f4f0d8;
  font: 16px sans-serif;
  text-align: center;
  pointer-events: none;
  user-select: none;
}
#hud-score { font-size: 32px; }
```
Multi-line offer prompt needs `#hud-prompt { white-space: pre-line; }`; optional role-color readout ≤3 lines as a class toggle on the prompt span (RESEARCH Open Q1 — glyph+name may suffice).

---

### `tests/catalogue.test.js` (test, unit + seeded rng) — CREATE

**Analog:** `tests/upgrades.test.js` (entire file, 31 lines).

**Boilerplate** (`tests/upgrades.test.js:1-3`):
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADES, freshEffects, pickTwo, shouldOfferUpgrade } from '../js/upgrades.js';
```

**Seeded-rng stub idiom** (`tests/upgrades.test.js:17-24`):
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
For determinism/reproducibility pins use the counting-stub form from `tests/startrun.test.js:18-19`: `let calls = 0; const stub = () => { calls += 1; return 0.5; };`.

**Assertion style:** `node:assert/strict`, `assert.equal` / `assert.deepEqual` / `assert.notEqual`, plain `test('...', () => {...})` — no suites, no describe.

### `tests/pickflow.test.js` (test, integration via DOM harness) — CREATE

**Analog:** `tests/shell.test.js` — reuse the `bootShell()` harness pattern (`tests/shell.test.js:30-103`): source-rewriting data:-URL import that stubs `render3d.js` while loading game/rope/player from `file:` URLs (keeps `boundary.test.js` SPECIFIER_RE walk green — comment at :10-17), plus:
- HUD stub map (`tests/shell.test.js:33-37`) — extend with `'hud-owned'` key:
```js
  const hud = {
    'hud-score': { textContent: '' },
    'hud-best': { textContent: '' },
    'hud-prompt': { textContent: '' }
  };
```
- Event driving (`tests/shell.test.js:131`): `env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });` then advance frames with `env.frames.at(-1)(performance.now() + 100);` (`tests/shell.test.js:135`).
- Always `try { ... } finally { env.restore(); }` (`tests/shell.test.js:105-119`).
- Assert through the view log: `globalThis.__shellTestViews` / `env.views.at(-1).run.status` (`tests/shell.test.js:128,136`).

For hold-confirmation timing in tests, drive the frame `now` argument + control `performance.now` deltas by frame-size choice (each frame >800 ms of accumulated STEP loops = hold exceeds 0.8 s).

### `tests/headless-sim.test.js` (test, headless 1000-tick sim) — CREATE

**Analog:** `tests/startrun.test.js` for the pure `tickRun` driving idiom (`tests/startrun.test.js:17-28`):
```js
  const stub = () => { calls += 1; return 0.5; };
  const base = { ...game.createRun(), skips: 9 };
  const rope = { phase: 0.44, period: 0.9 };
  const player = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
  const a = game.tickRun(base, rope, player, 1 / 60, stub);
```
Prefer the namespace-import form (`import * as game from '../js/game.js';`, `tests/startrun.test.js:3-5`) so missing new exports (`resumeRun`, `applyCard`) surface as assertion failures, not link errors.

Per-tick assertions mirror `js/rope.js:11-13` (`atFeet` boundary `0.45–0.55`) for the one-score-event-per-cycle counter; assert `Number.isFinite(run.score) && Number.isFinite(player.y)` and `rope.phase >= 0 && rope.phase < 1` each tick (RESEARCH §Code Examples skeleton). NO `Math.random` / browser IO in this file (keep the boundary fence green).

## Shared Patterns

### Purity + injected rng (sim core: `js/upgrades.js`, `js/game.js`)
**Source:** `js/upgrades.js:16` (`pickTwo(upgrades, rng)`), `js/game.js:20` (`rng = Math.random` default param).
**Apply to:** `pickOffers`, `isAvailable`, `applyCard`, `resumeRun`, `tickRun` offer hook, all new sim code.
No `Math.random` anywhere except the default-parameter line (`tests/boundary.test.js:75` greps it). No mutation — always `{ ...state, changed }`.

### Browser-IO containment (shell: `js/shell.js` only)
**Source:** `js/shell.js:32,35,59` (`performance.now`), enforced by `tests/boundary.test.js:13,103-112`.
**Apply to:** pick hold-timer, re-entry lock, fill-cue driver. Any new wall-clock need goes in shell, never sim.

### ARCH-02 single lead-in path
**Source:** `js/game.js:5-14` (`START_PHASE`, `ROPE_PERIOD`, `jump(createPlayer(), 0.1)`).
**Apply to:** `startRun` AND `resumeRun` — both via one shared `leadIn()` helper. The `phase: 0.33` literal is grep-forbidden in all js/ files (`tests/boundary.test.js:61-62`).

### HUD write discipline
**Source:** `js/shell.js:72-86` + `css/style.css:10-24`.
**Apply to:** offer lines, icon strip, flash cue. `.textContent` only; all presentation through the existing `#hud` DOM overlay (render3d has no text path — Pitfall 8).

### Frozen test contracts (regression gates — do not break)
**Sources (verified line refs):**
- `tests/upgrades.test.js:6` — `freshEffects()` deep-equals exactly 4 keys → lazy `?? 1` for new effect fields.
- `tests/upgrades.test.js:3,17-24` — `pickTwo`/`UPGRADES` exports + distinct-pair property → shim, don't delete.
- `tests/game.test.js:46`, `tests/startrun.test.js:36` — first offer (`skips` 9→10) length exactly 2 → offer-size policy must honor this.
- `tests/upgrades.test.js:9-15` — `multi` card `scoreMul +1` additive stacking (Golden Handle keeps `+1`).
- `tests/rope.test.js:9-12` — frozen float pin: `updateRope` wrap arithmetic must stay `(rope.phase - 1) + inc`, NOT `% 1` (Pitfall 1 — no rope.js change this phase).
- `tests/startrun.test.js:34` — 4-arg `tickRun` call surface (rng defaults).
- `tests/boundary.test.js` — three-fence, `0.33` grep, `Math.random` grep, browser-IO grep.

## No Analog Found

None — every Phase 3 file has a strong in-repo analog. The closest thing to a gap:

| File | Role | Data Flow | Note |
|------|------|-----------|------|
| `tests/headless-sim.test.js` | test | batch (1000-tick scripted loop) | No existing file runs a long scripted loop; closest is `tests/startrun.test.js`'s `tickRun`-driving idiom + RESEARCH §Code Examples skeleton |

## Metadata

**Analog search scope:** `js/` (all 7 modules), `tests/` (all 9 test files), `index.html`, `css/style.css`
**Files scanned:** 10 read in full; all analogs git-tracked (`git ls-files` gate passed)
**Pattern extraction date:** 2026-10-17
