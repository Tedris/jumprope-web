# Phase 5: Accessibility & Polish — Research

**Researched:** 2026-10-22
**Domain:** Browser lifecycle/pref handling in a vanilla-ESM canvas game shell (pause, `prefers-reduced-motion`, resize/letterbox, input-loss hardening)
**Confidence:** HIGH (all canonical code read this session; all four web APIs confirmed against MDN)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pause & auto-pause (UI-01)**
- **D-01:** Manual pause is **P / Esc keyboard only** — no canvas gesture, no on-screen button. Touch users rely on the browser firing `visibilitychange` when the app is backgrounded, which drives the same auto-pause path. The canvas gesture vocabulary stays 100% jump-pure (consistent with Phase-3 D-01's one-button input philosophy). Verifiable: shell tests dispatch the key event mid-run and assert stepping halts. — **Reversibility:** reversible — a pointer gesture can be added later without disturbing the pause state machine itself.
- **D-02:** Paused presentation is a **freeze frame + prompt**: `tickRun` stepping halts entirely (rope freezes mid-swing, frame clock gated like hitstop), audio suspends, and the existing HUD prompt channel shows the paused state ("paused — press P to resume" style). No ambient idle animation while paused, no shader dim/fade. Verifiable: stubbed-clock shell tests count zero sim steps while paused. (Per pattern in `js/shell.js` `frame()` accumulator gate as used by Phase-4 hitstop D-N05; prompt per `updateHud` channel.)
- **D-03:** Resume routes through the **same `startRun` lead-in re-entry as a card pick** (rope to `START_PHASE` 0.33, ~0.43 s to first feet window, input locked during the lead-in per Phase-3 D-07) instead of unfreezing mid-swing — tab-return and manual-resume both land the player in a known safe rhythm window. Single startRun path per ARCH-02. — **Reversibility:** costly — this is the player's post-pause timing contract, same class as Phase-3 D-06; in-place unfreeze would re-train muscle memory on every pause.
- **D-04:** Pause applies **only to an active stepping run**. `visibilitychange` while on idle/offer/game-over just does what it does today — audio gesture/suspend (Phase-4 D-N08 path) — with no "paused" state entered. Avoids paused-over-an-offer state combinations. Verifiable: Node shell tests assert no status change when tab-hiding outside an active run.

**Reduced motion (UI-02)**
- **D-05:** Under `prefers-reduced-motion: reduce`, the dampening set is **scene motion off, events stay**: vertex-snap wobble goes off/near-zero, post-pass UV shake goes to zero (it is a single shader uniform), particles still spawn but static/fade-only. Rope, character, blob shadow, HUD, and all judgment-relevant motion remain untouched (gameplay readability is protected, per the success criterion wording).
- **D-06:** The preference is **live-switching**: `matchMedia('(prefers-reduced-motion: reduce)')` is read at load and its `change` event subscribed, so mid-session OS toggles take effect immediately. **No in-game override, no persistence** — the OS setting is the single source of truth (exactly UI-02's wording). Verifiable: stubbed matchMedia tests assert dampen/undampen on the change event.

**Resize & letterbox (UI-03)**
- **D-07:** **Dynamic width + clamp band**: the buffer keeps ~240 rows with width following the window aspect (Phase-2 D-01 preserved) within a sane band (roughly 3:4 to 2:1 — exact limits planner's call); outside the band the buffer is letterboxed with black bars so framing never degenerates. Normal windows render exactly as today.
- **D-08:** Upscale stays **fractional nearest-neighbor fill** — no integer-scale snapping/margins. Only the clamp band and letterbox are new.
- **D-09:** HUD text keeps a **fixed buffer-space size** — no window-size-driven text scaling; the clamp band/letterbox already handles physically tiny windows.
- **D-10:** React via the **existing `resize` listener + passive poll** (`js/shell.js:113`, `js/render3d.js:334`): re-derive band/letterbox/buffer allocation on the next frame. No `orientationchange` listener (orientation changes fire `resize` on all target browsers).

**Input-loss hardening (criterion 4)**
- **D-11:** `window blur`, `visibilitychange → hidden`, and `pointercancel` all route to **one shared "release-everything" handler** that behaves exactly as if the player released at that instant: an in-progress jump charge fires with the hold time accumulated so far, a sub-confirm-threshold card hold cancels cleanly. `pointerleave`/drag-out deliberately unhandled (browsers deliver `pointerup` outside the canvas anyway). Verifiable: synthetic-event shell tests assert no `holdFrom`/charge survives each event, mid-air and mid-hold. (Per state machine in `js/shell.js:58-143`.)
- **D-12:** Any pause (manual or tab-hide) **clears pending press state** — the D-N01 forgiveness buffer and `pressIntent` — alongside the hold, so a stale press can never leak into the post-resume rhythm; the first press after the lead-in re-entry charges a normal jump (extends Phase-3 D-07's re-entry lock to pauses).

### the agent's Discretion
- Exact clamp-band limits, letterbox bar color, paused-prompt wording, wobble "off vs near-zero" value, particle fade curve under reduced motion, and whether hitstop stays under reduced motion (it is stillness, not motion — default: keep).
- Whether the pause state lives as a shell-only flag vs a `run.status` value — planner's call, respecting the purity invariant (the sim must stay pause-agnostic if the shell gates stepping instead).

### Deferred Ideas (OUT OF SCOPE)
- On-screen/touch pause affordance — rejected for this phase; revisit only if visibilitychange-based auto-pause proves insufficient on a target platform.
- In-game reduced-motion override toggle — rejected here (OS-only); could return as a settings phase if ever needed.
- Integer-scale "pixel-perfect" mode — rejected; revisit only if fractional-fill artifacts ever read as bugs.
- Phase-4 backlog: music track content at `audio/track.ogg` (Phase 999.1) — unchanged, human-gated, unrelated to this phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Game pauses on demand and auto-pauses when the tab is hidden | Pause gate mirrors the existing hitstop gate `[VERIFIED: js/shell.js:232-237]`; resume reuses exported `resumeRun` lead-in `[VERIFIED: js/game.js:32-34]`; `visibilitychange` listener already exists and is rewritten here `[VERIFIED: js/shell.js:116]`; `AudioContext.suspend()` Baseline-wide `[CITED: developer.mozilla.org/en-US/docs/Web/API/AudioContext/suspend]` — `js/audio.js` needs one new `suspend()` method (only `resume` exists today `[VERIFIED: js/audio.js:75-79]`) |
| UI-02 | Reduced motion dampens wobble/shake; `prefers-reduced-motion` respected automatically | Wobble is one uniform (`uSnapGrid` value-only write, no recompile `[VERIFIED: js/render3d.js:63-78,94,302]`); shake is one uniform write per frame (`uShake` `[VERIFIED: js/render3d.js:448-450]`); particles are closed-form position writes `[VERIFIED: js/render3d.js:427-445]`; `MediaQueryList` `change` event Baseline-wide `[CITED: developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/change_event]` |
| UI-03 | Low-res UI stays legible at any window size (resize/letterbox) | Buffer derivation is fully driven by `canvas.width/height` in render3d's passive poll `[VERIFIED: js/render3d.js:298-306,333-340]`; letterbox therefore lives entirely in the shell's resize handler + CSS, not in the shader — see Pattern 3 |
| Crit. 4 | No stuck-hold state after blur/`pointercancel` (input reducer hardening) | Reducer state is 5 closure vars (`holdFrom`, `pressIntent`, `releaseIntent`, `pickPressedAt`, `pickFill`) `[VERIFIED: js/shell.js:58-64]`; one shared release-everything handler joins the existing `release()` intent pattern — see Pattern 4 and Pitfall 6 |
</phase_requirements>

## Project Constraints (from AGENTS.md)

> Note: several AGENTS.md code sections describe the *pre-Phase-1* Canvas-2D `game.js` layout and are stale (the code has moved to `shell.js`/`render3d.js`). The binding directives below still hold and match the task's project instructions.

- Vanilla ES modules, zero npm dependencies, no build step; `package.json` stays `{ "name": "jumprope-web", "private": true, "type": "module" }`.
- Three.js only via the pinned importmap (`three@0.186.1`, `index.html:9-15`) and only in `js/render3d.js` (ARCH-01, policed by `tests/boundary.test.js:52-56`).
- Simulation core (`js/game.js` exports, `rope.js`, `player.js`, `upgrades.js`) stays pure and Node-testable via `node --test tests/`; all browser I/O lives in the shell (`js/shell.js`) — policed by `tests/boundary.test.js:103-113` (`BROWSER_IO_RE = /performance[.]now|Date[.]now|requestAnimationFrame|localStorage|\bdocument\b/`, all files except `shell.js`).
- Named exports only; `create*`/`update*` naming; immutable updates via spread; inject randomness/storage, never call inline in pure code; 2-space indentation.
- Static-file delivery only; no server component.

## Summary

Phase 5 is a **shell-side polish phase with almost no new machinery**: every hook the four success criteria need already exists in the codebase and merely needs to be connected. Pause is the existing hitstop accumulator gate (`js/shell.js:237`) held open by a boolean instead of a deadline; resume is the exported `resumeRun()` lead-in already used for card picks; reduced motion is three data-level writes in `render3d.js` (one snap-grid uniform value, one shake multiply, one particle position freeze) driven by a `view.reducedMotion` flag the shell derives from an injected `matchMedia`; letterbox is pure DOM arithmetic in the shell's existing resize handler because `render3d.js` derives *everything* (internal buffer, camera aspect, snap grid) from `canvas.width/height` via its passive poll — with one caveat: the canvas's CSS currently stretches it to `100vw/100vh`, so the letterbox must write `canvas.style`, not just the buffer. Input hardening is one shared `releaseEverything()` function routed from `blur` / `visibilitychange` / `pointercancel` that reuses the existing `releaseIntent` plumbing verbatim.

The main risks are **harness collision, not browser behavior**: the frozen data-URL test harnesses stub `window` with only `addEventListener` — an unguarded `window.matchMedia` call or a `canvas.style` write crashes *every existing shell boot test*; a new static relative import into `shell.js` breaks harness module resolution outright; and a direct `import '../js/shell.js'` in any test would trip the ARCH-01 bare-`three` fence because the dependency walk reaches `render3d.js → three`. All four traps and their workarounds are documented below.

**Primary recommendation:** Implement pause as shell-local state (`paused` + `pausedByVis` flags gating `frame()`'s drain, zeroing `acc` while paused, resume via `resumeRun({...run, buffer: 0})`); read `matchMedia` only in `shell.js` behind a `typeof` guard and pass a `reducedMotion` boolean through the existing one-way `view` payload; do the clamp-band math in `shell.js`'s resize handler writing both `canvas.width/height` and `canvas.style.width/height`; and extend (never fork) the three test-harness copies with `matchMedia`, `document.hidden`, `innerWidth/innerHeight`, and `canvas.style` stubs.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pause state machine | Shell (`js/shell.js`) | — | ARCH-01/`boundary.test.js` keep the sim pause-agnostic; the freeze is an accumulator-gate flag exactly like hitstop `[VERIFIED: js/shell.js:232-237]`. Recommendation: shell-only flag, *not* a new `run.status` value (a new status would force every `run.status ===` branch — `consumeIntents`, `updateHud`, `tickPick`, `render` status bookkeeping `[VERIFIED: js/shell.js:119-162,200-226,166-184; js/render3d.js:352-356]` — to learn about pause; a flag touches none of them). |
| Audio suspend/resume | `js/audio.js` (owns the AudioContext) | Shell triggers it | audio.js's D-N08 lifecycle rule: context lifecycle only happens inside it; shell calls a new `suspend()`, resume already rides `gesture()` `[VERIFIED: js/audio.js:62-80,201-216]`. |
| Reduced-motion detection | Shell (`matchMedia` behind DI/guard) | `js/render3d.js` (applies flag) | `matchMedia` is a browser event source; shell owns all browser events. render3d consumes `view.reducedMotion` like it consumes `view.now` `[VERIFIED: js/shell.js:273]`. |
| Wobble/shake/particle dampening | `js/render3d.js` | — | All three are uniform/data writes already parameterized in the render path `[VERIFIED: js/render3d.js:94,413,448-450,427-445]`. |
| Buffer size + letterbox | Shell (resize handler, DOM/CSS) | `js/render3d.js` (passive poll consumes) | render3d already re-derives RT/snap/camera purely from `canvas.width/height` `[VERIFIED: js/render3d.js:298-306,333-340]`; keeping geometry in the shell respects the "one-way through render3d's passive poll" decision (Phase-2 D decision recorded at `js/shell.js:21-23`). |
| Input-loss release handler | Shell (input reducer) | — | `holdFrom`/`pressIntent`/`pickPressedAt` are `startGame` closure locals `[VERIFIED: js/shell.js:58-64]`. |
| Paused prompt | Shell (`updateHud`) | — | Prompt channel is `hud-prompt.textContent` `[VERIFIED: js/shell.js:208-225]`. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none new) | — | This phase installs **zero** packages | The repo is dependency-free by design `[VERIFIED: AGENTS.md Technology Stack]`; only browser built-ins are needed. |

### Supporting — browser APIs used (all Baseline "widely available")
| API | Version/Baseline | Purpose | When to Use |
|-----|------------------|---------|-------------|
| `MediaQueryList` `change` event | Baseline since 2020-2021 | live `prefers-reduced-motion` switching `[CITED: developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/change_event]` | UI-2 subscription in `shell.js` |
| `AudioContext.suspend()` | Baseline widely available; returns Promise; state-guard with `ctx.state === 'running'` `[CITED: developer.mozilla.org/en-US/docs/Web/API/AudioContext/suspend]` | pause audio with the game (MDN documents this exact hide/resume pattern for `visibilitychange`) | UI-01 pause lifecycle |
| `Document.visibilitychange` + `document.hidden` | Baseline since April 2021; **event carries no state — read `document.hidden` to know direction** `[CITED: developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event]` | auto-pause trigger + resume-on-return | UI-01 / D-04 |
| `Element.pointercancel` | Baseline widely available; fires on app-switch/home gesture on mobile, and is followed by `pointerout`/`pointerleave` `[CITED: developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event]` | stuck-touch release | D-11 |

**Installation:** none. `npm` is not used; `package.json` must stay dependency-free.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Shell boolean pause flag | `run.status = 'paused'` | touches every status branch incl. sim-adjacent render bookkeeping; violates "sim stays pause-agnostic" discretion note |
| `view.reducedMotion` flag injected via payload | `render3d.js` calls `window.matchMedia` itself | would put a browser-event listener in the render layer, breaking the "shell owns all browser events" pattern for zero gain |
| Letterbox in shell DOM/CSS | black bars drawn in the post shader | shader route requires the canvas buffer aspect ≠ window aspect, which desyncs `camera.aspect`/`internalW` derivation in `applyBufferSize` `[VERIFIED: js/render3d.js:298-306]`; DOM route leaves `render3d.js` geometry untouched |
| `mql.addEventListener('change')` | deprecated `mql.addListener` | `addListener` is the legacy API `[CITED: developer.mozilla.org/en-US/docs/Web/API/MediaQueryList — Instance methods: addListener()/removeListener() (legacy)]`; evergreen targets per AGENTS.md need only `addEventListener` |

## Package Legitimacy Audit

No external packages are installed by this phase. The single runtime dependency (three, pinned `0.186.1` jsdelivr importmap `[VERIFIED: index.html:9-15]`) is unchanged. **Packages removed due to [SLOP]:** none. **Flagged [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌────────────────────────── js/shell.js (startGame closure) ──────────────────────────┐
 browser events ──► │ keydown P/Escape ──► enterPause() / resumeFromPause()                                │
 keydown/up,        │ blur ─────────────► releaseEverything()                                              │
 pointer*, blur,    │ pointercancel ────► releaseEverything()                                              │
 visibilitychange,  │ visibilitychange ─► hidden? ──► running: releaseEverything() + enterPause(vis)      │
 resize (D-10)      │                        │         else: audio.gesture()  (today's path, D-04)        │
                    │ matchMedia change ──► reducedMotion flag ──┐            visible? ──► pausedByVis:    │
                    │                                            │            resumeFromPause()            │
                    │  frame(now):  acc += dt (clamped 0.25)     │                                         │
                    │    while acc ≥ STEP:  if paused ─► acc=0; break   ◄── pause gate (mirrors hitstop)   │
                    │                     if now < stopUntil: break      (existing hitstop gate)           │
                    │                      consumeIntents() → tickRun()  (sim, unchanged)                  │
                    │    updateHud(): paused → "paused — press P to resume" prompt channel                 │
                    │    scene.render({ run, rope, …, reducedMotion })  ── one-way view payload ──┐        │
                    │  audio.suspend() / audio.gesture()  ◄── pause lifecycle                     │        │
                    └─────────────────────────────────────────────────────────────────────────────┼────────┘
                                                                                                  ▼
                    ┌────────────────────────── js/render3d.js (pure consumer of view) ────────────────────┐
                    │ passive poll: canvas.width/height changed? ─► applyBufferSize (RT, snap grid, aspect) │
                    │ reducedMotion → uSnapGrid value = sub-pixel grid (wobble off)                        │
                    │ reducedMotion → juiceShake = 0 (uShake stays (0,0))                                  │
                    │ reducedMotion → particle positions pinned, opacity fade continues                    │
                    │ letterbox: NO shader work — buffer/camera already follow canvas dims                 │
                    └───────────────────────────────────────────────────────────────────────────────────────┘
 canvas CSS:  shell writes canvas.style.width/height + black page background ── bars appear outside the canvas box
```

### Recommended Project Structure
No new files required. Changes land in:
```
js/
├── shell.js        # pause flags + handlers, releaseEverything, resize math, matchMedia read, view.reducedMotion
├── render3d.js     # reducedMotion branch on snap-grid / shake / particle writes (~15 lines)
├── audio.js        # + suspend() method on the returned surface
└── game.js         # untouched (resumeRun already exported) — or untouched except comments
css/style.css       # letterbox background black; canvas no longer forced 100vw/100vh stretch
tests/
├── shell.test.js   # harness: + canvas.style, + window.matchMedia/innerWidth/innerHeight, + document.hidden stubs
├── polish.test.js  # NEW: UI-01 / crit-4 legs via harness-copy (bootAudioShell precedent)
├── render3d.test.js# extended THREE-stub captures for dampen assertions
└── audio.test.js   # + suspend legs (stub gains suspend)
```

### Pattern 1: Pause = the hitstop gate held open (UI-01)

The existing drain gate is a deadline check inside the accumulator loop `[VERIFIED: js/shell.js:228-270]`:
```js
// js/shell.js:228-243 (verbatim excerpt)
  function frame(now) {
    acc += (now - last) / 1000;
    last = now;
    if (acc > 0.25) acc = 0.25;
    while (acc >= STEP) {
      // D-N05: juice freeze gate — a pending event deadline halts the drain
      if (now < stopUntil) break;
      consumeIntents();
      if (run.status === 'running') { /* … tickRun … */ }
```
Adding pause means extending that check and — critically — **draining `acc` to zero while paused** so the lead-in isn't fast-forwarded on resume (Pitfall 1):
```js
// proposed (shell.js) — mirrors the D-N05 comment style
    if (paused) acc = 0;                       // pause holds no sim time: resume must not fast-forward the lead-in
    while (acc >= STEP) {
      if (paused || now < stopUntil) break;
```
Gating inside the `while` (rather than skipping `frame`) keeps `updateHud()` and `scene.render()` running every frame → freeze frame + prompt per D-02, and `consumeIntents()` never runs while paused → no intents leak (D-12 belt).

State to add (all closure-local, per existing style `[VERIFIED: js/shell.js:58-75]`):
```js
// js/shell.js — proposed (pattern matches lines 58-75 declarations)
let paused = false;
let pausedByVis = false;

function enterPause(byVisibility) {
  if (paused || run.status !== 'running') return;          // D-04: only an active stepping run
  paused = true;
  pausedByVis = !!byVisibility;
  holdFrom = null; pressIntent = null; releaseIntent = false;
  run = { ...run, buffer: 0 };                             // D-12: sim-side buffer cleared via spread (precedent shell.js:56)
  acc = 0; stopUntil = 0; juiceSig = null;
  if (audioReady) audio.suspend?.();
}

function resumeFromPause() {
  if (!paused) return;
  paused = false; pausedByVis = false;
  ({ rope, player, run } = resumeRun({ ...run, buffer: 0 }));   // D-03 lead-in; NOT startRun() — it would wipe score/effects/owned
  reentryAt = performance.now();                            // D-07 input lock, same as tickPick's pick-confirm path shell.js:176
  holdFrom = null; pressIntent = null; releaseIntent = false;
  acc = 0; stopUntil = 0;
  if (audioReady) audio.gesture();                          // gesture() resumes a suspended ctx [VERIFIED: js/audio.js:77-79]
}
```
Keygrounding for every field above: `reentryAt`/`holdFrom`/`pressIntent`/`stopUntil`/`juiceSig` are the same closure vars the pick-confirm path manipulates `[VERIFIED: js/shell.js:166-184,256-257]`; `resumeRun` and `startRun` signatures `[VERIFIED: js/game.js:28-34]`; `run.buffer` is a sim state field `[VERIFIED: js/game.js:37,49]`.

Keyboard binding (before the Space branch, after the audio short-circuits `[VERIFIED: js/shell.js:102-111]`):
```js
// proposed, inside the existing window keydown listener
if (e.code === 'KeyP' || e.code === 'Escape') {
  if (!e.repeat) { paused ? resumeFromPause() : enterPause(false); }   // !e.repeat: same OS-repeat guard as Mute/Minus/Equal, shell.js:106-109
  return;
}
```

HUD prompt (in `updateHud`, before the `choose` branch `[VERIFIED: js/shell.js:208-223]`):
```js
// proposed
let prompt = '';
if (paused) prompt = 'paused — press P to resume';        // wording = discretion
else if (run.status === 'choose' && run.offer) { /* existing branches unchanged */ }
```
`paused` is checked first so the freeze frame shows the prompt over a still-running status — render3d's status bookkeeping (`if (status !== lastStatus)`) never sees a change `[VERIFIED: js/render3d.js:352-356]`, which is exactly what "freeze frame" means there: pose is a pure function of frozen `rope.phase`/`player` with `status === 'running'` `[VERIFIED: js/render3d.js:383-398]`.

`visibilitychange` rewrite (replacing the one-liner at `js/shell.js:116`):
```js
// proposed — replaces: window.addEventListener('visibilitychange', () => { if (audioReady) audio.gesture(); });
window.addEventListener('visibilitychange', () => {
  const hidden = typeof document !== 'undefined' && document.hidden;   // event carries no state — read document.hidden [CITED: MDN Document.visibilitychange_event]
  if (hidden) {
    if (run.status === 'running') { releaseEverything(); enterPause(true); }   // D-11 + D-04
    else if (audioReady) audio.gesture();                                      // D-04: today's exact behavior for idle/choose/over
  } else {
    if (pausedByVis) resumeFromPause();                                        // tab-return auto-resume through the lead-in (D-03)
    else if (audioReady) audio.gesture();                                      // D-N08 recovery path, unchanged
  }
});
window.addEventListener('focus', () => { if (audioReady && !paused) audio.gesture(); });   // guard added: focus must not un-suspend a paused ctx (Pitfall 4)
```
**Design reading to confirm (Open Q1):** D-03's "tab-return … land the player in a known safe rhythm window" implies tab-return *auto-resumes* via the lead-in (as above). If instead a keypress should be required after tab-return, keep `pausedByVis` set and let P/Esc-or-press resume — one-line change in the `else` branch.

### Pattern 2: Reduced motion = three data writes in render3d, one flag from the shell (UI-02)

Detection (shell, injection style per repo convention "inject, don't feature-sniff inline"):
```js
// proposed in js/shell.js — typeof guard mirrors press()'s `typeof AudioContext === 'function'` guard [VERIFIED: js/shell.js:82]
const motionQ = typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
let reducedMotion = motionQ ? motionQ.matches : false;
if (motionQ && typeof motionQ.addEventListener === 'function') {
  motionQ.addEventListener('change', e => { reducedMotion = e.matches; });   // [CITED: MDN MediaQueryList change_event]
}
// and in frame(): scene.render({ run, rope, player, prevPhase, alpha, best, now, juice: juiceSig, reducedMotion });
```
The `typeof` guard is **mandatory** — every existing harness stubs `window` as `{ addEventListener }` only `[VERIFIED: tests/shell.test.js:59-61; tests/audio.test.js:309-311]`; an unguarded call throws at boot in 100 existing tests (Pitfall 5).

Application in `js/render3d.js` — each dampening is exactly one of the three sites CONTEXT predicted:

1. **Wobble off = snap-grid value write.** The snap step in internal pixels equals `SNAP_S` with `grid = internal/(2*S)` `[VERIFIED: js/render3d.js:11,94]`:
```js
// js/render3d.js:94 (verbatim)
const uSnapGrid = { value: new THREE.Vector2(internalW / (2 * SNAP_S), INTERNAL_H / (2 * SNAP_S)) };
// uniform VALUE writes with no recompile are already the established resize path [VERIFIED: js/render3d.js:302]
```
   Recommended "near-zero": `SNAP_OFF = 0.25` (0.25-pixel step = sub-pixel snap, visually no crawl; grid ≈ 2×internalW, product with NDC ≤ ~2000 — safely inside float32 exact-integer range). Do **not** use Infinity/0 (NaN/undefined floor behavior in GLSL). Apply in `applyBufferSize` *and* on flag change: `uSnapGrid.value.set(internalW / (2 * (view.reducedMotion ? SNAP_OFF : SNAP_S)), INTERNAL_H / (2 * (view.reducedMotion ? SNAP_OFF : SNAP_S)))` — note `applyBufferSize` currently hardcodes `SNAP_S` `[VERIFIED: js/render3d.js:302]`, so both sites must read the same `snapS()` helper or the resize will undo dampening (subtle pitfall: **clamp band ⇒ resize polls re-apply wobble**).
2. **Shake to zero = one multiply at the source** `[VERIFIED: js/render3d.js:413,448-450]`:
```js
// js/render3d.js:448-450 (verbatim)
    const jt = (view.now ?? 0) - juiceAt;
    const shake = jt >= 0 && jt < 140 ? juiceShake * Math.exp(-jt / 50) * Math.sin(jt * 0.55) : 0;
    ditherMat.uniforms.uShake.value.set(shake / internalW, shake / INTERNAL_H);
```
   Gate `juiceShake` at its single write site (line 413: `juiceShake = Math.min(2, view.juice.shake ?? 0)` → `… : 0` when reduced). The post shader itself needs no change — zero amplitude through the existing shader is bit-exact "shake off" `[VERIFIED: js/render3d.js:38-58]`.
3. **Particles static/fade-only = pin positions, keep the opacity ramp** `[VERIFIED: js/render3d.js:427-445]`: the per-particle `position.set(...)` block (433-442) is the only motion; wrap it in `if (!reduced)`, keep `particleMat.opacity = Math.max(0, 1 - pt / 0.45)` (line 443) and the 0.45 s lifetime/visibility logic intact — matches D-05 "spawn but static/fade-only" with spawn code (411-425) untouched.

What must stay untouched per D-05: rope pivot, rig pose, blob shadow (all in the `else` branch 383-406), HUD. Discretion items with recommendations: trip-settle pivot shake `[VERIFIED: js/render3d.js:376-377]` and idle bob/twirl `[VERIFIED: js/render3d.js:363-364]` are cosmetic scene motion → recommend damping both to their still endpoints (pivot at exactly `-Math.PI`, bob 0, twirl frozen pose) under reduced motion; hitstop stays (CONTEXT default).

### Pattern 3: Letterbox entirely in the shell's DOM path (UI-03)

Geometry chain, verified: `render3d.applyBufferSize` derives internal RT width, snap grid, camera aspect, and renderer size **solely from the canvas element's backing dimensions** `[VERIFIED: js/render3d.js:298-306]`, re-checked via the passive poll each render `[VERIFIED: js/render3d.js:333-340]`. The shell's `resize` listener is the sole writer of `canvas.width/height` `[VERIFIED: js/shell.js:29,113]`, with `windowSize()` coercing missing `innerWidth/innerHeight` to the 480×640 fallback `[VERIFIED: js/shell.js:24-26]`.

But `css/style.css` stretches the canvas to the viewport regardless of its buffer size:
```css
/* css/style.css:3-9 (verbatim) */
canvas {
  display: block;
  width: 100vw;
  height: 100vh;
  image-rendering: pixelated;
  background: #2a3440;
}
```
So the fix is arithmetic in the shell + writing the CSS size — `render3d.js` needs **no geometry change at all**:
```js
// proposed in js/shell.js (module scope, UPPER_SNAKE per conventions)
const ASPECT_MIN = 3 / 4;          // rough band per D-07 — exact limits planner's call
const ASPECT_MAX = 2 / 1;

// inside startGame, replaces the resize-handler body at shell.js:113 (and the boot line 29)
function applyWindowSize() {
  const [w, h] = windowSize();                         // keeps the 480/640 Node fallback (aspect 0.75 = band edge → letterbox-free in tests)
  const aspect = Math.min(ASPECT_MAX, Math.max(ASPECT_MIN, w / h));
  const dw = Math.round(Math.min(w, h * aspect));      // contain-fit the clamped-aspect box inside the window
  const dh = Math.round(Math.min(h, w / aspect));
  canvas.style.width = dw + 'px';                      // harness canvas stub must gain style: {} (Pitfall 5)
  canvas.style.height = dh + 'px';
  [canvas.width, canvas.height] = [Math.max(2, dw), Math.max(2, dh)];   // buffer follows the CSS box 1:1, exactly like today for normal windows
}
window.addEventListener('resize', applyWindowSize);    // D-10: orientationchange deliberately absent
```
with `css/style.css`: keep `canvas { image-rendering: pixelated; }`, drop the `width:100vw; height:100vh` stretch (the style attributes now size it), and set `html, body { background: #000; }` for the black bars (D-07 says black; current value is `#2a3440` `[VERIFIED: css/style.css:1]`). Normal windows compute `dw=w, dh=h` → pixel-identical to today (specifics §3 honored). Fractional-NN upscale is untouched (D-08): the RT→canvas blit is unchanged `[VERIFIED: js/render3d.js:452-456]`. HUD is a `position: absolute; inset: 0` overlay on the viewport `[VERIFIED: css/style.css:10-23]`; during letterbox it centers over the window, not the canvas box — acceptable (D-09 fixed text size = today's fixed px sizes; no work).

Non-finite guard: `windowSize()`'s `Number(x) || 480` coercion already protects against garbage `[VERIFIED: js/shell.js:25]`; the band arithmetic must keep NaN out (`Math.min/max` of a NaN propagates — the coercion prevents it).

### Pattern 4: release-everything without phantom jumps (criterion 4)

The reducer is: listeners set `pressIntent`/`releaseIntent` `[VERIFIED: js/shell.js:93,96-98]`; `consumeIntents` converts `pressIntent → holdFrom` (subject to the lead-in lock) and `releaseIntent → jump(player, hold)` `[VERIFIED: js/shell.js:119-160]`:
```js
// js/shell.js:137-146 (verbatim excerpt)
    if (releaseIntent) {
      if (run.status === 'running') {
        if (performance.now() - reentryAt >= LEAD_IN_MS && holdFrom !== null) {
          player = jump(player, (performance.now() - holdFrom) / 1000);
          audio?.handleEvent('jump');
          holdFrom = null;
          pressFired = true;
```
The shared handler must fire a mid-flight charge **through** that path (so `pressFired` still feeds the FEEL-01 buffer) rather than clearing state first — see the `holdFrom` precedence in Pitfall 6:
```js
// proposed in js/shell.js
function releaseEverything() {
  if (run.status === 'running' && pressIntent !== null) { holdFrom = pressIntent; pressIntent = null; }
  if (run.status === 'running' && holdFrom !== null) releaseIntent = true;   // fires via consumeIntents with hold-so-far (D-11)
  else pressIntent = null;
  if (run.status === 'choose') { pickPressedAt = null; pickFill = 0; }       // sub-confirm card hold cancels cleanly (D-11)
}
window.addEventListener('blur', releaseEverything);
canvas.addEventListener('pointercancel', releaseEverything);
```
Deliberately **not** routing through the `over`-status release branch (`consumeIntents` line 154-158 restarts the run on release in 'over' `[VERIFIED: js/shell.js:154-158]`) — `releaseIntent` is set only when a hold is genuinely in flight, so a blur on the game-over screen cannot silently restart a run. For the pause path, `enterPause` clears `holdFrom` outright (fire-superseded-by-clear, D-12), which is why the `else pressIntent = null` arm matters: paused/hidden runs never leave `releaseIntent` armed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pausing audio | manual gain-muting + track-source bookkeeping | `AudioContext.suspend()` + existing `gesture()` resume `[CITED: MDN AudioContext.suspend]` | suspend stops context time entirely; source bookkeeping duplicates D-N08's create-once invariant `[VERIFIED: js/audio.js:62-80]` |
| "Paused" UI | new DOM element or shader dim | existing `hud-prompt` channel `[VERIFIED: js/shell.js:208-225]` | D-02 explicitly says no new UI surface |
| Motion-preference polling | polling `matchMedia` per frame | `change` event subscription `[CITED: MDN MediaQueryList change_event]` | event-driven is Baseline; polling burns the frame budget for nothing |
| Letterbox bars in GLSL | scissor bars / shader discard in the post pass | DOM/CSS sizing (Pattern 3) | keeps `internalW`/`camera.aspect`/snap-grid chain coherent from canvas dims `[VERIFIED: js/render3d.js:298-306]`; shader route would need aspect split-brain |
| A second lead-in for resume | re-deriving phase/jump constants | exported `resumeRun`/`leadIn` `[VERIFIED: js/game.js:21-34]` | ARCH-02 single-path rule; boundary grep bans re-appearing `phase: 0.33` literals `[VERIFIED: tests/boundary.test.js:58-65]` |
| Releasing stuck input | new per-event cleanup functions | one `releaseEverything()` joining the existing intent vocabulary | D-11 says "not a new one"; each new cleanup path would need its own tests |

**Key insight:** every mechanism this phase needs already exists as a pattern in `shell.js` — hitstop's gate, pick-confirm's re-entry lock, D-N08's gesture lifecycle, and the passive-poll resize chain are the four precedents; the phase is wiring plus three render3d data branches.

## Runtime State Inventory

Rename/migration inventory not applicable (pure feature phase). Checked anyway for completeness:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no new localStorage keys; existing `jumprope-best` `[VERIFIED: js/game.js:120]` and `jumprope-audio` `[VERIFIED: js/audio.js:7]` untouched (CONTEXT: "no new localStorage keys introduced by this phase") | none |
| Live service config | None — static-file project, no server component `[VERIFIED: AGENTS.md constraints]` | none |
| OS-registered state | None — browser game, nothing registered with the OS | none |
| Secrets/env vars | None — no env vars exist `[VERIFIED: AGENTS.md Technology Stack]` | none |
| Build artifacts | None — no build step `[VERIFIED: AGENTS.md constraints]` | none |

## Common Pitfalls

### Pitfall 1: Held accumulator fast-forwards the post-resume lead-in
**What goes wrong:** pausing for 30 s while `frame()` keeps running (manual pause; browser still fires rAF) accumulates wall time in `acc` (clamped to 0.25 s `[VERIFIED: js/shell.js:231]`); on resume the drain spends up to 30 sim steps of the ~0.43 s lead-in in one frame, landing the player mid-swing — violating D-03's timing contract.
**Why it happens:** hitstop's gate (`break` at `shell.js:237`) is safe for ≤80 ms freezes only because the held `acc` stays small; an indefinite freeze reuses it wrongly.
**How to avoid:** `if (paused) acc = 0;` before the drain (Pattern 1); also zero `stopUntil` at both transitions so a pending hitstop can't extend the freeze past resume.
**Warning signs:** a shell test that pauses, advances the stub clock by 5 s, resumes, and asserts `rope.phase` equals `START_PHASE + (one or two steps of lead-in)` will fail with a phase hundreds of steps ahead.

### Pitfall 2: `resumeRun(run)` carries `run.buffer` across the pause
**What goes wrong:** `resumeRun` spreads the run `[VERIFIED: js/game.js:33]`, so a half-decayed FEEL-01 forgiveness buffer survives pause — the first rope crossing after resume is auto-forgiven, contradicting D-12 ("a stale press can never leak into the post-resume rhythm").
**Why it happens:** card-pick resume (the existing caller) never needed buffer clearing; pause reuses the function unchanged.
**How to avoid:** resume call site spreads first: `resumeRun({ ...run, buffer: 0 })`.
**Warning signs:** headless check — pause with a fresh `tickRun` press, resume, step into a feet-crossing without jumping, and expect a trip; if it scores a forgiven near-miss, the buffer leaked.

### Pitfall 3: Resuming with `startRun()` wipes the run
**What goes wrong:** `startRun()` returns a fresh `createRun()` `[VERIFIED: js/game.js:28-30]` — score, effects, owned cards all reset. CONTEXT D-03 says "the same `startRun` lead-in re-entry" meaning the *lead-in semantics*, which are implemented by `resumeRun` for pick-resume `[VERIFIED: js/shell.js:175]`. Pause-resume must use `resumeRun`.
**Warning signs:** paused at score 40 with three cards → resume → score 0. Trivially caught by any pause test asserting score continuity.

### Pitfall 4: The D-N08 listeners resurrect suspended audio
**What goes wrong:** `shell.js:116-117` call `audio.gesture()` on every `visibilitychange`/`focus`, and `gesture()` resumes any suspended context `[VERIFIED: js/audio.js:77-79]`. A paused-then-tab-returned game would auto-unsuspend before the player resumes; a `focus` event racing `visibilitychange` on tab-return can un-suspend mid-pause (focus fires before/after visibilitychange depending on browser). Also `press()` itself revives audio on every press `[VERIFIED: js/shell.js:89-91]` — a Space tap while manually paused would resume the *track* behind the freeze frame.
**How to avoid:** guard both D-N08 listeners with `&& !paused`; early-return `press()`/`release()` while `paused` (input is locked during pause anyway — the pending-intent arms are cleared by D-12, so nothing is lost).
**Warning signs:** audio-wrapper test log shows `suspend` followed by `resumes++` before any resume action.

### Pitfall 5: New shell capabilities crash the frozen harnesses
**What goes wrong:** all three data-URL harnesses stub `globalThis.window = { addEventListener }` `[VERIFIED: tests/shell.test.js:59-61; tests/audio.test.js:309-311]`, canvas objects have no `style` `[VERIFIED: tests/shell.test.js:39-43]`, and `document` has only `getElementById`. Therefore: unguarded `window.matchMedia(...)` → `TypeError` at boot in all existing shell-boot tests; `canvas.style.width = …` in the resize path → TypeError when the D-02/T-01-08 legs call the resize handler (they don't today, but new ones will); `document.hidden` is `undefined` under stubs → treated as visible (benign — new visibility legs must *set* `document.hidden` explicitly).
**How to avoid:** `typeof window.matchMedia === 'function'` guard (mirrors the `typeof AudioContext` guard `[VERIFIED: js/shell.js:82]`); harness additions in the same PR as the code: `style: {}` on canvas stubs, a `matchMedia` stub returning `{ matches, addEventListener }` with a test-visible `emit(matches)` hook, `innerWidth`/`innerHeight` on the window stub, `hidden` on the document stub.
**Warning signs:** `node --test tests/` boot failures naming `data:text/javascript,…` module evaluation.

### Pitfall 6: Clearing `holdFrom` before `releaseIntent` is consumed silently eats the jump
**What goes wrong:** the release branch fires the jump only when `holdFrom !== null` at consumption time `[VERIFIED: js/shell.js:139-142]`. A "release-everything" that zeroes `holdFrom` immediately (as if cleaning up) makes D-11's "fires with the hold time accumulated so far" a no-op — no phantom jump, but also no fired jump, which fails the D-11 verifiable ("assert no holdFrom survives" passes for the wrong reason).
**How to avoid:** Pattern 4's ordering — convert `pressIntent → holdFrom`, then set `releaseIntent = true` and leave `holdFrom` for `consumeIntents` to fire-and-clear. Assert in tests that a jump actually launches (view log: player airborne next step), not merely that state is cleared.
**Warning signs:** a mid-hold `blur` dispatch followed by frames shows the player still grounded.

### Pitfall 7: New static relative imports in `shell.js` break every harness boot
**What goes wrong:** harnesses boot shell source as a `data:` URL, rewriting only `render3d/game/rope/player` specifiers `[VERIFIED: tests/shell.test.js:82-86]`; `audio.js` survives only because it is a *dynamic* import inside a `.catch` `[VERIFIED: js/shell.js:39-48]`. A new `import { x } from './viewport.js'` in shell.js has no base URL to resolve against → boot throws → all existing data-URL boots fail.
**How to avoid:** do not add static js/ imports to shell.js; if a pure helper module is genuinely wanted, extend all three harness rewrite sets (shell.test.js, audio.test.js Part B, pickflow.test.js) in the same change — or keep the arithmetic inline in `shell.js` (recommended, Pattern 3 is 6 lines).
**Warning signs:** `ERR_MODULE_NOT_FOUND` inside a boot test.

### Pitfall 8: A test importing `shell.js` directly trips the ARCH-01 fence
**What goes wrong:** `boundary.test.js` derives graph entry points from the static relative specifiers in every `tests/*.test.js` `[VERIFIED: tests/boundary.test.js:27-43]`, walks `shell.js → render3d.js` and adds bare specifier `three` → the ARCH-01 offenders assertion `[VERIFIED: tests/boundary.test.js:52-56]` fails. Note this happens even though `render3d.js` is never executed.
**How to avoid:** keep exercising shell logic through the source-rewriting harness only; put directly-importable pure helpers in `game.js` (or an IO-free leaf). `windowSize`-style sizing math is 3 lines — inline it.
**Warning signs:** ARCH-01 test failure with `(imported by …/js/render3d.js)` in the offender list.

### Pitfall 9: Clamped letterbox silently ignored because of CSS stretch
**What goes wrong:** setting only `canvas.width/height` to the clamped box while CSS still says `width:100vw; height:100vh` `[VERIFIED: css/style.css:3-9]` stretches the clamped buffer to the window — the exact distortion the band exists to prevent, now with a worse sampling factor.
**How to avoid:** write `canvas.style.width/height` in the same handler and remove the vw/vh stretch (Pattern 3).
**Warning signs:** manual UAT: narrow the window to 1000×300 — expect vertical black bars and an undistorted square-ish frame; without the style write the image squashes.

### Pitfall 10: Doing pause work inside `frame()` instead of the event handler
**What goes wrong:** browsers stop (or coarsely throttle) rAF in hidden tabs, so a transition detected "next frame" never runs until return — the player hears audio and returns to a mid-swing rope. `visibilitychange` is the last reliably observable event before hidden `[CITED: developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event — Usage notes]`.
**How to avoid:** `enterPause`/`releaseEverything` execute synchronously inside the event listeners (Pattern 1/4); `frame()` only *enforces* the gate.
**Warning signs:** UAT: switch tabs mid-run while holding Space; audio must be silent *while the other tab is shown*, not when you come back.

### Pitfall 11: keydown OS-repeat toggles pause at ~30 Hz while P is held
**What goes wrong:** holding P fires keydown repeatedly; an unguarded toggle strobes pause/resume (each resume re-arms a lead-in — the game looks broken).
**How to avoid:** the `!e.repeat` guard, exactly as the Mute/Minus/Equal branches already do `[VERIFIED: js/shell.js:106-109]`.

### Pitfall 12: Resize re-applies the wobble the reduced-motion flag removed
**What goes wrong:** `applyBufferSize` recomputes `uSnapGrid` from the hardcoded `SNAP_S` on every passive-poll size change `[VERIFIED: js/render3d.js:298-306]`. If dampening is applied only on the matchMedia `change` event, any later resize restores full wobble under reduced motion.
**How to avoid:** route both sites through one `snapGridFor(reduced)` helper, and recompute in `applyBufferSize` using the currently-stored reduced flag (mirror of `ditherMat.uniforms.uInternalRes.value.set(...)` in the same function `[VERIFIED: js/render3d.js:301]`).

## Code Examples

### Hitstop gate the pause gate mirrors (source of truth)
```js
// Source: js/shell.js:232-238 (verbatim)
    while (acc >= STEP) {
      // D-N05: juice freeze gate — a pending event deadline halts the drain
      // here, delaying (never dropping) the remaining steps of this drain;
      // the held acc resumes under the unchanged 0.25 clamp above.
      if (now < stopUntil) break;
      consumeIntents();
```

### Lead-in constants resume must reuse (no new literals allowed)
```js
// Source: js/game.js:10,20-34 (verbatim)
export const START_PHASE = 0.33;
export function leadIn() {
  return {
    rope: { phase: START_PHASE, period: ROPE_PERIOD },
    player: jump(createPlayer(), 0.1),
  };
}
export function startRun() {
  return { ...leadIn(), run: { ...createRun(), status: 'running' } };
}
export function resumeRun(run) {
  return { ...leadIn(), run: { ...run, status: 'running', offer: null } };
}
```

### audio.js addition (mirrors the module's existing guard style)
```js
// proposed, js/audio.js — added to the factory surface next to gesture()
function suspend() {
  if (ctx && ctx.state === 'running') ctx.suspend();   // returns a Promise; fire-and-forget, no silent-broken-state [CITED: MDN AudioContext.suspend]
}
// returned surface gains: suspend,
```
The audio.test.js stub gains the symmetric leg next to its `resume` stub `[VERIFIED: tests/audio.test.js:36]`:
```js
ctx.suspend = () => { ctx.state = 'suspended'; ctx.suspends++; };
```

### Stubbed matchMedia harness shape (mirrors bootAudioShell's wrapper idiom)
```js
// proposed harness additions (tests/polish.test.js, bootShell-copy)
const mq = { matches: false, listeners: [], addEventListener(t, fn) { if (t === 'change') this.listeners.push(fn); } };
globalThis.window.matchMedia = q => (q === '(prefers-reduced-motion: reduce)' ? mq : { matches: false, addEventListener() {} });
// fire: mq.matches = v; mq.listeners.forEach(fn => fn({ matches: v }));
```

### Observability for dampen assertions via the existing THREE-stub harness
```js
// tests/render3d.test.js's stub keeps uniforms/materials [VERIFIED: tests/render3d.test.js:74-82];
// to observe uSnapGrid/uShake post-render, extend THREE_STUB so Group.add() records children
// (today it is a no-op [VERIFIED: tests/render3d.test.js:37]), then dig:
// postScene children[0].material.uniforms.uShake.value.x === 0 after a juice event with view.reducedMotion === true
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `matchMedia().addListener(cb)` (deprecated) | `mql.addEventListener('change', cb)` | Baseline since ~2020 `[CITED: MDN MediaQueryList change_event]` | evergreen-only target (AGENTS.md) → `addEventListener` only; `addListener` shims are dead weight |
| `beforeunload`/`blur`-based tab-pause heuristics | `visibilitychange` + `document.hidden` as the authoritative hide signal | Page Visibility API Baseline since April 2021 `[CITED: MDN Document.visibilitychange_event]` | D-01/D-04 design is the documented best practice; MDN's own "pause music on hide" example matches the audio suspend/resume lifecycle one-for-one |
| Suspending WebAudio by disconnecting nodes / `close()` | `AudioContext.suspend()` (state round-trip, context time frozen) | Web Audio spec feature, Baseline widely available `[CITED: MDN AudioContext.suspend]` | no re-creation churn; resume already implemented in `gesture()` `[VERIFIED: js/audio.js:77-79]` |

**Deprecated/outdated:** `MediaQueryList.addListener`/`removeListener` (do not use); AGENTS.md's architecture sections describing Canvas-2D `game.js` rendering (stale doc, do not plan against it — plan against `shell.js`/`render3d.js`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tab-return auto-resumes via the lead-in (no keypress required) | Pattern 1 visibilitychange design | If the user expects to press P after returning, the `else { if (pausedByVis) resumeFromPause(); }` branch is the wrong trigger — one-line fix but a different UAT story. **Confirm during planning.** |
| A2 | rAF stops/throttles in hidden tabs on all evergreen browsers (used only as a safety argument for Pitfall 10, design does not depend on it) | Pitfall 10 | none — handler-side pause works either way |
| A3 | Sub-pixel snap grid (`SNAP_OFF = 0.25`) is visually equivalent to snap-off and numerically stable in float32 | Pattern 2 wobble | if banding artifacts appear, fall back to a 1-pixel grid (still near-invisible crawl); UAT check |
| A4 | Trip-settle shake + idle bob/twirl should dampen under reduced motion (D-05's named set doesn't mention them) | Pattern 2 discretion | cosmetic disagreement at UAT; flip one conditional either way |
| A5 | Clamp band exactly 3:4–2:1 (CONTEXT's "roughly") | Pattern 3 constants | planner's documented call; the 480×640 harness fallback sits exactly on the 3:4 edge, so a stricter MIN would add surprise bars in tests |
| A6 | Phase-3's deferred "reduced-motion flash dampening" (the 150 ms `CLOSE!`/card-name HUD text flash `[VERIFIED: js/shell.js:219-220,259-264]`) is closed as no-op because D-05 protects the HUD channel | Pattern 2 scope | a motion-sensitive user may find a brief text flash unpleasant; revisit only in UAT |

## Open Questions

1. **Does tab-return auto-resume, or must the player press a key?**
   - What we know: D-03 — "tab-return and manual-resume both land the player in a known safe rhythm window"; the prompt wording "paused — press P to resume" describes manual pause.
   - What's unclear: whether "land" means automatically-on-visible or on-first-input-after-visible.
   - Recommendation: auto-resume via the lead-in on visible (Pattern 1 code as written); if UAT prefers manual resume, gate on first keypress/press instead and reuse `LEAD_IN_MS` lock — planner picks one and pins it with a test either way.

2. **Which pause state shows the prompt after a tab-hide?**
   - If auto-resume-on-visible (recommended), the paused prompt is only visible mid-hidden-tab (invisible) — so D-02's prompt effectively serves the manual-pause case, and tab-hide pause needs only the audio/sim freeze. Accept the asymmetry or add a brief "resuming…" flash on return (flash channel exists `[VERIFIED: js/shell.js:68-69,259-263]`).
   - Recommendation: accept; don't add UI.

3. **Trip-settle and idle cosmetic motion under reduced motion** (A4).
   - Recommendation: dampen both to their still endpoints; keep hitstop (CONTEXT default).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (`node --test`) | all automated legs | ✓ | v26.8.1 (verified this session) | — |
| Test baseline | — | ✓ | 100 tests pass in 1.8 s (`node --test tests/`, run this session) | — |
| Static file server (browser UAT) | UI-01/02/03 manual legs | ✓ assumed (`python3 -m http.server` / `npx serve`) | — | any static host |
| Real browser with tab-hide semantics | UI-01 UAT | ✗ (not automatable in Node harnesses) | — | manual UAT at end-of-phase (config `human_verify_mode: end-of-phase`) |
| OS reduced-motion toggle | UI-02 UAT | ✗ | — | browser devtools emulates `prefers-reduced-motion` in Chromium/Firefox `[ASSUMED]` |
| npm packages | — | not needed | — | — |

**Missing dependencies with fallback:** browser-dependent legs are covered by Node stub tests + a short manual UAT checklist (tab-switch pause, OS motion toggle, extreme window drag) — matching the phase's verifiability notes in D-01/D-02/D-06/D-11.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` + `node:assert/strict` (built-in; no config file by design) |
| Config file | none — `node --test tests/` (baseline: 100 pass, 1.8 s, run this session) |
| Quick run command | `node --test tests/polish.test.js tests/shell.test.js tests/render3d.test.js tests/audio.test.js` |
| Full suite command | `node --test tests/` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | P/Escape mid-run → zero sim steps (rope.phase frozen across pumped frames), score frozen, prompt shows paused | unit (harness, stubbed rAF clock) | `node --test tests/polish.test.js -x` | ❌ Wave 0 |
| UI-01 | `document.hidden=true` during running → paused; audio wrapper log shows `suspend`; hidden during `over`/`idle` → no paused state, prompt unchanged (D-04) | unit | `node --test tests/polish.test.js -x` | ❌ Wave 0 |
| UI-01 | Resume → `rope.phase === START_PHASE` view, `reentryAt` lock drops a mid-lead-in press, score/effects survive (`resumeRun`, not `startRun`), buffer cleared (Pitfall 2 headless check) | unit | `node --test tests/polish.test.js -x` | ❌ Wave 0 |
| UI-02 | Stubbed matchMedia `emit(true/false)` → next view payload carries `reducedMotion` both ways (D-06) | unit | `node --test tests/polish.test.js -x` | ❌ Wave 0 |
| UI-02 | render3d stub leg: with `view.reducedMotion=true` after a juice signal, captured `uShake.value` stays (0,0); snap uniform holds the dampened grid across a canvas resize (Pitfall 12) | unit | `node --test tests/render3d.test.js -x` | partial (harness exists; dampen legs ❌ Wave 0) |
| UI-03 | Stub `innerWidth/innerHeight` (2000×400, 300×900, 480×640) → resize handler → canvas.width/height aspect inside band, `canvas.style.width/height` written, normal window byte-identical to today's passthrough | unit | `node --test tests/polish.test.js -x` | ❌ Wave 0 |
| Crit-4 | mid-hold `blur`/`pointercancel`/hidden → jump fires with accumulated hold (view shows player airborne) and no second jump on the stale keyup; mid card-hold → cancel without confirm (`hud-prompt` still shows offer list, no pick in audio log) | unit | `node --test tests/polish.test.js -x` | ❌ Wave 0 |
| UI-01/02/03 | Real tab-hide pause, real OS motion toggle, real extreme-window letterbox | manual UAT | browser checklist at phase gate | n/a |

### Sampling Rate
- **Per task commit:** `node --test tests/polish.test.js` (< 2 s)
- **Per wave merge:** `node --test tests/` (must stay 100+ pass; frozen files `tests/rope.test.js`, `tests/player.test.js`, `tests/upgrades.test.js`, `tests/game.test.js` byte-identical per Phase-1 precedent)
- **Phase gate:** full suite green + manual UAT checklist (human_verify_mode: end-of-phase)

### Wave 0 Gaps
- [ ] `tests/polish.test.js` — bootShell-copy harness (audio.test.js Part B is the copy precedent `[VERIFIED: tests/audio.test.js:264-378]`) with added stubs: `canvas.style`, `window.innerWidth/innerHeight`, `window.matchMedia`, `document.hidden`, audio-wrapper `suspend` log — covers UI-01/crit-4/UI-03 legs
- [ ] `tests/shell.test.js` harness edit — `style: {}` on the canvas stub, `typeof`-guarded matchMedia fallback (Pitfall 5)
- [ ] `tests/audio.test.js` — `makeAudioContext` stub gains `suspend()`; one Part-A suspend/resume-cycle leg
- [ ] `tests/render3d.test.js` — THREE_STUB `Group.add` records children (or registers materials in a global array) so uniforms are reachable for dampen assertions `[VERIFIED: tests/render3d.test.js:37]`

## Security Domain

Config: `security_enforcement: true`, ASVS L1.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (no auth) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | coerce external numerics: `windowSize()` `Number() || fallback` pattern `[VERIFIED: js/shell.js:25]`; band math must be NaN-proof (guard before `Math.min/max`); `matchMedia` read is boolean-only |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| NaN/0/Infinity from exotic viewport metrics poisoning `internalW` → WebGL allocation failure (browser crash vector) | Tampering/DoS | clamp before round: existing `Math.max(2, Math.round(...))` `[VERIFIED: js/render3d.js:85,299]` + finite input coercion; add a letterbox test at 1×1 and 0-coerced windows |
| Rapid resize-storm thrashing `WebGLRenderTarget` recreation | DoS | already amortized: render3d reallocates only when the poll sees a *changed* canvas size `[VERIFIED: js/render3d.js:333-340]`; shell handler is O(1) arithmetic — no throttle needed, keep it that way |
| New event surface (`pointercancel`/`blur`) injecting unintended run restarts | Spoofing (state) | Pitfall 6 ordering: never arm `releaseIntent` in `over` status from a loss event |
| Supply chain (new deps) | — | none introduced; importmap stays pinned `three@0.186.1` `[VERIFIED: index.html:12]` |

## Sources

### Primary (HIGH confidence — read this session)
- `js/shell.js` (full) — reducer, frame loop/hitstop gate, listeners, harness-visible structure
- `js/game.js`, `js/rope.js`, `js/player.js`, `js/audio.js`, `js/render3d.js` (full) — lead-in constants, lifecycle, dampening sites
- `tests/shell.test.js`, `tests/audio.test.js` (Parts A/B), `tests/boundary.test.js`, `tests/render3d.test.js` — harness mechanics and fence rules
- `index.html`, `css/style.css`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `05-CONTEXT.md`
- Command runs: `node --version` (v26.8.1), `node --test tests/` (100/100 pass)

### Secondary (MEDIUM — official docs fetched this session)
- MDN `AudioContext/suspend` — Baseline, state-guarded suspend, Promise return
- MDN `MediaQueryList/change_event` — Baseline, `addEventListener('change')`
- MDN `Document/visibilitychange_event` — Baseline since 2021; read `document.hidden`; "transition to hidden is the last reliably observable event"; documents the hide→pause/resume-on-visible pattern
- MDN `Element/pointercancel_event` — Baseline; fired by app-switch/home gestures; followed by pointerout/pointerleave

### Tertiary (LOW)
- Devtools emulation of `prefers-reduced-motion` in Chromium/Firefox `[ASSUMED]` — confirm during UAT setup.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps; all web APIs cross-checked on MDN this session
- Architecture: HIGH — every cited line reference re-verified against file contents this session
- Pitfalls: HIGH for harness interactions (read all three harnesses); MEDIUM for float32 snap-grid behavior at sub-pixel S (A3)

**Research date:** 2026-10-22
**Valid until:** 2026-11-21 (stable browser baselines; re-verify only if harness/frozen test files change)
