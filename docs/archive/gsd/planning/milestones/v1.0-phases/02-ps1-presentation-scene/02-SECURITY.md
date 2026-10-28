---
phase: "02"
slug: "ps1-presentation-scene"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-17"
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| App → CDN module graph | Static importmap pins `three@0.186.1` on jsdelivr; only the bare `three` specifier may appear in shipping code | Remote module code executed in origin |
| Sim core → render layer | Read-only `view` payload objects cross the ARCH-01/ARCH-02 fence each frame | Game state (no secrets) |
| Browser window → canvas buffer | Untrusted/extreme client sizes feed render-target size math | Client geometry |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Tampering | spike importmap URL | high | mitigate | URL byte-identical to `index.html:12`; automated gate greps spike for other CDN hostnames; `index.html` untouched (verified in 02-VALIDATION 02-01/T1) | closed |
| T-02-02 | Tampering | importmap scope creep (addons / TSL retroPass) | medium | mitigate | Core-only mandate; single `three` key in spike importmap; addons need would force `checkpoint:decision` escalation — never exercised | closed |
| T-02-03 | Information Disclosure | spike page source committed under `.planning/` | low | accept | No secrets; `.planning/` committed by project convention; throwaway status documented — see Accepted Risks Log | closed |
| T-02-04 | Denial of Service | spike rAF loop stalls on lazy shader compile | low | mitigate | `renderer.compile` on both spike scenes; checklist item (f) screened at sign-off | closed |
| T-02-05 | Denial of Service | render-target churn/alloc storm on resize or HiDPI | low | mitigate | Pixel-ratio locked to 1; re-size only on actual canvas size change; width clamped `Math.max(2, …)` | closed |
| T-02-06 | Tampering | new import specifiers expanding CDN surface | medium | mitigate | Gate `! git grep -n "three/addons" -- js/` green; `index.html` importmap untouched | closed |
| T-02-07 | Tampering | malformed/partial view objects → NaN transforms | low | mitigate | `??`-coercion at every view field read; contract-pin stub exercises undefined-field path in CI | closed |
| T-02-08 | Spoofing | pose animated from renderer-side time source (false timing reference) | medium | mitigate | All running-pose quantities derive from `lerpPhase` theta; `view.now` gated to idle/trip cosmetics | closed |
| T-02-09 | Tampering | RNG in the render path (trip shake) | low | mitigate | Closed-form damped sines of `view.now`; automated rng-scan gate green | closed |
| T-02-10 | Denial of Service | per-frame geometry/rig rebuild → GC churn | medium | mitigate | Curve/tube/rig built once in `createScene`; automated gate fails on geometry constructors in render path | closed |
| T-02-11 | Tampering | render layer mutating shared view objects | low | mitigate | Own-property reads only, no writes; no sim module imported by `js/render3d.js` (boundary fence green) | closed |
| T-02-12 | Denial of Service | lazy shader compile at first gameplay frame | low | mitigate | Two `renderer.compile` calls inside `createScene`; load/first-press screened (browser pass deferred to phase UAT) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-03 | Spike source under `.planning/` contains no secrets; committed by project convention (commit_docs=true) | planner register (02-01-PLAN) | 2026-10-16 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-17 | 12 | 12 | 0 | gsd-secure-phase (execute-phase verify:post) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-17
