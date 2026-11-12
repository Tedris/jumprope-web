---
baseline_commit: f7ab750ede831b28c9c0626f66e94c3a6312d0f8
---
# Story 8.2: Equip without a menu — the no-chrome surface

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to equip a skin (and later, load mods) without any settings screen existing,
So that the game stays one interaction from play and the diorama stays chrome-free.

8.2 is Epic 8's surface story and its surface is **invisible**: decision P2 is ANSWERED (see AC1) and the equip mechanism is a **URL query param** — `?skin=<name>` on the page URL, read shell-side at boot against a tiny shipped built-in skin table, resolved through Story 8.1's seam. No files are fetched, no panel exists, no key is bound, nothing is persisted: the shipped boot with a bare URL is byte-identical to the 8.1 ship state, and the mechanism's whole product diff is a table, a pure resolver, and one guarded read inside `js/shell.js`. 8.1 shipped the seam inert (sprint-status :116); this story replaces ONLY the source expression at the boot site (js/shell.js:81, `createScene(canvas, normalizeSkin(undefined))` — the 8.1 story file's own hand-off: "Story 8.2's P2 mechanism replaces the source expression only, at this one site"). The no-chrome rules are the AC's law, not an aspiration: rider (f) censuses (ropehud/pausemenu #hud), the copy-prefix legs (winloss/ascent), and the zero-new-bindings fence (pausemenu L5) stay **untouched-green by diff fact** — this story adds no DOM, no CSS, no copy, no keys. Failure = silence (UX-DR2): unknown or garbage `?skin=` values play the shipped default and show NOTHING.

## Acceptance Criteria

1. **P2 decided and recorded — URL query param.** Given decision P2 (epics.md:1196 was OPEN at planning; ANSWERED by the user 2026-11-12, before implementation, per the D-006/Epic-7-S pattern), when this story started, then the choice is written with reasons, and every AC below reads against the chosen mechanism (FR39, P2). **The outcome: equip = the `?skin=<name>` URL query param, read SHELL-side at boot (`location.search` behind a `typeof location` guard, the LOOK_KNOBS shape at js/render3d.js:52-59 — but in shell.js, never in the render/sim graph, per the epics.md:1159 purity rider), resolved against the shipped SKINS table (D2); a miss is inert default + silence (NFR16/UX-DR2).** Reasons: (i) it is the only candidate needing **zero requests and zero bytes on the default path** — NFR14/AC2 hold by construction, while the `mods/index.json` candidate wants a boot-time fetch (or probe) and the key-cycle candidate burns the L5 zero-new-bindings fence for chrome-free gain it can't deliver; (ii) the guarded-URL read is a **proven idiom in this codebase** — LOOK_KNOBS (render3d.js:53) already boots inert under Node via exactly this guard; (iii) it satisfies UX-DR1 trivially — there is no surface to build; (iv) persistence falls out naturally NON-persisted: the URL *is* the choice, and the retro :58 fourth-`jumprope-*`-key STOP-AND-ASK tripwire stays armed and untouched. Recorded here and in `_bmad-output/planning-artifacts/prd.md` Open Items (the same create commit adds the row). [epics.md:1196-1198]

2. **Network shape unchanged.** Given the shipped game booting with nothing equipped/installed (no query param), when the page loads, then the network shape is unchanged from baseline — zero extra requests — and the load-to-first-jump budget holds (NFR14, NFR3). Proof obligation: **diff fact** — zero new `fetch`/script/import tokens, nothing fetched from the param value (it is a table key, never a path/URL), `index.html`/`css/` byte-zero; no test pins request counts (the audio-fetch legs in feelcap/ascentstinger are audio-scoped). [epics.md:1200-1202]

3. **Equip flows through 8.1's seam; zero chrome.** Given the chosen mechanism in use, when a palette skin is equipped (`?skin=mint`), then it flows through Story 8.1's seam (`normalizeSkin` → the `createScene(canvas, skin)` one application site — render3d.js is **byte-zero** this story); the surface adds NO panels, NO borders, NO `#hud` children (rider (f)), keeps the HUD center-axis stack byte-positioned, and any copy would land in the prompt slot ≤40 chars in the PS1 voice, scaled inside the letterbox path (FR39, UX-DR1, NFR7). **This story ships ZERO new copy (D6 — the silence law makes equipped-without-display the design, and the winloss full-equality legs :209/:223 enumerate why display is cheaper to refuse than to authorize).** [epics.md:1204-1206]

4. **Failure is silence.** Given a failed or absent equip (unknown name, empty `?skin=`, malformed search string, hostile value), when boot continues, then the game plays with shipped defaults and shows NOTHING — silence is the error surface, per the storage-unavailable pattern (UX-DR2, NFR16). No thrown error, no console surface, no prompt line. [epics.md:1208-1210]

5. **Zero new key bindings.** And the mechanism adds NO new key bindings — P2 chose the URL param, **so the AC's L5 re-contract clause (epics.md:1212, "unless P2 chose the key cycle") is MOOT and is NOT spent: pausemenu L5's zero-new-bindings fence (tests/pausemenu.test.js:536) stays untouched-green by diff fact.** No keydown token changes in js/. [epics.md:1212]

6. **Non-persistence, tripwire armed.** And equip does NOT persist — the URL is a per-load choice; there is no fourth `jumprope-*` key, no `setItem` site, no storage read. Persisting a choice is a **named decision requiring written STOP-AND-ASK, explicit non-meta naming, AND the pausemenu L2 storage-key census (tests/pausemenu.test.js:431-432) re-contract before any fourth key ships** (tripwires retro :58, riders (a)/(b)) — the pausemenu L2 census and both setItem censuses stay untouched-green by diff fact, and this story spends nothing on them. [epics.md:1214]

7. **Reduced motion holds vacuously — no equip cosmetic ships.** And `prefers-reduced-motion` dampens any equip cosmetic (FR23 pattern); this story ships **no cosmetic at all** — the skin is applied at createScene time, before the first frame, so there is nothing to damp — judgment and timing byte-identical, the reducedmotion suite untouched-green. If a future equip cosmetic ships, dampening becomes mandatory then. [epics.md:1216]

### Decided notes (pinned design decisions — AUTHORIZED by this file; dev implements, does not re-litigate)

1. **D1 — the P2 shape, pinned.** Mechanism = URL query param, param name `skin`, value = a KEY INTO the shipped SKINS table (D2), never a path, URL, or fetched resource (zero-request law, AC2; the 8.3 manifest story rides the same URL mechanism under the P1 decision). The read lives **shell-side only**: `js/shell.js` gains exactly one `location.search` read site, guarded; the sim graph and render3d.js stay byte-zero (epics.md:1159 — render3d receives DATA only; note the boundary leg's `BROWSER_IO_RE` at tests/boundary.test.js:13 does NOT include a `location` token — which is how render3d.js:53 LOOK_KNOBS passes — so shell-only placement is this story's law plus the new-suite ownership leg (§e), not a mechanical census outcome). The mod-file side of FR39 rides Story 8.3 (P1) — no manifest loading ships here.

2. **D2 — the SKINS table: shell.js module scope, seeded with the 8.1 witness.** `const SKINS = { mint: { name: 'mint', colors: { rose: 0x7ce38b, prop: 0x10151f, limb: 0x9aa4b2 } } };` — `mint` is Story 8.1's legibility-certified sample skin (tests/skins.test.js:170 `MINT`, the 8.1 story D4 colors; ≥0x40 per-channel vs slab AND background on alley/stratosphere/moon already certified). The mechanism thus has a LIVE witness (`?skin=mint` visibly recolors in a browser, no art decision needed) and the table is DATA (plain object literal; `normalizeSkin` builds a fresh sanitized record per boot, so the table can never be mutated through the seam — but see Pitfall: never pass a table record to `createScene` raw). Keys lowercase.

3. **D3 — the resolver: a PURE factory, shell-internal, zero new imports.** Next to `normalizeSkin` (js/shell.js:53-60, which stays byte-identical — the skins.test.js pairing fences :161-166/:319-324 keep it): `function resolveSkinParam(search, table)` — takes the raw search STRING (`''` = none), returns the matching table record or `undefined`. Shape: `const v = new URLSearchParams(search).get('skin'); if (typeof v !== 'string') return undefined; const k = v.toLowerCase(); return Object.hasOwn(table, k) ? table[k] : undefined;` — laws: case-insensitive against lowercase keys (`?skin=Mint` hits); `Object.hasOwn` (NOT `table[v]` — `?skin=constructor` must miss, Pitfall); empty/absent/unknown → `undefined`; NEVER throws, NEVER does IO (no `localStorage`/`fetch`/`eval`/`import`/`document`/`window`/`setItem` tokens — `URLSearchParams` is a pure global, present in Node and browser alike, precedent render3d.js:53). Landing is **inside shell.js** — the 8.1 D3 lesson applies verbatim: a fifth static specifier reddens the frozen four-specifier census tests/summitapproach.test.js:831-832, and this story authorizes ZERO re-contracts. `normalizeSkin(resolveSkinParam(...))` composes: a miss feeds `normalizeSkin(undefined)` → the exact 8.1 placeholder `{ name: '', colors: {} }` → the 8.1 key-count guard writes ZERO colors. Invalid states are data, end to end.

4. **D4 — the boot site: replace the source expression at js/shell.js:81, guard verbatim.** At the ONE existing consumption site: `const equipSearch = typeof location !== 'undefined' && location.search ? location.search : '';` then `const scene = createScene(canvas, normalizeSkin(resolveSkinParam(equipSearch, SKINS)));` — the guard shape is the LOOK_KNOBS idiom (render3d.js:53) so Node boots take `''` → resolver `undefined` → the byte-inert 8.1 composition: **every frozen boot in the 620 is bit-identical by construction.** The frozen prefix-regex at tests/skins.test.js:331-332 (`/createScene\(canvas, normalizeSkin\(/`, EXACTLY once) stays GREEN by construction — the replacement sits INSIDE the parens; the 8.1 §d "shipped boot composition" leg calls `normalizeSkin(undefined)` directly and stays GREEN (Node boots literally send it). Placement: :78-81 is ABOVE the boot-region loads (`loadBest` :170 / `loadMeta` :176) — nothing may land between :170 and :176 (metalegger :52-59 ≤400-char window, 8.1 authorization :47 rule, current line numbers re-verified at f7ab750), and the `loadMeta(localStorage)` count stays 1.

5. **D5 — garbage law: inert default + total silence.** `?skin=`, `?skin` (no value), `?skin=nosuch`, `?skin=../../etc`, `?skin=constructor`, `?skin=MiNTx`, a malformed search string (`skin%%=mint`), repeated `?skin=a&skin=mint` (URLSearchParams `.get` = first wins — `a` misses, default plays; pinned so dev can't rediscover it): EVERY miss → `undefined` → shipped defaults, nothing shown, nothing thrown (AC4). A hit plays the skin with no announce line (D6).

6. **D6 — zero new copy; the display question is CLOSED for this story.** No equip/announce prompt line ships (silence law UX-DR2; the equipped skipper IS the display). This is not taste — it is census arithmetic: the loss-line legs winloss.test.js:209 and :223 are **full-equality `assert.equal`** on `hud-prompt`, so ANY suffix on the over-prompt reddens them, and this story authorizes ZERO re-contracts (7.4's announce idiom — shell-local arm + `\n`-suffix on over/idle branches + the prefix re-contracts at winloss :235/ascent :351 — was that story's paid route; a skin announce is NOT worth buying here: skins are URL-gated, not earned, so there is no moment to announce). If a future story wants equip display, it re-contracts those legs IN ITS OWN AUTHORIZATION.

7. **D7 — the whole product diff is js/shell.js: zero new js/ files.** Module-scope SKINS literal + `resolveSkinParam` + the :81 site swap + comments. `js/render3d.js`, `js/game.js`, `css/style.css`, `index.html` byte-zero; the test-side diff is the NEW suite `tests/equip.test.js` (frozen-test discipline: new behavior gets new test files — prd.md Constraints :152-154, so skins.test.js may NOT grow) plus the dev-round C1 list-only appends x2. `tests/boundary.test.js` byte-identical (proof obligation). No keybindings, no DOM, no CSS, no copy, no storage (AC2/3/5/6/7 by diff fact).

**Questions:** none outstanding — P2 was the story's only open decision and the user answered it 2026-11-12 (URL query param; recorded in AC1 + prd.md Open Items); the shape forks (resolver form, table landing, garbage law, no-copy) are all pinned above as written authorizations.

## Dev Agent Instructions — Dev AUTHORIZATION (A2 re-contract pre-scan, RE-AFFIRMED per epics.md:1155-1160 + retro :57-59)

Pre-scan re-affirmed at create time against HEAD f7ab750 (gate 620/620 @ 8.5 s), exact legs re-counted. **This story authorizes ZERO re-contracts: every leg below passes UNTOUCHED; a red leg is a bug in the dev change set, not a contract change — STOP-AND-ASK beats a silent census edit.** (19 rows.)

- **(a) Storage-key census — tests/pausemenu.test.js L2, :431-432** (`jumprope-audio` + `jumprope-best` + `jumprope-meta` EXACTLY): GREEN — zero persistence ships (AC6); the retro :58 fourth-key tripwire stays armed, not spent.
- **(b) setItem write-site censuses — tests/metalegger.test.js :109-138 (readdir idiom, scans EVERY js/ file) and tests/reducedmotion.test.js L10(a) :649-652:** GREEN — zero new `setItem(` sites; the resolver/table carry no IO tokens (the readdir census kills an IO-bearing helper in shell.js just as hard as a new file).
- **Boot-site fence — tests/metalegger.test.js :52-59** (EXACTLY one `loadMeta(localStorage)`; the ≤400-char `loadBest→loadMeta` window): GREEN by construction — the new read sits at the :81 boot site and module scope, ABOVE `loadBest` :170. **Placement rule (8.1 authorization :45-57, lines re-verified: loads moved to :170/:176): nothing lands between shell.js:170 and shell.js:176, and no second `loadMeta(localStorage)`-shaped call anywhere.**
- **(c) Material censuses — tests/areavistas.test.js §2 :265-294 (rig/particle birthHex, ghost mats :276, no sharing :292) and tests/ceilingbreak.test.js :291-294/:448-468/:479-509 (rope-write Color#set wrap, per-edge/edge-writes censuses):** GREEN — `js/render3d.js` is byte-zero this story (diff fact); the skin arrives through the SAME 8.1 seam as data.
- **(d) Snap-uniform legs — tests/render3d.test.js :156-164, tests/areavistas.test.js :477-486:** GREEN — no material construction anywhere new (D7 file set).
- **(e) i-frame dim legs — tests/iframesjuice.test.js :418-442/:449-476/:482-500, tests/reducedmotion.test.js L4 :419-442 / L5b :477-500; the single-writer census iframesjuice :554-557:** GREEN — render3d byte-zero, the D1 loop untouched; under `?skin=mint` the D2 restore arms are 8.1's already-shipped behavior.
- **Look-constants source pins (`shippedConst()` family: iframesjuice :436-437/:457/:472/:488-489, reducedmotion :420-423/:556-560, areavistas :161-164/:203/:238/:254/:373, ceilingbreak :35/:48-51):** GREEN — the constants stay put (render3d byte-zero); the SKINS table lives in shell.js, where no constant-law pin reaches.
- **Import/specifier censuses — tests/ceilingbreak.test.js §6 :520-535 (render3d two-specifier + twin iframesjuice :549-551 + data-URL boots render3d.test.js:10-15) and tests/summitapproach.test.js §4.2 :831-832 (SHELL four `'./'` specifiers EXACTLY — the 8.1 Debug Log scar):** GREEN — D3/D7 add ZERO imports; table and resolver are shell-internal.
- **Purity rider — tests/boundary.test.js byte-identical, leg :103-112:** GREEN — the leg skips shell.js by name, and the new read IS in shell.js; nothing enters the sim graph. Precision (Pitfall): `BROWSER_IO_RE` (:13) does not contain `location`, so a read leaking into render3d.js would NOT die here — the story law (epics.md:1159) + the new-suite ownership leg (§e, `location` token counts: shell.js 1 read site, render3d.js exactly 2 LOOK_KNOBS tokens unchanged) own it. LOOK_KNOBS keys are `light`/`fogNear`/`fogFar` (render3d.js:52-59) — the `skin` param cannot collide with a look knob.
- **(f) #hud censuses — tests/ropehud.test.js :166-179 contract + tests/pausemenu.test.js :303-310:** GREEN — zero DOM/`index.html`/CSS touches (diff fact).
- **(f) Key-binding fence — tests/pausemenu.test.js L5 :536 (ZERO new bindings, ZERO shell setItem) + L5 css/html :558:** GREEN untouched — the AC5 clause that WOULD have re-contracted it (key-cycle P2) is moot by the chosen mechanism (written explicitly, epics.md:1212).
- **Copy-prefix legs — tests/winloss.test.js :209 and :223 (FULL-equality loss-line `assert.equal` — a prompt suffix reddens these; D6), :235 (win prefix, 7.4), tests/ascent.test.js :351 (win prefix regex):** GREEN — D6 ships zero copy; all four legs stay byte-identical proofs.
- **skins.test.js re-affirmance legs — §f :318-334 (pairing fences :319-324/:161-166, consumption-regex :331-332, createScene count :333) and §d shipped-composition :273-282:** GREEN by construction — `normalizeSkin` untouched, the consumption regex is a PREFIX pattern the :81 swap satisfies (D4), §d asserts the resolver-level composition Node boots still literally take.
- **§6 diff-census twins — tests/ceilingbreak.test.js allow-set :572 (BASE `5659fd4`, porcelain arm :566-571) + tests/summitapproach.test.js allow-set :862 (BASE `2c3e693`, arm :856-861):** the mechanical C1 rule — **this CREATE commit appends the story artifact** `_bmad-output/implementation-artifacts/8-2-equip-without-a-menu-the-no-chrome-surface.md` to BOTH twins list-only (the porcelain arms catch the untracked file at create time; precedent 6845157, same as 8.1's create commit ff1d97b). `sprint-status.yaml` and `_bmad-output/planning-artifacts/prd.md` are ALREADY members of both sets (ceilingbreak :670 / summitapproach's planning-artifacts rows) — this commit's prd.md/sprint-status edits need NO appends. **The DEV round appends the new suite `tests/equip.test.js` to both twins (list-only); zero new js/ files are expected (D7).**
- **NFR3/load-shape legs:** no test pins request counts (audio-scoped fetch legs only) — AC2 discharges as diff fact (zero fetch/script tokens) + the unchanged gate time.
- **Seed honesty (:259) / creation-site single-witness (:293) / L9 JIT (:299) / band gate (retro :59):** NOT TRIGGERED — no batch-driven leg, no deal/physics/deal-surface touch.

## Re-contract authorizations (written here, per the frozen-test discipline — AGENTS.md:52)

**Exactly ZERO existing test legs are re-authorized.** Every frozen test file stays BYTE-IDENTICAL except the two §6 allow-sets (list-only C1 bookkeeping: the story file at CREATE — this commit — and `tests/equip.test.js` at DEV round; prd.md/sprint-status.yaml already members). If any frozen leg reddens, the change set is wrong — re-read D3/D4/D6 and fix the change, do not edit the leg.

## Tasks / Subtasks

- [x] Task 1 — js/shell.js: the no-chrome equip surface (AC: 1, 2, 3, 4, 5, 6, 7; D1-D7)
  - [x] Module scope (next to normalizeSkin, :53-60 region): `SKINS` table literal (D2 — the mint witness colors verbatim) + `function resolveSkinParam(search, table)` (D3 shape, `Object.hasOwn`, `.toLowerCase()`, zero IO tokens). `normalizeSkin` untouched.
  - [x] Boot site :81: the guarded `equipSearch` read + `normalizeSkin(resolveSkinParam(equipSearch, SKINS))` (D4) — the ONE consumption site regex stays satisfied; comments name FR39/P2/UX-DR2 silence + the zero-request law; nothing between :170 and :176.
  - [x] Diff fact: no import line change, no new file, no setItem/localStorage/DOM/copy/key token added.
- [x] Task 2 — new suite tests/equip.test.js (AC: all; see Testing guidance) — legs (a)-(f).
- [x] Task 3 — bookkeeping + gate (AC: 2, 3, 5, 6)
  - [x] C1 dev round: append `'tests/equip.test.js'` to BOTH §6 allow-sets, list-only comment (after the 8.2 create-round entry in each twin).
  - [x] `./run_tests.sh` green (baseline **620/620 @ f7ab750**, ~8.5 s; expect 620 + the equip legs, NFR4 < 10 s).
  - [x] Diff-fact audit in the Debug Log (the 7.3/8.1 pattern): `git diff --stat` = shell.js + the two allow-sets + tests/equip.test.js only.
  - [x] Dev round stamps `review`; final gate re-run; sprint-status per house style.

## Testing guidance — tests/equip.test.js

Donors: the cross-source extraction idiom in tests/skins.test.js:159-166 (shell.js cannot be imported — boot IO — so the shipped function text IS the seam under test: `new Function` over a `/function resolveSkinParam\(search, table\) \{[\s\S]*?\n\}/` slice; pairing fence RED on silent delete/rename) and the recording-stub `bootSkin` boot in skins.test.js (:29-121 areavistas donor, identity-addressed materials `reg.materials[0..2]`, D1 set-after-construction law — never birthHex-key on skinned boots).

- (a) **Resolver contract, Node-side, same change** (factory-convention rule, architecture.md:154-156): `''` → undefined; `'?skin=mint'` → the mint record; `'skin=mint'` (no `?`) → mint; `'?x=1&skin=mint'` → mint; `'?skin=Mint'`/`'?skin=MINT'` → mint (lowercased law); `'?skin='` → undefined; `'?skin'` → undefined; `'?skin=nosuch'` → undefined; `'?skin=a&skin=mint'` → undefined (first-wins law, D5); hostile: `'?skin=constructor'`, `'?skin=__proto__'`, `'?skin=../../etc'` → undefined (the `Object.hasOwn` falsifier — `table[v]` dies here); malformed search (`'skin%%=mint'`) → undefined, nothing thrown. Body purity: zero `localStorage`/`fetch`/`eval`/`import`/`document`/`window`/`setItem`/`location` tokens in the resolver text.
- (b) **Table shape + witness pairing**: source-extract the SKINS literal — every entry survives `normalizeSkin` with non-empty `colors`; keys all lowercase; `mint` hexes EQUAL the 8.1 witness (skins.test.js:170 MINT — the pairing fence to the legibility-certified colors).
- (c) **Inert-composition leg** (the AC1/AC3 tripwire, Node, no location): `bootSkin(normalizeSkin(resolveSkinParam('', SKINS)))` → the three materials carry the shipped constants and `reg.colorSets === 0` (the 8.1 §d form) — every frozen boot takes exactly this path (D4's Node-inert guard).
- (d) **Browser-shape boots, location stubs where feasible**: set `globalThis.location = { search: '?skin=mint' }` BEFORE the data-URL boot (render3d's LOOK_KNOBS reads `location` at module-eval, render3d.js:52-59 — the stub carries no knob keys so look defaults ride; ALWAYS restore in `finally` — a leaked stub re-evaluates every later import), boot the recording-stub shell/scene, assert the identity-addressed materials carry the mint hexes (AC3 end-to-end). Garbage twin legs: `'?skin='` and `'?skin=nosuch'` → shipped defaults, ZERO color writes, nothing shown (AC4). If a clean stub is NOT feasible in the harness, the (a)+(c) legs discharge the ACs — report the verdict in the Debug Log, do not fake a boot.
- (e) **Ownership + persistence fences**: shell.js source — `loadMeta(localStorage)` EXACTLY once (metalegger :52-59 re-affirmance, 8.1 §f donor), the guarded read shape `typeof location !== 'undefined'` appears EXACTLY once in shell.js, the `location` token count in js/render3d.js is UNCHANGED (2 — LOOK_KNOBS only; the read stays shell-side, purity rider mechanized), `setItem(` count in shell.js EXACTLY 0 (L5 sibling), `createScene(` count EXACTLY 1.
- (f) **No-chrome diff-fact legs**: `index.html` + `css/style.css` byte-identical to HEAD (read-and-compare against `git show`), shell.js keydown-comparison token count unchanged (pausemenu L5 donor form), and the prompt copy is untouched (winloss/ascent frozen legs ARE the proof — cite, don't duplicate).

## Dev Notes

### Current state (verified 2026-11-12 @ f7ab750, gate 620/620 @ 8.5 s)

- `js/shell.js` (884 lines): `normalizeSkin` :53-60 (pure, shell-internal per 8.1 D3-alternative); the ONE boot site :81 `const scene = createScene(canvas, normalizeSkin(undefined));` with the :78-80 hand-off comment ("replaces the source expression only, at this one site" — this story's marching orders); boot loads `loadBest(localStorage)` :170 / `loadMeta(localStorage)` :176 (fence metalegger :52-59); imports :1-4 — EXACTLY four `'./'` specifiers (census summitapproach :831-832); `windowSize()` uses `window.innerWidth/Height` (:35-37).
- `js/render3d.js`: LOOK_KNOBS :52-59 — the URL-read precedent: `typeof location !== 'undefined' && location.search ? new URLSearchParams(location.search) : null`, keys `light`/`fogNear`/`fogFar`, "Node/test import path always takes the shipped defaults". The three materials :187-189 + the 8.1 guarded application loop and D2 restore arms — ALL byte-zero this story.
- `tests/skins.test.js` (frozen): `MINT` :170 (the witness colors, `rose: 0x7ce38b, prop: 0x10151f, limb: 0x9aa4b2`); pairing fences :161-166/:319-324; consumption-regex :331-332 (`createScene(canvas, normalizeSkin(` prefix — the :81 swap satisfies it INSIDE the parens); §d shipped-composition :273-282; bootSkin donor boot :29-121.
- Twins (C1 append points, THIS create commit): ceilingbreak.test.js allowed-set starts :572, 8.1 dev entry `'tests/skins.test.js'` :762, set closes :763 (BASE `5659fd4`, porcelain arm :566-571 — `git status --porcelain` catches this new untracked file at create time); summitapproach.test.js set starts :862, entry :1052, closes :1053 (BASE `2c3e693`, arm :856-861). Already members of BOTH: `js/shell.js`? — NO, shell.js is a ceilingbreak member (:573) and summitapproach member (:863); `sprint-status.yaml`, `deferred-work.md`, `_bmad-output/planning-artifacts/prd.md` (ceilingbreak :670 / summitapproach planning-artifacts rows) — all already listed.
- Boundary: BROWSER_IO_RE :13 = `performance.now|Date.now|requestAnimationFrame|localStorage|document` — `location` is NOT in it; shell.js is skipped by name (:106). Purity law placement is by story/rider + the new ownership leg.
- prd.md: Open Items table :127-135 (TRACK-1/WR-02/CARD-08/CARD-09/META-01 rows) — the P2 outcome row lands there in THIS commit, table style.
- Deferred-work.md: the 8.3-owned color-range law already waits (:118 sprint-status note row) — nothing new defers here.

### Pitfalls

- **The value is a KEY, never a path.** `?skin=../../evil` must miss the table and stay silent; nothing is ever fetched or read from the param (AC2 zero-request law + FR36's data-only spirit pre-arms 8.3).
- **`table[v]` without `Object.hasOwn`**: `?skin=constructor` equips a Function object (truthy record → garbage into normalizeSkin). The hasOwn law (D3) is what AC4's silence stands on — leg (a) is the falsifier.
- **The read leaks renderer-side**: boundary.test.js will NOT catch a `location` token in render3d.js (not in the regex, :13) — the rider epics.md:1159 forbids it and the new-suite ownership leg (e) fences it. render3d receives DATA only.
- **Landing the table/resolver in a NEW js/ file**: the import reddens summitapproach :831-832 (five specifiers) — the exact 8.1 scar (Debug Log), zero re-contracts authorized. Shell-internal, period.
- **Boot-region insertion**: nothing between shell.js:170 and :176 (metalegger ≤400-char window); a second `loadMeta(localStorage)`-shaped call dies the :52-59 fence. The equip read belongs at the :81 site.
- **Equip display copy**: any `hud-prompt` suffix on the over/loss surface reddens winloss :209/:223 (full-equality) — authorized NOWHERE in this story (D6). Silence is the design.
- **Persisting the equip** (`localStorage.setItem('jumprope-skin', …)`): reddens pausemenu L2 :431-432 + both setItem censuses AND crosses the retro :58 STOP-AND-ASK line — the AC6 tripwire, not a dev decision.
- **Leaked `globalThis.location` in the new suite**: render3d re-evaluates LOOK_KNOBS at EVERY data-URL import — a stub left set can retint later legs across files. Set immediately before boot, restore in `finally`, keep knob keys absent.
- **Mutating the table**: hand the seam `normalizeSkin(record)` results only; never `SKINS.mint.colors.x = …`, never pass a raw table record to `createScene`.
- feelcap AUD-02 scans js/ comments for the `audio.js` token (7.1's red iteration) — phrase new comments without it.

### Precedents to follow

- LOOK_KNOBS (render3d.js:52-59) — the guarded `typeof location` URL-read idiom, D4's shape donor (landed shell-side per the purity rider).
- 8.1 D3-alternative landing (Debug Log: shell-internal factory after the specifier census scar) — the resolver/table stay inside shell.js.
- skins.test.js:159-166 cross-source extraction (`markerHeal`/areavistas:179-184 donor family) — the resolver contract legs.
- The create-round census appends (7.1-7.5 + 8.1 wording blocks): list-only, tripwires stay armed, authorizes nothing else — this commit's twin appends use the same block verbatim-style.
- 7.3's INERT pattern ("byte-identical by diff fact") — the Node-inert guard (D4) is this story's inert-by-default proof.

### AC → test mapping

- AC1 → the mechanism legs (a)+(d) + AC1 text recording (this file + prd.md row).
- AC2 → diff facts (Task 3 audit: zero fetch/token/html/css touches) + unchanged gate time.
- AC3 → legs (c) + (d) + the untouched frozen (c)/(d)/(e)/(f) censuses (the authorization table).
- AC4 → legs (a) hostile inputs + (d) garbage boots.
- AC5 → pausemenu L5 :536 untouched-green + leg (f) token census.
- AC6 → leg (e) (setItem 0, loadMeta 1) + pausemenu L2 + metalegger/reducedmotion censuses untouched-green.
- AC7 → the reducedmotion suite untouched-green by diff fact (no cosmetic; leg (f)'s diff-facts).

### Project Structure Notes

- Create commit: this file, `_bmad-output/planning-artifacts/prd.md` (Open Items row — already a census member), `sprint-status.yaml` (8-2 → ready-for-dev — already a member), `tests/ceilingbreak.test.js` + `tests/summitapproach.test.js` (story-file list-only appends ×2). Dev round: `js/shell.js` (modified — the ONLY product file), `tests/equip.test.js` (new), both twins (dev-round appends). No path-convention conflicts; zero new js/ files.

### References

- epics.md: Story 8.2 :1188-1216 (BDD source of truth); Epic 8 riders :1155-1160 (A2 (a)-(f), purity :1159, S3 :1160); FR39 :93 (mechanism = open decision → ANSWERED; the fourth-key tripwire text); FR37 :91; NFR14 :110, NFR16 :112; UX-DR1 :155, UX-DR2 :156, UX-DR3 :157; P2 candidate list :275.
- prd.md: Open Items :127-135 (the P2 row lands here, THIS commit); Constraints :152-154 (frozen-test discipline — new behavior, new file).
- architecture.md :151-156 (frozen-test discipline, factory-contract rule); §Persistence (storage-degrades-as-data sibling).
- 8-1 story file (same folder): the seam this story consumes (D3 landing note, Debug Log D3-alternative scar, :81 boot-site hand-off).
- epic-7-retro-2026-11-11.md :57-59 (A2 convention, Epic 8 riders).
- Code/harness: shell.js :53-60/:81/:170/:176; render3d.js :52-59; skins.test.js :29-121/:159-166/:170/:273-282/:318-334; metalegger.test.js :52-59/:109-138; pausemenu.test.js :431-432/:536/:303-310/:558; boundary.test.js :13/:103-112; summitapproach.test.js :831-832/:862-1053; ceilingbreak.test.js :520-535/:572-763; winloss.test.js :209/:223/:235; ascent.test.js :351; ropehud.test.js :166-179; reducedmotion.test.js :649-652.
- Sibling stories: 8.1 (the seam — byte-zero consumption), 7.4 (the announce idiom NOT bought, D6), 7.1/7.3 (boot-fence + INERT patterns), 4.3 (VISTAS ground truth for the mint witness).

### Deferred items (not this story)

- **P1 manifest schema** — rides Story 8.3 kickoff (epics.md:1226, sprint-status :118); the URL mechanism's mod-file side (fetch the manifest named by the URL, shell-side, data-only) is 8.3's under P1. Already owned — no new deferral here.
- **Persisting an equipped choice** — named STOP-AND-ASK decision (AC6), tripwire armed, no date.
- **Equip display copy / announce line** — refused by D6 for this story; any future purchase names the winloss :209/:223 re-contracts first.
- **Legibility for all five palettes** — Story 8.5 (UX-DR3; 8.1 §g seeded three tiers; mint is already the certified record).
- **Color-range law** — the 8.3-owned ledger line (8.1 review BH-4 defer; sprint-status/ledger already carry it).

## Dev Agent Record

### Agent Model Used

lane-qwen38-ultra/qwen (omp worker Dev82)

### Debug Log References

- Baseline: frontmatter `baseline_commit` PRESERVED from the create round (`f7ab750`, gate 620/620 @ 8.5 s, tree clean at dev start) — workflow Step 4 law: an existing baseline is never overwritten (HEAD at dev start was `d55175b`, the create commit).
- New-suite red iteration (1 red, fixed in PRODUCT-comment, zero frozen-test edits): the §e `location.search` token census measured 3 ≠ 2 — the boot-site COMMENT had named the token literally; the comment was reworded ("URL-search") so the census stays token-exact (the guard line holds both reads; one READ SITE by D1).
- Ownership censuses measured post-change: shell.js — `typeof location !== 'undefined'` ×1, `location.search` ×2 (both inside the one guard expression, one line), `setItem(` ×0, `createScene(` ×1, `loadMeta(localStorage)` ×1, `jumprope-` ×0; render3d.js `location.search` ×2 UNCHANGED (LOOK_KNOBS only — the boundary `BROWSER_IO_RE` carries no `location` token, so §e owns the purity rider).
- Guidance §d verdict: the location-stub boots ARE feasible — `globalThis.location = { search }` set immediately before the data-URL boot, restored in `finally`, stub carries NO knob keys; the mint boot also pins fog near/far at the LOOK_KNOBS fallbacks (derive-from-source) — the `skin` param cannot collide with a look knob.
- Boot-region law held: the equip read lands at the boot site inside `startGame` (now :110-111), ABOVE the boot loads (`loadBest`/`loadMeta` shifted :200/:206) — nothing between them, the metalegger ≤400-char window untouched; the module-scope insert sits at :62-83, beside `normalizeSkin` (:53-60 byte-identical).
- New suite: 12 legs (§a x3, §b x1, §c x1, §d x3, §e x2, §f x2); final gate **632/632 @ 8.52 s** (620 + 12; NFR4 < 10 s holds).
- Diff-fact audit (`git diff --stat`): js/shell.js +34/−4, the two §6 allow-sets +4/+4, new tests/equip.test.js — exactly the D7 file set; zero new js/ files, zero new specifiers (summitapproach :831-832 untouched-green).

### Completion Notes List

- Ships the P2 mechanism exactly as pinned: `?skin=<name>` read SHELL-side at boot — ONE guarded `location.search` site (LOOK_KNOBS idiom, epics.md:1159 purity rider) — resolved against the shipped `SKINS` table through the pure `resolveSkinParam`; a hit composes `normalizeSkin(record)` into the 8.1 seam at the ONE consumption site, render3d.js byte-zero.
- AC1: the mechanism legs (§a resolver contract, §d location-stub boots) + the recorded decision (AC1 text, prd.md P2-EQUIP row — create commit). AC2: diff facts — zero new fetch/import/script tokens, the param is a table KEY never a path, `index.html`/`css/style.css` byte-identical to HEAD (§f leg), gate time unchanged.
- AC3: `?skin=mint` end-to-end recolors the identity-addressed rose/limb/prop materials at the ONE site, three writes (§d); §c proves the Node boot composition (`resolveSkinParam('')`) takes ZERO color writes — the frozen 620 boot bit-identical by construction. AC4: silence — 9 garbage/hostile inputs undefined + 2 garbage boots zero-write, nothing thrown, nothing shown (§a/§d).
- AC5/AC6/AC7: zero new bindings (pausemenu L5 :536 untouched-green + §f donor-form key census); zero persistence (§e `setItem` 0 / `loadMeta` 1 / zero `jumprope-*` literals + L2/metalegger/reducedmotion censuses untouched-green, fourth-key tripwire armed not spent); no cosmetic → reducedmotion untouched-green by diff fact.
- Deviations: zero. Deferrals: zero new (the Deferred items section already owns P1/persistence/display/legibility/color-range). Questions: zero — all 19 A2 rows GREEN untouched, zero re-contracts spent.

### File List

- `js/shell.js` (modified — `SKINS` + `resolveSkinParam` at module scope beside `normalizeSkin`; the boot-site source expression replaced by the guarded `equipSearch` read; +34/−4)
- `tests/equip.test.js` (new — 12 legs §a-§f, the equip contract suite)
- `tests/ceilingbreak.test.js` (modified — §6 allow-set dev-round append, list-only)
- `tests/summitapproach.test.js` (modified — §4.3 allow-set dev-round append, list-only)
- `_bmad-output/implementation-artifacts/8-2-equip-without-a-menu-the-no-chrome-surface.md` (this file — tasks, record, Status review)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (8-2 → review)

## Change Log

- 2026-11-12 (create round): story created from epics.md:1188-1216 + FR39 :93 / NFR14 :110 / NFR16 :112 / UX-DR1-3 :155-157 + Epic 8 riders :1155-1160; **P2 ANSWERED by the user 2026-11-12 — URL query param — recorded in AC1 + prd.md Open Items (D-006 pattern)**; the A2 re-contract pre-scan re-affirmed with exact legs — **19 rows, ZERO authorized re-contracts, zero questions**; design pinned D1-D7 (shell-side guarded read, SKINS table with the mint witness, pure `resolveSkinParam`, no-copy, non-persistent); the L5 key-census clause of AC5 mooted by the chosen mechanism. **C1 census allow-append x2 SPENT IN THIS CREATE COMMIT** (story artifact into both §6 twins — mechanical list-only rule, precedent 6845157/ff1d97b; prd.md + sprint-status.yaml verified ALREADY members of both sets — no appends needed) + prd.md Open Items row + sprint-status (`8-2` → ready-for-dev). Tests delta: 0/0 (create only); gate 620/620.
- 2026-11-12 (dev round): P2 mechanism SHIPPED per D1-D7 — `SKINS` table (the mint witness, D2) + pure `resolveSkinParam` (D3: `Object.hasOwn` law, lowercase keys, never throws, zero IO) landed shell-internal; the :81 boot-site source expression replaced by the guarded shell-side `equipSearch` read (D4, LOOK_KNOBS idiom) — a miss is `normalizeSkin(undefined)`, the byte-inert 8.1 composition, every frozen boot bit-identical; zero new js/ files, zero imports, zero copy, zero keys, zero storage; `tests/equip.test.js` NEW (12 legs §a-§f); **zero re-contracts — all 19 A2 rows untouched-green**; C1 dev-round allow-append x2 (list-only); gate **632/632 @ 8.52 s**; Status: review.
