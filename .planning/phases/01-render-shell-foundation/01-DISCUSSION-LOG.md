# Phase 1: Render-Shell Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-15
**Phase:** 1-Render-Shell Foundation
**Areas discussed:** Code split & file layout

---

## Area selection (gray areas presented)

| Option | Description | Selected |
|--------|-------------|----------|
| Code split & file layout | New file names for sim vs WebGL shell; fate of Canvas 2D draw code | ✓ |
| Clock & interpolation model | What "one clock" means; prev/curr + alpha handoff; input timing | |
| Three.js delivery | CDN URL to pin in importmap vs vendored file; fallback | |
| Placeholder scene & HUD text | Flat-box contents; how text UI is drawn in WebGL shell | |

**User's choice:** Code split & file layout only.
**Notes:** User then chose "Done — write context" at the continue check, leaving the other three areas to researcher/planner discretion.

---

## Code split & file layout

### Q1: How should the code be split so tests import unchanged and only the render layer touches `three`?

| Option | Description | Selected |
|--------|-------------|----------|
| game.js stays pure + shell.js + render3d.js (Recommended) | game.js keeps pure run-orchestration exports; js/shell.js holds startGame/input/rAF; js/render3d.js is sole `three` importer; index.html loads shell.js | ✓ |
| New sim.js core, game.js re-exports | Pure exports re-exported from game.js, logic in new files; extra indirection | |
| Keep game.js as shell, extract nothing yet | index.html loads new entry; game.js keeps sim + non-three shell code; tangled | |

**User's choice:** game.js stays pure + shell.js + render3d.js.
**Notes:** None.

### Q2: What happens to the existing Canvas 2D drawing code once the WebGL shell renders the game?

| Option | Description | Selected |
|--------|-------------|----------|
| Delete it (Recommended) | One render path; old code in git history | ✓ |
| Keep as WebGL-failure fallback | Hidden 2D fallback path; maintenance cost from day one | |
| Render both simultaneously | Contradicts "shell renders via Three.js" unless toggleable | |

**User's choice:** Delete it.
**Notes:** None.

### Q3: How strict should the grep-boundary test (ARCH-01 enforcement) be?

| Option | Description | Selected |
|--------|-------------|----------|
| Import-graph walk from test entry points (Recommended) | New tests/boundary.test.js transitively resolves imports from test-imported modules; fails if `three` appears | ✓ |
| Flat grep of sim file list | Assert named sim files contain no `three` import; new files could slip through | |

**User's choice:** Import-graph walk from test entry points.
**Notes:** None.

## the agent's Discretion

- Clock & interpolation model (deferred by user to researcher/planner)
- Three.js delivery mechanics (CDN host vs vendored; researcher to verify)
- Placeholder scene content and HUD text presentation (planner's call)
- Renderer API shape and exact file naming beyond shell.js/render3d.js

## Deferred Ideas

None — discussion stayed within phase scope.
