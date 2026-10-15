---
last_mapped_commit: 838983f2419d6a82c5167acf9b351994fe9cfa7a
last_mapped_at: 2026-10-15
---
# Technology Stack

**Analysis Date:** 2026-10-15

## Languages

**Primary:**
- JavaScript (ES Modules, `type: "module"`) — all application code in `js/*.js` and tests in `tests/*.js`
- HTML5 — single page entry `index.html` (13 lines, canvas-only page)
- CSS — minimal styling in `css/style.css`

**Secondary:**
- None (no TypeScript, no build languages)

## Runtime

**Environment:**
- Browser (modern evergreen browsers): ES modules via `<script type="module">`, Canvas 2D API, `requestAnimationFrame`, Pointer Events, `localStorage`
- Node.js for running tests only (detected v26.8.1 locally); the app itself never runs on Node except when tests import modules directly

**Package Manager:**
- npm — effectively unused
- `package.json` contains only `{ "name": "jumprope-web", "private": true, "type": "module" }` — no dependencies, no devDependencies, no scripts
- Lockfile: missing (no dependencies to lock)

## Frameworks

**Core:**
- None — vanilla JavaScript. Rendering uses the raw Canvas 2D API (`js/game.js:58` `canvas.getContext('2d')`); the game loop is a hand-rolled fixed-timestep `requestAnimationFrame` loop (`js/game.js:224-235`, `STEP = 1/120`).

**Testing:**
- Node.js built-in test runner (`node:test`) with `node:assert/strict` — no test framework installed
- Run with: `node --test tests/`

**Build/Dev:**
- None. No bundler, no transpiler, no minifier. Source is served directly (any static file server works, e.g. `npx serve .` or `python3 -m http.server`).

## Key Dependencies

**Critical:**
- None — zero runtime npm dependencies by design.

**Infrastructure:**
- None. All platform features are browser built-ins: `CanvasRenderingContext2D`, `requestAnimationFrame`, `performance.now()`, `localStorage`, Pointer/Keyboard Events.

## Configuration

**Environment:**
- No environment variables; no `.env` files present.
- All tunables are inline constants in source: canvas size `W=480, H=640`, physics step `STEP=1/120` (`js/game.js:53-55`), gravity `1800` (`js/player.js:15`, `js/game.js:11`), jump velocity curve (`js/player.js:6-8`), rope period `1.3s` (`js/game.js:62`).

**Build:**
- No build config files exist.

## Platform Requirements

**Development:**
- Any static HTTP server (ES modules require HTTP, not `file://`) plus a modern browser; Node.js ≥ 18 for `node --test`.

**Production:**
- Static file hosting only — the repo is deployable as-is to any static host (GitHub Pages, Netlify, etc.). No server component.

---

*Stack analysis: 2026-10-15*
