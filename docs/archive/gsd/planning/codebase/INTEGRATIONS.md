---
last_mapped_commit: 838983f2419d6a82c5167acf9b351994fe9cfa7a
last_mapped_at: 2026-10-15
---
# External Integrations

**Analysis Date:** 2026-10-15

## APIs & External Services

**None.** The application makes no network requests — no `fetch`, `XMLHttpRequest`, `WebSocket`, or third-party SDK imports anywhere in `js/`. It is a fully offline, client-side game.

## Data Storage

**Databases:**
- None.

**File Storage:**
- Local filesystem only (source assets; nothing generated at runtime).

**Persistent Client State (localStorage):**
- `localStorage` key `jumprope-best` — stores the best score as a string
  - Written/read via `loadBest(storage)` / `saveBest(storage, score)` in `js/game.js:37-51`
  - Called from `js/game.js:66` (load on boot), `js/game.js:89` (on restart after game-over), `js/game.js:109` (on trip)
  - Storage is injected as a parameter (testable with a fake); failures are swallowed so the game degrades to session-only scores
  - Note: tests in `tests/game.test.js` import these helpers, so the storage interface (getItem/setItem) is the de-facto persistence contract.

**Caching:**
- None.

## Authentication & Identity

**Auth Provider:**
- None — no auth, no user accounts, anonymous single-player only.

## Monitoring & Observability

**Error Tracking:**
- None. Errors from storage access are silently caught (`js/game.js:40`, `js/game.js:48`).

**Logs:**
- None — no `console.*` calls in application code.

## CI/CD & Deployment

**Hosting:**
- Not configured in-repo. Target is any static file host (see STACK.md); no deploy config, Dockerfile, or IaC present.

**CI Pipeline:**
- None — no `.github/workflows/`, no CI config files.

## Environment Configuration

**Required env vars:**
- None.

**Secrets location:**
- N/A — no secrets exist. No `.env` files present.

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- None.

## Browser Platform Surfaces (not third-party, but external to app logic)

- **Canvas 2D** — all rendering (`js/game.js:113-222`)
- **requestAnimationFrame / performance.now()** — frame loop and jump-hold timing (`js/game.js:68`, `js/game.js:82`, `js/game.js:224-235`)
- **Pointer + Keyboard events** — input (`js/game.js:96-99`); `js/game.js:238` guards `typeof document !== 'undefined'` so modules stay importable under Node for tests.

---

*Integration audit: 2026-10-15*
