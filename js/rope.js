export function createRope(period = 0.9) {
  return { phase: 0, period };
}

export function updateRope(rope, dt) {
  const inc = dt / rope.period;
  const phase = rope.phase + inc;
  return { ...rope, phase: phase >= 1 ? (rope.phase - 1) + inc : phase };
}

const FEET_MIN = 0.45;
const FEET_MAX = 0.55;

// Multi-rope derivation (FR1): rope k of N shares the one canonical clock,
// offset by k/N of a revolution. k = 0, N = 1 is exactly the plain feet window.
export function atFeetOffset(phase, k, count) {
  const derived = (phase + k / count) % 1;
  return derived >= FEET_MIN && derived <= FEET_MAX;
}

export function atFeet(rope) {
  return atFeetOffset(rope.phase, 0, 1);
}

export function obstacleX(phase, width, cx = width / 2) {
  return cx + (width - cx) * (1 - 2 * phase);
}
