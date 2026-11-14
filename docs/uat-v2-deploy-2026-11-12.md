# v2 deploy cut + UAT — checklist & evidence (2026-11-12)

A1 (ledger :332) — the deploy cut and the UAT pass, run at the Epic 8 close-out.
Rides ledger :263's standing owner (browser UAT lane / v2-deploy milestone).
Sandbox lanes are COMPLETE below (headless chromium, SwiftShader software
raster — every perf number here is a FLOOR, never a hardware verdict); the
hardware lanes are the hand-off list. Retrofits the Epic 5-close and 8.4-D8
lane styles: scratch playwright + cached chromium + static server, zero repo
dependencies.

## The cut

- Build: `master` @ `029ca8c` (Epic 8 close), working tree clean,
  gate **701/701 @ 8.5 s**.
- Contents: static files only — deploy the repo root AS-IS (no build step,
  no bundler, no server component, NFR6). Entry `index.html`.
- One runtime external: the importmap pin `three@0.186.1` (jsdelivr CDN).
  Everything else ships from the origin: `js/*.js`, `css/style.css`,
  `audio/track.ogg`, `mods/mint.json`.
- Committed binaries (integrity): `audio/track.ogg` 751,711 B
  sha256 `116bd75a…` (ledger :215); `tests/fixtures/probe.glb` 2,648 B
  sha256 `54109450…` — TEST-ONLY, never loaded by the shipped boot (ledger :354);
  `mods/mint.json` 141 B sha256 `b74c5930…` (ledger :350).
- Deploy check: `index.html` renders to tap-to-start; `/css/style.css` and
  `/audio/track.ogg` 200; a JS-console-clean boot; `/mods/mint.json` reachable
  (only ever fetched with `?mods=`).

## Sandbox lanes — RUN 2026-11-12 (floors, not verdicts)

Lane scripts lived under `/tmp/uatv2/` (scratch, zero repo deps); chromium-1248,
`--use-angle=swiftshader`, repo served by `python3 -m http.server 8123`.
Frame taps discard the first 110 callbacks; multi-chain rAF interleaving
filtered to inter-frame periods (> 4 ms).

| Lane | Read |
|---|---|
| FPS, shipped `index.html`, play loop driven, run 1 | median **16.4** · p95 **17.2** · max 18.0 · over20 **0** / 350 frame periods |
| FPS, same, run 2 | median **16.4** · p95 **17.2** · max 17.7 · over20 **0** |
| FPS, `?skin=mint` | median **16.3** · p95 **17.3** · max 17.8 · over20 **0** — skin boot FPS-neutral |
| Requests, default / `?skin=mint` / `?skin=nope` | **zero** `.json` requests (NFR14 zero-request default boot holds in a real browser) |
| Requests, `?mods=mods/mint.json` | exactly **one** `/mods/mint.json` fetch |
| Skin application, `?skin=mint` and `?mods=` | mint hexes `0x7ce38b` / `0x10151f` / `0x9aa4b2` each written twice (apply loop + D2 restore base); **absent** on default and `?skin=nope` (miss → inert, byte-inert composition) |
| Load (NFR3 floor) | cold-navigation goto wall-clock 676–916 ms incl. CDN three fetch — inside the 2 s budget; the page-side load-event read at 6.4 was 169 ms (ledger :263) |

## Hardware lanes — RUN 2026-11-12 (owner: Ed — desktop PC + Pixel 7 Pro, owner-reported), with carry

- [x] **L1 — NFR1 60 FPS human check on a 2020-era integrated GPU** (ledger :263) — RUN 2026-11-12, owner-reported pass on both machines tested (desktop PC + Pixel 7 Pro); **CARRY: 2020-era integrated-GPU class unverified** — neither machine represents it; candidate laptop check pending (owner). Gate decision (Ed): proceed regardless.
  deploy the cut, play ≥ 2 minutes at native resolution on integrated graphics.
  Accept: no rhythm-breaking hitching; the rope never visibly slips against the
  audio/beat. Report the machine class + a devtools FPS screenshot into the
  ledger stamp.
- [x] **L2 — NFR3 residential-broadband re-check** (ledger :263) — RUN 2026-11-12, owner-reported pass on both machines; no timing screenshot attached.
  deployed URL, page-load → first jump under 2 s. One timing screenshot.
- [x] **L3 — Player Fuel GPU re-confirm** (:355 sibling) — RUN 2026-11-12 on both machines, owner-reported pass; the iGPU-class machine this lane names never existed in this pass — that class rides the L1 carry.
  `?skin=mint` and with `?mods=mods/mint.json` on the L1 machine — mint palette
  from the first frame, zero requests without `?mods=`, no frame-cost
  difference vs the L1 baseline.
- [ ] **L4 — probe.glb binding GPU re-confirm** (:355) — OPTIONAL — deferred; its "if the `.glb` feature is ever picked up" condition is LIVE as of 2026-11-12 (A4 disposition KEEP, filed as v3 candidate) — re-open at that feature's epics pass.
  `.glb` feature is ever picked up (shelved per FR38; the shipped boot never
  loads `probe.glb`). Re-run the 8.4 D8 scratch lane (story 8.4 Debug Log
  recipe) on the hardware GPU and append the read to the 8.4 §Verdict.

## Sign-off

When L1–L3 are checked, stamp ledger `:332` (A1) **PAID** with the machine
class and date, `:263` **PAID** (hardware legs), and `:355` **PAID** (or note
L4 deferral — the shelf verdict keeps it optional). NFR1/NFR3 then carry
hardware evidence, not floors.
