// Story 2.2 (FR15): the area ladder — pure data, never functions here
// (crossesCeiling lives in js/game.js). `ceiling` is the altitude that ENDS
// the area; base altitude of area n = the previous row's ceiling, area 1 = 0
// (no base field by design). Story 6.2's balance pass RETIRED the placeholders:
// ceilings/periodMul carry their sweep-derived values (per-row gate evidence
// below, School B summit-preserving retune, live-physics sweeps in /tmp: the
// create round's 19-candidate frontier + the dev round's 25-row grid, both
// tabled in the 6.2 story Debug Log); palette/fog values finalized by 4.3 but
// owned-not-consumed here:
// the renderer keeps a drift-fenced VISTAS copy (a js/render3d.js import would
// break its two-specifier boot wheel).
export const AREAS = Object.freeze([
  // Row 1 GATE-CONFIRMED UNCHANGED: 250/1.00 — the alley bit-identity fence
  // (areapressure row-1 leg) + §7 witness seed; gate 0.142 in, medSum
  // 290.8/279.9/297.2 s @ 2026-11-10.
  Object.freeze({ area: 1, name: 'alley', ceiling: 250, periodMul: 1.00, palette: 'alley', fog: 0x2a3440 }),
  // 6.2 retune (ceiling gate-confirmed, period .96→.95 strictly-decreasing
  // ladder rung): gate 0.142 in, medSum 290.8/279.9/297.2 s @ 2026-11-10.
  Object.freeze({ area: 2, name: 'rooftops', ceiling: 600, periodMul: 0.95, palette: 'rooftops', fog: 0x16213e }),
  // The fog ladder (finalized by Story 4.3, D-a): per-channel monotonically
  // darkening with altitude; row 1 equals the renderer's signed-off SKY.
  // 6.2 retune (ceiling 1000→900 + period .92→.88 — mid-climb length lever,
  // spacing law ≥250 kept): gate 0.142 in, medSum 290.8/279.9/297.2 s @ 2026-11-10.
  Object.freeze({ area: 3, name: 'blimp', ceiling: 900, periodMul: 0.88, palette: 'blimp', fog: 0x101a30 }),
  // 6.2 retune (ceiling 1500→1350 + period .88→.82): gate 0.142 in, medSum
  // 290.8/279.9/297.2 s @ 2026-11-10.
  Object.freeze({ area: 4, name: 'stratosphere', ceiling: 1350, periodMul: 0.82, palette: 'stratosphere', fog: 0x0a1020 }),
  // Area 5's ceiling is the summit win ceiling (FR9) — 2100 kept: School B is
  // summit-preserving (near-summit rigs stay honest); period .85→.76 is the
  // ladder's length lever (floor 0.74, blackout fences hold ~9×): gate 0.142
  // in, medSum 290.8/279.9/297.2 s @ 2026-11-10.
  Object.freeze({ area: 5, name: 'moon-approach', ceiling: 2100, periodMul: 0.76, palette: 'moon-approach', fog: 0x060610 }),
]);
