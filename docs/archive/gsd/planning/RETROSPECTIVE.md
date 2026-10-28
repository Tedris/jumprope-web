# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — PS1 Demake

**Shipped:** 2026-10-22
**Phases:** 5 | **Plans:** 18 | **Sessions:** ~10 (est. from git history)

### What Was Built

- Canvas 2D prototype evolved into a PS1-style WebGL game (low-res RT, vertex snap, Bayer dither) with the pure sim core untouched and Node-testable throughout
- Original low-poly skipper + stage, rope readable purely from the frame (fixed camera, blob shadow, canonical phase clock)
- Real pick-two card game: 8 original cards across 5 roles, rarity, caps, dead-pick filtering, owned-card HUD, 1000-tick headless balance gate
- Feel + audio layer: ~0.1s input buffer, near-miss callouts, significance-scaled juice, 5 procedural WebAudio SFX, persisted mute/volume, no beat-lock
- Accessibility & shell hardening: pause/hidden-tab handling, prefers-reduced-motion, letterbox resize, input-loss routing

### What Worked

- Securing the pure-core/shell boundary first (Phase 1) made every later phase cheaper — the ARCH boundary fence test caught taint attempts mechanically
- Look-spike → sign-off → verbatim port (Phase 2) avoided endless aesthetic churn; canonical values in `## Look Decisions` were portable as-is
- Tracer-bullet wave plans (walking skeleton first, then expansion) kept the game playable end-to-end at every commit
- Dependency-injected rng and one-button reducer pattern kept a growing feature set fully deterministic and testable

### What Was Inefficient

- Phase 1 shipped a `createScene` return-contract TypeError that froze the rAF loop — caught only at verification (gap-closure plan 01-03); a contract pin should ship with the first tracer
- Phase 4 verification surfaced UAT deferrals (music track content) and a pause-audio state-spoofing gap (CR-01) late; gesture-guard tests were thin before that phase
- Milestone close found two stale artifacts (debug session, todo) left open after their fixes shipped — close hygiene at phase level would have kept the audit clean

### Patterns Established

- Frozen-test discipline: original test files byte-identical across the whole milestone; new behavior pinned by new test files only
- One shared handler per cross-cutting concern (releaseEverything, snapGridFor, resumeRun) instead of per-path duplication
- Metadata-derived test expectations (derive from card records, not hardcoded tables) so catalogue growth can't flake the suite

### Key Lessons

1. Pin factory return contracts with a Node-side contract test in the same plan that introduces them
2. Gesture/audio guards deserve red-green test legs at the moment the guard is written, not at verification
3. Close debug sessions and todos in the phase that resolves them — don't let them leak to milestone audit

### Cost Observations

- Model mix: adaptive profile (not tracked per-plan)
- Notable: per-plan durations averaged ~9 min of execution; 42 tasks / 18 plans, no plan required repair loops beyond the two gap-closure plans (01-03, 05-05)

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~10 | 5 | Brownfield milestone built on tracer-bullet waves + mechanical boundary fences |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 42+ (Node) | All 22 v1 requirements traced | 1 (three@0.186.1 via importmap, render shell only) |

### Top Lessons (Verified Across Milestones)

1. Secure the architecture boundary before painting features — everything downstream prices against it
2. Determinism as a test asset (injected rng, phase-clock everything) pays off in every later phase
