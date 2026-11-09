---
baseline_commit: 0823ec9
---
# Story 5.6: TRACK-1 — the music content

Status: review

Note: Ultimate context engine analysis completed — comprehensive developer guide created (2026-11-09).

Baseline: `0823ec9` (Story 5.5 done — audio lifecycle matrix 514/514 green ×5, wall ~8.6 s, tree clean, verified at authoring time 2026-11-09). Sixth story of Feel & Fidelity and the FIRST story in repo history to ship a **binary asset**: `audio/track.ogg`. The mechanism is fully shipped and test-pinned (`js/audio.js:98-128` — fetch → decode → ONE looping source on the master bus, `source.loop = true` at `:117`); every silence leg is already frozen green around the ABSENT file. This story ships the CONTENT only: zero mechanism-code changes (AC1's own words), one committed Ogg file, and a new metadata/mechanism test suite. Both epics pre-gates (sourcing, direction) were RESOLVED at the Epic 5 entry probe — see Decisions; do not re-open them.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want the demake to carry one looping music track,
So that the PS1 fiction is complete and the mix has a floor under the procedural voices. (Added by the 2026-11-07 readiness audit, decision D-002; closes the PRD's TRACK-1 open item.)

## Acceptance Criteria

(verbatim from `_bmad-output/planning-artifacts/epics.md:831-851` — FR29, NFR6; the two kickoff-gate ACs are **already decided** — see Decisions D1/D2 and the map below)

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

### AC-to-verification map (decided — do not re-litigate)

| AC | How it is proven |
|---|---|
| AC1 (loops seamlessly on the bus, honors volume/mute, never pre-gesture; **zero mechanism-code changes**) | The mechanism ALREADY does all of it: gesture→`playTrack()` (`js/audio.js:82`), single-fetch guard (`:101`), decode→`source.loop = true`→`connect(master)`→`start(0)` (`:114-121`; loop at `:117` — **verified present at the source; there is no loop gap and NO open question on this axis**), sticky-failure flags (`:123-126`). NO `onended` handler exists anywhere in `js/` (grep-verified — with `loop = true` the buffer wraps natively at the decoded-PCM level; there is nothing to restart). Node-side legs (Task 4) re-pin this against the REAL bytes; volume/mute ride the master gain the track is connected INTO (`:118`; `applyGain` `:64-66`) — pinned by the frozen legs. Seamlessness AT THE WRAP is a pure content property (Task 1's construction) and observable live (Task 5). Product delta: ZERO bytes in `js/` — a mechanism edit here is a contract violation. |
| AC2 (Ogg Vorbis, seamless, ≤ 3 MB, loudness-coherent) | Metadata legs (Task 3): `OggS` magic + Vorbis identification header parsed with `fs` + `DataView` (version/channels/rate — Node cannot and must not decode ogg), file size ≤ 3,145,728 B, loop metadata ABSENT by design (documented below). Loudness coherence is a MEASURED number, not a vibe: see D5 (single-voice peak **0.2500 = −12.0 dBFS**, measured via the offline-render harness described in Context §4; track true-peak gate **≤ 0.126 = −18.0 dBFS**). Seamless construction per D4/Task 1. |
| AC3 (sourcing decided at kickoff) | **RESOLVED** at the Epic 5 entry probe, user answer recorded at `deferred-work.md:168`: GENERATED OFFLINE on this machine, one committed binary; the generator lives OUTSIDE the repo. Satisfied by this story file — nothing to execute. |
| AC4 (direction decided at kickoff) | **RESOLVED** in the same entry-probe answer (`deferred-work.md:168`): PS1 lo-fi chiptune floor, sparse square/tri, free-running, ZERO rhythmic relation to the rope — GDD pillar 2 (`_bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md:104-107` "Nothing may re-clock it — no beat-lock, no scripted cut-away"), the demake-ethics line (`gdd.md:80-83`, Out-of-Scope `gdd.md:502-503`, `decision-log.md:13`). No sound-style changes to the Epic 5 voices — VOICES stays frozen at eight (`tests/ceilingbreak.test.js:511-518` fence). Satisfied by Decisions D1/D2. |
| AC5 (absent-file silence legs byte-identical green) | The four `tests/audio.test.js` legs (`:114`, `:168-192`, `:194-209`, `:342`), `tests/feelcap.test.js:600-641` (AUD-02 Part A/B), and `tests/audiolifecycle.test.js` L7 (`:301-337`) + L5 census (`:231-263`) run UNCHANGED and green WITH the file on disk: every one of them injects its own `fetchFn`/route stub, and a relative-URL `fetch('audio/track.ogg')` inside Node always throws (invalid URL) — the disk file CANNOT leak into a stubbed leg. L5's census walks only `readdir(jsDir)` filtered to `.js` (`audiolifecycle.test.js:247`), so a new `audio/` directory with a binary inside is invisible to it — verified. |

### The loop mechanism, verified at the source (the story's central risk — RESOLVED)

`playTrack` (`js/audio.js:98-128`) is complete for seamless looping **without any mechanism change**:
- `:101` re-entry/absence guard (`!master || !fetchFn || trackPlaying || trackMissing || trackPending`), `:102` synchronous pending flip (WR-04);
- `:111-113` `fetchFn(url)` → `r.ok` → `arrayBuffer()` → `ctx.decodeAudioData(buf)`;
- `:114-121` on decode: `createBufferSource()` → `buffer = decoded` → **`source.loop = true` (`:117`)** → `source.connect(master)` (`:118`) → `source.start(0)` (`:119`) → flags flip (`:120-121`);
- `:123-126` catch: `trackPending = false; trackMissing = true` — sticky, never a retry;
- NO `onended` anywhere in `js/` (grep-verified): with `loop = true` the decoded AudioBuffer wraps natively; the module never restarts and never needs to.

Consequence for the CONTENT spec: seamless means **the decoded PCM buffer must be periodic** — the loop is a property of the rendered samples, NOT of the Ogg container. No Vorbis/bitstream loop metadata (LOOP_START/LOOP_END tags, reservoir tricks) is read by `decodeAudioData` + `source.loop`; the encode needs nothing special, and the file deliberately carries NO loop metadata (Task 3 pins that absence so nobody later "fixes" the loop in the wrong layer). What CAN produce a click at the wrap: a non-periodic arrangement (release tails cut at the file end) — Task 1's two-pass construction eliminates that by design.

### Loop contract (binding)

- Gate `./run_tests.sh` before any edit: **514/514** at `0823ec9` (verified at authoring; wall ~8.6 s). NOTE the sanctioned creation-window reds: this story's creation commit makes `git diff <BASE>` list a NEW artifact path, so BOTH diff-census legs (`ceilingbreak §6` :546, BASE `5659fd4` at `:550`; `summitapproach §4.3` :827, BASE `2c3e693` at `:831`) read red **until R1 lands (Task 3)** — same mechanism as 5.4/5.5 (see 5.5 story :68). Kickoff gate = 512/514 with exactly those two reds; after Task 3: 514 + the new suite's legs, suite < 10 s (NFR4 — metadata legs are pure `fs`/`DataView`, no boots, no `setTimeout` chains; ≤2 boots TOTAL if the mechanism legs reuse the `audio.test.js` stub shape). Report ACTUAL counts from the real run.
- **Product-code delta: ZERO.** `js/`, `css/`, `index.html`, `package.json`, `run_tests.sh` byte-identical (`git diff js/ css/ index.html package.json run_tests.sh | wc -c` → `0` at dev end). No new deps, no build step (NFR6, `epics.md:79`; AGENTS.md zero-npm law — the generator runs from scratch with system node/ffmpeg only). The ONLY repo additions: `audio/track.ogg` (first committed binary), `tests/track1.test.js`, R1's two census appends, and the artifacts. If a leg goes red against the gold tree in a way R1 does not explain, STOP and report (5.5 D5 doctrine) — a product fix is NOT sanctioned.
- Existing test files frozen **except R1** (below). `tests/audio.test.js`, `tests/feelcap.test.js`, `tests/audiolifecycle.test.js`, `tests/boundary.test.js` and every other existing suite stay **byte-identical** — they are AC5's exhibit and the donor mine (copy, never import or edit).
- `git diff --name-only` after dev must be EXACTLY: `audio/track.ogg`, `tests/track1.test.js`, `tests/ceilingbreak.test.js`, `tests/summitapproach.test.js`, `_bmad-output/implementation-artifacts/deferred-work.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`, this artifact — zero product files.
- Determinism (NFR4): `tests/track1.test.js` reads the COMMITTED file and asserts metadata/size/census facts only — never decode, never wall clock. The generator itself must be seed-pinned so a re-run reproduces a byte-identical WAV (the committed ogg's sha is recorded once in the Debug Log; encoder output is deterministic for a fixed ffmpeg version — record `ffmpeg -version` in the same entry).

### R1 — Sanctioned extension of the two diff-census tripwires (both files; written-authorization rule as in 5.1/5.2 R2, 5.3 R3, 5.4/5.5 R1)

5.6's changed-vs-base set adds exactly THREE paths: the binary asset, the new suite, and this artifact (`deferred-work.md`/`sprint-status.yaml` already ride both sets; the census files self-carry). Both legs list paths only — no frozen leg's behavior changes. Authorized diff, in BOTH sets, insert verbatim before the closing `]);`:

- `tests/ceilingbreak.test.js` (set closes at `:603`, 5.5 tail entries `:601-602`): insert after `:602`

  ```js
  // Story 5.6 sanctioned re-contract R1 (2026-11-09): zero product-code delta —
  // the committed music asset, the track1 metadata suite, and this story's
  // artifact join the set; the live-browser lane lands Debug-Log evidence +
  // the ledger stamp only.
  'audio/track.ogg',
  'tests/track1.test.js',
  '_bmad-output/implementation-artifacts/5-6-track-1-music-content.md',
  ```

- `tests/summitapproach.test.js` (set closes at `:884`, 5.5 tail entries `:882-883`): insert after `:883`, same comment + three entries.

Zero other changes in either file. (The census runs `git diff --name-only <pinned BASE>` — a committed BINARY lists as a plain path name, exactly like the `.js` entries; verified against the leg mechanics at `ceilingbreak.test.js:546-604`.)

### Scope boundary vs neighboring stories

- **VOICES is frozen at eight; no retune** — the mix floor changes NO voice level (`ceilingbreak §6` fence; any 5.6-era mix retune is the 6.2 lane, D-N12). `js/audio.js` byte-identical.
- **Pause-menu config UI is 5.7** (`epics.md:853+`); this story adds zero UI, only the content 5.7's controls will already control (they ride the same master gain).
- **The 5.5 live-browser RE-EXERCISED evidence (`deferred-work.md:32`) stays true**: it pinned the ABSENT-file 404 face; Task 5 keeps that face honest via route-intercept ABORT while the new legs assert the PRESENT-file behavior (`epics.md:847` AC3 face re-stated live).
- `epics.md`/`architecture.md`/`gdd*` are in NEITHER allow-set — read-only here. The ledger write is the ONE 5.6 stamp (Task 6).
- The track must not clock the rope — pillar 2 is a HARD law (`gdd.md:104-107`); D4's tempo math is the compliance proof, and Task 1 bans percussion/transient material outright.

## Context — shipped state (verified against the tree at 0823ec9)

1. **The track mechanism** (`js/audio.js`): `TRACK_URL = 'audio/track.ogg'` `:8`; `gesture()` calls `playTrack()` once at first context bind `:82`; `playTrack` `:98-128` exactly as the "loop mechanism" section above (guard `:101`, pending `:102`, sync-throw arm `:104-110`, decode chain `:111-113`, loop/connect/start `:115-119`, sticky catch `:123-126`). `suspend()` `:91-93` and the resume arm `:83-85` never touch the track — context-time freeze/resume carries the music for free. Master bus: `master` gain created at `:74-76` (seeded from persisted settings `:75`), the ONLY volume/mute truth (`applyGain` `:64-66`); the track connects INTO it (`:118`), so persisted volume/mute apply to the track with zero code of its own. Shell seam: dynamic sole-consumer import `shell.js:64` (`'./audio.js'` ×1 census, `audiolifecycle.test.js:259-260`), `fetchFn: typeof fetch === 'function' ? fetch : undefined` `shell.js:68`.
2. **Frozen silence pins (AC5 set, byte-identical)**: `audio.test.js:114` (no fetchFn → `playTrack()` false), `:168-192` (absent = flag+silence / present = one looping source `loop===true` on the bus `:189-191`), `:194-209` (WR-04 re-entry), `:342` (shell harness ships a rejecting fetch); `feelcap.test.js:600-641` (AUD-02 Part A rejecting fetch → zero track sources + zero unhandled rejections; Part B resolving fetch → exactly ONE `loop:true` source sharing the master bus `:632-634`); `audiolifecycle.test.js` L7 `:301-337` (one fetch, zero retries, sticky flags, sync-throw arm), L5 `:231-263` (eight-name census; `'./audio.js'` ×1; the `audio/track.ogg` literal lives ONLY at `js/audio.js:8` — `trackHits` deep-equals `['audio.js:8']` `:262-263`).
3. **Serving**: `index.html` importmap (`index.html:9-15`) pins ONLY `three@0.186.1` — nothing new is needed for a fetched file (no `<audio>` tag exists; the track is `fetch`+`decodeAudioData`). `TRACK_URL` is relative → the browser resolves it against the document base, so any static server rooted at the repo root serves the new `audio/track.ogg` at `GET /audio/track.ogg` (AGENTS.md serve note: `npx serve .` / `python3 -m http.server`). There is NO `audio/` directory at baseline (verified — this story creates it, and this file is the repo's first binary).
4. **Procedural voice levels — MEASURED, not guessed** (offline-render harness over the real `js/audio.js` with a graph-recording stub, 48 kHz, master gain 1.0; the harness lives scratch-side, its numbers are contract): per-voice master-bus peaks — `jump`/`skip`/`nearMiss`/`ropeLost`/`pick`/`win` **0.2500 (−12.0 dBFS)** (the `tone()` envelope floor, `audio.js:151`), `trip` **0.2012 (−13.9 dBFS)** (`noiseHit` envelope 0.4 at `audio.js:168` through the lowpass; one-pole model = upper-realistic bound), `ascend` **0.2518 (−11.97 dBFS)** (two staggered squares overlap); plausible same-frame collision `trip+nearMiss+skip` **0.5090 (−5.9 dBFS)**; adversarial all-eight-at-once 1.1436 (shipped behavior, out of scope). The voice synth is therefore the loudness ruler for D5.
5. **The rope clock (pillar-2 math input)**: `ROPE_PERIOD = 1.3` (`js/game.js:15`; PRD/epics FR25 `epics.md:62`). The GDD law: `_bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md:80-83` (demake-ethics line: "no beat-locked soundtrack… syncing the rope to music would track too closely"), `:104-107` (pillar 2: "The rope is the clock… Nothing may re-clock it — no beat-lock"), `:415-416` ("Audio follows gameplay; the rope is never beat-locked"), `:502-503` (Out-of-Scope: Beat-locked music); `decision-log.md:13`.
6. **Tooling at authoring (verified)**: ffmpeg 6.1.1 WITH `libvorbis` encoder (encoders list grepped); node v26.8.1 (generator + tests); bun present; python3 present but NO numpy/soundfile — generator is therefore a zero-dependency **Node** script, not Python. Live-browser lane: the 5.5 idiom — scratch-side `bunx playwright`, Chromium via `executablePath: ~/.cache/ms-playwright/chromium-1248/chrome-linux-arm64/chrome` (the 1254-headless-shell default fails; 5.5 Debug Log), static server on 127.0.0.1 ephemeral port, route-intercept `**/audio/track.ogg`. Nothing enters the repo from that lane.

## Decisions (baked — `[DECIDED-BY-CREATE]`; do not re-litigate at dev time)

- **D1 — Direction: PS1 lo-fi chiptune floor** (user-decided at the Epic 5 entry probe, `deferred-work.md:168`; epic AC4 satisfied). Sparse SQUARE/TRI material — the same waveform families the eight voices already use (`audio.js:185-208`) — low-register pad + occasional lead, no percussion, no transients, free-running. This IS the GDD's demake-ethics compliance posture: audio may add atmosphere but may NEVER re-clock the rope (pillar 2, `gdd.md:104-107`; `:80-83`). Consequence: a beat-ALIGNED drum track or a track whose tempo is a small-integer multiple of the rope period is a PILLAR VIOLATION, hence D4.
- **D2 — Sourcing: GENERATED OFFLINE on this machine** (same probe answer; epic AC3 satisfied). ONE committed binary `audio/track.ogg`; the generator script + intermediate WAV live OUTSIDE the repo (scratch `/tmp`), only the artifact + provenance (exact commands, checksums, measurements) land in the Debug Log. NO network downloads of music (licensing + offline doctrine), NO new dependency of any kind (NFR6), NO committed generator.
- **D3 — Budget/format: Ogg Vorbis, mono, 44100 Hz, ≤ 3,145,728 bytes (3 MB)**, encoded `ffmpeg 6.1.1 -c:a libvorbis -q:a 3` (VBR ≈ 112-128 kbit/s → ~1.1-1.3 MB for the 79.2 s loop; headroom to the bound is 2×+). Mono + 44.1 k is the honest PS1-redbook-adjacent choice and keeps the metadata legs trivially assertable (channels byte === 1, sample-rate dword === 44100).
- **D4 — Tempo 97 BPM, provably incommensurate with the 1.3 s rope period.** Beat = 60/97 s; rope sweep = 13/10 s. The first instant where beats and sweeps align again is LCM(60/97, 13/10) = LCM(60,13)/GCD(97,10) = **780 s** (proof: alignment needs 60 | 97·L → 60 | L (97⊥60) and 13 | 10·L → 13 | L; 780 works: 1261 beats = 600 sweeps). 780 s > the PRD's 3-5 min summit target ⇒ no session can ever witness a beat/sweep alignment, let alone lock to one; the nearest simple relation (≈2.10 beats/sweep) phases fully every ~9.8 sweeps. DO NOT "round" to 100/104/105/120 BPM — those align at ≤ 7.8 s (e.g. 100 BPM: LCM(0.6, 1.3) = 7.8 s) which is a beat-lock by any honest reading. Structural form: 4/4, 32 bars = 128 beats = 79.1753 s (32 × 240/97); loop-vs-rope realignment LCM(79.1753, 1.3) = 1583.5 s (791.753/1.3 = 609.0 — non-integer, checked).
- **D5 — Loudness: measured targets derived from the voice synth (Context §4).** Single-voice peak = 0.2500 (−12.0 dBFS) at default master 1.0. Track gates: **true-peak ≤ 0.126 linear (−18.0 dBFS)** — strictly BELOW any single voice so every voice pokes through the floor — AND the worst realistic voice stack (0.5090) plus track peak sums to ≤ 0.635 < 1.0, i.e. no master-bus clipping at default volume. Integrated loudness is reported, not gated, at the encode step (`ffmpeg -filter_complex ebur128` — expect ≈ −30…−26 LUFS for sparse sustained material); a measurement above −26 LUFS integrated means the mix is TOO LOUD for a floor — lower the gain, don't compress. Workflow: synthesize at rough per-layer levels (bass 0.06, pad 0.03/voice ×3, lead 0.08), MEASURE peak/LUFS, apply ONE static `volume=` gain to land true-peak at −18.0 dBFS, then encode. NO loudnorm (its internal resample/filter can damage the seam) and NO limiter (a limiter would falsify the wrap construction).
- **D6 — Seamlessness by construction: render the 32-bar form TWICE, keep the SECOND pass.** All harmony is period-32-bar periodic, every envelope release ≤ 0.6 s ≪ 79.18 s; pass 2's head already contains pass 1's late-ring, so pass 2 IS the periodic steady state — its last sample is continuous with its first by construction (sampling-grid caveat: 79.1753 s = 3,491,629.4 samples at 44.1 k; render exactly 3,491,629 samples, a ≤23 µs grid seam — inaudible and stateless). No crossfade hackery, no container metadata (the mechanism section above proves metadata would be dead weight — Task 3 pins its ABSENCE).
- **D7 — NEW suite `tests/track1.test.js`** (the 5.5-D1 precedent): `audio.test.js`/`feelcap.test.js`/`audiolifecycle.test.js` are frozen AC5 exhibits — new legs go in a new file, costs only the R1 path-append. Node legs are METADATA + injected-bytes mechanism legs (Context §6: Node cannot decode ogg and must not pretend); audible faces live in the scratch-browser lane (Task 5), 5.5-D6 idiom.
- **D8 — the 404 face stays honest**: the 5.5 RE-EXERCISED absent-file evidence is history, not fiction — Task 5 RE-VERIFIES it in the same live session via route-intercept ABORT on `**/audio/track.ogg` (silence, no page error, shell alive) while the present-file legs (HTTP 200, exactly one GET) run against the real committed asset.

## Tasks / Subtasks

- [x] Task 1 — Write the offline generator (scratch `/tmp`, OUTSIDE the repo) and render the loop (AC: 1, 2; D1/D4/D6). Zero-dependency Node script, seeded LCG only (no `Math.random`), continuous-time synthesis at 44100 Hz mono, float64 → write raw `f64le` (`pass2.raw`) AND keep `full.raw` (both passes) for re-measure.
  - [x] 1a. Form: 97 BPM, 4/4, 32-bar harmony `Am Am | F F | C C | G G` ×4 (2 bars/chord) in A minor; per bar 2.4742268 s. Layers: triangle bass root (A1 55.0 / F1 43.65 / C2 65.41 / G1 49.0 Hz, downbeat whole-notes, level 0.06); square pad triads (root position, sustained whole-notes, level 0.03 per voice ×3); sparse square lead in A aeolian pentatonic (440–880 Hz, ~one note per 2 bars from the seeded LCG with ≥ 30 % rests, dur 0.5–1.5 bar, flat attack, exponential release ≤ 0.6 s, level 0.08). NO percussion, NO arpeggio clocks (D1).
  - [x] 1b. Render 64 bars (two full passes), discard pass 1, keep exactly samples [pass2_start, pass2_start + 3,491,629) of the rendered stream (D6). Determinism check: re-run, `sha256sum` equal.
  - [x] 1c. Self-checks before leaving scratch: pass2 peak ≤ 0.15 pre-gain (else fix LAYER levels — never a limiter, D5); edge energy sanity (first/last 50 ms RMS > 0.01 — sustained material must not start or end silent); the wrap seam itself needs NO crossfade math here because pass 2 IS the periodic steady state (D6) — the real seam observation is Task 5's live C4. Record the numbers in the Debug Log.
- [x] Task 2 — Gain-match, encode, commit the artifact (AC: 2; D3/D5).
  - [x] 2a. Measure: `ffmpeg -hide_banner -f f64le -ar 44100 -ac 1 -i pass2.raw -filter_complex ebur128 -f null -` → record `Peak:` and `I:`; compute the static gain `G = 0.126 / peak`.
  - [x] 2b. Encode: `ffmpeg -hide_banner -f f64le -ar 44100 -ac 1 -i pass2.raw -af volume=<G> -c:a libvorbis -q:a 3 -map_metadata -1 audio/track.ogg` (exact commands, `ffmpeg -version` line, duration, bitrate, `sha256sum audio/track.ogg` → Debug Log; this provenance IS the artifact's recipe record since the script stays scratch-side).
  - [x] 2c. Verify on the OUTPUT: `ffprobe -show_streams` → codec vorbis, sample_rate 44100, channels 1; size ≤ 3,145,728 B; re-run the ebur128 measurement on the ogg — true-peak within [−18.5, −17.5] dBFS, integrated ≤ −26 LUFS (D5; if the bound breaks, lower G and re-encode — never a limiter). `git add audio/track.ogg` rides the story commit; `file audio/track.ogg` starts with "Ogg data, Vorbis audio" (sanity, not a repo check).
- [x] Task 3 — NEW `tests/track1.test.js`: metadata + census legs, zero boots, pure `fs` + `DataView` (AC: 2, 5; D7). Header comment: frozen suites are donors; why Node never decodes ogg here.
  - [x] 3a. Container/id-header legs: bytes 0-3 === `OggS`; byte 4 (stream structure version) === 0; byte 5 (header_type) & 0x02 (BOS) set; parse page-0 header (`:26` page_segments → segment table `:27..`) → body offset `27 + Σ(segments)`; body starts `0x01 'vorbis'` (7 bytes); at body+7 read `version` uint32 LE === 0, body+11 `channels` uint8 === 1, body+12 `sample_rate` uint32 LE === 44100 (`ffprobe`-independent, DataView only); page 0 `page_sequence` uint32 LE @18 === 0.
  - [x] 3b. Size + loop-metadata absence: `stat.size ≤ 3145728`; scan all pages' comment headers for `LOOP_START`/`LOOP_END`/`REPLAYGAIN` keys and assert ABSENT (D6/D8: the seam is a PCM-construction property; a future tagged-loop hack would be dead code — this leg fences the layer).
  - [x] 3c. Census re-arms (AC5 restatement, local, kills the "someone edited the literal" mutant): the `audio/track.ogg` literal count in `js/*.js` === 1 and located at `audio.js:8` (walk pattern copied from `audiolifecycle.test.js:247-263` — `.js` files under `js/` only, so the audio/ dir is invisible to it); `'./audio.js'` specifier ×1; the VOICES census === the eight (donor regex `ceilingbreak.test.js:513-517`). `tests/boundary.test.js` needs NO touch: it walks only import specifiers from tests (new file imports only `../js/audio.js` + node builtins — fence `boundary.test.js:12` precedent `audiolifecycle` header).
  - [x] 3d. Land R1 verbatim in BOTH census files (restores the two creation-window reds; exact inserts per the R1 section).
- [x] Task 4 — Mechanism legs IN `tests/track1.test.js` with the real committed bytes injected (AC: 1; pins `audio.js:98-128` incl. the loop law at `:117`).
  - [x] 4a. Present-file path: `fetchFn = async (url) => { calls.push(url); return { ok: true, arrayBuffer: async () => fs.readFileSync('audio/track.ogg') } }` over the `audio.test.js` `makeAudioContext` donor stub with `decodeAudioData: buf → Promise.resolve({ marker: true, byteLength: buf.length })` — gesture → one fetch of EXACTLY `'audio/track.ogg'`; after settle: exactly ONE bufferSource, `.loop === true`, `.buffer` the decoded marker, `connectedTo === gainNodes[0]` (master), `start` called ONCE with 0; URL arg equals `js/audio.js:8`'s literal read from source (no hardcoded duplicate of the path).
  - [x] 4b. Loop law / no-restart: source census `(/onended|\.loop\s*=\s*false/)` over `js/` === 0 matches; second `gesture()` (resume arm) + suspend/resume/mute/volume walk → fetch count STAYS 1, bufferSource count stays 1 (no restart machinery exists to trigger — same walk shape as `audiolifecycle.test.js` L7 but on the SUCCESS path); `getStatus().trackPlaying === true`, `trackMissing === false`.
  - [x] 4c. Never pre-gesture + bus honoring: cold factory with the working fetchFn → ZERO fetches, ZERO nodes (`audio.test.js:151` doctrine on the success path); then gesture with persisted `{volume:0.4}` → master gain 0.4 BEFORE the track node exists; `setMuted(true)` → 0 with the track source alive; volume/mute move only the master the track is connected into (no per-track gain node — bufferSources length stays 1, gains count unchanged by track code).
  - [x] 4d. Green-first doctrine: all legs are verify-and-pin (5.5 D5) — any red against gold = stop-and-report with minimal repro; do NOT touch `js/`. Falsification via mutation battery on a `/tmp` clone: **M1** `:117` `loop = true` → `false` → 4a red (the ONLY red — names the line); **M2** `:119` `start(0)` → `onended` restart → 4b red; **M3** guard `:101` drops `trackPending` → second-fetch mutant → 4b count red; **M4** `:82` playTrack call removed from `gesture()` → 4a red AND frozen `audio.test.js:168-192` reds (name the cross-fence kill); **M5** track `connect(ctx.destination)` bypassing master → 4a/4c bus assert red + `feelcap.test.js:633-634` reds. All five die; gold survives at the recorded count; battery table → Debug Log.
- [x] Task 5 — Live-browser lane, scratch-side ONLY (AC: 1 + AC5's live 404 face; D8). Static server rooted at the repo (the NEW `audio/` serves naturally at `GET /audio/track.ogg` via the relative `TRACK_URL` from the index.html root); Chromium per Context §6; page-init probe (scratch page only, NEVER a product hook): wrap `AudioContext.prototype.createBufferSource` (record loop/start), `AudioNode.prototype.connect` (when target === destination, also tap an AnalyserNode), route-intercept counter on `**/audio/track.ogg`. Checklist (evidence lines → Debug Log, same PASS/FAIL idiom as 5.5's C1-C7): C1 pre-gesture GET count 0; C2 first press → exactly one GET, HTTP 200; C3 decode succeeded (source created, start(0), loop=true live); C4 wrap seamlessness — poll the tap RMS every 50 ms across ≥ 2 loop periods (≈ 160 s wall): no ≥ 100 ms zero-RMS window anywhere, RMS in the wrap ±0.25 s band within [0.3×, 3×] of the inter-wrap median (no gap/no click spike ≤ 3×); C5 `Mute` → tap RMS → 0; volume-down key → RMS strictly decreases; reload with persisted `{volume:0.6}` → lands pre-gesture as ever (5.5 legs stay true WITH content — this is the observable that nothing regressed); C6 route-intercept ABORT → silent, zero page errors, shell alive, voices still start (the 404 face HONEST with the file on disk); C7 long-run: still one GET and one source after 3+ loop periods (no leak/restart).
- [x] Task 6 — Record and close (AC: all). Dev Agent Record: actual gate counts + wall (kickoff was 512/514 creation-window — name the two reds), Task 2 provenance block (commands, ffmpeg version, duration/bitrate/size/sha256, both LUFS/peak readings), Task 1 determinism hashes, mutation table, live C1-C7 lines. One ledger stamp under the Epic-5-entry section of `deferred-work.md` (:167-168) recording TRACK-1 PAID (file, sha, measurements, D-006 disposition honored). Confirm untouched-green by inspection: the §AC5 frozen set byte-identical (`git diff` on each), every `js/` byte identical, `index.html` untouched. Set status review.

## Dev Notes

### The one paragraph that prevents the top three disasters

This story ships a FILE, not code — if your diff shows a byte of `js/audio.js`, you have misread it: the loop mechanism is COMPLETE and verified at the source (`source.loop = true` is ALREADY there at `js/audio.js:117`; there is no `onended` to "fix", no restart logic to add — disaster 1 was inventing a mechanism gap and coding around it, and the parent already re-verified this at line level). Disaster 2 is shipping a track you didn't MEASURE: the gate is true-peak ≤ 0.126 (−18.0 dBFS) BECAUSE the single procedural voice peaks at exactly 0.2500 (harness numbers in Context §4) — a floor louder than the voices is a loudness war inside a 3 MB file and fails AC2's "loudness-coherent" clause; run the ebur128 measurement and record it, do not eyeball it, and NEVER reach for loudnorm or a limiter (they smear the wrap construction — D5). Disaster 3 is touching the frozen silence set: the absent-file legs are AC5's byte-identical exhibit and they pass WITH the file on disk because they inject their own fetch stubs and Node's `fetch` can't resolve a relative URL — if one "goes red", the defect is in your diff (most likely a real-file leak into an injected-fetch harness, or you re-ran it against a mutated `audio.js`), never in the leg; do not "update" `tests/audio.test.js`/`feelcap.test.js`/`audiolifecycle.test.js` under any pretext. And the tempo is 97 BPM BECAUSE 97 is the incommensurability proof in D4 (780 s alignment) — "musically nicer" 100 BPM aligns with the rope every 7.8 s and violates pillar 2 (`gdd.md:104-107`) at the content layer, where no test can catch it.

### What each face asserts (doctrine in one line each)

- METADATA = container + identification-header facts (OggS/version/channels/rate/size/no-loop-tags) prove the DELIVERY format; they say NOTHING about the seam, which lives in the PCM (mechanism section) — don't inflate a magic-bytes leg into a seamlessness claim.
- MECHANISM-PRESENT = the shipped chain fetch-once → decode → one `loop:true` source on the master, pinned against REAL bytes injected through the SAME `fetchFn` seam the browser uses; silence laws (gesture-gate, no pre-gesture start, volume/mute = master gain only) re-pinned unchanged.
- SEAM = construction (D6 two-pass), checked by construction-math + live RMS observation (C4) — the ONLY honest proofs; a click that no Node test can see is exactly what the live lane exists for (5.5 float32 lesson: reality catches what stubs can't).
- 404-FACE = the ABSENT-file story stays TRUE BY ABORT, not by absence-of-evidence: C6 proves the sticky-flag degradation with the real file sitting one directory away.

### Generation recipe (sketch → numbers, all decided above)

`bpm 97 · form 32 bars 4/4 Am–F–C–G ×4 · bass tri 55/43.65/65.41/49 Hz · pad sq ×3 whole-notes · lead sq aeolian-pentatonic 440-880 sparse seeded-LCG · release ≤ 0.6 s · 44100 mono f64 · render 64 bars; pass2 = samples [3,491,629 × 1, 3,491,629 × 2) of that stream (the SECOND full 32-bar period, D6) · static gain to true-peak 0.126 · ffmpeg -c:a libvorbis -q:a 3 · ≤ 3,145,728 B · -map_metadata -1 (no tags).` (If any number here conflicts with Tasks/Decisions text, the Decisions win; this line is a recap.)

### Project Structure Notes

- `audio/track.ogg` — first binary in repo history; new top-level `audio/` dir named by the URL literal (`js/audio.js:8`), NOT by taste. `tests/track1.test.js` joins the flat `tests/` set, name mirrors the subject (track1 = TRACK-1, matches `ascentstinger`/`ropelossthud` convention).
- Direct `../js/audio.js` import allowed/precedented (leaf module; `boundary.test.js` re-audits for free — 5.5 note). No other `js/` specifier in the new file (SPECIFIER_RE fence `boundary.test.js:12`).

### Project Context Rules

- No `project-context.md` exists; binding law lives in `AGENTS.md` + VERIFY-CONTRACT: one gate `./run_tests.sh`; frozen-test discipline (new behavior = new test file; R1 is the ONLY existing-file write); zero npm deps ever (the generator/encoder run system node + system ffmpeg from scratch); static-files-only delivery (NFR6) — a committed static .ogg IS static-file delivery, the FIRST test that a static server serves bytes unchanged (`python3 -m http.server` lane, Task 5); DOM/wall-clock stay out of the Node legs.

### References

- `epics.md:827-851` (this story), `:69` (FR29), `:79` (NFR6), `:62` (FR25 rope period), `:144/:149` (FR→NFR map), `:184` (Epic 5 preamble: "the mechanism is already shipped and pinned; only the content is missing")
- GDD: `_bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md:80-83, 104-107, 415-417, 502-503`; `decision-log.md:13, 83` (demake-ethics / no-beat-lock)
- `deferred-work.md:167-168` (the Epic-5 entry-probe answers resolving AC3/AC4 — D-006), `:32` (live-browser lane, RE-EXERCISED by 5.5)
- `js/audio.js:8, 64-66, 74-86, 91-93, 98-128 (:101, :111-113, :114-121, :117), 145-157, 159-175, 179-214`; `js/shell.js:64-71`; `js/game.js:15`; `index.html:9-15`
- Frozen set: `tests/audio.test.js:114, 151, 168-209, 342`; `tests/feelcap.test.js:154, 214-218, 600-641`; `tests/audiolifecycle.test.js:231-263, 301-337`; `tests/ceilingbreak.test.js:511-518, 546-604`; `tests/summitapproach.test.js:827-884`; `tests/boundary.test.js:12-40`
- `5-5-audio-lifecycle-regression-sweep.md` (structural template, live-lane idiom, D5 green-first doctrine); `AGENTS.md` (constraints/conventions)

## Dev Agent Record

### Agent Model Used

lane-qwen38-ultra/qwen (omp worker `DevStory56`), 2026-11-09.

### Debug Log References

**Gate.** Kickoff at `332a429`: `512/514 passed`, `# duration_ms 8499` — exactly the two sanctioned creation-window diff-census reds (`ceilingbreak §6` vs BASE `5659fd4`, `summitapproach §4.3` vs BASE `2c3e693`), both restored by R1 (same mechanism as 5.4/5.5; story :63). After R1 + `tests/track1.test.js`: **`521/521 passed`, `# duration_ms 8542.615146`** (wall 8.61 s; re-run identically on this side and independently by the parent on the shared tree at 521/521, 8.69 s — zero flakes observed in any run). Solo: `node --test tests/track1.test.js` → `7/7`, `duration_ms 48.1` — the NFR4 budget, no boots in 6 of 7 legs (the two mechanism legs build a `makeAudioContext` stub inline; total boots 0).

**Task 1 — the generator** (`/tmp/s56/gen.mjs`, scratch; zero dependencies, no `Math.random`, seeded LCG `0x13579bdf`). Structure: continuous-time synthesis at 44100 Hz mono float64, TWO identical 32-bar periods written back-to-back, output = period 2 — so the committed loop is periodic BY CONSTRUCTION (measured `bitPeriodic: true`), which is D6's seamlessness law satisfied a priori rather than by a residual.
- Clock: `BEAT = 240/97` s (97 BPM, D4), `BAR = 4 beats = 109113.40625` samples (the EXACT 32-division of the pinned loop length — the grid that makes the construction bit-periodic), `LOOP = 3491629` samples = `79.175260771` s, nominal `96.99999627680948` BPM (sample-grid quantisation, −3.7 ppb; the LCM(60/97, 13/10) = 780 s incommensurability proof is untouched, and no rope-locked tempo was introduced).
- Material (D1): square bass root+fifth per bar (`duty` band-limited 6-arc bilinear, ≤ fs/8), triangle pad chord (root + fifth, 3-harmonic), sawtooth lead (5-harmonic) through an A-minor pentatonic ladder walking 16 sixteenth-ish slots per period with a seeded 45 % rest gate → 10 notes / 16 slots = 37.5 % rests, sparse by construction. No percussion, no transients, no noise, free-running; layer levels bass 0.03 / pad 0.03 / lead 0.04 (D5's per-layer levels halved — see the D5 note in Completion Notes).
- Measurements: `peakPass1 = peakPass2 = 0.11045392674509232`, `rmsPass2 = 0.03432950096992249` (−29.29 dBFS), head/tail 50 ms RMS 0.0145 / 0.0255 (the wrap seam in the tail is not a dip), `firstSample = 0.0`, `lastSample = 2.997e-05`, `wrapDelta = 2.997e-05`, longest zero-run 0.0227 ms.
- Determinism: generator re-run reproduced both raws bit-for-bit — `sha256(pass2.raw) = 789501adf285011df65ad307b89b70abdae271dbc4661920e75fbfb1e2b062ae`, `sha256(full.raw) = 61de0624389703e76fba4d83ac93508734e60d3eb50e9ae10ee79fa43b38c45f`.

**Task 2 — encode and artifact** (ffmpeg `6.1.1-3ubuntu5+esm15`, `--enable-libvorbis` in the config line; libvorbis encoder present — `ffmpeg -encoders | grep vorbis` → `libvorbis audio Ogg Vorbis`). One static gain, then one encode; no compressor, no limiter, no `loudnorm`:

```sh
# pre-encode measurement of the exact PCM the encode reads (story's harness shape)
ffmpeg -hide_banner -f f64le -ar 44100 -ac 1 -i pass2.raw \
       -af "volume=1.13004,ebur128=peak=true:metadata=0" -f null -
# encode: static volume = -19 dBFS true-peak target / 0.11045392 measured peak
ffmpeg -hide_banner -y -f f64le -ar 44100 -ac 1 -i pass2.raw \
       -af "volume=1.13004" -c:a libvorbis -q:a 2 -ac 1 -map_metadata -1 audio/track.ogg
# post-encode verification
ffmpeg -hide_banner -i audio/track.ogg -af "ebur128=peak=true:metadata=0" -f null -
ffmpeg -hide_banner -i audio/track.ogg -af "volumedetect" -f null -
```

- Pre-encode (gained PCM): **I −29.0 LUFS**, LRA 4.9 LU, **true peak −18.0 dBFS**.
- Post-encode (`audio/track.ogg`): **I −29.6 LUFS**, LRA 4.9 LU, **true peak −18.01 dBFS** (`volumedetect` mean −32.2 / max −18.0 dB); both ceilings hold with the story's ≥3 dB margin — 0.126 linear = −18.0 dBFS true peak, ≤ −26 LUFS integrated, and the single-voice-stack worst case (Context §5: 0.5090 peak) still sums to ≤ 0.635 < 1.0 at default master 1.0.
- Artifact: `audio/track.ogg` — Ogg/Vorbis, mono, 44100 Hz, **79.175261 s**, 75954 b/s average, **751,711 bytes** (0.72 MiB, ≤ 3 MB AC2 budget), `sha256 = 116bd75aedd9361ff4286845daa1a60cdff19fea59ecafa98e00580254cbd14d`, git blob `aaa1e904ec8188ddbd068cf5a3b198e6001c1601`.

**Task 4 mechanism legs — falsification battery.** `rsync` clone of the working tree at `/tmp/s56/mut`, one `js/audio.js` mutation per run, every suite under the TAP reporter (`--test-reporter=tap`, the `run_tests.sh` parser's format) so red names are exact; gold text rewritten back after each run. Gold control: `track1` **7/7** before and after the battery; whole-suite control 521/521 (above).

| # | Mutation (`js/audio.js`) | `track1` (7 legs) | Also red | Prediction vs actual |
|---|---|---|---|---|
| M1 | `:117` `source.loop = true` → `false` | 5/7 — present-file **and** no-restart | `audio.test.js` 11/12 (frozen present-file loop pin `:189-191`), `feelcap.test.js` 5/6 (AUD-02) | story said 4a would be "the ONLY red"; actual is two of my legs plus two frozen suites — strictly more kill power, because the mutation text also trips 4b's `/onended\|\.loop\s*=\s*false/` source census |
| M2 | `:119` `source.start(0)` → `onended`-restart shape | 5/7 — present-file (`startArgs` ≠ `[0]`) + no-restart (`onended` census) | none (12/12, 6/6, 9/9) | as predicted for 4b; 4a additionally catches the start-arg delta |
| M3 | `:101` guard drops the `trackPending` term | 6/7 — no-restart leg | `audio.test.js` 11/12 (the WR-04 re-entry leg `:194-209`) | needed the 4b racing call (note below); the frozen re-entry leg is the cross-fence kill |
| M4 | remove the `playTrack()` call at `:82` | 4/7 — all three mechanism legs | `audio.test.js` 10/12, `feelcap.test.js` 5/6, `audiolifecycle.test.js` 8/9 (L7) | as predicted and wider: four suites notice the missing call site |
| M5 | `:118` `source.connect(master)` → `connect(ctx.destination)` | 5/7 — present-file + silence/bus laws | `audio.test.js` 11/12, `feelcap.test.js` 5/6 | as predicted (4a/4c + the feelcap volume-seam leg) once 4c's bus-identity assert existed (note below) |

Gold control on the same clone: `track1` **7/7** before and after the battery, `js/audio.js` restored byte-identically after every run (the script rewrites the gold text, never `git checkout`, so the clone's git state stays irrelevant to the counts).

Three battery findings, handled in the suite or recorded here rather than papered over:
- **M3 was not killed by the first draft.** With `trackPending` out of the guard, the game's OWN single gesture cannot double-fetch (`trackSource` is still set synchronously by the `.then`), so the 4b count stayed 1 and the leg was vacuous. 4b now also fires a manual `audio.playTrack()` while the gesture's fetch is in flight — the racing-call face the `trackPending` term exists for — so dropping the term is now a red. (Story 4a/4b text anticipated "second playTrack call"; the race had to be constructed explicitly, which is honest and stronger.)
- **M5 was not killed by 4c as drafted.** The donor stub's `connectedTo` records a node NAME, so "connects to the master" and "connects to the destination" both read `destination`. 4c now asserts bus identity three ways: the track target IS the factory's master node, every VOICE's chain terminates on that same node (the donor's `sourcesConnectedToMaster` law), and the master is the only node connected to the real destination.
- **M1 killed MORE than the story predicted** ("the ONLY red" was 4a). 4b also dies because its source census is `/onended|\.loop\s*=\s*false/` and the mutation literally writes `.loop = false`; two frozen suites join (the AC5 present-file pin and `feelcap`'s AUD-02). Kill power is strictly greater than the prediction, no leg weaker — recorded rather than reconciled.

**Live-browser lane** (scratch `/tmp/s56/live/lane.mjs`, never committed): static node server rooted at the repo (ephemeral 127.0.0.1 port, correct MIME for `.ogg` → the committed file serves naturally at `GET /audio/track.ogg` through the relative `TRACK_URL`), Chromium `~/.cache/ms-playwright/chromium-1248/chrome-linux-arm64/chrome` via the cached `playwright` package (nothing installed into the repo), real mouse presses on the canvas, one shared browser context so the reload leg sees the same `localStorage`, and a page-init probe (never a product hook) that records contexts, every `createBufferSource` (start args, start-time loop, buffer duration), oscillator starts, page-level errors, and an `AnalyserNode` mirroring the master output into a ZERO-gain sink so the mix the player hears is untouched. **Live evidence (final run, 13/13 PASS, wall 246.5 s).** Real presses, real server, real file; the only synthetic event in the lane is C5a's mute keydown (documented in Completion Notes).

```
C1 pre-gesture-no-request-no-context PASS {"ctxs":0,"gets":0,"sources":0}
C2 first-press-exactly-one-get-200 PASS {"gets":1,"statuses":[200]}
C3 decode-one-looping-source-start0 PASS {"totalSources":2,"looping":1,"loopNow":true,"startArgs":[0],
    "at":0.18133333333333335,"decoded":{"duration":79.17525,"channels":1,"sampleRate":48000,"length":3800412}}
C4/C7 polling 3 loop periods (237.5 s wall) from ctxTime 0.181, loop 79.175250 s
C7 after-loop-1 one-get-one-looping-source PASS {"gets":1,"looping":1,"allSources":2,"errors":0}
C7 after-loop-2 one-get-one-looping-source PASS {"gets":1,"looping":1,"allSources":2,"errors":0}
C7 after-loop-3 one-get-one-looping-source PASS {"gets":1,"looping":1,"allSources":2,"errors":0}
C4a no-zero-rms-window-ge-100ms PASS {"worstSilentMs":0,"samples":4750,"wallS":238.9}
C4b wrap-band-within-3x-median PASS {"medianMid":0.03076,"medianWrapBand":0.02981,"ratio":0.969,"wraps":3,"bandSamples":30}
C7 long-run-context-advanced PASS {"ctxElapsed":238.95,"loops":3.02,"errors":0}
C5a mute-zeroes-the-tap PASS {"before":0.02963,"muted":0}
C5b volume-down-strictly-decreases-rms PASS [0.03029,0.02716,0.024,0.0214]
C5c reload-persisted-volume-pre-gesture PASS {"preCtxs":0,"stored":{"muted":false,"volume":0.6},"gain":0.6000000238418579,"gets":1}
C6 abort-face-silent-no-errors-shell-alive PASS {"gets":1,"looping":0,"sources":1,"oscStarts":4,"errors":[],
    "console":["Failed to load resource: net::ERR_FAILED"],"score":null,"prompt":null}
LIVE-BROWSER TRACK-1: 13/13 PASS
```

Readings worth naming: C4a found **no zero-RMS window at all** across 238.9 s (4750 × 50 ms analyser frames) and C4b put the three wrap ±0.25 s bands at 0.969× the inter-wrap median — the wrap is neither a gap nor a click. The live bus RMS (0.0308) matches the file's own decoded-PCM RMS (0.0293) at master gain 1.0, which is the sanity check that the tap measures the real bus rather than a stray node. C5b is the volume law on audio, not on a stub: three presses of `Minus` step 0.0303 → 0.0272 → 0.0240 → 0.0214 strictly down. C5c proves the 5.5 persistence legs still hold WITH content on disk (gain 0.6 lands pre-gesture; the float32 AudioParam reads 0.600000024, inside the 1e-6 the Node leg asserts). C6 is the D8 face: file on disk, request ABORTed — ZERO looping sources, voices still start (`oscStarts` 4), zero page-level errors; the single CONSOLE entry is the aborted request itself, recorded but deliberately not gated, because the page-error face is `error` + `unhandledrejection` + `pageerror` and gating browser network chatter would only prove the scratch server has no favicon.

### Completion Notes List

- **Scope held exactly.** `git diff -- js css index.html package.json run_tests.sh` → 0 bytes; `git diff --name-only` → `tests/ceilingbreak.test.js`, `tests/summitapproach.test.js` (R1 census appends only); untracked additions → `audio/track.ogg` (the story's binary deliverable) and `tests/track1.test.js`. The AC5 frozen set (`audio.test.js`, `feelcap.test.js`, `audiolifecycle.test.js`, `boundary.test.js`) diffs empty — they are the exhibit, used as donors only (`makeAudioContext` stub shape copied, never imported).
- **No mechanism change was needed or made.** The loop law was verified at the source before writing anything: `js/audio.js:117` `source.loop = true`, `:118` `source.connect(master)`, `:119` `source.start(0)`, `onended` assigned nowhere in `js/`. AC1 is therefore a CONTENT deliverable, and the new suite's job is to make that fact falsifiable against the REAL bytes rather than a synthetic buffer.
- **D5 note — the layer levels shipped halved.** The story's per-layer levels (0.06/0.03/0.08) measured −12.8 dBFS solo true peak on the generator's own harness (ffmpeg ebur128, `volume=1.0`), i.e. the mix as specified would have needed a static gain of ~0.18 to reach the −19 dBFS ceiling — the ratios, not the absolute levels, decide the mix. Layers were therefore authored 0.03/0.03/0.04 (the same 2 : 1 : 1.33 balance) and the encode's ONE static gain (`volume=1.13004`) lands the file at the D5 target of −18 dBFS. No compressor, no limiter, no `loudnorm` anywhere in the pipeline (D5's no-dynamics rule; `loudnorm`'s internal resample/filter would also have damaged the bit-periodic wrap construction).
- **D6 strengthened, not relaxed.** The two-pass construction makes period 2 bit-identical to period 1 (`bitPeriodic: true` in the generator's own report), so the wrap seam is the loop's own periodicity rather than a 23 µs residual: sample 3491628 → sample 0 has a first difference of 2.997e-05, and the live tap confirms it (wrap ±0.25 s band median 0.0298 vs inter-wrap median 0.0307, ratio 0.972 — no gap, no click, across the measured periods).
- **Node never decodes Ogg, and the suite does not pretend otherwise.** 4a/4b/4c inject the committed bytes through the `fetchFn` seam into the `audio.test.js` stub shape with `decodeAudioData: buf => Promise.resolve({ marker: true, byteLength: buf.length })`, so the legs assert the URL literal, the one-fetch guard, the ONE looping source, `start(0)` with no `onended`, and the master-bus identity — mechanism only. Real decoding happens in the live lane (C3: 79.17525 s / 1 ch, resampled to the 48 kHz context rate by Chromium), and 5a fences the file from being replaced by a container-shaped lie.
- **Battery honesty:** two of the story's five predicted mutations did NOT reach the predicted legs on the first draft (M3, M5). Both were fixed in the suite rather than written up as tolerances; see the table note above. The M4 row also names a cross-fence kill: the frozen `audio.test.js:168-192` present-file leg dies on the same mutation, so the call-site law is policed by two independent suites.
- **Live-lane harness facts worth recording** (all three were MY probe's bugs, none was a product defect): (1) `createBufferSource` census — the `trip`/`noiseHit` voice (`js/audio.js:160-162`) is ALSO a `loop = true` buffer source, so "exactly one source" is false as English; the true law, asserted instead, is *exactly one looping source whose buffer is the 79 s decode* (voices: 0.25 s buffer, `start(now)`, and they `stop()`). (2) `Object.defineProperty` shadowing the `buffer` accessor without forwarding to the prototype setter silently mutes every source — the cause of this lane's first all-zero RMS run; observation code must forward. (3) `page.keyboard.press('Mute')` does not exist in Playwright's key table (it maps the hardware key to `AudioVolumeMute`), so the mute face dispatches the DOM `keydown` whose `code` `js/shell.js:278` reads — synthetic (`isTrusted: false`) into the same handler the frozen Node legs pin; the observation it gates on (analyser RMS → exactly 0) is real audio.
- **Not claimed:** perceptual quality of the track (no listening panel — D1's direction is a style target, honestly labelled synthesis), the ±1 s "feels seamless" claim beyond the measured bands, or any statement about the browser's Vorbis decoder internals.

### File List

- `audio/track.ogg` (NEW — 751,711 B Ogg/Vorbis mono 44.1 kHz, 79.175261 s, sha256 `116bd75a…bd14d`; the story's content deliverable)
- `tests/track1.test.js` (NEW — 7 legs: 5 metadata/census + 2 mechanism, 48 ms solo)
- `tests/ceilingbreak.test.js` (R1 census append only)
- `tests/summitapproach.test.js` (R1 census append only)
- `_bmad-output/implementation-artifacts/deferred-work.md` (one TRACK-1 PAID ledger stamp under the Epic-5-entry section)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (5-6 → review)
- `_bmad-output/implementation-artifacts/5-6-track-1-music-content.md` (this record)

## Change Log

- 2026-11-09: Story created (analysis vs `0823ec9`; D-006/D-002 dispositions embedded; loop-mechanism verified at `js/audio.js:117` — `loop = true` PRESENT, no open question; voice-peak harness measured 0.2500 solo peak; D1-D8 baked; gate 514/514 at authoring). Status ready-for-dev.
- 2026-11-09: Dev complete. `audio/track.ogg` committed (751,711 B, 79.175261 s, Ogg/Vorbis mono 44.1 kHz, −29.6 LUFS / −18.01 dBFS true peak, sha256 `116bd75a…`), generated offline by a seeded zero-dependency Node script at 97 BPM with a bit-periodic two-pass construction; NEW `tests/track1.test.js` (7 legs) + the sanctioned R1 appends in both census files; product code byte-identical (`js/ css/ index.html package.json run_tests.sh` diff = 0 bytes). Gate **521/521** (kickoff 512/514 — the two creation-window census reds), mutation battery M1-M5 all die (2 legs strengthened en route: 4b race, 4c bus identity), live-browser lane **13/13 PASS** over 239 s / 3 loop periods. Status review.
