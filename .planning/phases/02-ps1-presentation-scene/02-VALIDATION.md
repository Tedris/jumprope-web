---
phase: "02"
slug: "ps1-presentation-scene"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: true) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: "2026-10-16"
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node built-in, `node --test tests/`) |
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
| 02-01/T1 | 01 | 1 | PRES-01 | T-02-01, T-02-02 | Spike reuses only the pinned CDN URL; suite untouched | unit+grep | `bash -c 'U=$(grep -oE "https://cdn[^\"'\'']*three[^\"'\'']*" index.html \| head -1); grep -qF "$U" .planning/spikes/ps1-look.html && ! grep -E "https?://" .planning/spikes/ps1-look.html \| grep -vF "$U" \| grep -q "cdn\|unpkg\|esm\.sh\|githubusercontent"' && node --test tests/` | ✅ | ✅ green |
| 02-01/T2 | 01 | 1 | PRES-01 | T-02-04 | Look sign-off + canonical values recorded | manual (browser) | `grep -q "## Look Decisions" .planning/spikes/ps1-look.html` | ✅ (new file) | ✅ green |
| 02-02/T1 | 02 | 2 | PRES-01 | T-02-12, T-02-05, T-02-06, T-02-07 | Pipeline in renderer; no IO tokens or addons specifier in render3d.js; index.html untouched | unit | `node --test tests/render3d.test.js && node --test tests/boundary.test.js && node --test tests/` | ✅ | ✅ green |
| 02-02/T2 | 02 | 2 | PRES-01 | T-02-07 | view.now on payload; resize wiring shell-side only | unit | `node --test tests/shell.test.js && node --test tests/boundary.test.js` | ✅ | ✅ green |
| 02-03/T1 | 03 | 3 | PRES-02, PRES-03 | T-02-08, T-02-10 | Pose from canonical clock only; geometry built once | unit | `node --test tests/render3d.test.js && node --test tests/boundary.test.js && node --test tests/` | ✅ | ✅ green |
| 02-03/T2 | 03 | 3 | PRES-03 | T-02-11 | Shadow math = pure function of view.player.y; no view mutation | unit | `node --test tests/` | ✅ | ✅ green |
| 02-03/T3 | 03 | 3 | PRES-02 | T-02-08, T-02-09 | Cosmetic motion deterministic from view.now; no rng in render path | unit+grep | `node --test tests/ && node --test tests/boundary.test.js` | ✅ | ✅ green |

*Status: ✅ green · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*If none: "Existing infrastructure covers all phase requirements."*

Note: `tests/render3d.test.js` uses a hand-written THREE stub that must be extended for every new scene class created this phase (see RESEARCH.md Pitfall 6).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PS1 look (dither, wobble, upscale) | PRES-01 | Perceptual quality not assertable in Node | Look-spike checkpoint in browser at pinned `three@0.186.1` |
| Character personality / readability | PRES-02/03 | Perceptual | Browser look-checkpoint at wave end |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-17 — all 7 automated verifications green
