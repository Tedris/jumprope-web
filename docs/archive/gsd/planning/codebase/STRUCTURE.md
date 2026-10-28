---
last_mapped_commit: 838983f2419d6a82c5167acf9b351994fe9cfa7a
last_mapped_at: 2026-10-15
---
# Codebase Structure

**Analysis Date:** 2026-10-15

## Directory Layout

```
jumprope-web/
├── index.html            # Single-page host: canvas + module script tag
├── package.json          # Minimal manifest: name, private, "type": "module"
├── css/
│   └── style.css         # Page centering + canvas sizing (10 lines)
├── js/                   # Application source (plain ES modules, no build)
│   ├── game.js           # Entry point: run orchestration + rAF shell + canvas draw
│   ├── player.js         # Player physics: jump, gravity, squash spring
│   ├── rope.js           # Rope phase clock + geometry (atFeet, obstacleX)
│   └── upgrades.js       # Upgrade catalogue + effects multipliers + offer logic
├── tests/                # node:test unit tests, one file per js/ module
│   ├── game.test.js
│   ├── player.test.js
│   ├── rope.test.js
│   └── upgrades.test.js
├── docs/
│   └── superpowers/
│       ├── plans/        # Implementation plans (dated: 2026-09-30-jumprope-roguelike.md)
│       └── specs/        # Design specs (dated: 2026-09-30-jumprope-roguelike-design.md)
└── .planning/            # GSD planning artifacts (not app code)
```

There is **no** `node_modules`, no lockfile, no bundler config, no linter config, no CI config. The app is dependency-free.

## Directory Purposes

**`js/`:**
- Purpose: All application logic. Served directly to the browser as native ES modules.
- Contains: 4 small modules (17–240 lines each), functions only — no classes.
- Key files: `js/game.js` (entry + orchestration), `js/rope.js`, `js/player.js`, `js/upgrades.js`.

**`tests/`:**
- Purpose: Unit tests for every `js/` module using Node's built-in test runner.
- Contains: 4 test files mirroring `js/` filenames with `.test.js` suffix.
- Key files: `tests/game.test.js`, `tests/player.test.js`, `tests/rope.test.js`, `tests/upgrades.test.js`.

**`css/`:**
- Purpose: Minimal page chrome (dark background, centered pixel-scaled canvas). All in-game visuals are drawn on the canvas in `js/game.js` `draw()`, not CSS.
- Key files: `css/style.css`.

**`docs/superpowers/`:**
- Purpose: Design spec and implementation plan that define intended game behavior.
- Key files: `docs/superpowers/specs/2026-09-30-jumprope-roguelike-design.md`, `docs/superpowers/plans/2026-09-30-jumprope-roguelike.md`.

## Key File Locations

**Entry Points:**
- `index.html`: Only HTML page; loads `css/style.css` and `js/game.js` as a module.
- `js/game.js`: Auto-bootstraps via `startGame(document.getElementById('game'))` guarded by `typeof document !== 'undefined'` (lines 238–240).

**Configuration:**
- `package.json`: `"type": "module"` only — enables `node --test` on ESM imports. No scripts, no dependencies.
- Runtime tuning constants live inline in `js/game.js:53–55` (`W = 480`, `H = 640`, `STEP = 1/120`) and as magic numbers in `tickRun` (gravity base `1800`, clearance base `18`).

**Core Logic:**
- `js/game.js` lines 5–51: Pure run orchestration (`createRun`, `tickRun`, `applyUpgrade`, `loadBest`, `saveBest`) — this is the section tests import.
- `js/game.js` lines 57–236: `startGame` imperative shell (loop, input, draw) — not unit-tested.
- `js/rope.js`, `js/player.js`, `js/upgrades.js`: Focused single-concern physics/rules modules.

**Testing:**
- `tests/*.test.js`: Run with `node --test tests/` from repo root (no npm script defined).

## Naming Conventions

**Files:**
- kebab-case, lowercase: `game.js`, `index.html`, `style.css`.
- Tests: `<module>.test.js` matching the source filename exactly (`rope.js` → `tests/rope.test.js`).
- Planning docs: `YYYY-MM-DD-<topic>.md` under `docs/superpowers/{plans,specs}/`.

**Functions:**
- `camelCase` for all functions (`createRope`, `updatePlayer`, `pickTwo`, `shouldOfferUpgrade`).
- Factory prefix `create*` for state constructors; transition prefix `update*` / `apply*` for pure state transforms; bare verbs or `*Mul`-returning predicates elsewhere.

**Variables / state:**
- `camelCase` locals; uppercase constants for module-level config (`W`, `H`, `STEP`, `UPGRADES`).
- State records are plain objects with short keys: `run` (`status`, `score`, `skips`, `effects`, `offer`), `rope` (`phase`, `period`), `player` (`y`, `vy`, `grounded`, `squash`, `squashVel`), `effects` (`*Mul` suffixed multipliers).

**Upgrade ids:** short lowercase strings (`'float'`, `'slowrope'`, `'multi'`, `'window'`) — matched by `id` in tests.

## Where to Add New Code

**New game mechanic / physics module:**
- Primary code: `js/<name>.js` — export pure factory + transition functions; no DOM/browser APIs.
- Tests: `tests/<name>.test.js` using `node:test` + `node:assert/strict`.
- Wire it into the tick in `tickRun` (`js/game.js:9–31`).

**New upgrade:**
- Add an entry to `UPGRADES` in `js/upgrades.js:1–10` with `{ id, name, desc, apply }`; if it needs a new multiplier, extend `freshEffects()` (line 12–14) and consume the multiplier in `tickRun` where the relevant constant is applied.
- Test stacking behavior in `tests/upgrades.test.js`.

**New UI / rendering (HUD, screens):**
- Inside `draw()` in `js/game.js:113–222`, keyed off `run.status`. There is no DOM UI layer — keep visuals on the canvas.

**New input handling:**
- Inside `startGame` (`js/game.js:57–111`) — add listeners next to lines 96–99 and route through `press()`/`release()` so pointer and keyboard stay equivalent.

**Utilities:**
- No `js/utils.js` exists; single-use helpers stay in their module. Only extract a shared module if two `js/` files need it.

## Special Directories

**`.planning/`:**
- Purpose: GSD planning state and codebase maps (this directory).
- Generated: Yes (by GSD tooling)
- Committed: Yes (git-tracked)

**`docs/superpowers/`:**
- Purpose: Human/agent-authored design specs and implementation plans, dated.
- Generated: No (authored via superpowers workflow)
- Committed: Yes

**`.superpowers/`:**
- Purpose: Superpowers sdd runtime artifacts.
- Generated: Yes
- Committed: Yes (present in repo)

**`node_modules/`:**
- Does not exist — the project has zero runtime/dev dependencies.

---

*Structure analysis: 2026-10-15*
