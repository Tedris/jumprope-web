export function createRope(period = 0.9) {
  return { phase: 0, period };
}

export function updateRope(rope, dt) {
  const inc = dt / rope.period;
  const phase = rope.phase + inc;
  return { ...rope, phase: phase >= 1 ? (rope.phase - 1) + inc : phase };
}

export function atFeet(rope) {
  return rope.phase >= 0.45 && rope.phase <= 0.55;
}

export function obstacleX(phase, width, cx = width / 2) {
  return cx + (width - cx) * (1 - 2 * phase);
}
