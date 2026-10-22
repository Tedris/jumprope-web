# Phase 5: Accessibility & Polish - Pattern Map

**Mapped:** 2026-10-22
**Files analyzed:** 9 (0 new source files, 1 new test file, 8 modified)
**Analogs found:** 9 / 9 — this phase is pure self-extension: every pattern already exists inside the files being changed.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `js/shell.js` (modify) | shell / event hub | event-driven + fixed-timestep loop | itself — hitstop gate `js/shell.js:232-237`, pick-confirm path `:166-184`, D-N08 listeners `:116-117`, resize `:113` | exact (self-extend) |
| `js/render3d.js` (modify) | renderer / view consumer | per-frame request-response (read-only `view`) | itself — passive-poll `:333-340`, uniform writes `:301-302`, `:448-450`, particle block `:427-445` | exact (self-extend) |
| `js/audio.js` (modify) | service (WebAudio leaf) | event-driven lifecycle | itself — `gesture()` state guard `:75-79`; factory return surface `:201-216` | exact (self-extend) |
| `js/game.js` (likely untouched) | model / sim core | transform (pure state → state) | already exports what pause-resume needs: `resumeRun` `:32-34`, `leadIn` `:21-26` | exact (reuse as-is) |
| `css/style.css` (modify) | config / styling | n/a | itself — canvas block `:3-9`, body background `:1` | exact (self-extend) |
| `tests/polish.test.js` (NEW) | test | batch (synthetic events + stubbed clock) | `tests/shell.test.js:30-104` (bootShell harness) + `tests/audio.test.js:275-325` (bootAudioShell harness) | exact |
| `tests/shell.test.js` (modify) | test | batch | itself — extend harness stubs at `:39-43` (canvas), `:59-61` (window) | exact |
| `tests/audio.test.js` (modify) | test | batch | itself — ctx stub gains `suspend` next to `resume` at `:36` | exact |
| `tests/render3d.test.js` (modify) | test | batch | itself — THREE_STUB uniforms capture `:23,75,88-90` | exact |

## Pattern Assignments

### `js/shell.js` (shell, event-driven) — pause, resize/letterbox, input hardening, matchMedia

**Analog:** itself — four in-file precedents, one per feature:

**1. Pause gate = the hitstop gate held open** — mirror `frame()` at `js/shell.js:228-243` (verbatim):
```js
  function frame(now) {
    acc += (now - last) / 1000;
    last = now;
    if (acc > 0.25) acc = 0.25;
    while (acc >= STEP) {
      // D-N05: juice freeze gate — a pending event deadline halts the drain
      if (now < stopUntil) break;
      consumeIntents();
```
Extension per RESEARCH Pattern 1: `if (paused) acc = 0;` before the drain (Pitfall 1 — never fast-forward the lead-in) and `if (paused || now < stopUntil) break;` inside it. Keep `updateHud()`/`scene.render()` running every frame → freeze frame + prompt (D-02).

**2. Pause/resume state transitions copy the pick-confirm path** — `tickPick()` at `js/shell.js:166-184` (verbatim core):
```js
        run = applyCard(run, picked);
        ({ rope, player, run } = resumeRun(run));
        reentryAt = performance.now();
        holdFrom = null;
```
Resume must use **`resumeRun({ ...run, buffer: 0 })`** — NOT `startRun()` (Pitfall 3: wipes score/effects/owned; `js/game.js:28-30`). Buffer clearing via spread follows `js/shell.js:56` / `js/game.js:49` precedent (Pitfall 2).

**3. New closure state + handlers join the existing declaration block** at `js/shell.js:56-75` (`holdFrom`, `pressIntent`, `releaseIntent`, `pickPressedAt`, `pickFill`, `reentryAt`, `acc`, `stopUntil`, `juiceSig` — lines 58-74). Add `paused` / `pausedByVis` beside them, shell-side only (ARCH-01: sim stays pause-agnostic, policed by `tests/boundary.test.js:103-113`).

**4. Keydown binding copies the `!e.repeat` guard idiom** — `js/shell.js:107-110` (verbatim):
```js
    if (e.code === 'Mute') { e.preventDefault(); if (audio && !e.repeat) audio.toggleMute(); return; }
    ...
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(); }
```
P/Esc branch goes after the audio short-circuits, before Space (Pitfall 11).

**5. `visibilitychange` rewrite replaces the one-liner** at `js/shell.js:116-117` (verbatim today):
```js
  window.addEventListener('visibilitychange', () => { if (audioReady) audio.gesture(); });
  window.addEventListener('focus', () => { if (audioReady) audio.gesture(); });
```
Read `document.hidden` for direction (event carries no state); guard `focus` with `&& !paused` (Pitfall 4); early-return `press()`/`release()` (`:77-98`) while paused.

**6. release-everything reuses the intent vocabulary verbatim** — the release branch it feeds, `js/shell.js:137-146` (verbatim):
```js
    if (releaseIntent) {
      if (run.status === 'running') {
        if (performance.now() - reentryAt >= LEAD_IN_MS && holdFrom !== null) {
          player = jump(player, (performance.now() - holdFrom) / 1000);
          audio?.handleEvent('jump');
          holdFrom = null;
          pressFired = true;
```
Pattern 4 ordering: convert `pressIntent → holdFrom`, set `releaseIntent = true`, leave `holdFrom` for `consumeIntents` to fire-and-clear (Pitfall 6 — never zero `holdFrom` first). Bind to `window blur` + canvas `pointercancel`; the `visibilitychange → hidden` leg routes through it too (D-11). Never arm `releaseIntent` in `'over'` status (the release branch at `:154-158` restarts the run).

**7. Resize/letterbox replaces the handler body** at `js/shell.js:113` and the boot line `:29`, both currently `[canvas.width, canvas.height] = windowSize();` where (verbatim `:24-26`):
```js
function windowSize() {
  return [Number(window.innerWidth) || 480, Number(window.innerHeight) || 640];
}
```
Keep `windowSize()` (its `Number(x) || fallback` coercion is the NaN guard); inline the ~6-line contain-fit/band arithmetic writing **both** `canvas.style.width/height` and `canvas.width/height` (Pitfall 9: CSS-only or buffer-only both break). Upper_SNAKE constants `ASPECT_MIN`/`ASPECT_MAX` at module scope per conventions. Do NOT add a new static `./…js` import for the math — data-URL harnesses can't resolve new specifiers (Pitfall 7).

**8. matchMedia read copies the `typeof` DI-guard idiom** at `js/shell.js:82` (verbatim):
```js
      if (!audioReady && typeof AudioContext === 'function') {
```
→ `typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null` + `addEventListener('change', …)`; thread the boolean into the existing one-way payload at `js/shell.js:273`:
```js
      scene.render({ run, rope, player, prevPhase, alpha: acc / STEP, best, now, juice: juiceSig });
```
(add `reducedMotion` to this object; the try/catch + `console.error('render failed:', err)` wrapper at `:272-276` stays).

**9. Paused prompt goes in `updateHud()`'s prompt chain**, `js/shell.js:208-225` — insert `if (paused) prompt = 'paused — press P to resume';` before the `run.status === 'choose'` branch at `:210`; `hudPrompt.textContent`/`className` writes at `:224-225` unchanged (no new DOM surface, D-02).

---

### `js/render3d.js` (renderer, request-response per frame) — dampen + passive consumption

**Analog:** itself — three data-write sites, no new render path:

**1. Snap-grid (wobble) dampen** — the two sites that must share one `snapGridFor(reduced)` helper (Pitfall 12: resize re-applies wobble otherwise):
`js/render3d.js:94` (verbatim):
```js
  const uSnapGrid = { value: new THREE.Vector2(internalW / (2 * SNAP_S), INTERNAL_H / (2 * SNAP_S)) };
```
and inside `applyBufferSize`, `js/render3d.js:302` (verbatim):
```js
    uSnapGrid.value.set(internalW / (2 * SNAP_S), INTERNAL_H / (2 * SNAP_S));   // uniform value only — no recompile
```
Near-zero value: `SNAP_OFF = 0.25` next to `SNAP_S` (`:11`); never Infinity/0 (GLSL floor NaN). `applyBufferSize` must read the stored reduced flag, exactly like it already re-reads state for `uInternalRes` at `:301`.

**2. Shake-to-zero = gate one write site**, `js/render3d.js:413` (verbatim):
```js
      juiceShake = Math.min(2, view.juice.shake ?? 0);   // D-N12: <= 2 post-pass px
```
→ `: 0` when `view.reducedMotion`. The downstream uniform write `:448-450` needs no change (zero amplitude is bit-exact "off").

**3. Particles static/fade-only** — wrap only the position block, `js/render3d.js:433-442`, in `if (!reduced)`; keep spawn block (`:411-425`), opacity ramp `:443` (`particleMat.opacity = Math.max(0, 1 - pt / 0.45)`) and lifetime logic (`:428-431`) intact.

**4. Optional discretion dampens:** trip-settle pivot shake `:376-377` → exactly `-Math.PI`; idle bob/twirl `:363-364` → still endpoints. The running-pose branch `:383-398` (rope pivot, arms, legs) and blob shadow `:405-406` stay UNTOUCHED per D-05.

**5. Consumption style:** `reducedMotion` arrives as `view.reducedMotion` read exactly like `view.now` (`:362`, `:448`) — no listener, no `window` reference (keeps `tests/boundary.test.js:103-113` BROWSER_IO_RE green for this file). Letterbox: zero changes here — buffer/camera/snap already follow `canvas.width/height` via the poll at `:333-340` (verbatim):
```js
    if (canvas.width !== lastWidth || canvas.height !== lastHeight) {
      lastWidth = canvas.width;
      lastHeight = canvas.height;
      applyBufferSize(lastWidth, lastHeight);
    }
```

---

### `js/audio.js` (service, event-driven lifecycle) — add `suspend()`

**Analog:** `gesture()`'s state-guard, `js/audio.js:75-79` (verbatim):
```js
      if (ctx.state === 'suspended') ctx.resume();
    } else if (ctx.state === 'suspended') {
      ctx.resume();
    }
```
New sibling (RESEARCH "audio.js addition"):
```js
  function suspend() {
    if (ctx && ctx.state === 'running') ctx.suspend();   // fire-and-forget Promise
  }
```
Register in the returned surface object at `js/audio.js:201-216` (verbatim head — add `suspend,` next to `gesture,`):
```js
  return {
    gesture,
    handleEvent,
    playTrack,
```
No new imports (leaf-module rule, `js/audio.js:1-5`).

### `js/game.js` — no changes

`resumeRun` (`js/game.js:32-34`) and `START_PHASE`/`leadIn` (`:10,21-26`) are already exported and are the single lead-in path (ARCH-02, policed by `tests/boundary.test.js:58-65` — never write a `phase: 0.33` literal anywhere). Pause-clearing the sim buffer happens shell-side via spread (`resumeRun({ ...run, buffer: 0 })`), so `run.buffer` (`js/game.js:37,49`) needs no sim change.

### `css/style.css` (config) — letterbox background + drop stretch

**Analog:** itself, `css/style.css:1-9` (verbatim):
```css
html, body { margin: 0; height: 100%; background: #2a3440; }
body { display: grid; place-items: center; }
canvas {
  display: block;
  width: 100vw;
  height: 100vh;
  image-rendering: pixelated;
  background: #2a3440;
}
```
Changes: body/html background → `#000` (black bars, D-07); remove the `width: 100vw; height: 100vh` stretch (the shell's `canvas.style` writes now size the box — Pitfall 9); keep `image-rendering: pixelated` (D-08 fractional-NN upscale). `#hud` overlay (`:10-23`) untouched (D-09 fixed text sizes).

### `tests/polish.test.js` (test, batch) — NEW

**Analogs:** `bootShell()` harness, `tests/shell.test.js:30-104`, and `bootAudioShell()` harness, `tests/audio.test.js:275-325`. Key mechanics to copy:
- Source-rewriting data-URL boot, `tests/shell.test.js:82-90` (verbatim):
```js
  const src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from '${renderStubHref}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${fileHref('game.js')}'`)
```
plus a unique `//boot ${++bootCount}` trailer per import (`:90`).
- Handler dispatch idiom, `tests/shell.test.js:132` (verbatim): `env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });`
- Stubbed-clock frame stepping, `tests/shell.test.js:136`: `env.frames.at(-1)(performance.now() + 100);`

New harness additions required by the code (all in the same change as the shell edits, Pitfall 5):
- `style: {}` on the canvas stub (`tests/shell.test.js:39-43` shape)
- `innerWidth`/`innerHeight` on the window stub (`tests/shell.test.js:59-61` shape)
- `hidden: false` on the document stub
- matchMedia stub with a test-visible emit hook (RESEARCH harness shape):
```js
const mq = { matches: false, listeners: [], addEventListener(t, fn) { if (t === 'change') this.listeners.push(fn); } };
globalThis.window.matchMedia = q => (q === '(prefers-reduced-motion: reduce)' ? mq : { matches: false, addEventListener() {} });
// fire: mq.matches = v; mq.listeners.forEach(fn => fn({ matches: v }));
```
- **Never** `import '../js/shell.js'` directly — trips the ARCH-01 `three` fence via the dependency walk (Pitfall 8, `tests/boundary.test.js:27-56`).

### `tests/shell.test.js` / `tests/audio.test.js` (modify) — harness extensions

- `tests/audio.test.js:36` (verbatim) — add the symmetric suspend leg:
```js
  ctx.resume = () => { ctx.state = 'running'; ctx.resumes++; };
```
→ `ctx.suspend = () => { ctx.state = 'suspended'; ctx.suspends++; };` (and `suspends: 0` in the ctx literal near `:30`).
- Both harnesses' `globalThis.window = { addEventListener: … }` stubs (`tests/shell.test.js:59-61`, `tests/audio.test.js:309-311`) must gain `matchMedia`/`innerWidth`/`innerHeight`, and their canvas stubs (`tests/shell.test.js:39-43`, `tests/audio.test.js:283-287`) gain `style: {}` — otherwise every existing boot test throws at the new code paths (Pitfall 5). Apply the same additions to the third harness copy in `tests/pickflow.test.js` if it boots shell source.

### `tests/render3d.test.js` (modify) — dampen observability

**Analog:** the THREE_STUB data-URL at `tests/render3d.test.js:23,75,88-90` — uniforms are already retained (`constructor(options) { super(); this.uniforms = options.uniforms; }`). To assert `uSnapGrid`/`uShake` after dampening, extend the stub's `Group.add()` (currently a no-op near `:37`) to record children, then reach `postScene.children[0].material.uniforms.uShake.value.x === 0` after a juice event with `view.reducedMotion === true`.

## Shared Patterns

### Boundary fences that constrain every change in this phase
**Source:** `tests/boundary.test.js:12-13,52-56,58-65,103-113`
- No new bare specifiers reachable from any `tests/*.test.js` import graph (ARCH-01: no test may import `shell.js` directly).
- No `phase: 0.33` literal in `js/` (ARCH-02) — resume reuses `resumeRun`.
- `BROWSER_IO_RE = /performance[.]now|Date[.]now|requestAnimationFrame|localStorage|\bdocument\b/` may appear ONLY in `shell.js` — so `matchMedia`/`document.hidden` reads belong in shell, and `render3d.js` consumes the flag via `view` only.

### DI-guard-before-use
**Source:** `js/shell.js:82` (`typeof AudioContext === 'function'`)
**Apply to:** `window.matchMedia` read in `shell.js` — mandatory, or all existing data-URL boot tests crash (harness window stub is `{ addEventListener }` only).

### Intent-vocabulary release (no side-channel state cleanup)
**Source:** `js/shell.js:96-98,119-160` (`releaseIntent` → `consumeIntents`)
**Apply to:** `releaseEverything()` (blur/pointercancel/visibilitychange-hidden) and `enterPause()` — route through existing intents; transitions execute synchronously in the listener, `frame()` only enforces the gate (Pitfall 10).

### Frozen-harness discipline
**Source:** `tests/shell.test.js:82-90`, `tests/audio.test.js:82-86`-style rewrite sets
**Apply to:** all shell changes — no new static relative imports in `shell.js` (Pitfall 7); every new browser-API touchpoint gets its stub in the same change (Pitfall 5).

## No Analog Found

None — every capability in this phase has an in-repo precedent:

| Capability | Precedent | Location |
|---|---|---|
| Indefinite stepping freeze | hitstop accumulator gate | `js/shell.js:232-237` |
| Lead-in re-entry + input lock | pick-confirm path | `js/shell.js:166-184` |
| Audio suspend/resume lifecycle | D-N08 `gesture()` | `js/audio.js:62-80` |
| Size-driven reconfiguration | passive poll + `applyBufferSize` | `js/render3d.js:298-306,333-340` |
| Event-driven browser-pref subscription | (none yet — nearest is the `typeof` DI-guard idiom) | `js/shell.js:82` |

## Metadata

**Analog search scope:** `js/` (shell, render3d, audio, game), `css/`, `tests/` (shell, audio, render3d, boundary)
**Files scanned:** 12 read in full or targeted sections; all analog paths git-tracked (verified via `git ls-files`)
**Pattern extraction date:** 2026-10-22
