---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
peelPassStepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
playerFuelPassStepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - _bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md
  - _bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/decision-log.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/implementation-artifacts/epic-6-retro-2026-11-10.md
  - docs/kickoff/readiness-audit-2026-11-07/decisions.md
  - _bmad-output/implementation-artifacts/epic-7-retro-2026-11-11.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-11-05.md
  - _bmad-output/brainstorming/brainstorm-mods-skins-engine-2026-11-05/.memlog.md
  - _bmad-output/brainstorming-session-2026-11-10.md
  - _bmad-output/game-architecture.md
  - _bmad-output/narrative-design.md
---

# jumprope-web - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for jumprope-web, decomposing the requirements from the GDD, UX Design if it exists, and Architecture requirements into implementable stories.

Scope note: v1.0 shipped 2026-10-22 (one-button jump, 8-card catalogue, PS1 renderer, procedural audio, pure sim core). This breakdown covers the **v2 design-intent delta** documented in the GDD — ropes-as-HP, altitude & ascent, rule-changing cards, the area ladder, and the feel/balance epics.

Scope note (v3-saga pass, 2026-11-12): epics 1–8 are shipped and closed; the **v3 Training Saga delta** (day-is-the-run, stations, stats/supercompensation, world/gates, dungeons, shadows, completion-as-state) is specified below as FR40–61 / NFR17–22 with epics 9–16. v1–v2 text in this file is the as-built ledger and stays frozen.

## Requirements Inventory

### Functional Requirements

Derived from GDD (the GDD states design intent without numbered FRs; these are extracted testable requirements). Items marked *(v1, unchanged)* are shipped behavior that v2 stories must not regress.

**Rope HP**

- FR1: The player holds 1–5 ropes; all ropes sweep the same phase clock at even phase offsets, so each pass through the feet-window (0.45–0.55) is both a scored skip and a fresh trip risk.
- FR2: Trip resolution order is mercy buffer → ropes → death: a trip with a live buffer becomes a scored near-miss; otherwise the player loses one rope (the **fastest** rope) and gains i-frames; a trip while holding exactly 1 rope ends the run.
- FR3: During i-frames (one pass per rope held — constant real-time blank regardless of rope count) no rope scores and none can trip.
- FR4: The rope count is visible on the HUD at all times during a run.

**Height & ascent**

- FR5: Each cleared pass accrues altitude as `altitude += ALT_PER_POINT × this pass's score` (as-built: `ALT_PER_POINT` = 2.5, Story 6.2 `616eb6c` — the v1 draft wrote the `2` placeholder) — score *is* altitude; one number on the HUD and one number recorded (best-altitude subsumes v1's best-score).
- FR6: Jump peak = current area base altitude + jump height; a peak crossing a mid-run area ceiling ascends the player to the next area; a peak crossing the summit (area 5) ceiling wins the run.
- FR7: The area ceiling ladder is 250 / 600 / 900 / 1,350 / 2,100 u (as-built — Story 6.2 sweep-derived, `js/areas.js`; altitude-per-skip 2.5, `js/game.js:42`).
- FR8: The HUD shows a ceiling marker for the current area ceiling, telegraphing each area break as a *moon-jump moment*.
- FR9: Ascent is strictly upward and one-way — no backtracking; a run visits at most 5 areas.

**Cards & offers**

- FR10: Offers fire on every 10th skip; the player picks one of 2 cards (one of 3 after skip 30); draws are rarity-weighted 70/25/5, distinct per offer, with capped cards filtered out. *(v1, unchanged)*
- FR11: The existing 8 multiplier cards (Cloud Shoes, Heavy Rope, Featherweight, Golden Handle, Wide Stance, Lucky Tally, Wide Brim, Wind-Up Handle) keep their exact v1 effects, rarities, and caps. *(v1, unchanged)*
- FR12: Four rule-changing cards are added: Spare Rope `extrarope` (+1 rope, max 5 total, cap 4, uncommon); Steel Cord `reinforce` (one rope gains a charge, survives one trip, up to 2 charged ropes at once, cap 2, uncommon); Second Wind `doublejump` (1 mid-air jump per ground contact, cap 2, uncommon); Launch Heels `highjump` (jump launch velocity +10%, cap 3, common).
- FR13: Card picks are made by pointer/tap on a card, or number keys 1/2/3. *(ASSUMPTION resolved by Story 3.5, 2026-11-08: the number-key picker shipped — never built in v1.0; pinned by `tests/pickerhud.test.js` and the key-map fence `tests/secondwind.test.js` leg 11.)*
- FR14: The owned-card HUD surfaces state-changing card state — rope count, cord charges, double-jump state — alongside the multiplier stack.

**Areas**

- FR15: Five areas are altitude tiers of one continuous vertical space (Alley → Rooftops → Blimp Deck → Stratosphere → Moon Approach — names shipped as drafted, code ids `alley/rooftops/blimp/stratosphere/moon-approach`, `js/areas.js`); each tier applies a palette, fog/horizon geometry, and an escalating rope-period multiplier (as-built ×1.00 / 0.95 / 0.88 / 0.82 / 0.76, tuned by the Story 6.2 sweep).
- FR16: A ceiling break changes rope appearance, palette, and horizon, and lands as a beat (stinger, hitstop, palette flip).

**Core play (v1 contract — regression surface for v2 work)**

- FR17: One-button jump: Space / Enter / pointer-down anywhere; hold-to-height, launch velocity `350 + min(hold, 0.5s) × 500` against gravity 1800 (reduced by hang-time cards). No coyote time. *(v1, unchanged)*
- FR18: Clearance: at the rising edge into the feet window, height must be ≥ the clearance threshold (base 18 u, lowered by clearance cards to ≈16.4 u). *(v1, unchanged)*
- FR19: Mercy buffer: a jump press arms a 0.10 s buffer that decays on the rope's phase clock; a would-be trip with a live buffer becomes a scored near-miss. One shared mercy; rope-HP does not replace it. *(v1, unchanged)*
- FR20: Near-miss & streak: cleared skips under 1.5 × threshold, or mercy saves, count as near-misses with streak bookkeeping; callout display coalesces to one per revolution under multi-rope.
- FR21: Scoring per pass is `(1 + additive bonuses) × score-multiplier`; near-miss and mercy-saved passes score the same as clean passes. *(v1 formula, unchanged; now feeds altitude per FR5)*
- FR22: Pause via P/Esc with full input-release hygiene via the shared release/resume path; mute/volume HUD toggle persisted. *(v1, unchanged)*
- FR23: `prefers-reduced-motion` damps cosmetics only — timing and judgment are never altered. *(v1, unchanged)*
- FR24: Persistence: best altitude and audio settings in on-device storage, degrading to session-only when unavailable. *(v1 best-score extended to best-altitude)*
- FR25: Run start: 1 rope, 1.3 s rope period, phase 0.33 lead-in with auto-launched 0.1 s-hold jump; no cards. *(v1, extended to rope system)*
- FR26: Win state: breaking the summit ceiling presents a win; trip with one rope presents run-over with final altitude as the final score. No other endings.

**Audio**

- FR27: Procedural WebAudio SFX on a master bus, gesture-gated AudioContext, persisted mute/volume; audio follows gameplay — nothing may beat-lock the rope. *(v1, unchanged)*
- FR28: New procedural voices: ascent stinger and win fanfare; rope-loss thud adapted for multi-rope; last-rope tension audio treatment (mix decision in Epic 5).
- FR29: `audio/track.ogg` (TRACK-1) **shipped — Story 5.6** (2026-11-09); the mechanism's silence-degradation legs stay pinned — v1 behavior unchanged for an absent file.
- FR30: The pause menu presents an audio-config surface — Resume, a volume control, and a sound on/off toggle — reflecting and driving the existing `audio.js` seams (`setVolume`/`toggleMute`) and persisting through the existing storage seam (FR24/FR27). Keyboard shortcuts stay functional and stay in sync. *(Added 2026-11-07, readiness-audit D-006: mechanism shipped in v1 but was keyboard-only — the config surface is the gap.)*

**The Peel — Epic 7 delta (added 2026-11-10 by the Epic 7 requirements pass; sources: PRD META-01 pin, readiness-audit D-004, GDD direction, Epic 6 retro riders)**

- FR31: Between-run meta state persists via the injected storage seam under new `jumprope-*` keys alongside `jumprope-best`; it degrades to session-only when storage is unavailable, exactly like best-altitude (FR24 pattern). Meta state never includes a run record — "no run record is ever persisted" stays true (permadeath contract, architecture §Persistence).
- FR32: Catalogue cards can be locked between runs, and the offer generator filters locked cards exactly like capped-owned ones. With zero locks the deal is bit-identical to v2 (the frozen suite's regression pin).
- FR33: Unlocks are earned from run outcomes legible across runs — counters of what a run did (e.g., area reached, summits, lifetime skips) accrue in meta state and gate unlock predicates. The unlock set, its conditions, and thresholds are an OPEN DECISION POINT at story creation (designer lane — no source exists). Candidates on record: catalogue branch unlocks; an alternate skipper unlock (GDD character-select revisit clause, gdd.md:350-351).
- FR34: Unlocks present as in-game fiction in the PS1 voice — the tech tree the disguise was hiding (PRD thesis). Any new meta surface (title strip, unlock card, meta screen) lands inside the letterbox resize path (NFR7), never re-clocks the rope (NFR8), and never breaks the fiction.
- FR35 (prestige clause): "prestige = permanent climb power" is direction only (GDD Out-of-Scope). If anything permanent feeds climb power into run start, it enters as a named story decision with summit-gate evidence, catalogue-rule conformance (no score-reduction; one axis, one card), and the CARD-09 constraint (no offer-frequency escalation through the back door).

**Player Fuel — Epic 8 delta (minted 2026-11-11 by the Player Fuel requirements pass; sources: the Epic 8 stub above, the 2026-11-05 mods/skins brainstorm memlog, sprint-change proposal 2026-11-05, Epic 7 retro riders. No-invention rule: every row cites its source; rows marked OPEN DECISION have no source yet — designer lane at story creation, the FR33 pattern)**

- FR36 (Mods surface): Data-only mods ship as JSON manifests fetched from static files at runtime; a manifest is parsed and applied as DATA only — nothing a manifest carries is ever evaluated, imported, or executed (`JSON.parse` only; no eval, no dynamic import). Absent or unloadable mods leave the shipped defaults fully in place. The manifest schema and patchable field-set are an OPEN DECISION (candidates: cosmetic fields first — skins, names, palette LUTs; gameplay-parameter fields second, and those trigger the band-gate rider: re-run the 7.5 sweep shapes before landing numbers). *(Sources: epics.md Epic 8 stub; memlog:9,17–18 — JSON native, YAML declined; sprint-change:37)*
- FR37 (Palette skins): A palette skin recolors the skipper by rewriting the colors of the three shared character materials only (rose/prop/limb, `js/render3d.js:185-316` material census) — no geometry change, no new asset class, no touch to the vertex-snap/flat-shading/dither render path (pillar 3). With no skin equipped, rendering is byte-identical to the Epic 7 ship state — the regression pin. *(Sources: memlog:11 skin-tiers insight; Epic 8 stub "palette skins first")*
- FR38 (Model skins — spike-gated): A `.glb` model skin may replace the skipper's meshes, bound by a documented joint-name contract with the `render3d.js` rig (named joints for torso/head/limbs/scarf/handles), posed by the same phase-clock pipeline. It SHIPS ONLY IF a spike proves the contract — spike-gated is the stub's condition, not a phase; declined spike, declined feature. NFR10's zero-bitmap rule is amended only by a documented spike outcome (pillar 3's "documented exception" clause). *(Sources: Epic 8 stub; sprint-change:37; memlog:11,18 — `.glb` embeds PNG natively)*
- FR39 (Equip surface): The player can equip a palette skin and load a manifest mod from a surface that keeps the no-chrome identity: no panels, no settings screen, nothing deeper than the prompt line, inside the letterbox resize path (NFR7), PS1-voiced copy. The equip mechanism itself is an OPEN DECISION (candidates on record: URL query param; conventional path with a manifest index, e.g. `mods/index.json`; title-strip key cycle). Persisting an equipped choice would add a fourth `jumprope-*` storage key → the STOP-AND-ASK tripwire stands (retro :58) unless the decision explicitly names it non-meta. *(Source: no spec source exists — surfaces must satisfy EXPERIENCE/DESIGN rules; mechanism = designer lane)*

### NonFunctional Requirements

- NFR1: 60 FPS sustained on low-end/integrated GPUs at the 240-row internal render target.
- NFR2: Simulation timing is frame-rate independent (fixed step 1/120 s lives in architecture; exact constants inline).
- NFR3: Page-load to first jump under 2 s on broadband (static files + one CDN module pin).
- NFR4: Full deterministic automated test suite green in under 10 s, with the sim/render boundary fence holding.
- NFR5: New mechanics ship with red-green test legs; frozen-test discipline — existing test files stay byte-identical, new behavior gets new test files.
- NFR6: Static files only — no build step, no npm dependencies, no server component, ever.
- NFR7: New HUD/vista layers land inside the existing aspect-correct letterbox resize path — no layout bypass.
- NFR8: The rope's 0→1 phase is the canonical clock — no feature may re-clock it (no beat-lock, no scripted cut-away).
- NFR9: Run length target: 3–5 min wall-clock to summit on a competent build; policy-bot summit rate in the 5–20% band is the balance master-dial.
- NFR10: All geometry procedural/inline; zero bitmap texture budget beyond palette LUTs; character rig stays a few hundred triangles.
- NFR11: Modern evergreen browsers (desktop + mobile) with WebGL; storage degrades gracefully when unavailable.
- NFR12: Meta-state storage reads at boot add nothing measurable to the page-load-to-first-jump budget (NFR3) — small synchronous reads only, no parse stalls. (Derived, 2026-11-10 pass.)
- NFR13: A missing or corrupt meta key degrades to fresh session-only state with no thrown errors — invalid states are data. (Derived, 2026-11-10 pass.)
- NFR14: Mod/skin discovery and parsing stay inside the NFR3 load budget (<2 s page-load to first jump): zero extra blocking requests on the default path when nothing is installed; cosmetic application never touches sim timing (NFR2). (Derived, 2026-11-11 pass — extends the NFR3/NFR12 boot-budget pattern.)
- NFR15: A `.glb` model skin holds NFR1 (60 FPS on integrated GPUs) and NFR10's geometry budget (a few hundred triangles), or the spike documents the revised budget as an aesthetic exception (pillar 3) with measurements as evidence. (Derived from Epic 8 stub spike-gate + pillar 3.)
- NFR16: A malformed, partial, or missing mod/skin degrades to the shipped default with no thrown errors — invalid states are data; the NFR13 storage-degradation pattern's sibling for mod input. (Derived, 2026-11-11 pass.)

### Additional Requirements

From Architecture (technical requirements that impact epic/story creation):

- **No starter template** — v1.0 is the greenfield: all v2 work extends the existing `js/` tree in place.
- Pure functional core / imperative shell: sim modules (`game.js`, `rope.js`, `player.js`, `upgrades.js`, `interpolate.js`) never touch DOM, `Date`, `Math.random`, or storage; never mutate; enforce via `tests/boundary.test.js` import-graph fence — no new mechanic may leak render authority into game state.
- The shell passes a one-way immutable view payload to `render3d.js`; multi-rope, area, and charge state must flow through that same payload.
- Effects stay pure endofunctions over an effects record; `ropeMul` capped per-card so stacked speed cards stay inside the rope-wrap bound by construction — new rope/charge/double-jump state must respect this pattern.
- **Catalogue rule — one axis, one card** (adopted 2026-11-06): two cards may not offer the same effect axis at two strengths, unless the weaker one is an explicit cap-extension tier and reads as one. Measured (exact weighted enumeration, `tests/balance.test.js:387-399`): the 8-card v1 pool put two same-axis cards in one offer on **16.25%** of pick-of-2 / **46.20%** of pick-of-3 draws (`js/upgrades.js` — float/feather, multi/tally, window/widebrim); Launch Heels was predicted to widen the peak-height axis to 39% at pick-of-3 — it never materialized: the shipped 12-card pool (post-3.1, rule-changers as axis-singletons) measures **7.07% / 20.54%** — collisions FELL.
- **Catalogue rule — no upgrade reduces the score** (adopted 2026-11-06): hard rule, all cards, implicit costs included. Since Story 2.1 `score += scoreMul` *is* altitude (`js/game.js:110-111`), a points cut is a climb cut. Two shipped cards violate it: Wide Brim (`scoreMul −0.25` → −25% climb rate) and Heavy Rope (`ropeMul ×0.9` → −13% climb rate). Re-cost in Epic 3, before Story 3.1 locks FR11's legacy-8 freeze; values measured by the Story 2.5 harness.
- Invalid states are data (`status: 'over'`, `tripped: true`), never thrown errors — new win/lose/ascent states follow this.
- Cross-cutting singletons: one shared handler per concern (`releaseEverything()`, `resumeRun()`, `snapGridFor()`) — pause/resume and input paths for new states must reuse them, not duplicate.
- rng injected as a parameter (e.g. `tickRun`'s 5th arg); randomness (card draws only) deterministic under test.
- Every new factory return contract gets a Node-side contract test in the same change; gesture/audio guards get red-green test legs when written.
- Tests via the one gate `./run_tests.sh` (Node's built-in runner under the hood — `node --test tests/`, Node ≥ 18, `node:test` + `node:assert/strict`); balance gate reuses the 1000-tick headless-sim technique.
- Known debt WR-02 — **PAID** by Story 5.4 (2026-11-09): the `beat` idle-clock gate at `js/render3d.js:575`; retired by Story 6.4 (2026-11-10).
- Conventions from AGENTS.md: named exports, `create*`/`update*` factories returning new objects, POJOs only, `*Mul` suffix on multiplier fields, 2-space indent, no `console.*` in pure modules.
- Near-frozen rule (corrected by Story 3.0): `index.html` / `package.json` are near-frozen by rule, not by fence test — no test reads `package.json`; `index.html` is covered only by `tests/ropehud.test.js`'s `#hud` contract leg; `tests/boundary.test.js` fences the sim import graph. Touching them needs justification.
- **Epic 7 riders (Epic 6 retro, carried into story text at creation):** the A3 meta-blindness decision — widen the summit-gate bot's build space for meta state, or record the band gate as run-scoped in `architecture.md` — lands before the first balance-sensitive 7.x story; A2 seed-honesty contract for any batch-driven meta legs; owner strings name STORY/CHORE/LANE keys, never epic names (effective at Epic 7 creation); A4's owned-cap decision input pack rides story text if the correct-course session hasn't landed.
- The policy-bot band (NFR9) is the peel's regression armor: every meta build lands its summit rate in-band, or is named as an exception in story text (retro §Epic 7 preview).
- CARD-09 constraint: the meta layer must not reintroduce offer-frequency escalation through the back door without new evidence (Epic 6 retro; GDD §Cards "Why these numbers exist").
- Meta state lives shell-side (storage seam); the sim receives it as an immutable input at run creation — like rng — and never writes storage; the `tests/boundary.test.js` purity fence stays unchanged. (Extraction from the purity rule + the `loadBest` seam pattern.)
- Persistence naming: the as-built key is bare `jumprope-best`; new meta keys follow the same naming; the never-shipped versioned `jumprope-best-altitude` stays unshipped unless a story explicitly migrates (architecture §Persistence, ledger :162).
- Doc-drift flag (retro A5 rule): GDD body text still says META-01 "deferred" (loop §Meta; Out of Scope) — superseded by the PRD pin; GDD text rides the SAME commit as the Epic 7 story that ages it out.
- **Epic 8 riders (Epic 7 retro, binding on every Epic 8 story at creation — retro :57):** A2 re-contract pre-scan is effective FROM THE FIRST create-story: any story touching the `render3d.js` material/recolor path statically enumerates the frozen legs its shared shapes affect (census key-sets, prompt/copy prefix legs, harness call sites, deal twins, run-record key lists) and lists them in the authorization BEFORE dev — 7.4's six-surprise round is the named failure mode. Seed-honesty (:259 standing), creation-site single-witness (:293) and L9 JIT (:299) riders apply when their triggers are touched.
- **Band-gate honesty (retro :59):** any Epic 8 change to the deal or physics re-runs the 7.5 sweep shapes before landing numbers; the band gate stays run-scoped by decision (S4, `architecture.md`).
- **Meta-creep tripwires stand (retro :58):** "no fourth meta key" and "persisted-flag = STOP-AND-ASK" bind any Epic 8 persistence, skin choices included. Character-select / alternate skipper was CONSIDERED AND DECLINED in Epic 7 S3 — `.glb` skins are the same skipper wearing another body; reopening needs a new source, not a model file.
- Mods/skins load SHELL-side (the `loadBest`/storage-seam and rng pattern): the sim core receives any mod-derived value as immutable data at boot/run creation, never fetches, never parses; the `tests/boundary.test.js` import-graph fence stays byte-identical — no new file joins the sim graph for Epic 8.
- Character-rig joint names become a public contract with FR38 — renaming a rig part in `render3d.js` is a breaking contract change and belongs in story text, not drive-by refactors.

### UX Design Requirements

- UX-relevant requirements are carried in the GDD (Controls and Input, HUD
  notes) and captured above as FR4, FR8, FR13, FR14, FR16, FR22–FR23. The
  visual/interaction spec lives at
  [`ux-designs/ux-jumprope-web-2026-10-28/DESIGN.md`](ux-designs/ux-jumprope-web-2026-10-28/DESIGN.md)
  (HUD slots, prompt voice, role colors); re-validate this section against it
  when new screens (e.g. Epic 7 candidates) are planned.

**Player Fuel — UX delta (minted 2026-11-11 pass; sources: ux-designs 2026-10-28 + Epic 8 material)**

- UX-DR1: The equip/selection surface (FR39) is built inside the DESIGN.md vocabulary — zero new panels, borders, radius, webfonts; copy lives in the prompt slot, ≤40 chars, PS1-plausible, dry; the HUD center-axis stack position is unchanged. Any equip confirmation rides the existing prompt-line mechanism, never a new layer.
- UX-DR2: Failure surfaces as silence: mod/skin load failure behaves like the storage-unavailable pattern (EXPERIENCE.md State Patterns) — the game just plays with shipped defaults, no error chrome. If the FR39 decision chooses any failure notice, it is a PS1-voiced prompt-slot copy line, nothing more.
- UX-DR3 (derived): Skin legibility floor — an equipped skin keeps the skipper readable against ALL five area palettes (alley→moon, `js/areas.js`); the scene owns spectacle, a skin must not camouflage the character. Verified per palette at story time, not just the default area.

### FR Coverage Map

FR1: Epic 1 - Multi-rope on one phase clock, even offsets
FR2: Epic 1 - Trip resolution: buffer → fastest rope lost → last-rope death
FR3: Epic 1 - i-frames: one pass per rope held, no scores/trips
FR4: Epic 1 - Rope count on HUD
FR5: Epic 2 - altitude = ALT_PER_POINT (as-built 2.5, Story 6.2) × pass score; one number (HUD + record)
FR6: Epic 2 - jump-peak vs ceiling; summit break wins (Epic 4 adds mid-run ascent across areas)
FR7: Epic 2 - ceiling ladder constants land as placeholders (Epic 6 replaces via balance pass)
FR8: Epic 2 - HUD ceiling marker (Epic 5 polishes the moon-jump moment)
FR9: Epic 4 - strictly upward one-way ascent, ≤5 areas per run
FR10: Epic 3 - offer firing/pacing/capping (v1 regression + new-card filtering)
FR11: Epic 3 - legacy 8 cards unchanged (regression pin)
FR12: Epic 3 - Spare Rope, Steel Cord, Second Wind, Launch Heels
FR13: Epic 3 - pointer + number-key card picking
FR14: Epic 3 - owned-card HUD shows rope/charge/double-jump state
FR15: Epic 4 - 5 area tiers: palette, fog/horizon, period multipliers
FR16: Epic 4 - ceiling-break visual beat (Epic 5 adds its audio/juice layer)
FR17: Epic 1 - protected regression contract (jump physics, extended by Second Wind in Epic 3)
FR18: Epic 1 - protected regression contract (clearance threshold)
FR19: Epic 1 - protected regression contract (mercy buffer stays ahead of rope-HP)
FR20: Epic 1 - near-miss/streak under multi-rope, per-revolution coalescing
FR21: Epic 2 - scoring formula protected; feeds altitude
FR22: Epic 1 - pause/mute protected through new states via shared handlers
FR23: Epic 5 - reduced-motion coverage extended to new states (base behavior protected in Epic 1)
FR24: Epic 2 - best-altitude persistence (subsumes best-score)
FR25: Epic 1 - run start conditions on the rope system
FR26: Epic 2 - win/lose presentation states (data, not errors)
FR27: Epic 5 - audio contract protected (no beat-lock)
FR28: Epic 5 - ascent stinger, win fanfare, rope-loss thud, last-rope mix
FR29: Epic 5 - TRACK-1 stays deferred/degrades to silence (regression pin)
FR30: Epic 5 - pause-menu audio config surface (Story 5.7; land early — mechanism already shipped)
FR31: Epic 7 - meta state persists across runs via the storage seam (session-only degradation; run records still never persisted)
FR32: Epic 7 - lock-aware deal filter (zero-locks deal = v2 deal, regression pin)
FR33: Epic 7 - run-outcome unlock rules (set/thresholds = open decisions S2/S3 at story creation)
FR34: Epic 7 - unlocks present as PS1-voiced in-game fiction on letterboxed surfaces
FR35: Epic 7 - prestige clause: decision-gated, conditional story only; default = no permanent climb power — clause RETIRED for v3 (GDD §Permadeath and Progression: ceiling growth replaces prestige); Epic 7 shipped with no permanent climb power
FR36: Epic 8 - data-only JSON-manifest mods, parsed as data, schema = open decision; gameplay-param fields band-gate-riders
FR37: Epic 8 - palette skins via the three shared character materials; no-skin = byte-identical default (regression pin)
FR38: Epic 8 - .glb model skins via rig joint-name contract — spike-gated, ships only on proven contract
FR39: Epic 8 - no-chrome equip/load surface (mechanism = open decision; fourth-meta-key tripwire armed)

NFR1–NFR3: All gameplay epics - performance budget held per epic; NFR3 verified at final validation
NFR4/NFR5: Every story - frozen-test discipline + red-green legs; boundary fence per epic
NFR6: All epics - static-file constraint (no story may add deps/build/server)
NFR7: Epics 1–5 - HUD/vista stories use the letterbox resize path
NFR8: Epics 1–5 - phase-clock invariant checked in each sim story
NFR9: Epic 6 - summit-rate balance master-dial
NFR10: Epics 4–5 - area vistas and rigs stay within geometry budget
NFR11: Final validation - browser/storage degradation check
NFR12: Epic 7 - meta boot reads stay inside the NFR3 load budget
NFR13: Epic 7 - corrupt/missing meta keys degrade to fresh session-only state (data, not errors)
NFR14: Epic 8 - mod/skin boot cost inside the NFR3 load budget; default path unchanged when nothing is installed
NFR15: Epic 8 - model-skin FPS/geometry budgets held or amended by spike evidence
NFR16: Epic 8 - malformed mods/skins degrade to shipped defaults (data, not errors)

FR40: Epic 9 - rope activity verbatim inside the day; outcome feeds AGI
FR41: Epic 10 - universal tap at every station; corner switching; no second verb
FR42: Epic 10 - failure textures cap the day's stat income
FR43: Epic 9 - day = stamina budget; voluntary sleep; no in-day recovery
FR44: Epic 9 - day state persists; nightfall sole reset; VIT only grows
FR45: Epic 10 - feeds 1:1 + fixed-neighbor bleed; SHADOWS = automation stat
FR46: Epic 10 - per-day ceilings; failure-only ceiling raises at 125% realized
FR47: Epic 10 - zero-UI teaching: dotted prophecy, sore-walk, flat-day no-stiffness; INT neglect blanks board rows (rendering in Epic 12)
FR48: Epic 10 - day-cards every 20 total beats; compost at nightfall
FR49: Epic 11 - life-cards on earned events; permanent pick-two; rule-changers only
FR50: Epic 11 - lossless law over cards; ledger fence with Epic 10
FR51: Epic 9 - compost settles the day exactly once (feed wiring lands with Epic 10)
FR52: Epic 12 - corkboard gates; INT-priced rows; LEVEL + shadow-post arming (post itself in Epic 14)
FR53: Epic 12 - hunter tick ~1/day slept; frozen while closed; one world state
FR54: Epic 12 - TV ladder; day ~15–20 news interrupt with push-in
FR55: Epic 12 - derived RANK; in-world debuts before panels
FR56: Epic 13 - dungeon day type; eject + same-day lock; reskin stage
FR57: Epic 14 - shadows: record/cast/re-cast/retire; frozen outputs; battle-shadows (arming from Epic 12/13)
FR58: Epic 11/14 - auto-pick life-card: row minted on the S rankDebut offer (11.2); automates the last verb once owned (14.6)
FR59: Epic 14 - completion = census chyron; diary→chyron loop; endless
FR60: Epic 9 - v2→v3 total migration; two-step corrupt degrade
FR61: Epic 15 - model skins on the 17-joint contract; palette skins unchanged

NFR17: Epic 14 (+all sim epics) - determinism contract; replay sweeps
NFR18: Epic 14 - recording budget ≤ 4/8 KB per day
NFR19: Epic 9/10 - lossless persistence; ledger-only stat writes
NFR20: Epic 12 - world time = slept days; Date banned sim-side
NFR21: Epic 14 - ghost frame budget; render-only LOD
NFR22: Epic 15 - mod texture caps at load; author-loud/player-silent


### Functional Requirements (v3 — The Training Saga)

Derived from the v3-retargeted GDD, the v3 architecture pass (2026-11-12), and the narrative design. v1/v2 FRs stay as-shipped; FR40 formalizes the containment (the rope machine runs verbatim inside the day).

**Day & stamina**

- FR40: The rope activity is a v2 run, verbatim, nested inside a day; its outcome (skips, summit, trips) feeds the AGI line at nightfall; nothing in the rope grammar changes.
- FR41: One tap = the current station's beat (rope: jump, run: stride, lift: rep, read: page, fight: dodge); station switching = tapping a room corner, the character walks over; a second verb NEVER ships (pillar).
- FR42: Activity failure carries a station-specific texture (trip / stumble / failed rep / falling asleep) and caps that stat's income for the day at its realized value.
- FR43: The day is a stamina budget, never a clock: one pool = VIT (first-pass 100 SU, gate-bound), hot activities drain 2 SU/beat, cool 1 SU/beat, no in-day recovery; voluntary sleep ends the day at any time.
- FR44: Day state (pool, caps, recordings) persists across sessions; nightfall is the only in-design reset; VIT only ever grows — days never shorten.

**Stats, ceilings, teaching**

- FR45: Permanent stats STR/VIT/AGI/INT feed 1:1 from their activity's beats with ~15% bleed (gate-bound) to one fixed neighbour (rope→AGI→INT, running→VIT→STR, lifting→STR→VIT, reading→INT→AGI); SHADOWS (post-awakening) prices automation throughput (corners, split speed, clone strength).
- FR46: Every stat has a per-day income ceiling; beats past it play at zero income; a stat's long-term ceiling rises ONLY on its failure day, moving to 125% (gate-bound) of the failing day's realized growth.
- FR47: The ceiling mechanic is taught with zero UI: dotted diary prophecy (tomorrow's line raised one notch iff today failed), sore-walk animation on growth, flat days producing no stiffness; INT neglect renders visibly as blanker board rows.

**Cards**

- FR48: Day-card offers fire every 20 total activity beats (lifetime 400 → pick-of-3), rarity 70/25/5, capped/dead-pick filtered, composting at nightfall; the catalogue's 12-card physics vocabulary survives verbatim as day-card vocabulary.
- FR49: Life-cards fire on earned events (first failure per stat, first dungeon clear, the awakening, each RANK debut): permanent pick-two from milestone-filtered pools; they change growth rules, never grant stat points.
- FR50: Lossless law: no day-card or life-card may reduce a permanent stat or its ceiling (catalogue rule restated); risk pays only in stamina timing, gate shelf life, cap exposure.

**Nightfall**

- FR51: Nightfall compost settles the day exactly once: day-cards dissolve, value converts through feed+caps into the ledger, shadow outputs bank, the diary gains one first-person line, the room wears — implemented as one pure all-or-nothing settlement (`compost`).

**World**

- FR52: A corkboard in the room renders alive gates (tier, comp, reward, shelf life); INT gates how many rows render; a gate's first hand-clear pays LEVEL and arms its shadow-post (manual-first, per gate).
- FR53: The off-screen hunter economy clears ~1 random gate per game day (gate-bound); the world advances exactly one tick per *slept* day and is frozen while the game is closed; news and board are reads of one world state.
- FR54: The TV ladder (infomercials → weather/sports → news) runs on a content channel; the Interrupt fires at day ~15–20 (deterministic, balance-bound): a news-slip during a weather bulletin with the in-world push-in — the game's only automatic camera move, control never lost.
- FR55: RANK is a hidden weighted sum of visible stats + LEVEL (weights gate-bound), derived from the ledger and never stored; RANK and LEVEL debut *in the world* before any panel (E-rank chyron, "LV 1" stepping through a gate).

**Dungeons**

- FR56: A dungeon is a day type: entering the room's impossible door commits the rest of the day to tap-fighting (HP, flinch, danger bed) on the palette-flipped stage; losing ejects the player and locks that gate for the day — present-tense danger, meta-level time cost, nothing else lost.

**Shadows**

- FR57: After the awakening, recorded days cast as shadows: deterministic replays (seed + input events) running station transitions in gym corners; corners support cast / re-cast / retire; shadow output is frozen at the casting day's ceilings; battle-shadows replay fight-days at posted gates.
- FR58: The auto-pick life-card automates the last verb (bought, optional, one card).

**Completion & persistence**

- FR59: Completion is a state: when the derived census rankOf(life) enters S, the chyron names the player (the saved name), later quoting the player's own diary lines; designed endless continues after.
- FR60: Save migration v2→v3 is total and pure: Epic 7 outcome counters become milestone sub-cases of the stat ledger, best-altitude carries, corrupt saves degrade two-step (checksum → prev-key → fresh-with-flag), never silently rolling anything back.

**Expression**

- FR61: Model skins: an external `.glb` full-body replacement posed by the phase-clock pipeline through the 17-name joint contract (zero sim-core delta); Blender template ships; palette skins stay as shipped.

### NonFunctional Requirements (v3)

- NFR17: Determinism contract (product requirement): every recorded day replays bit-exact from seed + inputs; shadows are replays, never AI; no player-visible nondeterminism may enter day/world sim.
- NFR18: Recording budget: ≤ 4 KB per recorded day soft, 8 KB hard; overflow coalesces same-step events (architecture-set, 2026-11-12); a 100-day save stays ≤ 800 KB.
- NFR19: Lossless persistence: no write path reduces a permanent stat or ceiling; nothing rolls back a save, ever; stats write only through the ledger API.
- NFR20: World time = slept days: `Date` is banned in the sim import graph; the world advances only inside nightfall compost.
- NFR21: Ghost frame budget: 60 FPS @ 240-line holds with design-uncapped shadow counts; far shadows render cheaper (render-only LOD), never a gameplay cap; replay playback fits the fixed-step sim budget.
- NFR22: Mod texture caps (NFR10 restated): shipped product stays zero-bitmap; mod `.glb` textures allowed under dimension/size/count caps enforced at load; verdicts loud for authors (NFR16 lane), silent for players.

### Additional Requirements (v3, from architecture)

- `deriveStream(seed, domain, ordinal)` sub-stream registry — every rng consumer (cards, board, hunterTick, gateSpawn, content) owns a named stream; a stray `Math.random`/`Date.now` must fail the boundary fence.
- `compost(day, life, world)` is the ONLY settlement and world-tick site; persistence wraps its result (sleep + throttled mid-day autosave; single `persist(gameState)` writer).
- Save envelope `{v:3, state, sum}` on key `jumprope-life` + `.prev`; migration is one pure tested function; the shipped `jumprope-best` folds at migration and stays read-only after (the versioned `jumprope-best-altitude` never shipped)
- Prose ships only as `js/content.js` state-keyed tables + selectors (sim-side); the renderer mounts strings; same state must always produce the same string.
- Boundary fence extends to `day/life/world/station/content`; `content.js` imports nothing.
- New named test files per the architecture epic map: `day/compost/life/world/station/content/replay-sweep/migrate/dungeon` — new legs only; existing files byte-frozen.

### UX Design Requirements (v3 — spec now exists: ux-designs 2026-10-28, Session 2 pass 2026-11-13)

- The v3 visual/interaction spec landed:
  [`ux-designs/ux-jumprope-web-2026-10-28/DESIGN.md`](ux-designs/ux-jumprope-web-2026-10-28/DESIGN.md)
  and
  [`ux-designs/ux-jumprope-web-2026-10-28/EXPERIENCE.md`](ux-designs/ux-jumprope-web-2026-10-28/EXPERIENCE.md)
  (day-loop IA, corner routing, diegetic surfaces, state coverage, key-screen
  mocks under `mockups/`). UX-DR4–7 below were minted as derived placeholders
  and are **confirmed** by that spec — UX-DR4's keyboard question is closed:
  corner taps only, no corner-cycle key (decision 2026-11-13). Re-validate this
  section against the spines when v3 screens are built.

- UX-DR4 (derived): Corner-target navigation — tapping a room corner routes the character to that station; pointer targets are generous (walk-up, no precision), keyboard parity stays one-button.
- UX-DR5 (derived): Diegetic surfaces only — board (slips list), diary reader (day lines, scroll), chyron (single-line broadcast), door (one mesh, one prompt); built in the DESIGN.md vocabulary, zero new panel classes.
- UX-DR6 (derived): Day-1 name prompt — one keystroke via the existing card-pick input lane, inside the diary's handwriting treatment.
- UX-DR7 (derived): Shadow readability — posted shadows stay desaturated and clearly non-player; curation verbs (cast/re-cast/retire) surface through corner prompts, no menus.

## Epic List

### Epic 1: Ropes as Health

Players build and survive with a rope economy: 1–5 ropes sweep one phase clock, every pass scores and threatens, trips strip the fastest rope and grant i-frames, and the last rope makes every pass sudden death. The v1 core feel (jump physics, clearance, mercy buffer, pause, reduced-motion) is provably protected through the refactor.

**FRs covered:** FR1, FR2, FR3, FR4, FR17–FR20 (protect/extend), FR22 (shared-handler paths), FR25

### Epic 2: Altitude & the Win

Skips convert into height: score *is* altitude at 2.5 u/pt (as-built, Story 6.2; the draft's 2 was a placeholder) on one HUD number and one record; jump peaks test a ceiling ladder; breaking the summit ceiling wins the run, tripping with one rope ends it. The game becomes winnable.

**FRs covered:** FR5, FR6, FR7 (placeholder ladder), FR8, FR21, FR24, FR26

### Epic 3: Rule-Changing Cards

Upgrade picks change the rules, not just numbers: Spare Rope, Steel Cord charges, Second Wind double jump, Launch Heels — with offer filtering, number-key picking, and an owned-card HUD that shows state, not just multipliers. Legacy 8 cards are pinned unchanged. Opening chore Story 3.0 (repo hygiene, added by the 2026-11-07 readiness audit) lands before Story 3.2.

**FRs covered:** FR10, FR11, FR12, FR13, FR14

### Epic 4: The Ascent Ladder

The climb has geography: five altitude tiers (palette + fog/horizon + rope-period pressure), one-way ascent through ceiling breaks, each landing as a visual moon-jump beat on the same stage and rope grammar.

**FRs covered:** FR6 (mid-run ascent), FR9, FR15, FR16 (visual beat)

### Epic 5: Feel & Fidelity

The new states feel as good as the core loop: ascent stinger, win fanfare, rope-loss thud, last-rope tension treatment, i-frame juice, and reduced-motion/audio correctness for every new state. (Fold-in candidate: WR-02 one-line debt fix.) Story 5.6 ships the TRACK-1 music file — the mechanism is already shipped and pinned; only the content is missing. Story 5.7 (land early) adds the pause-menu audio config surface the v1 keyboard-only shortcuts never exposed.

**FRs covered:** FR8 (polish), FR16 (audio/juice layer), FR23, FR27, FR28, FR29, FR30

### Epic 6: Balance & Prove

The summit is reachable in 3–5 minutes: the headless-sim policy-bot gate replaces every placeholder tunable (ceiling ladder, altitude-per-skip, area multipliers), offer pacing (CARD-09) is evaluated, and docs tell the v2 story.

**FRs covered:** FR7 (real tunables), NFR9; CARD-09 offer-pacing evaluation; docs

### Epic 7: The Peel

The game admits what it is: between-run progression (META-01) as in-game fiction — the tech tree the disguise was hiding. Meta state persists across runs through the storage seam (never a run record), locks become real in the deal, unlocks are earned from run outcomes and land as PS1-voiced moments; every meta build either holds the summit-gate band or names its exception. Pinned 2026-11-07 (readiness-audit D-004); requirements delta landed in this file 2026-11-10 (FR31–FR35, NFR12–NFR13, plus the Epic 6 riders).
(Source: 2026-11-05 sprint-change-proposal; PRD thesis; Epic 6 retro §Epic 7 preview.)

**FRs covered:** FR31, FR32, FR33, FR34, FR35 (conditional clause) · **NFRs:** NFR12, NFR13

**Decisions (designer lane; RESOLVED 2026-11-10 pre-loop — recorded before implementation per 7.4's AC):**
S1 **Peel scope** = unlocks + outcome-counter gates. No spendable currency; prestige stays OFF (FR35 default — no permanent climb power ships; CARD-09 constraint stands: no offer-escalation back door).
S2 **Unlock currency** = all three 7.2 counters, mapped: reach-unlocks gate on furthest area, achievement-unlocks on summit count, one persistence-unlock on lifetime skips. Exact predicates/thresholds are set at 7.4 kickoff within these mappings.
S3 **What unlocks** = catalogue branch through the 7.3 locks. Alternate skipper NOT in Epic 7 — character-select revisit rides Epic 8/v3-era material.
S4 **(retro A3)** = band gate recorded **run-scoped** in `architecture.md` (same prep pass); 7.5's meta-build sweeps name exceptions with sweep evidence; the policy-bot build space stays as shipped by 6.1.

### Epic 8: Player Fuel

Depth from the players' side of the screen: data-only mods (JSON manifests), palette skins recoloring the three shared character materials, and `.glb` model skins bound by a rig joint-name contract — spike-gated. The disguise's depth becomes community-driven while the sim core's purity, the phase clock, the band gate, and the default view stay provably untouched: with no mods or skins installed, the shipped game renders byte-identical to the Epic 7 state.
(Promoted from candidate by the 2026-11-11 Player Fuel planning pass; sources: sprint-change-proposal-2026-11-05, PRD thesis, brainstorm-mods-skins-engine-2026-11-05 memlog, epic-7-retro-2026-11-11 §Epic 8 preview.)

**FRs covered:** FR36, FR37, FR38, FR39 · **NFRs:** NFR14, NFR15, NFR16 (FR38 may amend NFR10 only via spike outcome; NFR6/NFR7/NFR8 hold unchanged)

**Decisions (designer lane; OPEN — resolved at story creation, the FR33/Epic 7 S1–S4 pattern):**
P1 **Manifest schema** = the patchable field-set a JSON manifest may declare. No source exists. Cosmetic fields first; any gameplay-parameter field triggers the band-gate rider — re-run the 7.5 sweep shapes before landing numbers (retro :59).
P2 **Equip mechanism** = how a player loads a mod or equips a skin. No source exists. Candidates on record: URL query param; conventional path with a manifest index (`mods/index.json`); title-strip key cycle. Must satisfy the no-chrome rules (UX-DR1); persisting a choice arms the fourth-key STOP-AND-ASK tripwire (retro :58).

**Single-epic rationale (step-02 Step C):** one value theme (community depth for the disguise); every story targets the same core files — the `render3d.js` material/recolor path and the shell's load path — so the material consolidates into one epic with ordered stories, not file-churn siblings. The one real risk boundary (the `.glb` joint-name contract) is a spike-gated story *inside* the epic: a declined spike kills one story, not a milestone.

**Disposition — v3 direction (2026-11-10 capture):** stays ON HOLD, not cut by this pass; its fun-proven condition (v2 deploy/UAT + playtesting) is unmet. Checked 2026-11-11: zero mods/skins overlap with the v3 material. The retro's "un-parked only by that pass" is honored as: fuel recorded (FR36–FR39), v3 stories not spawned.

### Epic 9: The Day Skeleton

A day begins, lasts, and ends: rope-only days under a stamina pool, voluntary sleep, the compost transaction converting each day into a diary line and room wear, and the v3 save — with the v2 migration riding along. Act one's mask becomes playable end to end: the shipped v2 run enters the day unchanged, which is the first acceptance fact of the saga.
(Sequence per GDD epics 9–16, brainstorming-session-2026-11-10, narrative-design acts, game-architecture v3 validation 2026-11-12.)

**FRs covered:** FR40, FR43, FR44, FR51, FR60 · **NFRs:** NFR19 (persistence half)

End-state note (readiness Q-2): `compost` settles zero feed through Epic 9 — the `settleFeeds` stub is replaced by the ledger in Story 10.3, where the stats conversion completes; day, diary, wear, and persistence are fully testable in 9.

### Epic 10: Activities & Stats

The room grows corners: running, lifting, reading join the rope on the universal tap; feeds and bleed, per-day caps and failure-only ceilings make supercompensation the growth engine; day-cards ride total beats; sore-walk and the dotted prophecy teach without a line of UI copy. "What kind of day was that?" becomes a one-sentence question with a real answer.

**FRs covered:** FR41, FR42, FR45, FR46, FR47 (FR47's INT-board rendering lands in Epic 12), FR48 · **NFRs:** NFR19 (ledger core)

### Epic 11: Life Cards & Milestones

Earned events fire permanent pick-twos — first failure per stat, first of everything — and the life starts reading back as a build: habits chain two stations, emphases steer the ledger, milestones arrive with capability-threshold vignettes. The lossless law binds every card.

**FRs covered:** FR49, FR50, FR58 (auto-pick row minted in 11.2; owned behavior ships in 14.6)

**Decision (designer lane; OPEN — the FR33/Epic 7 pattern):** C1 **Choreographies vocabulary** — gdd.md §Life-cards names three life-card vocabularies (choreographies, habits, emphases); Story 11.2 carries habits + emphases and the auto-pick row; "choreographies" currently has no story home. Disposition — ship the third vocabulary in 11.2 or retire it with a named decision — is set at Story 11.2 creation. *(Sources: gdd.md §Life-cards; gdd-epic-overview 11.2; implementation-readiness-report-2026-11-12 GAP-2.)*

### Epic 12: The World Layer

The TV ladder runs (infomercials → weather/sports → news), the corkboard pins alive gates with shelf lives, the hunter economy clears a gate a day the player sleeps, RANK and LEVEL debut *in the world* before any panel — and at day ~15–20 the weather bulletin slips: portals. Act two opens mid-sentence.

**FRs covered:** FR52, FR53, FR54, FR55 (FR47's neglect-blanked rows land here) · **NFRs:** NFR20

### Epic 13: Dungeons & Tap-Fighting

The room grows an impossible door. Entering commits the rest of the day to tap-fighting in the palette-flipped gym — HP, flinch, danger bed: the first real hurt after hours of safety, on purpose. Losing ejects you, locks the gate for the day, and costs nothing else. First hand-clears pay LEVEL and arm shadow-posts.

**FRs covered:** FR56 (+ arming hooks for FR52/FR57)

### Epic 14: Shadows & Automation

The awakening: a past day is standing in the corner. Days record as input-event segments and replay bit-exactly as shadows — cast, re-cast, retire; outputs bank at nightfall, battle-shadows fight posted gates, the auto-pick card automates the last verb. Completion arrives as a state — the chyron says your name — and the curated room keeps playing. The poster shot, running live.

**FRs covered:** FR57, FR58, FR59 · **NFRs:** NFR17, NFR18, NFR21

### Epic 15: Model Skins

Authors dress the skipper: full-body `.glb` replacement posed through the 17-joint contract the 8.4 spike proved, texture caps enforced at load, the Blender template as an importable contract, console verdicts for authors and total silence for players. Independent of the saga timeline — lands alongside any epic.

**FRs covered:** FR61 · **NFRs:** NFR22

### Epic 16: Balance & Prove

Nothing v3 claims stays unmeasured: the day-economy balance gate (day-length envelope, ceiling curves, hunter tick rate, bleed, offer cadence — the gate-bound numbers this design carries as first-pass), the replay-sweep determinism gate at scale, the success-metrics pass, and the docs cutover. Could not be skipped per project history.

**FRs covered:** verification legs across FR40–61 · **NFRs:** NFR17–NFR22 verification

**Epic-dependency note:** 9→10→11 sequential (day, then stats, then their milestones); 12 opens act two on 11's ledger; 13 needs 12's gates; 14 needs 10's recordings and 13's fight-days; 15 is independent; 16 verifies all. Stories inside each epic are ordered so none waits on a later one (step-02 dependency rule).

## Epic 1: Ropes as Health

Players build and survive with a rope economy: 1–5 ropes sweep one phase clock, every pass scores and threatens, trips strip the fastest rope and grant i-frames, and the last rope makes every pass sudden death. The v1 core feel (jump physics, clearance, mercy buffer, pause, reduced-motion) is provably protected through the refactor.

**FRs covered:** FR1, FR2, FR3, FR4, FR17–FR20 (protect/extend), FR22, FR25 · **NFRs:** NFR4, NFR5, NFR7, NFR8

### Story 1.1: Multi-rope simulation core

As a player chasing a taller build,
I want my run to track multiple ropes sweeping one shared clock,
So that added ropes mean more scored passes (and more risk) per revolution without changing how I play the button.

**Acceptance Criteria:**

**Given** a fresh run created via `createRun`
**When** the run state is inspected
**Then** it includes a rope-count field initialized to 1, with the existing start contract intact (1.3 s period, phase 0.33 lead-in, auto-launched 0.1 s-hold jump) (FR25)
**And** rope counts are valid on 1–5; any transition producing 0 or 6+ is an invalid-state data value, never a thrown error

**Given** a running state with N ropes (N ≥ 2)
**When** `tickRun` advances the phase clock
**Then** each rope's feet-window occurs at phase offsets evenly spaced across 0–1 (rope k crosses at base offset + k/N), all on the one canonical 0→1 phase clock — no secondary timers (FR1, NFR8)
**And** every rope crossing the 0.45–0.55 window with clearance is scored as an independent pass per FR21's unchanged formula

**Given** the sim graph after this change
**When** `tests/boundary.test.js` runs
**Then** the import-graph fence still passes (no `three` or browser IO in the sim graph) (NFR4)

**And** a Node-side contract test for the extended `createRun`/`tickRun` return shape ships in the same change, with red-green test legs for multi-rope scoring (NFR5)

### Story 1.2: Trip resolution — lose the fastest rope, ride the i-frames

As a player who mistimes a jump,
I want a trip to cost me a rope and grant a recovery blank instead of ending the run,
So that losing health feels like a narrowing of my options, not an instant punishment — until the last rope.

**Acceptance Criteria:**

**Given** a run with 2+ ropes and no live mercy buffer
**When** a rope passes the feet-window without clearance (trip)
**Then** exactly one rope is removed — the fastest rope by effective period — and i-frames begin (FR2)

**Given** a trip occurs while a mercy buffer is live
**When** the crossing resolves
**Then** the event becomes a scored near-miss and no rope is lost — the mercy buffer keeps first priority and remains one shared mercy, not one-per-rope (FR19 protected)

**Given** i-frames active after a trip with R ropes held
**When** the clock advances
**Then** the blank lasts exactly one pass per rope held (R passes — constant real-time duration regardless of rope count) and during it no rope scores and none can trip (FR3)

**Given** a trip resolves while holding exactly 1 rope
**When** the state transitions
**Then** the run ends as `status: 'over'` with trip info as data (`tripped: true` style), never a thrown error (FR2)

**And** new red-green test legs cover: buffer-first priority, fastest-rope stripping order, i-frame length invariance across rope counts, and last-rope death (NFR5)

### Story 1.3: Rope count on the HUD

As a player managing risk,
I want to see how many ropes I'm holding at a glance,
So that I always know how much health — and how much scoring throughput — I have left.

**Acceptance Criteria:**

**Given** a run in progress with any rope count
**When** the shell renders a frame
**Then** the rope count is visible on the HUD, fed only by the one-way immutable view payload (renderer never writes back to sim state) (FR4)

**Given** a trip strips a rope or an effect changes the count
**When** the next frame renders
**Then** the HUD count updates in the same frame batch as the sim state it reflects

**Given** any window size or aspect ratio
**When** the HUD draws
**Then** the rope indicator lands inside the existing aspect-correct letterbox resize path — no layout bypass (NFR7)

**And** pause/resume via P/Esc and hidden-tab handling keep working with the new HUD state through the shared `releaseEverything()`/`resumeRun()` paths — no per-path duplication (FR22)

### Story 1.4: Near-miss & streak under multi-rope

As a player in a dense multi-rope build,
I want near-miss feedback that stays legible when several ropes pass per revolution,
So that the tension readout still means something instead of becoming noise.

**Acceptance Criteria:**

**Given** a run with N ≥ 2 ropes
**When** passes clear at crossing height under 1.5 × the clearance threshold, or are saved by the mercy buffer
**Then** each such pass counts as a near-miss with streak bookkeeping per the v1 rules (streak counts consecutive close calls, decays on a comfortable clear) (FR20)

**Given** multiple near-miss passes occur within one revolution
**When** callouts render
**Then** the display coalesces to at most one near-miss callout per revolution — no spam — while streak counting stays exact per pass

**Given** a run at 1 rope
**When** near-misses occur
**Then** behavior is identical to the v1 baseline (regression-pinned by a new test file; existing test files untouched) (NFR5)

### Story 1.5: Input hygiene & v1 parity proof

As the project itself (and every future change),
I want the shipped v1 core feel proven unchanged by the rope-HP refactor,
So that the one non-negotiable — the jump-timing feel — stays proven with every new mechanic.

**Acceptance Criteria:**

**Given** any state reachable in a ropes-enabled run (running, choosing, tripped-recovery, paused)
**When** focus loss, hidden tab, pointer-up, or pause occurs
**Then** input state is released through the single shared `releaseEverything()` handler and every resume path goes through `resumeRun()` — the new states add no parallel implementations (FR22)

**Given** a run with `ropes: 1`
**When** deterministic seeded sim runs execute jump physics, clearance checks, and mercy-buffer saves
**Then** results are identical to the v1 contract: launch `350 + min(hold, 0.5s) × 500` against gravity 1800, clearance threshold 18 u (card-lowered to ≈16.4 u min), 0.10 s phase-clock-decaying buffer, no coyote time (FR17–FR19 protected)

**Given** a rope count change mid-run (trip or future Spare Rope pick)
**When** a jump is performed during any rope count
**Then** jump physics and clearance judgment are untouched by rope count — difficulty changes come only from pass frequency and period multipliers

**And** new test files pin all of the above at multiple rope counts; existing `tests/*.test.js` files remain byte-identical (NFR5); reduced motion continues to damp cosmetics only, with rope timing byte-identical (FR23 base contract)

## Epic 2: Altitude & the Win

Skips convert into height: score *is* altitude at 2.5 u/pt (as-built, Story 6.2; the draft's 2 was a placeholder) on one HUD number and one record; jump peaks test a ceiling ladder; breaking the summit ceiling wins the run, tripping with one rope ends it. The game becomes winnable.

**FRs covered:** FR5, FR6, FR7 (placeholder ladder), FR8, FR21, FR24, FR26 · **NFRs:** NFR4, NFR5, NFR7, NFR9 (seed)

### Story 2.1: Score is altitude — one number everywhere

As a player,
I want my skips to visibly lift me upward as one unified number,
So that scoring and climbing are the same obvious thing — how high can I get?

**Acceptance Criteria:**

**Given** any scored pass (clean, near-miss, or mercy-saved)
**When** the pass is tallied
**Then** altitude accrues as `altitude += 2 × this pass's score`, the score formula itself unchanged: `(1 + additive) × multiplier` (FR5, FR21 protected)

**Given** the HUD during a run
**When** any frame renders
**Then** exactly one primary number is shown — altitude — replacing v1's separate score/altitude bookkeeping, inside the letterbox resize path (NFR7)

**Given** a device with a stored v1 best-score under the existing storage key
**When** the game loads
**Then** best-altitude displays coherently (the v1 best is adopted or seeded as the initial best-altitude; no crash, no dual numbers), and thereafter only best-altitude is recorded (FR24)

**Given** storage is unavailable (private mode / disabled)
**When** a run records
**Then** persistence degrades to session-only exactly as v1, with no errors surfaced (FR24, NFR11)

**And** a new constant documents altitude-per-skip = 2 u as a placeholder tunable owned by Epic 6's balance pass (FR7) (as-built: 2.5 shipped by Story 6.2 in `616eb6c` — placeholder retired; THE exemplar of why Story 6.4's docs pass exists)

### Story 2.2: Jump peak vs ceiling — and the summit win

As a player,
I want my tallest jumps to threaten a ceiling,
So that the run has a finish line I can aim at.

**Acceptance Criteria:**

**Given** the run's current area (starts at area 1, base altitude 0)
**When** a jump's peak altitude is computed during `tickRun`
**Then** peak = current area base altitude + jump height, evaluated on the same fixed-step sim — no separate altitude timeline (FR6)

**Given** a jump peak exceeding the ceiling ladder constants (250 / 600 / 1,000 / 1,500 / 2,100 u — placeholders marked for Epic 6 rebalance)
**When** the ceiling crossed is the summit (area 5) ceiling
**Then** the run enters a win as **data** (`status: 'won'`-style terminal value alongside `'over'`), never a thrown error, and the sim stops ticking gameplay transitions for that run (FR6, FR26, FR7)

**Given** a peak exceeding a non-summit ceiling
**When** this epic ships alone (pre-Epic 4)
**Then** the crossing is tracked as an ascent-ready state change (area index + base altitude update) with no vista yet — full area behavior lands in Epic 4 and must not need to change this contract (FR6 groundwork)

**Given** a trip with exactly 1 rope
**When** the run ends
**Then** the loss remains `status: 'over'` with `tripped: true`-style data, and final altitude is the final score (FR26)

**And** red-green test legs cover peak computation at multiple rope counts/hold lengths, each of the five ceiling crossings, and win-vs-loss state exclusivity (NFR5)

### Story 2.3: The ceiling marker — telegraph the moon-jump

As a player,
I want a ceiling marker on the HUD showing the next break height,
So that every big jump is a deliberate swing at a visible target.

**Acceptance Criteria:**

**Given** a run in progress in any area
**When** the HUD renders
**Then** a ceiling marker shows the current area's ceiling altitude relative to current altitude (e.g. distance-to-ceiling), inside the letterbox path (FR8, NFR7)

**Given** a jump whose peak approaches the ceiling
**When** frames render during the ascent
**Then** the marker's proximity readout updates purely from the one-way view payload each frame — the renderer computes no gameplay truth (FR8)

**Given** the summit area
**When** the HUD renders
**Then** the marker presents the summit ceiling distinctly (win-target presentation), distinguishing it from intermediate ceilings

### Story 2.4: Win & loss presentation with true permadeath

As a player finishing a run,
I want an unmistakable win or loss screen with my altitude and best,
So that the run's ending lands as an event and I know exactly what to beat next time.

**Acceptance Criteria:**

**Given** a run that reached the summit ceiling
**When** the run-over view renders
**Then** a win presentation appears (distinct from loss), showing final altitude and best-altitude (FR26)

**Given** a run ended by last-rope trip
**When** the run-over view renders
**Then** the loss presentation shows final altitude as the final score plus best-altitude, and a "new best" indication when applicable (FR26, FR24)

**Given** either end state
**When** the player restarts
**Then** the new run starts from the full baseline — 1 rope, no cards, no effects, area 1, altitude 0 — proving permadeath: nothing carries between runs except best-altitude and audio settings (FR26)

**Given** the win/lose view is on screen
**When** pointer or keyboard input arrives
**Then** input hygiene holds via the shared release/resume handlers — a held jump key from the dead run cannot launch the new run (FR22)

### Story 2.5: Ascent economy balance harness

As the designer,
I want the headless-sim harness to report the ascent economy,
So that every tuning decision from here on is measured, not guessed.

**Acceptance Criteria:**

**Given** the existing 1000-tick headless-sim gate
**When** it runs with a simple policy bot (jump on feet-window with a hold heuristic)
**Then** it reports altitude-per-skip, ceiling-crossing ticks, and estimated summit ETA for a given tunable set (NFR9 seed)

**Given** tunables (altitude-per-skip, ceiling ladder, rope periods) injected as parameters of the harness
**When** the harness sweeps values
**Then** results are deterministic under seeded rng and the standard `node --test tests/` suite stays green in under 10 s with the gate included (NFR4)

**Given** the harness run against the real `CARDS` catalogue with the policy bot
**When** it reports per-card climb value (altitude gained over a fixed trip-free horizon, at 1 pick and at cap) plus peak-height delta
**Then** it names every card dominated by another card on the same axis, and every card whose climb value is at or below the no-pick baseline — a rule report, not just numbers (catalogue rules; input to the FR11 gate)

**Given** seeded offer draws over the catalogue
**When** the harness counts same-axis collisions (two cards from one axis in one offer)
**Then** it reports the collision rate for the pool, so a duplicate-axis fix is verified by that number falling (baseline: exact weighted enumeration 16.25% at pick-of-2 / 46.20% at pick-of-3 on the 8-card pool — pinned `tests/balance.test.js`; post-3.1 12-card pool 7.07% / 20.54%)

**And** the harness is positioned for Epic 6 to reuse as the balance master-dial (summit reach rate 5–20% band) without rework

## Epic 3: Rule-Changing Cards

Upgrade picks change the rules, not just numbers: Spare Rope, Steel Cord charges, Second Wind double jump, Launch Heels — with offer filtering, number-key picking, and an owned-card HUD that shows state, not just multipliers. Legacy 8 cards are pinned unchanged, subject to the two catalogue rules in Additional Requirements: Story 2.5's rule report gates FR11's freeze (Story 3.1 gate note).

**FRs covered:** FR10, FR11, FR12, FR13, FR14 · **NFRs:** NFR4, NFR5, NFR7

### Story 3.0: Repo hygiene — VERIFY-CONTRACT in force (chore, lands before 3.2)

As an unattended agent,
I want the repo to obey VERIFY-CONTRACT.md as written,
So that the gate, CI, and file map are trustworthy without a human in the loop. (Added by the 2026-11-07 readiness audit, decision D-003.)

**Acceptance Criteria:**

**Given** any checkout
**When** `./run_tests.sh` runs
**Then** it runs `node --test tests/`, exits non-zero on any failure, and the AGENTS.md/VERIFY-CONTRACT command names match the script that exists (rule 1)

**Given** a push to origin
**When** CI runs
**Then** a GitHub Actions workflow runs the same gate from a clean checkout, not on the dev box (rule 8) — the repo currently has no CI config

**Given** the night-loop era files (`NIGHT.md`, `JOURNAL.md`, `BLOCKED.md`, `tools/night/`)
**When** this story lands
**Then** they move to `docs/archive/night/` with a pointer line in AGENTS.md — superseded by BMAD, retired not deleted (audit finding 4)

### Story 3.1: Four new cards in the catalogue

As a builder,
I want rule-changing cards to appear in offers,
So that builds can diverge in kind, not just in degree.

**Acceptance Criteria:**

**Given** the `UPGRADES` catalogue
**When** it is loaded (including under Node import)
**Then** it contains the legacy 8 cards byte-identical in effect/rarity/cap **and** four new entries: Spare Rope `extrarope` (+1 rope, max 5 total, uncommon, cap 4), Steel Cord `reinforce` (rope charge, uncommon, cap 2), Second Wind `doublejump` (1 mid-air jump per ground contact, uncommon, cap 2), Launch Heels `highjump` (launch velocity +10%, common, cap 3) (FR11, FR12)

**Given** an offer draw at any skip count
**When** cards are drawn with 70/25/5 rarity weights, distinct per offer
**Then** new cards participate with their rarities, and dead-pick filtering excludes capped-out cards — including state-aware caps: Spare Rope hidden at 5 ropes held, Steel Cord hidden when 2 ropes are already charged (FR10)

**Given** test-time rng injection
**When** offer draws repeat with a seed
**Then** draws remain deterministic with the enlarged catalogue (NFR4)

**And** catalogue metadata remains the single source of truth — test expectations derive from the records, not hardcoded tables (NFR5)

**And** state-aware filtering gets real plumbing: `isAvailable(card, owned)` and `pickOffers(pool, owned, count, rng)` see only `owned` (`js/upgrades.js:40-49`) and the sim call site passes no run state (`js/game.js:128`) — the optional state argument must keep `tests/headless-sim.test.js:113` and the `pickTwo` shim (`js/upgrades.js:65-68`) link-compatible (FR10)

**And** gate (2026-11-06): FR11's legacy-8 freeze is conditioned on the two catalogue rules. Story 2.5's rule report must first clear or re-cost Wide Brim and Heavy Rope (`sprint-change-proposal-2026-11-06.md`); a rule-driven re-cost is a sanctioned FR11 amendment, not a regression, and the affected frozen legs are re-authorized by the story that ships it.

### Story 3.2: Spare Rope & Launch Heels — the simple effects

As a builder,
I want picks that directly raise rope count or launch power,
So that HP and climb builds have their foundational picks.

**Acceptance Criteria:**

**Given** a pick of Spare Rope while holding fewer than 5 ropes
**When** `applyCard` resolves as a whole-record patch (ADR-2 — `card.apply` receives only `run.effects` today (`js/game.js:218-225`), so this story pays the migration `game-architecture.md:209` already authorized; the card must stay shape-safe because `tests/headless-sim.test.js:144-148` calls `card.apply(freshEffects())` on every card)
**Then** rope count increases by 1 immediately — the **clamped** value written (`clampRopes`, `js/game.js:33-39`) — all ropes on the shared phase clock at even offsets, and the new rope is live from the next phase tick (FR12)

**Given** Spare Rope is somehow applied at 5 ropes (defensive)
**When** the transition resolves
**Then** the state clamps to 5 as valid data — no crash, no sixth rope (FR12)

**Given** a pick of Launch Heels
**When** subsequent jumps launch
**Then** launch velocity is multiplied by 1.10 per owned copy (up to 3), stacking multiplicatively with hold-height and hang-time effects — the jump *timing* contract (no coyote time, instant-grounded landing) is untouched (FR12, FR17 protected)

**And** multiplier-shaped effects (Launch Heels) stay pure endofunctions over the effects record following the `*Mul` convention; run-shaped cards (Spare Rope) patch the whole record instead — the two shapes coexist by ADR-2, and the "pure endofunction" clause binds only the multiplier subset (the v1-style wording this story replaces)

**And** `card.role` keeps one of the five shipped role strings (`tests/catalogue.test.js:39-40` deep-equals the exact set) — the GDD's "HP"/"mobility" labels are prose, not field values — and `card.color` maps to an existing `role-*` CSS class (`js/shell.js:447`), mint per the UX assumption for rope cards (NFR5)

### Story 3.3: Steel Cord — charges that survive one trip

As a builder,
I want some ropes armored against a single trip,
So that HP purchases carry insurance and trip decisions gain a second layer.

**Acceptance Criteria:**

**Given** a pick of Steel Cord
**When** `applyUpgrade` resolves
**Then** one rope gains a charge, charges are limited to at most 2 charged ropes simultaneously, and charge state is part of the run record (data, not side-channel) (FR12)

**Given** a trip resolves through the rope branch (no mercy buffer) with a charged rope held
**When** the trip applies
**Then** the charged rope loses its charge instead of being stripped — charge consumption takes precedence over the strip-fastest rule — and i-frames still apply unchanged (FR2 interlock, tested against Story 1.2's resolution order: buffer → charge → strip)

**Given** a trip resolves when no rope is charged
**When** the trip applies
**Then** behavior is exactly the Epic 1 rule (strip fastest, i-frames, last-rope death) (FR2 protected)

**And** at last rope with a charge held, a trip consumes the charge and the run continues — the charge is the difference between life and death (explicit test leg)

### Story 3.4: Second Wind — the mid-air jump

As a ceiling-chasing builder,
I want one extra jump available mid-air per ground contact,
So that peak height becomes a skill expression of splitting the button press.

**Thesis note (2026-11-05):** under the disguise thesis this is the first
*designed* surprise beat — the hidden-depth discovery the player makes about
their own build, authored rather than stumbled into.

**Acceptance Criteria:**

**Given** a run owning at least one Second Wind with the mid-air jump unused
**When** a jump press occurs while airborne
**Then** a second launch fires with the standard hold-to-height velocity model, consuming the mid-air charge until the next ground contact (FR12)

**Given** the player lands (ground contact)
**When** they jump again
**Then** the mid-air jump is refreshed — exactly 1 per ground contact, regardless of Second Wind copy count (copies beyond 1 raise nothing until designed otherwise; cap 2 respected in catalogue)

**Given** the second jump occurs
**When** clearance/scoring evaluates the feet-window
**Then** timing judgment uses the same phase-clock rules as ground jumps — the rope is unbothered (NFR8) — and peak altitude chains: Second Wind peaks feed the FR6 ceiling check (Story 2.2 interlock)

**And** the one-button pillar holds: no new key; the same press distinguishes ground vs air jumps by state, with red-green legs for double-press spam and air→air denial (NFR5, FR17 protected)

### Story 3.5: Picker keys & the state-aware owned-card HUD

As a picker,
I want to choose cards with 1/2/3 keys and see my build's *state* at a glance,
So that the freeze-between-offers stays snappy and my build reads in one sentence.

**Acceptance Criteria:**

**Given** an offer on screen
**When** the player presses 1, 2, or 3
**Then** the corresponding card is picked as if clicked, and the run resumes through the shared `resumeRun()` path with full input-release hygiene (FR13)

**Given** the offer renders
**When** the frame draws
**Then** cards remain pointer/tap-pickable and number hints match rendered card order (FR13)

**Given** a run with state-changing cards owned
**When** the owned-card HUD renders
**Then** it surfaces live state — rope count, cord charges per rope, double-jump availability — alongside the multiplier stack, fed only by the one-way view payload, inside the letterbox path (FR14, NFR7)

**Given** a trip consumes a rope or charge mid-frame-batch
**When** the HUD next renders
**Then** charge/rope indicators reflect the new state with no stale display (FR14)

## Epic 4: The Ascent Ladder

The climb has geography: five altitude tiers (palette + fog/horizon + rope-period pressure), one-way ascent through ceiling breaks, each landing as a visual moon-jump beat on the same stage and rope grammar.

**FRs covered:** FR6 (mid-run ascent completed), FR9, FR15, FR16 (visual beat) · **NFRs:** NFR1, NFR4, NFR5, NFR7, NFR8, NFR10

### Story 4.1: The area ladder — five tiers, one-way up

As a climber,
I want the run to be structured as five distinct altitudes I punch through,
So that the ascent has geography and pacing, not just a number.

**Acceptance Criteria:**

**Given** the area table (Alley 0 → Rooftops 250 → Blimp Deck 600 → Stratosphere 1,000 → Moon Approach 1,500; summit ceiling 2,100 — placeholder tunables owned by Epic 6)
**When** `tickRun` processes a peak crossing per Story 2.2
**Then** the run ascends exactly one area per crossing, area index and base altitude update as data, and ascent is strictly one-way with a run visiting at most 5 areas (FR6, FR9)

**Given** a multi-rope run whose simultaneous peaks straddle a ceiling in one tick
**When** ascent resolves
**Then** the run ascends once, not twice — ascent is idempotent within a tick regardless of rope count (FR9)

**Given** any sequence of sim transitions
**When** area index is inspected
**Then** it never decreases and never exceeds the summit tier — out-of-range values are invalid-state data (FR9)

**And** seeded headless runs assert the area monotonicity invariant across the 1000-tick gate (NFR4, NFR5)

### Story 4.2: Area pressure — rope period per tier

As a player who's reached the upper areas,
I want the rope itself to get meaner the higher I climb,
So that late areas stay tense without changing my picks.

**Acceptance Criteria:**

**Given** an area's period multiplier (placeholders ×1.0 / 0.96 / 0.92 / 0.88 / 0.85, marked for Epic 6 tuning)
**When** effective rope period is computed
**Then** it composes as current-area multiplier × owned rope-speed effects within the existing effects-endofunction pattern, with the same wrap-bound guarantees as `ropeMul` caps (FR15, NFR8)

**Given** an ascent occurs mid-swing
**When** the phase clock continues
**Then** the phase value is preserved across the area change — pressure changes pace, never teleports the rope (NFR8)

**Given** reduced motion or pause/resume around an ascent
**When** the state resumes
**Then** shared handlers leave timing byte-identical; multipliers are pure sim-side data (FR23 base contract)

### Story 4.3: Area vistas — palette, fog, horizon

As a climber,
I want each area to look like a different place at a different height,
So that ascent is felt in the eyes, not just the HUD.

**Acceptance Criteria:**

**Given** the current area index in the view payload
**When** `render3d.js` draws the scene
**Then** palette, fog color, and horizon silhouette geometry match the area tier — same stage and rope grammar, no new asset classes, all procedural/inline (FR15, NFR10)

**Given** any area vista rendered
**When** frame timing is captured on an integrated-GPU check
**Then** 60 FPS holds at the 240-row internal render target — vistas are cheap geometry + palette shifts (NFR1)

**Given** an area change
**When** the renderer receives the new payload
**Then** the vista switches from state only — the renderer owns no area logic and nothing feeds back into the sim (FR15)

**And** the vista work stays inside the letterbox resize path (NFR7) and adds zero bitmap textures (NFR10)

### Story 4.4: The ceiling-break moment

As a player punching through a ceiling,
I want the break to land as a *moment* — hitstop, palette flip, new world —
So that every ascent is a moon-jump I'll describe afterward.

**Acceptance Criteria:**

**Given** an ascent event fires
**When** the presentation layer consumes it from the view payload
**Then** the beat plays: hitstop, palette flip, and rope appearance change for the new tier, extending v1's significance-scaled juice tiers rather than replacing them (FR16)

**Given** the beat plays at the busiest moment (5 ropes, particles active)
**When** frame timing is captured
**Then** 60 FPS holds; the beat adds no post-processing beyond the existing single dither pass (NFR1)

**Given** `prefers-reduced-motion` is set
**When** an ascent occurs
**Then** the beat damps to a static palette/vista change — sim ascent timing itself is byte-identical (FR23 base contract)

**And** the audio half of the beat (ascent stinger) is explicitly deferred to Epic 5 — this story ships the visual beat complete on its own

### Story 4.5: Summit approach & one-way guarantees

As a player nearing the top,
I want the summit to feel like the top — and the rules of ascent to never surprise me,
So that the final push reads clearly and fairly.

**Acceptance Criteria:**

**Given** the run is in Moon Approach (area 5)
**When** vistas and HUD render
**Then** the summit tier is distinctly presented (palette/horizon + the Story 2.3 marker in win-target mode) (FR15, FR8 seam)

**Given** adversarial sequences in seeded sims (peaks straddling two ceilings in one tick, ascents during i-frames, ascent while a mercy buffer decays)
**When** invariants are checked
**Then** one-way ≤5-area monotonicity holds, ascent never fires during i-frames' blank passes, and no sequence double-ascends (FR9)

**Given** a full summit run in the headless gate
**When** the bot reaches area 5 and breaks 2,100 u
**Then** the win state fires exactly once and the area ladder is the only path there (FR6, FR9 end-to-end pin)

## Epic 5: Feel & Fidelity

The new states feel as good as the core loop: ascent stinger, win fanfare, rope-loss thud, last-rope tension treatment, i-frame juice, and reduced-motion/audio correctness for every new state. (Includes the WR-02 one-line debt fix.)

**FRs covered:** FR8 (polish), FR16 (audio/juice layer), FR23, FR27, FR28, FR29, FR30 (config surface) · **NFRs:** NFR1, NFR4, NFR5

### Story 5.1: Ascent stinger & win fanfare

As a player breaking a ceiling or the summit,
I want new sounds that belong to those moments,
So that hearing them instantly means *I went up* or *I won*.

**Acceptance Criteria:**

**Given** an ascent event on the shell's event channel
**When** `audio.js` handles it
**Then** a new procedural ascent stinger voice plays on the master bus — pitch/material may shift per area tier — with no timing dependency on, or influence over, the rope's phase clock (FR28, FR27, NFR8)

**Given** a summit win state
**When** it is presented
**Then** a new procedural win fanfare voice plays, distinct from every existing voice, once per run-end only (FR28)

**Given** audio context is not yet gesture-unlocked (fresh page, keyboard-only player)
**When** the first ascent occurs before any gesture
**Then** the AudioContext lifecycle guards hold — no error, no queued blast on unlock — with red-green test legs written when the guard code is written (NFR5)

### Story 5.2: Rope-loss thud & last-rope tension

As a player down to my last rope,
I want the mix itself to tell me I'm one trip from death,
So that the tension is felt in my hands, not just read on the HUD.

**Acceptance Criteria:**

**Given** a trip strips a rope (not a charge, not a mercy save)
**When** the event plays
**Then** the rope-loss thud fires, adapted so losing the *last* rope (run over) is the distinct terminal variant (FR28)

**Given** rope count == 1 during play
**When** the mix renders
**Then** the last-rope treatment applies — the GDD's open audio question is decided here (working default: thinner mix with the rope's own tick brought forward; designer may override at review) — and it reverses cleanly if ropes are regained via Spare Rope (FR28)

**Given** mute or persisted volume state
**When** any of these voices trigger
**Then** the master bus and persisted settings are respected exactly as v1 voices (FR27)

### Story 5.3: i-frame & trip juice

As a player who just tripped,
I want the i-frame blank to look and read intentional,
So that losing a rope feels like a protected recovery, not dropped frames.

**Acceptance Criteria:**

**Given** i-frames active in the view payload
**When** frames render during the blank
**Then** a cosmetic read of invulnerability is visible (e.g. rope ghosts through, skipper dim) derived purely from state — the renderer computes no gameplay truth, and the sim timing is byte-identical with and without the juice (FR3, NFR8)

**Given** trip and ascent events at any significance
**When** juice plays
**Then** hitstop/shake/particle intensity follows v1's significance-scaled tiers, extended — not replaced — for the new event types (FR16 seam)

**Given** the busiest case (trip during multi-rope play with streak callouts active)
**When** juice plays
**Then** 60 FPS holds at the 240-row target (NFR1)

### Story 5.4: Reduced motion for new states & the WR-02 fix

As a motion-sensitive player,
I want every new effect to obey reduced-motion,
So that v2 added nothing that v1's accessibility promise breaks.

**Acceptance Criteria:**

**Given** `prefers-reduced-motion` is set
**When** ascents, i-frames, rope-charge changes, and win presentation play
**Then** each dampens to static or minimal cosmetics while judgment, phase timing, and sim state stay byte-identical (FR23)

**Given** the reduced-motion flag
**When** the session runs
**Then** the flag is never persisted, and the shared `snapGridFor()` singleton remains the only snap-grid authority — new states reuse it (FR23)

**Given** `js/render3d.js`'s reduced-motion idle pose
**When** the fix lands
**Then** WR-02 is resolved: the idle pose no longer animates arms/scarf off wall-clock `beat` (one-line fix at the known site), pinned by a new test (debt closure)

### Story 5.5: Audio lifecycle regression sweep

As the project,
I want v1's audio contracts re-proven against v2's event traffic,
So that a year from now nobody 'fixes' a lifecycle bug that was actually protecting the new voices.

**Acceptance Criteria:**

**Given** the full v2 event set (multi-rope passes, trips, charges, ascents, win, loss)
**When** the audio lifecycle runs through tab-hide, pause, gesture-suspend/resume, and mute toggles
**Then** every voice respects gesture-gating, suspend/resume guards, and the master bus exactly as v1's five voices do (FR27)

**Given** persisted mute/volume
**When** the page reloads
**Then** settings restore and apply to old and new voices alike (FR27, FR24 seam)

**Given** `audio/track.ogg` is absent (TRACK-1 deferred)
**When** the mechanism runs
**Then** it degrades to silence with no errors — behavior pinned unchanged (FR29)

**And** the sim import graph remains audio-free — `tests/boundary.test.js` green with any new event-channel wiring (NFR4)

### Story 5.6: TRACK-1 — the music content

As a player,
I want the demake to carry one looping music track,
So that the PS1 fiction is complete and the mix has a floor under the procedural voices. (Added by the 2026-11-07 readiness audit, decision D-002; closes the PRD's TRACK-1 open item.)

**Acceptance Criteria:**

**Given** the shipped, test-pinned play mechanism (`audio/track.ogg` URL, gesture-unlock and volume paths — zero mechanism-code changes)
**When** the game plays with the file present
**Then** the track loops seamlessly on the master bus, honors persisted volume/mute, and never starts pre-gesture-unlock (FR29)

**Given** the delivered `audio/track.ogg`
**When** it is checked
**Then** Ogg Vorbis, seamless at the loop point, ≤ 3 MB (static-host budget), loudness-coherent with the existing procedural voices

**Given** story kickoff
**When** the sourcing route is picked — generated vs supplied
**Then** it is decided explicitly as its own step before any generation run; nothing blocks on it meanwhile

**Given** the music/sound *direction* is undecided as of 2026-11-07 (D-006)
**When** story kickoff runs
**Then** the direction (identity/genre of the track, and any sound-style implications for the Epic 5 voices) is settled first — the story may not proceed to content on an undecided direction

**And** the absent-file silence legs (`track.ogg` fallback pins) stay byte-identical green

### Story 5.7: Pause menu — the audio config surface

As a player,
I want pausing to open a menu where I can set volume and turn sound on or off,
So that the mix is controllable without knowing hidden key shortcuts. (Added by the readiness audit 2026-11-07, decision D-006; the config UI should have shipped with the v1 audio layer — the mechanism is complete, only the surface is missing.)

**Acceptance Criteria:**

**Given** a paused run (P/Esc or tab-hide)
**When** the freeze frame holds
**Then** a menu presents Resume plus a volume control and a sound on/off toggle, initialized from the live persisted settings at open (FR30, FR27)

**Given** the volume control or the sound toggle
**When** the player uses it
**Then** it calls the existing seams only — `audio.setVolume` / `audio.toggleMute` — persisting through the existing storage path; no new audio plumbing and no second persistence path (FR24; shared-handler rule)

**Given** the menu is open
**When** the player clicks or keys anything
**Then** no jump arms, no run starts, and nothing resumes until Resume is chosen — the freeze-frame input lock holds behind the menu (FR22 handler hygiene, D-12 lineage)

**Given** the keyboard shortcuts (`Mute` key, `-`/`=`) fire while the menu is open
**When** settings change
**Then** the menu controls re-render in sync with the new state — one source of truth, no drift (FR30)

**And** the panel lands inside the existing letterbox resize path (NFR7), stays shell-only and static-file-only (NFR6), the sim import graph is unchanged (`tests/boundary.test.js` green), and the panel is built so a later idle-screen entry point can reuse it without rework (reuse sanctioned, not required here)

## Epic 6: Balance & Prove

The summit is reachable in 3–5 minutes: the headless-sim policy-bot gate replaces every placeholder tunable (ceiling ladder, altitude-per-skip, area multipliers), offer pacing (CARD-09) is evaluated, and docs tell the v2 story.

**FRs covered:** FR7 (real tunables), NFR9; CARD-09 offer-pacing evaluation; docs · **NFRs:** NFR4, NFR5

### Story 6.1: Policy-bot summit gate — the balance master-dial

As the designer,
I want one deterministic number that says whether the game is winnable at the right pace,
So that every tuning debate ends with a measurement.

**Acceptance Criteria:**

**Given** the Story 2.5 harness extended with a defined policy bot (documented jump/hold/heuristic rules)
**When** the gate runs its seeded batch
**Then** it reports summit reach rate (target band: 5–20%) and wall-clock run length (3–5 min summit target on a competent build) (NFR9)

**Given** the gate in `node --test tests/`
**When** the suite runs
**Then** it is deterministic under seeded rng and the full suite stays green in under 10 s (NFR4)

**Given** an out-of-band result (e.g. 45% or 1% summit rate)
**When** the gate fails
**Then** the failure output identifies the measured rate and the tunable set that produced it — a failing gate is a tuning report, not just a red X

### Story 6.2: Real tunables — retire the placeholders

As a player,
I want the ceiling ladder and climb rate tuned,
So that runs hit the 3–5 minute summit window instead of a placeholder's guess.

**Acceptance Criteria:**

**Given** sweep results from Story 6.1
**When** tunables are replaced
**Then** the ceiling ladder (was 250/600/1k/1.5k/2.1k), altitude-per-skip (was 2 u), and area period multipliers (was ×1.0/0.96/0.92/0.88/0.85) carry their balanced values, each constant annotated with the gate result that derived it (FR7, FR15)

**Given** the replaced values
**When** the summit gate re-runs
**Then** the in-band result holds and all prior epic invariant tests (monotonic ascent, win-once, i-frame length) remain green unchanged (NFR4, NFR5)

**And** no test was edited to pass under the new values — expectations that depend on tunables derive from the records themselves (NFR5)

### Story 6.3: Offer pacing verdict (CARD-09)

As the designer,
I want a data-backed verdict on escalating offer pacing,
So that CARD-09 is either promoted or closed with evidence, not vibes.

**Acceptance Criteria:**

**Given** gate runs instrumented for offer frequency, card pick rates, and build-shape diversity
**When** sweeps run at current pacing (every 10th skip, 2→3 after skip 30) and at one escalated variant
**Then** the comparison report shows dead-card incidence (any card picked <30% when offered) and build legibility proxies per variant

**Given** the completed verdict
**When** it is written up
**Then** the PRD Open Items table is updated — CARD-09 promoted into the FR set (with a follow-up change), or explicitly closed with the evidence cited

**And** the current v1 pacing remains the shipped behavior regardless — this story changes pacing only via a follow-up if promoted (FR10 protected)

### Story 6.4: Docs & provenance pass

As the next contributor (including future-me),
I want the v2 story told accurately in the planning docs,
So that the PRD, GDD, and architecture spine describe the game that actually shipped.

**Acceptance Criteria:**

**Given** v2 complete
**When** the docs pass runs
**Then** `prd.md` (v2 state, closed/open items), `architecture.md` (new state shapes: ropes, charges, areas, ascent events), and the GDD's placeholder notes (tunables, area flavor, last-rope mix decision) are updated to as-built fact

**Given** the success-metrics checklist from the GDD
**When** it is executed
**Then** each item is verified and recorded with evidence: 60 FPS capture on an integrated-GPU check (NFR1), suite green <10 s (NFR4), boundary fence green, red-green legs present for every new mechanic (NFR5), and page-load-to-first-jump <2 s (NFR3)

**And** any metric that fails at this stage produces a logged follow-up item rather than a hidden regression

## Epic 7: The Peel

The game admits what it is: between-run progression (META-01) as in-game fiction — the tech tree the disguise was hiding. Meta state persists across runs through the storage seam (never a run record), locks become real in the deal, unlocks are earned from run outcomes and land as PS1-voiced moments; every meta build either holds the summit-gate band or names its exception.

**FRs covered:** FR31, FR32, FR33, FR34, FR35 (conditional clause) · **NFRs:** NFR12, NFR13 · **Riders:** A2 seed-honesty (7.2/7.5), A3/S4 gate decision (7.5), A4 owned-cap pack (7.5), CARD-09 constraint (7.3/7.5)

### Story 7.1: Meta ledger — persistence without run records

As a player returning to the tab tomorrow,
I want the game to remember what my runs did,
So that progress can accumulate between runs and the peel can begin.

**Acceptance Criteria:**

**Given** storage available at boot
**When** the shell starts
**Then** meta state loads through the existing storage seam under new `jumprope-*` keys beside `jumprope-best`, the boot read adds nothing measurable to the first-jump budget (FR31, NFR12), and no new storage lane appears — one seam, one pattern (FR24 lineage)

**Given** storage unavailable, or a meta key missing or corrupt
**When** the game boots
**Then** fresh default meta state is used, play is unimpacted, writes degrade to session-only, and nothing throws — invalid states are data (FR31, NFR13)

**Given** any run at any point
**When** persistence writes happen
**Then** only meta state, best altitude, and audio settings are ever persisted — no run record is ever written; the permadeath contract stays true, pinned by a new test file enumerating the persisted key set (FR31; architecture §Persistence)

**And** meta state lives shell-side and enters the sim only as an immutable parameter at run creation — the rng-injection pattern again; `tests/boundary.test.js` stays green, the new factory contract gets its Node-side contract test in the same change (NFR5, NFR6)

### Story 7.2: Every run leaves a mark — outcome counters

As a player,
I want completed runs to count — furthest area, summits, lifetime skips,
So that the game has an honest basis for what I've earned.

**Acceptance Criteria:**

**Given** a run ends (`outcome 'tripped' | 'summit'`)
**When** the shell records the result
**Then** the outcome counters accrue in meta state through the SAME persistence path as `saveBest` — one shared write lane, no second path (FR33; shared-handler rule)

**Given** pause, tab-hide, or restart paths
**When** the run-end event fires
**Then** counters accrue exactly once per run — release/resume paths cannot double-count (FR22 handler hygiene)

**Given** any batch-driven test legs for accrual
**When** they are written
**Then** they follow the seed-honesty contract: law-form legs, no current-build numerics, ×2 determinism witnesses (retro A2)

**And** this story records all three counters and USES none — the deal and the sim are untouched; the unlock currency itself is decision S2, a named decision point at Story 7.4 kickoff

### Story 7.3: Locked in the deal — the catalogue learns locks

As a player,
I want the catalogue to open gradually,
So that new cards feel earned, not listed.

**Acceptance Criteria:**

**Given** a card flagged locked in catalogue metadata
**When** offers deal
**Then** locked cards are filtered at exactly the same filter point as capped-owned (`pickOffers`) — one predicate extended, no second filtering path (FR32)

**Given** zero locks — the state this story lands with
**When** the frozen suite runs
**Then** every existing deal/balance leg passes byte-identically, and the rng stream position for identical seeds is unchanged (FR32 regression pin, NFR5)

**Given** the CARD-09 constraint
**When** the deal changes at all
**Then** offer frequency (every 10th skip, 2→3 after skip 30) is provably untouched — the `offercadence` instrument proves no offer-escalation back door (retro; GDD §Cards)

**And** the filter ships inert — no card is locked by this story; unlocks flip locks from Story 7.4 onward (FR33 dependency direction: 7.3 before 7.4, never after)

### Story 7.4: The Peel — unlocks as fiction in the PS1 voice

As a player,
I want the game to announce what I've earned in its own voice,
So that escalation stays a surprise in disguise, not a notifications list.

**Acceptance Criteria:**

**Given** a named decision point at kickoff
**When** this story starts
**Then** decisions S2 (unlock currency) and S3 (what unlocks — catalogue branch vs. alternate skipper, GDD character-select revisit clause gdd.md:350-351) are resolved and recorded in story text and the PRD Open Items BEFORE implementation (D-006 kickoff pattern)

**Given** meta counters meeting the chosen unlock predicate
**When** a run ends
**Then** the unlock is recorded in meta state and announced exactly once on the next idle/title surface, in the PS1 voice, as in-game fiction — never mid-run, never re-clocking the rope (FR33, FR34, NFR8)

**Given** a newly unlocked card
**When** offers deal from then on
**Then** it flows through the 7.3 filter and obeys rarity weights, caps, and distinctness, and the catalogue rules hold for it: one axis one card, no score-reduction (FR32, FR35 conformance)

**Given** any new meta surface
**When** it renders
**Then** it lands inside the letterbox resize path (NFR7) and `prefers-reduced-motion` dampens its cosmetics without touching timing (FR23 extension)

**And** this story updates the GDD body's META-01 "deferred" text (loop §Meta; Out of Scope) in the SAME commit — the doc ages out with the behavior that ages it out (retro A5 doc-drift rule)

### Story 7.5: The gate sees the peel — meta-aware balance & prove

As the designer,
I want the summit-rate dial to stay honest under meta builds,
So that the peel cannot quietly break the balance.

**Acceptance Criteria:**

**Given** the meta-blindness decision S4 (retro A3)
**When** this story starts
**Then** EITHER the summit-gate bot's build space is widened to include meta state, OR the band gate is recorded as run-scoped in `architecture.md` — one or the other, written, before any balance-sensitive retune here (A3, NFR9)

**Given** meta builds as of 7.4
**When** the summit-gate batch runs
**Then** summit rates stay in band (0.05, 0.20] — or the exception is named in story text with sweep evidence (retro §Epic 7 preview)

**Given** the bare (no-meta) build
**When** the gate re-runs
**Then** bare-build results are unchanged — the peel moves no bare dial, and batch-driven meta legs hold the seed-honesty contract (A2; FR10/FR11 protection)

**And** the FR35 prestige clause is dispositioned explicitly: if prestige (permanent climb power) was not adopted by the S1 scope decision at 7.4 kickoff, this story records the default — no permanent climb power ships — and the A4 owned-cap decision input pack rides this story's text if the correct-course session hasn't landed

## Epic 8: Player Fuel

Depth from the players' side of the screen: data-only mods (JSON manifests), palette skins recoloring the three shared character materials, and `.glb` model skins bound by a rig joint-name contract — spike-gated. The disguise's depth becomes community-driven while the sim core's purity, the phase clock, the band gate, and the default view stay provably untouched: with no mods or skins installed, the shipped game renders byte-identical to the Epic 7 state.

**FRs covered:** FR36, FR37, FR38, FR39 · **NFRs:** NFR14, NFR15, NFR16 · **Protected:** NFR1/NFR2/NFR3 (budgets), NFR6 (static-only), NFR7 (letterbox), NFR8 (phase clock), NFR10 (amendable only by 8.4's spike), NFR4/NFR5 (gate + frozen-test discipline)

**Epic-level riders (binding on every Epic 8 story — epic-7 retro :57–59, A2 effective NOW):**
- **A2 re-contract pre-scan** — the shared shapes this epic provably touches, statically enumerated 2026-11-11; each story's dev authorization MUST re-affirm and exact-leg-enumerate before code: **(a)** boot storage-key census `tests/pausemenu.test.js` L2 (`jumprope-audio`+`jumprope-best`+`jumprope-meta` EXACTLY — :432) — reddens the instant a skin/mod choice persists; **(b)** setItem write-site censuses `tests/metalegger.test.js` (readdir idiom, :110) and reducedmotion L10(a) — new persistence paths are the kill target; **(c)** material censuses `tests/areavistas.test.js` (vista materials never shared with rig/rope/particle meshes :292; ghost mats birth-static `color.hex === birth` :276) and `tests/ceilingbreak.test.js` §3/§4 rope-write census (`Color#set` wrap :291) — recoloring must be sets on existing shared materials, never construction of new ones; **(d)** shared-snap-uniform legs riding EVERY world material (`tests/render3d.test.js:156`, `tests/areavistas.test.js:477`) — a new material breaks them; **(e)** the i-frame body-dim path (`GHOST_DIM`, `js/render3d.js:42` — ghostspread/feelcap reads); **(f)** the `#hud` live-children census (`tests/ropehud.test.js` #hud contract; pausemenu :303, ceilingmarker/runmark reads) — equip surfaces must add zero #hud children. Mid-round surprises: STOP-and-report, written batch — 7.4's six-surprise round is the named failure mode.
- **Seed honesty** (:259 standing) for any batch-driven leg; creation-site single-witness (:293) and L9 JIT (:299) if their triggers are touched.
- **Band gate (retro :59):** any story changing the deal or physics re-runs the 7.5 sweep shapes before landing numbers; band gate stays run-scoped (S4).
- **Purity:** `tests/boundary.test.js` stays byte-identical; fetch/parse/eval-of-mod-content NEVER enters the sim graph — the loader lives shell-side, mod values enter the sim as immutable boot/run-creation inputs at most.
- **Character-select boundary (S3, retro :58):** `.glb` skins are the same skipper in another body; nothing in this epic spawns a second character, a fourth meta key, or a persisted flag without STOP-AND-ASK.

### Story 8.1: Skins as data — the palette-skin seam

As a player who wants the skipper to look like mine,
I want the character's three shared material colors to be overridable data,
So that a recolor is a numbers change, not a code change — the first breath of the mod surface.

**Acceptance Criteria:**

**Given** a fresh boot with no skin supplied
**When** the renderer builds and a run plays
**Then** the rose/prop/limb materials carry the shipped default colors and every render leg is byte-identical to the Epic 7 ship state — the untouched frozen suite IS the proof (FR37, doctrine "untouched-green IS the proof")

**Given** a skin record `{ name, colors: { rose, prop, limb } }` delivered through a shell-side seam at boot
**When** rendering runs
**Then** the three shared materials carry the skin's colors — applied at ONE application site (the one-seam law), as `Color#set` writes on the EXISTING shared materials; no new material construction, no geometry change, and the vertex-snap/sRGB-Bayer/flat-shading path is untouched (FR37, rider (c)/(d))

**Given** a partial skin record (one or two colors missing)
**When** it is applied
**Then** missing colors fall back to shipped defaults, no thrown error — invalid states are data (NFR16)

**And** the i-frame dim (`GHOST_DIM` over the body materials) behaves identically under any skin — i-frames juice reads unchanged (rider (e); protected behavior)

**And** no player-facing equip UI ships in this story: the record arrives via the seam (boot-time parameter/test injection) — the surface is Story 8.2's. The story ships INERT against the default (the 7.3 pattern), with the A2 pre-scan re-affirmed in its dev authorization naming exact legs from riders (a)–(f)

**And** a Node-side contract test for the skin-record factory ships in the same change (factory-convention rule), and a legibility witness samples the three skin-vs-vista checks that Story 8.5 extends to all five palettes (UX-DR3 seed)

### Story 8.2: Equip without a menu — the no-chrome surface

As a player,
I want to equip a skin (and later, load mods) without any settings screen existing,
So that the game stays one interaction from play and the diorama stays chrome-free.

**Acceptance Criteria:**

**Given** decision P2 (OPEN at kickoff — resolve BEFORE implementation, record in story text + PRD Open Items, the D-006/Epic-7-S pattern): equip mechanism = one of { URL query param; conventional path with manifest index `mods/index.json`; title-strip key cycle }
**When** this story starts
**Then** the choice is written with reasons, and every AC below reads against the chosen mechanism (FR39, P2)

**Given** the shipped game booting with nothing equipped/installed
**When** the page loads
**Then** the network shape is unchanged from baseline — zero extra requests — and the load-to-first-jump budget holds (NFR14, NFR3)

**Given** the chosen mechanism in use
**When** a palette skin is equipped
**Then** it flows through Story 8.1's seam; the surface adds NO panels, NO borders, NO #hud children (rider (f)), keeps the HUD center-axis stack byte-positioned, and any copy lands in the prompt slot ≤40 chars in the PS1 voice, scaled inside the letterbox path (FR39, UX-DR1, NFR7)

**Given** a failed or absent equip (missing file, bad record)
**When** boot continues
**Then** the game plays with shipped defaults and shows NOTHING — silence is the error surface, per the storage-unavailable pattern (UX-DR2, NFR16)

**And** the mechanism adds NO new key bindings unless P2 chose the key cycle — in which case the key-comparison census (pausemenu L5, zero-new-bindings fence) is re-contracted IN THE AUTHORIZATION before dev, exact legs listed (A2)

**And** persistence default: equip does NOT persist; persisting a choice is a named decision requiring written STOP-AND-ASK, explicit non-meta naming, AND the pausemenu L2 storage-key census re-contract before any fourth `jumprope-*` key ships (tripwires retro :58, riders (a)/(b))

**And** `prefers-reduced-motion` dampens any equip cosmetic; judgment and timing byte-identical (FR23 pattern)

### Story 8.3: Mods are data — the JSON-manifest surface

As a mod maker,
I want to describe changes in a JSON manifest the game reads,
So that the disguise's depth can grow without anyone touching the engine.

**Acceptance Criteria:**

**Given** decision P1 (OPEN at kickoff — resolve BEFORE implementation, record in story text + PRD Open Items): manifest schema + patchable field-set; default posture = cosmetic fields only (skin records, display names, palette LUT entries); a gameplay-parameter field may be ADDED by this decision ONLY together with the band-gate rider — 7.5 sweep shapes re-run and in-band before its numbers land (FR36, P1, retro :59)
**When** this story starts
**Then** the schema is written with the field list and every field's fallback (FR36)

**Given** a manifest reachable through the P2 mechanism
**When** the boot processes it
**Then** it is fetched and `JSON.parse`d once, shell-side, applied as DATA — and a red-green leg proves a manifest carrying a script-looking string field executes NOTHING: no `eval`, no `new Function`, no dynamic import fed by manifest content (FR36, the data-only law)

**Given** a manifest violating the schema — unknown keys, wrong types, out-of-range colors, oversized payload
**When** the boot processes it
**Then** the whole manifest or the offending fields (per the P1 decision) fall back to defaults with no thrown error and no half-applied cosmetics reaching a frame (NFR16)

**Given** the sim import graph after this change
**When** `tests/boundary.test.js` runs
**Then** it is byte-identical and green — no fetch/parse/IO entered the sim graph; rng draw streams stay bit-identical for cosmetic mods, proven by the counting-wrapper technique (FR36, purity riders)

**And** the manifest-loader factory gets a Node-side contract test over JSON fixtures in the same change — no DOM anywhere (factory-convention rule)

**And** an example shipped manifest (one cosmetic skin, the epic's dogfood) rides this story so the schema has a live witness, not just fixtures

### Story 8.4: The joint-name contract — the `.glb` spike

As a 3D artist with Blender or Blockbench,
I want the rig's joint names to be a published contract,
So that a `.glb` I made drops into the game without touching engine code.

**Acceptance Criteria:**

**Given** the shipped `render3d.js` rig
**When** the spike runs
**Then** the joint inventory — torso, head, cap, eyes, scarf chain segments, arms L/R, legs L/R, handles, jiggle props — is enumerated, names pinned by a Node leg, and documented as the public contract: renaming a rig part is a BREAKING contract change that belongs in story text, never a drive-by refactor (FR38)

**Given** a probe `.glb` bound by that contract (committed test asset — the second committed binary, so the ledger precedent ride applies: sha/size recorded like TRACK-1)
**When** it is posed through the phase-clock pipeline at sampled phases
**Then** it tracks the default skipper's pose within tolerance at every sample, and the scarf-chain/jiggle semantics are decided ON RECORD: bind, or fall off gracefully (FR38)

**Given** the probe measured
**When** the spike reports
**Then** triangle count vs NFR10's budget and an FPS read vs NFR1 are written INTO story text as evidence — numbers never enter tests (seed-honesty style); NFR10's zero-bitmap rule is amended ONLY if the evidence justifies a documented aesthetic exception (NFR15, pillar 3)

**And** if the contract or the budgets do not hold: the story records the spike DECLINED, the feature stays shelved with the reasons — spike-gated means no proof, no ship (FR38)

**And** the default path is untouched either way: no `.glb` equipped means zero new fetches and byte-identical render — the spike's assets and loaders live test/shell-side only (NFR14)

### Story 8.5: Nothing installed, nothing changed — Player Fuel prove

As the designer,
I want the bare build provably equal to the Epic 7 game,
So that Player Fuel can never quietly regress the shipped feel.

**Acceptance Criteria:**

**Given** the 8.4 baseline
**When** this story lands
**Then** `js/` and `tests/support/` are byte-identical — ZERO product code in the prove story (the 7.5 pattern)

**Given** a default boot
**When** the prove census runs
**Then** witnesses hold: the three character materials carry shipped default colors and the materials census is unchanged; zero extra network requests vs baseline; the `#hud` shape census is unchanged; boot storage keys are still EXACTLY the shipped three; the boundary fence is byte-identical; gate <10 s green (FR37 pin, NFR14, NFR4, riders (a)/(c)/(d)/(f))

**Given** every shipped palette skin
**When** the skipper renders on EACH of the five area palettes
**Then** the legibility floor holds per palette — the skipper never camouflages against the scene; witnesses run all five vistas, not just Alley (UX-DR3, FR37)

**Given** the shipped example mod applied
**When** the bare-build gate re-run executes
**Then** bare summit rates are bit-identical to the 7.5 record, and IF P1 kept the schema cosmetic-only, the story records "no deal/physics touch — sweep unchanged" WITH the 7.5 citation instead of re-running it (band-gate rider, S4, seed-honesty: numerics live only in story text)

**And** this story's docs pass lands in the SAME commit (A5 doc-drift rule): GDD §Asset Requirements gains the mods-as-data sentence + the `.glb`/NFR10 disposition from 8.4, the PRD gains the Player Fuel open-items row with P1/P2 outcomes, and `architecture.md` records the loader seam and the joint-name contract in one place

## Epic 9: The Day Skeleton

A day begins, lasts, and ends: rope-only days under a stamina pool, voluntary sleep, the compost transaction converting each day into a diary line and room wear, and the v3 save — with the v2 migration riding along. Act one's mask becomes playable end to end: the shipped v2 run enters the day unchanged, which is the first acceptance fact of the saga.

**FRs covered:** FR40, FR43, FR44, FR51, FR60 · **NFRs:** NFR19 (persistence half)

### Story 9.1: Four tiers, one root — the day wraps the run

As a player who has lived inside this game for hours,
I want my rope run to keep working exactly as it did, now nested one level deeper inside a day,
So that the game I learned is revealed as the engine it always was — not patched.

**Acceptance Criteria:**

**Given** a fresh game created via `createGame`
**When** the state is inspected
**Then** it is one POJO `gameState = { meta, life, day, world }` per the architecture State Tree — `meta {v, bestAltitude, settings, counters}`, `life {stats, ceilings, diary, milestones, name}`, `day {number, seed, stamina, beats, caps, station, recordings[], dayCards[], dayType, gateLocks, result}`, `world` inert data (`gates: []`, `news: []`) until its epic fills it (FR40)
**And** during a rope session the run record nests verbatim as `day.station` — the v2 run schema is untouched, no fields move (FR40)

**Given** the new root `tickGame(gameState, input, STEP, rng)` replacing direct `tickRun` calls in the shell
**When** a rope day advances
**Then** it returns `[state', events]` exactly like `tickRun`, layering `tickDay` → the unchanged run loop; `rope.js` and the trip waterfall run byte-identical under the wrapper (FR40, NFR8)

**Given** a day tier absent or `null` (a v2-era shape)
**When** `tickGame` runs
**Then** it reduces bit-identically to the v2 `tickRun` — the day tier is idle-transparent when absent, and the phase clock nests inside the beat/day clocks, never re-clocking them (FR40, NFR8)

**And** new red-green legs in the NEW `day.test.js` pin the tree shape, the root's return contract, and run-parity-under-wrapper; `createGame`/`createDay`/`tickDay` factory contracts get their Node-side contract test in the same change; existing test files stay byte-identical (NFR5); `tests/boundary.test.js` extends to `day.js` and stays green (NFR4)

### Story 9.2: The v3 save — envelope, prev-key, total migration

As a player returning tomorrow,
I want my whole life to load from one key and my v2 past to map onto it in full,
So that nothing ever rolls back a save — the lossless law's persistence half (NFR19).

**Acceptance Criteria:**

**Given** persistence writes anywhere in the game
**When** a write happens
**Then** it goes through the single `persist(gameState)` writer as envelope `{v: 3, state, sum}` under key `jumprope-life`, the prior copy rolled to `jumprope-life.prev` before each write — no second storage lane appears (FR60, NFR12)

**Given** a v2-era save (meta outcome counters + best-altitude keys)
**When** the shell loads it
**Then** one pure migration function maps it totally: Epic 7 outcome counters (furthest area, summit count, lifetime skips) become milestone sub-cases in `life.milestones` of the stat ledger, Epic 7's unlock predicates read through the sub-cases so every v2 unlock leg stays green, and `meta.bestAltitude` carries from the shipped `jumprope-best` key — the migration reads the three shipped v2 keys (`jumprope-best`, `jumprope-meta`, `jumprope-audio`); the versioned `jumprope-best-altitude` never shipped and appears in no leg (FR60)

**Given** an envelope failing its checksum test (`checksum(env) !== env.sum`)
**When** the shell loads
**Then** it tries `jumprope-life.prev`; if both fail, a fresh v3 life with `{ meta: { corrupt: true } }` — the diary says so once, nothing else mentions it, nothing throws; invalid states are data (FR60, NFR13)

**And** the NEW `migrate.test.js` ships in the same change with red-green legs: total map (every v2 key has a v3 landing), migration purity/determinism, and the two-step degrade; the seam stays in `shell.js`, the sim import graph unchanged and `tests/boundary.test.js` green (NFR4, NFR5)

### Story 9.3: Stamina — the day is a budget, never a clock

As a player planning a day,
I want every beat to spend from one visible pool,
So that the day's question is how I use today, never when today ends (FR43).

**Acceptance Criteria:**

**Given** `createDay(number, world)`
**When** the day state is inspected
**Then** `day.stamina.pool` is seeded from the `STAMINA` data-table row — VIT base, first-pass 100 SU, balance-owned by Epic 16 — and no code path recovers stamina inside a day (FR43)

**Given** a rope beat (a skip) advances the day
**When** the beat lands
**Then** the pool drains by the `CADENCE` table's intensity-class row — hot 2 SU/beat, cool 1 SU/beat (first-pass, Epic 16-owned); the rope day is hot, and the drain is arithmetic on the table, never a literal in logic (FR43)

**Given** voluntary sleep — a pointer tap on the room's bed corner (generous target; the tap routes the character, it never acts — no second verb)
**When** the character arrives
**Then** `endDay` runs and the day ends at that instant at any pool level, any point (FR43, UX-DR4 lineage)

**Given** the pool empties mid-beat
**When** the day ends forced
**Then** it takes the identical nightfall path as voluntary sleep — the two differ only in who clicked, and events return `'sleep'` (FR43)

**And** new `day.test.js` legs cover drain arithmetic, zero in-day recovery, and voluntary/forced path equality; boundary fence green, existing test files byte-identical (NFR4, NFR5)

### Story 9.4: Nightfall compost — five subsystems, one transaction

As a player who slept,
I want yesterday to settle into stats, a diary line, and a worn room all at once,
So that a half-composted day is impossible, not unlikely (FR51).

**Acceptance Criteria:**

**Given** sleep ends a day
**When** `compost(day, life, world)` runs — exactly once
**Then** it is one pure all-or-nothing settlement returning `[{...life', world', day': freshDay(number + 1)}, ['sleep', 'compost']]`, with the feed step behind a stub hook (`settleFeeds` — no ledger numbers move until the ledger lands) and the world step an identity call to `world.advance` while gates are absent (FR51, NFR20)
**And** an empty-beats voluntary sleep composts to zero feed and zero ceiling moves — resting is legal, laziness is neutral (FR51)

**Given** settlement succeeded
**When** the diary is written
**Then** one first-person line is composed by `content.js` state-keyed selectors from the settled numbers — one sentence, under three, same state same string forever — and appended to `life.diary` (FR51; State-Keyed Prose)

**Given** a settled day's activity shape
**When** the room renders next
**Then** wear accumulates as monotone data records (`life.wear[]`: floor groove, diary tower, scuffed wall — geometry inputs, zero bitmaps) with a `'wear'` event, the renderer mounting data only, and the Identifier ↔ Design-Term mapping table gains the `wear` row in the same change (FR51, NFR10)

**Given** nightfall settles a day
**When** the shell fans the `'sleep'`/`'compost'` events out to `audio.js`
**Then** the page-turn stinger voice plays on the master bus — gesture-gated AudioContext, persisted mute/volume honored, nothing beat-locked (GDD §Audio, v3 additions; FR27 lineage)

**And** the NEW `compost.test.js` ships with the settlement matrix legs (purity: double-compost impossible; all-or-nothing: a refused settlement writes nothing; empty-day leg), `content.test.js` starts with the diary-line determinism leg, the page-turn voice ships with its red-green audio-guard leg, and the fed×cap×ceiling cells wait as named legs for the ledger's epic; boundary fence green, existing files byte-identical (NFR4, NFR5)

### Story 9.5: The day across sessions — resume, growing days, the diary reader

As a player closing the tab mid-day,
I want today waiting exactly where I left it while the world waited too,
So that the stamina budget survives my week without aging anything behind me (FR44).

**Acceptance Criteria:**

**Given** play at any point
**When** persistence fires — on sleep and by throttled mid-day autosave, both through `persist(gameState)`
**Then** a reload restores `day.stamina.pool`, `day.beats`, `day.caps`, and the active station's state exactly — nightfall stays the only in-design reset (FR44, NFR19)

**Given** load, idle, or tab-hide for any wall-clock duration
**When** the game resumes
**Then** the world tier is untouched — nothing but `compost` ticks it, and the day number proves it; `Date` appears nowhere in the sim graph to make otherwise (FR44, NFR20)

**Given** any legal sequence of days in this epic's codebase
**When** a seeded fuzz leg enumerates them
**Then** the day-pool seed never decreases — the `STAMINA` row plus `life.stats.VIT`, which nothing writable here can lower: VIT only ever grows, days never shorten (FR44, NFR19)

**Given** the diary affordance — a diegetic reader over `life.diary`, strings via `content.js` selectors, scroll only
**When** the player opens it any time, any window size
**Then** past day lines read back identical to how they were written — zero new panel classes, inside the letterbox resize path (UX-DR5, NFR7)

**Given** a fresh v3 life with `life.name` unset
**When** the diary's first page offers "name yourself" in its handwriting treatment
**Then** one keystroke through the existing card-pick input lane records the name once into `life.name` — set once, never rewritten, persisted only through `persist(gameState)`; staying unnamed is legal (the prompt re-offers, nothing else changes) (UX-DR6)

**And** new `day.test.js` legs: write→load→identical-state resume, world-frozen-across-reload, the name-prompt once-only leg (set once, re-offers while unset), and a synthetic 100-day save round-tripping under the 800 KB envelope budget; boundary fence green, existing test files byte-identical (NFR4, NFR5, NFR18)

## Epic 10: Activities & Stats

The room grows corners: running, lifting, reading join the rope on the universal tap; feeds and bleed, per-day caps and failure-only ceilings make supercompensation the growth engine; day-cards ride total beats; sore-walk and the dotted prophecy teach without a line of UI copy. "What kind of day was that?" becomes a one-sentence question with a real answer.

**FRs covered:** FR41, FR42, FR45, FR46, FR47 (FR47's INT-board rendering lands in Epic 12), FR48 · **NFRs:** NFR19 (ledger core)

### Story 10.1: The station kernel and the running corner

As a player's thumb,
I want the same tap to mean stride, press, page, or jump wherever I stand in the room,
So that one verb runs four genres and switching costs a walk, never a menu (FR41).

**Acceptance Criteria:**

**Given** `station.js` exports the beat kernel — cadence phase, fail window, and cap arithmetic read from the `STATIONS` cadence table rows
**When** any station runs
**Then** beats fire the `'beat'` event on sim-step-aligned cadence and the 9.3 drain tables hook per intensity-class row (running: hot) (FR41, FR43)

**Given** the universal tap — Space / Enter / pointer-down anywhere, unchanged input lanes
**When** the current station is running
**Then** the tap is a stride on the run cadence row — the station is a config on the kernel, not a new code path — and a second verb NEVER ships (FR41)

**Given** a pointer tap on a room corner — generous hit area, keyboard parity preserved one-button (corner cycling steps the same target)
**When** the character walks over and arrives
**Then** `day.station` swaps at arrival, the beat clock keeps counting through the walk, and the bed-corner routing of 9.3 is one row in the same corner table — the walk-up primitive generalizes, nothing duplicates (FR41, UX-DR4)

**And** the NEW `station.test.js` ships with red-green legs: kernel-wrapped rope-day beats bit-identical to the unwrapped stream, cadence-row contract tests, and corner-swap-as-data; new terms get their Identifier ↔ Design-Term mapping rows in the same change; boundary fence green, existing files byte-identical (NFR4, NFR5)

### Story 10.2: Lifting, reading, and the textures of failure

As a player testing a new corner,
I want failing a rep or dozing over a page to feel different — and to price exactly one thing,
So that failure reads as information: that stat's day is over (FR42).

**Acceptance Criteria:**

**Given** the lifting station (press-rep cadence row) and the reading station (page-turn cadence row)
**When** either runs on the kernel
**Then** each is table config — lifting hot, reading cool per the `CADENCE` class rows — no new verbs, no new timing systems (FR41, FR43)

**Given** a beat lands outside the fail window
**When** failure resolves
**Then** the texture is station-specific data — trip (rope), stumble (run), failed rep (lift), falling asleep (read) — returned as events, never a thrown error (FR42)

**Given** any station failure
**When** the failure settles in day state
**Then** `day.caps[stat]` freezes at that stat's realized day value — deeper attempts before the failure raise the frozen position — and beats at that station afterward produce zero income (the income zeroing itself settles through the ledger's feed path once it exists; the day-side cap write is this story's contract) (FR42, FR46)

**And** `station.test.js` gains per-station failure-texture legs and a cap-at-realized leg (realized value rises pre-failure, cannot move post-failure); boundary fence green, existing files byte-identical (NFR4, NFR5)

### Story 10.3: The ledger — feed, bleed, and monotone writes

As the life I am building,
I want every beat to pay permanently and nothing to ever write me down,
So that the lossless law is arithmetic, not a promise (NFR19).

**Acceptance Criteria:**

**Given** `life.js` exports `gain(life, stat, amount, cap)` and `raiseCeiling(stat, realized)` as the only stat mutators in the game
**When** either is called
**Then** both clamp monotone — no legal call decreases `life.stats[stat]` or `life.ceilings[stat]` — and every other module writes stats by returning reasons to compost, never by writing (NFR19, FR45)

**Given** the 9.4 feed stub replaced inside `compost`
**When** nightfall settles
**Then** each activity's beats feed 1:1 to their primary stat plus a bleed at the `BLEED` table row — first-pass ~15%, gate-bound, Epic 16-owned — to the one fixed neighbour: rope→AGI→INT, running→VIT→STR, lifting→STR→VIT, reading→INT→AGI — applied once, at compost, through `gain` only (FR45, FR51)

**Given** any legal sequence of gains, composts, and card effects
**When** the seeded fuzz leg in the NEW `life.test.js` enumerates it
**Then** no transition ever lowers a stat or a ceiling — the monotonicity fence leg is the executable law (NFR19)

**And** the stat namespace stays STR/VIT/AGI/INT — `SHADOWS` gains no key or producer until the awakening's data rows land, per its own epic's contract; ledger contract legs ship in the same change; boundary fence green, existing files byte-identical (FR45, NFR4, NFR5)

### Story 10.4: Caps, supercompensation, and teaching with zero UI

As a player pushing a day,
I want the income line to flatten under my hands and tomorrow's ceiling to rise only because I failed today,
So that growth-requires-failure is felt, never read (FR46, FR47).

**Acceptance Criteria:**

**Given** every stat carries a per-day income ceiling
**When** a day's realized feed reaches it
**Then** further beats play at zero income — animation and joy, no ledger write — with the `'cap'` event firing once per stat per day, ceiling positions from the per-day cap rows Epic 16 owns (FR46)

**Given** a failure day settles in compost
**When** `raiseCeiling` moves that stat's long-term ceiling
**Then** it moves to the `CEILING_RULE` row's 125% (first-pass, gate-bound) of the failing day's realized growth, from the failure site only, from `compost` only — a safe day moves no ceiling, ever, pinned by leg (FR46)

**Given** zero UI copy anywhere in this story
**When** the day ends
**Then** the teaching is diegetic: tomorrow's diary line renders one dotted notch higher iff today failed (a `content.js` state-keyed selector over `day.caps` outcomes), growth days certify themselves with the sore-walk animation and footfalls, and flat days produce no stiffness — the player learns supercompensation from the room, not a tooltip (FR47; State-Keyed Prose)

**And** `compost.test.js`/`life.test.js` gain the fed×cap×ceiling matrix cells now that all three exist (plateau legs, failure-only raise, cross-day monotonicity) and `content.test.js` gains the prophecy-equivalence leg (failed day → notch-up string, flat day → identical string); FR47's INT-neglect blanked-board rendering is explicitly Epic 12's leg, not this story's; boundary fence green, existing files byte-identical (NFR4, NFR5)

### Story 10.5: Day-cards on the beat clock

As a player mid-day,
I want rule-changing picks to keep arriving — now priced by everything I did, not just skips —
So that the whole day's shape drives the build, and none of it survives the night (FR48).

**Acceptance Criteria:**

**Given** activity beats accrue across all stations
**When** the total crosses the `OFFER_CADENCE` row's every-20-beats position (first-pass, balance-owned by Epic 16)
**Then** a day-card offer fires with the `'offer'` event, and v2's every-10th-skip rule is subsumed — the skip clock survives only as the rope grammar's internal pacing measure (FR48)

**Given** an offer draws
**When** candidates resolve
**Then** it is pick-of-2, or pick-of-3 past the lifetime-beat threshold row (first-pass 400, gate-bound), rarity weights 70/25/5 carried from v2, capped and dead-pick cards filtered, draws consuming the `cards` sub-stream via `deriveStream(seed, 'cards', ordinal)` — same seed, same offers, bit-exact (FR48, NFR17)

**Given** a picked card
**When** `applyCard` patches the day-scoped effect record
**Then** the 12-card physics vocabulary survives verbatim as the day-card vocabulary, day-cards dissolve at nightfall (`compost` clears `day.dayCards[]` in the same transaction that settles the ledger), and no card touches a permanent stat or its ceiling — the lossless law binds every catalogue row (FR48, FR51)

**And** `catalogue.test.js` gains appended-only legs (existing legs byte-identical): 20-beat cadence across a multi-station day, the pick-of-3 threshold flip, ephemerality-at-compost, and a rope-only-day offer-pacing parity leg against v2 behavior; docs for the subsumed skip rule age out in the same commit (A5); boundary fence green (NFR4, NFR5)

## Epic 11: Life Cards & Milestones

Earned events fire permanent pick-twos — first failure per stat, first of everything — and the life starts reading back as a build: habits chain two stations, emphases steer the ledger, milestones arrive with capability-threshold vignettes. The lossless law binds every card.

**FRs covered:** FR49, FR50, FR58 (auto-pick row minted in 11.2; owned behavior ships in 14.6)

### Story 11.1: The milestone engine — earned events fire permanent pick-twos

As a player whose failures and firsts start counting for good,
I want earned moments to present a permanent pick-two of life-cards,
So that my life reads back as a build of choices, not just accumulated numbers.

**Acceptance Criteria:**

**Given** a `compost(day, life, world)` settlement in which an activity fails for the first time on a stat
**When** settlement completes
**Then** `life.milestones.fail[stat]` flips false→true exactly once — milestone flags are monotone like the ledger, never re-set, never cleared (FR49)

**Given** a flipped milestone flag
**When** the offer step runs
**Then** a permanent pick-two draws from the milestone-filtered life-card pool in `upgrades.js` — never-repeating (owned `life.lifeCards[]` filter the draw like capped cards; rarity-less per the pool rule) — and presents on the existing card-pick lane, `Digit1`/`Digit2` on the shipped number-key picker (FR49, FR13)

**Given** a picked life-card
**When** it applies via whole-record patch `applyLifeCard(life, card) → life'` (the ADR-2 convention)
**Then** it joins `life.lifeCards[]` permanently — never removed, never re-offered — and persists only through the shell's `persist(gameState)` in the envelope `{v:3,state,sum}` on key `jumprope-life` + `.prev`, no new storage key (FR49)

**Given** milestone families whose triggers belong to later epics
**When** the engine is inspected
**Then** `firstClear`, `awakening`, and `rankDebut[band]` exist behind the same monotone setter with no Epic 11 trigger site — the engine ships their rails, not their causes

**Given** the sim graph after this change
**When** `tests/boundary.test.js` runs
**Then** the fence still passes — milestone draws consume `deriveStream(seed,'cards',ordinal)`; no `Date`/`Math.random`/DOM joins `life.js` or `upgrades.js` (NFR4)

**And** new red-green test legs in `life.test.js` (flag monotonicity, one-time fire, persistence round-trip) and `catalogue.test.js` (milestone-filtered draw, never-repeat filtering) ship in the same change (NFR5)

### Story 11.2: The life-card vocabulary — habits and emphases

As a builder of a kind of life,
I want permanent cards that chain activities and steer growth rules,
So that "what kind of life was that?" reads off the permanent picks as legibly as a day reads off its cards.

**Acceptance Criteria:**

**Given** a habit life-card chaining two activities ("jump rope while reading")
**When** its beat plays at the lead station
**Then** one tap counts as a beat for both chained activities: both feed streams accrue under their own caps and both activities' intensity-class rows drain `day.stamina.pool` at once (FR49; FR43's hot/cool rows are referenced, no new numbers), and the beat advances the day-card cadence table row once, never twice (FR48's 20-beat row stays the one clock)

**Given** an emphasis life-card
**When** nightfall settles feeds
**Then** it steers the ledger at read time (bleed target / feed weight rows) inside `compost`, spent through `gain` — a card is a rule settlement reads, never a writer (FR49)

**Given** every life-card row in the catalogue
**When** its contract test applies it to any state
**Then** no `life.stats` or `life.ceilings` value changes on application — the never-grant-stat-points rule is a fence, not a convention; the ledger API stays the only stat writer (FR49, FR50)

**Given** the auto-pick life-card row in the catalogue (`upgrades.js`, late-gated)
**When** the `rankDebut` milestone for the S band fires through the 11.1 rails
**Then** the card is offered exactly once in that milestone pick-two — optional, rule-only, no stat lines — and owning it arms the behavior Story 14.6 consumes (FR58; offered at the completion beat per decision-log Session 5; "defined late-gated" per gdd-epic-overview 11.2)

**And** new red-green test legs ship in the same change: one contract line per life-card row in `catalogue.test.js`, habit dual-drain legs in `day.test.js`, emphasis-feed legs in `compost.test.js` (NFR5); `tests/boundary.test.js` green (NFR4)

### Story 11.3: Station arrivals — "okay, I can also do this"

As a player crossing a capability threshold,
I want the new capability to introduce itself in the room's own voice,
So that growth lands as a beat I feel, not a notification I read.

**Acceptance Criteria:**

**Given** a `life.stats` value crossing a station's arrival threshold (table row, Epic 16-owned; first-pass values seed the table)
**When** the day settles
**Then** the 11.1 engine flips `life.milestones.arrive[station]` once and the vignette line mounts on the existing surfaces — composed by the `content.js` System/diary selectors from the ledger's numbers, tone "okay, I can also do this", the renderer mounting strings only (FR49, FR47's zero-UI teaching)

**Given** the same `gameState` at any future time
**When** the vignette selector runs again
**Then** it returns the same string, forever — the vignette is a state read, never a stored line; the `content.test.js` leg proves it (NFR17 hygiene)

**Given** any vignette state
**When** it renders
**Then** zero new panels or surfaces exist — the vignette rides the chyron/diary treatments inside the letterbox resize path (UX-DR5, NFR7)

**And** new red-green test legs in `content.test.js` and `life.test.js` ship in the same change (NFR5); `tests/boundary.test.js` green

### Story 11.4: The lossless law — the card fence

As the designer (and every future balance change),
I want the no-card-can-hurt-the-ledger property proven mechanically,
So that "you can never lose anything" stays an invariant, not a promise.

**Acceptance Criteria:**

**Given** seeded fuzz runs drawing legal day-cards and life-cards through the real offer pipelines over N simulated days
**When** any prefix of the resulting state sequence is diffed
**Then** no `life.stats` or `life.ceilings` value ever decreased — no legal day-card or life-card sequence can reduce a stat or its ceiling (FR50, NFR19)

**Given** a fuzz-discovered card whose effect is risky
**When** its state diff is inspected
**Then** it touched only the legal risk channels — stamina timing, cap exposure, gate shelf life — never the ledger (FR50)

**And** the fuzz ships as a seeded leg in `life.test.js` beside Epic 10's ledger fuzz, red-green in the same change (NFR5); `tests/boundary.test.js` green (NFR4)

## Epic 12: The World Layer

The TV ladder runs (infomercials → weather/sports → news), the corkboard pins alive gates with shelf lives, the hunter economy clears a gate a day the player sleeps, RANK and LEVEL debut *in the world* before any panel — and at day ~15–20 the weather bulletin slips: portals. Act two opens mid-sentence.

**FRs covered:** FR52, FR53, FR54, FR55 (FR47's neglect-blanked rows land here) · **NFRs:** NFR20

### Story 12.1: The TV ladder — the world as broadcast

As a player living in one room,
I want the world to arrive as TV murmur and a one-line caption,
So that everything beyond my window stays epic radio — a place I don't live in yet.

**Acceptance Criteria:**

**Given** ladder state read from `gameState` (day number vs the ladder table rows, Epic 16-owned; first-pass values seed the table)
**When** the TV-register content selector runs
**Then** it returns a line from the current pool — infomercial early, weather/sports later — keyed through `deriveStream(seed,'content',ordinal)` and composed from state; same state → same line, forever (`content.test.js` determinism leg) (FR54)

**Given** the mounted channel
**When** frames run
**Then** `audio.js` plays the audible murmur as a leaf reacting to a channel read — nothing beat-locked, the rope's phase untouched (FR54, NFR8) — and the TV surface mounts the selector's string as a single caption line inside the letterbox resize path (FR54, UX-DR5, NFR7)

**Given** the ladder selector after this change
**When** asked at any day number
**Then** it tops out at the weather/sports tier — no news-tier row exists in the ladder table yet, so no bulletin can air (FR54)

**And** new red-green test legs in `content.test.js` (pool determinism, ladder derivation) ship in the same change (NFR5); `content.js` imports nothing and joins the `tests/boundary.test.js` sim-graph fence green (NFR4)

### Story 12.2: The corkboard — alive gates, INT-priced rows

As a player deciding what to farm,
I want the gate board to be the world's map and clock made of cork,
So that every opportunity carries a visible shelf life.

**Acceptance Criteria:**

**Given** alive `world.gates[]`
**When** the board renders
**Then** rows come straight from state fields — tier/comp/reward/shelf — the renderer indexes `world.gates[]` and infers nothing; an empty `world` renders bare cork (FR52, FR53)

**Given** `life.stats.INT`
**When** slip-template rows render
**Then** the visible row count is the INT table row (curve as data, Epic 16-owned; first-pass seeds the row) — rows beyond the player's INT render as blanked cells, never hidden panels (FR52)

**Given** a life that stopped reading (INT ceiling flat)
**When** the board renders
**Then** its rows go visibly blanker — neglect visible, never punished: FR47's board half lands here (FR47)

**And** new red-green test legs in `world.test.js` (row visibility is a sim-side pure function of (INT, gates); blanked-vs-hidden leg) ship in the same change (NFR5); board prose ships only as `content.js` slip templates, `tests/boundary.test.js` green (NFR4)

### Story 12.3: One tick per slept day — world.advance inside compost

As a player who closes the tab overnight,
I want the world to wait for me,
So that the hunters' day passes only when I sleep, and absence never mutates the board.

**Acceptance Criteria:**

**Given** a `compost(day, life, world)` settlement
**When** the world line of compost runs
**Then** `world.advance(world, dayNumber)` — called ONLY from `compost` — rolls the hunter-tick table row (~1 random gate cleared per game day slept, first-pass value, Epic 16-owned) via `deriveStream(world.seed, 'hunterTick', dayNumber)`, spawns per its `gateSpawn` roll, and decays `world.gates[].shelf`; the batch returns `gateClear`/`gateSpawn` events with at most one `news` per day, coalesced (FR53)

**Given** the same saved state re-opened any number of times
**When** the game loads, idles, and hides the tab
**Then** the board and news are byte-identical to close — frozen while closed: no world writer exists outside compost, and the leg proves two loads of one save produce identical `world` JSON (FR53, NFR20)

**Given** board and news rendered from one snapshot
**When** either is read
**Then** they agree by construction — news entries and gate rows are two reads of the same `world` state, never two ledgers (FR53)

**Given** the sim import graph
**When** `tests/boundary.test.js` runs
**Then** `Date` appears nowhere in the sim graph — world time is slept days only, one `Date.now` lights the Date-ban leg red (NFR20)

**And** new red-green test legs in `world.test.js` (tick determinism from equal seeds, exactly-one-tick-per-settled-day, frozen-while-closed) ship in the same change (NFR5)

### Story 12.4: RANK derived — in-world debuts, zero new panels

As a player the news is starting to mention,
I want RANK and LEVEL introduced inside the world before any panel exists,
So that the first hidden numbers arrive as fiction, not menus.

**Acceptance Criteria:**

**Given** any `gameState`
**When** anything asks for rank
**Then** `rankOf(life)` computes it — weighted sum of `life.stats` + `life.LEVEL` through the `RANK_WEIGHTS` table row (Epic 16-owned; first-pass weights seed the table) — never stored: no state-tree slot, no save key for it, the `life.test.js` rankOf-contract leg proves the census cannot desync or stale (FR55)

**Given** a band change in derived rank
**When** settlement observes it
**Then** the 11.1 setter flips `life.milestones.rankDebut[band]` once, firing the RANK-debut pick-two through the existing milestone-offer rails (FR49, FR55)

**Given** `life.LEVEL`
**When** the state tree is read
**Then** the field exists, stored, defaulting to 0 — dungeon-earned only; no Epic 12 code path writes it (FR55)

**Given** the debut selectors
**When** the moment fits
**Then** the "E-rank" chyron line keys off the derived `rankOf` band and the "LV 1" stepping text keys off `life.LEVEL` — both ship as `content.js` tables mounted on the chyron/board reads, both silent pre-debut, zero new panel classes (FR55, UX-DR5)

**And** new red-green test legs in `life.test.js` (rankOf contract, LEVEL default) and `content.test.js` (debut-selector determinism) ship in the same change (NFR5); `tests/boundary.test.js` green (NFR4)

### Story 12.5: The Interrupt — the only camera move, the only reveal

As a player mid-weather-report,
I want the impossible news to break in on schedule and the panel to admit what it always was,
So that Act two opens inside the world without taking the button from me.

**Acceptance Criteria:**

**Given** day number reaching the ladder's news tier — the INTERRUPT_DAY table row, first-pass day ~15–20, balance-bound, Epic 16-owned
**When** that day's compost settles
**Then** the batch returns `news` and `interrupt` exactly once per save — the ladder step is a derived read of monotonic day count, so the date cannot re-fire and cannot wall-clock — and the same advance opens the world: `gateSpawn` starts, gates appear the interrupt day itself, `world.news[]` gains the bulletin entry (FR54, NFR20)

**Given** the bulletin
**When** the TV airs it
**Then** the weather pool yields to the news-slip — a weather report interrupted by the portal bulletin, gates stated as fact — composed only from the `content.js` bulletin template plus state numbers; same state → same slip (`content.test.js` leg) (FR54)

**Given** the shell observing the `interrupt` event
**When** the moment plays
**Then** the camera drifts toward the TV — the game's only automatic camera move, triggered by a state read — with control never lost and the rope never beat-locked, firing once per save, non-skippable on first play, diary replay of the moment skippable; `prefers-reduced-motion` damps the drift, never the news (FR54, NFR8, FR23)

**Given** the first sleep after the interrupt day
**When** that compost batch runs
**Then** it returns `rename` once: the diary-tally labels morph in place, diary-handwriting into System sans — the System label rows derived word-for-word from the diary tally rows, the same-handwriting lineage — adding zero mechanics and zero panels: the only UI reveal the game ships (FR55, UX-DR5)

**And** new red-green test legs in `world.test.js` (ladder crossing, once-per-save derivation, spawn-gate opening) and `content.test.js` (bulletin and rename vocabulary determinism) ship in the same change (NFR5); `tests/boundary.test.js` green — the push-in trigger lives in the shell, the sim never commands the camera (NFR4)

## Epic 13: Dungeons & Tap-Fighting

The room grows an impossible door. Entering commits the rest of the day to tap-fighting in the palette-flipped gym — HP, flinch, danger bed: the first real hurt after hours of safety, on purpose. Losing ejects you, locks the gate for the day, and costs nothing else. First hand-clears pay LEVEL and arm shadow-posts.

**FRs covered:** FR56 (+ arming hooks for FR52/FR57)

### Story 13.1: The impossible door — a day type, not a mode

As a player whose room has outgrown itself,
I want one door I can walk through,
So that the act-two turn happens to an object in my room instead of a screen I open.

**Acceptance Criteria:**

**Given** a room after the Interrupt with alive gates in `world.gates[]`
**When** the shell renders
**Then** the door is ONE mesh carrying ONE prompt line (a `content.js` selector, locked/alive wording from state) inside the diegetic door surface — zero new panel classes, letterbox resize path untouched (FR56, UX-DR5, NFR7)

**Given** a day in progress with `day.stamina.pool` above zero
**When** the player taps the door (pointer target or one-button corner parity)
**Then** `enterGate(day, gateId)` returns `{...day, dayType: 'dungeon', gate: gateId, station: fightStation(...)}` — a field write plus a station swap, no mode object, no second verb (FR41, FR56)

**Given** a day that entered a gate
**When** `tickDay` advances the remaining beats
**Then** the rest of the day is committed: corner switching stops routing, drains follow the fighting cadence row, no in-day recovery exists, and voluntary `endDay` still settles the dungeon day through the one `compost` path (FR43, FR51, FR56)

**Given** a locked gate (`lockedUntilDay` still in force)
**When** the door is tapped or rendered
**Then** entry is refused as data — the prompt reads locked and no state changes (FR52, FR56)

**And** `tests/dungeon.test.js` ships as a NEW file with red-green legs for the entry transition and the committed-day rule; existing `tests/*.test.js` stay byte-identical and `tests/boundary.test.js` stays green — no `Date`/`Math.random`/DOM/three enters the sim graph (NFR17, NFR4)

### Story 13.2: The fighting station — HP, flinch, and a danger bed

As a player stepping through the door,
I want the same one button to mean dodge,
So that the first real hurt in the game speaks the verb I already own.

**Acceptance Criteria:**

**Given** `day.dayType === 'dungeon'`
**When** the beat kernel advances
**Then** fighting is a code station in `js/station.js` honoring the same beat/fail/cap grammar with its own cadence-table row (dodge-timing window, HP, flinch) — the numbers are the Epic 16 data-table row, and this story seeds first-pass values only, never a new literal (FR41, FR56)

**Given** a dodge landed inside the window, and one missed
**When** the beat resolves
**Then** both flow through the single tap lane (Space/Enter/pointer-down) and the miss produces the fight failure texture — flinch — capping that day's fight income at realized value exactly as the other stations' failure textures do (FR41, FR42)

**Given** fight HP and flinch state
**When** any transition writes state
**Then** they live dungeon-local inside `day.station` and are NEVER written to `life.stats` or `life.ceilings` — `gain`/`raiseCeiling` stay the only stat mutators and HP is not a stat (FR56, NFR19)

**Given** a fight beat, a flinch, or HP hitting zero
**When** the events fan out
**Then** the danger-bed voice rides the existing `audio.react(events)` bus, gesture-gated AudioContext, persisted mute/volume honored, and nothing beat-locks the sim (FR27 lineage, FR56)

**And** the fighting station runs on the same beat kernel and its segment keys to `day.gate` — this story ships the SHAPE only (a kernel row + the gate keying); the recording mechanism is Story 14.1's leg, which wraps this kernel with no new machinery, so battle-shadows become possible without Epic 13 shipping a recorder (FR57 arming hook; ordering: 13.2 shapes, 14.1 records)

**And** red-green legs in `tests/dungeon.test.js` (new file) plus new legs in `tests/station.test.js` cover cadence-row lookup, flinch-income capping, and HP-never-reaches-the-ledger; `tests/boundary.test.js` green (NFR17)

### Story 13.3: Ejection — the day is the whole price

As a player who loses a dungeon,
I want to be thrown out with nothing taken but the rest of the day,
So that losing is a scheduling problem, not a punishment.

**Acceptance Criteria:**

**Given** fight HP reaches zero
**When** the fight resolves
**Then** the sim returns the `eject` event and eject is DATA — `{ejectedGate, lockedUntilDay}` folded at compost — never a thrown error and never a stat write (FR56, NFR19)

**Given** an eject pending
**When** `compost(day, life, world)` settles that day exactly once
**Then** the lock is applied through `world.advance` inside the transaction so `world.gates[]` reads locked until `lockedUntilDay`, while `life.stats` and `life.ceilings` move only by what the day honestly earned through the feed and caps (FR51, FR56, FR46, NFR20)

**Given** an ejected gate
**When** the corkboard and the door render the next beat
**Then** both are reads of the one world state — no parallel lock bookkeeping anywhere (FR52, UX-DR5)

**Given** ejection prose
**When** the TV and System one-liners are chosen
**Then** they come from `js/content.js` state-keyed tables (same state, same string, forever) and the renderer only mounts them (FR56; State-Keyed Prose)

**And** new legs in `tests/compost.test.js` prove all-or-nothing ejection (a folded eject leaves no half-lock) and the lossless law holds across seeded fuzz; `tests/dungeon.test.js` pins the `{ejectedGate, lockedUntilDay}` shape; `tests/boundary.test.js` green (NFR17, NFR19)

### Story 13.4: This room, wrong — the dungeon look and the first hand-clear

As a player inside the wrong version of my own gym,
I want the familiar stage palette-flipped and fogged,
So that the danger registers in my body before it registers on any panel.

**Acceptance Criteria:**

**Given** `day.dayType === 'dungeon'`
**When** `js/render3d.js` draws a frame
**Then** the SAME stage geometry renders with a flipped palette and heavier fog through the existing area palette/fog path — zero new geometry class, and the view payload is the only input (FR15 lineage, FR56)

**Given** any window size or aspect ratio in a dungeon day
**When** frames draw
**Then** the dungeon sits inside the existing aspect-correct letterbox resize path — no layout bypass (NFR7)

**Given** a gate cleared by hand for the first time
**When** the clear folds at compost
**Then** `life.LEVEL` increments exactly once for that gate (LEVEL is dungeon-earned only) and `world.gates[].posted` is set — the shadow-post arming hook Epic 14 consumes — while re-clears never re-pay LEVEL and never re-arm (FR52, FR56)

**Given** the dungeon view payload
**When** the renderer mounts copy
**Then** every string arrives from `content.js` selectors; no prose is composed render-side (State-Keyed Prose)

**And** `tests/dungeon.test.js` gains legs proving the look is a pure state→payload read and that LEVEL and `posted` are each once-per-gate across seeded re-clear sweeps; `tests/boundary.test.js` stays green with `render3d.js` outside the sim graph, and the mapping-table rows for `dayType`/`posted` land in the SAME commit (A5 doc-drift rule; NFR17)

## Epic 14: Shadows & Automation

The awakening: a past day is standing in the corner. Days record as input-event segments and replay bit-exactly as shadows — cast, re-cast, retire; outputs bank at nightfall, battle-shadows fight posted gates, the auto-pick card automates the last verb. Completion arrives as a state — the chyron says your name — and the curated room keeps playing. The poster shot, running live.

**FRs covered:** FR57, FR58, FR59 · **NFRs:** NFR17, NFR18, NFR21

### Story 14.1: The recorder in the beat kernel

As a player whose yesterdays are about to stand in the corners,
I want the game to remember exactly what I did,
So that my past replays precisely instead of approximating.

**Acceptance Criteria:**

**Given** a live station segment
**When** taps land
**Then** `recordSegment` appends `(step, inputBit)` to the active `{seed, segment, events}` entry in `day.recordings[]` — input events only, never keyframes or result-only animation (FR57; ADR-3)

**Given** a day that switched stations
**When** segments close
**Then** there is one segment per activity segment, each seeded via `deriveStream(seed, 'station', ordinal)`, and multi-segment days replay segment-by-segment in order (FR57, NFR17)

**Given** a day written with deliberately input-chatty play
**When** the recording is measured
**Then** the day row stays within the ≤ 4 KB soft / 8 KB hard budget and the same-step coalescing policy is the only overflow behavior, with the budget as the NFR18 table row and a 100-day save proven ≤ 800 KB (NFR18)

**Given** any recorded segment
**When** `replaySegment(seg, t)` is compared step-for-step with what live play produced at step `t`
**Then** the poses are identical for every `t` — replay is a read of the same station transitions, never a second simulation (FR57, NFR17)

**And** new identity legs in `tests/station.test.js` plus the budget leg cover coalescing and the KB caps; recordings persist only through `persist(gameState)` in the `{v:3,state,sum}` envelope on `jumprope-life` + `.prev`, and `tests/boundary.test.js` stays green (NFR18, NFR19, NFR17)

### Story 14.2: The awakening — a past day in the corner

As a player returning from the first dungeon clear,
I want a day of mine standing in the corner jumping rope,
So that the reveal is a thing in the room, not a screen about the room.

**Acceptance Criteria:**

**Given** the first dungeon clear settles
**When** the scripted awakening beat fires
**Then** `life.milestones` flags it once, a `content.js` System-register sting lands in the prompt slot, and `castShadow(day, life, corner)` posts a day to a corner — the whole beat returns as state plus lowercase events, no cutscene path (FR57; narrative beats 10–11)

**Given** `castShadow` running
**When** `life.shadows[]` gains an entry
**Then** it is `{corner, dayRef, frozen}` — a reference into the recorded day, never a copy, with outputs frozen at the casting day's ceilings (FR57)

**Given** one or more posted shadows
**When** `tickGame` advances a step
**Then** every posted replay advances via `replaySegment(segment, step)` keyed by the segment's own seed, in the same fixed step, and `shadowPoses[]` arrive in the snapshot the renderer reads (FR57, NFR17, NFR21)

**Given** `tests/replay-sweep.test.js` as a NEW file
**When** seeded N-day × M-shadow sweeps run
**Then** shadow replay equals recorded reality bit-exactly at every step, and the sweep is CI's determinism gate — no player-visible nondeterminism may enter the day/world sim (NFR17)

**And** the awakening sting and corner copy are `content.js` selectors only, `tests/content.test.js` gains the same-state-same-string leg, and `tests/boundary.test.js` stays green with the playback loop in `js/game.js` (FR57, NFR17)

### Story 14.3: Curation — cast, re-cast, retire

As a player building the room's cast list,
I want to choose which yesterdays stand in the corners,
So that the endgame room is curated instead of accumulated.

**Acceptance Criteria:**

**Given** a corner
**When** the player taps it and answers the corner prompt (cast from a diary day / re-cast / retire)
**Then** `castShadow`, `recastCorner`, or `retireShadow` performs it and returns `cast` / `recast` / `retire` — corner prompts only, zero menus, zero new panel classes (FR57, UX-DR7, UX-DR5)

**Given** a posted shadow whose casting day is behind the player's current `life.ceilings`
**When** its output is computed at any later day
**Then** it pays at the casting-day `frozen` ceilings — shadows never grow — and a re-cast swaps the reference so the corner's past changes while that shadow still never grows (FR57, FR46)

**Given** a retired corner
**When** state returns
**Then** the reference is gone, the diary keeps the day, the corner stands empty, and no stat or ceiling moved — the lossless law applies to curation (FR57, FR50, NFR19)

**Given** a recording whose checksum fails at load
**When** its corner renders
**Then** the corner is empty and an author-console verdict is logged — never a wrong ghost, and nothing player-facing (NFR17; author-loud/player-silent lane)

**And** posted shadows stay desaturated and clearly non-player at every palette, `tests/life.test.js` gains red-green legs for frozen outputs across re-cast sequences, and `tests/boundary.test.js` stays green (FR57, NFR17, NFR7)

### Story 14.4: Nightfall banking — shadows on the sheet

As a player whose past works while I sleep,
I want shadow output to arrive at nightfall as one honest line,
So that automation shows up in the ledger instead of as a menu.

**Acceptance Criteria:**

**Given** posted shadows with output accrued during the day
**When** `compost(day, life, world)` settles
**Then** that output converts through the feed into the SHADOWS stat line via `gain`, inside the one all-or-nothing settlement that also ages the world (FR51, FR57, FR45, NFR20)

**Given** shadow output priced at frozen casting-day ceilings
**When** it is banked
**Then** it respects the SHADOWS per-day ceiling and beats past it bank at zero, like every other feed (FR45, FR46, FR57)

**Given** a day with no shadows posted
**When** compost settles it against an identical shadowed day
**Then** SHADOWS income is exactly zero and the rest of the settlement is byte-identical — the control leg (FR51, NFR19)

**And** new legs in `tests/compost.test.js` pin exactly-once banking across double-compost attempts and the `life.test.js` monotone fuzz leg still holds; the SHADOWS line reads as diary tally before the rename and System line after, both via `content.js` selectors (FR57, NFR19)

### Story 14.5: Battle-shadows at posted gates

As a player who posted a fight-day at a gate,
I want that day to keep fighting there,
So that a gate I armed keeps working whether I walk through it or not.

**Acceptance Criteria:**

**Given** a gate with `world.gates[].posted` referencing a fight-day
**When** `world.advance(world, dayNumber)` runs inside compost
**Then** the battle-shadow replays its recorded fight segment at that gate and the outcome is the replay's resolved HP — rng only through `deriveStream`, no AI and no coin flip (FR57, FR53, NFR17)

**Given** a battle-shadow whose replay resolves a win
**When** world state returns
**Then** the gate clears through the same clear path the hunter tick uses (`clearedBy` set, news and board read it), and a loss leaves the gate alive — outcomes honest, never a guess (FR53, FR57)

**Given** a dungeon day's fight segment
**When** it is recorded
**Then** it carries `day.gate` so the posting can point at it — the arming hook landed in Epic 13 is consumed here and nowhere else (FR57; FR52 arming)

**And** `tests/world.test.js` gains a seeded leg proving identical seeds and postings yield identical gate outcomes, replay playback stays inside the fixed-step budget, and `tests/boundary.test.js` stays green with the mapping-table rows for `posted`/battle-shadow landing in the SAME commit (A5 rule; NFR17, NFR21)

### Story 14.6: Completion is a state — the chyron says your name

As a player the arithmetic finally caught up with,
I want the news to carry my name while I keep training,
So that finishing is a fact about me and not a screen I dismiss.

**Acceptance Criteria:**

**Given** `rankOf(life)` derived from the ledger against the rank ladder's S row (the Epic 16 weight row, referenced not hardcoded)
**When** the census crosses into S
**Then** the `name` event returns exactly once and the chyron carries `life.name` — the saved day-1 name — with no ceremony and no new state enum (FR59, FR55)

**Given** the name has fired
**When** later chyron lines are selected
**Then** the pool quotes the player's own `life.diary` lines back, state-keyed through `content.js` selectors so the same state always reads the same words (FR59)

**Given** the auto-pick life-card owned and a pick-two offer live
**When** the offer resolves
**Then** the pick is taken automatically through the same filter-and-`applyCard` path with a diegetic trace, the manual path stays fully functional, and no card reduces a stat or ceiling (FR49, FR50, FR58)

**Given** any day after the name
**When** days, shadows, board, and compost continue
**Then** designed endless holds unchanged — nothing ends, nothing gates, the room keeps playing (FR59)

**Given** design-uncapped posted-shadow counts
**When** frames render at 60 FPS @ 240-line
**Then** far shadows render cheaper through pose-preserving tri-count LOD in the render layer only, with no gameplay cap and every `replaySegment` advance fitting the fixed-step sim budget (NFR21, NFR17)

**And** red-green legs cover name-exactly-once, quote-back determinism, and post-name endless continuity across `tests/life.test.js`, `tests/content.test.js`, and `tests/replay-sweep.test.js`; existing test files stay byte-identical and `tests/boundary.test.js` stays green (FR59, NFR17)

## Epic 15: Model Skins

Authors dress the skipper: full-body `.glb` replacement posed through the 17-joint contract the 8.4 spike proved, texture caps enforced at load, the Blender template as an importable contract, console verdicts for authors and total silence for players. Independent of the saga timeline — lands alongside any epic.

**FRs covered:** FR61 · **NFRs:** NFR22

### Story 15.1: The puppet wired — lazy GLTFLoader and the bind

As a mod author whose contract-bound `.glb` already binds in the spike,
I want it to equip and move in the shipped game exactly like the skipper,
So that the 8.4 proof becomes playable expression with zero engine code touched.

**Acceptance Criteria:**

**Given** a model skin equipped through the boot lane (`mods/models/*.glb`, arriving shell-side as data — the 8.2/8.3 URL-param mechanism, unchanged)
**When** the renderer loads it
**Then** `GLTFLoader` is imported lazily from the pinned specifier (the same importmap pin; zero new dependencies, `index.html` byte-zero) — a nothing-equipped boot fetches neither loader nor model and holds the load-to-first-jump budget (FR61, NFR14, NFR3)

**Given** a bound model
**When** bind completes
**Then** the 17-name joint contract — `torso`, `head`, `cap`, `eyeL`, `eyeR`, `scarf0`–`scarf2`, `armL`, `armR`, `legL`, `legR`, `chest`, `chestL`, `chestR`, `handleL`, `handleR` — is verified at bind by the spike's bijection law: exact name-set equality, pairwise-distinct targets, `unbound` empty for a conformant model; a missing or extra name lands in `unbound` (or drops, scarf chain beyond three, `chestL/chestR` under jiggle-off — 15/17 is a legal bind), never a thrown error (FR61, NFR16)

**Given** a bound skin in play
**When** the phase-clock pipeline poses
**Then** every posed channel of the bound model is `===` the shipped skipper's channel at the same phase — the rigid identity bind, zero tolerance, carried from spike legs to product legs; the phase clock stays the only clock and the rope grammar is untouched (FR61, FR40, NFR8)

**Given** the sim graph after this change
**When** `tests/boundary.test.js` runs
**Then** the fence is byte-identical and green, no new file joins the sim graph, and the story's product delta is confined to the `render3d.js` lazy skin loader plus the shell boot path — ZERO delta in `game/day/life/world/station/rope/player/upgrades/areas/interpolate` (FR61)

**Given** a default boot with nothing equipped
**When** the 8.5 witness set runs
**Then** the byte-identical pin survives on the v3 baseline: materials census unchanged, zero extra network requests, `#hud` shape census unchanged, gate <10 s green (NFR14, NFR4, the 8.5 pattern)

**And** the equipped choice crosses persistence only as `life.wornSkin` inside `persist(gameState)` — no new storage key, and the nothing-persisted default of the equip lane stands (NFR19)

**And** the spike's contract legs are promoted into the product suite as a NEW file (the frozen `tests/glbspike.test.js` is byte-identical; the promoted legs are its successor); new legs in `tests/equip.test.js` cover bind, fall-off, and the nothing-equipped pin (NFR5)

### Story 15.2: Caps at load — verdicts for authors, silence for players

As a mod author testing a textured model's limits,
I want hard cap verdicts named in the console at load,
So that I learn in text instead of guessing why nothing changed on screen.

**Acceptance Criteria:**

**Given** a mod `.glb` with embedded textures
**When** it loads
**Then** three cap verdicts run at load — max texture dimension, max texture bytes, max texture count — each the single row of the cap table this story establishes; textures are nearest-sampled with mipmaps off; the row VALUES are recorded in this story's text beside the 8.4 probe evidence, never as test literals (seed-honesty; NFR22, NFR10 restated not repealed)

**Given** any cap failure, or a malformed model (parse failure, name-set mismatch, missing contract node)
**When** application would begin
**Then** it binds NOTHING: the default skipper renders, the player sees no delta, no error, no stall — total silence is the player-facing surface (FR61, NFR16, NFR22)

**Given** the author lane
**When** any model skin loads
**Then** verdicts land on the NFR16 diagnostics lane — bound/unbound joint list plus the three cap verdicts — loud for authors, silent for players; the console path exists only at the seam, pure modules stay console-free (NFR22, NFR16)

**Given** the shipped repo census
**When** the mods/mods-census legs run
**Then** the shipped product is proven zero-bitmap: default boot fetches no texture, the committed `mods/models/` exemplar is texture-free and inside every cap row (NFR22, NFR10)

**And** `mods/models/*.glb` cross the boundary as loaded assets with verdicts, `render3d.js` stays the sole `three` consumer, and the boundary fence is byte-identical (FR61, NFR4)

**And** new red-green legs in `tests/equip.test.js` cover each cap row's pass/fail pair and the malformed-binds-nothing law (NFR5)

### Story 15.3: The Blender template — the contract as a file, and the legibility floor

As a 3D artist,
I want an importable template that IS the joint contract,
So that names and origins come from the file, never from a typo.

**Acceptance Criteria:**

**Given** the shipped template (importable, Blender-native)
**When** it is imported
**Then** it is a named-empty hierarchy — the 17 contract names at the contract rest origins of the §Contract table: joint names and translations are never hand-authored (FR61, GDD §Asset Requirements)

**Given** a model built in the template and exported with Blender's built-in `.glb` exporter — zero converters, Blender-native only
**When** the export runs through the test lane
**Then** the round trip template → `.glb` → bind proves 17/17 bijection — the template is contract-tested like code, and any drift between template and contract table reddens the round-trip leg (FR61, NFR5)

**Given** an equipped model skin
**When** it renders on EACH of the five area palettes — `alley`, `rooftops`, `blimp`, `stratosphere`, `moon-approach`
**Then** the legibility floor holds per palette: the model never camouflages against the scene; witnesses run all five vistas, not just Alley (UX-DR3 inherited, FR61)

**And** this story's docs pass lands in the SAME commit (A5 rule): GDD §Asset Requirements gains the template link, and the architecture mapping table gains its census rows for the template and the cap table — NFR10's zero-bitmap disposition for the shipped product recorded unchanged (FR61, NFR22)

**And** new red-green test files ship the template round-trip and five-palette legibility legs; existing files stay byte-identical (NFR5)

## Epic 16: Balance & Prove

Nothing v3 claims stays unmeasured: the day-economy balance gate (day-length envelope, ceiling curves, hunter tick rate, bleed, offer cadence — the gate-bound numbers this design carries as first-pass), the replay-sweep determinism gate at scale, the success-metrics pass, and the docs cutover. Could not be skipped per project history.

**FRs covered:** verification legs across FR40–61 · **NFRs:** NFR17–NFR22 verification

### Story 16.1: Day-economy balance gate — the policy bot grows days

As the designer,
I want one deterministic number that says whether a life of days paces right,
So that every tuning debate about the saga ends with a measurement.

**Acceptance Criteria:**

**Given** the 6.1/7.5 policy bot extended over seeded multi-day lives — activity schedule, sleep policy, and a deliberate-failure heuristic from day ~3 (supercompensation requires the bot to schedule failure, not avoid it)
**When** the gate runs its seeded batch
**Then** it reports the day-length envelope: day-1 median against the ≈5 min design target and steady-state median against 10–15 min (GDD §Difficulty Curve calibration gate), plus per-stat ceiling-growth curves — days between raises and plateau shape (FR43, FR46, NFR9's method inherited)

**Given** the same batch
**When** rope days resolve inside the days
**Then** summit reach rate holds its (0.05, 0.20] band as the rope-day sub-metric — the v2 master-dial survives as an in-day read, unedited (NFR9, FR40)

**Given** the gate-bound rows the design carries as first-pass — VIT day-1 pool (100 SU), hot/cool drain (2/1 SU/beat), bleed (~15%), ceiling step (125%), offer cadence (20 beats; lifetime 400), hunter tick (~1/day), `RANK_WEIGHTS`, and the Interrupt day (~15–20)
**When** final values land
**Then** every row carries the swept value that holds the twin dials in band, each annotated with the gate result that derived it, and the numbers exist ONLY in story text and annotations — test legs read the rows, never literals (seed-honesty; FR45, FR46, FR48, FR53, FR54, FR55)

**Given** an out-of-band result
**When** the gate fails
**Then** the failure output is a tuning report — measured dials plus the row set that produced them — not just a red X (NFR4, the 6.1 pattern)

**And** the gate is deterministic under seeded rng, the full suite stays green in under 10 s, new red-green legs land in `tests/balance.test.js` (additive; prior legs untouched), and the boundary fence holds green (NFR4, NFR5)

### Story 16.2: Replay sweep at scale — shadows equal recorded reality

As the project itself,
I want shadow determinism proven at montage scale in the CI family,
So that "shadows never lie" is a measurement, not an assertion.

**Acceptance Criteria:**

**Given** an N-day seeded census (100 days, sized to the NFR18 save figure) in the `tests/replay-sweep.test.js` family
**When** the census runs
**Then** every recorded day replays bit-exact — `replaySegment(seg, step)` poses `===` the live-day poses at every sampled step — and cast/recast/retire shadow lifecycles plus the world tick replay identically from seed + inputs (FR57, NFR17)

**Given** the same census
**When** recording bytes are censused
**Then** the budget holds across all 100 days of `day.recordings[]`: ≤4 KB/day median, 8 KB/day hard, total ≤800 KB, with same-step coalescing proven as the only overflow policy — no keyframes anywhere (NFR18)

**Given** census days with posted shadows running
**When** playback advances
**Then** shadows are read-state inside the fixed step — playback fits the sim budget and no second simulation runs (NFR21, FR57)

**Given** the incoming baseline
**When** this prove story lands
**Then** `js/` and `tests/support/` are byte-identical — ZERO product code in the prove story (the 7.5/8.x pattern); any failure the census names is fixed by its owning epic's code, not patched here

**And** the census is deterministic under seeded rng and the full suite including the census stays green <10 s; the boundary fence is byte-identical (NFR4, NFR5)

### Story 16.3: Success metrics and the docs cutover

As the next contributor (including future-me),
I want every v3 claim measured and every planning doc describing the game that shipped,
So that v3 closes the way v1/v2 did — gate-proven and self-describing.

**Acceptance Criteria:**

**Given** the GDD §Success Metrics technical list
**When** the pass runs
**Then** each item is verified with evidence recorded: 60 FPS @ 240-line holds on a 2020-era integrated-GPU laptop with the gym full of shadows (human check + frame-timing capture) (NFR1, NFR21); full suite green <10 s with the boundary fence holding (NFR4); red-green legs present for every v3 mechanic (NFR5); load-to-first-jump <2 s with the mid-day persistence path adding no load cost (NFR3, NFR14); the reduced-motion audit covers every v3 cosmetic surface — sore-walk, shadow rendering, the dungeon palette/fog beat, the diary page-turn, chyron and rename lines — cosmetics damped, timing and judgment byte-identical (FR23, the 5.4 pattern extended to v3 states)

**Given** the GDD §Gameplay Metrics list, each tied to a pillar
**When** playtest legs are collected
**Then** recorded with evidence: the first-30-s smile (collected mid-v3, not at the end), the day landing as one stat sentence, failure sought not feared from day ~3, the first shadow earning the melancholy-comic reaction with corners curated deliberately, the Interrupt noticed unprompted, the hundred-day returners, and playtest day-length medians inside the 3.5–7 / 8–18 min acceptance bands around the ≈5 / 10–15 targets — every failing metric produces a logged follow-up item, never a hidden regression (the 6.4 pattern)

**Given** FR40–61 and NFR17–NFR22
**When** the verification census runs
**Then** each names its verification leg in the existing family — `balance`, `replay-sweep`, `migrate`, `compost`, `day`/`life`/`world`/`station`/`content`, `dungeon`, the equip/mods cap census — or records a written exception in this story's text (NFR17, NFR18, NFR19, NFR20, NFR21, NFR22; FR40–61)

**Given** the docs as v3-final
**When** the cutover lands in the SAME commit (A5 rule)
**Then** the GDD is marked v3-as-current (the §Development Epics "proposed sequence" ages out to as-built), the architecture mapping table passes its census — every v3 design term has its row per the same-change convention — epics.md records v3 stories as detailed, and the decision-log gains the v3 landed-decisions entry (A5)

**And** no metric is reported without evidence, and no number appears in a test that the gate did not derive (seed-honesty) (NFR4, NFR5)
