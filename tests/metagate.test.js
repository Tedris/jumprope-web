import test from 'node:test';
import assert from 'node:assert/strict';
import * as gate from './support/summit-gate.js';

// Story 7.5: the meta-aware seed-honesty legs — the gate sees the peel.
// 7.4 made meta state change what a VETERAN player can be DEALT inside a run
// (the unlock trio becomes dealable once the meta counters grew past the
// thresholds — the fresh-session lock view at run creation, js/shell.js via
// lockedIdsFor), while the fresh player's deal stays the v2 12-card pool
// (locked view = absence, the FR32 law). These legs pin that split as a
// MECHANISM through the batch's real pickOffers draws: (a) trio-absence in
// every fresh stream, (b) the veteran-grant witness, (c) the determinism
// twin on both configs, (d) the bare-invariance law — adding a meta shape to
// a batch cannot shift the bare dial one bit (per-(shape,seed) independence,
// support/summit-gate.js runSeed carries no cross-shape state).
// A2/Decided-6 discipline (summitgate.test.js:16-18): ZERO current-build
// numerics in this file — no rates, no medians, no tally VALUES, never a
// rate comparison against a recorded sweep number. Keys, laws, and deepEqual
// twins only; the measured sweep numerics live in the story's D3 table, not
// here. Seeds and horizons are literals (the summitgate idiom).
// Budget (NFR4): reduced-seed sub-batches via the `shapes`/`seeds` options
// — the summitgate.test.js:121-124 twin craft; the FULL sweep lives OUTSIDE
// the suite, in the sandbox (6.3 precedent), witnessed x2 in the Debug Log.

const TRIO = ['springsoles', 'luckyecho', 'longstride'];

// The DEFAULT_SHAPES trio of fresh shapes as test literals (the same craft
// as summitgate.test.js:28 — this file passes shapes per CALL; the support
// defaults are untouched, D1) plus the VETERAN shape: { lockedIds: [] } is
// the meta-grant reading (D1) — a meta that grew past every threshold locks
// nothing, so the trio enters the veteran deal stream at run start.
const FRESH_SHAPES = { bare: {}, ropeHeavy: { ropes: 5 }, chargeHeavy: { charged: 2 } };
const VETERAN_SHAPES = { ...FRESH_SHAPES, veteran: { lockedIds: [] } };

// Reduced sub-batch literals: seeds 0..3 x horizon 14,400 (120 s) — the
// summitgate.test.js:122 twin-batch craft, ~1/12 of the full sweep's run
// budget, shared by legs (a)/(b) through ONE memoized batch.
const SEEDS = [0, 1, 2, 3];
const HORIZON = 14400;
const BATCH = { seeds: SEEDS, horizon: HORIZON, shapes: VETERAN_SHAPES, band: [0.05, 0.20] };

let batchReport = null;
const batch = () => {
  if (batchReport === null) batchReport = gate.summitGate(BATCH);
  return batchReport;
};

// --- Task 3 leg (a): batch trio-absence (AC3; the BATCH view — the
// unit-level twins live in locks.test.js, D5) ---

test('fresh streams never see the trio: locked view = absence end to end through the batch draws (FR32)', () => {
  for (const [name, shape] of Object.entries(batch().shapes)) {
    if (name === 'veteran') continue; // the grant witness is leg (b)
    for (const id of TRIO) {
      assert.ok(!(id in shape.offeredTally),
        `fresh shape ${name}: a locked card was OFFERED — the lock filter leaked into the batch draw stream`);
      assert.ok(!(id in shape.picksTally),
        `fresh shape ${name}: a locked card was PICKED — the trio is un-dealable at fresh meta`);
    }
  }
});

// --- Task 3 leg (b): veteran-grant witness (AC2's in-suite structural
// shadow; dealability OBSERVED, not assumed) ---

test('the veteran shape is dealt the trio: grant witnesses on the veteran stream, seed-honest rng (D1/D5)', () => {
  const veteran = batch().shapes.veteran;
  for (const id of TRIO) {
    assert.ok(id in veteran.offeredTally,
      `the meta-grant shape never offered ${id} — the unlock trio did not enter the veteran deal stream`);
  }
  // The rngDraws seed-honesty law, verbatim from summitgate.test.js:126-134:
  assert.ok(veteran.rngDraws > veteran.runs.length,
    'the batch rng draws MORE THAN ONCE PER RUN - pickOffers is reached, seeds are not vacuous');
});

// --- Task 3 leg (c): determinism twin (AC3; the :121-124 idiom, BOTH
// configs — the meta grant must not smuggle any hidden cross-run state) ---

test('same config twice is deepEqual - determinism twin on the fresh AND veteran batches (AC3)', () => {
  const fresh = { seeds: [0, 1, 2], horizon: HORIZON, shapes: FRESH_SHAPES, band: [0.05, 0.20] };
  const veteran = { seeds: [0, 1, 2], horizon: HORIZON, shapes: VETERAN_SHAPES, band: [0.05, 0.20] };
  assert.deepEqual(gate.summitGate(fresh), gate.summitGate(fresh));
  assert.deepEqual(gate.summitGate(veteran), gate.summitGate(veteran));
});

// --- Task 3 leg (d): the bare-invariance law (AC3) — "the peel moves no
// bare dial" as a MECHANISM, not a hope. The cross-tree half of the proof
// stays EXTERNAL: 274aac9-vs-HEAD same-seed streams byte-identical,
// MD5 70abd6d1... (7-4 story Debug Log :204); the suite stays single-tree
// honest (D5). ---

test('adding the veteran shape to a batch shifts the bare dial ZERO bits - per-(shape,seed) independence (FR32 tripwire)', () => {
  const bareOnly = gate.summitGate({ seeds: SEEDS, horizon: HORIZON, shapes: { bare: {} }, band: [0.05, 0.20] });
  const barePlusVeteran = gate.summitGate({ seeds: SEEDS, horizon: HORIZON, shapes: { bare: {}, veteran: { lockedIds: [] } }, band: [0.05, 0.20] });
  assert.deepEqual(bareOnly.shapes.bare, barePlusVeteran.shapes.bare,
    'the bare-shape report moved when a meta shape joined the batch - runSeed carries cross-shape state');
});
