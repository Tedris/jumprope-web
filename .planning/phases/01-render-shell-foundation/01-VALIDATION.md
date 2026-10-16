---
phase: "1"
slug: "render-shell-foundation"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: false
created: "2026-10-15"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node built-in, `node --test`) |
| **Config file** | none — existing infrastructure covers all phase requirements |
| **Quick run command** | `node --test tests/` |
| **Full suite command** | `node --test tests/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/`
- **After every plan wave:** Run `node --test tests/`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01 | 1 | ARCH-01, ARCH-02 | T-01-01/02/04 | WebGL page loads via pinned importmap; sole-three-importer + no-2D-context + browser-IO-ownership (shell.js-only) greps | unit + hygiene greps | `node --test tests/` | ✅ (existing + new) | ✅ green |
| 01-01-T2 | 01 | 1 | ARCH-02 | T-01-07 | Single startRun path; rng injection (literal-count + paren-free-aware Math.random-reference grep, determinism probe) | unit + greps | `node --test tests/` + plan-specified git-grep gates | ✅ | ✅ green |
| 01-02-T1 | 02 | 2 | ARCH-01, ARCH-02 | T-01-06/07 | Import-graph walk fails red on a three injection (adversarial tooth-check included) | unit (static graph walk) | `node --test tests/boundary.test.js` | ✅ | ✅ green |
| 01-02-T2 | 02 | 2 | ARCH-01 (SC-4 math) | — | Wrap-aware lerpPhase pinned against backwards-sweep regression | unit | `node --test tests/interpolate.test.js` | ✅ | ✅ green |
| 01-03-T1 | 03 | 3 | ARCH-01 (G-01-1) | T-01-09 | createScene return contract pinned in Node; adversarial probe vs bare-closure shape turns all 3 tests red with the `G-01-1 contract` marker (teeth proven, not validation theater) | unit (source-rewritten data:/file: import, stubbed three) | `node --test tests/render3d.test.js` | ✅ | ✅ green |
| 01-03-T2 | 03 | 3 | ARCH-01 | — | `{ render }` shape green AND boundary walk gains no render3d.js entry (no SPECIFIER_RE-visible relative specifier in the test) | unit + boundary | `node --test tests/` | ✅ | ✅ green |
| 01-03-T3 | 03 | 3 | ARCH-01 | T-01-08 | Frame loop re-arms across consecutive scene.render throws and input intents stay consumed — **automated 2026-10-15 audit** via tests/shell.test.js (was SUMMARY D2 human-judgment-only); removing the try/catch belt turns both tests red (teeth proven) | unit (real shell.js booted with stubbed DOM/rAF/renderer) | `node --test tests/shell.test.js` | ✅ (new) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/boundary.test.js` — import-graph walk (D-03) + ARCH-02 source asserts + rng determinism — delivered by plan 01-02 Task 1 (wave 2; plan 01-01 carries interim hygiene greps so no task runs without automated verify)
- [ ] `tests/interpolate.test.js` — lerpPhase wrap pinning — delivered by plan 01-02 Task 2

No MISSING-sentinel gaps remain: every task's `<verify>` carries a runnable `<automated>` command against files that exist at its wave (VALIDATION sign-off item "Wave 0 covers all MISSING references" satisfied by this reconciliation).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full run playable through WebGL shell (idle → running → choose → over) | ARCH-01 | Requires browser WebGL rendering | Serve static files, open page, play one full run in browser |
| Rope visuals never drift from scoring under load | ARCH-01 | Perceptual timing under frame-rate variance | Play in browser while stressing CPU; observe rope/scoring sync |

*All other phase behaviors have automated verification.*

---

## Plan 01-03 Gap-Closure Coverage (Nyquist re-audit 2026-10-15)

Gap-closure plan 01-03 (G-01-1: `createScene` returned the bare render closure; the first-frame TypeError killed the rAF loop) added `tests/render3d.test.js`, `js/render3d.js` `{ render }` fix, and the `js/shell.js` try/catch belt. This audit verified the new coverage is real (adversarial probes below) and closed the two remaining automated-verification gaps.

### Requirement → check cross-reference (plan 01-03 must-haves)

| must_have truth | Automated check | Verdict |
|---|---|---|
| createScene returns object with callable .render, pinned without WebGL/three | `tests/render3d.test.js` (3 tests) — **teeth-verified**: replayed against a mutated copy returning the bare closure (`return render;`); all 3 tests fail red, the two shape assertions carrying the exact `G-01-1 contract` marker and the behavior test the authentic `scene.render is not a function` symptom | COVERED |
| `node --test tests/` green, no new boundary-walk entry | Full suite green (42/42 as of this audit); `boundary.test.js` entryPoints() sees no dot-relative specifier literal in `render3d.test.js`/`shell.test.js` — ARCH-01 fence stays green | COVERED |
| Renderer throw cannot kill the frame loop (T-01-08) | **GAP found** — 01-03-SUMMARY D2 was an uncommitted throwaway experiment (`human_judgment: true`); plan verify `node --check js/shell.js` is syntax-only and cannot fail if the try/catch is removed. **Filled** by `tests/shell.test.js`: boots the real `js/shell.js` in Node with stubbed document/window/rAF/localStorage and a throwing renderer stub (same source-rewrite mechanism, boundary-safe) — asserts rAF re-arms across 3 consecutive throw-frames with `render failed:` logged, and that a space keydown still transitions idle → running through an every-frame failure storm. **Teeth-verified**: belt-removed copy of shell.js turns both tests red | FILLED (was human-only) |
| Browser tap-to-start smoke (truth 1) | human-check; remains end-of-phase UAT (Manual-Only table above) — its loop-survival core is now additionally automated above | MANUAL (unchanged) |

Additionally, plan 01-01 must_have truth "the Canvas 2D draw() no longer exists in the tree" (D-02) was guarded only by plan-time one-shot greps; `tests/shell.test.js` adds the permanent form (no `getContext`/CanvasGradient reference may survive in `js/`; **teeth-verified** by injecting a `getContext` line into a scratch copy — test goes red).

### Validation-theater screen results

- `render3d.test.js` assertions CAN fail on the historical bug shape — proven by replay (not theater).
- The `node --check js/shell.js` verify in plan 01-03 Task 3 was the only theater-grade check found; superseded by the behavioral `shell.test.js` tests above.
- `tests/shell.test.js` rewrites import specifiers at runtime so no literal relative js/ import exists in the test source — the ARCH-01 boundary walk remains unaware of shell.js by design, matching the render3d.test.js precedent (T-01-09 accept disposition).

**Suite at audit time:** `node --test tests/` → 42 pass / 0 fail (four frozen files byte-verified via git hash-object).

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-10-15 (all automated commands green: 36/36)

## Validation Audit 2026-10-15

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

## Validation Audit 2026-10-16

| Metric | Count |
|---|---|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |
