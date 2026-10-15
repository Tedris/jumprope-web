import test from 'node:test';
import assert from 'node:assert/strict';
import { lerpPhase } from '../js/interpolate.js';

const EPS = 1e-12;
const near = (got, want) => Math.abs(got - want) < EPS;

test('mid-range interpolation is the plain midpoint', () => {
  assert.ok(near(lerpPhase(0.2, 0.4, 0.5), 0.3), `got ${lerpPhase(0.2, 0.4, 0.5)}`);
});

test('alpha endpoints return prev and curr (mod 1)', () => {
  assert.ok(near(lerpPhase(0.2, 0.4, 0), 0.2) && near(lerpPhase(0.2, 0.4, 1), 0.4));
  assert.ok(near(lerpPhase(0.995, 0.005, 0), 0.995) && near(lerpPhase(0.995, 0.005, 1), 0.005));
});

test('wrap crossing takes the short path, never a backwards sweep', () => {
  // A naive prev + (curr - prev) * alpha yields ~0.5 here — the once-per-
  // revolution snap-back of RESEARCH Pitfall 3.
  const got = lerpPhase(0.995, 0.005, 0.5);
  assert.ok(got < 0.02, `expected ~0.0 across the wrap, got ${got}`);
});

test('output stays in [0, 1) for wrap-straddling pairs at every alpha', () => {
  for (const [prev, curr] of [[0.995, 0.005], [0.99, 0.01], [0.98, 0.02]]) {
    for (const alpha of [0, 0.25, 0.5, 0.75, 1]) {
      const r = lerpPhase(prev, curr, alpha);
      assert.ok(r >= 0 && r < 1, `lerpPhase(${prev}, ${curr}, ${alpha}) = ${r} out of range`);
    }
  }
});

test('a single step across the wrap stays local — the rope never visually reverses', () => {
  // prev -> curr is one ~0.0064 phase step (STEP/period = (1/120)/1.3);
  // every interpolated position must stay within that step of the wrap point.
  const STEP_DELTA = 0.0064;
  for (const alpha of [0, 0.25, 0.5, 0.75, 1]) {
    const r = lerpPhase(0.995, 0.0014, alpha);
    const dist = Math.min(r, 1 - r);
    assert.ok(dist <= STEP_DELTA + EPS, `alpha ${alpha}: ${r} is more than one step from the wrap`);
  }
});
