# Brief — FEEL-SWEEP: forgiveness-window soak sweep → morning tuning table

## Deliverables (exact file list; nothing else may change)
- tools/night/sweep/feel_sweep.mjs — seeded parameter sweep over the input-buffer
  forgiveness window (BUFFER_SEC) and near-miss margin (NEAR_MARGIN) using the
  REAL sim API from js/game.js (import, never re-implement).
- tools/night/sweep/feel_sweep_table.csv — the generated table (regenerate in
  the iteration; committed).

## Must NOT modify
- js/**, tests/**, .planning/**, NIGHT.md/JOURNAL.md/BLOCKED.md, package.json

## Contract
- Grid: BUFFER_SEC in {0.05, 0.075, 0.10, 0.125, 0.15} x NEAR_MARGIN fraction
  in {0.10, 0.25, 0.40} — import the constants from js/game.js; if a knob is
  not exported, sweep the parameter THROUGH `tickRun`'s exported state shape
  only; do NOT edit js/game.js to add knobs.
- Each cell: 200 seeded runs x 1000 ticks using the injected `rng` (mulberry32
  per seed, seed = cell*1000+run), scripted press policy = press at feet-cross
  offset drawn uniform in [-0.2, +0.2] s scaled by a window-offset ladder
  {0.0, 0.5, 1.0, 1.5} x BUFFER_SEC.
- CSV columns exactly: buffer_sec,near_margin,offset_mult,runs,trips_per_1k,
  forgiven_per_1k,near_miss_rate,avg_skip_rate
- Deterministic: same inputs => byte-identical CSV. No Math.random.
- FAIL FAST: if `BUFFER_SEC` (or the buffer field on run state per D-N01) does
  not exist in js/game.js yet, print SWEEP-BLOCKED: <missing> and exit 1 —
  do not simulate a fake buffer.

## Acceptance gate (machine-checkable, one line)
`node tools/night/sweep/feel_sweep.mjs --check` prints `SWEEP OK rows=60`
and exits 0 (60 = 5 x 3 x 4 cells).

## Design decisions (pinned; do not re-litigate at runtime)
- Sweep exists to serve morning playtest tuning of D-N11/D-N12; the table,
  not any code change, is the deliverable.
- The sim stays pure; the sweep is Node-only and imports js/game.js directly.
