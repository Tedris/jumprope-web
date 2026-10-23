---
phase: 04-feel-audio
reviewed: 2026-10-22T00:00:00Z
depth: deep
files_reviewed: 8
files_reviewed_list:
  - js/game.js
  - js/shell.js
  - js/render3d.js
  - js/audio.js
  - tests/feel.test.js
  - tests/juice.test.js
  - tests/audio.test.js
  - tests/feelcap.test.js
findings:
  critical: 2
  warning: 4
  info: 4
  total: 10
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-10-22
**Depth:** deep (cross-file trace of game.js ⇄ shell.js ⇄ render3d.js ⇄ audio.js, plus executed simulations of the real shell flow)
**Files Reviewed:** 8 (4 source modules; 4 test files checked for assertion reliability)
**Status:** issues_found

## Summary

Phase 04 adds the input-buffer/near-miss/streak layer to `tickRun`, the hitstop/shake/particles/callout juice loop to the shell and renderer, and a new WebAudio leaf module. The overall structure honors the project's purity and layering conventions, and the test suite is genuinely green (98/98 verified). However, adversarial execution surfaced two provably wrong numeric computations in `audio.js` (an out-of-range noise generator and a `|| 1` coalesce that silently corrupts a persisted zero volume), a dead event detector in `tickRun` that makes the "events are audio's only feed" rule (D-N02) false for the jump voice, and an unguarded iterable that contradicts the shell's own defensive shim two lines below. Every finding below was confirmed by running the actual code, not by inspection alone.

## Critical Issues

### CR-01: `makeNoise` produces samples in [-1, 3) — 3× full-scale clipping on every trip voice

**File:** `js/audio.js:110-113`
**Issue:** The noise normalization divides a 24-bit unsigned value by `0x800000` (2²³) instead of `0x1000000` (2²⁴), yielding a ratio in `[0, 2)`; after `* 2 - 1` the samples span `[-1, 3)`. Verified by execution: 5000 samples ranged **-0.998 to +2.997**. Half of all samples exceed 1.0, and the trip voice (`noiseHit` at gain 0.4 into a lowpass) clips grossly into the master bus. The "deterministic white noise" comment pins the generator's intent to a [-1, 1) buffer — this is a wrong constant, not a style choice.
**Fix:**
```js
data[i] = ((seed >>> 8) / 0x1000000) * 2 - 1;   // >>> 8 leaves 24 bits; divide by 2^24
```

### CR-02: Zero volume is silently rewritten to 1 on save — user setting lost on reload

**File:** `js/audio.js:30` (and mirrored at `js/audio.js:19`)
**Issue:** `saveSettings` persists `volume: Number(settings.volume) || 1`. Volume 0 is a legitimate state (reachable by pressing `-` ten times), but `0 || 1` evaluates to 1, so the write corrupts the value on its way to storage. Verified: `Number(0) || 1 === 1`. On reload, `loadSettings` (line 19, same `|| 1` pattern) restores full volume even if storage held a 0 from another code path. Notably `setVolume` itself (line 177) correctly preserves 0 with `|| 0` — the persistence seam disagrees with the setter, so the in-memory state is right and the persisted state is wrong. This violates the project's own "invalid input is coerced, not rejected" rule by coercing a *valid* value away.
**Fix:**
```js
// saveSettings
const vol = Number(settings.volume);
volume: Number.isFinite(vol) ? Math.min(1, Math.max(0, vol)) : 1,
// loadSettings — same pattern:
const vol = Number(s.volume);
return { muted: s.muted === true, volume: Number.isFinite(vol) ? Math.min(1, Math.max(0, vol)) : 1 };
```

## Warnings

### WR-01: `tickRun`'s `'jump'` event detector is unreachable in the real flow; jump audio bypasses the "single channel" (D-N02) it claims to feed

**File:** `js/game.js:53`, `js/shell.js:139`
**Issue:** Line 53 (`if (player.grounded && !nextPlayer.grounded)`) can only fire on a state (`grounded: true` with live upward `vy`) that `jump()` (js/player.js:9-11) never produces — `jump` sets `grounded: false` immediately, and `updatePlayer`'s landing sets `vy = 0` and `grounded = true` together. Simulated the real shell flow (release → `jump()` → `tickRun` on the same iteration) for 400 steps: the emitted event set is `['skip', 'trip']` — **never** `'jump'`. `tests/feel.test.js:97-103` masks this by hand-crafting the impossible state `{ ...createPlayer(), vy: 600 }`, and `tests/audio.test.js:407` explicitly asserts the jump voice arrives via the *shell-side direct call* — contradicting `js/shell.js:242` ("sim events are audio's only feed"). Consequences today: dead code + an architectural rule violation; latent consequence: if `jump()`'s grounded semantics ever change, every jump double-plays the voice (direct call + channel).
**Fix:** Pick one channel. Either drop the shell-side call and make the detector reachable (have `jump()` keep `grounded: true, vy > 0` and let `updatePlayer` perform the airborne transition), or delete `js/game.js:53` and the synthetic test, and document the release-call as the jump voice's canonical site.

### WR-02: Unguarded `out.events` iteration at js/shell.js:243 contradicts the defensive shim at line 250 and permanently kills the rAF loop for a channel-less build

**File:** `js/shell.js:243` vs `js/shell.js:250`
**Issue:** Line 243 (`for (const ev of out.events) audio.handleEvent(ev)`) iterates without a guard, while line 250 (`out.events ?? (out.tripped ? ['trip'] : [])`) explicitly anticipates a "channel-less sim build". Verified: iterating `undefined` throws `TypeError: out.events is not iterable`. The throw escapes `frame()` — the `try`/`catch` only wraps `scene.render` (lines 270-274) — so the trailing `requestAnimationFrame(frame)` at line 275 never executes and the game freezes forever on the first eventful tick. Any throw from `consumeIntents`/`tickRun` has the same loop-killing effect.
**Fix:**
```js
if (audio) for (const ev of (out.events ?? [])) audio.handleEvent(ev);
```
and make the loop crash-resistant:
```js
try {
  requestAnimationFrame(frame);
} catch { /* unreachable */ }
// or simply schedule rAF FIRST:
requestAnimationFrame(frame);
// ...then the existing frame body (wrapped or not) can no longer strand the loop.
```

### WR-03: Key auto-repeat on Mute/Minus/Equal — held key flaps mute and hammers localStorage

**File:** `js/shell.js:105-107`
**Issue:** The Space branch guards with `if (!e.repeat)`, but the three audio branches do not. Holding the mute key toggles mute every repeat event (~30/s once OS repeat engages), producing an audio strobe and a `saveSettings` → `localStorage.setItem` write-through per repeat (audio.js:169 explicitly declines to debounce). Same for `-`/`=`: volume sweeps and serializes synchronously at repeat rate.
**Fix:**
```js
if (e.repeat) return; // after the three audio short-circuits' e.preventDefault(), or per-branch:
if (e.code === 'Mute') { e.preventDefault(); if (audio && !e.repeat) audio.toggleMute(); return; }
```

### WR-04: `playTrack` guard is set asynchronously — concurrent calls double-play the music loop

**File:** `js/audio.js:76-99`
**Issue:** The `trackPlaying` / `trackMissing` guards that prevent the "never a retry loop" violation only flip inside the async `.then` chain (line 94). Two `playTrack()` calls before the fetch resolves (it is public API on the returned object; also reachable via `gesture()` racing a manual call) both pass the guard, start two looped buffer sources through the same master, and double the track forever.
**Fix:**
```js
let trackPending = false;
function playTrack(url = TRACK_URL) {
  if (!master || !fetchFn || trackPlaying || trackMissing || trackPending) return false;
  trackPending = true;
  // ...and clear trackPending in both the .then(decoded) and .catch() arms
}
```

## Info

### IN-01: Buffer boundary is float-residue-inclusive at exactly BUFFER_SEC

**File:** `js/game.js:49,79`
**Issue:** Iterative phase-clock decay (`buffer - dt * ropeMul`) leaves a ~2.4e-17 positive residue after exactly 0.1 s, so an exactly-out-of-window press is still forgiven via `buffer > 0`. `tests/feel.test.js:61` pins this behavior knowingly, but it makes the tolerance boundary implementation-dependent rather than spec-dependent.
**Fix:** If inclusive-vs-exclusive matters to the feel spec, compare with an explicit epsilon (`buffer > 1e-9`) or track elapsed ticks instead of a decaying float, and pin that semantics in the test title.

### IN-02: Inconsistent `ropeMul` fallback between rope advance and buffer decay

**File:** `js/game.js:41` vs `js/game.js:49`
**Issue:** Line 49 defensively reads `run.effects.ropeMul ?? 1`; line 41 reads `run.effects.ropeMul` bare. Either the fallback is needed (line 41 propagates `NaN` into the phase clock without it) or it isn't — half-guarding signals uncertainty about the effects shape.
**Fix:** Drop the `?? 1` on line 49 (`freshEffects()` guarantees the field), or add it on line 41 too — one way, both lines.

### IN-03: Unhandled rejections from `ctx.resume()`

**File:** `js/audio.js:66,69`
**Issue:** `resume()` returns a promise that can reject (tab-hidden races on some browsers); both call sites discard it, producing unhandled-rejection console noise the project's conventions explicitly discourage.
**Fix:** `ctx.resume().catch(() => {});` at both sites.

### IN-04: Magic numbers inline in the particle kinematics

**File:** `js/render3d.js:435-439,443,449`
**Issue:** Gravity (`0.5 * 3 * pt * pt`), spread (`1.6 + 0.05 * k`), golden angle (`2.399`), lifetime (`0.45`), and shake decay constants (`140`, `50`, `0.55`) are inline in expressions. Project convention is named module-level constants for tunables ("morning playtest re-tunes values as a data-only diff" — currently that diff spans two files despite JUICE_TIERS claiming to be the single source of truth for juice magnitudes).
**Fix:** Hoist to named `const PARTICLE_GRAVITY = 3; const PARTICLE_LIFE = 0.45; const SHAKE_DECAY_MS = 50;` etc. at the top of `render3d.js`.

---

_Reviewed: 2026-10-22_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
