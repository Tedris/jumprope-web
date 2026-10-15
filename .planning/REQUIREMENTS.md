# Requirements: Jumprope Web — PS1-Style Rope-Jump Roguelike Demake

**Defined:** 2026-10-15
**Core Value:** One button, one rope, one perfect rhythm loop — the jump-timing feel must be joyful before anything else works.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Presentation (PRES)

- [ ] **PRES-01**: Player sees the game in a PS1-style 3D scene — low internal resolution, nearest-neighbor upscale, ordered dithering, vertex-snap wobble
- [ ] **PRES-02**: Player sees an original low-poly skipping character with personality, animated from the rope phase clock
- [ ] **PRES-03**: Player can read rope arrival purely from the frame — fixed readable camera, shadow depth cue, rope visible against floor throughout arc

### Architecture (ARCH)

- [ ] **ARCH-01**: Simulation core stays pure, framework-free, and Node-testable while the 3D shell owns the only `three` import
- [ ] **ARCH-02**: Run state resets through a single code path and randomness is injected — the two known debt smells (dual `phase: 0.33` init, inline `Math.random` in `tickRun`) are gone

### Cards (CARD)

- [ ] **CARD-01**: Player chooses 1 of 2–3 offered cards at cadence pauses, applied instantly to the run
- [ ] **CARD-02**: Cards have at-a-glance identity: name, icon, role color
- [ ] **CARD-03**: Cards have rarity (common/uncommon/rare) affecting drop odds
- [ ] **CARD-04**: Cards stack with visible per-card stack caps
- [ ] **CARD-05**: Offers never contain dead picks (availability filtering)
- [ ] **CARD-06**: Player can see owned cards as an icon strip during a run
- [ ] **CARD-07**: Catalogue holds 6–10+ original cards across roles (margin / volume / risk / foundation / pace)

### Feel (FEEL)

- [ ] **FEEL-01**: A slightly late/early press near the timing moment is forgiven (~0.1 s input buffer on the phase clock)
- [ ] **FEEL-02**: Skips, near-misses, and trips produce juice scaled by significance (hitstop, shake, particles)
- [ ] **FEEL-03**: Near-misses register as a distinct event with callout and streak feedback

### Audio (AUD)

- [ ] **AUD-01**: Player hears distinct SFX for jump, skip, near-miss, trip, card-pick
- [ ] **AUD-02**: Player hears a looping vibe track; the rope never locks to it
- [ ] **AUD-03**: Audio "just works" — context resumes on first press, no silent broken state
- [ ] **AUD-04**: Player can mute and set volume, persisted across sessions

### Shell (UI)

- [ ] **UI-01**: Game pauses on demand and auto-pauses when the tab is hidden
- [ ] **UI-02**: Reduced motion dampens wobble/shake; `prefers-reduced-motion` respected automatically
- [ ] **UI-03**: Low-res UI stays legible at any window size (resize/letterbox)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Cards

- **CARD-08**: Rules-beyond-multipliers cards (extra ropes with multi-window scoring, synergy cards) — spike-gated; only if multi-window scoring spike proves cheap
- **CARD-09**: Escalating offer pacing — rarity weights shift with skip count
- **CARD-10**: Luck card — invent only if catalogue feels thin

### Meta

- **META-01**: Between-run progression (unlocks, persistent currency) — future milestone

## Out of Scope

| Feature | Reason |
|---------|--------|
| Beat-locked soundtrack / rhythm-synced rope phase | Rope phase is the canonical clock; audio follows gameplay only |
| 1:1 Scarlet Skips card list, names, story, characters | Demake the spirit, not the IP; original cards filling the same design roles |
| Post-processing stack (bloom, motion blur, CRT curvature) | Violates the simple-dither constraint; kills low-res crispness |
| Free-look camera / heavy shake during judgment | Moves the timing reference; players must judge rope arrival from a stable frame |
| "Trap" cards offered as gotchas | Mis-picks read as bugs, not depth; offer filtering instead |
| Procedural music engine | Scope trap; one looping track + SFX by decision |
| Accounts, multiplayer, leaderboards, native apps | Static-file web game; no server component |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PRES-01 | — | Pending |
| PRES-02 | — | Pending |
| PRES-03 | — | Pending |
| ARCH-01 | — | Pending |
| ARCH-02 | — | Pending |
| CARD-01 | — | Pending |
| CARD-02 | — | Pending |
| CARD-03 | — | Pending |
| CARD-04 | — | Pending |
| CARD-05 | — | Pending |
| CARD-06 | — | Pending |
| CARD-07 | — | Pending |
| FEEL-01 | — | Pending |
| FEEL-02 | — | Pending |
| FEEL-03 | — | Pending |
| AUD-01 | — | Pending |
| AUD-02 | — | Pending |
| AUD-03 | — | Pending |
| AUD-04 | — | Pending |
| UI-01 | — | Pending |
| UI-02 | — | Pending |
| UI-03 | — | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 0
- Unmapped: 22 ⚠️

---
*Requirements defined: 2026-10-15*
*Last updated: 2026-10-15 after initial definition*
