---
phase: 02-ps1-presentation-scene
reviewed: 2026-10-17T03:30:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - js/render3d.js
  - js/shell.js
  - css/style.css
  - tests/render3d.test.js
findings:
  critical: 1
  warning: 2
  info: 5
  total: 8
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-10-17T03:30:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the Phase-02 range (`5fdb83b..9994cf8` + spike commits) against the ARCH-01/02 fence, the 02-UI-SPEC design contract, and the 02-SECURITY threat register. The pipeline port is faithful to the signed-off spike (Bayer block, snap injection, sRGB-first order all verbatim), the theta ⇔ feet convention checks out analytically against `atFeet`'s 0.45–0.55 window, the running-pose path provably never reads `view.now`, and the re-run security gates all hold (no `three/addons`, no RNG/clock in `render3d.js`, zero `new THREE` inside `render()`, `textContent`-only DOM sinks, `index.html` byte-untouched). Suite: 42/42 green.

Two substantive defects found: (1) the phase darkened the canvas to sky hex but left `#hud` text at `#222` — ≈1.26:1 contrast, making the score/best/prompt effectively invisible, a violation of an explicit UI-SPEC contract value the spec itself pre-flagged as "documented, visible defect rather than a silent pass"; (2) the T-02-07 mitigation claim in SECURITY.md is not fully implemented — `view.prevPhase` and `view.rope.phase` are read without coercion, which is exactly the NaN-transform path the closed threat claims is mitigated. Five lower-severity items cover a stub-coverage gap, GLSL/transition/squash-freeze subtleties, and CSS sizing rough edges.

## Critical Issues

### CR-01: HUD text is effectively invisible — `#hud { color: #222 }` over the new dark sky background

**File:** `css/style.css:18` (background introduced at `css/style.css:8`)
**Issue:** Plan 02-02 changed the canvas/page backdrop to sky hex `#2a3440` (measured relative luminance ≈ 0.033) but left `#hud` at `color: #222` (luminance ≈ 0.016) — contrast ratio ≈ **1.26:1**. The score, best, and prompt are the game's core readouts and are effectively invisible against the sky, and the sky fills ~60% of the frame per the UI-SPEC's own color model. `02-UI-SPEC.md` §Typography binds the contract value `#hud { color: #f4f0d8 }` and explicitly warns: "the checker should treat this as a documented, visible defect rather than a silent pass — it is a one-line change and the score is a core readout." The phase shipped the background half of that change and not the text half.
**Fix:**
```css
#hud {
  /* ... */
  color: #f4f0d8;   /* UI-SPEC contract value; already in palette, reserved for HUD/rope */
}
```

## Warnings

### WR-01: T-02-07 coercion mitigation is incomplete — `prevPhase` / `rope.phase` unguarded → silent NaN transforms

**File:** `js/render3d.js:300-307`
**Issue:** 02-SECURITY.md closes T-02-07 ("malformed/partial view objects → NaN transforms") with the mitigation "`??`-coercion at every view field read." That is not what the code does:
- `lerpPhase(view.prevPhase, view.rope.phase, view.alpha ?? 0)` (line 300) reads `prevPhase` and `rope.phase` with no fallback. An `undefined` there propagates through `lerpPhase` (`NaN % 1` = NaN) into `theta`/`rotation.z`/positions — a **silent** NaN transform (WebGL drops the objects; no throw, no error log), exactly the registered failure mode.
- `view.rope.phase` (line 300), `view.player.y` (line 302), `view.run.status` (line 307) dereference sub-objects that are not guarded — a partial payload throws a `TypeError`, caught by the shell's `try/catch` and the frame renders nothing, contradicting "coerce-don't-reject" as the stated mitigation.

Today the shell always supplies the full payload, so this is a hardening/claim gap rather than a live crash — but the security register asserts a guarantee the code doesn't provide, and a future payload change would break silently rather than loudly.
**Fix:**
```js
const prevPhase = view.prevPhase ?? (view.rope?.phase ?? 0);
const phase = lerpPhase(prevPhase, view.rope?.phase ?? 0, view.alpha ?? 0);
const playerY = view.player?.y ?? 0;
const squash = view.player?.squash ?? 1;
const status = view.run?.status ?? 'idle';
```
(Or amend the T-02-07 mitigation text to match what is actually implemented.)

### WR-02: Contract tests only exercise the idle pose branch — running/over paths never run in CI

**File:** `tests/render3d.test.js:110-122`
**Issue:** The single rendering contract pin passes `{ run: {}, ... }`, so `view.run.status ?? 'idle'` selects the **idle** branch only. The `running` branch (lines 336-348: theta pose, squash inverse, `airborne` tuck) and the `over` branch (lines 325-335: tripAt capture, shake formula) — plus the resize-poll path through `applyBufferSize` (needs a `canvas.width` mutation between two `render()` calls) — are never executed against the stub. A stub-surface miss on those paths (the exact failure class deviation #2 in 02-03-SUMMARY had to fix twice: `Vector3`, `Mesh.material`) would pass 42/42 in CI and throw per-frame only in the browser. Given the phase's own pattern was "add stub symbols when the path touches them," the paths that touch them aren't driven.
**Fix:** Add two renders against the same stub, plus a resize pin:
```js
scene.render({ run: { status: 'running' }, rope: { phase: 0.5 }, player: { y: 40, squash: 0.8 },
               prevPhase: 0.45, alpha: 0.5, now: 1000 });
scene.render({ run: { status: 'over' }, rope: { phase: 0.5 }, player: { y: 0, squash: 0.6 },
               prevPhase: 0.5, alpha: 0, now: 1200 });
// resize poll: mutate the canvas object between renders
stubCanvas.width = 800; stubCanvas.height = 600;
scene.render({ run: { status: 'idle' }, rope: { phase: 0.1 }, player: { y: 0 }, prevPhase: 0.1, alpha: 0, now: 0 });
```

## Info

### IN-01: Bayer matrix is evaluated transposed (GLSL column-major) — comment overstates "standard matrix"

**File:** `js/render3d.js:36-39`
**Issue:** `mat4` constructor arguments are **columns** in GLSL, and the lookup is `m[y][x]` (column `y`, row `x`). The effective per-pixel threshold matrix is the transpose of the row-major reading of the literals. A transposed Bayer 4×4 is still a statistically valid ordered-dither matrix (identical visual quality), and the code is a verbatim port of the approved spike — so the signed-off look is unaffected. But the comment "standard 4x4 ordered matrix (sign-off: A1 confirmed)" is inaccurate, and a future "correction" of the orientation would silently shift the approved dither texture.
**Fix:** Annotate the transposition explicitly (e.g. `// note: columns-as-args + m[y][x] == row-major transpose of the literals — matches the approved spike bit-for-bit; do not "fix" the orientation`).

### IN-02: Rope pivot teleports on idle→running and over→running transitions

**File:** `js/render3d.js:319` vs `:330`/`:342`
**Issue:** Idle twirl writes `ropePivot.rotation.z = now / 1400` (arbitrary angle); the first `running` frame overwrites it with `-theta` (≈ −2.07 rad at `START_PHASE = 0.33`). The rope orientation snaps in one frame at run start and again at restart-after-trip (from −π to −theta). Purely cosmetic and brief, but it lands exactly when the player is watching for the first beat — the core-value moment.
**Fix:** Acceptable to defer; a cheap polish is easing `rotation.z` toward the target over the first ~2 frames, or zeroing the twirl at `startRun` transition.

### IN-03: Squash scale is applied in every status branch but only animated while running — the game-over screen can freeze mid-squash

**File:** `js/render3d.js:304-305` (write) with `:329` (`over` branch)
**Issue:** `rig.scale.set(1/squash, squash, 1/squash)` runs unconditionally, but the squash spring only advances inside `updatePlayer` (running status). A trip typically follows a landing (`squash = 0.6` spring just triggered), so on the `over` screen the jumper can stand frozen visibly squashed (60% tall, 167% wide) — the `over` branch resets `rig.position.y` but not scale. Phase 4 owns trip juice, but the settle pose itself is this phase's.
**Fix:** In the `over` branch, decay scale toward 1 analytically from `view.now` (closed-form, matching the shake idiom), or reset `rig.scale.set(1, 1, 1)` on the `over` transition alongside the `tripAt` capture.

### IN-04: Page background remains `#1a1a2e` — foreign color vs the sky-hex contract

**File:** `css/style.css:1`
**Issue:** UI-SPEC binds "canvas background = sky hex `#2a3440` so the pre-first-frame page never flashes a foreign color." The canvas rule was updated (line 8) but `html, body` still uses the old `#1a1a2e`, which shows on overscroll bounce and while the WebGL context initializes.
**Fix:**
```css
html, body { margin: 0; height: 100%; background: #2a3440; }
```

### IN-05: Canvas sizing rough edges on mobile and scrollbars

**File:** `css/style.css:3-9`, `js/shell.js:11-13`
**Issue:** Three related nits in the new full-viewport sizing: (a) `width: 100vw` includes the classic scrollbar-inclusion artifact — harmless in the no-scrollbar case, jumpy whenever one appears; (b) the buffer tracks `innerHeight` while CSS height is `100vh`, and these diverge under mobile dynamic toolbars (iOS Safari), skewing the buffer vs display aspect between the poll's reads; (c) the canvas rule sets no `touch-action`, so on touch devices double-tap-to-zoom can coalesce rapid taps and eat one-button presses — the one input the game has.
**Fix:** `width: 100%` (or `100dvh` pairing once buffer and CSS both use the same source), and add `touch-action: manipulation;` (or `none`) to the canvas rule.

## Security Mitigation Verification (02-SECURITY.md re-screen)

Re-ran the register's automated claims against HEAD (`47ca4b3`):

| Threat | Claim | Verified |
|--------|-------|----------|
| T-02-01/06 | sole CDN origin, no addons | `js/` imports bare `three` + `./interpolate.js` only; `git grep three/addons` empty; `index.html` absent from phase diff ✓ |
| T-02-05 | resize churn clamp | poll fires `applyBufferSize` only on actual size change; `Math.max(2, …)`; pixelRatio locked ✓ |
| T-02-07 | `??` at every view read | **partial — see WR-01** |
| T-02-08 | `view.now` gated to idle/trip | reads at render3d.js:309/317/331 only; running branch reads `theta`/`playerY` exclusively ✓ |
| T-02-09 | no RNG in render path | no `Math.random`/`Date`/`performance` in `js/render3d.js` ✓ |
| T-02-10 | no per-frame geometry | zero `new THREE` in `render()` body (lines 288-363) ✓ |
| T-02-11 | view never mutated | own-property reads only, no writes to view objects ✓ |
| T-02-12 | precompile | both `renderer.compile` calls present in `createScene` (277-278) ✓ |

---

_Reviewed: 2026-10-17T03:30:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
