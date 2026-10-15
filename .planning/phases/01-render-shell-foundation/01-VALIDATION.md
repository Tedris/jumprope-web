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
