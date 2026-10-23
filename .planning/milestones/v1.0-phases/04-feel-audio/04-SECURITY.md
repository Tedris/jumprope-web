---
phase: "04"
slug: "feel-audio"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-22"
---

# Phase 04 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| press parameter → sim state | Shell-supplied truthy value arms the forgiveness buffer; only truthiness is read (js/game.js:50) | Boolean-ish signal, no object trust |
| sim events → shell juice / audio | Plain interned strings from a fixed alphabet; unknown names ignored by table lookup (js/audio.js:164-167, js/shell.js:250-252) | Event strings, no payloads |
| shell view record → WebGL layer | juiceSig is a read-only { at, shake, particles } snapshot; render3d never writes back | Cosmetic snapshot |
| user gesture → AudioContext | Autoplay-policy gate; create-once, resume-only afterwards (js/audio.js:53-71) | Gesture origin |
| storage JSON → settings | Hand-editable localStorage payload (jumprope-audio) parsed back into control state | Untrusted client storage |
| fetch(track) → decodeAudioData | Same-origin relative asset fetch parsed by the browser decoder | Audio bytes |
| scripted input → shell state machine (tests) | Synthetic key/pointer events cross the same reducers as human input — no privileged back-doors | Input events |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-4-01 | Tampering | run.buffer via NaN/negative arithmetic | low | mitigate | VERIFIED: js/game.js:49 `Math.max(0, (run.buffer ?? 0) - dt * (ropeMul ?? 1))` with constant re-arm at :50; decay-to-exactly-0 offset-matrix tests (tests/feel.test.js:48-61); finite-assert idiom (tests/headless-sim.test.js:61-62,148) | closed |
| T-4-02 | Denial of Service | event list growth | low | mitigate | VERIFIED: `const events = []` created per tickRun call (js/game.js:52), returned per call (:100); max 4 pushes per path; shell consumes per-frame (js/shell.js:243) — never accumulated across steps | closed |
| T-4-03 | Denial of Service | stopUntil runaway (hitstop stacking) | low | mitigate | VERIFIED: deadline not counter — `stopUntil = Math.max(stopUntil, now + tier.hitstop)` (js/shell.js:254), gate `if (now < stopUntil) break` (:235), acc clamp 0.25 s (:229) bounds catch-up regardless | closed |
| T-4-04 | Denial of Service | particle pool exhaustion | low | accept | VERIFIED by design: fixed 16-quad pool built ONCE (js/render3d.js:257-267); spawns clipped `Math.min(view.juice.particles ?? 0, PARTICLE_POOL)` (:419) — pool size is a hard ceiling — see Accepted Risks Log | closed |
| T-4-06 | Tampering | loadSettings JSON.parse of jumprope-audio | low | mitigate | VERIFIED: shape-pinned read `s.muted === true` + `Math.min(1, Math.max(0, Number(s.volume) || 1))` in try/catch → defaults (js/audio.js:12-23); junk / out-of-range / throwing-storage stubs (tests/audio.test.js:195-197); shape-pinned write (:199-200) | closed |
| T-4-07 | Spoofing | track URL fetch | low | accept | VERIFIED: only URL is the same-origin relative constant `audio/track.ogg` (js/audio.js:8); playTrack url param has no external caller path; failure sets `trackMissing` flag + silence, never a retry loop (js/audio.js:76-99) — see Accepted Risks Log | closed |
| T-4-08 | Denial of Service | context creation per gesture | low | mitigate | VERIFIED: create-once state machine — construction only in the `!ctx` branch, every later gesture is resume-only (js/audio.js:53-71); tested exactly-one-gain + idempotent-past-init (tests/audio.test.js:115-129) | closed |
| T-4-09 | Tampering | test-only globals leaking into shipping assertions | low | mitigate | VERIFIED: all stubs installed/restored inside bootCap dynamic data-URL import window (tests/feelcap.test.js:194-216,253; save/restore :182-189,256-271 — shell.test.js:90 proven mechanism); audio-free clean-boot leg runs with no audio stub and asserts byte-identical phase/score timelines (:209-217,452-455) | closed |
| T-4-10 | Denial of Service | runaway scripted runs (poll loops) | low | mitigate | VERIFIED: budget-guarded poll loops — frame-budget loop with diagnostic `assert.fail` labeled T-4-10 (tests/feelcap.test.js:299,343,395); juice harness guards (tests/juice.test.js:130,141,213-220) — a stuck script fails as a test, never as a hang | closed |
| T-4-SC | Tampering | dependency installs (all 4 plans) | high | accept | VERIFIED: zero new packages — package.json unchanged since scaffold (no deps, no lockfile); importmap untouched at pinned three@0.186.1 (index.html:12); audio.js imports nothing (procedural synthesis, D-N07); feelcap graph audit enforces audio containment — see Accepted Risks Log | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

Note: register IDs skip T-4-05 (no such row in any plan threat_model); all registered rows above are accounted for. No SUMMARY.md Threat Flags were raised during execution — no unregistered attack surface.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-04-01 | T-4-04 | Particle spawns clip at the fixed 16-quad pool by design (D-N12 counts small and pooled); pool exhaustion is unescalating by construction | planner register (04-02-PLAN) | 2026-10-22 |
| AR-04-02 | T-4-07 | Track URL is a same-origin relative constant; no configurable URL path crosses into fetch; failure degrades to a silence flag — no attacker-controllable target exists | planner register (04-03-PLAN) | 2026-10-22 |
| AR-04-03 | T-4-SC | Zero new packages across the whole phase; no install task exists to gate; supply-chain surface unchanged (pinned importmap, audio.js dependency-free) | planner register (04-01..04-04-PLAN) | 2026-10-22 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-22 | 10 | 10 | 0 | gsd-secure-phase (execute-phase verify:post) |

Evidence basis: code grep/read of js/game.js, js/shell.js, js/render3d.js, js/audio.js, tests/feelcap.test.js, tests/feel.test.js, tests/juice.test.js, tests/audio.test.js, tests/headless-sim.test.js; suite green (98/98, node --test tests/).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-22
