---
baseline_commit: 140ac14
---

# Story 1.2: Trip resolution — lose the fastest rope, ride the i-frames

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player who mistimes a jump,
I want a trip to cost me a rope and grant a recovery blank instead of ending the run,
so that losing health feels like a narrowing of my options, not an instant punishment — until the last rope.

## Acceptance Criteria

1. **Strip trip (2+ ropes, no live buffer).** Given a run with 2+ ropes and no live mercy buffer, when a rope crosses the feet-window without clearance, then exactly one rope is removed and i-frames begin: `ropes` decreases by 1 (written as the clamped count − 1), `status` stays `'running'`, `tripped` is `false`, and the events channel gets a **new `'ropeLost'`** event (no `'trip'` event). (FR2)

2. **Mercy keeps first priority.** Given a failing crossing while the buffer is live, the existing buffer branch runs **unchanged** — scored near-miss pass, no rope lost, no i-frames, buffer consumed at the crossing. One shared mercy, not one-per-rope. (FR19 protected)

3. **i-frames are a true blank.** Given i-frames active with R ropes held, when the clock advances, then the next **R rising-edge crossings pass harmlessly** — no score, no skips increment, no trip, no streak change, no buffer consumption — and the R+1st crossing is live again. R evenly spaced passes = a real-time blank of ≈ one revolution regardless of rope count; the blank duration is invariant across N at equal ropeMul. (FR3, NFR8)

4. **Last-rope death is byte-identical v1.** Given a failing crossing with no buffer at a (clamped) rope count of exactly 1, the run ends exactly as shipped: `status: 'over'`, `tripped: true`, `'trip'` last in events, `streak: 0`, `ropes` field left untouched. Never a thrown error. (FR2)

5. **Tests ship in the same change.** New red-green legs in a new test file cover: buffer-first priority at N ≥ 2, strip decrement + `'ropeLost'`, exact i-frame pass count and rope-count-invariant blank duration, last-rope death shape, buffer not consumed during i-frames, missing-`iFrames`-field fallback. The two interim trip legs in `tests/multirope.test.js` are **re-contracted** to the new rule (see Task 5 — this is the sanctioned exception, not frozen-suite breakage). All v1 frozen `tests/*.test.js` files stay byte-identical; `tests/boundary.test.js` passes unmodified; full suite green < 10 s. (NFR4, NFR5)

## Tasks / Subtasks

- [x] Task 1: Run record gains i-frame state (AC: 1, 3)
  - [x] `createRun()` in `js/game.js` gains `iFrames: 0` — remaining harmless crossings; appended last, all existing keys byte-identical (`...streak, ropes, iFrames`)
  - [x] `tickRun` reads `run.iFrames ?? 0` — same fallback pattern as `run.buffer ?? 0` / `run.ropes ?? MIN_ROPES`; hand-built run records and pre-1.2 records behave as "no i-frames"
  - [x] `iFrames` is plain number data; negative/NaN inputs behave as 0 via `Math.max(0, ...)` at read — never a throw (invalid states are data)
- [x] Task 2: Crossing resolution order in `tickRun` (AC: 1, 2, 3, 4)
  - [x] Inside the existing rising-edge loop, the branch order becomes: **i-frames → clearance → buffer → strip/death**:
    `if (iframesLeft > 0) { iframesLeft -= 1; }` else the existing clear/buffer branches, else the trip branch (Task 3)
  - [x] The i-frame branch touches nothing else: no `score`/`skips`/`streak`/`buffer` mutation, no event; `continue` is fine (disjointness is pinned — at most one rising edge per tick, `tests/multirope.test.js:133`)
  - [x] Carry `iframesLeft` into the returned run as `iFrames` (spread-copy, never mutate)
  - [x] Skips don't accrue during the blank → offers cannot fire mid-blank (keeps "tickRun never runs in choose")
- [x] Task 3: Replace the interim trip else-branch (AC: 1, 4) — this is the branch comment-marked in 1.1 at `js/game.js:109-118`
  - [x] If clamped `ropeCount > 1`: `ropes = ropeCount - 1` (writing the clamped value heals out-of-range records by construction), `iframesLeft = ropes` (post-strip count → blank = R passes at R evenly spaced ropes ≈ exactly one revolution), `events.push('ropeLost')`, `break` (trip ends crossing resolution for the tick)
  - [x] Else (ropeCount === 1): keep the current death branch **verbatim** — `status = 'over'`, `tripped = true`, `streak = 0`, `events.push('trip')`, `break`; leave `ropes` as-is in the record
  - [x] Decide the deferred offer question from `deferred-work.md`: do NOT add `shouldOfferUpgrade` to the buffer-forgiven branch here — v1-frozen behavior, still belongs to Epic 6; keep the honest comment
  - [x] `tripped` stays fatal-only: the shell's `if (out.tripped) saveBest(...)` (`js/shell.js:393-396`) and `'over'`-status handling must keep working with **zero shell changes**
- [x] Task 4: Tests — new file (AC: 3, 5)
  - [x] New `tests/tripresolution.test.js` (thematic naming is the house pattern), red-green legs first:
    - [x] contract: `createRun().iFrames === 0`; `tickRun` return keys unchanged (`run/rope/player/tripped/events`)
    - [x] strip: failing crossing, no buffer, N = 2..5 (grounded player, phase 0.44 → rising edge) → `status 'running'`, `tripped false`, `run.ropes === n - 1`, `run.iFrames === n - 1`, events include `'ropeLost'`, last event not `'trip'`
    - [x] blank count: after a strip trip at N, script one-plus revolutions with a grounded player → exactly `ropes` crossings pass with zero score/skip deltas, then the next failing crossing kills-as-fatal-or-strips per the new count; blank span (trip tick → first live crossing tick) within ±2 ticks of one revolution at that ropeMul
    - [x] invariance: blank span equal across N = 2..5 (same period, scripted trip) — the AC's "constant real-time regardless of rope count"
    - [x] fatal: `ropes: 1` failing crossing → `status 'over'`, `tripped true`, `events.at(-1) === 'trip'`, `ropes` unchanged in record
    - [x] buffer-first: press armed, failing crossing at N ≥ 2 → scored skip + nearMiss, `ropes` and `iFrames` unchanged, `buffer 0`
    - [x] buffer survives the blank: i-frames active with `buffer` armed → blank pass leaves `buffer` intact (decays only via its own phase-clock line)
    - [x] fallback: hand-built record without `iFrames` behaves as 0 (a failing crossing at N=2 still strips)
    - [x] out-of-range count strip: `ropes: 7` → clamped 5, strip writes `ropes: 4` (data heals on transition; read-clamp note for 1.3 stands)
  - [x] Red-green discipline is an AC: failing legs first, right-reason failure observed, then implement
- [x] Task 5: Re-contract the two interim legs in `tests/multirope.test.js` (AC: 5)
  - [x] `failed crossing with no live buffer still trips the run for any rope count` (line 106): N = 1 → death as-is; **N ≥ 2 → strip** (`tripped false`, `status 'running'`, `ropes n-1`, `iFrames n-1`, `events.at(-1) === 'ropeLost'`)
  - [x] `a failing crossing on rope k >= 1 trips...` (line 147): trip half becomes the N=2 strip half (`ropes: 1`, `iFrames: 1`, `'ropeLost'`); buffer half unchanged
  - [x] No other `multirope.test.js` legs change (revolutions, offer, disjointness, clamp, N=1 parity all hold as-is — verify, don't touch)
  - [x] `git diff --stat tests/` shows: `multirope.test.js` modified **only in those two legs**, one new test file, nothing else
- [x] Task 6: Boundary + suite confirmation (AC: 5)
  - [x] `tests/boundary.test.js` green unmodified; `node --test tests/` full suite green well under 10 s
  - [x] Confirm v1 frozen files byte-identical (`git diff tests/game.test.js tests/feel.test.js tests/startrun.test.js ...` empty)

### Review Findings

- [x] [Review][Decision] Blank duration is phase-dependent — the "≈ one revolution, invariant" guarantee only holds for trips on rope 0's rising edge — AC3/NFR8. `iframesLeft = strippedTo` is a pure pass-count with no compensation for *where* in the revolution the trip landed; post-strip offsets `m/(N−1)` re-anchor crossings to absolute phase. Verified: N=2 trips give last-harmless at tick 60 (k=0 rig, all `tripresolution.test.js` legs) vs tick 30 (k=1 — the rig `tests/multirope.test.js:150` itself uses); trip→first-live = 120 vs 90 ticks at DT=1/60. General: trip on rope k spans ≈ 1−k/N revolutions to the last harmless pass. Mitigating nuance: trip→first-**live** crossing is never shorter than ~1 revolution (δ+1, δ<1/R), so the player always gets at least one revolution of protection — the variance is extra tail grace at low N, not a shortened shield. Related auditor note: the test measures trip tick → *last harmless* tick while Task 4's literal wording says "first live crossing tick" (disclosed in Completion Notes; measured literally it is (R+1)/R rev at k=0 and not invariant). — **Resolved: accept + document + pin.** The ≥1-rev floor satisfies FR3's spirit; pass-count arming stays (NFR8 bans a second clock). Pin the actual behavior with a k≥1 blank leg and document the phase dependence at the arming site.
- [x] [Review][Decision] Strip trip leaves the near-miss streak intact while the last-rope death zeros it — AC1 lists the strip's effects without mentioning `streak`; the death branch does `streak = 0`, the buffer branch does `streak += 1`, the strip branch touches neither. A grounded miss at N ≥ 2 keeps the full streak alive into the post-blank window. May be deliberate (streak-under-multi-rope is Story 1.4's domain) or an omission in an otherwise carefully-branched chain. — **Resolved: intentional.** Streak policy under multi-rope belongs to Story 1.4; add a comment at the strip branch so the silence reads as policy, not oversight.
- [x] [Review][Patch] Add k≥1 blank leg documenting phase-dependent blank span (`tests/tripresolution.test.js`) + comment at the arming site (`js/game.js` strip branch) — from Resolved Decision 1 — applied: `phase-dependent tail` leg pins harmless@½-rev / live ≥ 1-rev for the k=1 trip; arming-site comment states the floor honestly
- [x] [Review][Patch] Comment the strip branch's streak silence → Story 1.4 (`js/game.js`) — from Resolved Decision 2 — applied
- [x] [Review][Patch] Huge finite `iFrames` is permanent invulnerability, not a long blank — `js/game.js:66` guards finiteness but not magnitude; at `iFrames: 1e21` the `-= 1` decrement is a float64 no-op and the blank never drains. Unreachable through gameplay (only hand-built records), but the `clampRopes` invalid-states-as-data precedent argues for an upper bound (legitimate values are always ≤ MAX_ROPES − 1). — applied: read capped at `MAX_ROPES` via `Math.min`, pinned by new `unbounded iFrames cap as data` leg
- [x] [Review][Patch] Strip's `break` silently depends on the disjointness invariant (at most one rising edge per tick, pinned by `tests/multirope.test.js:133`) — a one-line comment naming the dependency belongs on the `break` (`js/game.js` strip branch), mirroring how the blank branch's `continue` is justified in Task 2. — applied
- [x] [Review][Defer] `ropeLost` is currently a zero-feedback event [`js/audio.js:178-188`, `js/shell.js:15-19`] — no VOICES entry, no JUICE_TIERS entry, and the renderer draws one rope regardless of `run.ropes`; a trip today is audio-visually silent. Sanctioned deferral (thud = 5.2, i-frame juice = 5.3, rope-count HUD = 1.3) but no story explicitly owns the *event cue wiring*; tracked in deferred-work.
- [x] [Review][Defer] AGENTS.md frozen-test wording ("existing test files stay byte-identical") is stricter than the story-sanctioned re-contract exception used here — the story pre-authorized the two `multirope.test.js` edits and the diff complies, but the policy doc doesn't yet describe the exception. AGENTS.md housekeeping, not this story's fix.

Dismissed as noise (12): fractional `iFrames` self-heals next tick; `Infinity→0` diverges from `clampRopes`' Infinity arm but errs safe; death-vs-strip `buffer` asymmetry is behaviorally inert (buffer is 0 by the time any trip branch runs); `iFrames`/`iframesLeft` naming nit; assertions inside `scriptBlank` helper; "fastest rope" title degeneracy (documented and sound while periods are shared); mid-blank offer interaction (proved unreachable — skips frozen during blank, `applyCard`/`resumeRun` spread-preserve); test-rig magic numbers (established 1.1 period-1 rig pattern); `Number.isFinite` guard vs Task-1's `?? 0` wording (deviation correct — `Math.max(0, NaN)` is NaN — and disclosed); mercy-vs-i-frames ordering nuance (documented reconciliation); buffer-survives-blank leg's self-neutralizing assertion (closed by co-assertions `events == []`, `skips == 0`); `ropes: 7` multi-rope heal (by design, tested leg).

### Dev Notes First Read (the three things that bite)

1. **`tripped` is fatal-only now** — if you set it on strip trips, the shell saves "best" mid-run and the defensive `out.tripped ? ['trip']` juice shim lies. Keep the flag's semantics: "the run just ended by tripping".
2. **`'ropeLost'` is a brand-new event name.** `audio.js handleEvent` silently ignores unknown voices (`js/audio.js:186-189`) and the shell's `JUICE_TIERS[e]` lookup misses → no audio/juice for it yet. That is intentional (Epic 5 ships the thud); do **not** reuse `'trip'` for strip trips — v1's thud-and-hitstop must keep meaning death.
3. **`tests/multirope.test.js` is not the frozen suite.** Its trip legs were written by 1.1 as a deliberate interim contract ("Story 1.2 replaces this branch", scope-fence Task 3; the disjointness leg says "Story 1.2 builds on this"). Re-contracting those two legs is the planned path. Every **v1** test file stays byte-identical.

## Dev Notes

### Where everything lives (current state, verified 2026-11-01)

| File | State today | This story |
|------|-------------|------------|
| `js/game.js` | `createRun` returns `{ ..., streak, ropes: 1 }`; `tickRun` crossing loop resolves edges in order clearance → buffer → trip-death (`js/game.js:71-119`); trip else-branch comment-marked for 1.2 | UPDATE: `iFrames: 0` in `createRun`; read `run.iFrames ?? 0`; insert the i-frame branch ahead of clearance; rewrite the trip else-branch into strip/death |
| `js/rope.js` | `atFeetOffset(phase, k, count)` derived-offset predicate ships from 1.1 | UNTOUCHED — everything this story needs is derivable from `(phase + k/N) mod 1` |
| `js/player.js`, `js/upgrades.js`, `js/interpolate.js` | v1 as shipped | UNTOUCHED |
| `js/shell.js` | `tickRun` at `shell.js:388`; `out.tripped` → saveBest (`shell.js:393-396`); events drive audio + juice tiers (`shell.js:392-412`) | UNTOUCHED — fatal-only `tripped` and an ignorable new event keep the shell honest by construction |
| `js/audio.js` | `VOICES` lookup ignores unknown names | UNTOUCHED — `ropeLost` thud is Story 5.2 |
| `js/render3d.js`, `index.html`, `package.json` | v1 / near-frozen | DO NOT TOUCH |

### The architectural decisions this story implements

- **Trip resolution order: buffer → i-frames → strip.** FR2's order is mercy → ropes; the GDD adds that during a blank nothing can trip. So within a rising-edge crossing: `iFrames > 0` short-circuits everything (a crossing with clearance during the blank also scores nothing — "true blank on the clock", GDD §Rope HP); then clearance, then buffer, then strip/death. The buffer branch (`js/game.js:100-108`) stays byte-identical code.
- **i-frames are a pass-count, not a timer.** NFR8 forbids a second clock; a wall-clock field would be a secondary timer. `iFrames` counts upcoming rising-edge crossings and decrements in the loop — it survives pause/resume (`resumeRun` spread-copies the run) for free and needs no phase bookkeeping. Duration = R passes at R evenly spaced ropes ≈ exactly one revolution ⇒ real-time constant across rope counts, which is exactly FR3's claim. Set it to the **post-strip** count so the invariant holds (pre-strip count would give (N)/(N−1) revolutions).
- **"Fastest rope" is degenerate today — say so in code.** All N ropes share one period (derived offsets; `ropeMul` scales the whole clock), so every rope ties for fastest: the strip is just `ropes − 1`, and even re-spacing is automatic because offsets are re-derived as `k/(N−1)` on the next tick. There is **no rope identity** in the model. Consequence for Story 3.3: Steel Cord charges must be run-level counts/state, not per-rope flags — do not invent a `ropes: []` array here to look faithful to "fastest".
- **Invalid states are data.** Strip writes `ropes: clampedCount − 1` (heals `7 → 4` on transition). Death leaves the `ropes` field untouched. No branch throws; `clampRopes` (read-clamp, 1.1) remains the only clamp.
- **One-way payload stays intact.** The new `iFrames` field rides the run record through the existing view payload; the renderer reads it in Story 5.3's juice, not now.

### Known frozen-test landmines (verified against the tree)

- All v1 frozen tests run at effective 1 rope (records via `{ ...createRun(), ... }`, or field-absent → `?? 1`): every v1 trip is a last-rope death → the verbatim-faithful death branch keeps them all green. No v1 test deep-equals the whole run record (checked: only `catalogue.test.js:50`, which compares two identical runs — adding `iFrames` flows through safely).
- `tests/startrun.test.js` freezes the 4-arg `tickRun` call surface — do not reorder or rename parameters.
- `tests/boundary.test.js:58` bans the literal `phase: 0.33` in `js/`; `:67` allows `Math.random` only on the `tickRun` default-parameter line. No new randomness in this story.
- `tests/headless-sim.test.js` (1000-tick gate) runs an airborne-player script that never trips — unaffected; must pass unmodified.
- `tests/juice.test.js:355`'s hand-built run literal is a render view payload, never passed to `tickRun` — the `?? 0` fallback matters only for real sim records lacking the field.
- From 1.1's deferred-work: `leadIn` phase 0.33 sitting inside rope 1's window at N=5 yields no rising edge on resume → no phantom trip; this story inherits (does not worsen) the known step-size blind spots. Not this story's fix; 1.5 re-proves parity.

### Testing standards

- Node built-in runner only: `node --test tests/` (Node ≥ 18, `node:test` + `node:assert/strict`); injected rng everywhere (this story adds no randomness).
- Red-green legs written first and observed failing for the right reason (NFR5, 1.1's Debug Log pattern).
- Contract test for the extended `createRun` return ships in the same change (v1.0 retrospective rule).
- Blank-duration assertions measure ticks from the trip tick to the first live crossing tick and compare across N — derive the expected revolution from `ROPE_PERIOD`/`STEP`, not magic numbers.

### Scope boundaries (do not drift)

- **In scope:** trip branch rewrite, `iFrames` field + blank logic, `'ropeLost'` event, new test file, two re-contracted multirope legs.
- **Out of scope:** rope-count HUD (1.3), near-miss callout coalescing (1.4), input-parity suite (1.5), Spare Rope raising counts in gameplay (3.2), charges (3.3), any offer-cadence change (Epic 6), any audio/juice/renderer/shell change (Epics 3/5), i-frame visual treatment (5.3).

### Project Structure Notes

- All changes inside the existing `js/` tree; tests mirror module semantics with thematic names (`tripresolution.test.js` fits multirope/feel/startrun style).
- Conventions: named exports, POJOs, spread-copy never mutate, 2-space indent, sparse comments (non-obvious fallbacks only), no `console.*` in pure modules, `UPPER_SNAKE` module constants, `*Mul` suffix untouched here (no new multipliers).

### Project Context Rules

- No `project-context.md` exists in this repository; `AGENTS.md` is the project-rule source (pure core / imperative shell, frozen-test discipline with byte-identical existing tests, static-files-only, `node --test tests/` before committing) — reflected in the notes above.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2] — AC text, FR2/FR3/FR19/NFR5 mapping
- [Source: _bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md#Primary Mechanics (Rope HP)] — trip resolution order, fastest-rope decision, "true blank on the clock"
- [Source: _bmad-output/planning-artifacts/architecture.md#Key Abstractions] — phase-as-clock, invalid-states-as-data, cross-cutting singletons
- [Source: _bmad-output/implementation-artifacts/1-1-multi-rope-simulation-core.md#Tasks + Review Findings] — interim trip fence, disjointness invariant, deferred items this story touches
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — the two deferred findings adjacent to this rewrite (offer check in buffer branch; read-clamp)
- [Source: js/game.js:71-127] — crossing loop, buffer branch, interim trip branch (line refs verified against the working tree)
- [Source: js/shell.js:386-412] — `tripped` → saveBest, event-driven audio/juice contract

## Dev Agent Record

### Agent Model Used

Qwen3.8-Flash (ultrafast/qwen)

### Debug Log References

- RED leg observed (2026-11-02): `node --test tests/tripresolution.test.js` before implementation — 12 failures, all right-reason: `createRun().iFrames` undefined, strip legs fatal-tripped (`tripped true`) via the 1.1 interim branch, zero harmless crossings in every scripted blank, out-of-range strip absent. The last-rope death leg passed pre-implementation (branch kept verbatim — expected green).
- First GREEN pass surfaced one test-bug, not an impl bug: the per-N blank leg asserted `run.iFrames === 0` after the loop, but at N ≥ 3 the first *live* crossing is itself a fresh strip that re-arms i-frames. Test now asserts the blank closed when the count drains to zero (implementation behavior was correct throughout).
- Full suite: 160/160 pass, ~1.8 s (< 10 s budget). `git diff tests/` = only the two sanctioned `multirope.test.js` legs + one new file; all v1 frozen files byte-identical (`git diff --exit-code` clean, incl. `boundary.test.js`).

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- `createRun` appends `iFrames: 0` last; `tickRun` reads it guarded — `Number.isFinite(run.iFrames) ? Math.max(0, run.iFrames) : 0` — because `Math.max(0, NaN)` is NaN, the plain-Math.max form in Task 1 would leak NaN into the record; the guard matches `clampRopes`' invalid-states-as-data precedent.
- Crossing resolution is now i-frames → clearance → buffer → strip/death. The blank branch only decrements and `continue`s; skips don't accrue during it, so no offer can fire mid-blank.
- Strip writes `ropes: clampedCount - 1` (heals `7 → 4` on transition) and arms `iFrames = post-strip count`; the death branch is the v1 text verbatim and leaves `ropes` untouched (`ropes` is only written back on strip, so untouched records stay exactly as they were).
- Deferred offer decision taken: `shouldOfferUpgrade` NOT added to the buffer-forgiven branch — v1-frozen cadence, stays with Epic 6; the honest comment above the buffer branch is unchanged.
- Shell, audio, renderer: zero changes. `'ropeLost'` intentionally falls through `JUICE_TIERS`/`VOICES` lookups silently (Story 5.2 ships the thud); `tripped` remains fatal-only so `shell.js` saveBest stays correct.
- Blank-span measurement note for reviewers: the R harmless passes after a strip span exactly one revolution, so the test measures trip tick → last harmless tick ≈ `TICKS_PER_REV` (±2 ticks, equal across N). The first live crossing follows one rope-gap (1/R revolution) later — the story's "trip tick → first live crossing tick" phrasing measured literally would be (R+1)/R revolutions and not invariant; AC3's own equation ("R evenly spaced passes = ≈ one revolution") is what the test pins.
- `git diff --stat tests/`: `multirope.test.js` +20/−9 across exactly the two interim legs; new file `tests/tripresolution.test.js` (15 legs).

### File List

- `js/game.js` — modified (`iFrames: 0` in `createRun`; guarded read, blank branch, strip/death rewrite, `iFrames`/`ropes` in return)
- `tests/tripresolution.test.js` — new (15 legs, red-green)
- `tests/multirope.test.js` — modified (two interim trip legs re-contracted only)

### Change Log

- 2026-11-02: Story 1.2 implemented — rope-as-HP trip resolution (strip one rope + i-frame blank at N ≥ 2), byte-identical v1 last-rope death, new `'ropeLost'` event, `iFrames` run field. 160/160 tests green; frozen suite untouched.
- 2026-11-02: Code review patches applied — iFrames read capped at MAX_ROPES (immortal-blank guard, new leg), k≥1 phase-dependent-tail leg added, strip-branch comments document the revolution floor nuance / streak policy (→1.4) / disjointness-dependent break. 162/162 green.
