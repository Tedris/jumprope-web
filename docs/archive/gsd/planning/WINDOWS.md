---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-10-17T02:48:42.389Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 02 | unrun-verify | js/render3d.js |  | End-of-phase UAT owes the three deferred human-checks of plan 02-03 (theta-feet beat coincidence, shadow/stage readability, idle/trip personality) | open |  | 2026-10-17T02:48:42.389Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "02",
    "file": "js/render3d.js",
    "line": null,
    "description": "End-of-phase UAT owes the three deferred human-checks of plan 02-03 (theta-feet beat coincidence, shadow/stage readability, idle/trip personality)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-17T02:48:42.389Z",
    "resolved_at": null,
    "milestone": null
  }
]
````
