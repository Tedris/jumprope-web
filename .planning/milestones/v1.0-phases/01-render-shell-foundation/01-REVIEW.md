---
phase: 01-render-shell-foundation
reviewed: 2026-10-15T21:30:00Z
depth: deep
files_reviewed: 9
files_reviewed_list:
  - js/game.js
  - js/shell.js
  - js/render3d.js
  - js/interpolate.js
  - index.html
  - css/style.css
  - tests/boundary.test.js
  - tests/interpolate.test.js
  - tests/startrun.test.js
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-10-15T21:30Z
**Depth:** deep (per-file analysis + cross-module call-chain tracing + adversarial probe of the fence tests)
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 01 split (pure sim `game.js` / impure shell `shell.js` / sole-three `render3d.js`) is structurally sound: suite green at 36/36, the four frozen test files byte-identical, `package.json` untouched. Call-chain tracing confirmed:

- **Accumulator/interpolation wiring is correct.** `prevPhase` is captured immediately before each `tickRun` inside the step loop (`shell.js:90`), `alpha = acc/STEP` is taken after the loop with `acc < STEP` guaranteed (`shell.js:87–103`), frozen states set `prev = curr` (`shell.js:98`), and the 0.25 s spiral clamp is intact. Edge transitions (idle→running→choose→over) were traced: no double-scoring on the frozen-choose feet window (`wasFeet`/`isFeet` edge detection in `game.js:25–27` holds across the freeze/resume), and no interpolation discontinuity at `startRun` (prevPhase is re-synchronized to 0.33 in the same substep).
- **Threat mitigations verified present:** T-01-01 (single pinned importmap in `index.html:9–15`, SRI deferral comment line 8), T-01-02 (`textContent` only in `shell.js:68,69,80`; zero `innerHTML` in the tree), T-01-03 (`Number(...) || 0` coercion `game.js:50`), T-01-06/07 (boundary walk + determinism pins).
- **Boundary fence teeth were empirically tested**, not just read: the static/dynamic `'three'` injection turns the suite red as claimed, but three false-negative vectors were found in the textual detectors — two of which are **not** covered by the plans' acknowledged static-analysis caveats (see WR-01/WR-02). The product code itself showed no BLOCKER-level defect.

Key concerns are concentrated in the fence tests' regex completeness (the phase's stated "permanent mechanical enforcement" is weaker than its design claims) and one input-state cleanup asymmetry in the shell.

## Critical Issues

None. (No security holes, data-loss paths, or provable product-code crashes found; all probes against `shell.js`/`game.js`/`render3d.js`/`interpolate.js` traced clean on the checked edge cases.)

## Warnings

### WR-01: Boundary fence's `Math.random` detector misses bracket-notation access — empirically confirmed slip-through

**File:** `tests/boundary.test.js:75`
**Issue:** The detect regex `/Math[.]random/` requires literal dot syntax. Adversarial probe run during this review: appending `const inlineDebt = Math['random'];` to `js/rope.js` left `node --test tests/boundary.test.js` **green (exit 0)**. The ARCH-02 fence's entire design premise (plan 01-02: "Math.random in ANY form … outside the tickRun default-parameter line fails the test") does not hold for `Math['random']` / `Math["random"]`. Unlike the plans' explicitly-accepted "runtime-synthesized specifier" gap, bracket notation was never surfaced as a known limitation — 01-02-SUMMARY even claims "the exact debt form … cannot slip past".
**Fix:**
```js
if (/Math\s*(?:\[ ['"]random ['"] \]|\.random)/.test(line) && ...)
// simplest robust form:
const RN_RE = /Math\s*\.\s*random|Math\s*\[\s*['"]random['"]\s*\]/;
if (RN_RE.test(line) && !/rng\s*=\s*Math\.random/.test(line)) { offenders.push(...); }
```
Extend the adversarial tooth-check in the plan verify to include a bracket-form injection.

### WR-02: The dual-init debt grep `phase:\s*0[.]33` is bypassed by `phase: .33` — empirically confirmed slip-through

**File:** `tests/boundary.test.js:62` (and the equivalent plan-01-01 gate `git grep -n "0[.]33"`)
**Issue:** Probe run during this review: appending `export const leadIn = { phase: .33 };` to `js/rope.js` left the boundary suite **green (exit 0)** — a future edit reintroducing the dual rope-init value in the equally-valid `.33` literal form evades both the permanent test and the plan's one-shot grep (which shares the leading-zero requirement). The debt this fence exists to keep dead can silently reappear.
**Fix:**
```js
if (/phase\s*:\s*0*\.33\b/.test(src)) offenders.push(name);
// or, stronger, ban the bare value in any phase-assignment context:
if (/\b0*\.33\b/.test(src) && !/START_PHASE\s*=/.test(line)) ...
```

### WR-03: Browser-IO isolation gate covers only 5 literal names — other browser globals pass silently

**File:** `tests/boundary.test.js:13` (`BROWSER_IO_RE`), test at lines 103–113
**Issue:** The gate's stated goal is "only `js/shell.js` touches wall-clock time / DOM / storage" (plan 01-02 must-have 4), but the pattern list is exactly `performance.now|Date.now|requestAnimationFrame|localStorage|\bdocument\b`. A `window.matchMedia(...)`, `navigator.onLine`, `setTimeout(...)`, `indexedDB.open(...)`, `new Date().now()`-adjacent use of `new Date(...)`, or canvas access via a passed reference in `js/game.js` would keep the suite green while breaking the ARCH-01 purity invariant. `render3d.js` currently correctly avoids these, but the fence can't tell if a future edit adds them. (Secondary: `\bdocument\b` also fires on prose comments — false-positive noise in the opposite direction.)
**Fix:** broaden the pattern at least to the plan's own prohibition set plus the obvious additions:
```js
const BROWSER_IO_RE = /performance[.]now|Date\b|requestAnimationFrame|localStorage|sessionStorage|\bdocument\b|\bwindow\b|navigator|setTimeout|setInterval|indexedDB|fetch\s*\(/;
```
shell.js is already the single skip-listed file, so the extra names cost nothing to allow.

### WR-04: `holdFrom` is never cleared on the choose/over release branches — stale-input state leak

**File:** `js/shell.js:52–64`
**Issue:** When a release resolves in the `choose` branch (line 56) or the `over` branch (line 58), `holdFrom` keeps its old press timestamp — it is nulled only on the `running`→jump path (line 55). Trace: player is mid-hold when skip #10 freezes the run into `choose`; the keyup applies the upgrade and returns to `running` with `holdFrom` still set from the pre-upgrade press. Today the misfire is only *latent* — any subsequent press in `running` overwrites `holdFrom` (line 46) before a release can use it — so no currently-reachable spurious jump was proven. But it is a cross-transition state leak in exactly the "hold across state transitions" surface this phase introduced, and one added input path (e.g. a press handler that starts consuming in `choose`/`over`) converts it into a full-max 0.5 s charged jump out of nowhere.
**Fix:**
```js
if (releaseIntent) {
  if (run.status === 'running' && holdFrom !== null) {
    player = jump(player, (performance.now() - holdFrom) / 1000);
  } else if (run.status === 'choose' && run.offer) {
    run = applyUpgrade(run, run.offer[0]);
  } else if (run.status === 'over') { ... }
  holdFrom = null;   // clear unconditionally
  releaseIntent = false;
}
```

## Info

### IN-01: `three`-offender filter can flag URL/aliased specifiers only via Node loader crash, not by design

**File:** `tests/boundary.test.js:54`
**Issue:** `n.split(/[:\s]/)[0].startsWith('three')` — a `https://…three.module.js` direct-URL import or an importmap-aliased specifier splits to `https`/`t3` and matches nothing; the injected specifier is recorded in `bare` but never listed as an offender. The probe confirmed the suite still fails on an https import, but via `ERR_UNSUPPORTED_ESM_URL_SCHEME` from the deferred `import('../js/game.js')` (test 4 crash), not via the walk's `deepEqual` offender diagnostic the design intends.
**Fix:** also flag any recorded bare specifier containing `three` anywhere in the string, e.g. `const offenders = [...bare].filter(n => /(^|[\s/])three[.\/@:]/.test(n) || n.includes('three'));` — over-flagging is harmless here.

### IN-02: Space keydown is globally preventDefault'd

**File:** `js/shell.js:40`
**Issue:** `e.preventDefault()` fires for every Space keydown at window level regardless of focus target or state. Harmless on today's controls-free page, but it will suppress Space activation of any future focused button/checkbox (upgrade card UI, Phase 4) and blocks Space-as-paste in future text inputs.
**Fix:** scope it — `if (e.target === document.body || e.target === canvas) e.preventDefault();` or only prevent when `run.status` consumes the press.

### IN-03: Best-score save duplicated at the trip site and the restart site

**File:** `js/shell.js:93–96` and `js/shell.js:59–60`
**Issue:** `best = Math.max(best, run.score); saveBest(localStorage, best)` executes twice per death cycle — once on `out.tripped` in the step loop and again on the `over` release. Functionally idempotent, but duplicated logic that will silently diverge if either site gains a condition (e.g. a "save only if new best" guard added to one).
**Fix:** extract `const commitBest = () => { best = Math.max(best, run.score); saveBest(localStorage, best); };` and call it from both sites (the trip site alone is sufficient for persistence; the restart site could drop it).

### IN-04: `startGame` has no teardown — listeners and rAF loop are un-cancellable

**File:** `js/shell.js:38–41, 104, 106`
**Issue:** `startGame` registers 4 listeners and a self-perpetuating rAF chain, returns nothing, and is exported. A second call (future restart-from-test-harness, hot-reload, or canvas swap) would double-step the sim and double-fire intents. Safe today only because the single call site at line 110 runs exactly once.
**Fix:** return `{ stop() { …removeEventListener×4; cancelAnimationFrame(rafId)… } }` from `startGame`, or at minimum document the single-invocation contract near the export.

### IN-05: First-frame `dt` can be marginally negative; negative `acc` is never clamped

**File:** `js/shell.js:28, 84–86`
**Issue:** `last = performance.now()` at registration vs the rAF callback's timestamp (shared clock, but the timestamp is the frame's vsync start, which can predate registration by <1 ms) can yield a small negative first `dt`, so `acc` can go slightly negative (the clamp at line 86 is one-sided) and `alpha = acc / STEP` (`shell.js:103`) can be momentarily < 0 — `lerpPhase` then extrapolates one step *backwards*. Sub-millisecond and self-correcting; cosmetic only.
**Fix:** `if (now < last) now = last;` at the top of `frame`, or clamp `alpha` with `Math.min(Math.max(acc / STEP, 0), 1)`.

---

_Reviewed: 2026-10-15T21:30Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
