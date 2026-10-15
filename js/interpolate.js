export function lerpPhase(prev, curr, alpha) {
  let d = curr - prev;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  const p = prev + d * alpha;
  return ((p % 1) + 1) % 1;
}
