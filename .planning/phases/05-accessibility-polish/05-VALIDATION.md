---
phase: "5"
slug: "accessibility-polish"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-22"
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner (`node:test`) with `node:assert/strict` |
| **Config file** | none — zero-dependency repo, tests import js/ modules directly |
| **Quick run command** | `node --test tests/polish.test.js` |
| **Full suite command** | `node --test tests/` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/polish.test.js`
- **After every plan wave:** Run `node --test tests/` (must report `fail 0`)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by planner per plan) | — | — | UI-01 | — | N/A | unit | `node --test tests/polish.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/polish.test.js` — new Node-test file covering UI-01/UI-02/UI-03 + criterion 4 legs per RESEARCH.md §Validation Architecture
- [ ] Harness extensions to `tests/shell.test.js` / `tests/audio.test.js` stubs (matchMedia, canvas.style, visibilitychange/pointercancel/blur dispatch) per RESEARCH.md Pitfalls 5–8

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Item | What to verify | Why no automation | Estimated |
|------|----------------|-------------------|-----------|
| OS reduced-motion toggle | Mid-session OS-level toggle dampens wobble/shake live | Requires real OS/browser | 2 min |
| Window resize feel | Letterbox bands read cleanly at extreme aspects | Visual judgment | 3 min |
| Tab-switch pause | Tab-hide mid-run pauses; return lands in lead-in | Browser tab lifecycle | 2 min |
