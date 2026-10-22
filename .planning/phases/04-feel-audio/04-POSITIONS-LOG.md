# Phase 4: Feel & Audio — Positions Log

**Generated:** 2026-10-22 (night positions — auto-derived from corpus pack `positions-corpus-04.md`, 2026-10-22T00:40Z)
**Companion:** [04-CONTEXT.md](./04-CONTEXT.md)

## Decisions

| ID | Decision (summary) | Category | Provenance | Reversibility | Confidence |
|----|--------------------|----------|------------|---------------|------------|
| D-N01 | Input buffer as a decayed `run.buffer` field in `tickRun`, fed by an optional `press` param; `BUFFER_SEC ≈ 0.1` constant | Feel | per FEEL-01; per D-01 in Phase 1; per pattern in `js/game.js` (`rng = Math.random` DI) | reversible | high |
| D-N02 | `tickRun` return gains additive `events: [...]`; `tripped` flag kept for compatibility | Feel | per pattern in `js/game.js` (`tickRun` return record, consumed in `js/shell.js`); serves FEEL-02/03 + AUD-01 | reversible | high |
| D-N03 | Near-miss = buffer-forgiven pass or clearance under derived margin; `run.streak` field, reset on clean skip/trip | Feel | per FEEL-03; per pattern in `js/game.js` (`minHeight = 18 / windowMul`) | reversible | med — predicate shape is machine-checkable; the margin *rule* (timing vs clearance flavor) may want a playtest tweak |
| D-N04 | Near-miss callout/streak renders via existing HUD flash channel, no new UI surface | Feel | per pattern in `js/shell.js` (`flashName`/`flashUntil`/`updateHud`); per CARD-02 DOM-side precedent | reversible | high |
| D-N05 | Hitstop = shell accumulator drain gate; STEP/dt/sim untouched | Juice | per ARCH-01; per pattern in `js/shell.js` (`frame()` accumulator + 0.25 s clamp); per FEEL-02 | reversible | high |
| D-N06 | Tier table → hitstop/shake/particles; shake is post-pass UV jitter, camera keeps zero-motion invariant; pooled flat-quad particles | Juice | per pattern in `js/render3d.js` (camera "zero camera motion, ever"); per PROJECT.md Out-of-Scope ("heavy shake during judgment", "no post-processing beyond simple dithering"); per D-01 in Phase 1 (read-only render) | reversible | high |
| D-N07 | New `js/audio.js` is the only WebAudio module, imported only by `shell.js` (outside sim import graph); SFX procedurally synthesized, zero assets | Audio | per D-01/D-03 in Phase 1 (containment + `tests/boundary.test.js`); per AUD-01; per PROJECT.md constraints (static files, zero npm deps) | reversible | high |
| D-N08 | AudioContext lazily created on first gesture, resumed on gesture/visibility/focus; never constructed at load; no silent broken state | Audio | per AUD-03 (and ROADMAP success criterion 4: Chrome/Firefox/iOS Safari) | reversible | high |
| D-N09 | One pre-rendered looping track file via `AudioBufferSourceNode` + shared master `GainNode`; audio reads events only, never writes sim; rope stays the canonical clock | Audio | per PROJECT.md Key Decision "SFX + music without beat-lock"; per AUD-02; per PROJECT.md Out-of-Scope ("Procedural music engine") | reversible | med — mechanism is locked; file generation depends on the deferred content decision |

## Escalations (deferred — morning decision required)

| # | Gray area | Recommendation (one line) | Reason |
|---|-----------|---------------------------|--------|
| 1 | Audio settings persistence (key/shape/write timing for mute+volume) | Mirror the `loadBest`/`saveBest` injectable-storage pattern: key `jumprope-audio`, `{ muted, volume }`, write-through on change | one-way door — first persistence/write-path for settings data (rule 3; AUD-04) |
| 2 | Early-buffered press: auto-fire the jump at window-open, or forgiveness-only? | Ship forgiveness-only in v1 (matches "forgiven instead of tripping"); revisit after playtesting | taste/feel item — both readings satisfy FEEL-01; the difference is jump feel |
| 3 | Juice magnitudes (hitstop ms/tier, shake px cap, particle counts) | Seed trip 80 ms / near-miss 40 ms / skip ≤16 ms; shake ≤ 2 post-pass px; tune by playtest | taste/feel item — structure decided (D-N06), numbers need hands |
| 4 | Vibe-track musical content (genre/length/producer) | One ~30 s lo-fi synth loop, offline-rendered by a throwaway Node script to a committed `.ogg`, loop-safe at any rope period | taste/feel item — delivery decided (D-N09), content is subjective |

## Notes

- Corpus pack is truncated mid-Phase-2 (line 321, `D-01: Internal render resolution: lock ~240 rows…`); Phase-2/3 decision detail was reconstructed from PROJECT.md Key Decisions and live-code anchors. Confidence for decisions citing only code patterns (not full Phase-2 D-xx text) is held one notch lower.
- No decision touches persistence or a saved-data contract, per rule 3 — the only new write-path candidate (audio settings) is escalated.
- All decisions preserve: sim purity + Node-testability (ARCH-01), the frozen `tickRun` call shape via default params, the zero-camera-motion render invariant, and the zero-npm-dependency / static-file delivery rules.
