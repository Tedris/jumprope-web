---
baseline_commit: 2474e27
---
# Chore: pre-6.6 polish — the auto-hop press window + the digit/hitstop gate

Status: done

Ledger origin (verbatim, both items owned here by the user's Epic 5 close batch answer, 2026-11-09):

- `deferred-work.md` :136 — "The game's own lead-in hop is airborne, and presses during it are now DENIED on paths where D-07 never covered them … `startFreshRun` never re-arms `reentryAt` (unlike pause-resume/pick-confirm), so after a cold boot or a death-restart a press beginning during the automatic opening hop is accepted, then denied at release (no voice, no buffer); and the hop's airtime (441.7 ms × `floatMul`) outlives the 450 ms D-07 lock for any Cloud Shoes/Featherweight copy, so post-pick taps in the 450 ms..airtime window do the same — or, with Second Wind owned, SPEND the contact's charge on a launch the player may not have meant … Fix candidates (pick one at UAT): re-arm `reentryAt = performance.now()` in `startFreshRun`; or derive `LEAD_IN_MS` from the hop's physics (`2·400·floatMul/1800`) instead of the bare 450; or a shell-local auto-hop flag routing releases during the flag to the grounded path."
- `deferred-work.md` :143 — "Digit keys confirm during the juice hitstop that the hold-confirm path respects … the freeze-opening `trip`/`skip`/`nearMiss` events open an 80/8/40 ms hitstop during which `consumeIntents`/`tickPick` are frozen, but the digit branch calls `confirmPick()` straight from the keydown listener … The one-line guard (`performance.now() >= stopUntil` in the branch condition) is unagreed timing surface — D-a deliberately chose 'the freeze stays snappy.' … accept as designed or add the guard + a timing leg."

## Why this is a chore, not a 6.2 rider

The user chose the immediate lane at the Epic 5 close ledger check (SUPERSEDES both items' Story 6.2 assignments — see the ledger stamps). The fixes are input-path correctness on ALREADY-SHIPPED semantics; nothing here retunes a number. `LEAD_IN_MS` stays 450 (a 6.2-owned constant — untouched by contract).

## Context — the shipped shape (verified at `2474e27`)

**The constructed lead-in hop.** `resumeRun` (game.js) re-enters through a CONSTRUCTED airborne state — the auto-hop (~441.7 ms airtime × `floatMul` via `jumpVelocity` 400 + gravity 1800; the shell constructs it at THREE re-entry paths: `startFreshRun` `js/shell.js:168` (cold-boot start :388, death-restart :436), `resumeFromPause` :283-285, `confirmPick` :447-454). The player is airborne from frame 0 of every new/re-entered run.

**D-07.** `reentryAt` arms at :285 (pause-resume) and :454 (pick-confirm); the gates `performance.now() - reentryAt >= LEAD_IN_MS` (:384 press-arm, :401 release-fire) DISCARD presses inside 450 ms. Cold-boot/restart paths never arm it → the window never covers their hop. `reentryAt = -LEAD_IN_MS` initial (:141) keeps the first-ever process press live (D-07's own comment :139-140).

**The release discriminator (FR12/FR17).** `consumeIntents` :399-422: `grounded` → launch; `!grounded && clampAirJumps(run.airJumps) >= 1` → Second Wind SPEND; else silent denial (`holdFrom` cleared at :421, no voice, no buffer). During a constructed hop `player.grounded === false`, so:

- Symptom 1 (cold boot / restart): press+release during the hop → `!grounded`, airJumps 0 → **silent denial** (the accepted press dies); with Second Wind owned → **charge SPENT on the hop** the player may not have meant.
- Symptom 2 (post-pick, floatMul > 1.02): the hop outlives the 450 ms lock; taps in `450..airtime` hit the same discriminator past the lock — denial/charge-spend again.

**The hitstop asymmetry.** The frame loop `break`s at :704 (`now < stopUntil`, set at :724 from `JUICE_TIERS` hitstop 80/8/40), freezing `consumeIntents`/`tickPick` — so the HOLD-confirm path respects the freeze; the digit branch (:335-344) calls `confirmPick()` straight from the keydown listener and does not.

### Frozen-safety census

- Candidate A (arm `reentryAt` in `startFreshRun`) would DISCARD presses in the hop's first 450 ms on a cold boot — the first scripted-jump windows sit at ~260–364 ms; and it fixes nothing for symptom 2 (the lock still ends before the floatMul-stretched hop). REJECTED.
- Candidate B (derive `LEAD_IN_MS` from physics) retunes an Epic 6-owned inline constant — out of a chore's authorization. REJECTED.
- Candidate C (a shell-local auto-hop flag routing releases during constructed hops to the grounded path) is chosen below: it makes constructed hops NEVER deny or spend — on every path, including floatMul-stretched post-pick hops — touches no constant, arms nothing new in D-07.

Create-time census claimed NO existing leg could go red — **DEVIATED** (found in dev 2026-11-09): `tests/secondwind.test.js` leg 9 (:440) pinned the lead-in-hop DENIAL itself. Resolution: the one-shot grace clear in D1 + R2's comment-only re-contract below. Every OTHER frozen shell-cap leg verified green against the delta (their airborne windows are post-landing player-driven flights where the flag is already cleared).

## Decisions (baked — `[DECIDED-BY-CREATE]`)

- **D1 — one flag, all hop constructions, the grounded path, ONE-SHOT grace.** Add `let leadInHop = false;` beside the D-07 block. ONE shared helper (`armLeadInHop()` — house rule, AGENTS.md shared handler): sets `leadInHop = true`; called at the three constructed-hop sites only — `startFreshRun` (one write inside it covers :388 + :436), `resumeFromPause`, `confirmPick`. In the release branch's `running` arm (:401 region): compute `const grounded = player.grounded || leadInHop;` — a release during a constructed hop takes the grounded launch path (never `airLaunch`, never spends a charge). **The grace is one-shot:** clear the flag (`leadInHop = false`) on EVERY release that takes the grounded path — the grace launch itself (`!player.grounded && leadInHop`) or the first grounded release; airborne releases after the flag is cleared behave exactly like v1 (denial, or a charge when owned) and clear nothing. `airLaunch` keeps its `!grounded && clampAirJumps(...)` shape verbatim — it becomes false automatically whenever `grounded` is true. D-07's `reentryAt` law, sites, and `LEAD_IN_MS` are BYTE-UNTOUCHED; inside a D-07 window behavior is unchanged (the press is discarded before the release branch — the flag cannot leak a jump past the lock). Consequence (named, pinned by L6): a second tap during the replacing flight behaves like the equivalent v1 airborne press — NO grace chain, no infinite flight without a card.
- **D2 — the digit guard.** The digit branch (:335 region) gains `&& performance.now() >= stopUntil` in its outer condition. Post-guard, the digit path and the hold path respect the freeze identically (shared-handler law — the SAME freeze window, both confirmation paths); the freeze is ≤80 ms, the "snappy" complaint caps there. Outside `choose`/out-of-range stay fully inert (no preventDefault) — unchanged.
- **D3 — semantics of a hop-tap launch.** `jump()` overwrites vy from the airborne state — a tap during the hop replaces the remainder of the auto-hop with a player-driven jump (the ledger's own note: "the launch itself is AC1-correct and refreshes on landing"). No landing bookkeeping changes (game.js untouched).
- **D4 — NEW suite `tests/leadinhop.test.js`, boot fork #6 (counted for the consolidation chore).** Donors: `pickerhud.test.js` `mk()`/`fire()` DOM + virtual-clock boot (the timing legs need a controllable clock — the pickerhud `:93` `performance` stub idiom is the ONLY sane way to cross 441.7/450/80 ms windows deterministically) + the `secondwind.test.js` boot shape (doublejump state). ≤3 boots. Ledger: add a fork-#6 row at review close ONLY if the suite adds a sixth boot fork.

## R1 — the two census allow-set appends (written authorization — the creation-window mechanism, 5.4/5.5/5.6/5.7 precedent verbatim)

This story's creation commit makes `git diff <BASE>` list the NEW artifact path `_bmad-output/implementation-artifacts/pre-66-polish.md`, so BOTH diff-census legs — `ceilingbreak` §6 (`tests/ceilingbreak.test.js`, BASE `5659fd4`) and `summitapproach` §4.3 (`tests/summitapproach.test.js:827-891`, BASE `2c3e693`) — read red until the path joins their `allowed` Sets. R1: append the exact string `_bmad-output/implementation-artifacts/pre-66-polish.md` to each of the two `allowed` Set literals — list-only additions, no deletions, nothing else in either file. Kickoff gate = **527/529 with exactly those two reds, named**; after R1: green again.

## R2 — written re-contract of `tests/secondwind.test.js` leg 9 + the one-shot clear (frozen-leg conflict found in dev, 2026-11-09)

Dev ran deterministically red on `tests/secondwind.test.js:440` "denied press forgives nothing": its no-card airborne window IS the constructed lead-in hop's descent (the leg's own comment :447-450 — press at 16..24 px falling) and it asserts `countLaunches === 0` (:460) — pinning the exact denial ledger :136 declares the planning gap ("presses during the game's own auto-hop are never silently rejected"); THIS story ships the replacement behavior, which per AGENTS.md is the only authority to re-contract a frozen leg.

Dev's proof (2026-11-09): a comment-only fix is mechanically FALSE — the leg's opening keydown is consumed by the IDLE arm (`startFreshRun`, :387-388: pressIntent nulled, `holdFrom` NEVER armed), so its keyup dies on the `holdFrom !== null` conjunct (:407) — no launch, the flag stays armed through the whole constructed hop, and the `pressCycle` release is the FIRST consumer: it LAUNCHES under any flag placement. And it must be irreconcilable: pressCycle's state (airborne, inside a constructed hop, past the press gate, no card) IS story-L1/L3's mandated launch state. Leg 9's honest re-contract therefore moves its airborne window OFF the constructed hop, exactly like its sibling legs 6-10 (:418's "grounded twin first" idiom): AUTHORIZED DELTA = ONE inserted line `groundedJumpAtWindow(env);` between :450 and :451 (the file's own helper at :303) + the window-attribution comment :447-450 (now: the descent is the GROUNDED-JUMP flight's) + the :461 message only if it claims the hop. Every oracle line survives BYTE-IDENTICAL (:443-446, :451-466). Verified trace (dev): grounded launch at ~1190 ms CONSUMES the flag one-shot → the search loop finds the launch flight's 16..24 px descent ~1560 ms (inside the 200-pump bound, before `t0`) → `pressCycle` is the SECOND consumer → v1 silent DENIAL → no buffer arm → the forced crossing still TRIPS.

The one-shot clear stays load-bearing: it is what makes the grounded jump consume the flag so pressCycle lands on denial (without it, pressCycle launches and leg 9 reds). **Leg L6** (in `leadinhop.test.js`): cold boot, no card — hop tap launches, then a SECOND airborne tap during the replacing flight is DENIED (`countLaunches` delta 0). Mutant M6 = clear-on-grounded-observation-only → L6 and secondwind leg 9 red.

**R2 census append (same mechanism as R1).** Two paths join each `allowed` Set, list-only, beside the `pre-66-polish.md` line: (a) `tests/secondwind.test.js` — the R2 delta legitimately changes it from the census BASE; (b) `tests/leadinhop.test.js` — invisible to `git diff` while UNTRACKED (ledger :179's blind spot), it becomes census-visible the moment the close-commit tracks it, so it joins NOW (every 5.x suite joined the same way). After the append: both census legs green, secondwind leg 9 green — 535/535 with the new suite counted.

## Contract (binding)

- Files: `js/shell.js` (flag + one release-branch pair + helper + digit guard), NEW `tests/leadinhop.test.js`, `tests/secondwind.test.js` (R2's delta: ONE inserted `groundedJumpAtWindow(env);` line + attribution comment; all oracle lines byte-identical), `tests/ceilingbreak.test.js` + `tests/summitapproach.test.js` (R1's one append each), this artifact, `sprint-status.yaml`. EVERYTHING else byte-identical — `js/game.js`, `js/audio.js`, `index.html`, `package.json`, `run_tests.sh`, all other test files. Any frozen leg red that R1/R2 does not explain: STOP and report (5.5-D5 doctrine) — no silent rewrites of the suite.
- Gate: kickoff at the story's create commit = **527/529 with exactly the two R1 census reds named** (verified 2026-11-09); after R1 529/529; final = 529 + the new legs, green, suite < 10 s (NFR4). Report ACTUAL counts.
- Mutation battery runs in a **/tmp clone**, one mutant alone per run, restore between runs; NEVER mutate the workspace; clean up the clone when done.
- No new deps, no build step (NFR6); zero new key bindings (the digit guard ADDS a condition to existing ones — the L5 keydown census must stay deep-equal).

## Tasks

- [x] Task 1 — R1 appends; verify 529/529. Then `js/shell.js` delta per D1/D2 (one-shot clear EXACTLY as D1 now reads): `leadInHop` declaration + `armLeadInHop()` helper (comment cites ledger :136), three call sites, the release-branch `grounded` pair + clear line, the digit condition line. NOTHING else. Full gate; if red beyond the two R1 legs before they land or anything beyond secondwind leg 9 after: STOP and report.
- [x] Task 2 — Apply R2's comment-only delta to `tests/secondwind.test.js`; verify leg 9 green and oracles untouched (`git diff` shows comments only). NEW `tests/leadinhop.test.js` (D4), ≤3 boots. Legs: **L1** cold-boot hop-tap LAUNCHES — `jump` voice delta 1, `vy` equals `jumpVelocity(hold)` exactly (not the constructed 400), no charge anywhere (voice count, not vy — airLaunch also writes vy); press+release AFTER landing byte-identical. **L2** death-restart hop tap launches; with Second Wind owned (`airJumps` 1): `run.airJumps` UNCHANGED (no charge consumption even when clamped); no `jump` voice on a pure denied release, assert `airJumps` unchanged. **L3** post-pick stretched hop (floatMul card or clock-crafted window past 450 ms): tap in the `450..airtime` band → LAUNCH not denial, `airJumps` untouched; and INSIDE the D-07 window (`t − reentryAt < 450`) the press stays DISCARDED (zero voices) — the flag never bypasses the lock. **L4** digit/hitstop: Digit1 inside a live hitstop (`choose` armed) → NOT confirmed (`status 'choose'`, no `applyCard` delta); advance past `stopUntil` → Digit1 confirms ONCE. **L5** fences: source census — `armLeadInHop(` exactly 3, `leadInHop = false` exactly 2 (init + the single clear), `reentryAt` write sites stay exactly 3, digit branch contains `stopUntil`, keydown code census deep-equals the shipped 14. **L6** grace is one-shot: cold boot no card — hop tap launches, second airborne tap during the replacing flight is DENIED (countLaunches delta 0). (DEV NOTE: the "comment-only" mechanism was proven insufficient in dev and SUPERSEDED by the approved R2 extension — one inserted call + the comment; see Completion Notes.)
- [x] Task 2b — Battery in /tmp clone: **M1** drop `armLeadInHop` in `startFreshRun` → L1/L2 red; **M2** flag never cleared → real-airborne-tap legs red (charge spend/denial flips); **M3** flag honored in press-arm only, not release → L1 red; **M4** digit guard removed → L4 red; **M5** guard widened to the whole choose region (arrows too) → arrow-cycle leg red (guard scoped to CONFIRM); **M6** clear-on-grounded-observation-only → L6 + secondwind leg 9 red. Gold control before/after. Report the kill table.
- [x] Task 3 — Record: gate counts at every step, mutation table, R2 delta summary in this file's Dev Agent Record; ledger rows ONLY for real findings; flip `chore-pre-66-polish: review`.

## Dev Agent Record

### Completion Notes

Gate trail (ACTUAL counts, `./run_tests.sh`, Node 26, wall ~8.5 s):
- Kickoff at the create commit `ab2bfa4`: **527/529** — exactly the two sanctioned creation-window census reds (ceilingbreak §6 #179, summitapproach §4.3 #467), nothing else red.
- After R1's two appends: **529/529** (8.51 s).
- After the D1/D2 shell delta (clear-on-grounded-observation draft): **528/529** — one deterministic frozen-leg red, `secondwind` leg 9 "denied press forgives nothing". STOP-and-reported per 5.5-D5; parent ruled the R2 written re-contract. Dev then PROVED the comment-only mechanism insufficient (the leg's opening keyup is a holdFrom-null no-op — the idle-branch press never arms a hold — and its pressCycle window is state-identical to L1/L3's mandated launches), reported with the trace; parent approved the R2 EXTENSION: one inserted `groundedJumpAtWindow(env);` line + attribution comment, plus two further list-only census appends per Set (`tests/secondwind.test.js`, `tests/leadinhop.test.js` — the ledger :179 untracked-blind-spot named by the parent). The ONE-SHOT clear landed with the extension.
- After all deltas, before the census appends: **533/535** (the two census legs — expected, paths unlisted).
- After the census appends: **535/535** (529 + the 6 new legs), wall 8.67 s (one later full-suite run read 534/535 with the ledger :184 HUD flake red — see battery note 3 — and the immediately following run **535/535**). Battery gold controls: **535/535** before AND after.

Mutation battery (final tree; /tmp clone via `git clone --no-local`, one mutant alone per run, gold shell restored between runs; workspace never mutated):

| mutant | mutation | pass | killed (beyond zero) |
|---|---|---|---|
| M1 | drop `armLeadInHop()` in `startFreshRun` | 531 | L1, L2, L6, L5 |
| M2 | clear line deleted (flag never cleared) | 525 | L1 (spend leg), L6, L5 + seven secondwind shell legs (AC1, AC4-denial, AC4-spam, no-card, leg 9, combo, spent-↑0) — a permanently armed flag flips every airborne discriminator |
| M3 | `\|\| leadInHop` in the press-arm gate, release pair reverted | 531 | L1, L2, L3, L6 |
| M4 | digit `&& performance.now() >= stopUntil` line deleted | 533 | L4, L5 |
| M5 | the same guard also on the arrow branch | 533 | L4 (frozen arrow cycle), L5 (scoping census) |
| M6 | clear conditioned on `player.grounded` only | 534 | L6 |

Battery notes: (1) M6 reds L6 ONLY — Task 2b's "+ secondwind leg 9 red" expectation predates the R2 extension: leg 9's new window consumes the flag on a GROUNDED-path release, which clears identically under both clear rules, so leg 9 no longer discriminates M6 (it still dies under M2, as shown). L6 is the one-shot pin. (2) M2's secondwind collateral confirms the frozen-safety census from the other side: the clear rule is load-bearing. (3) polish.test.js's reduced-motion HUD leg (#340/#346) red-flaked TWICE in full-suite runs under parallel load (once mid-dev, once on the final-gate path); every time green 24/24 solo, with the immediately following full-suite run passing 535/535 — the ledger :184 known-flake class, documented per the parent's instruction, NOT fixed here.

Suite: `tests/leadinhop.test.js` — 6 legs (L1, L2, L6, L3, L4, L5), exactly THREE boots (D4 budget): boot 1 L1 (doublejump seeded, rope parked); boot 2 L2 (doublejump + airJumps seeded, natural rope, forcePhase trip rig); boot 3 a shared no-card boot L6→L3→L4 (booted lazily inside L6 so its global stubs never interleave with the L1/L2 restores; L4's finally restores). Donor harness: pickerhud mk()/virtual-clock boot + secondwind boot shape, plus a player.js spy wrapper as the jump-call oracle (the constructed hop built inside game.js `leadIn()` never transits it — the spy sees player-driven launches only). Boot fork #6 COUNTED for the harness-consolidation chore (sixth variant: the jump-spy wrapper + park/stamp script); ledger row deferred to review close per D4.

R2 delta summary (`tests/secondwind.test.js`, leg 9 only): the :447-450 comment rewritten (attribution: the search loop finds the LAUNCH flight's descent) + ONE inserted `groundedJumpAtWindow(env);` line before the search loop; every oracle line (:443-446, loop :454-458, :461-467) byte-identical; no loop-bound or phase-constant changes; leg 9 green (the launch consumes the flag → the pressCycle press is the v1 silent denial → the forced crossing trips).

Deviation notes for review: (1) Task 2's "comment-only" phrase superseded in dev by the approved R2 extension above. (2) The census allow-sets gained THREE strings per Set in total (R1's artifact path + the extension's two paths) — list-only, no other census-file edits anywhere. (3) L1 asserts `run.airJumps` directly (stronger than the voice-count minimum the story names); the voice deltas are asserted alongside.

### File List
- `js/shell.js` — modified: `leadInHop` flag (beside the D-07 block), `armLeadInHop()` shared helper, three call sites (`startFreshRun`, `resumeFromPause`, `confirmPick`), the release-branch `grounded` pair + one-shot clear, the digit-branch `stopUntil` guard. Nothing else.
- `tests/leadinhop.test.js` — NEW (6 legs, 3 boots).
- `tests/secondwind.test.js` — R2 extension delta (one line + comment).
- `tests/ceilingbreak.test.js`, `tests/summitapproach.test.js` — allow-set appends only (3 strings each).
- `_bmad-output/implementation-artifacts/pre-66-polish.md` — this record, task ticks, Status.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — key set `in-progress` (the review flip lands with the parent's commit).

### Change Log
- 2026-11-09 dev: D1 (one-shot leadInHop grace) + D2 (digit freeze guard) in `js/shell.js`; R1 + R2-extension census appends; R2 leg-9 window move; NEW `tests/leadinhop.test.js` (6 legs / 3 boots; fork #6 counted); mutation battery M1-M6 all killed (gold 535/535 both controls); gate 527/529 → 529/529 → 535/535. Status review.
- 2026-11-09 review: blind layer, 0 patches, 3 findings — F1 process (sprint key lagged the story status; fixed here: key `done`), F2 nit DISMISSED (secondwind :457 "lead-in descent window" message wording — R2's stricter clause holds every :451-466 byte-identical, red-run-only surface), F3 nit DISMISSED (L3/L4 need L6's lazy boot3 — inert under run_tests.sh serial order, documented consequence of the D4 3-boot budget). Battery independently re-run by the reviewer (M1/M2/M4/M5/M6 kills reproduced; M3 kill set wider under their reconstruction — L5 also dies). airLaunch+flag proof, interleave audit (pause/hitstop/releaseEverything/pick-chain), leg-9 non-tautology mutant all CLEAN. Gate 535/535. Status done; ledger PAID stamps (:137/:144) + fork-#6 row landed.
