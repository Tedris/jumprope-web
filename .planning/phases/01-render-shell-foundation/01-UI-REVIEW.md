# Phase 01 — UI Review (render-shell-foundation)

**Audited:** 2026-10-15
**Baseline:** `01-UI-SPEC.md` (approved, checker 7/7 PASS) — retrospective static audit
**Screenshots:** not captured (no dev server on 3000/5173/8080; browser tooling unavailable this session) — code-evidence-only audit. Visual/backstop verdicts the spec delegates to "verify visually" could not be confirmed and are scored without them.

**Scope applied:** deferred items in the spec's implemented-now / deferred table (character, dither, wobble, pick-two UI, resize hardening, reduced-motion) are scored as intentional deferrals, not gaps.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | All 7 contract strings verbatim-accurate; over-state has no retry hint; CDN-failure surface has zero copy |
| 2. Visuals | 3/4 | Placeholder scene matches scene contract exactly; load/failure first-paint is an unverified backstop |
| 3. Color | 4/4 | 7 hex values in the entire codebase, all contract-declared; accent appears exactly once (player mesh) |
| 4. Typography | 4/4 | Exactly 2 sizes / 1 weight / system sans, matching contract with no drift |
| 5. Spacing | 3/4 | HUD anchor is viewport-relative in code but spec says "from canvas-box top" — real divergence |
| 6. Experience Design | 2/4 | CDN-unreachable path is a permanent silent brick (spec's own ⚠ unresolved row); no loader, no retry |

**Overall: 19/24**

---

## Top 3 Priority Fixes

1. **CDN-fetch failure = permanent silent cream canvas** — if the importmap `three@0.186.1` fetch fails, the game never boots and the user sees a blank beige page forever with no message or retry (spec row `error`, marked ⚠ unresolved). Impact: total loss of first-run users on flaky networks, undiagnosable. Fix: build the documented-but-missing `vendor/three/` local fallback, or cheapest interim — a module-load watchdog (e.g. a `setTimeout` in an inline script that reveals a static `<div>` "Couldn't load the game engine — reload to retry" if `shell.js` hasn't marked itself started within ~8 s). One small HTML/JS addition; no build step needed.
2. **HUD is anchored to the viewport, not the canvas box** — `#hud { position:absolute; inset:0 }` (css/style.css:12–13) with no positioned ancestor (`body` has no `position`; css/style.css:1–2) resolves the containing block to the initial containing block (the page), so `padding-top: 2.5rem` (line 18) measures from the **viewport top**, while UI-SPEC.md line 45 states it measures "from canvas-box top." With the canvas letterboxed at `max-height: 95vh`, the score floats up to ~2.5vh away from the canvas top edge and drifts with window height. Fix: wrap canvas + `#hud` in a `position: relative` container that shares the canvas's box, and anchor `#hud` to it — this also becomes the correct hook for Phase 5's resize/letterbox work (UI-03). Update the spec wording either way.
3. **Over-state copy gives no restart affordance** — `Missed! Score {N}` (js/shell.js:74) relies on discovery-by-press for the most important loop-closing action (restart). The spec acknowledges this (lines 123–125) and defers to Phase 3+, but it is a one-string change available now: `Missed! Score {N} — press / tap to retry`. Cheap; improves the core one-button loop this phase exists to establish.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

Contract vs. implementation, string by string (`js/shell.js::updateHud`, lines 67–81):

| Contract element | Spec copy | Actual | Verdict |
|---|---|---|---|
| Idle CTA | `press space / tap to start` | shell.js:76 — identical | ✅ verbatim |
| First-skip coach | `press space / tap when the box reaches you` | shell.js:78 — identical | ✅ verbatim |
| Mid-run prompt | empty string | shell.js:70, 79–80 — `''` default | ✅ |
| Offer prompt | `{name} — {desc} — tap / space to pick` | shell.js:72 — em-dash separators match | ✅ |
| Failure state | `Missed! Score {N}` | shell.js:74 — matches, **but no retry hint** (see fix 3) | ⚠ |
| Score readout | bare integer | shell.js:68 `String(run.score)` | ✅ |
| Best readout | `best {N}`, live max | shell.js:69 `Math.max(best, run.score)` | ✅ |

- No generic labels ("Submit"/"Click Here"/"OK") anywhere in `js/`, `css/`, `index.html` (grep clean).
- DOM writes are `textContent` only; no `innerHTML`/`insertAdjacentHTML` in any module (grep clean) — contract threat T-01-02 holds.
- **WARNING:** the only failure-mode the user can actually hit (engine load failure) has *no copy at all* — see Pillar 6. The copy contract has no row for it and the code has no string for it.
- Deferred-by-design, not scored as gap: real pick-two copy (Phase 3).

### Pillar 2: Visuals (3/4)

- Scene contract verified line-by-line in `js/render3d.js`: fixed `PerspectiveCamera(50)` at (0, 2.2, 9) → lookAt(0, 1, 0) (lines 19–21); zero lights, all `MeshBasicMaterial` (13–40); player box 0.6×1.1×0.4 at x=0 (30–32); obstacle 0.35×0.4×0.35 sweeping x = 6 → −6 via `worldX` (8–10, 35–40); floor 40×12 (23–24). All ✅.
- Single clear focal point: exactly one figure wears the accent in a flat neutral scene — hierarchy achieved through color reservation, per spec.
- Motion is phase-derived only: obstacle and player read `lerpPhase(prevPhase, rope.phase, alpha)` and `player.y` (render3d.js:43–45); no independent animation clock anywhere in `js/` (grep confirms `performance.now` used only in shell.js for input duration). Master-timeline invariant holds. ✅
- **WARNING (unverifiable, not disproven):** the loading first-paint backstop (spec line 192: "slow-CDN first paint is a blank cream canvas, not broken chrome") could not be confirmed without a browser. CSS `#f7f3e8` canvas background (style.css:5) *should* produce it; scoring withholds one point for the unverified visual backstops (loading, overflow).
- Deferred and not scored: character model, blob shadow, rope arc readability, dither, wobble (Phase 2).

### Pillar 3: Color (4/4)

Complete hex inventory across the whole codebase — 7 distinct values, every one declared in the Color Contract:

| Value | Contract role | Occurrences |
|---|---|---|
| `#f7f3e8` | dominant 60% | render3d.js:17 (scene bg) + style.css:5 (canvas CSS bg) |
| `#d8d0bd` | secondary 30% | render3d.js:25 (floor) |
| `#c94f6d` | accent 10% | render3d.js:32 — **exactly one occurrence, player mesh only**; reservation invariant holds |
| `#7a5c3e` | neutral prop | render3d.js:37 |
| `#222` | HUD text | style.css:19 |
| `#1a1a2e` | letterbox | style.css:1 |

60/30/10 distribution is structural (area of cream > floor > single player box), not aspirational. No out-of-contract colors, no `rgb()`/named colors. No token/CSS-variable extraction — appropriate for a zero-dependency static site whose spec names the literals directly.

- Minor maintainability note (not scored): the palette is duplicated across `css/style.css` and `js/render3d.js` with no shared source; `#f7f3e8` in particular must stay in sync across both files or the load-flash shows a seam. A later phase extracting a `js/palette.js` would centralize this.

### Pillar 4: Typography (4/4)

- Size inventory: exactly two — `16px` base and `32px` score (style.css:20, 25). No other `font-size` anywhere. Matches contract (body 16/400, display 32/400).
- Weight inventory: exactly one — none declared; the `font: 16px sans-serif` shorthand (style.css:20) applies weight 400. Matches the "exactly one weight" budget with zero drift.
- System `sans-serif`, no webfont — consistent with the static-file constraint (spec line 29).
- Line-height not declared; acknowledged in spec (lines 86–88) as unobservable while all HUD strings are single-line. The offer prompt concatenation (shell.js:72) is the first candidate to wrap once Phase 3 card names/descriptions exist — forward flag, not a current gap.

### Pillar 5: Spacing (3/4)

- Values in use: `gap: 4px` (xs ✅), `padding-top: 2.5rem` (named hud-anchor exception ✅ per spec's D5 sign-off), `margin: 0` reset. No arbitrary one-off values; no `[…px]`/`[…rem]` anomalies. Contract scale compliance is otherwise clean.
- **WARNING — spec/implementation divergence (see fix 2):** the anchor is viewport-relative in code, canvas-box-relative in the spec text. Evidence: `#hud` is the only `position` declaration in the stylesheet (style.css:12); `html, body` (line 1) and `canvas` (line 3) are statically positioned, so `inset: 0` + `padding-top: 2.5rem` pin the score 40px below the *page top*. With `max-height: 95vh` letterboxing, the canvas top sits ~2.5vh below the page top on wide windows — the score visibly detaches from the canvas edge, and the HUD spans center against the viewport rather than the canvas (harmless while both are centered; breaks the moment the canvas box and viewport center diverge, e.g. future page chrome or narrow-window clipping). This is exactly the failure class Phase 5 UI-03 will hit head-on; fix the wrapper now.

### Pillar 6: Experience Design (2/4)

State-coverage, checked against code:

| State | Verdict | Evidence |
|---|---|---|
| Idle → run start | ✅ | press intent → `startRun()` at step boundary (shell.js:47–48) |
| Loading (engine fetch) | 🧭 backstop, unverified | CSS cream canvas only; no loader (by design, spec line 192) |
| Load failure | ⚠ **unresolved** | No `onerror`, no timeout, no retry, no message anywhere in `index.html`/`js/`. Spec's own probe marks this row ⚠ unresolved and the checker accepted it as an assumption; an assumption accepted in planning is not a defect-free experience — this is the phase's only user-reachable broken-state surface with zero feedback. |
| Empty (mid-run) | ✅ | deliberate silent prompt (shell.js:70–80) |
| Error (storage) | ✅ | try/catch with session-only degradation (game.js:51, 59) |
| Zero-state (first run) | ✅ | `best 0` via `Number(...) \|\| 0` coercion path |
| Destructive confirm | n/a | none exist ✅ |
| Input hygiene | ✅ | `e.repeat` filtered + `preventDefault` on Space (shell.js:40); intent flags consumed at step boundaries (shell.js:43–65); accumulator clamp 0.25 s prevents tab-return spiral (shell.js:86) |
| A11y surface | ✅ (deliberate, min-viable) | `#hud aria-hidden="true"` (index.html:19) with documented frame-spam rationale; nothing focusable exists |

- BLOCKER-adjacent finding (keeps pillar at 2): the load-failure silent brick above. It is not a deferred item — it is in scope for a phase whose deliverable *is* the CDN-loaded shell.
- `pointercancel`/blur hardening and reduced-motion are genuinely deferred (Phases 4–5) — not counted.
- Interaction trace matches the one-button contract table exactly in all four states (press/release semantics, shell.js:30–64), including choose/over holding press "as intent" and acting on release.

---

## Registry Safety

Not applicable — no `components.json`, no shadcn, no third-party UI registries (spec: `Tool: none`). One external fetch exists: importmap-pinned `three@0.186.1` (index.html:12), exact-version pinned with SRI deliberately deferred and documented inline (index.html:8, threat T-01-01). Residual note for later phases: implement the `vendor/three/` fallback that RESEARCH documents but was never built (also fix 1).

---

## Files Audited

- `.planning/phases/01-render-shell-foundation/01-UI-SPEC.md` (contract)
- `index.html`, `css/style.css`
- `js/shell.js`, `js/render3d.js`
- `js/game.js` (catch-block spot check), phase `01-01-SUMMARY.md`, `01-02-SUMMARY.md`
- Repo-wide greps: hex colors, user-facing strings, generic labels, innerHTML, aria/position, loading/error/empty state patterns, animation-clock usage

---

## Gap-closure increment (01-03) — 2026-10-15 addendum

**Scope:** commits `ce8cb6c..7bd7e18` — `js/render3d.js` createScene return shape (G-01-1 GREEN), `js/shell.js` frame() try/catch belt, `tests/render3d.test.js` + `tests/shell.test.js`. No HTML, CSS, design tokens, copy strings, or scene geometry changed in the increment (`git diff --stat` confirms: only the two js/ files + `.planning/` docs). Baseline scores above stand unchanged; this section audits only regression surface.

**Verdict: UI-neutral-to-positive. No pillar regresses; Experience Design gains resilience margin. All six scores and the 19/24 total are reaffirmed.**

### Change-by-change assessment

| Change | User-visible surface | Verdict |
|---|---|---|
| `createScene` returns `{ render }` instead of the bare closure (render3d.js:42–49) | None at the pixel level — shell's call site `scene.render({...})` (shell.js:104) is shape-compatible with both; the fix *removes* the first-frame TypeError that froze the game permanently at the idle prompt `press space / tap to start` (G-01-1 / debug log) | ✅ Strict improvement — the increment deleted the phase's most severe user-facing failure mode (core loop uncompletable); no contract string or visual changed |
| try/catch + `console.error('render failed:', err)` around `scene.render` in `frame()` (shell.js:103–107) | `console.error` is developer-visible only; zero on-page copy added. `updateHud()` runs before the render call (shell.js:102), so under a persistent renderer throw the HUD, simulation, and input stay live while the canvas holds the last drawn frame — a "silent degraded" state replacing the previous total freeze (listeners bound but `consumeIntents` never running) | ✅ No UI-SPEC contract row changes; spec error-state copy (`Missed! Score {N}`, UI-SPEC:118) and all 7 copy strings byte-unchanged (verified via `git diff`) |
| New Node-only tests (render3d.test.js, shell.test.js) | None — never shipped to browser | ✅ n/a |

### Pillar regression check

- **Pillars 1–5: zero delta.** No string, color literal, font, spacing, or scene-graph edit in the increment (grep inventory identical to baseline: same 7 hexes, 2 sizes, 1 weight; `updateHud` untouched).
- **Pillar 6 (Experience Design): reaffirmed 2/4, floor raised.** The frame loop now survives renderer exceptions (automated in `tests/shell.test.js`: rAF re-arms across 3 consecutive throw-frames; a space keydown still transitions idle → running during a failure storm). The 2/4 score is still held down by the *unchanged* CDN-load-failure silent brick (spec row UI-SPEC:195, ⚠ unresolved) — the belt protects post-boot throws but cannot fire pre-boot, when `three` itself never loads.

### Increment-sourced observations (minor, not scored)

1. **`console.error` is unthrottled** — a persistent per-frame renderer throw logs at up to display refresh rate (~60/s), spamming DevTools (Chrome coalesces repeats, so practical harm is low). Recommend a once/latched flag (`let renderFailed = false`) logging only the first throw, in a later pass.
2. **Persistent-render-failure degradation is user-silent** — stale canvas + live HUD is confusing if it ever occurs. This is the same failure-feedback gap as baseline priority fix 1; when the load-failure watchdog/`vendor/three` fallback lands, extend it to surface a "graphics hiccup — reload" message on latched render failure too. Post-boot throws are a remote path (three@0.186.1 stable surface), so this stays a forward note, not a warning.

### Registry safety (increment)

No change — no `components.json`, no shadcn, no third-party registries. Sole external dependency remains the importmap-pinned `three@0.186.1` (index.html, unchanged in the increment).

### Files audited (increment)

- `git diff ce8cb6c..7bd7e18` (full), `js/shell.js` (current), `js/render3d.js` (current)
- `01-03-PLAN.md`, `01-VALIDATION.md` (T-01-08 automation evidence), `01-UI-SPEC.md` rows 118/188–197
- `node --test tests/` run: 42 pass / 0 fail

**Screenshots:** not captured (no dev server on 3000/5173/8080) — increment has no renderable delta, so no visual backstop was forfeited.
