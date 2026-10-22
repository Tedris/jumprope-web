---
phase: "05"
slug: "accessibility-polish"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-22"
---

# Phase 05 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser events → shell listeners | keydown/visibilitychange/focus payloads are environment-controlled and drive state transitions | event metadata (no sensitive data) |
| harness/stub globals → shell boot | typeof guards decide whether boot survives missing APIs | n/a |
| OS/media query → shell matchMedia read | boolean preference arrives from outside the page; only truthiness is consumed | user preference boolean |
| view payload → render3d | one-way data; render3d gains no new browser-API access | view flags |
| OS window metrics → shell resize handler | innerWidth/innerHeight are environment-controlled numerics feeding allocation math | viewport dimensions |
| shell canvas dims → render3d passive poll | WebGL RT allocation sized by externally-influenced dimensions | canvas dimensions |
| OS/browser focus & pointer events → shell reducer | blur/pointercancel/visibilitychange are externally-timed and can arrive mid-transition | event timing |
| Shell → AudioContext | every suspend/resume route crosses here; a route that resumes without the player asking is a state-spoofing act | audio control |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-05-01 | Spoofing (state) | visibilitychange/focus listeners un-suspending a paused AudioContext | medium | mitigate | `!paused` guard on focus listener (js/shell.js:256) and on the visible-branch gesture (js/shell.js:251); press()/release() early-return while paused | closed |
| T-05-02 | Tampering | Stale pressIntent/buffer leaking across pause into the post-resume rhythm | low | accept | D-12 clearing in enterPause (js/shell.js:169); residual same-frame race has no gameplay impact beyond one forgiven skip | closed — below high threshold (non-blocking) |
| T-05-03 | Tampering | Unguarded `window.matchMedia` crashing data-URL harness boot | medium | mitigate | typeof-guard (js/shell.js:106-107) short-circuits to reducedMotion=false; full-suite boot leg passes | closed |
| T-05-04 | Information Disclosure | Persisting the OS reduced-motion preference | low | accept | No write path — boolean kept in closure var only (js/shell.js:108); D-06 forbids persistence, no new localStorage key | closed — below high threshold (non-blocking) |
| T-05-05 | Tampering/DoS | NaN/0/Infinity viewport metrics poisoning internalW → WebGL allocation failure | medium | mitigate | `Number(x) \|\| 480/640` coercion as sole input gate (js/shell.js:25); `Math.max(2, ...)` floor (js/shell.js:48); band math runs post-coercion | closed |
| T-05-06 | DoS | Rapid resize-storm thrashing WebGLRenderTarget recreation | low | accept | Amortized: render3d reallocates only when its passive poll sees a changed canvas size (js/render3d.js:333-340); shell handler is O(1) arithmetic | closed — below high threshold (non-blocking) |
| T-05-07 | Spoofing (state) | blur/pointercancel arming releaseIntent in 'over' status → silent run restart | medium | mitigate | releaseEverything arms releaseIntent only when status 'running' with a live hold; over-status no-op pinned by Test 4 | closed |
| T-05-08 | Tampering (state) | Stuck holdFrom/pressIntent surviving an interruption → phantom jump | medium | mitigate | Shared releaseEverything (js/shell.js:150) + enterPause clearing (D-12), pinned by airborne-and-no-second-jump legs | closed |
| T-05-09 | Spoofing (state) | visibilitychange VISIBLE branch — audio.gesture() without !paused un-suspends a player-paused context (CR-01) | medium | mitigate | `audioReady && !paused` guard on fallback (js/shell.js:251); red-green pinned by Leg A (suspended state + log.gestures unchanged) | closed |
| T-05-10 | Tampering (state) | visibilitychange HIDDEN branch — choose-status card hold survives backgrounding on blur-less platforms (WR-01) | medium | mitigate | releaseEverything() hoisted to run unconditionally on the hidden leg (js/shell.js:244); pinned by Leg B (no confirm after 800 ms background gap) | closed |
| T-05-SC | Tampering | npm/pip/cargo installs | high | mitigate | No packages this phase; importmap pinned three@0.186.1 (index.html:12); package.json stays dependency-free | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-05-01 | T-05-02 | D-12 enterPause clearing covers the leak; residual risk is a same-frame race with no gameplay impact beyond one forgiven skip | phase plan 05-01 threat register | 2026-10-22 |
| R-05-02 | T-05-04 | No write path exists — reduced-motion boolean kept in a closure var only; D-06 forbids persistence, no new localStorage key ships | phase plan 05-02 threat register | 2026-10-22 |
| R-05-03 | T-05-06 | Resize thrash already amortized by render3d's changed-size passive poll; shell handler is O(1) arithmetic — unthrottled per RESEARCH | phase plan 05-03 threat register | 2026-10-22 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-22 | 11 | 11 | 0 | gsd-secure-phase (verify:post hook) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-22
