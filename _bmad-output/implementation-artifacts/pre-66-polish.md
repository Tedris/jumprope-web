---
baseline_commit: 2474e27
---
# Chore: pre-6.6 polish — the auto-hop press window + the digit/hitstop gate

Status: backlog

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

### Frozen-safety census (why the ledger's candidate A is REJECTED here)

- Candidate A (arm `reentryAt` in `startFreshRun`) would DISCARD presses in the hop's first 450 ms on a cold boot — the first scripted-jump windows sit at ~260–364 ms; every harness jumper presses only when `grounded` (airborne during the hop, so no press — verified idiom), but the **v1-parity input cells** tap-to-jump from `idle` and expect a LIVE launch (v1 started grounded; a discarded first tap is a v1-parity behavior change on frozen legs) — and it fixes nothing for symptom 2 (the lock still ends before the floatMul-stretched hop). REJECTED.
- Candidate B (derive `LEAD_IN_MS` from physics) retunes an Epic 6-owned inline constant — out of a chore's authorization. REJECTED.
- Candidate C (a shell-local auto-hop flag routing releases during constructed hops to the grounded path) is chosen below: it makes constructed hops NEVER deny or spend — on every path, including floatMul-stretched post-pick hops — touches no constant, arms nothing new in D-07, and keeps the tap-to-jump feel v1-parity-strengthened.

## Decisions (baked — `[DECIDED-BY-CREATE]`)

- **D1 — one flag, all hop constructions, the grounded path.** Add `let leadInHop = false;` beside the D-07 block. ONE shared helper (`armLeadInHop()` — house rule, AGENTS.md shared handler): sets `leadInHop = true`; called at the three constructed-hop sites only — `startFreshRun` (one write inside it covers :388 + :436), `resumeFromPause`, `confirmPick`. In the release branch's `running` arm (:401 region): compute `const grounded = player.grounded || leadInHop;` — a release during a constructed hop takes the grounded launch path (never `airLaunch`, never spends a charge); CLEAR the flag (`leadInHop = false`) on the first `player.grounded === true` observation in that arm (one more line). `airLaunch` keeps its `!grounded && clampAirJumps(...)` shape verbatim — it becomes false automatically whenever `grounded` is true. D-07's `reentryAt` law, sites, and `LEAD_IN_MS` are BYTE-UNTOUCHED; inside a D-07 window behavior is unchanged (the press is discarded before the release branch — the flag cannot leak a jump past the lock).
- **D2 — the digit guard.** The digit branch gains `&& performance.now() >= stopUntil` in its outer condition (:335 region). Post-guard, the digit path and the hold path respect the freeze identically (shared-handler law — the SAME freeze window, both confirmation paths); the freeze is ≤80 ms, the "snappy" complaint caps there. Outside `choose`/out-of-range stay fully inert (no preventDefault) — unchanged.
- **D3 — semantics of a hop-tap launch.** `jump()` overwrites vy from the airborne state — a tap during the hop replaces the remainder of the auto-hop with a player-driven jump (the ledger's own note: "the launch itself is AC1-correct and refreshes on landing"). No landing bookkeeping changes (game.js untouched).
- **D4 — NEW suite `tests/leadinhop.test.js`, boot fork #6 (counted for the consolidation chore).** Donors: `pickerhud.test.js` `mk()`/`fire()` DOM + virtual-clock boot (the timing legs need a controllable clock — the pickerhud `:93` `performance` stub idiom is the ONLY sane way to cross 441.7/450/80 ms windows deterministically) + the `secondwind.test.js` boot shape (doublejump state). ≤3 boots. Ledger: add a fork-#6 row at review close ONLY if the suite adds a sixth boot fork.

## Contract (binding)

- Files: `js/shell.js` (the two deltas — flag + one release-branch pair + helper + digit guard), NEW `tests/leadinhop.test.js`, this artifact, `sprint-status.yaml`. EVERYTHING else byte-identical — `js/game.js`, `js/audio.js`, `index.html`, `package.json`, `run_tests.sh`, all frozen tests. If a frozen leg goes red against the gold tree, STOP and report (5.5 D5 doctrine) — the candidate-C census argues none can (the release branch only ADDS launches inside windows where frozen legs assert nothing; dev MUST verify by running the full gate, not by argument).
- Gate: `./run_tests.sh` before any edit (**529/529** at `2474e27`, wall ~8.6 s); after: 529 + the new legs, suite < 10 s (NFR4). Report ACTUAL counts.
- No new deps, no build step (NFR6); zero new key bindings (the digit guard ADDS a condition to existing ones — the L5-style keydown census must stay deep-equal).

## Tasks

- [ ] Task 1 — `js/shell.js` delta per D1/D2: `leadInHop` declaration + `armLeadInHop()` helper (one line + a two-line comment citing :384/:401 and the ledger items), three call sites, the release-branch `grounded` pair, the digit condition line. NOTHING else.
- [ ] Task 2 — NEW `tests/leadinhop.test.js` (D4). Legs: **L1** cold-boot: start run, press+release WHILE the virtual clock sits inside the hop window before landing — assert the launch is real (`jump` voice delta 1, `vy` equals `jumpVelocity(hold)` exactly, not the constructed hop's 400), and WITHOUT a charge anywhere; press+release AFTER landing still byte-identical. **L2** death-restart: trip → over → restart tap → immediate hop tap — assert launch (voice), and with Second Wind owned (`airJumps` clamped 1): assert `run.airJumps` UNCHANGED (the spend is structurally gone). **L3** post-pick stretched hop: own one floatMul card (or craft the airborne window past 450 ms via the clock), confirm a tap in the `450..airtime` band → LAUNCH not denial, `airJumps` untouched, and the D-07 window itself STILL discards (`t − reentryAt < 450` press → zero voices). **L4** digit/hitstop: trip-to-freeze path or crafted `stopUntil` (JUICE hitstop live), Digit1 inside the freeze → NOT confirmed (`status 'choose'`, no `applyCard` effect delta, no pick voice), advance past `stopUntil`, Digit1 → confirmed once. **L5** fences: source census — `armLeadInHop(` appears EXACTLY 3 times (the hop constructions), `leadInHop = false` exactly 2 (init + release-arm clear), the `reentryAt` write sites stay exactly the shipped 3 (`-LEAD_IN_MS` init, :285, :454), digit branch contains `stopUntil`, keydown code census deep-equals the shipped 14. Mutation battery (per the established /tmp-clone idiom): **M1** drop `armLeadInHop` in `startFreshRun` → L1/L2 red; **M2** flag never cleared → L1-after-landing legs red (charge spend on a real airborne tap); **M3** grounded-pair applied only in press-arm, not release → L1 red; **M4** digit guard removed → L4 red; **M5** guard applied to the whole choose region incl. arrows → arrow-cycle leg red (proves the guard is scoped to CONFIRM only).
- [ ] Task 3 — Record and close: gate counts, mutation table, fork note; ledger rows ONLY for real findings (fork #6 if it lands). Flip this key `done`.

## Dev Agent Record

### File List
