---
phase: "5"
slug: "accessibility-polish"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-22"
validated: "2026-10-22"
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
| 05-01/1 | 01 | 1 | UI-01 | — | Manual P/Esc pause freezes stepping, suspends audio once, holds prompt; lead-in resume with re-entry lock; 5 s paused clock never fast-forwards | unit (harness, stubbed clock) | `node --test tests/polish.test.js` | ✅ | ✅ green |
| 05-01/2 | 01 | 1 | UI-01 | T-05-01 | Tab-hidden auto-pause with suspend; idle/choose/over hidden never enters paused; tab-return auto-resumes through lead-in; focus never un-suspends | unit (harness) | `node --test tests/polish.test.js` | ✅ | ✅ green |
| 05-01/3 | 01 | 1 | UI-01 | — | Pause clears run.buffer / hold state (D-12); audio suspend/resume round-trip | unit + integration | `node --test tests/polish.test.js tests/audio.test.js` | ✅ | ✅ green |
| 05-02/1 | 02 | 2 | UI-02 | — | typeof-guarded matchMedia read + live change subscription; reducedMotion threaded through the one-way view payload both directions, next frame | unit (harness) | `node --test tests/polish.test.js` | ✅ | ✅ green |
| 05-02/2 | 02 | 2 | UI-02 | — | Dampen layer: uShake zeroed, snap grid holds SNAP_OFF across resize, particle flight pinned with spawn/fade/lifetime live | unit (stubbed THREE) | `node --test tests/render3d.test.js` | ✅ | ✅ green |
| 05-02/3 | 02 | 2 | UI-02 | — | Still endpoints (idle bob/twirl, trip-settle at exactly -PI) with full-motion gate proof; running pose, rope pivot, limbs, blob shadow and HUD channel byte-identical under reduced motion (D-05 untouched-channel audit) | unit (stubbed THREE dual-scene diff + dual-boot shell HUD diff) | `node --test tests/render3d.test.js tests/polish.test.js` | ✅ (validate-phase) | ✅ green |
| 05-03/1 | 03 | 3 | UI-03 | — | Aspect clamp band [3/4, 2]: 2000×400 → 800×400, 300×900 → 300×400, style writes match buffer (Pitfall 9) | unit (harness, settable metrics) | `node --test tests/polish.test.js` | ✅ | ✅ green |
| 05-03/2 | 03 | 3 | UI-03 | T-05-05 | Normal-window passthrough byte-identical; garbage metrics coerce finite ≥ 2; boot sizes through the same applyWindowSize; no orientationchange listener (D-10) | unit (harness + source scan) | `node --test tests/polish.test.js` | ✅ (boot/D-10 legs added by validate-phase) | ✅ green |
| 05-03/3 | 03 | 3 | UI-03 | — | All five data-URL boot harnesses boot green with the canvas.style stub (Pitfall 5 five-copy sweep) | integration | `node --test tests/` | ✅ | ✅ green |
| 05-04/1 | 04 | 4 | UI-01 | T-05-06/07 | Shared releaseEverything: blur/pointercancel/hidden fire-or-cancel exactly as released; no stuck hold, no phantom jump, no accidental restart from game-over | unit (harness, synthetic events) | `node --test tests/polish.test.js` | ✅ | ✅ green |
| 05-04/2 | 04 | 4 | UI-01 | — | Fire-superseded-by-clear: hidden/pause mid-hold clears rather than arms; blur while paused is a silent no-op | unit (harness) | `node --test tests/polish.test.js` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/polish.test.js` — new Node-test file covering UI-01/UI-02/UI-03 + criterion 4 legs per RESEARCH.md §Validation Architecture — **delivered by plan 05-01, extended by 05-02/03/04**
- [x] Harness extensions to `tests/shell.test.js` / `tests/audio.test.js` stubs (matchMedia, canvas.style, visibilitychange/pointercancel/blur dispatch) per RESEARCH.md Pitfalls 5–8 — **delivered; canvas.style: {} swept across all five boot harnesses in 05-03**

---

## Manual-Only Verifications

| Item | What to verify | Why no automation | Estimated |
|------|----------------|-------------------|-----------|
| OS reduced-motion toggle | Mid-session OS-level toggle dampens wobble/shake live | Requires real OS/browser | 2 min |
| Window resize feel | Letterbox bands read cleanly at extreme aspects | Visual judgment | 3 min |
| Tab-switch pause | Tab-hide mid-run pauses; return lands in lead-in | Browser tab lifecycle | 2 min |

---

## Evidence

- **Full suite:** `node --test tests/` → **128 pass / 0 fail** (123 pre-audit baseline + 5 validate-phase legs), ~1.8 s
- **Purity fence:** `git diff --quiet` on frozen sim-core (`js/game.js`, `js/rope.js`, `js/player.js`, `js/upgrades.js`) and frozen tests (`tests/rope.test.js`, `tests/player.test.js`, `tests/upgrades.test.js`, `tests/game.test.js`) → clean; ARCH-01/02 boundary legs green inside the full suite
- **Gap audit (validate-phase 2026-10-22):** plan 05-02 must_haves truths 3–4 (still endpoints; judgment-channel byte-identity incl. HUD) and plan 05-03 truth 3 (boot-time sizing via the shared applyWindowSize; no orientationchange) had no automated leg → 5 behavioral tests added:
  - `tests/render3d.test.js`: idle bob/twirl + trip-settle still endpoints with full-motion gate proof; dual-scene running-pose differential (pivot/arms/legs/rig/shadow equal, snap grid diverges)
  - `tests/polish.test.js`: dual-boot HUD byte-identity differential under reducedMotion; boot-time style+buffer writes pre-resize; orientationchange source-scan
- **Mutation proofs (each reverted byte-identical after the run):** removing the `reduced ? 0 :` idle dampen and the settle-shake gate fails the endpoints leg; branching the shadow opacity on `reduced` fails the pose-identity leg; leaking `reducedMotion` into `hudPrompt.textContent` fails the HUD-differential leg; commenting out the boot `applyWindowSize()` call fails the boot-size leg — every new test can fail on a real violation
- **Hitstop (Open Q3 "stays"):** covered by the existing Phase-4 drain-gate legs in `tests/feelcap.test.js`/`tests/juice.test.js` — the render3d dampen never touches `stopUntil` (source-audited: the only `reducedMotion` references in `js/shell.js` are the matchMedia read/subscription and the view-payload field — none near the drain gate)
