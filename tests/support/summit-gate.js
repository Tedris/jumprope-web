// Story 6.1: the policy-bot summit gate — the balance master-dial's batch
// runner. One deterministic number answers "is the game winnable at the
// right pace": seeded shapes x seeds x horizon, summit reach rate vs the
// target band (NFR9: 5-20%, 3-5 min runs on a competent build).
//
// The policy bot (AC1's documented rules, Decided 2 — the pick heuristic is
// the ONLY competence assumption in the gate):
//   JUMP: grounded && exists k in 0..clampRopes(run.ropes)-1 with
//         d_k = ((0.45 + k/N - phase) mod 1 + 1) mod 1 in [0.45 - hi, 0.45 - lo]
//         (lo 0.20, hi 0.35, hold 0.5 s full-hold, honoring
//         effects.launchMul ?? 1). At ropes 1 this is EXACTLY the legacy
//         phase-in-[0.20,0.35] scripted jumper — equivalence leg in
//         tests/summitgate.test.js; the predicate itself is the one shipped
//         in balance-harness.js runBot (same formula, pinned by the parity +
//         predicate cross-check legs).
//   PICK: take `extrarope` when offered AND live run.ropes < 3; otherwise the
//         FIRST card of the offer (offer order comes from the real seeded
//         pickOffers draw — deterministic, no peeking). Resolution is always
//         applyCard + resumeRun (ARCH-02, never startRun after a pick).
//
// Batch (Decided 7): shapes bare {} / ropeHeavy {ropes: 5} / chargeHeavy
// {charged: 2} (the extrarope/reinforce cap shapes, ledger :92-94) x seeds x
// horizon, `owned: {}` so offers FIRE and the rng draws — with cappedOwned()
// the rng never draws and seeds are vacuous (ledger :168). The per-run loop
// lives here (not runBot) because the report's instrumentation — per-card
// picksTally/offeredTally/firstTally, offerEvents and the outcome-split
// finalRopes (6.3 retires terminalRopes, BH-F6) — reads the live record,
// which runBot's pinned result shape does not expose. Traces are evaluated-
// then-dropped per run (Decided 8: 120 held traces ~ 600 MB; a batch never
// holds more than one).
//
// Pure Node: relative ../../js/*.js imports plus ./balance-harness.js only;
// seeded mulberry32 through a counting wrapper (the rng-invocation idiom of
// tests/headless-sim.test.js:99-104); POJO returns; no console.*.

import { startRun, tickRun, applyCard, resumeRun, ALT_PER_POINT, ROPE_PERIOD, clampRopes } from '../../js/game.js';
import { AREAS } from '../../js/areas.js';
import { freshEffects } from '../../js/upgrades.js';
import { jump } from '../../js/player.js';
import { evaluateLadder, mulberry32 } from './balance-harness.js';

const STEP = 1 / 120;

// Decided 7's batch: 40 seeds (2.5% rate granularity) x 43,200 ticks
// (360 s >= the 5-min wall-clock target + slack).
const DEFAULT_SEEDS = Object.freeze(Array.from({ length: 40 }, (_, i) => i));
const DEFAULT_SHAPES = Object.freeze({
  bare: Object.freeze({}),
  ropeHeavy: Object.freeze({ ropes: 5 }),
  chargeHeavy: Object.freeze({ charged: 2 }),
});
const POLICY = Object.freeze({ lo: 0.2, hi: 0.35, hold: 0.5 });

export function jumpWindowOpen(phase, ropes) {
  const n = clampRopes(ropes);
  for (let k = 0; k < n; k++) {
    const d = ((0.45 + k / n - phase) % 1 + 1) % 1;
    if (d >= 0.45 - POLICY.hi && d <= 0.45 - POLICY.lo) return true;
  }
  return false;
}

function pickHeuristic(offer, run) {
  const extra = offer.find((c) => c.id === 'extrarope');
  return extra !== undefined && clampRopes(run.ropes) < 3 ? extra : offer[0];
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// One seeded run: play to the terminal tick or the horizon, then let the
// post-hoc evaluator answer for the trace (evaluate-then-drop, Decided 8).
// `outcome` is the SIM's own ending (summit | tripped | horizon); `won` is
// the EVALUATOR's verdict on the swept ladder — at the shipped ladder the
// two agree (parity legs), and a swept batch reads like the dial sweep it is.
function runSeed({ build, seed, horizon, altPerPoint, ladder, altitude0 }) {
  const draws = { calls: 0 };
  const draw = mulberry32(seed);
  const rng = () => {
    draws.calls += 1;
    return draw();
  };
  const tally = {};
  // Story 6.3 offer instrumentation (Decided 3): the choose state pauses the
  // sim until resolved (tickRun breaks on it), so this loop's resolution site
  // sees EVERY offer exactly once. Count only — no rates, no judgments here.
  const offered = {};
  const firsts = {};
  let offers = 0;
  let picks = 0;
  let { rope, player, run } = startRun();
  rope = { ...rope, period: ROPE_PERIOD };
  run = { ...run, effects: freshEffects(), owned: {}, altitude: altitude0, ...build };

  const trace = [];
  let outcome = 'horizon';
  let endTick = null;
  for (let tick = 0; tick < horizon; tick++) {
    if (run.status === 'choose') {
      for (const c of run.offer) offered[c.id] = (offered[c.id] ?? 0) + 1;
      firsts[run.offer[0].id] = (firsts[run.offer[0].id] ?? 0) + 1;
      offers += 1;
      const card = pickHeuristic(run.offer, run);
      tally[card.id] = (tally[card.id] ?? 0) + 1;
      picks += 1;
      run = applyCard(run, card);
      ({ rope, player, run } = resumeRun(run));
      rope = { ...rope, period: ROPE_PERIOD }; // resumeRun re-launches the canonical lead-in
    }
    if (player.grounded && jumpWindowOpen(rope.phase, run.ropes)) {
      player = jump(player, POLICY.hold, run.effects.launchMul ?? 1);
    }
    ({ run, rope, player } = tickRun(run, rope, player, STEP, rng));
    trace.push({
      tick, score: run.score, altitude: run.altitude, y: player.y,
      phase: rope.phase, status: run.status, iFrames: run.iFrames,
    });
    if (run.status === 'over') {
      outcome = run.outcome === 'summit' ? 'summit' : 'tripped';
      endTick = tick;
      break;
    }
  }
  if (endTick === null) endTick = trace.length;

  const won = evaluateLadder(
    { trace, winTick: outcome === 'summit' ? endTick : null },
    { altPerPoint, ladder },
  ).winTick !== null;
  return {
    outcome, endTick, won, picks, tally,
    rngDraws: draws.calls,
    offers, offered, firsts,
    finalRopes: clampRopes(run.ropes),
  };
}

// The dial: per-shape seeded batches -> summit-rate report (Decided 7).
// `verdict` is the band comparison of the AGGREGATE rate — the report is the
// deliverable at placeholder tunables; the in-band ASSERTION is Story 6.2's
// (Decided 6). `tunables` echoes the values that produced the batch, pulled
// from the live records by default (table-free).
export function summitGate(options = {}) {
  const {
    seeds = DEFAULT_SEEDS,
    horizon = 43200,
    shapes = DEFAULT_SHAPES,
    band = [0.05, 0.20],
    altPerPoint = ALT_PER_POINT,
    ladder = AREAS.map((a) => a.ceiling),
    altitude0 = 0,
  } = options;

  const shapeReports = {};
  let summits = 0;
  let runsTotal = 0;
  for (const [name, build] of Object.entries(shapes)) {
    const runs = [];
    const picksTally = {};
    const offeredTally = {};
    const firstTally = {};
    const finalRopes = {};
    let offerEvents = 0;
    const runSecs = [];
    const summitSecs = [];
    let rngDraws = 0;
    let shapeSummits = 0;
    for (const seed of seeds) {
      const r = runSeed({ build, seed, horizon, altPerPoint, ladder, altitude0 });
      summits += r.won ? 1 : 0;
      shapeSummits += r.won ? 1 : 0;
      runsTotal += 1;
      runs.push({
        seed, outcome: r.outcome, endTick: r.endTick,
        seconds: r.endTick * STEP, picks: r.picks,
      });
      for (const [id, n] of Object.entries(r.tally)) picksTally[id] = (picksTally[id] ?? 0) + n;
      for (const [id, n] of Object.entries(r.offered)) offeredTally[id] = (offeredTally[id] ?? 0) + n;
      for (const [id, n] of Object.entries(r.firsts)) firstTally[id] = (firstTally[id] ?? 0) + n;
      offerEvents += r.offers;
      const h = (finalRopes[r.outcome] ??= {});
      h[r.finalRopes] = (h[r.finalRopes] ?? 0) + 1;
      rngDraws += r.rngDraws;
      runSecs.push(r.endTick * STEP);
      if (r.won) summitSecs.push(r.endTick * STEP);
    }
    shapeReports[name] = {
      runs,
      rate: seeds.length > 0 ? shapeSummits / seeds.length : 0,
      medianRunSecs: median(runSecs),
      medianSummitSecs: median(summitSecs),
      rngDraws,
      picksTally,
      offeredTally,
      firstTally,
      offerEvents,
      finalRopes,
    };
  }

  const rate = runsTotal > 0 ? summits / runsTotal : 0;
  const verdict = rate < band[0] ? 'out-low' : rate > band[1] ? 'out-high' : 'in';
  return {
    verdict,
    rate,
    band: [...band],
    tunables: { altPerPoint, ladder: [...ladder] },
    shapes: shapeReports,
  };
}

// AC3: a failing gate is a tuning report. The string names the measured rate
// (percent AND raw fraction), the violated band, and the exact tunable values
// that produced the batch — the sweep hand-off for Story 6.2, never a bare
// red X. Legs assert its content; nothing here prints it.
export function gateFailureReport(report) {
  const { verdict, rate, band, tunables } = report;
  return `summit gate ${verdict.toUpperCase()}: measured summit rate ${(rate * 100).toFixed(1)}% (${rate}) `
    + `outside band [${(band[0] * 100).toFixed(1)}%, ${(band[1] * 100).toFixed(1)}%] `
    + `at tunables altPerPoint=${tunables.altPerPoint} ladder=[${tunables.ladder.join(',')}] `
    + `- retune ALT_PER_POINT / the AREAS ceiling ladder (Story 6.2 owns the sweep)`;
}
