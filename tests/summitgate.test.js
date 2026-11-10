import test from 'node:test';
import assert from 'node:assert/strict';
import * as gate from './support/summit-gate.js';
import * as harness from './support/balance-harness.js';
import * as game from '../js/game.js';
import { AREAS } from '../js/areas.js';
import { CARDS, freshEffects } from '../js/upgrades.js';
import { jump } from '../js/player.js';

// Story 6.1: the policy-bot summit gate legs. The gate (tests/support/
// summit-gate.js) is the balance master-dial's batch runner; these legs pin
// its factory contract, the live-batch report structure, determinism under
// seeded rng (AC2), the out-of-band verdict MECHANICS and the failure-report
// formatter (AC3), the iFrames parity fix (ledger :104-105), the effects-
// records fold (ledger :134-136), and the N-window jump rule's ropes-1
// equivalence (Decided 2). Decided 6 discipline: ZERO literal current-build
// numbers in this file — no rates, no win ticks, no medians — so the Story
// 6.2 tunable retune never reddens a 6.1 leg by value. Seeds are literals.

const STEP = 1 / 120;
const ALT = game.ALT_PER_POINT;
const sortedKeys = (obj) => Object.keys(obj).sort();

// Decided 7's batch, as test literals (the rng is never Math.random and the
// seeds are never computed): seeds 0..39, horizon 43,200 ticks (360 s).
const SEEDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39];
const SHAPES = { bare: {}, ropeHeavy: { ropes: 5 }, chargeHeavy: { charged: 2 } };

// The full live batch is expensive (~0.7 s for 120 runs); share ONE instance
// across the report legs (Decided 8 budget: the gate legs stay <= 0.8 s).
let liveReport = null;
const live = () => {
  if (liveReport === null) liveReport = gate.summitGate({ seeds: SEEDS, horizon: 43200, shapes: SHAPES, band: [0.05, 0.20] });
  return liveReport;
};

// Test-local raw-sim mirror (the simAscentTicks idiom of balance.test.js:28-44,
// copied, never imported): drives tickRun directly and records the SIM's own
// ascend-event ticks. The jump predicate is Decided 2's N-window rule.
function mirrorAscents({ ticks, altitude0, build }) {
  let { rope, player, run } = game.startRun();
  run = { ...run, effects: freshEffects(), owned: harness.cappedOwned(), altitude: altitude0, ...build };
  const ascends = [];
  for (let tick = 0; tick < ticks; tick++) {
    const n = game.clampRopes(run.ropes);
    let inWindow = false;
    for (let k = 0; k < n && !inWindow; k++) {
      const d = ((0.45 + k / n - rope.phase) % 1 + 1) % 1;
      if (d >= 0.45 - 0.35 && d <= 0.45 - 0.20) inWindow = true;
    }
    if (player.grounded && inWindow) player = jump(player, 0.5, run.effects.launchMul ?? 1);
    const out = game.tickRun(run, rope, player, STEP, () => 0.5);
    ({ run, rope, player } = out);
    if (out.events.includes('ascend')) ascends.push(tick);
    if (run.status === 'over') break;
  }
  return ascends;
}

// --- Task 2: contract leg (factory contract, AGENTS.md) ---

test('summit-gate export surface and every report key set are pinned', () => {
  assert.deepEqual(sortedKeys(gate), ['gateFailureReport', 'jumpWindowOpen', 'summitGate']);
  const report = gate.summitGate({ seeds: [0], horizon: 600, shapes: { bare: {} } });
  assert.deepEqual(sortedKeys(report), ['band', 'rate', 'shapes', 'tunables', 'verdict']);
  assert.deepEqual(sortedKeys(report.shapes.bare),
    ['medianRunSecs', 'medianSummitSecs', 'picksTally', 'rate', 'rngDraws', 'runs', 'terminalRopes']);
  assert.deepEqual(sortedKeys(report.shapes.bare.runs[0]), ['endTick', 'outcome', 'picks', 'seconds', 'seed']);
  assert.deepEqual(sortedKeys(report.tunables), ['altPerPoint', 'ladder']);
});

// --- Task 3: live-batch legs (AC1, ledger :92-94) ---

test('live batch: all three shapes report rates in [0,1] equal to their summit counts, honest outcomes, exact seconds', () => {
  const report = live();
  assert.deepEqual(sortedKeys(report.shapes), ['bare', 'chargeHeavy', 'ropeHeavy'],
    'the band is measured on bare AND rope-heavy AND charge-heavy builds (ledger :92-94)');
  for (const shape of Object.values(report.shapes)) {
    assert.equal(shape.runs.length, SEEDS.length);
    let summits = 0;
    for (const r of shape.runs) {
      assert.ok(r.outcome === 'summit' || r.outcome === 'tripped' || r.outcome === 'horizon',
        `outcome ${r.outcome} is one of the three terminal classes`);
      if (r.outcome === 'summit') summits += 1;
      assert.equal(r.seconds, r.endTick * STEP, 'seconds is exactly endTick x STEP');
      assert.ok(Number.isInteger(r.endTick) && r.endTick >= 1);
    }
    assert.ok(shape.rate >= 0 && shape.rate <= 1);
    assert.equal(shape.rate, summits / SEEDS.length, 'rate equals summits/seeds (parity legs tie outcome to winTick)');
    assert.ok(Number.isFinite(shape.medianRunSecs));
    for (const [ropes, count] of Object.entries(shape.terminalRopes)) {
      assert.ok(Number.isFinite(count) && count > 0, 'terminalRopes histogram counts are finite and positive');
      assert.ok(Number(ropes) >= game.MIN_ROPES && Number(ropes) <= game.MAX_ROPES, 'terminal ropes are a valid count');
    }
    for (const [id, n] of Object.entries(shape.picksTally)) {
      assert.ok(CARDS.some((c) => c.id === id), `picksTally keys are shipped card ids (${id})`);
      assert.ok(Number.isFinite(n) && n > 0);
    }
  }
});

test('verdict is the band comparison of the report rate - mechanism, never a value', () => {
  const report = live();
  const [lo, hi] = report.band;
  const expected = report.rate < lo ? 'out-low' : report.rate > hi ? 'out-high' : 'in';
  assert.ok(report.verdict === 'in' || report.verdict === 'out-low' || report.verdict === 'out-high');
  assert.equal(report.verdict, expected);
  assert.deepEqual(report.tunables, { altPerPoint: ALT, ladder: AREAS.map((a) => a.ceiling) },
    'tunables echo the LIVE records, table-free');
});

// --- Task 3: determinism legs (AC2, ledger :168-169) ---

test('identical config twice is deepEqual - seeded determinism end to end', () => {
  const cfg = { seeds: [0, 1, 2], horizon: 14400, shapes: SHAPES, band: [0.05, 0.20] };
  assert.deepEqual(gate.summitGate(cfg), gate.summitGate(cfg));
});

test('rngDraws seed-honesty: every shape draws, every run picks - never the vacuous cappedOwned path (ledger :168)', () => {
  for (const shape of Object.values(live().shapes)) {
    assert.ok(shape.rngDraws > shape.runs.length,
      'the batch rng draws MORE THAN ONCE PER RUN - pickOffers is reached, seeds are not vacuous');
    for (const r of shape.runs) {
      assert.ok(r.picks >= 1, 'seed-honesty per run: offers fire and picks land through applyCard + resumeRun');
    }
  }
});

// --- Task 3: out-of-band mechanism legs (AC3) ---

test('crafted unreachable-ladder batch: rate 0, verdict out-low, failure report names the producing values', () => {
  const report = gate.summitGate({ seeds: [0, 1, 2, 3], horizon: 7200, ladder: [1000000000, 1000000000, 1000000000, 1000000000, 1000000000] });
  assert.equal(report.rate, 0);
  assert.equal(report.verdict, 'out-low');
  const msg = gate.gateFailureReport(report);
  assert.ok(msg.includes(`(${report.rate})`) && msg.includes(`${(report.rate * 100).toFixed(1)}%`),
    'the report identifies the measured rate');
  assert.ok(msg.includes(`altPerPoint=${report.tunables.altPerPoint}`), 'the report names the exact ALT_PER_POINT');
  assert.ok(msg.includes(`ladder=[${report.tunables.ladder.join(',')}]`), 'the report names the exact ladder');
});

test('crafted tiny-ladder near-summit batch: rate 1, verdict out-high, failure report content', () => {
  const report = gate.summitGate({ seeds: [0, 1, 2, 3], horizon: 7200, ladder: [0, 0, 0, 0, 1] });
  assert.equal(report.rate, 1);
  assert.equal(report.verdict, 'out-high');
  const msg = gate.gateFailureReport(report);
  assert.ok(msg.includes(`(${report.rate})`) && msg.includes(`${(report.rate * 100).toFixed(1)}%`));
  assert.ok(msg.includes(`altPerPoint=${report.tunables.altPerPoint}`));
  assert.ok(msg.includes(`ladder=[${report.tunables.ladder.join(',')}]`));
});

test('crafted mid-climb batch: bot physics wins a seed subset - verdict rides the band law', () => {
  // The craft: the live ladder with the summit ceiling pulled 200 short (a
  // post-hoc sweep - the traces stay the shipped-physics ones). Winners are
  // the runs whose climb crosses that line before they trip or run out of
  // horizon: a strict subset of the seed set, and by construction it tracks
  // the sim's own summit population - what Story 6.2's retune aims IN this
  // very band, so the 'in' mechanism stays honest across tunables. No rate
  // value is asserted anywhere - only the verdict mechanism (Decided 6).
  const nearSummitLadder = AREAS.map((a) => a.ceiling);
  nearSummitLadder[nearSummitLadder.length - 1] -= 200;
  const report = gate.summitGate({ seeds: SEEDS, horizon: 43200, shapes: SHAPES, band: [0.05, 0.20], ladder: nearSummitLadder });
  assert.equal(report.verdict,
    report.rate < 0.05 ? 'out-low' : report.rate > 0.20 ? 'out-high' : 'in',
    'verdict is the band LAW of the measured rate, never a pinned value (Decided 6)');
  assert.ok(report.rate > 0, 'the craft populates winners - a mid-climb batch exists');
  for (const shape of Object.values(report.shapes)) {
    for (const r of shape.runs) {
      assert.ok(r.outcome === 'summit' || r.outcome === 'tripped' || r.outcome === 'horizon');
    }
  }
});

// --- Task 3: parity legs (ledger :104-105) ---

test('evaluator iFrames read mirrors the sim on crafted traces: non-finite opens, finite blanks block', () => {
  const ladder = [10, 20, 40, 80, 100];
  const runOver = (iFrames) => [0, 1, 2, 3, 4].map((tick) =>
    ({ tick, score: 1, altitude: 300, y: 0, phase: 0, status: 'running', iFrames }));
  // The story's single-entry probe reads gate-OPEN now (crossTicks [0] where
  // the old read produced []; winTick needs one ascend per ladder step, the
  // one-ascend-per-tick law - so the crafted trace below is five ticks).
  assert.deepEqual(harness.evaluateLadder(
    [{ tick: 0, score: 1, altitude: 300, y: 0, phase: 0, status: 'running', iFrames: Infinity }],
    { ladder }).crossTicks, [0], 'baseline repro inverted: Infinity no longer skips the tick');
  assert.equal(harness.evaluateLadder(runOver(Infinity), { ladder }).winTick, 4, 'Infinity iFrames = gate OPEN (tickRun read)');
  assert.equal(harness.evaluateLadder(runOver(NaN), { ladder }).winTick, 4, 'NaN iFrames = gate OPEN');
  assert.equal(harness.evaluateLadder(runOver(-Infinity), { ladder }).winTick, 4, '-Infinity iFrames = gate OPEN');
  const blocked = harness.evaluateLadder(runOver(2), { ladder });
  assert.equal(blocked.winTick, null, 'a finite blank still blocks');
  assert.deepEqual(blocked.crossTicks, [], 'a constant finite blank blocks the whole ladder (gate-CLOSED read, finite-identical)');
});

test('multi-rope live parity: the build-seeded trace crosses exactly the ticks the sim itself ascends', () => {
  // A tick-0 start would cross NOTHING for ~19k ticks - vacuous (the ledger
  // :168 lesson) - so the leg seeds ropes 3 from altitude 2000: the ladder
  // ascends fire in the opening ticks AND the N-window lead-ins trip ropes
  // 2-3 inside the horizon, so the lists also exercise the iFrames-parity
  // read across REAL strip blanks (ledger :104-105 made executable).
  const cfg = { ticks: 1200, altitude0: 2000, build: { ropes: 3 } };
  const view = harness.evaluateLadder(harness.runBot(cfg));
  const ascends = mirrorAscents(cfg);
  assert.ok(view.crossTicks.length >= 3, 'the crafted start makes the parity non-vacuous');
  assert.deepEqual(view.crossTicks, ascends);
});

// --- Task 3: rope-window equivalence leg (Decided 2 safety) ---

test('ropes-1 equivalence: the N-window predicate is EXACTLY the legacy phase window', () => {
  // balance.test.js:28-44 mirror idiom with the LEGACY predicate verbatim:
  // grounded && phase in [0.20, 0.35] -> jump(0.5). Byte-identical traces at
  // ropes 1 mean every frozen leg of the 2.5/1.x suites rides unchanged.
  const ticks = 1200;
  let { rope, player, run } = game.startRun();
  run = { ...run, effects: freshEffects(), owned: harness.cappedOwned(), altitude: 0 };
  const mirrorTrace = [];
  for (let tick = 0; tick < ticks; tick++) {
    if (player.grounded && rope.phase >= 0.2 && rope.phase <= 0.35) player = jump(player, 0.5, run.effects.launchMul ?? 1);
    ({ run, rope, player } = game.tickRun(run, rope, player, STEP, () => 0.5));
    mirrorTrace.push({
      tick, score: run.score, altitude: run.altitude, y: player.y,
      phase: rope.phase, status: run.status, iFrames: run.iFrames,
    });
    if (run.status === 'over') break;
  }
  assert.deepEqual(mirrorTrace, harness.runBot({ ticks }).trace);
});


// --- Task 3: predicate cross-check leg (review round patch, BH-F1) ---

test('predicate cross-check: the gate copy equals the harness mirror and the policy window edges', () => {
  // BH-F1: the gate loop carries a COPY of runBot's jump predicate; batch
  // outcomes are symmetric under k -> N-k, so drift can hide in dial numbers
  // with the whole suite green. Pin (a) the copies against each other on a
  // dense phase grid — the mirror re-encodes the rule, harness-style, never
  // calling either shipped loop — and (b) the policy window itself at its
  // edges: a lead of exactly 0.45 - hi / 0.45 - lo revolutions opens, just
  // outside closes. A sign-flip class is provably inert (multiset k <-> N-k
  // symmetry over the union — blind-hunter probe: sign-flipped batch
  // measures identical summit sets); a POLICY-constant or k-loop drift dies
  // on the edge probes or the grid.
  const mirror = (phase, ropes) => {
    const n = game.clampRopes(ropes);
    for (let k = 0; k < n; k++) {
      const d = ((0.45 + k / n - phase) % 1 + 1) % 1;
      if (d >= 0.45 - 0.35 && d <= 0.45 - 0.2) return true;
    }
    return false;
  };
  for (const ropes of [1, 2, 3, 4, 5]) {
    for (let i = 0; i < 4096; i++) {
      const phase = i / 4096;
      assert.equal(gate.jumpWindowOpen(phase, ropes), mirror(phase, ropes),
        `phase ${phase} ropes ${ropes}: gate copy vs harness-style mirror`);
    }
  }
  for (const lead of [0.1, 0.25]) {
    assert.ok(gate.jumpWindowOpen(0.45 - lead, 1), `lead exactly ${lead} opens (closed window)`);
  }
  for (const lead of [0.09, 0.26]) {
    assert.ok(!gate.jumpWindowOpen(0.45 - lead, 1), `lead ${lead} is outside the policy window`);
  }
});

// --- Task 3: fold legs (ledger :134-136, mirrors R1's law) ---

test('effects-records fold: run-shaped rule-report entries read off records, the blind spot is closed', () => {
  const report = harness.cardRuleReport({ ticks: 1200 });
  const byId = new Map(report.cards.map((c) => [c.id, c]));
  const extra = byId.get('extrarope');
  assert.ok(extra.climbDeltaPick > 0.5,
    `extrarope pick ${extra.climbDeltaPick} - the fold kills the effects-only ~0 blind spot`);
  assert.ok(extra.climbDeltaCap > 0,
    `extrarope cap ${extra.climbDeltaCap} stays positive (strip law: never ordered against the pick)`);
  for (const id of ['reinforce', 'doublejump']) {
    for (const key of ['climbDeltaPick', 'climbDeltaCap']) {
      assert.ok(Math.abs(byId.get(id)[key]) <= 0.02, `${id}.${key} is record-neutral within 0.02`);
    }
  }
  assert.ok(report.neutralClimb.includes('reinforce') && report.neutralClimb.includes('doublejump'),
    'the trip-free record fields stay neutral');
  assert.ok(!report.neutralClimb.includes('extrarope'),
    'extrarope EXITS neutralClimb - the 3.2/3.3 report blind spot is closed');
  for (const entry of report.cards) {
    assert.ok(Number.isFinite(entry.climbDeltaPick) && Number.isFinite(entry.climbDeltaCap),
      `effects- AND record-path numbers are finite (${entry.id})`);
  }
});

// --- Story 6.2 Task 4: A1 one-leg append (the review round's append precedent) ---

test('6.2 retune law: the live batch verdict is IN and every shape summits inside the NFR9 clock', () => {
  // A1 (story A1 authorization): AC2's in-band assertion + the NFR9 wall-clock
  // law ride the file's ONE memoized lazy batch (Decided 11 budget: ~0 s extra
  // wall). LAWS only — the band is the batch's own constructed band, the
  // 180/300 s bounds are Decided 2(b)'s NFR9 spec constants; zero build-pinned
  // numerics (Decided 10).
  const report = live();
  assert.equal(report.verdict, 'in',
    `the aggregate verdict sits in the constructed band [${report.band}]`);
  for (const [name, shape] of Object.entries(report.shapes)) {
    assert.ok(shape.rate >= report.band[0] && shape.rate <= report.band[1],
      `${name}: rate ${shape.rate} sits inside the band the batch was constructed with`);
    assert.ok(shape.medianSummitSecs !== null && shape.medianSummitSecs <= 300,
      `${name}: median summit clock within the NFR9 5-minute bound (300 s)`);
    assert.ok(shape.medianSummitSecs !== null && shape.medianSummitSecs >= 180,
      `${name}: median summit clock above the NFR9 3-minute floor (180 s, Decided 2(b))`);
  }
});
