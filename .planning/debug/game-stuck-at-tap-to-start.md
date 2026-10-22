---
status: diagnosed
trigger: "The game just says tap to start and tapping does not appear to do anything"
created: 2026-10-15T00:00:00Z
updated: 2026-10-15T21:20:00Z
---

## Current Focus

hypothesis: CONFIRMED — createScene() returns the render function itself, shell.js calls scene.render(...) → TypeError on first rAF frame kills the loop after idle HUD text is set; input intents never consumed.
test: headless chromium reproduction against local http.server — DONE, exact console error observed
expecting: n/a — confirmed
next_action: "report diagnosis (find_root_cause_only mode — no fix applied)"

## Symptoms

expected: Serve repo, open index.html. Play one full run idle → running → choose → over; jump with space/tap. WebGL flat-box scene renders; HUD shows score/best/status; run restarts cleanly. Both three.module.js and three.core.js 200 via pinned importmap.
actual: "The game just says tap to start and tapping does not appear to do anything"
errors: none reported by user; reproduction shows console "Uncaught TypeError: scene.render is not a function" at js/shell.js:103
reproduction: Serve repo with python3 -m http.server, open index.html, tap/click/space on the idle screen
started: Discovered during UAT of Phase 01, 2026-10-15

## Eliminated

- hypothesis: three r186 API removal/renaming (WebGLRenderer/Scene/Color/Cameras/Geometries/Materials) throws at createScene or render
  evidence: all APIs used are exported from three@0.186.1 build (grep of export lists); error is not from three internals but "scene.render is not a function" thrown at shell.js:103 — a plain JS member-access TypeError on the value returned by createScene.
  timestamp: 2026-10-15T21:18:00Z
- hypothesis: CDN/importmap load failure (three.module.js / three.core.js 404)
  evidence: curl shows both files 200 from cdn.jsdelivr.net; module graph evaluated (idle HUD text renders, which requires frame() to have run).
  timestamp: 2026-10-15T21:14:00Z
- hypothesis: HUD div intercepts pointer events so taps never reach canvas
  evidence: css/style.css #hud has pointer-events: none; keyboard space binds on window regardless. With a live rAF loop the idle→running transition in consumeIntents() is correct (verified by reading logic).
  timestamp: 2026-10-15T21:16:00Z

## Evidence

- timestamp: 2026-10-15T21:14:00Z
  checked: index.html, js/shell.js, js/render3d.js, js/game.js, css/style.css, rope/player/interpolate modules
  found: idle prompt is set ONLY by updateHud() inside frame() (shell.js:102), which runs BEFORE scene.render() (shell.js:103) and BEFORE requestAnimationFrame(frame) re-registration (shell.js:104).
  implication: if scene.render throws on the first frame, idle text is on screen, the rAF loop dies, event listeners remain bound but pressIntent/releaseIntent are never consumed → "stuck at tap to start, tapping does nothing." Exactly the reported symptom.

- timestamp: 2026-10-15T21:15:00Z
  checked: curl of https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js + three.core.js; grep of export lists
  found: both 200; WebGLRenderer, Scene, Color, PerspectiveCamera, PlaneGeometry, MeshBasicMaterial, BoxGeometry, Mesh all exported; three.module.js imports './three.core.js' relatively.
  implication: no load failure and no removed-API explanation; three side is healthy.

- timestamp: 2026-10-15T21:18:00Z
  checked: headless chromium (playwright chrome-headless-shell) against python3 -m http.server :8123 serving the repo
  found: console → `Uncaught TypeError: scene.render is not a function, source: http://localhost:8123/js/shell.js (103)`
  implication: DIRECT reproduction of the runtime error killing the frame loop.

- timestamp: 2026-10-15T21:19:00Z
  checked: js/render3d.js:42 vs js/shell.js:13,103; grep for all createScene call sites and tests
  found: render3d.js createScene returns `function render(view)` (the function itself); shell.js does `const scene = createScene(canvas)` then calls `scene.render({...})` — a function object has no `.render` property. Single call site; no test exercises the createScene return contract.
  implication: integration contract mismatch between shell.js and render3d.js — root cause. Environment- and three-version-independent.

## Resolution

root_cause: js/render3d.js `createScene()` returns the render closure directly (`return function render(view) {...}`), but js/shell.js:103 invokes it as `scene.render({...})`. On the first animation frame — AFTER updateHud() writes the "press space / tap to start" prompt (shell.js:102) but BEFORE requestAnimationFrame is re-armed (shell.js:104) — `scene.render is not a function` throws, permanently killing the rAF loop. Listeners still set pressIntent/releaseIntent, but consumeIntents() never runs again, so taps/space appear dead while idle text sits frozen on screen.
fix: (NOT APPLIED — find_root_cause_only mode) align the contract: either call the returned function directly (`scene({ run, rope, player, prevPhase, alpha, best })` at shell.js:103), or have createScene return an object `{ render(view) {...} }`.
verification:
files_changed: []
