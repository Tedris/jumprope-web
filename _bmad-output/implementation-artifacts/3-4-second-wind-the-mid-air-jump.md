# Story 3.4: Second Wind — the mid-air jump

Status: ready-for-dev
Baseline: `79ba9ec` (Story 3.2 review; 318/318 green @ ~8.5 s) + uncommitted Story-3.3 docs delta (story file, sprint-status, deferred-work — **no code delta**: `js/` and `tests/` are byte-identical to baseline at authoring time).

## Story

As a ceiling-chasing builder,
I want one extra jump available mid-air per ground contact,
so that peak height becomes a skill expression of splitting the button press.

**Thesis note (2026-11-05, epics.md:563-566):** under the disguise thesis this is the first *designed* surprise beat — the hidden-depth discovery the player makes about their own build, authored rather than stumbled into.

## Acceptance Criteria

1. **Given** a run owning ≥1 Second Wind with the mid-air jump unused, **When** a jump press occurs while airborne, **Then** a second launch fires with the standard hold-to-height velocity model, consuming the mid-air charge until the next ground contact (FR12).
2. **Given** the player lands (ground contact), **When** they jump again, **Then** the mid-air jump is refreshed — **exactly 1 per ground contact, regardless of Second Wind copy count** (copies beyond 1 raise nothing; cap 2 respected in catalogue) (FR12).
3. **Given** the second jump occurs, **When** clearance/scoring evaluates the feet-window, **Then** timing judgment uses the same phase-clock rules as ground jumps — the rope is unbothered (NFR8) — and peak altitude chains: Second Wind peaks feed the FR6 ceiling check (Story 2.2 interlock).
4. The one-button pillar holds: no new key; the same press distinguishes ground vs air jumps by state, **with red-green legs for double-press spam and air→air denial** (NFR5, FR17 protected).

## The headline fact: mid-air presses ALREADY launch (free flight today)

There is no grounded guard anywhere. `js/shell.js:351-360` fires
`player = jump(player, (performance.now() - holdFrom) / 1000, run.effects.launchMul ?? 1)`
on release while `running` with **no `player.grounded` check**, and `jump()` (`js/player.js:9-11`) overwrites `vy` unconditionally mid-air. Mashing Space today gives unlimited free air flaps with zero cards (silent: the `'jump'` sim event needs a grounded→airborne edge, `js/game.js:94`).

- The 2026-11-05 sprint proposal found this as thesis evidence and tracked a "grounded-guard fix" as a **separate change set — never landed** (`sprint-change-proposal-2026-11-05.md:56-57,:140`; brainstorm memlog:15 "it is un-gated Second Wind (Story 3.4) — fix pending").
- **This story folds that fix in**: the guard IS AC4's state discrimination. Without a charge, airborne presses become denied — a deliberate baseline behavior change from shipped v1. FR17 is "extended by Second Wind in Epic 3" (`epics.md:132`), not violated: ground-jump physics stays byte-identical.
- **Nothing pins the free flight**: every harness jumper presses only while grounded (searched: `if (player.grounded && ...) player = jump(...)` idiom in altitude/ascent/balance/headless-sim/pickflow/polish/audio); the only airborne-launch tests press inside the D-07 lead-in window and assert NO launch (`tests/polish.test.js:333-358`, `tests/v1parity.test.js:703-713`). Denied airborne presses are compatible with every frozen leg.

## Proposed mechanism (boring shape; dev owns it, all legs must stay green)

State is run-record data (FR14 will read it for the HUD in 3.5 — the view payload already carries `run`, so no extra plumbing), following ADR-2 whole-record patches (`game-architecture.md:221-223,:596-602` — `airJumps` is the pre-coined field name: `tests/support/balance-harness.js:33` already registers AXIS `doublejump: 'airJumps'`).

1. **`js/game.js` — run record**: `createRun()` gains exactly one key: `airJumps: 0` (`js/game.js:64-66`).
   - Read-heal at tickRun entry mirroring the i-frames precedent (`js/game.js:91`): `Number.isFinite(run.airJumps) ? Math.min(1, Math.max(0, run.airJumps)) : 0`. Valid range is 0..1; write unconditional in the `nextRun` spread (`js/game.js:206`) — heal-on-write, the 3.3 D-b doctrine, not at-read-only.
   - Ground-contact refresh inside `tickRun`: whenever `nextPlayer.grounded` (per tick, idempotent), `airJumps = ((run.owned ?? {}).doublejump ?? 0) > 0 ? 1 : 0`. That is AC2's "exactly 1 per ground contact regardless of copies" — the refresh cap, not the counter, enforces "copies beyond 1 raise nothing".
2. **`js/upgrades.js` — `doublejump` goes live**: record gains `shape: 'run'` and `apply: (run) => ({ ...run, airJumps: (run.airJumps ?? 0) + 1 })` (the `game-architecture.md:601` sketch, minus the owned push — `applyCard` adds `owned` itself, `js/game.js:233-239`). Mirrors Spare Rope: the pick grants the charge immediately. Update the now-stale card-block comment (`js/upgrades.js:32-33`) — 3.2's review rewrote it to "(3.3 charges, 3.4 mid-air jump)" expressly reserving each half for its story (`3-2-…md:90`); the `doublejump` half goes away here.
   - `patchedRun` run-shaped arm (`js/game.js:220-226`) clamps `airJumps` in the write (analog of the `clampRopes` line :223) so a second pick cannot exceed 1 while airborne.
3. **`js/shell.js` — the press discriminates** in `consumeIntents()`' running-release branch (`js/shell.js:351-360`), inside the existing `LEAD_IN_MS && holdFrom !== null` guard (do not move the D-07 semantics):
   - `player.grounded` → today's launch path, byte-identical (hold + `launchMul ?? 1`, voice, `pressFired = true`).
   - airborne && `run.airJumps >= 1` → **same launch expression** (hold-to-height × `launchMul` — GDD "High Jump × Second Wind → max peak", `gdd.md:324`), same `audio?.handleEvent('jump')`, and `pressFired = true` exactly as the grounded path (today's un-gated launch armed the D-N01 buffer; the folded fix keeps that for PERMITTED launches only — the denial branch arms nothing), then consume: `run = { ...run, airJumps: Math.max(0, run.airJumps - 1) }` (shell writing a run field mid-run has one precedent: `enterPause`'s `buffer: 0`, `js/shell.js:238`; the sim cannot fire launches — release timing lives in the shell). The shell reads the value `tickRun` last wrote — the tickRun heal clamps 0..1 every tick, so garbage fields only exist in hand-built records that never enter the shell; a non-numeric/absent field fails `>= 1` and denies, mirroring the `launchMul ?? 1` trust level.
   - airborne && no charge → **silent denial**: no launch, no `pressFired` (denied presses must NOT re-arm the D-N01 mercy buffer), no audio, juice unchanged, `holdFrom` cleared so no phantom re-fire. `releaseEverything()` needs no edit — it routes through `consumeIntents`, so blur/pointercancel mid-hold obeys the gate identically ("acts as if the player released at that instant").
   - Decision instant is `player.grounded` at release (a hold that lands becomes a ground jump, charge untouched) — `grounded ⟺ y === 0` is pinned (`tests/simpleeffects.test.js:200-216`).
4. **`js/player.js` byte-identical.** The gate lives in the shell; `jump()` keeps its unconditional vy-set because every harness jumper calls it directly (sim-side), and the timing contract legs (leg-9 idiom, `tests/simpleeffects.test.js:200-216`) read it that way. FR17's protected values (`jumpVelocity`, gravity, STEP, no coyote time) are untouched by construction.

AC3 needs no mechanism: `peak = altitude + nextPlayer.y` (`js/game.js:188`) samples the post-step position every tick regardless of how the player got there — the air launch feeds `crossesCeiling`/ascend/win for free, i-frame suppression (`iframesLeft === 0`, :189) inherited from Story 4.5. Verify by legs, not code.

## Files

- `js/game.js` — createRun key, tickRead-heal + refresh + write, patchedRun clamp
- `js/upgrades.js` — doublejump run-shape record + comment fix
- `js/shell.js` — consumeIntents release-branch gate (the ONLY input-semantics site; no new keys, no new listeners)
- `tests/secondwind.test.js` — NEW, all legs
- Authorized re-contracts — **exactly these two test sites, nothing else in `tests/`**:
  - `tests/altitude.test.js:43-45` — the createRun record-key-set leg: add `'airJumps'` to the sorted list, story-commented. **This story explicitly re-authorizes this leg** under the AGENTS.md frozen-test exception.
  - `tests/rulecards.test.js:42-51` — inert-endofunction leg: move `doublejump` out of the inert loop; replace with a run-shape assertion (apply preserves the five effect keys — spreads input, `freshEffects()` in ⇒ five keys out + `airJumps`; mirrors `tests/catalogue.test.js:34-38`). **Re-authorized.** Leave the `reinforce` arm exactly as found (Story 3.3's turf).
  - Prove with `git diff 79ba9ec -- tests/` (adjust sha if 3.3 landed first and was committed) in the Debug Log; both files must otherwise be byte-identical.
  - If Story 3.3 (`run.charged`) lands before this story, its re-contracts are already in these two sites — re-contract against the checkout's current text; the key-set gains a second name; never revert 3.3's edits. The two stories share the patchedRun arm, the nextRun write line, and the ledger — land in any order, resolve to text.
- `_bmad-output/implementation-artifacts/deferred-work.md` — narrow the :99 stackedEffects-leak entry (`doublejump` now rides the same run-shaped idiom, not "will ship"), and add the Second Wind parity note under :100 owned-cap lock (owned.doublejump ≥ 2 hides forever via the owned arm — same lifetime-lock math as Spare Rope/Steel Cord; Epic 6 decides recovery semantics).
- `sprint-status.yaml` — 3-4 status transitions (handled by the workflows).

Untouched: `js/player.js`, `js/rope.js`, `js/interpolate.js`, `js/render3d.js`, `js/audio.js`, `index.html`, `package.json`, `run_tests.sh`, `.github/`, `tests/boundary.test.js`, `tests/hygiene.test.js`, all other test files.

## Out of scope (do NOT build here)

- **HUD double-jump state (`Second Wind ⟳1`, `EXPERIENCE.md:111`)** → Story 3.5 (FR14 reads `run` off the view payload — your run field is all it needs).
- **Renderer dust tell / juice / dedicated SFX** → Epic 5 (`gdd-epic-overview.md`'s "3.4 = renderer pips" numbering is superseded; epics.md is the spine). The air launch reuses the shell-direct `'jump'` voice in the shared branch; it emits NO new sim event (airborne→airborne makes no takeoff edge at `js/game.js:94` — correct, JUICE_TIERS is fenced to three tiers, `tests/juice.test.js:153`).
- **`stateCap`/offer-filter changes**: `doublejump` has no stateCap (cap-only, correct — owned-arm filters at cap 2). Leave the `charged: 0` literal at `js/game.js:132` to 3.3.
- **Balance bot awareness**: harness jumpers press grounded-only and call `jump()` sim-side — the balance/runBot pool is unaffected; a policy bot that exploits air jumps is 6.1's job.

## Test plan — tests/secondwind.test.js (red-green per AC; metadata-derived expectations per AGENTS)

Reuse existing idioms: `tickRun` fixture rigs (`tests/multirope.test.js:16-25`), scripted grounded jumper, and the shell-cap boot harness from `tests/feelcap.test.js`/`tests/juice.test.js` for press-semantics legs. No new harness kit; wall-time stays < 10 s.

1. Contract: `createRun().airJumps === 0`; tickRun return keys unchanged (`['events','player','rope','run','tripped']`); non-finite/garbage `airJumps` read as 0 and heal on write to 0..1 (i-frames-style arms, `tests/multirope.test.js:176-182` idiom).
2. AC2 refresh: owned `{doublejump:1}`, land → grounded ticks carry `airJumps: 1`; airborne ticks pass it through; consumed → stays 0 until a grounded tick. Never exceeds 1.
3. AC1 launch (shell-cap): own via `applyCard(run, cardById('doublejump'))` — pick grants `airJumps: 1` (run-shape, effects keys preserved); grounded jump, then airborne press past lead-in → vy rises while y > 0 with the hold-model velocity (`× launchMul`), `run.airJumps` 0.
4. Air→air denial (AC4 leg): second airborne press same flight → vy monotone decay, no voice call, `airJumps` stays 0.
5. Double-press spam (AC4 leg): N presses mid-flight → ≤1 mid-air launch per ground contact (count vy-rises while airborne).
6. No-card denial = replacement-behavior leg: owned `{}`, airborne press → no launch, vy untouched. Contrast twin: same rig on baseline would launch — this leg is why the folded grounded-guard fix is pinned.
7. Denied press forgives nothing: airborne press+release with no charge, then fall through a feet-window → the trip happens (no buffer armed; distinguishable from today where the press both launched and armed D-N01).
8. AC3 peak chain: area-1 run, air-jump from a full ground jump → `ascend` fires off the air peak alone (score too low to matter, mirror `tests/ascent.test.js` rigs); Second-Wind twin with unused charge is byte-identical in rope phase/score to the `owned:{}` twin (NFR8 rope-unbothered); air peak during i-frames blank does NOT ascend (4.5 inheritance).
9. Combo: `highjump` × `doublejump` → air-launch `vy === jumpVelocity(hold) * launchMul` (third-arg pattern rides air launches identically, GDD `:324`).
10. Copies: `applyCard` ×2 → `owned.doublejump === 2`, `airJumps` clamped ≤ 1 everywhere, exactly-1-per-contact legs unchanged (cap 2 from catalogue metadata, not hardcoded).

## Dev Notes — current-state facts (all verified at authoring)

- **tickRun line map** (`js/game.js:68-215`): read-heals :72-92 (i-frames arm :91 = the heal precedent); buffer decay/re-arm :83-84 (`press` is truthiness-only, D-N11); takeoff-edge :94; crossing loop :100-181 (i-frame → cleared → buffer → strip → death, order IS contract); deal site :127-140 (`{ ropes, charged: 0 }` — 3.3's); ceiling check :188-205 (`iframesLeft === 0`, strict `>`, one plain if); write list :206-207.
- **`jump(player, holdSeconds, launchMul = 1)`** (`js/player.js:9-11`); `jumpVelocity = 350 + min(hold,0.5)*500` (:5-7); gravity 1800/`floatMul` (`js/game.js:70`); landing sets `grounded=true` at y≤0 (:17-24).
- **`doublejump` today** (`js/upgrades.js:44-46`): purchasable since 3.1, `owned.doublejump` stacks to cap 2, apply inert (pinned at `tests/rulecards.test.js:42-51` — one of the two re-contract sites). role `foundation`, color `sky`, icon ⇈, no `stateCap`, no `shape`.
- **AXIS/balance guard stays green untouched**: `shape === 'run'` ⇒ verify apply writes no effect field, then exempt (`tests/balance.test.js:325-353`; ratified narrow reading — 3.2 Review Decision :87); `doublejump: 'airJumps'` sentinel already registered (`tests/support/balance-harness.js:33`). Do not touch collision baselines.
- **Catalogue run-shape leg stays green untouched**: `card.shape === 'run'` branch asserts the five effect keys SURVIVE the patch (`tests/catalogue.test.js:34-38`) — spreading input satisfies it; `headless-sim.test.js:144-148` shape sweep likewise (extrarope proved the pattern in 3.2).
- **Whole-run-record deep-equals: none** (searched `tests/`) — a new run key trips only the createRun key-set leg.
- **v1-parity anchors untouched**: lead-in jump `vy === jumpVelocity(0.1)` never launchMul'd (`tests/v1parity.test.js:704`); D-07 discard legs press in the lead-in window (`polish.test.js:333-358`, `v1parity.test.js:709-713`) — the gate must sit INSIDE the `LEAD_IN_MS` branch so those stay green by construction.
- **Audio trivia so you don't misattribute**: a grounded jump plays the `jump` voice twice by design-drift (shell-direct `js/shell.js:355` + sim `'jump'` event through the D-N02 channel :605); an air launch plays once (no sim event). Not a 3.4 defect; Epic 5 owns audio consolidation.
- **Balance intent**: GDD `:234-237` — Second Wind ×2 is the ceiling-breaker for peak-height farmers, copies doing nothing beyond 1 is design, not omission. `epics.md:575` is authoritative. Peak-axis one-axis note (`gdd.md:240-257`): Second Wind + Launch Heels share the peak axis by sanctioned design (collision data: `sprint-change-proposal-2026-11-06.md:29-47`).
- **UX language**: the climax copy says players "split a Second Wind at apex" (`EXPERIENCE.md:115`) — the mechanic name for AC1 is "splitting". Card keeps its original voice (`gdd.md:87-92`).
- Conventions: pure sim (no `Date`/`Math.random`/DOM in `js/game.js`/`upgrades.js` — `tests/boundary.test.js` walks the import graph), POJOs + spread, no classes, named exports, `.js` specifiers, 2-space, sparse comments, no `console.*` in pure modules, one shared handler (the release branch is the one launch site — no per-gesture forks).

### Project Structure Notes

- No `project-context.md` exists; AGENTS.md conventions bind. Zero-dependency stack unchanged — no web-research inputs needed (no library, no version, no API surface added; Three.js untouched).
- Static-files-only, no build step: verification is `./run_tests.sh` (the one gate) plus `node -e "import('./js/game.js')…"` probe-state per AGENTS.
- Variance (with rationale): the proposal's "grounded-guard fix" (js/player.js/js/shell.js, own test file) is NOT a separate change set — its logic is AC4's state gate and lands here in `js/shell.js` only, pinned in `tests/secondwind.test.js`. player.js stays byte-identical on purpose (harnesses call `jump()` sim-side; gating there would silently change test-harness physics).

### References

- `epics.md:557-581` (story text, ACs verbatim source), `:126-135` (FR map, FR17 extension note), `:459-463` (Epic 3 header)
- `sprint-change-proposal-2026-11-05.md:20-22,:56-57,:109-111,:140` (ungated mid-air jump, guard-fix deferral, thesis beat)
- `game-architecture.md:221-223,:469-471,:595-602` (`airJumps` schema + Second Wind sketch), `:236` ADR-2
- `gdd.md:231,:234-237,:324,:149-156,:259-262` (card row, balance intent, combo, jump mechanics, one-button controls)
- `3-2-…md` (launchMul pattern, ADR-2 coexistence, AXIS ratified reading, re-contract ledger style), `3-3-…md:117-137` (heal-on-write doctrine, landmine list — shared by 3.4)
- `deferred-work.md:9,:80,:85-86,:99,:100` · `EXPERIENCE.md:111,:115`
- Code: `js/game.js:64-66,68-215,220-239` · `js/player.js:1-39` · `js/shell.js:331-380,351-360,600-628` · `js/upgrades.js:32-49,58-60,65-73`

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
