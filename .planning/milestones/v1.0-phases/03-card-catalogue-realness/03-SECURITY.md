---
phase: "03"
slug: "card-catalogue-realness"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-17"
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Catalogue constants → DOM HUD | In-repo card strings (`name`/`icon`) cross into the page via `updateHud` | Static in-repo data (no secrets) |
| Catalogue constants → prompt CSS class | `card.color` becomes part of `hudPrompt.className` | Static enum value |
| `run.owned` key space | Owned-card keys must remain catalogue ids only | In-run data, catalogue-sourced only |
| RARITY_WEIGHT/caps data → player-visible odds | Pure data edits silently change economy | Source constants, no runtime input |
| Stacked effects → rope sampling | Extreme ropeMul stacking could stall progression | Sim state |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-3-01 | Tampering | js/shell.js `updateHud` (offer lines + `#hud-owned` DOM writes) | low | mitigate | All HUD writes are `.textContent` only (`js/shell.js:138-144, 160`); strings concatenated from in-repo `CARDS` constants; zero `innerHTML`/`insertAdjacentHTML`/`outerHTML`/`document.write` in `js/` | closed |
| T-3-02 | Tampering | `run.owned` record keys (`applyCard` spread) | low | accept | Only owned-key write is `{ ...run.owned, [card.id]: ... }` (`js/game.js:71`); card originates exclusively from `CARDS` via `pickOffers`; `localStorage` touches only numeric `jumprope-best` — prototype-pollution unreachable — see Accepted Risks Log | closed |
| T-3-03 | Denial of Service | tickRun cadence hook — freeze on empty offer pool | medium | mitigate | `tickRun` enters `choose` only when `offers.length > 0` (`js/game.js:49-52`); pinned by `tests/catalogue.test.js:79-91` and `tests/headless-sim.test.js:44-45, 74-82` | closed |
| T-3-SC | Tampering | dependency installs | high | accept | Zero new packages (`package.json` byte-unchanged across phase); `three@0.186.1` importmap pin untouched — see Accepted Risks Log | closed |
| T-3-06 | Tampering | `className` toggle from `card.color` | low | mitigate | `role-` + color drawn only from five in-repo values; `css/style.css:29-33` defines exactly those five classes; `tests/catalogue.test.js:20,30` fences the color set; className reset outside `choose` | closed |
| T-3-07 | Integrity | RARITY_WEIGHT / cap values | low | accept | Module constants, no runtime mutation path; 2000-draw seeded odds-ordering trial (`tests/catalogue.test.js:53-64`) + cap flip test catch economic collapse — see Accepted Risks Log | closed |
| T-3-08 | Denial of Service | rope phase sampling under stacked ropeMul (feet-window blackout) | low | mitigate | Machine-enforced bound: capped ropeMul per-card band [0.6, 1.5], worst-case product [0.6, 3] vs ~15.6 s blackout onset (`tests/headless-sim.test.js:143-154`); per-card-at-cap 1000-tick variants green; `js/rope.js` byte-identical across phase range | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-3-02 | `run.owned` keys constructed solely from in-repo CARDS ids; no path accepts external input into the key space — prototype-pollution unreachable | planner register (03-01-PLAN) | 2026-10-17 |
| AR-03-02 | T-3-SC | Zero new dependencies this phase; `package.json` byte-unchanged, `three@0.186.1` importmap pin untouched | planner register (03-01-PLAN) | 2026-10-17 |
| AR-03-03 | T-3-07 | Rarity weights/caps are in-repo constants with no runtime mutation path; odds-ordering trial catches economic collapse — data-review concern, not a runtime attack surface | planner register (03-02-PLAN) | 2026-10-17 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-17 | 7 | 7 | 0 | gsd-security-auditor (execute-phase verify:post) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-17 — verdict SECURED (7/7 closed, ASVS level 1 unchanged)
