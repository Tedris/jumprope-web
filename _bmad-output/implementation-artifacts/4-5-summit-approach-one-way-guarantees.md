---
baseline_commit: 2c3e693
---
# Story 4.5: Summit approach & one-way guarantees

Status: done

Baseline: `2c3e693` (Story 4.4 done — JUICE_TIERS `ascend` row + VISTAS rope column shipped, gate **424/424 green @ ~8.5 s**, tree clean, verified at authoring time 2026-11-08). Final story of the Ascent Ladder epic: the machinery is shipped — this story **pins the rules of ascent as invariants** (adversarial seeded sims, i-frame interlock semantics) and lands the one presentation loose end the ledger has carried since Story 2.3: the marker that promises a ceiling the sim refuses during i-frames. Every line cited below was re-verified against the working tree at `2c3e693`.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player nearing the top,
I want the summit to feel like the top — and the rules of ascent to never surprise me,
So that the final push reads clearly and fairly.

## Acceptance Criteria

(verbatim from `_bmad-output/planning-artifacts/epics.md:699-717` — FR15, FR8 seam, FR9, FR6)

**Given** the run is in Moon Approach (area 5)
**When** vistas and HUD render
**Then** the summit tier is distinctly presented (palette/horizon + the Story 2.3 marker in win-target mode) (FR15, FR8 seam)

**Given** adversarial sequences in seeded sims (peaks straddling two ceilings in one tick, ascents during i-frames, ascent while a mercy buffer decays)
**When** invariants are checked
**Then** one-way ≤5-area monotonicity holds, ascent never fires during i-frames' blank passes, and no sequence double-ascends (FR9)

**Given** a full summit run in the headless gate
**When** the bot reaches area 5 and breaks 2,100 u
**Then** the win state fires exactly once and the area ladder is the only path there (FR6, FR9 end-to-end pin)

### AC-to-verification map (decided — do not re-litigate)

| AC | How it is proven headlessly |
|---|---|
| AC1 | The area-5 **vista half already ships** (4.3's `VISTAS` row 5 `js/render3d.js:72` — sky `0x060610`/floor/prop + 4.4's rope column `0xffffff`; pairwise-distinctness across all five tiers is already fenced by frozen `tests/areavistas.test.js` §2 `:230-256`) — **zero renderer delta, and the new suite must NOT re-pin what §2 pins**. The NEW seam is the marker's 4→5 flip into win-target mode: the "win-target mode" of the Story 2.3 marker is the `area === SUMMIT_AREA ? 'summit ' : 'ceiling '` label arm at `js/shell.js:558` (verified: there is no separate "/"-or-ceilingless mode), frozen only in isolation (`tests/ceilingmarker.test.js:296-312`, static `forceArea` payload). The new §3 leg walks the SIM ascend into area 5 and watches the label flip end-to-end. Plus the blocked-at-ceiling arm (D-b) in both ceiling and summit mode. |
| AC2 | `tests/summitapproach.test.js` §1 (i-frame interlock, ledger-quoted pin) + §2 (straddle / blank / mercy-decay / seeded cadence sims). All legs verified constructible at baseline (scratch-proven at authoring; tick numbers below are MEASURED, not guessed). |
| AC3 | §2.6: real scripted-bot headless walk from a seeded area-4 record to the real 2,100 u break, ticking PAST the win — win count must stay 1. Measured at authoring: seed 44 → winTick 17,385 ticks (~9 ms of suite time), area trace monotone, every area bump paired with an `ascend` event, 141 skips (≥ 14 offer draws — the rng stream is genuinely consumed). |

### Loop contract (binding)

- Existing test files are frozen **except two sanctioned re-contracts, both written into Tasks below**: **R1** = `tests/ceilingmarker.test.js:362` comment-only re-contract (pre-authorized by `deferred-work.md:140`, quoted in Deferred obligations); **R2** = `tests/ceilingbreak.test.js` §6 diff-census allow-list entries (mechanism precedent: Story 4.4's own §6 census, review 4.4 Blind F2). Any OTHER existing-file red = implementation wrong; diagnose the code, never the file.
- `js/game.js` product code is **NOT touched by this story** — every invariant AC2/AC3 names already ships; this story PINS them (§4.1 fence). The only product-code delta is `js/shell.js` + `css/style.css` (the marker arm, D-b). No new run/payload/view fields (NFR7), no new timing surface anywhere (NFR8), no `index.html`/`package.json` delta.
- Gate `./run_tests.sh` before any edit: 424/424. After: 424 + ~21 new legs (± 3 if legs merge), suite < 10 s (NFR4). The single summit walk costs ~9 ms (measured); budget it plus the 1000-tick legs at ≤ 3 sim legs + 1 walk.

## Context — shipped state (verified line-by-line at 2c3e693)

**Sim (`js/game.js`, 330 lines):**
- `clampArea` `:71-78` (4.1: `clampRopes` arms mirrored, `+Infinity → SUMMIT_AREA`, garbage → 1) applied at the tick read `:121`; `areaPeriodMul` `:80-85`; `crossesCeiling(peak, area)` `:89-91` — strict `>`, deliberately unguarded (records heal at tick boundaries — 4.1 D-a).
- i-frames read at `:146`: `Number.isFinite(run.iFrames) ? Math.min(MAX_ROPES, Math.max(0, run.iFrames)) : 0` — **non-finite (incl. `Infinity`) behaves as "no i-frames"; there is no Infinity arm** (unlike `clampRopes`). Decrement happens ONLY on a blank crossing inside the loop (`:170-172`): a crossing-starved tick spends nothing.
- The ceiling check `:262-279` (runs after the crossings loop, once per tick): `const peak = altitude + nextPlayer.y; if ((status === 'running' || status === 'choose') && iframesLeft === 0 && crossesCeiling(peak, area))`. Summit arm `:264-273`: `status = 'over'; outcome = 'summit'; offer = null`, same-tick `'offer'` SPLICED out of events (2.4's fix shipped), `events.push('win')`. Non-summit arm `:274-278`: `baseAltitude = AREAS[area-1].ceiling; area += 1; events.push('ascend')`. One plain `if`, never a `while` (4.1 D-d). The gate reads the POST-LOOP `iframesLeft` — the tick whose crossing drains the last i-frame is ELIGIBLE to ascend that same tick. `nextRun` writes `iFrames: iframesLeft` at `:280` — `run.iFrames` is the live record field.
- `createRun` `:111` carries `iFrames: 0, area: 1, baseAltitude: 0, outcome: null`; `ROPE_PERIOD = 1.3` `:15`; `SUMMIT_AREA = AREAS.length` `:39`.

**Data (`js/areas.js:8-17`):** five frozen rows, ceilings 250/600/1000/1500/**2100** (`:16` row 5 = the summit win ceiling), periodMul 1.00→0.85. Rope feet window: `js/rope.js` `FEET_MIN 0.45`/`FEET_MAX 0.55`.

**Shell (`js/shell.js`):** `markerLine` `:551-559` — `''` unless `run.status === 'running'` (`:552`); area heal `const area = Math.min(Math.max(Math.round(Number.isFinite(run.area) ? run.area : 1), 1), AREAS.length);` (`:556` — the EXACT line the `tests/areavistas.test.js:181` markerHeal regex parses; NEVER alter it); `dist = Math.max(0, Math.ceil(AREAS[area-1].ceiling - run.altitude - player.y))` (`:557`); return `(area === SUMMIT_AREA ? 'summit ' : 'ceiling ') + dist + ' \u2191'` (`:558`). Marker write: `updateHud` `:579` (`markerEl.textContent = markerLine(run, player)`); marker span created `:93-102` (`className = 'hud-marker'` `:95`). Win presentation `:590-592` (`'Summit. Altitude …'`, `role-amber`) — untouched here. `tickRun` runs only while `run.status === 'running'` in the frame loop (`:646`) — post-`over` records are never re-ticked by the shell. `AREAS` + `SUMMIT_AREA` are already imported (`:1`) — the marker arm needs no new specifier (boundary fence `tests/boundary.test.js` untouched). `JUICE_TIERS` `:15-20` incl. 4.4's `ascend` row — **do not touch the juice census**.

**Renderer (`js/render3d.js`):** `VISTAS` `:57-81` five rows with the 4.4 `rope` column; row 5 `:72` moon-approach (sky `0x060610`, rope `0xffffff`); `vistaFor` `:83-85` (local clamp, boot wheel = two specifiers); edge-only apply `:456-467`. **This story needs NOTHING renderer-side — verified; do not touch VISTAS' table shape.**

**CSS:** `css/style.css:92` `.hud-marker { font-size: 20px; color: #8fd3ff; }` — the only marker rule; no opacity/dim rule exists anywhere. Exposure note (review 4.5, Edge): `tests/ropehud.test.js:168` DOES text-read the file, asserting only three pre-existing selectors — all untouched by the appended rule, which is why the gate stays green; the authoring claim "no test reads the CSS" was overstated.

**Prior-story intelligence:**
- **4.1** (D-b/D-d/D-f): `clampArea` domain heal; one-per-tick staircase pinned `tests/arealadder.test.js:183-208`; `ladderSim` technique `:217-247` (preApply seeds `altitude` just under a derived ceiling + score for the `altitude === ALT_PER_POINT × score` invariant, seeded rng, never `Math.random`); i-framed crafted ticks return cleanly (`:126-143`); D-f explicitly banks the interlock for 4.5 ("No banking, no queueing, no gate edits").
- **4.2** (D-b): the ascend tick re-clocks the NEXT tick, phase stays continuous — a straddle sim's revolutions are `period × periodMul(area)` long; that is where the §1 timing bounds derive from.
- **4.3** (D-c/§5): `markerHeal` cross-source fence (`tests/areavistas.test.js:176-185`) parses `js/shell.js` for the `const area = Math.min(Math.max(...AREAS.length));` expression — markerLine's body stays byte-identical, so the fence stays green; `vistaFor`'s local clamp mirrors markerLine's.
- **4.4**: JUICE_TIERS row + rope column shipped; §6 diff census pins a base sha (`tests/ceilingbreak.test.js:546-576`) — the allow-list mechanism R2 extends; its M8 row already reserved the marker arm for THIS story ("a marker claimed/blocked arm rides along → red"); payload zero-delta census is the pattern §3 re-uses.
- **Harness duplication**: this story's shell boot is the FIFTH fork (donor `tests/ceilingmarker.test.js:48-152` `bootCeilingShell` + an `iFrames` output-stamp in the `gameWrap`, mirroring its `forceAreaOut` at `:117`). The known ~90-line duplication is owned by the deferred harness-extraction chore (`deferred-work.md:45/:56`) — do NOT invent a shared harness file here.

## Design (decided — do not re-litigate)

**D-a — The i-frame interlock semantics are DECIDED: DENY, level-triggered, no banking.** `js/game.js` stays byte-identical; the shipped check (`:263`) *forgets* a suppressed crossing — nothing is banked, latched, or queued, and the verdict re-evaluates from live state on the first tick whose post-loop `iframesLeft === 0`. This is consistent with both AC2 clauses: at most one area event per tick (single `if`), and no event while an i-frame is live at gate time. The pathological crafted case (`iFrames: 1` + a rope that never crosses ⇒ suppression forever) is PINNED as accepted crafted-input semantics, not fixed — fixing it needs a latch field, which violates NFR7 (record key set is fenced by frozen `tests/altitude.test.js:48`) and NFR8 (a pending-ascend latch is a second clock). Live play is bounded by construction: a legitimate blank drains within one revolution (crossings recur every `period × periodMul`; the strip writes `iframesLeft = strippedTo` at `:241`, and the post-strip passes are evenly spaced). Falsifiable pins (§1): suppression on the summit arm; the same record with `iFrames: 0` wins the SAME tick (the gate, not the peak, is the suppressor); a suppressed-then-sub-ceiling peak NEVER re-fires (the bank mutant dies); the 720-tick crossing-starved `iFrames: 1` record resolves forever (verified: 0 wins, 0 ascends, `iFrames: 1` unchanged); a real strip trip with altitude ALONE over the ceiling re-fires exactly once on the FIRST tick whose record drains `iFrames` 1→0 — measured: area 4 ascend at tick 47 ≤ ⌈0.9 × AREAS[3].periodMul ÷ (1/60)⌉ + 1 = 49; area 5 WIN at tick 46 ≤ ⌈0.9 × AREAS[4].periodMul ÷ (1/60)⌉ + 1 = 47 (rig `FEET_EDGE {phase 0.44, period 0.9}`, STEP 1/60; derive both bounds from `AREAS[…].periodMul` and the rig's period field, never hardcoded). Gate edge to pin, not "fix": the drain tick IS eligible (post-loop read) — `tests/ascent.test.js:256-268` (area-1, frozen) already owns the "blankless tick spends no i-frames" half; this suite owns the summit half.

**D-b — The marker-side blocked-at-ceiling arm is the story's ONLY product-code delta: `js/shell.js` + one CSS rule.** During a live blank with `dist === 0` the line promises a break the sim refuses for up to ~1.3 s per remaining i-frame (`deferred-work.md:61`); the fix per the ledger's own sentence is marker-side. DECIDED shape (verify against the shipped structure above):

```js
// js/shell.js, directly after markerLine (:559) — markerLine itself stays
// byte-identical (areavistas §5's fence parses :556).
// Story 4.5 (deferred-work.md:61): blocked-at-ceiling — while a live i-frame
// blank gates the ascend OFF (game.js:263), the dist-0 line is promising a
// break the sim refuses. Live i-frames read exactly like tickRun :146 —
// finite AND positive: Infinity is non-finite, a crafted Infinity blank is
// dead (no suppression, so no dim; a > 0-only mutant would lie).
function markerBlocked(run, player) {
  if (run.status !== 'running') return false;
  // The markerLine clamp expression, textually identical — first regex match
  // stays markerLine's copy, so the areavistas §5 pairing fence is unaffected.
  const area = Math.min(Math.max(Math.round(Number.isFinite(run.area) ? run.area : 1), 1), AREAS.length);
  return Number.isFinite(run.iFrames) && run.iFrames > 0
    && run.altitude + player.y >= AREAS[area - 1].ceiling;
}
```

and at `:579`:

```js
    if (markerEl) {
      markerEl.textContent = markerLine(run, player);
      markerEl.className = 'hud-marker' + (markerBlocked(run, player) ? ' blocked' : '');
    }
```

plus after `css/style.css:92`:

```css
/* Story 4.5: blocked-at-ceiling — dimmed while a live i-frame blank holds the
   ascend the line telegraphs. Static opacity, no transition/animation. */
.hud-marker.blocked { opacity: 0.35; }
```

- **Equivalence (pin as a leg, it's the arm's contract):** `dist === 0 ⟺ run.altitude + player.y ≥ AREAS[area-1].ceiling`, because `Math.max(0, Math.ceil(x)) === 0 ⟺ x ≤ 0`. So the arm fires exactly when the ledger says ("while `iframesLeft > 0` and dist is 0") — and `markerBlocked` reads the same sum `markerLine`'s `dist` uses: one display path, no second altitude path (`:548-550` contract preserved).
- **DIM, not blink:** a blink needs a timer or CSS animation — forbidden (NFR8; shell has no timer to ride, and the ceilingbreak §6 timing fence plus this suite's §4.2 fence both read the sources). The opacity toggle is state-driven and reduced-motion-inert (5.4's territory untouched). House precedent: the state-driven `className` write at `js/shell.js:541` (`'hud-card' + (selected ? ' selected' : '')`).
- **Text is UNCHANGED while blocked** — the distance stays the truth; the dim says "the sim is refusing right now". This keeps frozen `tests/ceilingmarker.test.js:237-253` (at-ceiling `'ceiling 0 ↑'`, no i-frames ⇒ blocked false) and every `_cn === 'hud-marker'` finder (`:175-177`) green by construction: on boots without live i-frames the className write is a no-op value.
- The arm applies in summit mode identically (`'summit 0 ↑'` dimmed) — the same predicate, no area branch.

**D-c — AC1's summit presentation needs NO renderer delta and NO juice delta.** `VISTAS[4]` + `vistaFor` + the rope column ship the distinct tier (verified `js/render3d.js:57-81`); `tests/areavistas.test.js` §2 fences pairwise distinctness — the new suite adds exactly ONE presentation pairing: shell-boot, scripted SIM ascend from area 4 into area 5 (wrapper parks altitude just under `AREAS[4].ceiling`, mirroring `tests/ceilingmarker.test.js:222-235`'s donor technique) ⇒ the marker flips `'ceiling d ↑' → 'summit d' ↑` with `d` derived from `AREAS[4].ceiling − altitude − y`. The 4.4 M8 row's reservation is honored: the arm is the ONLY marker change; no `JUICE_TIERS`, `VOICES`, or `VISTAS` edits (`tests/ceilingbreak.test.js` §1/§6 censuses stay byte-green).

**D-d — The sim stays pure; the invariants are pinned as SHIPPED.** AC2's adversarial menu maps to shipped behavior, each scratch-verified at 2c3e693 before this line was written: (i) **straddle** (area 4, crafted `altitude = AREAS[4].ceiling + 50`, PARKED rope): tick 1 `ascend` only (4→5), tick 2 `win` only — never the same tick, ≤ 1 area event per tick, monotone; (ii) **ascent during i-frames**: nothing during the blank, one step per tick after it drains; (iii) **trip > ascend**: last-rope trip on a straddling tick ⇒ `['trip']`, no ascend, `outcome 'tripped'` (the non-summit sibling of frozen `tests/ascent.test.js:223`); (iv) **ascent while a mercy buffer decays**: `buffer: 0.05` survives the tick-start D-N01 decay (`:137`), the low crossing forgives (`skip`, `nearMiss`, buffer → 0) and the ceiling check fires the SAME tick (`ascend`, area+1, running) — measured `['skip','nearMiss','ascend']`; with `buffer: 0.001` (fully decayed pre-crossing at STEP 1/60) it is `['trip']`, no ascend. (v) **seeded cadence sims**: `ladderSim`-donor legs with `skips: 9` seeded so the `% 10` offer gate fires INSIDE the leg — the rng stream is provably consumed (ledger `:139`'s "seed near the cadence" option; seeds 41/42/47 for areas 1/2/3 verified trip-free and invariant-green at authoring; seed-sensitivity rides the Epic 6 balance pass as the ledger says). The 4.1 ladderSim vacuity itself is recorded in-run (§5 comment, Task 2.4) — the frozen file stays byte-identical.
- **AC3 walk** (measured): `startRun` → seed `{area: 4, baseAltitude: AREAS[2].ceiling, altitude: AREAS[3].ceiling − 20, score: altitude/ALT_PER_POINT}` → policy jumper (grounded ∧ phase ∈ [0.2, 0.35] ⇒ `jump(player, 0.5)`), STEP 1/120, seeded `mulberry32` (donor `tests/arealadder.test.js:217` + `tests/support/balance-harness.js:40`), choose ⇒ `applyCard(offer[0])` + `resumeRun` (ARCH-02, never `startRun`). Reaches area 5, breaks 2,100 at tick ≈ 17.4 k (9 ms), 141 skips. **Keep ticking 240 ticks past the terminal record** — `tickRun` on an `'over'` record cannot re-fire (gate requires running/choose, `:263`) — wins must total exactly 1. Ladder-only-path census per tick: every `area` increment pairs 1:1 with an `ascend` event; a `win` event implies `area === 5 ∧ status 'over' ∧ outcome 'summit'`; the area trace is strictly monotone within [1, 5].

**D-e — Two sanctioned re-contracts (exact text in Tasks); census exposure is complete.** No other existing test reads anything this story changes functionally: `tests/ropehud.test.js:168` text-reads `css/style.css` but its three `assert.match` selectors are untouched by the appended rule (review 4.5, Edge correction — "no test reads the CSS" was overstated); no test outside `ceilingmarker.test.js` reads the marker element; the frozen marker boots never have `iFrames > 0`, so the dim is invisible to them; `markerLine`'s parsed line is untouched, so `areavistas` §5 stays green.

## Deferred obligations (embedded verbatim per loop mandate)

From `_bmad-output/implementation-artifacts/deferred-work.md:54-55` (code review of Story 2.2; **OWNER CONFIRMED at Epic 3 close**) — quoted verbatim:

> - **i-frame-suppressed summit peak is not banked** (`js/game.js` ceiling-check gate `iframesLeft === 0`) — the check is level-triggered, so the win re-fires on a later live tick; live play is bounded (the blank drains ≤ 1 revolution and `altitude` alone crossing re-fires regardless of arc), but a crafted crossing-starved record with `iFrames: 1` resolves forever. Story 4.5 must pin the deferral semantics in its i-frame interlock text.
>   - **OWNER CONFIRMED at Epic 3 close** (2026-11-08): Story 4.5's create-story MUST embed the deferral-semantics pin verbatim in its i-frame interlock text.

**Disposition: Story 4.5 resolves this item.** The pin is D-a: DENY (no banking), level-triggered, falsifiable legs §1.1–§1.7. Mark the ledger entry PAID in the change set (same pattern as 4.1's `:50-51` PAID note).

From `deferred-work.md:61-62` (code review of Story 2.3; **OWNER CONFIRMED at Epic 3 close**) — quoted verbatim:

> - **Marker pins `ceiling 0 ↑` while i-frames suppress the ascend** (`js/shell.js` markerLine vs `js/game.js` ceiling-check gate) — during a rope-stripped blank with ≥2 ropes, the telegraph promises the ceiling for up to ~1.3 s per remaining i-frame and the sim refuses to break it; the suppression is intentional (Story 4.5 interlock), so the fix is a marker-side blocked-at-ceiling arm (dim/blink the line while `iframesLeft > 0` and dist is 0). Claim in Epic 4/5's ascent-polish pass alongside the 4.5 deferral pin.
>   - **OWNER CONFIRMED at Epic 3 close** (2026-11-08): claimed into the Epic 4/5 ascent-polish story text at creation, alongside the 4.5 pin.

**Disposition: Story 4.5 resolves this item.** Shipped as D-b (dim chosen over blink with rationale; the arm's predicate is the ledger's condition verbatim via the dist-equivalence). Mark PAID.

From `deferred-work.md:140` (code review of Story 4.1) — quoted verbatim:

> - **`tests/ceilingmarker.test.js:362` rationale comment now false** ("payload-only: the sim has no domain guard until 4.1") — Story 4.1 shipped that guard; behavior of the leg is unaffected (inputs flow through the already-clamped stand-in at `:117`), but the next editor could "clean up" the stand-in and re-expose the TypeError path the sim now heals. Fix is a one-line comment re-contract, which the frozen-test discipline forbids OUTSIDE an authorizing story. Owner: Story 4.5 (its create-story writes the sanctioned re-contract into the story text, same lane as the deferred-work:60–61 marker arm it already carries).

**Disposition: Story 4.5 ships it — re-contract R1, Task 3.1, comment-only, zero behavior change.** Mark PAID.

From `deferred-work.md:139` (same review; "Story 4.5's seeded adversarial matrix owns the decision: seed near the cadence (accepting seed-sensitivity documented as a 6.x flake surface) or record the vacuity in-run") — **DECIDED both ways: the NEW suite's seeded legs seed near the cadence (`skips: 9`, rng provably live — D-d(v)); the frozen 4.1 `ladderSim` vacuity is recorded in-run (§5 leg comment, Task 2.4) — `tests/arealadder.test.js` stays byte-identical, and the seed-sensitivity note rides to Epic 6.**

## Tasks / Subtasks

- [x] Task 1 (AC: 2): RED FIRST — NEW `tests/summitapproach.test.js` §1+§2, the interlock + adversarial matrix (pure sim: namespace `game` import, hand-built rigs `FEET_EDGE {phase 0.44, period 0.9}` / `PARKED {phase 0.05, period 100}` / `AIRBORNE {y 40, …}` / `GROUND {y 0, grounded true, …}`, `rngStub = () => 0.5` — donor `tests/arealadder.test.js:19-37`; all expectations derive from `AREAS` + `ALT_PER_POINT`, house rule; seeds via `mulberry32` from `tests/support/balance-harness.js`)
  - [x] 1.1 §1 summit peak during a live blank (`area: 5`, `altitude: AREAS[4].ceiling − 30`, `iFrames: 1`, PARKED, AIRBORNE): no `win`/`ascend`/`trip`, `status 'running'`, `outcome null`, `run.iFrames === 1` — the summit twin of frozen `ascent.test.js:256` (different gate arm; not a re-pin)
  - [x] 1.2 The identical record with `iFrames: 0` wins the SAME tick (`over`/`'summit'`/`'win'`) — the gate, not the peak, suppresses
  - [x] 1.3 DENY pin: one suppressed AIRBORNE tick, then grounded PARKED ticks (peak legally below), then `iFrames: 0` grounded — NOTHING ever fires; no latch (kills M2)
  - [x] 1.4 crossing-starved crafted record: 720 ticks, assert forever-pinned numbers (measured at authoring)
  - [x] 1.5 live drain re-fire, area 5: rig `altitude: AREAS[4].ceiling + 5, ropes: 2`, FEET_EDGE, GROUND ⇒ tick 0 `ropeLost` (`iFrames → 1`, suppressed despite the peak); then the FIRST tick whose record drains 1→0 is the WIN tick — exactly once, span bounded by the derived area-5 revolution (D-a); no area event on any `iFrames > 0` record-tick
  - [x] 1.6 same rig at area 4 ⇒ ONE `ascend` at the drain tick, bounded by the derived area-4 revolution; break the loop at the ascend (the grounded player legitimately trips later — measured tick ~110; that is physics, not this pin)
  - [x] 1.7 straddle WITHOUT i-frames: area 4, `altitude: AREAS[4].ceiling + 50`, PARKED ⇒ tick 1 `ascend`-only (4→5), tick 2 `win`-only, quiet after — "no sequence double-ascends" for the two-ceiling peak (kills M3/M4)
  - [x] 1.8 straddle + `iFrames: 1`: nothing during the blank; after clearing, one step per tick, win exactly once
  - [x] 1.9 trip > ascend (non-summit twin of frozen `ascent.test.js:223`): `ropes: 1`, ceiling−10, FEET_EDGE, GROUND ⇒ `['trip']`, `outcome 'tripped'`, no `ascend`
  - [x] 1.10 mercy-buffer: `buffer: 0.05` ⇒ `['skip','nearMiss','ascend']`, buffer 0, area+1, running; `buffer: 0.001` ⇒ `['trip']`, no ascend (decayed ⇒ trip beats ascend)
- [x] Task 2 (AC: 2, 3): seeded sims + the summit walk (same file, §2)
  - [x] 2.1 `ladderSim`-donor sim function (per D-d(v)): per-tick asserts — integer area ∈ [MIN_AREA, SUMMIT_AREA], step ∈ {0, +1} only, `ascend` count ≤ 1, no `ascend`/`win` on an `iFrames > 0` record-tick, `baseAltitude` tracks the row left, `altitude === ALT_PER_POINT × score`, choose resolves via `applyCard(offer[0]) + resumeRun` with non-empty offer
  - [x] 2.2 cadence legs: seeds 41/42/47 seeded `skips: 9` under areas 1/2/3's ceilings, 1000 ticks — trip-free (verified at authoring), ≥ 1 rng draw asserted (`picks > 0`)
  - [x] 2.3 the AC3 walk (D-d, exact recipe): monotone ladder-only trace, `reached area 5`, break `AREAS[4].ceiling`, **win exactly once incl. 240 post-win ticks**; per-tick pairing: area bump ⟺ `ascend`; `win` ⇒ area 5 ∧ over ∧ summit
  - [x] 2.4 in-run note (file-header comment): 4.1 `ladderSim` vacuity recorded per ledger `:139`; this suite's legs are rng-live by construction; seed sensitivity is Epic 6's flake surface
- [x] Task 3 (AC: 1): presentation — R1 re-contract, then the §3 shell/renderer legs (red first)
  - [x] 3.1 **R1** (`tests/ceilingmarker.test.js`, COMMENT ONLY — no behavior, no count change): line 362 becomes exactly: `      env.script.forceAreaOut = area; // payload-only: 4.1 shipped clampArea; this stand-in keeps the leg marker-side (story 4.5 sanctioned comment re-contract)`
  - [x] 3.2 §3 marker flip: boot donor `bootCeilingShell` + `iFrames` output-stamp in `gameWrap`; wrapper parks altitude just under `AREAS[3].ceiling` at area 4 (donor ceilingmarker `:222-235` technique) ⇒ the SIM ascends ⇒ marker flips `'ceiling d ↑' → 'summit d' ↑`, both `d`s derived from `AREAS`
  - [x] 3.3 §3 blocked-arm legs (D-b): (a) iFrames > 0 ∧ dist 0 (crafted record stamped via the wrapper, area 4 and area 5) ⇒ `className === 'hud-marker blocked'`, TEXT unchanged (`ceiling 0 ↑` / `summit 0 ↑`); (b) same boot, iFrames 0 ⇒ className back to `'hud-marker'`; (c) iFrames > 0 ∧ dist > 0 ⇒ NOT dimmed; (d) equivalence leg: blocked ⟺ `markerDist(env) === 0 ∧ iFrames > 0` across a payload matrix (uses the `ceil(x) ≤ 0 ⟺ x ≤ 0` arithmetic); (e) crafted `iFrames: Infinity` ⇒ NOT dimmed (sim not suppressing — `:146` non-finite arm mirrored); (f) choose/over payloads ⇒ text `''` and className un-dimmed
  - [x] 3.4 §3 truthfulness: one scripted trip boot — while the payload shows `iFrames ≥ 1 ∧ dist 0` the ticked events carry NO `ascend`; the dim lifts the tick the blank ends
  - [x] 3.5 §3 payload zero-delta: view/run key sets identical to a pre-change frame (4.4 donor census) — the arm adds NO payload field
- [x] Task 4 (AC: 1–3): product code (GREEN the §3 shell legs — sim untouched)
  - [x] 4.1 `js/shell.js`: add `markerBlocked` after `markerLine` and the two-line `updateHud` write EXACTLY per D-b; `markerLine` byte-identical; the duplicated clamp line textually identical to `:556`
  - [x] 4.2 `css/style.css`: the one `.hud-marker.blocked { opacity: 0.35; }` rule per D-b — no transition, no animation, nothing else
  - [x] 4.3 §4 source fences: `js/game.js` byte-identical to baseline (source-sha/slice census — kills M12); no `setTimeout`/`setInterval` and no wall-clock read inside `markerBlocked` (NFR8, kills M11); `js/shell.js` imports unchanged (two-boundary safety)
- [x] Task 5 (AC: 1–3): hygiene & census
  - [x] 5.1 **R2** (`tests/ceilingbreak.test.js` §6, Set-entry lines only, rest byte-identical): add to the `allowed` Set: `'css/style.css'`, `'tests/summitapproach.test.js'`, `'_bmad-output/implementation-artifacts/4-5-summit-approach-one-way-guarantees.md'` + a one-line comment naming this story (the tripwire by design enumerates the story-authorized set; 4.5's legitimate files must be listed or every later gate run fails — review 4.4 Blind F2's own mechanism)
  - [x] 5.2 §4.3 in-file census: `git diff --name-only 2c3e693` (shallow fallback to `diff HEAD`) = exactly `js/shell.js`, `css/style.css`, `tests/summitapproach.test.js`, `tests/ceilingbreak.test.js`, `tests/ceilingmarker.test.js`, this story file, `sprint-status.yaml`, `deferred-work.md` — anything else violates the frozen list
  - [x] 5.3 Gate `./run_tests.sh` green (424 + ~21); suite < 10 s; every mutation row below turns a named leg red, then restore byte-identical
  - [x] 5.4 Ledger PAID notes on `deferred-work.md:54-55`, `:61-62`, `:140` (+ a disposition line under `:139` naming this story's decision); Change Log below filled; story/sprint flips ride the same commit; message cites the gate + "2 sanctioned re-contracts (ceilingmarker :362 comment, ceilingbreak §6 census entries)"

## Test Plan (`tests/summitapproach.test.js`, mutation-proven)

| § | Legs | AC |
|---|---|---|
| §1 i-frame interlock (crafted rigs) | 8 legs (1.1–1.10; 1.7–1.10 straddle/trip/buffer live here) | 2 |
| §2 seeded sims + summit walk | 3 legs (2 cadence + 1 walk) | 2, 3 |
| §3 presentation (shell boots ×~8, one renderer boot zero — none needed) | 6 legs | 1 |
| §4 static fences | 3 legs | 1, 2, 3 |
| total | ~20 (+±3) | 424 → ~444 |

**Mutation matrix** (each MUST redden a named leg; restore `js/` byte-identical after):

| Mutant | Red witness |
|---|---|
| M1 gate drops `iframesLeft === 0` (ascend during blanks) | §1.1/§1.5/§1.8 red AND frozen `tests/ascent.test.js:256` red |
| M2 banking added (`pendingAscend` latch/record field) | §1.3 red (+ frozen `altitude.test.js:48` key-set red if the field ships) |
| M3 `while` instead of the plain `if` | §1.7 red (double step same tick) + frozen `arealadder §4` red |
| M4 summit arm also increments `area` | §1.7/§2.3 red (trace leaves 1..5 / ladder-only pairing red) |
| M5 summit arm forgets `status = 'over'` | §2.3 red (win repeats during post-win ticks); §1.5 red |
| M6 `markerBlocked` reads `run.iFrames >= 0` (always live) | §3.3b red (never un-dims) |
| M7 arm drops the dist-0 (ceiling-sum) clause | §3.3c red (dims far from the ceiling) |
| M8 arm drops the `Number.isFinite` mirror of `game.js:146` | §3.3e red (dims on a dead Infinity blank the sim ignores) |
| M9 `>` instead of `>=` in the sum | §3.3d equivalence red (exactly-at-ceiling payload: dist 0, not dimmed) |
| M10 dim moved to a CSS animation / any timer | §4.3 source fence red (frozen `ceilingbreak §6` timing fence too) |
| M11 product delta moved into `js/game.js` (gate "fix") | §4.3 byte census red; §4.2 census red |
| M12 marker text gains a blocked glyph (claims-mode creep) | §3.3a text-unchanged red + frozen `ceilingmarker.test.js:237` red (4.4 M8's reservation) |

## Regression watch (frozen-suite exposure — analyzed at authoring against 2c3e693)

- `tests/ceilingmarker.test.js` — GREEN by construction: no boot in it ever has `iFrames > 0` (records from `createRun` + wrappers stamping area/score only), so `markerBlocked` is false everywhere: text AND `_cn` values unchanged (`_cn === 'hud-marker'` finder `:175-177` safe; the className write is value-identical on those frames). Line `:362` is the ONLY touch (R1, comment-only). The crafted-area leg's `:117` clamp stand-in stays as-is.
- `tests/ascent.test.js` — GREEN: `js/game.js` untouched; its i-frame leg `:256-268` is the area-1 sibling §1.1 mirrors at the summit (different arm — no re-pin, no collision); shell legs use `markerLine`'s unchanged text path.
- `tests/arealadder.test.js` — GREEN: §4 staircase (`:183-208`) and §5 `ladderSim` untouched (vacuity RECORDED in-run per ledger `:139`, not fixed); byte-identical, zero re-contract.
- `tests/areavistas.test.js` — GREEN: markerHeal regex (`:176-185`) first-matches markerLine's untouched `:556`; the byte-identical duplicate inside `markerBlocked` matches the same expression (pairing semantics unchanged); §5 crafted legs read vista colors only.
- `tests/ceilingbreak.test.js` — §1/§2/§3/§4/§5 GREEN (juice census, VOICES, timing fence, pools — nothing touched). §6 diff census **RED by design the moment 4.5 adds files** (its `allowed` Set enumerates 4.4's authorized set; `css/style.css` from the dev round and the new files from the review-round commit trip it) → re-contract **R2**, Task 5.1.
- `tests/juice.test.js`, `tests/feel.test.js`, `tests/feelcap.test.js`, `tests/areapressure.test.js`, `tests/winloss.test.js`, `tests/balance.test.js`, `tests/headless-sim.test.js`, `tests/v1parity.test.js`, all bootShim shell suites — GREEN by construction: sim byte-identical (their witnesses), `game.js` imports unchanged, `css/style.css` read by no test, marker element read by no other suite. `tests/boundary.test.js`/`tests/hygiene.test.js` — no import-graph/gate/doc surface moves.
- Boot budget: ~8 new boots (≈ +0.5 s) + 3×1000-tick legs + one ~17.4 k-tick walk (9 ms) ⇒ suite lands ≈ 9.1–9.5 s < 10 s (NFR4). Gate math: 424 + ~20 ≈ 444; R1/R2 move no counts. The suite's boot count feeds the recorded boot-count observation (4.3 review F3) — no fence, no action.

### Dev notes — files being modified (read before editing)

- `js/shell.js` — state today: `markerLine` `:551-559` text-only; `updateHud` `:579` writes `textContent` only; className writes exist ONLY for cards `:541`/prompt `:605`/pips `:617`. Preserve: markerLine byte-identical, payload key sets (`:683-685` area), the `over+summit` prompt arm `:590-592`, JUICE_TIERS `:15-20`.
- `css/style.css` — state today: one marker rule `:92`. Preserve everything else byte-identical.
- `js/game.js`, `js/render3d.js`, `js/areas.js`, `js/rope.js` — read-only references; ZERO delta (D-a/D-c).

### Repo guardrails (AGENTS.md — binding)

Frozen-test discipline `:52` (this story authorizes exactly R1+R2); do-not-touch `tests/`/`run_tests.sh`/`.github/` `:73` except sanctioned re-contracts; expectations derive from records/metadata, never hardcoded tables; NFR7 no new record fields; NFR8 no new clocks; NFR4 determinism — every sim leg seeded (`mulberry32`), never default `Math.random`.

### References

`_bmad-output/planning-artifacts/epics.md:699-717` (ACs); `epics.md` Epic 4 intro (FR9/FR15); `gdd` FR6/FR8/FR9/FR15 via epic citations above; `deferred-work.md:54-55/:61-62/:139-140`; shipped code: `js/game.js:146/:262-279/:280`, `js/shell.js:551-559/:579`, `js/areas.js:16`, `js/render3d.js:57-85`, `css/style.css:92`; test donors: `tests/ascent.test.js:256`, `tests/arealadder.test.js:217-263`, `tests/ceilingmarker.test.js:48-152/:222-253/:353-371`, `tests/areavistas.test.js:176-185`, `tests/ceilingbreak.test.js:546-576`; harness: `tests/support/balance-harness.js:40`.

## Questions

None — every open thread was resolved against the tree at 2c3e693: "marker in win-target mode" = the shipped `SUMMIT_AREA` label arm (`js/shell.js:558`, no separate mode exists); the banking fork resolved DENY with the falsifiable legs in D-a; the CSS census exposure is fully covered by R2 (no test reads the stylesheet).

## Dev Agent Record

### Agent Model Used

lane-qwen38-ultra/qwen (Dev45 worker, Epic 4 autopilot dev round)

### Debug Log References

- Red-first: `tests/summitapproach.test.js` 20/22 red pre-product (both §3.3 green witnesses exactly), `424 passed 446 total` baseline leg; 446/446 @ 8.6 s post-product; suite 21→22.
- Mutation matrix (sha256-restore verified every mutant): M1 13-red; M2 11 (incl. frozen `altitude.test.js:48` + §3.5); M3 5 (incl. frozen `arealadder §4`); M4 6; M5 6; M6 2; M7 2; M8 1 (§3.3c/e — precision kill); M9 3; M10 2 (incl. frozen `ceilingbreak §6`); M11 2 (§4.1 sha + §4.3 census); M12 3 (incl. frozen `ceilingmarker.test.js:237`). All 12 killed, each by its story-named witness.
- Rig regressions diagnosed at authoring of the legs, not the code: (a) the frozen `arealadder §2` `isFinite` test proves `Infinity` input ⇒ 0 — M11's "would also win under Infinity" was wrong (pin-only arm); (b) the crafted-straddle leg needs the donor twin payload (`ceiling+100`, airborne y 10): a GROUND at `ceiling−10` cannot trip under strict `crossesCeiling` — the story sketch's `run.status === 'tripped'` literal is vacuous (Task 2's own "verify before pinning" resolved); (c) the §3.3c Infinity-phase payload ascended inside the same 6-substep frame — an airborne dist-0 peak legitimately crosses once i-frames die (correct shipped behavior); fixed by grounding before the dist-0 stamp (strict `>` then keeps the peak at exactly the boundary). Post-win corpse discovery: the crossing loop is status-blind — a failed pass AFTER the win re-stamps the corpse (ascent.test.js:242 "corpse cannot fire" refers to the gate); terminal asserts re-pinned to the win tick.

### Completion Notes List

- D-a DENY pin shipped: interlock text verbatim; §1.4 falsifiable forever-pin; §1.3 live no-bank witness (M2); M11 predicted red on a game.js move — confirmed (the matrix ran M11 against a copy of the story-suggested arm: §4.1 sha census red as designed, so §1.2/§1.5/§1.8 need no sim-purity leg).
- D-b dim shipped (rationale vs blink: NFR8 + no shell timer); dist-0 via the `ceil(x) ≤ 0 ⟺ x ≤ 0` equivalence; §3.5 zero-field delta census (M1-type mutation confirmed red) + M12 text-unchanged.
- D-c pure read-path-only; §3.1 static fence; §3.2 A/B/C/D boot legs (B1-B4); §4.3 css census leg extended to every `.blocked` rule (M10's animation dodge closed).
- D-d all shipped as AC2-verified; §2.2 seeds at `skips: 9` INSIDE the invariant legs with the rng draw counter wrapping the REAL `mulberry32` import (ledger `:139` option 1 = YES); §2.3 walks to the REAL 2,100 break + 240 post-win ticks, exactly one win, trace [1..5], pairing every increment with an `ascend`.
- Deviations: (1) R2's `allowed` set carries a FOURTH entry `tests/ceilingmarker.test.js` — mechanically REQUIRED: the census base is 5659fd4 (Story 4.3's last change), so R1's sanctioned :362 touch trips the pre-R2 leg; the sanctioned extension mechanism, no second story mechanism. (2) §1.5/§2.3 terminal outcome asserts pinned at the win tick (post-win restamp discovery above). (3) §1.7 asserts the summit-area immutability immediately (M4 witness hardening beyond the sketch). (4) §1.9's straddle payload per (b) above.
- Deferred added: dev-round section — the blink-free dim FEEL rides the browser UAT lane.

### File List

- `js/shell.js` — `markerBlocked` (6 lines + header FR15.1 note) + the two-line `updateHud` className write. NOTHING else.
- `css/style.css` — `.hud-marker.blocked { opacity: 0.35; }` + comment (one rule).
- `tests/summitapproach.test.js` — NEW, 22 legs (§1 11 + §2 3 + §3 9 shell legs… 22 total incl. §4 4 legs), boot donor `ceilingmarker:48-152` + the `iFrames` output-stamp.
- `tests/ceilingmarker.test.js` — R1: the single :362 comment line.
- `tests/ceilingbreak.test.js` — R2: `js/shell.js` removed from, `tests/summitapproach.test.js` + `css/style.css` added to the §6 census set; + the fourth-entry `tests/ceilingmarker.test.js` (deviation 1).
- `_bmad-output/implementation-artifacts/deferred-work.md` — PAID `:54-55`, `:61-62`, `:140`; disposition under `:139`; dev-round deferral section.
- `_bmad-output/implementation-artifacts/4-5-summit-approach-one-way-guarantees.md`, `sprint-status.yaml` — records/status.

## Change Log

- 2026-11-08 - Story created (create-story round @ baseline 2c3e693). Status: ready-for-dev. Ultimate context-engine analysis completed: every cited line re-verified against the tree; the summit walk, drain-refire, straddle, buffer and cadence legs were scratch-executed at authoring (tick numbers in D-a/D-d are measured, not estimated); ledger items deferred-work:54-55 (pin shipped as D-a), :61-62 (arm shipped as D-b), :140 (R1 comment re-contract), :139 (decision recorded, D-d(v)) are all claimed and disposed here.
- 2026-11-08 - Dev round complete (Dev45 @ base 2c3e693): product delta = `js/shell.js` markerBlocked + the updateHud write, `css/style.css` one opacity rule; `js/game.js` byte-identical (sha census §4.1). Re-contracts R1 (comment-only) + R2 (census set; +1 mechanically-required fourth entry) shipped as authorized. 22 new legs red-first; 12/12 mutants killed (matrix in Debug Log). Gate 446/446 @ ~8.6 s. Status: review.
- 2026-11-08 — Code review (3 parallel layers on commit 2e6d8d3 + 876-line diff): Auditor 0 findings (all AC legs real + sim/AREAS-derived; deviation #2 corpse-restamp adjudicated production-unreachable — the only tickRun caller is inside `status === 'running'`; Edge's 4 disclosed deviations all legitimate). Blind 4 P3 — F1 markerBlocked's bare-sum dist disagreed with markerLine's ceil-form inside the 1-ulp float-associativity tie window (verified counterexample: dim at "ceiling 1") → markerBlocked now reads markerLine's EXACT dist expression, bit-identical by construction (product); F2 the duplicated clamp was comment-pinned only (forceArea was input-stamped; the sim write-backs heal) → wrapper gained forceAreaOut + §3.3d out-of-domain cells (0, 4.6, NaN, Infinity) proving dim follows the SAME clamp as the text; F3 drain-tick eligibility prose-only → §1.5 now pins winTick to the first record whose iFrames drain 1→0; F4 blocked cells' first tick ran the sim with the PREVIOUS cell's i-frames → wrapper gained forceIFramesIn, §3.3a/§3.3d blanks live from tick 1. Edge 1 P3 — crafted fractional i-frames (0.5) drain past zero: one rendered frame refuses the verdict un-dimmed, bounded (tick 2 heals) → pinned as accepted crafted-input semantics §1.11, deliberately NOT "fixed" to `!== 0` (crafted −3 ascends — ≠0 would dim where nothing is refused); record fix: CSS-exposure claims at :62/:122 overstated (ropehud.test.js:168 does text-read style.css; its three selector asserts untouched) → corrected. Verdicts correct/correct/correct; 5 patches (1 product, 4 test) + 2 record lines, 0 defers, 0 dismissals. Gate 447/447 after patches @ ~8.5 s (+1 new leg); game.js sha still baseline-identical.
