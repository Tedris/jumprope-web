# Phase 1: Render-Shell Foundation - Context

**Gathered:** 2026-10-15
**Status:** Ready for planning

<domain>
## Phase Boundary

The game plays a full run (idle → running → choose → over) end-to-end through a Three.js WebGL shell rendering placeholder flat-box geometry, while the simulation core stays pure, framework-free, and Node-testable (`node --test tests/` green, test files unchanged). One canonical clock (fixed-timestep accumulator + prev/curr interpolation off `rope.phase`), one single run start/reset code path, and all sim randomness through an injected `rng`. No PS1 look, no real cards, no audio — those are later phases.

Requirements: ARCH-01 (pure core / shell owns the only `three` import), ARCH-02 (single reset path, injected rng — kill dual `phase: 0.33` init and inline `Math.random` in `tickRun`).

</domain>

<decisions>
## Implementation Decisions

### Code split & file layout
- **D-01:** Three-file split around the existing boundary: `js/game.js` keeps ONLY the pure run-orchestration exports (`createRun`, `tickRun`, `applyUpgrade`, `loadBest`, `saveBest`) so existing tests import it unchanged; new `js/shell.js` holds the impure browser shell (`startGame`, input wiring, rAF/accumulator loop, storage calls, browser bootstrap guard); new `js/render3d.js` holds the Three.js scene/renderer and is the **sole** module importing `three`. `index.html` loads `shell.js` instead of `game.js`. — **Reversibility:** costly — undoing re-tangles sim and render and would force test-import churn again.
- **D-02:** The Canvas 2D `draw()` implementation is **deleted**, not kept as a fallback. One render path only; old code lives in git history.
- **D-03:** The ARCH-01 boundary test is an **import-graph walk** in a new `tests/boundary.test.js`: starting from every test-imported entry point (`game.js`, `rope.js`, `player.js`, `upgrades.js`), transitively resolve relative imports and fail if any module in that graph references `three`. `shell.js`/`render3d.js` are outside the graph by construction. New test file allowed — existing test files stay untouched.

### Open technical decisions (researcher/planner domain — not user-decided)
- **Clock & interpolation model:** how prev/curr sim states and the step-alpha are handed to the renderer, and how input hold-timing (`performance.now()` in press/release) reconciles with the single clock — researcher to propose; success criterion is only "visuals never drift from scoring under load". Note STATE.md concern: verify whether interpolation is actually needed (120→60 Hz stutter) during Phase 1 UAT.
- **Three.js delivery:** importmap pinning of `three@0.186.1` (CDN host choice / vendored fallback) — researcher to verify the exact working importmap + module-resolution setup in a no-build, static-file context.
- **Placeholder scene content & HUD text:** what the flat-box scene contains and how score/status/card-offer text is presented in the WebGL shell (DOM overlay vs 2D overlay canvas vs in-scene) — planner's call, standard approaches welcome; must not reintroduce a second render path that competes with `render3d.js`.

### the agent's Discretion
- Renderer API shape (factory `create*`/plain functions per repo conventions vs anything else), file naming within the split beyond `shell.js`/`render3d.js`, and exact test layout for the boundary test.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project direction
- `.planning/PROJECT.md` — constraints (Three.js CDN render-only, pure core, static delivery) and Key Decisions table
- `.planning/REQUIREMENTS.md` — ARCH-01, ARCH-02 definitions (the only requirements this phase maps to)
- `.planning/ROADMAP.md` §Phase 1 — the four success criteria this phase is verified against

### Existing architecture (brownfield baseline)
- `.planning/codebase/ARCHITECTURE.md` — pure-core/imperative-shell layering, purity invariant, DAG import rule
- `.planning/codebase/CONVENTIONS.md` — factory/`update*`/predicate naming, immutability-via-spread, DI-for-rng pattern to extend
- `js/game.js` — current mixed module: pure exports at top (lines 1–51), `startGame` shell below; the two debt smells are the dual `phase: 0.33` init (lines 74, 90) and inline `Math.random` at line 23
- `tests/` — must pass unchanged; defines the API surface that must remain import-compatible

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pickTwo(upgrades, rng)` (`js/upgrades.js`) — DI-for-randomness already established; `tickRun` just needs the same injection at its call site (`js/game.js:23`)
- `loadBest(storage)` / `saveBest(storage, score)` — storage-injection pattern to carry into `shell.js` unchanged
- `startGame`'s fixed-timestep accumulator with 0.25 s clamp (`js/game.js:224–234`) — the clock skeleton the shell keeps; only the canonical-single-source and prev/curr capture parts are new

### Established Patterns
- Pure `create*`/`update*`/predicate modules returning new state objects, never mutating — `render3d.js` must read state only, never feed back into sim (PROJECT.md constraint)
- Named exports only; relative imports with `.js` extension; `typeof document !== 'undefined'` bootstrap guard moves from `game.js` to `shell.js`
- No build step, zero npm deps — `three` arrives only via importmap URL; `package.json` stays dependency-free

### Integration Points
- `index.html` — swap module src from `js/game.js` to `js/shell.js`, add the importmap for `three`
- `js/shell.js` → imports `game.js` (sim) and `render3d.js` (render); the only place DOM, `performance.now()`, rAF, and `localStorage` live
- `js/render3d.js` → sole `three` importer; receives sim state snapshots per frame

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above. Placeholder flat-box scene is explicitly acceptable ("placeholder flat-box scene is fine" — ROADMAP criterion 1).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (PS1 look → Phase 2; real card choice → Phase 3; audio → Phase 4; pause/resize → Phase 5.)

</deferred>

---

*Phase: 01-render-shell-foundation*
*Context gathered: 2026-10-15*
