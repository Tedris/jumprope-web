---
phase: 05-accessibility-polish
verified: 2026-10-22T20:20:16Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - ".planning/phases/05-accessibility-polish/05-01-PLAN.md"
  - ".planning/phases/05-accessibility-polish/05-01-SUMMARY.md"
  - ".planning/phases/05-accessibility-polish/05-02-PLAN.md"
  - ".planning/phases/05-accessibility-polish/05-02-SUMMARY.md"
  - ".planning/phases/05-accessibility-polish/05-03-PLAN.md"
  - ".planning/phases/05-accessibility-polish/05-03-SUMMARY.md"
  - ".planning/phases/05-accessibility-polish/05-04-PLAN.md"
  - ".planning/phases/05-accessibility-polish/05-04-SUMMARY.md"
  - ".planning/phases/05-accessibility-polish/05-05-PLAN.md"
  - ".planning/phases/05-accessibility-polish/05-05-SUMMARY.md"
  - "css/style.css"
  - "js/audio.js"
  - "js/render3d.js"
  - "js/shell.js"
  - "tests/audio.test.js"
  - "tests/feelcap.test.js"
  - "tests/juice.test.js"
  - "tests/pickflow.test.js"
  - "tests/polish.test.js"
  - "tests/render3d.test.js"
  - "tests/shell.test.js"
covered_digest: "v3:sha256:0a47185c242498b8a5cec7de6a8c405d7bd5af141516e2b2a971f663477ec69c"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/4
  gaps_closed:
    - "While the game is paused, no focus/visibility event un-suspends the audio context the game itself paused (CR-01) — visible-branch gesture now guarded with audioReady && !paused (shell.js:251), pinned by new Leg A in tests/polish.test.js:902; the verifier's independent repro script now exits 0 with ctx.state 'suspended' and zero visible-leg gestures"
    - "WR-01 (prior warning): hidden-visibilitychange branch now runs releaseEverything() unconditionally before the status check (shell.js:243-244), so a choose-status sub-confirm hold cancels on platforms delivering visibilitychange without blur; pinned by new Leg B (polish.test.js:941)"
  gaps_remaining: []
  regressions: []
advisory:
  - finding: "render3d.js 'frozen pose' comment overstates idle behavior (arms/scarf still oscillate off the wall clock) — review WR-02, disposition open"
    category: other
    reason: "Carried from the prior verification's anti-pattern table, not new scope; cosmetic comment-accuracy call on 05-02's pinned byte-identical reading; next review run re-triages"
    evidence_status: "none provided"
human_verification:
  - test: "Real browser: press P mid-run, switch tabs, switch back"
    expected: "Audio silent the whole time behind the frozen 'paused — press P to resume' frame; return does not un-suspend the context"
    why_human: "Real rAF throttling and the browser autoplay/gesture policy are not observable in Node; Leg A pins the DOM-side contract but not real gesture-policy behavior (VALIDATION.md manual-only row / prior UAT row 1, still unconfirmed)"
  - test: "OS reduced-motion toggle while the game runs, both directions"
    expected: "Wobble/shake vanish live on the next frame both ways; rope judgment unchanged; 0.25 px grid reads crawl-free"
    why_human: "Real prefers-reduced-motion media query round-trip through an actual OS setting (prior UAT row 2, still unconfirmed)"
  - test: "Drag browser window to ~1000×300, then to a normal size"
    expected: "Vertical black letterbox bars, undistorted frame; normal-size window pixel-identical to pre-phase"
    why_human: "Visual legibility/letterbox rendering needs a real compositor (prior UAT row 3, still unconfirmed)"
  - test: "Alt-tab mid-hold on a real browser, then return"
    expected: "Jump fires with the hold-so-far or cancels cleanly — never a frozen hold on return"
    why_human: "Real blur/visibilitychange interleaving order under a real window manager (prior UAT row 4, still unconfirmed)"
  - test: "Background the tab during a sub-confirm card hold on a platform that delivers visibilitychange without blur (mobile/Safari path)"
    expected: "The hold cancels — status stays 'choose', fill cue gone, nothing auto-confirms on return"
    why_human: "tickPick times the hold on the real performance.now(), which the Node harness does not stub, so the real-clock auto-confirm edge cannot fire in-harness; Leg B pins the DOM-side cancel contract only (prior UAT row 5)"
---

# Phase 5: Accessibility & Polish Verification Report

**Phase Goal:** The game respects system preferences and survives real-world browser behavior without breaking judgment or legibility
**Verified:** 2026-10-22T20:20:16Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plan 05-05)

> **MVP-mode note:** unchanged from the prior report — the ROADMAP's narrative phase goal is not a
> User Story (`user-story.validate` → invalid), a project-wide template artifact. Verification
> proceeded goal-backward against the four explicit success criteria.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Game pauses on demand and auto-pauses when the tab is hidden; audio suspends and resumes with it (SC1, UI-01) | ✓ VERIFIED | **Gap closed.** The visibilitychange VISIBLE branch now reads `else if (audioReady && !paused) audio.gesture();` (`shell.js:251`) — `grep -c "audioReady && !paused" js/shell.js` = 2 (new guard + pre-existing focus listener). New Leg A (`tests/polish.test.js:902-932`) walks manual-pause → hidden → visible and asserts `ctx.state === 'suspended'`, `log.gestures` unchanged, `ctx.resumes` unchanged, prompt still `/paused — press P to resume/`, `rope.phase` frozen — **passes**. The prior verifier's independent repro script (`/tmp/opencode/cr01-repro.mjs`, real js/shell.js through the boot harness) now **exits 0**: "still paused: true, sim frozen: true, ctx.state after tab-return: suspended, gesture() calls fired by the visible leg: 0" (was exit 2 / 'running'). All 15 pre-existing pause legs still green — no behavior fast-forwarded. This is a state-transition truth with a passing behavioral test: VERIFIED, not presence-only. |
| 2 | `prefers-reduced-motion` dampens wobble and shake automatically, without disabling gameplay readability (SC2, UI-02) | ✓ VERIFIED (regression check) | `git diff 681a9a6..HEAD -- js/render3d.js css/style.css js/audio.js` empty — zero production-code movement in the UI-02 surface since the prior full 3-level verification. All dampen/live-switch/byte-identity legs (render3d.test.js, polish HUD-identity leg) green in the 130/0 suite. No regression. |
| 3 | The low-res UI stays legible at any window size — resize/letterbox handling (SC3, UI-03) | ✓ VERIFIED (regression check) | The only `js/shell.js` diff since the prior verification (`git diff 681a9a6..HEAD`) is confined to the visibilitychange listener block and its comments — `applyWindowSize()`, the ASPECT band constants, and the resize listener are byte-identical to the previously-verified state; `css/style.css` untouched. Band/floor/passthrough/NaN/boot-sizing legs green. No regression. |
| 4 | No stuck-hold state after blur or `pointercancel` — input reducer hardening in the new shell (SC4) | ✓ VERIFIED (hardened) | `releaseEverything()` now runs **unconditionally** as the hidden branch's first statement (`shell.js:243`), hoisted before the `run.status === 'running'` check that still gates `enterPause(true)` (`:244`) — strictly wider coverage than the previously-verified running-only routing (closes WR-01). Hoist-order key link honored: release runs before the status branch. All five interruption legs + pause-then-blur leg + new Leg B green. |

**Score:** 4/4 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `js/shell.js` — visibilitychange VISIBLE branch guard | `audioReady && !paused` on the gesture fallback | ✓ VERIFIED | `shell.js:251`; diff vs `681a9a6` shows the one-expression change plus comment updates; `pausedByVis` auto-resume arm above untouched |
| `js/shell.js` — visibilitychange HIDDEN branch unconditional release | `releaseEverything()` first statement, `enterPause(true)` still status-gated, else-branch `audio.gesture()` verbatim | ✓ VERIFIED | `shell.js:243-246` — hoist exactly as prescribed in 05-REVIEW.md WR-01 Fix |
| `tests/polish.test.js` — two new pin legs | Leg A (CR-01 suspend-pin) + Leg B (WR-01 hidden-hold cancel); total 24 legs | ✓ VERIFIED | `polish.test.js:897-970`; `grep -c "^test(" ` = 24; both legs substantive (full sequence walks + 5 assertions each), not stubs |
| `05-REVIEW-DISPOSITION.md` — CR-01/WR-01 rows flipped | `disposition: fixed`, Source "05-05 gap closure" | ✓ VERIFIED | frontmatter `findings:` shows CR-01 and WR-01 `fixed`; WR-02/IN-01..IN-04 unchanged at `open` per the plan's scope fence |
| Purity fence (ARCH-01) | `git diff a1fae8c..HEAD -- js/rope.js js/player.js js/upgrades.js js/game.js` empty | ✓ VERIFIED | rc 0, empty output — sim core untouched across the entire phase span including the closure |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| visibilitychange visible branch | `paused` flag | `else if (audioReady && !paused)` | ✓ WIRED (was the CR-01 gap) | `shell.js:251` — guard present in the shipped path; dropping it re-reddens Leg A (verified red at commit 7e9dbeb per red-evidence JSON) |
| visibilitychange hidden branch | `releaseEverything` → `pickPressedAt`/`pickFill` clearing | hoisted call before the status branch | ✓ WIRED (was the WR-01 gap) | `shell.js:243` unconditional; `shell.js:326` cue gate on `pickPressedAt !== null` — Leg B's cue-gone assertion passes |
| frame() drain gate | `paused` flag | `acc = 0` + in-loop break | ✓ WIRED (regression) | unchanged region; legs green |
| resumeFromPause | `resumeRun` | lead-in, never startRun | ✓ WIRED (regression) | unchanged region; legs green |
| matchMedia change → `reducedMotion` → view payload | closure var in `scene.render` | ✓ WIRED (regression) | render3d.js untouched since prior verification |

### Data-Flow Trace (Level 4)

No new rendered values in the closure diff; the prior report's trace (live `run`/`best` HUD,
`view.reducedMotion` uniform derivation, `window.innerWidth/Height` sizing through the coercion
guard, harness stubs never in the shipped path) still holds — no source file feeding a rendered
value changed since. No HOLLOW/DISCONNECTED findings.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite | `node --test tests/` | **130 pass / 0 fail** (128 baseline + 2 new legs, matches plan gate ≥130) | ✓ PASS |
| New pin legs in isolation | `node --test tests/polish.test.js --test-name-pattern "CR-01\|WR-01"` | 24 tests, 24 pass, 0 fail (whole polish file green incl. both new legs) | ✓ PASS |
| **CR-01 independent reproduction** (manual-pause → hidden → visible) | `node /tmp/opencode/cr01-repro.mjs` (real js/shell.js through the boot harness) | exit 0 — paused, sim frozen, `ctx.state === 'suspended'`, visible-leg gestures = 0 (was exit 2 / 'running' in the prior verification) | ✓ PASS — gap confirmed closed by re-running the original failing repro |
| Purity fence `git diff a1fae8c..HEAD -- js/rope.js js/player.js js/upgrades.js js/game.js` | empty | rc 0 | ✓ PASS |
| Gap-closure commits are ancestors of HEAD | `git merge-base --is-ancestor` on 7e9dbeb, f6f35fc, b2c9daa | all OK | ✓ PASS |
| Diff confinement | `git diff --name-only 84b9a51..HEAD` (non-.planning) | only `js/shell.js` + `tests/polish.test.js` | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — unchanged from the prior report (no `scripts/*/tests/probe-*.sh` exist; the
"spec-less probe UI-0x unresolved" mentions are the RESEARCH edge-probe flags, surfaced below and
in the plan's `flagged_assumptions`).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| UI-01 | 05-01, 05-04, 05-05 | Game pauses on demand and auto-pauses when the tab is hidden | ✓ SATISFIED (provisional tick can be lifted) | All pause/auto-pause paths pinned; CR-01 defect closed with guard + Leg A + independent repro exit 0. Residual real-browser edge = manual UAT row 1. |
| UI-02 | 05-02 | Reduced motion dampens wobble/shake; prefers-reduced-motion respected automatically | ✓ SATISFIED | Unchanged since prior full verification; all legs green. |
| UI-03 | 05-03 | Low-res UI legible at any window size (resize/letterbox) | ✓ SATISFIED | Unchanged since prior full verification; all legs green. |

No orphaned requirements — REQUIREMENTS.md maps exactly UI-01/02/03 to Phase 5; all declared by plans
(05-01/04/05 → UI-01, 05-02 → UI-02, 05-03 → UI-03).
ℹ️ Bookkeeping note: the REQUIREMENTS.md status table currently reads UI-02/UI-03 "Gaps Found" — a
transcription slip in the `681a9a6` revert (the gap was UI-01's, not theirs). With this verification
all three requirements are satisfied and the table should read Complete ×3; docs-only correction,
no code action.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| js/render3d.js | 385-387, ~423 | "frozen pose" comment while idle arms/scarf oscillate off the wall clock (WR-02) | 📋 Advisory | Carried from prior verification, not new scope and not file-modified since; cosmetic comment accuracy; disposition open, next review re-triages |
| js/shell.js | drain gate | Dead `paused` disjunct (IN-01) | ℹ️ Info | Carried; harmless belt-and-braces |
| js/audio.js | 86 | Fire-and-forget `ctx.suspend()` promise (IN-02) | ℹ️ Info | Carried; mirrors pre-existing resume sites |
| js/shell.js | 46-48 | Sub-2px window box/buffer desync (IN-03) | ℹ️ Info | Carried; no realistic window triggers it |
| js/shell.js | 246 | Hidden-branch else gesture lacks `!paused`, safe only via the implicit paused ⟹ running invariant (IN-04, new info from the refreshed review) | ℹ️ Info | The invariant is code-enforced (enterPause gates on running; status can't change behind the frozen drain gate); no behavioral exposure |

No TBD/FIXME/XXX debt markers in phase-changed files; no stub/placeholder patterns. Review
disposition: 0 open blockers (CR-01/WR-01 fixed; WR-02 + IN-01..IN-04 open at warning/info per the
refreshed 05-REVIEW.md).

### Prohibition Check (plan 05-05 must_haves.prohibitions)

| Prohibition | Status | Evidence |
|-------------|--------|----------|
| No focus/visibility event un-suspends a game-paused AudioContext | ✓ HOLDS | Both arms guarded (`shell.js:251` + focus listener `:255`); Leg A + focus leg + exit-0 repro |
| No confirm/jump/start/restart caused by focus loss alone | ✓ HOLDS (in-harness contract) | Unconditional hidden-leg release + T-05-07 releaseIntent gating + Leg B; the real-clock wall-time edge is routed to manual UAT row 5 |
| Pause semantics stay shell-side; no sim-file change | ✓ HOLDS | ARCH-01 purity fence empty |

### Flagged Assumptions (spec-less edge probe — surfaced per protocol)

UI-01/UI-02/UI-03 edge probes remain `unclassified` (no SPEC; plan 05-05 flagged_assumptions). The
automated contracts are fully pinned by legs; the residual real-browser edge closes only via the
manual UAT rows below. UI-01's residual edge is UAT row 1; UI-02/03 residuals are rows 2/3.

### Human Verification Required

1. **Real tab-switch during a manual pause** — Test: press P mid-run, switch tabs, return.
   Expected: silent the whole time; context stays suspended; no gesture past the pause.
   Why human: real rAF throttling + autoplay gesture policy are not observable in Node.
2. **OS reduced-motion toggle** — Expected: wobble/shake vanish live both ways, judgment unchanged,
   0.25 px grid crawl-free. Why human: real OS media-query round-trip.
3. **Drag window to ~1000×300 and back** — Expected: black letterbox bars, undistorted frame.
   Why human: visual compositor behavior.
4. **Alt-tab mid-hold** — Expected: jump fires with hold-so-far or cancels cleanly, no frozen hold.
   Why human: real blur/visibilitychange ordering.
5. **Background during a sub-confirm card hold (blur-less platform, mobile/Safari path)** — Expected:
   hold cancels, nothing auto-confirms. Why human: `tickPick` uses the real `performance.now()`,
   which the harness does not stub — Leg B pins the DOM-side cancel contract only; the real-clock
   confirm edge lives here.

### Gaps Summary

**No blocking gaps remain.** The single prior blocker (CR-01) is closed exactly as prescribed: the
`!paused` guard is in the shipped visible branch (`shell.js:251`), pinned red-green by Leg A, and
confirmed independently by re-running the original failing reproduction script, which now exits 0
with the context suspended and zero visible-leg gestures. WR-01 was folded in per the prior
verifier's recommendation: the hidden-branch release is now unconditional, pinned by Leg B. Truths
2-4 show zero regression — the closure diff is confined to the visibilitychange listener and its
test file, and the sim-core purity fence is empty across the whole phase span. The phase's
automated contract is fully green (130/0). What remains is the standing end-of-phase UAT checklist
(5 real-browser rows, none previously confirmed by a human), which sets the overall status to
human_needed.

---

_Verified: 2026-10-22T20:20:16Z_
_Verifier: the agent (gsd-verifier)_
