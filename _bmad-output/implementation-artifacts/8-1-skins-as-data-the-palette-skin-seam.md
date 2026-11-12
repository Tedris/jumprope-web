---
baseline_commit: ff1d97b88739c407cb53cc8fef496ad7037dd281
---
# Story 8.1: Skins as data — the palette-skin seam

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player who wants the skipper to look like mine,
I want the character's three shared material colors to be overridable data,
So that a recolor is a numbers change, not a code change — the first breath of the mod surface.

8.1 is Epic 8's first story and it ships the SEAM, not a surface: a skin record `{ name, colors: { rose, prop, limb } }` arrives through a shell-side boot seam and ONE application site recolors the three EXISTING shared character materials (`roseMat`/`limbMat`/`propMat`, js/render3d.js:187-189 — the FR37 census `render3d.js:185-316`, re-verified accurate: materials :187-189, last consumer `legRMesh` :316). Everything player-facing rides later stories: the equip mechanism P2 is a named kickoff decision AT Story 8.2 (epics.md:1196, sprint-status :117) and the manifest schema P1 at Story 8.3 (epics.md:1226, sprint-status :118) — this story carries NO open decision and needs none. The ship is INERT against the default (the 7.3 pattern, sprint-status :109 "byte-identical by diff fact"): with no skin supplied, every one of the 606 frozen legs passes UNTOUCHED and that untouched-green IS the AC1 proof (doctrine + FR37's regression pin, epics.md:91/:1170-1172). The A2 re-contract pre-scan (epics.md:1156 rider, retro :57-59) is re-affirmed with exact legs in the Dev Agent Instructions below — **zero re-contracts are authorized; every leg is expected GREEN.**

## Acceptance Criteria

1. **No-skin boot = shipped defaults.** Given a fresh boot with no skin supplied, when the renderer builds and a run plays, then the rose/prop/limb materials carry the shipped default colors (`ROSE 0xc94f6d` :16, `PROP 0x1d2630` :17, limb `FLOOR 0x3a4a42` :15) and every render leg is byte-identical to the Epic 7 ship state — the untouched frozen suite IS the proof (FR37, doctrine "untouched-green IS the proof"). [epics.md:1170-1172]
2. **Skin record through the boot seam, ONE application site.** Given a skin record `{ name, colors: { rose, prop, limb } }` delivered through a shell-side seam at boot, when rendering runs, then the three shared materials carry the skin's colors — applied at ONE application site (the one-seam law), as `Color#set` writes on the EXISTING shared materials; no new material construction, no geometry change, and the vertex-snap/sRGB-Bayer/flat-shading path is untouched (FR37, riders (c)/(d)). [epics.md:1174-1176]
3. **Partial records are data.** Given a partial skin record (one or two colors missing), when it is applied, then missing colors fall back to shipped defaults, no thrown error — invalid states are data (NFR16). [epics.md:1178-1180]
4. **i-frame dim identical under any skin.** And the i-frame dim (`GHOST_DIM` over the body materials, render3d.js:42/:544-549) behaves identically under any skin — i-frames juice reads unchanged (rider (e); protected behavior). [epics.md:1182]
5. **Seam-only, ships INERT.** And no player-facing equip UI ships in this story: the record arrives via the seam (boot-time parameter/test injection) — the surface is Story 8.2's. The story ships INERT against the default (the 7.3 pattern), with the A2 pre-scan re-affirmed in its dev authorization naming exact legs from riders (a)-(f). [epics.md:1184]
6. **Factory contract test + legibility witness.** And a Node-side contract test for the skin-record factory ships in the same change (factory-convention rule, architecture.md:154-156), and a legibility witness samples three skin-vs-vista checks that Story 8.5 extends to all five palettes (UX-DR3 seed, epics.md:157). [epics.md:1186]

### Decided notes (pinned design decisions — AUTHORIZED by this file; dev implements, does not re-litigate)

1. **D1 — the application site is the boot-time loop form, directly after material creation. A literal second `roseMat.color.set(` line is FORBIDDEN.** In `createScene`, after `roseMat`/`limbMat`/`propMat` are built (render3d.js:187-189):
   `const skinColors = skin?.colors ?? {};` then
   `for (const [m, key, dflt] of [[roseMat, 'rose', ROSE], [limbMat, 'limb', FLOOR], [propMat, 'prop', PROP]]) { m.color.set(skinColors[key] ?? dflt); }`
   This is AC2 verbatim — ONE site, `Color#set` on EXISTING materials, construction untouched (the `worldMaterial()` pipeline :175-178 — MeshLambertMaterial flatShading + `applyVertexSnap` — stays byte-identical, so the snap/sRGB-Bayer path is structurally untouched). It is also textually invisible to the **source census at tests/iframesjuice.test.js:554-557**, which pins `roseMat.color.set(` and `limbMat.color.set(` EXACTLY once each in the module (the body-material single-writer law): a literal added `roseMat.color.set(skin.rose);` line turns that census RED, and **this story does NOT authorize re-contracting it** — the loop form is therefore the only authorized shape. On a default boot the loop writes same-value (`ROSE ?? default`) before ANY delta baseline any leg takes (all write censuses are delta-based — ceilingbreak :448-468/:479-509, iframesjuice :449-476), so every census stays honest-but-green.
2. **D2 — the i-frame OFF-edge restore arms read skin-bound base values, bound once at createScene entry.** `const roseBase = skinColors.rose ?? ROSE;` / `const limbBase = skinColors.limb ?? FLOOR;` at entry (after D1's `skinColors` bind); the edge-gated dim block (:544-549, `if (iBlank !== lastIBlank)` — not per-frame) restores `roseBase`/`limbBase` instead of the hardcoded `ROSE`/`FLOOR` on :547-548. ON arm stays `GHOST_DIM` verbatim; `ghostMat.opacity` writes (:546) untouched; propMat never dims ("the two body materials", :42 comment — AC4's wording matches the law). Inert boot: `roseBase === ROSE`, `limbBase === FLOOR` — the frozen dim legs pass byte-identically; under a skin, AC4 holds because the restore is parameterized, not because the dim changed.
3. **D3 — the record, the normalizer, and the seam.** Record shape `{ name, colors: { rose, prop, limb } }`. Normalization is a PURE factory `normalizeSkin(raw)`: shape-sanitize only — non-object `raw`/`raw.colors` → all keys ABSENT (application then falls to defaults); each of `rose`/`prop`/`limb` kept ONLY when `Number.isInteger` (else dropped); `name` → `String(raw?.name ?? '')`; zero browser IO anywhere in it (or boundary.test.js:103-109 reddens). Recommended landing: a NEW pure `js/skins.js` (the `lockedIdsFor` precedent — pure factory, single shell consumption, Node-tested directly); alternative: the function inside js/shell.js. The normalizer is consumed at exactly ONE shell boot site: js/shell.js:62 becomes `createScene(canvas, normalizeSkin(<source>))` — and `<source>` is the literal `undefined` in this story (the INERT ship; Story 8.2's P2 mechanism replaces the source expression only, at that one site). render3d gains a trailing optional param: `createScene(canvas, skin)` (a normalized record or undefined — plain DATA in, no import of the factory; the two-specifier law stands — see the Dev Agent Instructions). Every existing one-arg call site stays valid; the `{ render }` return (render3d.js:711, pinned render3d.test.js:104-112) is untouched.
4. **D4 — the legibility witness samples 3 of the 5 VISTAS; default recommendation alley (:74-77) / stratosphere (:85-87) / moon-approach (:88-90).** Those are the three most camouflage-prone grounds (the shipped five-color alley stage, the thin pale cloud shelves, the light moon floor). Dev may re-pick the sample at dev time (the AC requires three; 8.5 extends to all five). Witness law: for each sampled tier, boot the recording-stub scene WITH the story's sample skin applied and drive one render at that tier; then for BOTH `rose` and `limb` skin colors, every RGB channel must differ from BOTH the active tier's slab material hex AND the live scene background hex by **≥ 0x40**. Numbers live HERE, never in test tables (architecture.md:151-153); colors are READ from the booted scene, not inlined. Worked sample skin (dev may substitute, law must still pass): `{ name: 'mint', colors: { rose: 0x7ce38b, prop: 0x10151f, limb: 0x9aa4b2 } }` — rose/limb vs the three sampled stages clears 0x40 per channel on every pair (prop is the silhouette part — dark by design — and is EXCLUDED from the witness, mirroring "the jumper pops against the moody stage", :16).
5. **D5 — ships INERT: no equip UI, no persistence, no new storage keys, no new materials/geometry/imports.** The whole authorized product diff: render3d.js (signature + entry binds + application loop + restore arms), shell.js (one import + the :62 arg), js/skins.js (new pure factory, if that landing is taken), tests/skins.test.js (new suite). Zero #hud children, zero DOM/CSS, zero key bindings, zero storage touches — the untouched frozen suite IS the AC1/AC5 proof; the §6 diff census + copy/HUD/key censuses (rider (f)) stay untouched-green by diff fact.
6. **D6 — never delete or rename the look constants.** `ROSE`/`PROP`/`FLOOR`/`SKY`/`PALE`/`GHOST_DIM` stay `const X = 0x…` literals in js/render3d.js — several frozen legs regex-pin the constant-literal law and address materials BY shipped const (areavistas.test.js:161-164/:203/:238/:254/:373, ceilingbreak.test.js:35/:48-51, reducedmotion.test.js:556-560 via `shippedConst()`). The shipped defaults ARE the application loop's fallbacks (D1); deleting a constant fails those `assert.ok` regex pins. Do not "centralize" the hexes.

**Questions:** none outstanding — P2/P1 are dispatched to 8.2/8.3 kickoff (sprint-status :117-:118), the one real design fork (application-site shape) is resolved by D1 as a written authorization, and the contradiction scan found zero questions (probe verdict, local://probe81-analysis.md).

## Dev Agent Instructions — Dev AUTHORIZATION (A2 re-contract pre-scan, RE-AFFIRMED per epics.md:1156 + retro :57-59)

Pre-scan re-affirmed at create time against HEAD bddbd7f (full table: local://probe81-analysis.md). **This story authorizes ZERO re-contracts: every leg below must pass UNTOUCHED; a red leg is a bug in the dev change set, not a contract change — STOP-AND-ASK beats a silent census edit.**

- **(a) Storage-key census — tests/pausemenu.test.js L2, :431-432** (`jumprope-audio` + `jumprope-best` + `jumprope-meta` EXACTLY): GREEN — this story ships no persistence, no fourth key (the retro :58 STOP-AND-ASK tripwire stays armed).
- **(b) setItem write-site censuses — tests/metalegger.test.js :109-138 (readdir idiom, key-namespace + run-record legs) and tests/reducedmotion.test.js L10(a) :649-652 (three-write-surface census):** GREEN — zero new setItem sites; js/skins.js carries no `setItem(` token (the metalegger census scans EVERY js/ file via readdir — a pure module passes trivially, an IO-bearing one dies here too).
- **Boot-site fence — tests/metalegger.test.js :56-59** (EXACTLY one `loadMeta(localStorage)` in shell.js, within ≤400 chars AFTER `loadBest(localStorage);` in the boot region): GREEN by construction — this story adds NO storage read at boot (the source expression is `undefined`, D3). **Placement rule for any shell boot-region insert: at or after shell.js:157 (`let meta = loadMeta(localStorage);`); inserting anything between :151 and :157 risks growing the regex window past 400 chars and reddens the fence.**
- **(c) Material censuses — tests/areavistas.test.js §2 :265-294** (every rig/particle material `color.hex === birthHex` across the 1..5 tour; ghost mats birth-static :275-277; no slab/rig material sharing :292) — GREEN on all frozen boots (skin application exists ONLY inside the new suite's skin-booted worlds; frozen boots never pass a record). Note for the NEW legs: on a skinned boot `birthHex` is still the construction constant (the seam writes AFTER construction), live skin lives in `color.hex` — address materials by scene-graph/registration identity, not by birthHex (see Testing guidance). **tests/ceilingbreak.test.js :291-294 (rope-write Color#set wrap), :448-468 (EXACTLY-four writes per area edge), :479-509 (EXACTLY-five i-frame edge writes, zero impulse writes):** GREEN — delta baselines are taken after createScene, so the boot application writes precede every census; character mats are not touched by the edge legs.
- **(d) Snap-uniform legs — tests/render3d.test.js :156-164 and tests/areavistas.test.js :477-486** (the shared snap uniform rides EVERY world material): GREEN — no new material construction is the whole point; a new material or a constructor arg change dies here.
- **(e) i-frame juice legs — tests/iframesjuice.test.js :418-442 (dim table), :449-476 (ON-edge exactly-two writes), :482-500 (OFF-edge restores construction hex); tests/reducedmotion.test.js L4 :419-442 and L5b :477-500:** GREEN — every frozen boot is the one-arg `createScene(canvas)`, so D2's parameterized restore equals `ROSE`/`FLOOR` inertly. **The shape-pinned leg — tests/iframesjuice.test.js:554-557 — pins `roseMat.color.set(` and `limbMat.color.set(` EXACTLY once each in js/render3d.js (body-material single-writer law). The riders' (e) text does not name this census; the loop form (D1) is the ONLY shape that keeps it GREEN, and re-contracting it is NOT authorized by this story.**
- **Look-constants source pins** (the `shippedConst()` source-parsing harness: iframesjuice.test.js:436-437/:457/:472/:488-489, reducedmotion.test.js:420-423, plus the constant-literal law legs areavistas.test.js:161-164/:203/:238/:254/:373, ceilingbreak.test.js:35/:48-51, reducedmotion.test.js:556-560): GREEN — D6 keeps the constants exactly as they are.
- **Imports census — tests/ceilingbreak.test.js §6 :520-535** (render3d.js imports EXACTLY {three, ./interpolate.js}; twin leg iframesjuice.test.js:549-551 + render3d.test.js:10-15 two-specifier data-URL boots): GREEN — **the normalizer is NEVER imported by render3d.js**; the record arrives as a plain DATA argument. A third import specifier kills the frozen data-URL boots.
- **createScene call sites** (single-arg validity under the optional trailing param): areavistas.test.js:115, ceilingbreak.test.js:287, ghostspread.test.js:110, iframesjuice.test.js:135, reducedmotion.test.js:153, juice.test.js:341, render3d.test.js:103/:110/:117/:137, plus ~15 stub `createScene()` definitions across the harnesses — all stay valid untouched; `{ render }` return contract pinned at render3d.test.js:104-112.
- **Purity rider — tests/boundary.test.js byte-identical, its :103-109 browser-IO-outside-shell leg:** GREEN — zero fetch/parse/eval/storage enters render3d.js or the sim graph; the seam read and normalization live shell-side only (epics.md:1159 rider; js/skins.js is browser-IO-free).
- **(f) Copy/HUD/key censuses** (ascent.test.js:347, winloss.test.js:235 copy prefixes; ropehud.test.js:166-179 + pausemenu.test.js:303-310 `#hud` children; pausemenu L5 zero-new-bindings): GREEN — the story touches no copy, no DOM, no bindings.
- **Diff-census twins — ceilingbreak.test.js :572 allow-set (BASE `5659fd4`, porcelain arm :569-571) + summitapproach.test.js :862 allow-set (BASE `2c3e693`, porcelain arm :859-861):** the mechanical C1 append rule — **story artifact** `_bmad-output/implementation-artifacts/8-1-skins-as-data-the-palette-skin-seam.md` was appended at the CREATE round (the porcelain arm catches untracked files at create time — same rule c38070e/7.1-7.5 used, list-only); the **dev round appends the new test file(s) (`tests/skins.test.js`) and any new js/ file (`js/skins.js`)** to BOTH twins with the same list-only comment ("authorized by the story doc, tripwire stays armed, authorizes nothing else"). `js/shell.js`, `js/render3d.js`, `sprint-status.yaml`, `deferred-work.md` are already members.
- **Seed honesty / band gate riders:** NOT TRIGGERED — no batch-driven leg, no deal/physics touch.

## Re-contract authorizations (written here, per the frozen-test discipline — AGENTS.md:52)

**Exactly ZERO existing test legs are re-authorized.** Every test file in the repo stays BYTE-IDENTICAL (the two §6 allow-set appends are list-only bookkeeping, not re-contracts). If any frozen leg reddens, the change set is wrong — re-read D1/D2/D3 and fix the change, do not edit the leg.

## Tasks / Subtasks

- [x] Task 1 — render3d.js: the seam on the renderer side (AC: 1, 2, 3, 4; D1/D2/D6)
  - [x] `export function createScene(canvas, skin)` — trailing optional param, record-as-DATA, no import added (two-specifier law).
  - [x] Entry binds after :189: `const skinColors = skin?.colors ?? {};` + `roseBase`/`limbBase` (D2); application loop (D1) directly after the three `worldMaterial(...)` lines — nothing before/around :187-189 changes. NOTE (dev): the loop is wrapped in `if (skin?.colors)` — the unconditional form crashes the frozen bare-`Color`-stub boots (render3d.test.js:55, juice.test.js:300 — their Color carries no `.set`); the guard keeps the loop form, the ONE site, and the single-writer census, and makes the no-skin boot fully write-free (the 7.3 inert pattern). See Debug Log.
  - [x] Dim-block restore arms :547-548 → `roseBase`/`limbBase`; ON arms + `ghostMat.opacity` + the `lastIBlank` edge gate byte-identical.
  - [x] Diff facts: constants :14-18/:42 untouched; `worldMaterial` :175-178 untouched; floor :191, horizon :203-213, ghosts, rope untouched; no `new THREE.*Material` anywhere new; comment lines naming FR37/FR39-seam + the one-seam law.
- [x] Task 2 — js/skins.js + shell.js: the seam on the shell side (AC: 2, 3, 5; D3)
  - [x] NEW `js/skins.js`: `export function normalizeSkin(raw)` — pure, D3's sanitization law exactly, one comment naming NFR16 + "invalid states are data"; zero DOM/`localStorage`/`fetch`/`import` tokens. LANDED AT THE D3 ALTERNATIVE instead: the factory is shell-internal (js/shell.js) — the recommended landing's fifth static specifier reddens the frozen shell-specifier census tests/summitapproach.test.js:831-832 (zero re-contracts authorized); see Debug Log. The purity law holds verbatim (leg §f).
  - [x] `js/shell.js:62`: `const scene = createScene(canvas, normalizeSkin(undefined));` — the ONE boot consumption site, comment naming the INERT source + "Story 8.2's P2 mechanism replaces the source expression at this site"; extend the import line :1 pattern (moot at the shell-internal landing — no import added). NO storage read added (boot-fence placement rule).
  - [x] `tests/boundary.test.js` untouched-green (proof obligation, not an edit).
- [x] Task 3 — new suite `tests/skins.test.js` (AC: all; see Testing guidance) — legs (a)-(g). (13 legs, §a-§g.)
- [x] Task 4 — bookkeeping + gate (AC: 5, 6)
  - [x] C1 (dev round): append `'tests/skins.test.js'` (and `'js/skins.js'` if it lands — it did not) to BOTH §6 allow-sets, list-only comment (ceilingbreak after the 8.1 create-round entry, summitapproach likewise).
  - [x] `./run_tests.sh` green (baseline **606/606 @ bddbd7f**, ~8.6 s; expect 606 + the skins legs, NFR4 < 10 s). → **619/619 @ 8.5 s**.
  - [x] Diff-fact audit in the Debug Log (the 7.3 pattern): `git diff --stat` shows exactly the D5 file set.
  - [x] Dev round stamps `review`; final gate re-run; sprint-status per house style.

## Testing guidance — tests/skins.test.js

Donor: the recording-stub three-world boot in `tests/areavistas.test.js:29-121` (data-URL Three stub: `Color` records `{ hex, birth }`, every `.set()` increments `reg.colorSets`, materials register in construction order). **Under skinned boots, address the three character materials by scene-graph identity — `roseMat`/`limbMat`/`propMat` are the FIRST THREE materials constructed (:187-189) and thus `reg.materials[0..2]` — not by birthHex: with D1's set-after-construction seam, `birthHex` stays the shipped constant even when the live `hex` carries the skin** (the frozen `shippedConst`-keyed legs only ever run default boots). Take delta baselines AFTER boot — the application loop writes each material's Color once at createScene time.

- (a) **Factory contract, Node-side, same change** (architecture.md:154-156; donor tests/locks.test.js's direct-import style): `normalizeSkin` full record passes through; partial records keep present colors and DROP missing keys (never fabricate); hostile inputs (`null`, `'x'`, `42`, `[]`, `colors: 'red'`, `colors: { rose: '0xff0000' }` string) → `{ name, colors: {} }` shape-pinned, nothing thrown; `name` coerced to string; the record shape law `{ name, colors: { rose, prop, limb } }` asserted on the full-record return.
- (b) **AC2 boot-seam application**: skinned stub boot with all three colors → identity-addressed materials carry the skin hexes; `reg.materials.length` EQUALS the default boot's (no new material construction); the snap-uniform probe (render3d.test.js:156-164 form) passes on the skinned scene.
- (c) **AC3 partial**: boot with only `{ rose }` set → rose = skin, limb/prop = `FLOOR`/`PROP` constants (read via the `shippedConst` source-parse donor form); no throw; exactly one boot delta of THREE `colorSets` (the loop's three writes — the one-application-site witness).
- (d) **AC1 inert tripwire**: default `createScene(canvas)` → the three hexes are the three shipped constants (story-shape tripwire; the frozen 606 remain the real proof).
- (e) **AC4 dim-under-skin**: skinned boot; drive the `view.run.iFrames` payload false→true→false (iframesjuice :418-500 donor craft): ON edge — rose/limb hex = `GHOST_DIM`, exactly-two writes; OFF edge — hex = the SKIN's rose/limb (NOT `ROSE`/`FLOOR`), ghost opacity pair unchanged. The falsifier for forgetting D2.
- (f) **AC5 inert-ship censuses**: `js/skins.js` source holds no `localStorage`/`fetch`/`eval`/`import` tokens; shell.js still matches `loadMeta(localStorage)` EXACTLY once (metalegger :56-59 re-affirmance); render3d.js `worldMaterial(` count unchanged vs a source-regex count of 9 constructors (:187-189, :191, :205 + the three listed in the frozen probes — dev takes the shipped count from HEAD, records it in the leg comment).
- (g) **AC6 legibility witness** (D4 law, numbers here): for the three sampled tiers (default alley/stratosphere/moon), boot WITH the sample skin, render one frame at the tier, read active slab material hex + live scene background hex from the booted scene, assert every RGB channel of the skin's `rose` AND `limb` differs from BOTH by ≥ 0x40.

## Dev Notes

### Current state (verified 2026-11-12 @ bddbd7f, gate 606/606)

- `js/render3d.js`: constants `FLOOR 0x3a4a42` :15, `ROSE 0xc94f6d` :16, `PROP 0x1d2630` :17, `SKY` :14, `PALE` :18, `GHOST_DIM 0x5a5a66` :42; `LOOK_KNOBS` URL-read precedent :52-59 (browser-guarded — this story adds NOTHING like it; the seam is shell-side per AC2); `VISTAS` :73-91 (alley/rooftops/blimp/stratosphere/moon-approach); `createScene(canvas)` :150, `worldMaterial(color)` :175-178 (the protected path), the three materials :187-189, floor :191, horizon tier mats :205, i-frame dim block :544-549, `return { render }` :711. Shared-instance consumers (recolor propagates for free): rose = torso :236, head :244, scarf :265, jiggle props :299/:302; limb = arms :277/:284, legs :310/:316; prop = cap :247, eyes :251/:254, rope handles :351/:354. NOT skinnable: the floor mesh's own material (:191, shares only the FLOOR *value*) and the vista slab tier materials (:205).
- `js/shell.js`: the single `createScene(canvas)` call :62; boot region `loadBest(localStorage)` :151 / `loadMeta(localStorage)` :157 (fence metalegger :56-59 — placement rule in the authorization); imports :1.
- §6 census append points (create round, THIS commit): `tests/ceilingbreak.test.js` — after the epic-7-retro entry :753, set closes :754 (BASE `5659fd4` :550, porcelain arm :569-571); `tests/summitapproach.test.js` — after :1043, closes :1044 (BASE `2c3e693` :836). Both censuses run `git status --porcelain`, so the new story file goes red at create time — hence this commit's appends. Already members (no dev-round appends needed for them): js/shell.js, js/render3d.js, sprint-status.yaml, deferred-work.md.
- Gate: **606/606 @ bddbd7f** (unchanged since 7.5's review; js/ byte-zero since then — the epic-7 close ledger rows).

### Pitfalls

- **The one forbidden edit shape (D1):** a literal second `roseMat.color.set(`/`limbMat.color.set(` line = RED at iframesjuice:554-557 with no authorized re-contract — the loop form is mandatory, not stylistic.
- **Boot-region placement (metalegger :56-59):** nothing inserted between shell.js:151 and :157 may grow the `loadBest→loadMeta` window past 400 regex chars; consumption sits at :62, which is BEFORE the boot loads — that is fine (the fence regexes the boot region only), but do not add any second `loadMeta(localStorage)`-shaped call anywhere in shell.js.
- **Never import js/skins.js from render3d.js** — the two-specifier census (ceilingbreak §6 :520-535, iframesjuice :549-551) and the data-URL boots die. render3d receives a DATA argument.
- **Normalizer purity:** any browser IO in js/skins.js reddens boundary.test.js:103-109 AND the metalegger readdir census (:113 scans EVERY js/ file).
- **Hardcoded restore arms** (`... : ROSE` / `: FLOOR` left on :547-548) = AC4 dead after the first trip under a skin — leg (e) is the falsifier.
- **BirthHex-keyed assertions in the new suite** silently pass on inert boots and lie on skinned ones (birth stays the construction constant under D1) — identity-address per the Testing guidance.
- **"Equip while you're at it"** — no URL read, no storage, no DOM surface: pausemenu L2 :431-432 + both setItem censuses redden, and a fourth `jumprope-*` key is the retro :58 STOP-AND-ASK tripwire, not a dev decision.
- **New material construction or constructor changes** die at the snap-uniform legs (rider (d)) — the seam writes colors, never builds materials.
- **Re-clocking / timers** on the application path: none; the seam is createScene-time only (NFR8).
- feelcap AUD-02 scans js/ comments for the `audio.js` token (7.1's red iteration) — phrase new comments without it.

### Precedents to follow

- 7.3's INERT ship ("ships INERT … byte-identical by diff fact", sprint-status :109) and its untouched-green proof obligations (7.1 D3 / 7.2 D4 pattern).
- `lockedIdsFor` (js/upgrades.js): pure factory, single shell consumption, Node-side contract test (tests/locks.test.js) — D3's shape donor.
- The create-round census appends (7.1-7.5 wording blocks) — list-only, tripwires stay armed, authorizes nothing else.
- areavistas.test.js :29-121 recording stub for Color-write observation; render3d.test.js :156-164 for the snap-uniform probe.

### AC → test mapping

- AC1 → the frozen 606 untouched (the proof) + skins leg (d) tripwire + leg (f) censuses.
- AC2 → legs (b) + (c) (three-writes-at-one-site witness) + untouched (c)/(d)/(e)-censuses.
- AC3 → legs (a) + (c).
- AC4 → frozen iframesjuice/reducedmotion dim legs untouched-green + leg (e).
- AC5 → the authorization census list (untouched-green) + leg (f) + diff facts (Task 4).
- AC6 → leg (a) (factory contract, same change) + leg (g) (legibility witness, 3 tiers).

### Project Structure Notes

- New files (dev round): `js/skins.js`, `tests/skins.test.js`. Modified (dev round): `js/render3d.js`, `js/shell.js`, the two §6 allow-sets. Create commit: this file, `sprint-status.yaml`, `tests/ceilingbreak.test.js` + `tests/summitapproach.test.js` (list-only appends). No path convention conflicts.

### References

- epics.md: Story 8.1 :1162-1186 (BDD source of truth); Epic 8 riders :1155-1160 (A2 (a)-(f), purity, S3); FR37 :91 (three-material census + regression pin); FR36 :90 / FR39 :93 (P1/P2 ride 8.3/8.2); NFR16 :112; UX-DR3 :157; S3 rider :1160 (nothing spawns a second character — true by diff fact here).
- architecture.md: :151-153 (frozen-test discipline), :154-156 (factory contract rule), The One Rule / purity + §Persistence (sim purity; storage degrades as data — the NFR16 sibling pattern).
- epic-7-retro-2026-11-11.md :57-59 (A2 convention + Epic 8 riders).
- Probe: `local://probe81-analysis.md` (AC checkability table, A2 pre-scan full table, context digest, zero-questions verdict — all key rows spot-verified against bddbd7f).
- Code/harness: render3d.js/shell.js lines above; areavistas.test.js :29-121/:161-164/:265-294/:477-486; iframesjuice.test.js :418-500/:545-558; metalegger.test.js :52-60/:109-138; pausemenu.test.js :431-432; reducedmotion.test.js :419-442/:477-500/:649-652; ceilingbreak.test.js :291-294/:448-468/:479-509/:520-535/:546-757; summitapproach.test.js :836-1047; boundary.test.js :103-109; render3d.test.js :103-137/:156-164.
- Sibling stories: 7.3 (INERT pattern), 7.1 (factory + shape pins), 4.3 (VISTAS), 5.3 (i-frame law).

### Deferred items (not this story)

- **P2 equip mechanism** — rides Story 8.2 kickoff (epics.md:1196, sprint-status :117). **P1 manifest schema** — rides 8.3 (epics.md:1226, :118). Both already owned; this story records no new deferral. The legibility witness's other two tiers (rooftops, blimp) ride Story 8.5's all-five extension by the AC's own wording (epics.md:1186).

## Dev Agent Record

### Agent Model Used

lane-qwen38-ultra/qwen (omp worker Dev81)

### Debug Log References

- Baseline: `ff1d97b` (gate 606/606, tree clean); dev start recorded in frontmatter `baseline_commit`.
- **Red iteration #1 (13 reds, fixed in-code, zero test edits):** the D1 loop as literally written runs `m.color.set(...)` unconditionally at createScene time — the frozen bare-`Color`-stub boots (render3d.test.js:55, juice.test.js:300: `export class Color { constructor() {} }`, no `.set` method) died with `Cannot read properties of undefined (reading 'set')` (9 render3d.test.js + 4 juice.test.js legs). Fix: the loop is wrapped in `if (skin?.colors)` — still the D1 loop form, still ONE application site, the iframesjuice:554-557 single-writer census untouched (`roseMat.color.set(`/`limbMat.color.set(` = 1 each), and a no-skin boot now takes ZERO color writes (strictly more inert than the story's same-value-write assumption; the 7.3 byte-inert pattern). Post-fix: **606/606 untouched-green** with the product seam in place, @ 8.5 s.
- **Landing decision (D3 alternative, forced by a frozen leg the A2 pre-scan did not name):** tests/summitapproach.test.js:831-832 pins js/shell.js at EXACTLY four `'./'` from-specifiers; `import { normalizeSkin } from './skins.js';` makes five and reddens that leg — and this story authorizes ZERO re-contracts. D3's written alternative ("the function inside js/shell.js") lands every frozen leg green, so the factory is shell-internal and **js/skins.js does NOT ship**. The factory-contract legs extract the shipped function text from shell.js cross-source (the markerHeal pairing-fence idiom, areavistas.test.js:179-184); purity, the boot-fence, and the ONE-consumption-site censuses all run against shell.js source (legs §f).
- Census interactions: the new suite joins BOTH §6 diff-census allow-sets (dev-round list-only appends: ceilingbreak.test.js after the 8.1 create-round entry, summitapproach.test.js likewise). No other test file touched.
- `worldMaterial(` shipped source count taken from HEAD: **7** (definition + 5 constructor calls + 1 comment mention) — pinned in leg §f.
- New suite: 13 legs (§a factory x4, §b x2, §c x1, §d x1, §e x1, §f x3, §g x1); final gate **619/619 @ 8.5 s** (606 baseline + 13; NFR4 < 10 s holds).
- Diff-fact audit (`git diff --stat` before commit): js/render3d.js +24/−3, js/shell.js +20/−1, the two §6 allow-sets +4/+4, new tests/skins.test.js — exactly the D5 file set minus js/skins.js (D3 alternative landing, above).

### Completion Notes List

- Ships the SEAM, inert: `createScene(canvas, skin?)` applies a normalized `{ name, colors: { rose, prop, limb } }` record at ONE loop site over the EXISTING rose/limb/prop materials (Color#set, no construction); D2 binds `roseBase`/`limbBase` once at entry and the i-frame OFF-edge restores them — the dim legs stay byte-inert on default boots and the falsifier (leg §e) proves restore-under-skin reads the skin, not the constants.
- shell.js:62 consumes `normalizeSkin(undefined)` — the INERT placeholder; Story 8.2's P2 mechanism replaces only that source expression, at that one site.
- AC1/AC5 proof: the 606 frozen legs passed UNTOUCHED (zero test edits beyond the two authorized list-only allow-set appends); leg §d is the story-shape tripwire (default boot: shipped hexes, zero application writes).
- AC6: factory contract ships in the same change (leg §a, Node-side, architecture.md:154-156) and the 3-tier legibility witness (§g: alley/stratosphere/moon per D4, mint sample, >= 0x40 per channel vs slab AND background, colors READ from the booted scene) seeds UX-DR3; 8.5 extends to all five tiers.
- Deviations: (1) D3 landing = shell-internal alternative (census-forced, Debug Log); (2) D1's loop gained the `if (skin?.colors)` inert guard (bare-Color-stub crash fix, Debug Log). Shape laws of both decisions hold verbatim; ZERO re-contracts spent.

### File List

- js/render3d.js (modified — signature, skinColors/bases binds, guarded application loop, D2 restore arms)
- js/shell.js (modified — shell-internal normalizeSkin factory + the :62 boot-seam arg)
- tests/skins.test.js (new — 13 legs)
- tests/ceilingbreak.test.js (modified — §6 allow-set dev-round append, list-only)
- tests/summitapproach.test.js (modified — §4.3 allow-set dev-round append, list-only)
- _bmad-output/implementation-artifacts/8-1-skins-as-data-the-palette-skin-seam.md (this file)
- _bmad-output/implementation-artifacts/sprint-status.yaml (8-1 → review)

## Change Log

- 2026-11-12 (create round): story created from epics.md:1162-1186 + FR37 :91 / NFR16 :112 / UX-DR3 :157 + Epic 8 riders :1155-1160; the A2 re-contract pre-scan re-affirmed with exact legs — **zero authorized re-contracts, zero questions**; the application-site fork pinned by written authorization (D1 loop form — the iframesjuice:554-557 single-writer census stays armed-and-green, no re-contract); seam/normalizer/dim/inert decisions D2-D6. Ships INERT by design; seam-only (surface = 8.2). 0/0 tests delta (create only): **C1 census allow-append x2 SPENT IN THIS CREATE COMMIT** (story artifact into both §6 twins — mechanical list-only rule, precedent 6845157; the porcelain arms :569-571/:859-861 catch the new file at create time) + sprint-status (`8-1` ready-for-dev, `epic-8` in-progress). Gate stays 606/606.
- 2026-11-12 (dev round): implemented per D1-D6 — renderer seam (`createScene(canvas, skin?)` + ONE guarded application loop + D2 restore arms), shell-side `normalizeSkin` at the D3 ALTERNATIVE landing (shell-internal; the recommended js/skins.js import reddens the un-flagged frozen shell-specifier census summitapproach:831-832 — zero re-contracts authorized, so the story's own alternative was taken), new tests/skins.test.js 13 legs (§a-§g incl. the D2 falsifier and the 3-tier D4 legibility witness); the bare-Color-stub crash fixed by making the no-colors boot fully write-free. C1 dev-round allow-append x2 (tests/skins.test.js, list-only). Gate 606 → **619/619 @ 8.5 s**, every frozen leg untouched-green; status review.
