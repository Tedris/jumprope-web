---
baseline_commit: 0f0236f
---
# Story 5.5: Audio lifecycle regression sweep

Status: review

Note: Ultimate context engine analysis completed — comprehensive developer guide created (2026-11-09).

Baseline: `0f0236f` (Story 5.4 done — WR-02 PAID with the one-line beat gate + 11-leg reducedmotion suite; gate **504/504 green**, ~8.6 s real, tree clean, verified at authoring time 2026-11-09). Fifth story of Feel & Fidelity. This is a **matrix story**: v2 grew the audio table from v1's five voices to EIGHT (5.1 `ascend`/`win`, 5.2 `ropeLost`), and the FR27 lifecycle contracts (gesture-gate, suspend/resume, master bus, persisted settings) are only *believed* to guard the new voices. This story converts belief into **per-voice leg-pinned proof** across a full 8-voice × 6-lifecycle matrix, restores settings-apply-to-new-voices as its own legs, re-pins the absent-track degradation UNCHANGED, and pays the ledger carry-in: the live-browser route-intercept re-exercise (`deferred-work.md:32`, owner CONFIRMED at `:142`). **Expected product-code delta: ZERO.** The suite is `tests/audiolifecycle.test.js` (new; Decision D1).

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the project,
I want v1's audio contracts re-proven against v2's event traffic,
So that a year from now nobody 'fixes' a lifecycle bug that was actually protecting the new voices.

## Acceptance Criteria

(verbatim from `_bmad-output/planning-artifacts/epics.md:807-825` — FR27, FR29, NFR4)

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

### AC-to-verification map (decided — do not re-litigate)

| AC | How it is proven headlessly |
|---|---|
| AC1 (every voice respects every guard) | **Verify-and-pin, not re-implement.** The guards are structurally voice-agnostic — single dispatch `handleEvent`→`VOICES[name]` (`js/audio.js:211-214`), single start funnel `play()` with the `!ctx \|\| !master` gesture guard (`js/audio.js:179-182`), single master bus (`:64-66/:74-76`), single state-guarded suspend/resume pair (`:91-93`, resume arm `:81/:83-85`). The NEW work is the 48-cell matrix written as per-column legs that LOOP over the census-derived eight names (L1-L4, Decision D2): gesture-gate, suspend-window+resume, mute, volume. Shell-level legs L8 (pause + tab-hide walks with the voice log frozen across the paused window) and L9 (reloaded volume applies to real OLD-channel voices AND direct NEW-voice dispatch alike). Mutation battery M1-M8 (Task 4) proves every cell is killable — the falsifiability this sweep exists for. |
| AC2 (settings restore applies to old AND new voices) | L6 module-level: storage pre-seeded `{muted:false, volume:0.3}` → first gesture lands master gain **0.3** (apply-at-creation `js/audio.js:75`), and `{muted:true, volume:0.3}` → **0** (muted wins the ternary) — with all eight voices attempted after, gain unmoved. L9 boot-level: Map-persistence pair across two boots (`tests/audio.test.js:489` donor shape, extended to the new names). L3/L4 carry the write-through asserts (`setMuted`/`setVolume` persist EVERY call, `js/audio.js:217-227`). Kills M4/M5. |
| AC3 (absent track = silence, UNCHANGED) | The four shipped legs that already pin this — `tests/audio.test.js:114` (no fetchFn → `playTrack()` false), `:168` (absent = flag + silence / present = one looping source), `:209` (settled track still no-ops; re-entry guard at `:194`), `:342` (shell harness ships a rejecting fetch) — **run green UNCHANGED; `audio.test.js` is frozen and must stay byte-identical** (not in either census allow-set; AC3 says *pinned unchanged*). L7 adds only the lifecycle-walk restatement: one fetch attempt after gesture, ZERO retries across suspend/resume/mute/volume (`trackMissing` sticky, `js/audio.js:123-126`). |
| AC4 (sim graph stays audio-free) | **Zero wiring delta = green by inheritance** — this story adds no event-channel code; the five boundary legs run untouched. L5 adds one cheap source census: the `'./audio.js'` specifier occurs EXACTLY once in `js/` (the dynamic import `js/shell.js:64`, D-N07 sole-consumer) and `audio/track.ogg` occurs only at `js/audio.js:8`. |

### The voice matrix (8 voices × 6 lifecycle columns; the census IS the contract)

**The voice set is EXACTLY EIGHT names — `{jump, skip, nearMiss, trip, ropeLost, pick, ascend, win}`** (`js/audio.js:184-209`), already pinned by two frozen fences: `tests/ceilingbreak.test.js:511-518` (§6 exact-name-set census) and `tests/iframesjuice.test.js:596-613` (the eight, chargeUsed ABSENT). **`chargeUsed` is NOT a voice and MUST NOT become one** — it is a sim event (`js/game.js:223`) that reaches `handleEvent` and dies silently at the VOICES lookup (`js/audio.js:212-213`), carrying JUICE ONLY (`js/shell.js:18` row, Story 5.3). AC1's word "charges" refers to that event traffic being *audibly silent by design*; do not "complete the matrix" with a ninth voice (Decision D4 — L5 reddens if you do, and so does the §6 fence).

Per-leg doctrine (Decision D2): legs **derive the names from the VOICES source** (donor regex `tests/ceilingbreak.test.js:513-517`) and loop — a future ninth voice is covered automatically; a retyped list would rot.

| # | Voice | Source | Event route (dispatch) | Lifecycle evidence ALREADY pinned (inherited) | 5.5 NEW legs |
|---|---|---|---|---|---|
| 1 | jump | `audio.js:185` | press-side `shell.js:384` + sim channel `game.js:159` → drain `shell.js:683` | `audio.test.js:151` (pre/post-gesture), `:455` (real channel) | L1-L4 loop; L9 |
| 2 | skip | `audio.js:191` | sim `game.js:178/:214` | `audio.test.js:151/:455`; tension variant `ropelossthud.test.js:217` | L1-L4 loop; L8/L9 |
| 3 | nearMiss | `audio.js:192` | sim `game.js:182/:214` | `audio.test.js:151` | L1-L4 loop |
| 4 | trip | `audio.js:193` (noiseHit) | sim `game.js:252` | `audio.test.js:151/:455/:266` | L1-L4 loop (started-counter covers the bufferSource start) |
| 5 | ropeLost | `audio.js:200` | sim `game.js:243` | `ropelossthud.test.js:179` (pre-gesture), `:253` (muted bus) | L1-L4 loop; L9 direct |
| 6 | pick | `audio.js:201` | shell `confirmPick` `shell.js:421` | `audio.test.js:151/:455` ("exactly one pick") | L1-L4 loop |
| 7 | ascend | `audio.js:207` | sim `game.js:277` | `ascentstinger.test.js:241` (pre-gesture), `:259` (muted bus) | L1-L4 loop; L9 direct |
| 8 | win | `audio.js:208` | sim `game.js:273` | `ascentstinger.test.js:250/:259` | L1-L4 loop; L9 direct |

The six lifecycle columns {gesture-gate, tab-hide, pause-suspend, resume, mute, volume} converge on THREE module-level guards (gesture `audio.js:68-86`, suspend pair `:91-93` + context-time, bus `:64-66`) entered from FOUR shell seams (`shell.js:246` pause-suspend, `:262` resume-gesture, `:327-345` visibilitychange — both directions, `:348` focus) — the AGENTS.md "one shared handler per concern" law. L1-L4 prove the guards per voice; L8 proves the seams; **tab-hide and pause-suspend are the SAME audio seam** (`enterPause` `:235-247` suspends once via `:246` whichever key or event entered it — the hidden+running leg routes through the shared `releaseEverything` first, note `shell.js:205-207`, call `:336`), which L8 pins from both entries.

### Loop contract (binding)

- Gate `./run_tests.sh` before any edit: **504/504** at `0f0236f` (verified at authoring; wall ~8.6 s). The creation commit alone turns BOTH diff-census legs red (new story artifact — **R1** is the sanctioned restore, same mechanism as 5.4 R1). After dev: 504 + 9 new legs ≈ 513, suite < 10 s (NFR4 — wall time is close to budget; ≤4 boots TOTAL across the suite, Part A pure-stub, no `setTimeout` chains beyond `settle()`). Report ACTUAL counts + duration from real run output; never claim green without a run.
- **Product-code delta: ZERO.** `js/audio.js`, `js/shell.js`, `js/game.js`, every other `js/` file, `css/`, `index.html`, `package.json`, `run_tests.sh` stay byte-identical. No new deps, no build step, no new imports (NFR6). If a matrix leg goes RED on the unpatched tree, that is a genuine FR27 regression FINDING — stop, record the minimal repro in the Debug Log, and report; a product fix is NOT sanctioned silently (Decision D5). Red-first ordering in the classic sense is N/A (no known bug to repro); falsifiability lives ENTIRELY in the mutation battery (Task 4) — every leg must die under exactly one named mutant, and gold stays green.
- Existing test files are frozen **except R1** (the two diff-census appends, verbatim below). `tests/audio.test.js` is NOT in either allow-set — **byte-identical; its twelve legs are this story's premises and AC3's UNCHANGED-pinned set** (disaster guard: it is a `tests/` protected path per VERIFY-CONTRACT rule 3). Same for `polish.test.js`, `boundary.test.js`, `ascentstinger.test.js`, `ropelossthud.test.js`, `v1parity.test.js` (all in neither set's 5.5 additions — every one stays byte-identical; copy donors, never import or edit).
- **Zero frozen-leg conflicts (creation-time scan):** the sweep boots nothing new in product and patches nothing, so no shipped leg can redden — the 502/504 creation-window reds are ONLY the two census tripwires (they go green at Task 3). A dev-round red ANYWHERE else = defect in the dev's diff (most likely an accidental audio.js touch), not a conflict.
- `git diff --name-only` after dev must be EXACTLY: `tests/audiolifecycle.test.js`, `tests/ceilingbreak.test.js`, `tests/summitapproach.test.js`, `_bmad-output/implementation-artifacts/deferred-work.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`, this artifact — **zero product files** (the censuses' own tripwire, with R1's entries).

### R1 — Sanctioned extension of the two diff-census tripwires (both files; written-authorization rule as in 5.1/5.2 R2, 5.3 R3, 5.4 R1)

5.5's changed-vs-base set adds exactly TWO paths: the new suite and this story artifact (`deferred-work.md` and `sprint-status.yaml` already ride both sets, and the census files self-carry). Both legs list paths only — **no frozen leg's behavior changes**. Authorized diff, in BOTH sets, insert verbatim before the closing `]);`:

- `tests/ceilingbreak.test.js` (leg §6 :546, Set :566-598, 5.4 tail entries :596-597): insert after `:597`

  ```js
  // Story 5.5 sanctioned re-contract R1 (2026-11-09): zero product-code delta —
  // the audio-lifecycle matrix suite and this story's artifact join the set;
  // the live-browser re-run lands Debug-Log evidence + the ledger stamp only.
  'tests/audiolifecycle.test.js',
  '_bmad-output/implementation-artifacts/5-5-audio-lifecycle-regression-sweep.md',
  ```

- `tests/summitapproach.test.js` (leg §4.3 :827, Set :847-879, 5.4 tail entries :877-878): insert after `:878`, same comment + two entries.

Zero other changes in either file.

### Scope boundary vs neighboring stories (explicit, to prevent collision)

- **VOICES is frozen at eight.** No voice added, renamed, or retuned (`ceilingbreak.test.js:511` fence; a 5.6-era mix retune is the 6.2 lane, D-N12). Track CONTENT is 5.6 (`epics.md:827+`); the absent-file legs stay exactly as pinned until 5.6's file lands — and even then 5.6 changes only the fixture, never these legs' injected-fetch shape.
- **Pause-menu audio-config UI is 5.7 (FR30)**: the `setVolume`/`toggleMute`/`loadSettings` seams this story pins ARE 5.7's mechanism (`epics.md:70`); this story adds zero UI.
- `deferred-work.md` rides both allow-sets — the sanctioned write is the ONE ledger stamp (Task 5). `epics.md` / `architecture.md` are in NEITHER set and MUST NOT be touched (registry refresh = 6.4 docs-provenance lane).
- The juice side of the same events (`shell.js:15-22` rows, hitstop/shake/particles) is 5.1-5.4 territory and reduced-motion-pinned by 5.4 (`reducedmotion.test.js`); this story is AUDIO-only — a juice-census leg here would duplicate frozen fences.
- The 1.5-input-hygiene live pass stays Debug-Log history; 5.5 RE-EXERCISES the idiom on the AUDIO surface (Decision D6), it does not redo the input-hygiene checklist.

## Context — shipped state (verified against the tree at 0f0236f)

1. **The guards** (`js/audio.js`): `play()` `:179-182` — `if (!ctx || !master) return;` is the ONLY gate between an event and a voice (cold factory: `ctx` null until the first `gesture()`, D-N08). `gesture()` `:68-86`: create-once (master gain `:74-76` connects to destination; gain seeded from persisted settings `:75`; immediate recover if the fresh context arrives suspended `:78-81`), else resume-only `:83-85`. `suspend()` `:91-93` state-guarded (running→suspend exactly once; guarded no-op otherwise — pinned `audio.test.js:136-149`). `handleEvent` `:211-214`: unknown names silent (`offer` included, `audio.test.js:151`). `applyGain` `:64-66` is the only live master-gain writer.
2. **Settings live INSIDE audio.js** (the shell only injects `localStorage`, `shell.js:67`): `SETTINGS_KEY = 'jumprope-audio'` `:7`; `loadSettings` `:20-32` (shape-pinned read — unknown keys dropped, corrupt blob → `{muted:false, volume:1}`, `clampVolume` `:10-16` where **0 is a legitimate volume**, the finiteness check is never a `||` coalesce); `saveSettings` `:34-43`; write-through on EVERY change `setMuted`/`setVolume` `:217-227` (`:224` uses `Number(v) || 0` — invalid input zeroes; the :13-16 load-time path defaults to 1. The asymmetry is SHIPPED and pinned `audio.test.js:212-248` — regression-pin it if cheap, NEVER "fix" it).
3. **Shell lifecycle seams**: `press → unlockAudio` `:194-198`/`:176-190` — the ONLY AudioContext construction site `:183-184`, later gestures revive `:189`; `enterPause` `:235-247` → `audio.suspend?.()` **`:246`**; `resumeFromPause` `:251-263` → `audio.gesture()` **`:262`**; `visibilitychange` **`:327-345`** — hidden: `releaseEverything()` `:336` (the ONE shared release handler, note `:205-207`) then `enterPause(true)` for running `:337` or the D-N08 gesture for idle/choose/over `:338`; visible: `resumeFromPause` `:340` or gesture `:343` with `!paused` guard; `focus` `:348` (never past a manual pause — Pitfall 4 note `:346-347`); audio-key short-circuits **`:278-280`** (Mute/Minus/Equal run on `audio` EVEN PRE-gesture — `applyGain` is a no-op with no master, and that is correct: the settings persist and land at gesture time, `:75`; `!e.repeat` guards OS repeat). Event drain `:683` (D-N02 single-channel), `setRopes` state seam `:644`, dynamic sole-consumer import `:57-73`.
4. **Absent-track legs (D-N09) already pinned**: `audio.test.js:114` / `:168-192` / `:209` / `:342` — flag + silence, one looping source on the bus, no retry loop (`trackMissing` sticky `audio.js:123-126`, sync `trackPending` flip `:100-102` WR-04). AC3 requires these UNCHANGED.
5. **Donor harnesses** (COPY into the new file — frozen suites cannot be imported; per-suite harness-fork doctrine, say so in the header as 5.3/5.4 do): `makeAudioContext` `audio.test.js:24-88` (stub counters `started`/`resumes`/`suspends`/`gains`, `gainNodes[]`, connect traces — the started counter spans oscillators AND bufferSources, so trip/track legs count too); `makeStorage` `:90-99`; `settle` `:101`; `bootAudioShell` `:291-396` (+ `tick`/`press`/`keydown` `:398-415`, `driveToChoose` scripted jumper `:417-437`) — extend the wrapper to also stash the instance (`globalThis.__audio = a;`) for direct per-voice dispatch in L9; the suspend-log audio wrapper idiom `polish.test.js:187-191` for L8's seam counter; the VOICES census regex donor `ceilingbreak.test.js:513-517`.
6. **Live-browser lane** (carry-in `deferred-work.md:32`, owner CONFIRMED `:142`, UAT-scheduled `:166`): the 1.5 idiom was a route-intercept static server + Playwright Chromium, 16/16 PASS (`1-5-input-hygiene-v1-parity-proof.md:162`); the review deferred independent re-run (`:89`) INTO THIS STORY. Environment at authoring: Chromium builds cached under `~/.cache/ms-playwright/` (`chromium_headless_shell-1243`+), **no playwright package in the repo or global node_modules** — drive it scratch-side (`bunx playwright` resolves from the bun cache, or `uv`-managed python playwright). Repo deps are FORBIDDEN (package.json frozen, D-N08-era rule, AGENTS.md); the scratch script lives OUTSIDE the repo tree.
7. **Gate state**: 504 legs / ~8.6 s at `0f0236f`; `audio.test.js` carries 12 legs of which 3 boot legs run ~5 boots — the new suite's ≤4 boots keep the wall under the NFR4 budget. audio.js was last touched at `5744803` (Story 5.2) — the product surface is stable under this sweep.

## Decisions (baked — `[DECIDED-BY-CREATE]`; do not re-litigate at dev time)

- **D1 — NEW suite `tests/audiolifecycle.test.js`**: `audio.test.js` is frozen (in neither allow-set — verified against both Set bodies at `ceilingbreak.test.js:566-598` / `summitapproach.test.js:847-879`) AND is AC3's *pinned-unchanged* exhibit — appending legs there violates both the census and the AC's own wording. A new file costs only the R1 path-append; every story 4.4→5.4 followed this.
- **D2 — matrix as looping columns, not 48 hand-written tests**: six leg-families, each looping over the source-derived eight-name census. Looping is the point: it proves the guard is voice-agnostic (the FR27 claim) and auto-covers a future ninth voice; hardcoding would freeze a moving list. Each leg asserts the SAME oracle shape for every name — same started/gain/state reads — so "exactly as v1's five do" is checkable per cell.
- **D3 — the suspend-window law is *no-sneaky-resume + state preserved*, NOT *zero node starts***: a voice dispatched while `ctx.state === 'suspended'` MUST NOT call `ctx.resume()` nor change state — that is the observable headless law. Node starts during the frozen window are the honest, correct shape (context time is the browser-side guard; the shell never drains events while paused anyway, and the oscillators-started-while-suspended question is unanswerable through a stub — do NOT invent a strawman-red leg asserting silence-at-the-node-level; audibility during pause is pinned by the shell seams L8 + the live-browser pass). L2 also asserts the POST-resume start (the "resume" column: the bus re-arms, nothing stays locked out).
- **D4 — `chargeUsed` stays audio-silent; the matrix has exactly eight voices** (see the table note). The 9th-name trap is pre-fenced twice (`ceilingbreak §6`, `iframesjuice:596`); L5 restates it locally so a mutant can't add the voice without dying twice.
- **D5 — green-first is HONEST here**: this is a regression sweep, not a bug-fix story — every leg is a verify-and-pin leg, GREEN from first write (like 5.4's L4-L11 class). NEVER "fix" a green leg into red to manufacture a repro. The red-first requirement is satisfied at the MUTATION layer: Task 4 must land every leg's kill (8 mutants, one red set each, Debug-Log census table). Any gold-tree red = real finding → Decision D5 stop-and-report, product fix requires an explicit Debug-Log-recorded exception (and it would leave the zero-delta set — so it would also need Main's sign-off).
- **D6 — live-browser re-run is a real story task (Task 5), scratch-side**: static server inside a temp dir, route-intercept the `audio/track.ogg` GET (count + 404-graceful leg — the file's ABSENT leg is FR29's live face; serving synthesized track CONTENT is 5.6's lane), Chromium drives: no-context-before-gesture → tap constructs one → P-pause suspends / resume running → Mute zeroes master (read via `page.evaluate` on a probe hook the scratch page installs — NO product hook) → reload with persisted settings → gain pre-gesture. Evidence lines into the Debug Log + the ledger stamp at `deferred-work.md:32`. If the driver genuinely cannot launch on this host, that is an environment blocker to report with the failed command, not a silent skip (the UAT lane `deferred-work.md:166` was scheduled precisely because audit envs can't re-run it).

## Tasks / Subtasks

- [x] Task 1 — Write `tests/audiolifecycle.test.js` Part A, legs L1-L7 (AC: 1, 2, 3). Header comment: harness-copy donor list (Context §5), "frozen suites are donors, never imports".
  - [x] 1a. L1 gesture-gate × 8 (names derived per D2): cold factory → `handleEvent(name)` → zero gains, zero oscillators, zero bufferSources, zero `started`, no throw; `gesture(ctx)` → still ZERO started (no queued blast, D-N08); then `handleEvent(name)` → `started >= 1` and every created voice node's connect trace reaches `master` → `destination` (single-bus assert per voice).
  - [x] 1b. L2 suspend-window + resume × 8 (D3): after gesture, `audio.suspend()` → state suspended, suspends===1; per name: `handleEvent(name)` → `resumes` frozen, state stays `suspended`, no throw; `gesture(ctx)` → running; `handleEvent(name)` → `started` advances (no lock-out).
  - [x] 1c. L3 mute × 8: `setMuted(true)` → master `gainNodes[0].gain.value === 0` AND storage write each call; every name attempted → gain stays EXACTLY 0; `toggleMute()` → gain === settings.volume (0.5 if set in-leg). L4 volume × 8: `setVolume(0.5)` → gain 0.5 + persisted `{muted:false, volume:0.5}`; every name attempted → gain unmoved (voices never write master); re-set write-through persists per call.
  - [x] 1d. L5 fences, no boots: VOICES names sorted === the derived eight (`chargeUsed` ABSENT); `handleEvent('chargeUsed')` starts zero; `'./audio.js'` specifier count in `js/` === 1 (`shell.js:64`); `audio/track.ogg` literal only at `audio.js:8`; `chargeUsed` appears in `js/` ONLY at `game.js:223` + the `shell.js:18` juice row.
  - [x] 1e. L6 restore legs (AC2): fresh factory over seeded Map storage — `{volume:0.3, muted:false}` → first gesture gain EXACTLY 0.3; `{volume:0.3, muted:true}` → EXACTLY 0; all eight names attempted after → unmoved; coerce trio: `volume:0` survives as 0 (zero-is-legal, `audio.js:10-16`), corrupt blob → `{muted:false, volume:1}`, crafted `{muted:false, volume:0.5, reducedMotion:true}` → EXACTLY `{muted:false, volume:0.5}` (the 5.4-L10 law, audio side).
  - [x] 1f. L7 track walk (AC3 restatement): rejecting `fetchFn` counter; gesture → count EXACTLY 1; suspend → gesture → setMuted → setVolume → settle → `trackMissing true`, `trackPlaying false`, count STILL 1 (zero retries); `fetchFn` throwing-sync variant → same flags, no unhandled rejection.
- [x] Task 2 — Part B boot legs, ≤4 boots (AC: 1, 2).
  - [x] 2a. L8 lifecycle walk with the voice log (boot A: P path; boot B: visibility path; Context §3 seams): running → tap(gesture, one context) → events drain to the log → P (or hidden+`visibilitychange`) → suspends log EXACTLY 1, state suspended, **log length frozen across the paused window while frames keep running** (the drain gate holds — no voice may cross a pause) → P/visible → state running via gesture → log advances again, no burst beyond live events. Focus-after-hidden-pause must NOT un-suspend (guard `shell.js:346-347`; donor `polish.test.js:407-436`).
  - [x] 2b. L9 reload × old+new (two boots, shared Map): boot A tap → `Minus`×5 → persisted `{muted:false, volume:0.5}`; boot B first tap → EXACTLY one context, master gain 0.5 BEFORE any voice; scripted jumper drains real `skip`/`jump` (old channel), direct `__audio.handleEvent` for `win`/`ascend`/`ropeLost` (new channel) → gain stays 0.5; every logged name ∈ the eight (no unknown name on the live channel — the AC1 event-set claim on a real run).
- [x] Task 3 — Run the gate; expect ALL legs green first write (D5 — any red = finding, stop-and-report). Land R1 verbatim in BOTH census files (restores the two creation-window reds). Full gate ≈513/513, wall time recorded. (ACTUAL: 514/514 — nine new legs; L8's two boots share one test() so the census is 9, the runner counts 9; wall 8.6 s.)
- [x] Task 4 — Mutation battery on `/tmp` clones (every number in the Debug Log): **M1** `play()` drops its guard → L1 red. **M2** `handleEvent` revives a suspended ctx (`ctx.resume()` inside the dispatch) → L2 red. **M3** `setMuted` skips `applyGain()` → L3 red. **M4** `setVolume` drops `saveSettings` → L4 persistence assert red. **M5** `gesture()` hardcodes `master.gain.value = 1` → L6 + L9 red (restore dead). **M6** `playTrack` catch stops setting `trackMissing` (retry refetch) → L7 count red. **M7** a `chargeUsed` VOICES entry → L5 red AND `ceilingbreak §6` + `iframesjuice:596` red (name the cross-fence kill). **M8** `shell.js:246` suspend call deleted → L8 suspends-counter red. All eight die; gold survives green at the recorded count.
- [x] Task 5 — Live-browser re-run (carry-in, AC1's GUI face + AC3's 404 face): scratch static server + route-intercept, Chromium via bunx/uv (Decision D6, Context §6); drive the checklist D6 lists (audio surface: gesture-gate, pause/resume suspend, Mute persistence, reload settings-restore pre-gesture, `track.ogg` exactly-one-GET 404-graceful). Evidence N/N PASS lines → Debug Log; append the RE-EXERCISED stamp sub-bullet under `deferred-work.md:32`. Nothing enters the repo from this task but the ledger stamp.
- [x] Task 6 — Dev Agent Record: actual gate counts + wall time, mutation census table, Debug Log incl. live-run evidence, sha list; confirm untouched-green by inspection (`audio.test.js` twelve, boundary five, polish suspend pair `:260/:407`, both §6/§4.3 censuses); set status review.

## Dev Notes

### The one paragraph that prevents the top three disasters

This story touches ZERO product code — if your diff shows a character of `js/`, you have misread it (disaster 1: "fixing" a guard the matrix was invented to praise). The guards ARE shared machinery (`play()` funnel, master bus, state-guarded suspend pair): your legs must look IDENTICAL in shape across all eight voices — the divergence in the log is the finding, not a reason to special-case a voice (disaster 2: writing per-voice strawmen, e.g. asserting node-start-silence during suspend, which D3 forbids and no stub can honestly answer). And `tests/audio.test.js` is sacred: it is a VERIFY-CONTRACT protected `tests/` path, AC3's pinned-unchanged exhibit, and the donor mine for every harness you need — copying `makeAudioContext`/`bootAudioShell` into your new file is required, importing from it or editing it reddens the censuses and fails review (disaster 3: "tidying" the donor file or adding a leg to it "for locality").

### What each guard leg asserts (doctrine in one line each)

- GESTURE-GATE = no nodes exist and nothing starts before the first `gesture()`; the post-gesture first attempt DOES start (no queued blast either way) — the law `audio.test.js:151` set for v1's five, extended by census to eight.
- SUSPEND-RESUME = dispatch never un-suspends by itself (`resumes` frozen); the shell's `gesture()` on resume re-arms the bus (post-resume attempt starts); audibility-during-pause is context-time + the drain-gate freeze, proven at the shell layer (L8) and live (Task 5), never asserted at node level through a stub (D3).
- MASTER-BUS = the master gain node is the single volume truth: per-voice attempts never move it; `setVolume`/`setMuted` move it (and persist) immediately; a reloaded boot lands the persisted value at creation (`audio.js:75`) before the first voice.
- SILENCE = unknown names (`offer`, `chargeUsed`, `nonsense`) and the absent track add ZERO node starts and ZERO repeated fetch attempts — silence is structural (lookup + sticky flags), not timing.

### Project Structure Notes

- New file `tests/audiolifecycle.test.js` joins the flat `tests/` set; name = the FR27 surface (matches `reducedmotion`/`ascentstinger` naming). No new dirs, no shared-harness extraction (the ledger's harness-dedup lane owns that; copying is ratified doctrine — 5.4 note).
- Direct `../js/audio.js` import is allowed and precedented (`audio.test.js:6` rationale: leaf module, zero imports, boundary re-audits it for free). No relative specifier into `js/` beyond `audio.js` in the new file (SPECIFIER_RE fence, `boundary.test.js:12`).

### Project Context Rules

- No `project-context.md` exists; binding conventions live in `AGENTS.md` + VERIFY-CONTRACT: one gate `./run_tests.sh`; tests/ protected paths (rule 3); "gesture/audio guards get red-green test legs when written, **not at verification**" (`AGENTS.md:54`) — this verification story is precisely the *not-red-green* class: pinned invariants + mutation-battery falsification (D5); dependency-free (live run is scratch-side, Task 5); DOM/wall-clock/storage stay inside `shell.js` — your stub harness follows the `audio.test.js` injection pattern, never a product-side hook.

### References

- `epics.md:805-825` (this story), `:67` (FR27), `:61` (FR24 seam), `:68-69` (FR28/FR29), `:77` (NFR4), `:142-148` (FR→story map), `:723` (Epic 5 FR/NFR coverage)
- `architecture.md:16` (lifecycle row), `:47` (audio module row: "gesture-lifecycle AudioContext, suspend/resume guards; sim graph stays audio-free")
- `js/audio.js:7-8, 10-16, 20-43, 64-66, 68-93, 98-128, 179-182, 184-214, 217-237, 239-256`; `js/shell.js:15-22, 57-73, 176-198, 205-216, 235-263, 265-280, 327-348, 384, 421, 640-646, 683`; `js/game.js:159-277` (event pushes; `:223` chargeUsed)
- `tests/audio.test.js:24-101, 105-167, 194-210, 212-248, 250-264, 291-437, 438-512` (donors + premises + AC3 set); `tests/polish.test.js:187-191, 260-303, 407-436`; `tests/ceilingbreak.test.js:511-518, 546-598`; `tests/iframesjuice.test.js:596-613`; `tests/ascentstinger.test.js:241-271`; `tests/ropelossthud.test.js:179-268`; `tests/boundary.test.js:12, 52, 103`
- `deferred-work.md:32` (the carry-in), `:142` (owner → 5.5 CONFIRMED), `:166` (UAT lane); `1-5-input-hygiene-v1-parity-proof.md:67, 89, 162` (the live idiom + the deferral into this story); `5-4-reduced-motion-for-new-states-the-wr-02-fix.md` (loop-contract + honest-red framing template)

## Dev Agent Record

### Agent Model Used

lane-qwen38-ultra/qwen (omp worker `DevStory55`), 2026-11-09.

### Debug Log References

- **Gate before (baseline, at `72beb6b` tree):** `503/505 passed`, `# duration_ms 8569.881652` — the two reds are the sanctioned creation-window diff-censuses (`ceilingbreak §6`, `summitapproach §4.3`), restored by R1.
- **First solo run of the new suite (harness bugs, NOT product):** `# tests 10 / # pass 7 / # fail 3` — (a) missing `fileURLToPath` import (file-level ReferenceError, fixed), then boot-leg causes, all in MY harness: (b) pump read `views.at(-1)` before the first render (fixed: first-frame guard), (c) post-RESUME pumps asserted a live jumper, but `resumeFromPause` re-arms the D-07 lead-in lock on the WALL clock (`reentryAt = performance.now()`, 450 real ms) while the pump advances virtual time — holds are legitimately discarded and the run may die ropeLost→trip; added `pumpPostResume` (tolerates the honest death; log still advances), (d) boot env didn't expose the document stub for `document.hidden`, and the pause-prompt renders one frame later (donor polish:419-427 shape) — fixed. No product assertion was ever red: the red-first ordering is N/A in this story (`:69`, D5); all nine legs are observe-and-pin, GREEN by product behavior; falsification lives exclusively in the battery below.
- **Leg count:** L8 ships as ONE leg with two boots (story Task 2a "boot A: P path; boot B: visibility path" inside a single L8) → new suite = 9 legs, `# tests 9 / # pass 9 / # fail 0` solo (87–106 ms).
- **Gate after (green-first confirmed, 4 full runs):** `514/514 passed` ×4; `# duration_ms 8580.341013` / `8569`/`8596` — wall 8.6–8.7 s, under the NFR4 10 s budget (505 + 9). Boots added: exactly 4 (≤4 contract honored; no `setTimeout` chains — only `settle()`).
- **Zero-delta verification:** `git diff js/ css/ index.html package.json run_tests.sh | wc -c` → `0`. `git diff --name-only` at dev = `tests/ceilingbreak.test.js`, `tests/summitapproach.test.js` (+untracked new suite + artifacts) — the story's exact set; both censuses green with R1.
- **R1:** landed verbatim — `ceilingbreak.test.js` insert after :597, `summitapproach.test.js` insert after :878, same 3-line comment + two entries, both sets.
- **Mutation battery (Task 4, `/tmp/mut55` full clone + synced working tree; gold tree untouched; anchors asserted before write):**

| Mutant | File | Red count (of 514) | Named legs killed (story prediction) | Collateral frozen-premise reds (expected — shared law broken) |
|---|---|---|---|---|
| M1 `play()` guard dropped | audio.js | 25 | **L1** ✓ | audio.test.js inert-pre-gesture/voice-map, ascentstinger pre-gesture pair + NFR8 A/B legs, juice/feel timelines, v1parity, summitapproach drain legs |
| M2 sneaky resume in `handleEvent` | audio.js | **1** | **L2** — SOLE kill ✓ | none (cleanest kill; the D3 law is 5.5-only coverage) |
| M3 `setMuted` skips `applyGain` | audio.js | 6 | **L3** ✓ | audio.test.js one-bus, ascentstinger/ropelossthud muted-bus legs, AUD-04 c5 |
| M4 `setVolume` drops `saveSettings` | audio.js | 5 | **L4** persistence ✓ + L3 write-through assert + **L9** | audio.test.js AUD-04 shell-seam reload, AUD-04 c5 |
| M5 `gesture()` hardcodes gain 1 | audio.js | 5 | **L6 + L9** ✓ (restore dead) | audio.test.js settings round-trip, AUD-04 shell-seam, AUD-04 c5 |
| M6 `trackMissing` never set | audio.js | 4 | **L7** count ✓ | audio.test.js D-N09 absent-file, AUD-02/D-N09 mechanism leg |
| M7 `chargeUsed` VOICES entry | audio.js | 4 | **L5** ✓ + **ceilingbreak §6** + **iframesjuice:596-613** (summit `sim channel` leg) — the D4 double-death named | oracle-signature disjointness leg |
| M8 `shell.js:246` suspend deleted | shell.js | 5 | **L8** suspends-counter ✓ (both boots) | polish manual-pause/resume/tab-hide/CR-01 legs |
| GOLD control (clone, no mutant) | — | 0 | `# pass 514 / # fail 0` ✓ | — |

  Mutant diffs are one-string replacements at the anchors named in Task 4 (`play()` guard line; `handleEvent` opener; `setMuted` body; `setVolume` body; `gesture()` master-gain line `:75`; async `catch` arm; VOICES before the `win:` entry; the `audio.suspend?.()` call). Script: `/tmp/battery55.sh` (scratch). Note: M5's first application anchor-missed on indentation (4 vs 6 spaces inside the `if (!ctx)` arm) and was re-run with the corrected anchor — recorded so the count `5` is traceable.
- **Live-browser re-run (Task 5, D6):** driver attempts — (1) `bun add playwright` (1.65.0) failed launch: `Executable doesn't exist at ~/.cache/ms-playwright/chromium_headless_shell-1254/...` (package wants build 1254; cache has 1243/1248); (2) `chromium.launch({executablePath: ~/.cache/ms-playwright/chromium-1248/chrome-linux-arm64/chrome})` → LAUNCH OK. Scratch: static server on 127.0.0.1 ephemeral port + route-intercept `**/audio/track.ogg` → count + 404; page = real boot shape (importmap three@0.186.1 jsdelivr — reachable, HEAD 200; probe hook page-side only). **Run 1: 15/16 — sole FAIL `C5b persisted-volume-lands-at-creation {"n":1,"gain":0.8999999761581421}`: the REAL-browser law discovered — `master.gain` is a float32 AudioParam; the persisted double lands quantized. Not a bug; the live check was corrected to `gain === Math.fround(stored.volume)`.** **Run 2 + Run 3: 16/16 PASS** ×2, verbatim:

  ```
  PASS C1 no-context-before-gesture
  PASS C2 tap-constructs-one-context — {"n":1,"state":"running","gain":1}
  PASS C2b context-running-after-gesture — running
  PASS C2c master-gain-default-1 — 1
  PASS C3 pause-suspends — suspended
  PASS C3b resume-running — running
  PASS C4 mute-zeroes-master — 0
  PASS C4b unmute-restores-master — 1
  PASS C4c minus-persists-0.9 — 0.9
  PASS C5 reload-no-context-before-gesture — {"n":0,"stored":{"muted":false,"volume":0.9}}
  PASS C5b persisted-volume-lands-at-creation(float32 law) — {"gain":0.8999999761581421,"stored":{"muted":false,"volume":0.9}}
  PASS C5b2 exactly-one-context-on-reloaded-boot — 1
  PASS C6 track-gets-exactly-one-per-boot — total GETs=2 (2 boots)
  PASS C6b zero-retries-after-settling — total GETs=2
  PASS C6c no-page-errors-with-absent-track
  PASS C7 shell-alive-under-track-absence — score='2' prompt='Missed! Altitude 2 best 2'
  LIVE-BROWSER AUDIO SURFACE: 16/16 PASS
  ```
- **Ledger:** RE-EXERCISED stamp appended as sub-bullet under `deferred-work.md:32` (rides both allow-sets).
- **Float law note (L9):** `Minus`×5 persists `0.5000000000000001` (repeated `-0.1`), verified; the leg asserts `gain === persisted value` (both sides of the seam) + a `~0.5` band — never a `deepEqual 0.5` literal.
- **Untouched-green by inspection:** `audio.test.js` 12 legs, `boundary.test.js` 5 legs, `polish.test.js:260/:407` suspend pair, both diff-censuses — all green in the 514/514 runs; every `js/` byte identical.

### Completion Notes List

- FR27 matrix now leg-pinned per voice: the guards are proven voice-AGNOSTIC by construction — L1-L4 loop over the SOURCE-DERIVED census (donor regex, never a retyped list), every name asserting the identical oracle shape. AC1/AC2/AC3/AC4 all mapped (see the story's AC map); AC4 green by zero-wiring-delta inheritance + L5's source censuses (`'./audio.js'` ×1 at `shell.js:64`, `audio/track.ogg` ×1 at `audio.js:8`, `chargeUsed` ×2 at `game.js:223`/`shell.js:18`).
- Product delta ZERO verified byte-level; `tests/audio.test.js` and every frozen file untouched (copy-donors doctrine; harness fork documented in the suite header).
- Falsification: 8/8 mutants killed with the story-predicted red sets (table above); M2 kills L2 alone; M7 dies twice at the frozen fences as D4 requires; gold clone control green.
- Green-first doctrine honored literally: story :69/D5 override red-first — no leg was written red, none went red on the gold tree, no product patch exists or was sanctioned. Debug-Log round: L1/L2 shipped as honest observe-and-pin legs; red lives only in the battery (M1→L1, M2→L2).
- Boot budget: 4 boots (L8 two + L9 two), suite wall 8.6–8.7 s — NFR4 met.
- Surprise worth remembering (live): AudioParam float32 quantization — the headless double-stub cannot show it; the live lane caught it by being real (exactly why D6 exists).

### File List

- `tests/audiolifecycle.test.js` (NEW — the 9-leg matrix suite)
- `tests/ceilingbreak.test.js` (R1 census append only)
- `tests/summitapproach.test.js` (R1 census append only)
- `_bmad-output/implementation-artifacts/deferred-work.md` (one RE-EXERCISED ledger stamp under :32)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (5-5 → review)
- `_bmad-output/implementation-artifacts/5-5-audio-lifecycle-regression-sweep.md` (this record)
