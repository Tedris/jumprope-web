// Story 2.2 (FR15): the area ladder — pure data, never functions here
// (crossesCeiling lives in js/game.js). `ceiling` is the altitude that ENDS
// the area; base altitude of area n = the previous row's ceiling, area 1 = 0
// (no base field by design). The numbers are PLACEHOLDERS — Epic 6 owns the
// balance pass; periodMul is wired (Story 4.2), palette/fog values (Story 4.3).
export const AREAS = Object.freeze([
  Object.freeze({ area: 1, name: 'alley', ceiling: 250, periodMul: 1.00, palette: 'alley', fog: 0x2a3440 }),
  Object.freeze({ area: 2, name: 'rooftops', ceiling: 600, periodMul: 0.96, palette: 'rooftops', fog: 0x16213e }),
  // The fog ladder (finalized by Story 4.3, D-a): per-channel monotonically
  // darkening with altitude; row 1 equals the renderer's signed-off SKY.
  Object.freeze({ area: 3, name: 'blimp', ceiling: 1000, periodMul: 0.92, palette: 'blimp', fog: 0x101a30 }),
  Object.freeze({ area: 4, name: 'stratosphere', ceiling: 1500, periodMul: 0.88, palette: 'stratosphere', fog: 0x0a1020 }),
  // Area 5's ceiling is the summit win ceiling (FR9).
  Object.freeze({ area: 5, name: 'moon-approach', ceiling: 2100, periodMul: 0.85, palette: 'moon-approach', fog: 0x060610 }),
]);
