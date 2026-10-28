---
phase: 03-card-catalogue-realness
verified: 2026-10-17T17:20:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/03-card-catalogue-realness/03-01-PLAN.md"
  - ".planning/phases/03-card-catalogue-realness/03-01-SUMMARY.md"
  - ".planning/phases/03-card-catalogue-realness/03-02-PLAN.md"
  - ".planning/phases/03-card-catalogue-realness/03-02-SUMMARY.md"
  - ".planning/phases/03-card-catalogue-realness/03-03-PLAN.md"
  - ".planning/phases/03-card-catalogue-realness/03-03-SUMMARY.md"
  - "css/style.css"
  - "index.html"
  - "js/game.js"
  - "js/shell.js"
  - "js/upgrades.js"
  - "tests/catalogue.test.js"
  - "tests/headless-sim.test.js"
  - "tests/pickflow.test.js"
  - "tests/shell.test.js"
covered_digest: "v3:sha256:58469540628e1932ec87b5bd563c81260753f9495d4bcd2001226da23c077c2a"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Browser pick-gesture feel: cold-load the page, play to the skip-10 freeze, browse offers with presses, confirm with a ~0.8 s hold, and re-enter the run"
    expected: "The freeze → browse → hold → single flash → lead-in re-entry rhythm reads as deliberate without a tutorial; a still-held confirm-release never launches an early jump; an early release cancels cleanly with the cursor staying put"
    why_human: "Perceptual timing/feel judgment (03-01 coverage D5 explicitly flagged human_judgment; RESEARCH sampling-rate note). The scripted pickflow test proves the state machine; it cannot certify the feel band locked by D-03. Scheduled end-of-phase per human_verify_mode."
  - test: "HUD readability at window size: during a freeze, read the multi-line offer prompt (cursor, icon, name, ×owned/cap readout, fill cue, role tint) and the owned-card icon strip"
    expected: "Every offer line is legible, the highlighted line's role color is obvious at a glance, the fill cue is visible only on the active line, and the owned strip tracks picks"
    why_human: "Visual legibility of the DOM prompt at real render sizes (ROADMAP criterion 2 'at-a-glance', criterion 4 'sees icon strip') — grep proves the strings and classes exist, not that they read."
  - test: "PS1 scene smoke: play a short run through the Three.js shell after the HUD additions"
    expected: "Scene renders at full window size, no first-frame shader freeze, the dithered PS1 look is unchanged by the #hud-owned addition"
    why_human: "Render pipeline untouched this phase (render3d.js not in any plan's files_modified), but the end-of-phase UAT includes a scene smoke per the phase verification sections; only a browser confirms."
---

# Phase 3: Card Catalogue Realness Verification Report

**Phase Goal:** The pick-two moment becomes a real decision — an expanded, balanced original catalogue where every offer is meaningful and every choice lands
**Verified:** 2026-10-17T17:20:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

> Note: the phase is marked `mode: mvp` but the ROADMAP goal string is not in User Story form (`user-story.validate` → valid: false). 03-01-PLAN carries the derived user story ("As a player, I want to choose which card my run takes with the same one button I jump with…"), so verification proceeded goal-backward against the five ROADMAP success criteria rather than blocking; slotting a User Story goal into ROADMAP via `/gsd-mvp-phase 3` would close this formal gap.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Player chooses 1 of 2–3 offered cards at cadence pauses; the chosen card applies instantly; every offer is reachable; never silently `offer[0]` (CARD-01, SC1) | ✓ VERIFIED | `grep -cF "run.offer[0]" js/shell.js` → 0; shell pick reducer (`js/shell.js:61-121`) cycles modulo `offer.length`, confirms on ≥800 ms hold while held; behavioral test `pickflow "hold confirms once while held; release and lock never charge a jump"` passes — asserts `owned[picked.id] === 1`, effects applied instantly, vy monotonically decaying after confirm (no release-charged jump). Offer size 2→3 via `offerCount` (`js/upgrades.js:76-78`), `catalogue "offer size escalates 2 -> 3 beyond skip 30"` green. |
| 2 | Cards have at-a-glance identity (name, icon, role color) and rarity that visibly affects drop odds (CARD-02/03, SC2) | ✓ VERIFIED | All 8 records carry name/icon/role/color/rarity (`js/upgrades.js:1-28`); role-class toggle follows the cursor and clears outside choose — asserted in `pickflow` (className assertions, lines 174-193, 242); 2000-draw seeded trial proves common > uncommon > rare (`catalogue "rarity skews draws measurably"`, `RARITY_WEIGHT` 70/25/5 at `js/upgrades.js:34`). Perceptual "at-a-glance" legibility routed to human items 2. |
| 3 | Cards stack to visible per-card caps; offers filtered so a dead pick can never appear (CARD-04/05, SC3) | ✓ VERIFIED | `isAvailable` flips exactly at cap (`js/upgrades.js:40-42`); `pickOffers` filters availability first (`js/upgrades.js:48`); `' ×owned/cap'` readout on every offer line (`js/shell.js:125-135`, pickflow asserts `/×\d+\/\d+/` per line); capped card never offered across seeded trials + shrink-to-1 + all-capped-empty pool skips the freeze (`catalogue` tests 5-6, `js/game.js:47-52`). |
| 4 | Player sees owned cards as an icon strip during the run (CARD-06, SC4) | ✓ VERIFIED | `#hud-owned` span (`index.html:23`) ← `updateHud` catalogue-order glyphs from live `run.owned` (`js/shell.js:140-144`); pickflow asserts strip empty pre-pick and containing the picked icon post-confirm (lines 162, 245). |
| 5 | Catalogue holds 6–10+ original cards spanning margin/volume/risk/foundation/pace and passes a 1000-tick headless scripted-card simulation (no NaN, phase in safe wrap bounds, one score event per cycle) (CARD-07, SC5) | ✓ VERIFIED | 8 records, role set = exactly the five roles (`catalogue "roster breadth"`); `tests/headless-sim.test.js` 11 tests green: neutral + picks-land + 8 per-card-at-cap variants, per-tick finite/`phase ∈ [0,1)` asserts, `scoreEvents ≥ cycles`, plus the metadata-derived ropeMul cap-policy bound (capped per-card ∈ [0.6, 1.5], worst product 0.9145 ∈ [0.6, 3]) closing the STATE.md rope-wrap blocker; `js/rope.js` byte-identical since plan start (`git diff dec6c27 HEAD -- js/rope.js` empty). |

PLAN-frontmatter truths across the three plans (cycling/wrap, hold-confirm, lead-in re-entry via shared `leadIn()` with D-07 input lock, empty/single-pool handling, icon strip, cap readout, role coverage, rarity odds, escalation, encoding-by-id, 1000-tick gate, ropeMul bound) all restate or refine the five criteria above and are covered by the same evidence.

**Score:** 5/5 truths verified (0 present, behavior-unverified — the two behavior-dependent truths, D-07 input lock and confirm-while-held, each have a passing named behavioral test in pickflow).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `js/upgrades.js` | CARDS (8 records + metadata), UPGRADES alias, RARITY_WEIGHT, pickOffers, isAvailable, offerCount, pickTwo shim | ✓ VERIFIED | All exports present and substantive (`js/upgrades.js`); inverse-CDF + splice-removal draw mutates nothing; `freshEffects` untouched at 4 keys. |
| `js/game.js` | leadIn/resumeRun/applyCard, `owned` on createRun, pickOffers+offerCount hook in tickRun, empty-pool no-freeze | ✓ VERIFIED | `js/game.js:15-28,31,47-52,67-74`; ARCH-02 single lead-in path; forbidden phase-init literal absent (boundary.test.js green). |
| `js/shell.js` | Pick reducer (cycle/hold-confirm/lock), multi-line prompt, fill cue, flash, icon strip, role-class toggle | ✓ VERIFIED | Full reducer at `js/shell.js:34-135`; zero `run.offer[0]`; all HUD writes `.textContent` only (T-3-01 holds — no innerHTML in shell.js). |
| `index.html` | `#hud-owned` span | ✓ VERIFIED | `index.html:23`; matches bootShell stub map key (`tests/shell.test.js:37`, the sole sanctioned frozen-file diff line). |
| `css/style.css` | pre-line prompt + `.role-sky/.role-slate/.role-amber/.role-mint/.role-ember` | ✓ VERIFIED | `css/style.css:25-33` — all five classes defined, base #hud color untouched. |
| `tests/pickflow.test.js` | bootShell-copy integration proof | ✓ VERIFIED | 5 tests green, real assertions (39 assert sites inspected), no js/ relative imports (boundary-safe harness). |
| `tests/catalogue.test.js` | 8-test seeded unit suite (CARD-02/03/04/05/07) | ✓ VERIFIED | 8 tests green; seeded-LCG trials, no Math.random, no browser IO. |
| `tests/headless-sim.test.js` | 1000-tick criterion-5 gate + cap-policy bound | ✓ VERIFIED | 11 tests green; pure exports only via `import * as game`; `grep -c 'Math\.random'` → 0. |

`verify.artifacts` / `verify.key-links` returned NO_INPUT (plans declare free-form must-haves), so artifact/link checks were performed manually as above.

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `tickRun` cadence hook | `pickOffers(CARDS, run.owned, offerCount(skips), rng)` | `js/game.js:47` | ✓ WIRED | rng is the injected parameter; `Math.random` appears only at the legal `tickRun` default-param line (`js/game.js:34`) and the impure shell's injection (`js/shell.js:21`); boundary.test.js green. |
| shell confirm | `applyCard` → `resumeRun` → `leadIn` | `js/shell.js:111-112` | ✓ WIRED | Shared single lead-in path with `startRun` (`js/game.js:15-28`); headless-sim replays the same routing and asserts `resumed.rope.phase === startRun().rope.phase` (ARCH-02). |
| `index.html #hud-owned` | bootShell hud stub map | `tests/shell.test.js:37` | ✓ WIRED | Both sides present (Pitfall 7 satisfied — same-task edit confirmed in diff of d7c71d5). |
| `run.owned` | `updateHud` icon strip | `js/shell.js:140-144` | ✓ WIRED | Single source of truth; pickflow asserts live reflection of picks. |
| `card.cap` metadata | offer-line `×owned/cap` suffix | `js/shell.js:126-128` | ✓ WIRED | Same metadata `isAvailable` enforces; regex format asserted per line. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| shell offer prompt | `run.offer[pickIdx]` | `tickRun` → `pickOffers` over `CARDS` with injected rng | Yes (live draw, live owned) | ✓ FLOWING |
| shell icon strip | `run.owned` | `applyCard` spread on confirm | Yes (`js/game.js:71`) | ✓ FLOWING |
| `#hud-owned` / prompts | `textContent` writes | live `run`/`CARDS` in the frame loop | Yes | ✓ FLOWING |

No value terminates in a hardcoded stub; the only literals are the in-repo catalogue data itself (by design — static-file game, all tunables inline per AGENTS.md).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite green | `node --test tests/` | 66 pass / 0 fail (914 ms) | ✓ PASS |
| Pick-flow named tests | `node --test tests/pickflow.test.js` | 5/5 pass (incl. the D-03/D-05/D-07 behavioral test, 820 ms real-clock hold) | ✓ PASS |
| Catalogue unit suite | `node --test tests/catalogue.test.js` | 8/8 pass | ✓ PASS |
| Headless-sim gate | `node --test tests/headless-sim.test.js` | 11/11 pass | ✓ PASS |
| Auto-apply debt gone | `grep -cF "run.offer[0]" js/shell.js` | 0 | ✓ PASS |
| Task commits exist | `git merge-base --is-ancestor` ×6 (d7c71d5, 349986d, 1d9dcd2, 2e6db7a, 60e854f, ece6ec6) | all ancestors of HEAD | ✓ PASS |
| Frozen contracts | `git diff --stat dec6c27 HEAD -- <6 frozen tests> js/rope.js` | empty diff (byte-identical); shell.test.js diff = exactly the one stub-map line | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no `scripts/*/tests/probe-*.sh` exists and no PLAN/SUMMARY declares probe scripts for this phase (migration/tooling pattern not applicable).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CARD-01 | 03-01 | Choose 1 of 2–3 at cadence pauses, applied instantly | ✓ SATISFIED | Truths 1; pickflow + catalogue escalation tests green |
| CARD-02 | 03-01, 03-02 | At-a-glance identity: name, icon, role color | ✓ SATISFIED | Truth 2; record-shape test + pickflow className assertions |
| CARD-03 | 03-02 | Rarity affecting drop odds | ✓ SATISFIED | 2000-draw seeded ordering trial |
| CARD-04 | 03-01, 03-02, 03-03 | Visible per-card stack caps | ✓ SATISFIED | Cap readout regex per offer line + isAvailable flip trials + cap-policy bound |
| CARD-05 | 03-01, 03-02 | No dead picks (availability filtering) | ✓ SATISFIED | Filter-first draw, never-offered trials, shrink/empty no-freeze pins |
| CARD-06 | 03-01 | Owned-card icon strip | ✓ SATISFIED | `#hud-owned` wired both sides, pickflow assertions |
| CARD-07 | 03-02, 03-03 | 6–10+ cards across five roles | ✓ SATISFIED | 8 cards, role-set equality test, per-cap sim variants |

All 7 phase requirement IDs are claimed across plans (03-01: CARD-01/02/04/05/06; 03-02: CARD-02/03/04/05/07; 03-03: CARD-04/07) and all appear in REQUIREMENTS.md mapped to Phase 3 — **no orphaned IDs**. CARD-08 is v2/scoped-out of this milestone per REQUIREMENTS.md; not actionable here.

**Prohibitions (PLAN 03-01 must_haves.prohibitions) — all verified absent:**
1. Silent `offer[0]` apply — grep gate 0 occurrences; confirm always applies `run.offer[pickIdx]` (highlighted card), asserted with the specifically-cycled index in pickflow. ✓
2. Capped card in an offer / freeze on unusable offer — filter at `js/upgrades.js:48`, `offers.length > 0` gate at `js/game.js:49`; catalog tests cover both. ✓
3. rng bypass — `Math.random` occurrences limited to the `tickRun` default parameter and the impure shell's injection (`js/shell.js:21`, permitted: the shell is the randomness supplier); boundary.test.js green. ✓

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| js/upgrades.js | 50-57 | Inverse-CDF boundary: `rng() ≥ 1.0` falls through to index 0 (WR-01) | ℹ️ Info (advisory) | `Math.random` never returns 1.0 — production-safe today; only a pathological stub hits it. Tracked open in 03-REVIEW-DISPOSITION.md; not phase-blocking per instructions. |
| js/game.js | 71 | `applyCard` unguarded `run.owned` deref vs `?? {}` elsewhere (WR-02) | ℹ️ Info (advisory) | Every production path constructs runs via `createRun` (which sets `owned: {}`); no reachable failure found. Tracked open. |
| tests/headless-sim.test.js | 65 | Wrap detector counts a resume-teleport as a cycle (WR-03) | ℹ️ Info (advisory) | Latent: no currently-green assertion observes the inflation (pick-variant never asserts cycles). Tracked open — worth closing before a variant does. |
| js/shell.js | 118 | `pickDone` can survive into the next freeze (IN-01) | ℹ️ Info (advisory) | Net-harmless today (cancel branch would no-op). Tracked open. |
| js/game.js | 62-64 | Twin `applyUpgrade`/`applyCard` drift risk (IN-02) | ℹ️ Info (advisory) | `applyUpgrade` kept only for the frozen test. Tracked open. |

No debt markers (TBD/FIXME/XXX) and no stub patterns in any phase-modified file; all handlers persist real state. The 03-REVIEW warnings are advisory per the verification notes and the disposition ledger (6/6 open, none triaged as blocking).

### Human Verification Required

### 1. Browser pick-gesture feel (end-of-phase UAT)

**Test:** Cold-load the page, play to the skip-10 freeze, browse offers with presses, confirm with a ~0.8 s hold, re-enter the run.
**Expected:** The freeze → browse → hold → flash → lead-in rhythm feels deliberate without a tutorial; a held confirm-release never launches a jump; early release cancels with the cursor staying.
**Why human:** Perceptual feel band (D-03) — the scripted test proves the state machine, not the feel. Flagged `human_judgment: true` in 03-01 coverage D5; scheduled end-of-phase per human_verify_mode.

### 2. HUD readability at window size

**Test:** During a freeze, read the multi-line offer prompt (cursor, icon, name, `×owned/cap`, fill cue, role tint) and the owned strip.
**Expected:** Every line legible, role tint obvious at a glance, fill cue only on the active line, strip tracks picks.
**Why human:** Visual legibility at real render sizes can't be grep-certified (ROADMAP criterion 2/4 wording: "at-a-glance", "sees").

### 3. PS1 scene smoke

**Test:** Play a short run through the WebGL shell.
**Expected:** Full-window render, no first-frame shader freeze, PS1 look unchanged by the HUD additions.
**Why human:** render3d.js was untouched this phase, but the phase verification sections schedule a browser scene smoke end-of-phase; only a browser confirms.

### Gaps Summary

No code-side gaps. All 5 ROADMAP success criteria and all 7 requirement IDs are implemented, wired, and pinned by green automated evidence (66/66 suite, frozen contracts byte-identical, debt greps clean, 6 task commits verified as ancestors). The phase is one step from `passed`: the three browser items above, already scheduled for `/gsd-verify-work`, are the only outstanding work. Advisory review warnings WR-01/02/03 and IN-01/02/03 remain open in the disposition ledger and are recommended (not required) before Phase 4; WR-03 in particular is a cheap test-only fix that protects criterion 5's cycle counter as the suite grows.

---

_Verified: 2026-10-17T17:20:00Z_
_Verifier: the agent (gsd-verifier)_
