---
status: testing
phase: 01-render-shell-foundation
source: [01-VERIFICATION.md]
started: 2026-10-15T00:00:00Z
updated: 2026-10-15T00:00:00Z
---

## Current Test

number: 1
name: Browser full-run smoke (SC-1, SC-4 perceptual half, T-01-SC load verification)
expected: |
  WebGL flat-box scene renders; obstacle syncs with skip scoring with no visible drift;
  HUD shows score/best/status; run restarts cleanly; three.module.js and three.core.js
  both load 200 from cdn.jsdelivr.net via the pinned importmap.
awaiting: user response

## Tests

### 1. Browser full-run smoke (SC-1, SC-4 perceptual half, T-01-SC load verification)
expected: Serve the repo (`python3 -m http.server`), open index.html. Devtools Network: `three.module.js` and `three.core.js` both 200. Play one full run idle → running → choose → over; jump with space/tap; watch the obstacle sweep against scoring; restart from over. WebGL flat-box scene renders; obstacle syncs with skip scoring with no visible drift; HUD shows score/best/status; run restarts cleanly.
result: [pending]

### 2. Drift-under-load wrap check (SC-4)
expected: With devtools CPU throttling (4–6x), play a run and watch the obstacle sweep across the rope-phase wrap (once per revolution). Obstacle keeps sweeping forward through the wrap — no visible snap-back or drift from scoring.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
