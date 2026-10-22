---
phase: 05
review: 05-REVIEW.md
titles: json
findings:
  - id: CR-01
    severity: critical
    disposition: open
    title: "Visible-tab `audio.gesture()` lacks the `!paused` guard — music resumes behind a manual-pause freeze frame"
  - id: WR-01
    severity: warning
    disposition: open
    title: "Hidden `visibilitychange` only routes `releaseEverything()` for the `running` status — a `choose`-status hold can auto-confirm on tab return"
  - id: WR-02
    severity: warning
    disposition: open
    title: "Reduced-motion \"frozen pose\" during idle is not frozen — arms and scarf keep oscillating off the wall clock"
  - id: IN-01
    severity: info
    disposition: open
    title: "Dead `paused` disjunct in the drain gate"
  - id: IN-02
    severity: info
    disposition: open
    title: "Fire-and-forget `ctx.suspend()` / `ctx.resume()` Promises can surface as unhandled rejections"
  - id: IN-03
    severity: info
    disposition: open
    title: "Sub-2px windows desynchronize the CSS box from the backing buffer"
open: 6
total: 6
recorded: 2026-10-22T18:54:15.531Z
---

# Phase 05: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| CR-01 | critical | open | - |
| WR-01 | warning | open | - |
| WR-02 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
