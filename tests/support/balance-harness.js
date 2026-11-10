// Story 2.5: ascent economy balance harness — a measurement instrument over
// the real sim. Tunables (altitude-per-skip, ceiling ladder, rope period) are
// parameters of these reports, never production seams (Decided 1: zero js/ edits).
// Pure Node: relative js/ imports only, seeded rng by injection, POJO returns.

import { startRun, tickRun, applyCard, resumeRun, ALT_PER_POINT, ROPE_PERIOD, MAX_ROPES, clampRopes, clampCharged, clampAirJumps } from '../../js/game.js';
import { AREAS } from '../../js/areas.js';
import { CARDS, freshEffects, pickOffers } from '../../js/upgrades.js';
import { jump } from '../../js/player.js';

const STEP = 1 / 120;

// Decided 3: axis = the FIRST effect field each card's apply closure writes
// (js/upgrades.js order matters: windup writes ropeMul before scoreMul).
// Role-grouping is flavor and mispredicts the collision baseline, so this
// map is the contract — tests/balance.test.js guards it against the closures.
export const AXIS = Object.freeze({
  float: 'floatMul',
  feather: 'floatMul',
  multi: 'scoreMul',
  tally: 'scoreMul',
  window: 'windowMul',
  widebrim: 'windowMul',
  slowrope: 'ropeMul',
  windup: 'ropeMul',
  // Story 3.1: inert rule-changers map to the field names their future
  // effects will write (game-architecture.md:601) — launchMul follows the
  // *Mul convention; ropes/charged/airJumps are plain run-state names. The
  // guard leg exempts the inert class; collision math treats them as
  // axis-singletons.
  extrarope: 'ropes',
  reinforce: 'charged',
  doublejump: 'airJumps',
  highjump: 'launchMul',
});

// Deterministic seeded rng (Decided 9): collision draw i gets its own
// mulberry32(seed + i) stream, so changing the draw count never shifts
// earlier draws.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Every CARDS id at its cap (tests/catalogue.test.js:86-88 idiom): the pool
// is exhausted, so pickOffers returns [] and Pitfall 6's path keeps the run
// 'running' — measurements never freeze in choose or consume rng (Decided 4).
export function cappedOwned() {
  return Object.fromEntries(CARDS.map((c) => [c.id, c.cap]));
}

// The scripted jumper of tests/headless-sim.test.js:39-59 generalized by
// Story 6.1 (Decided 2) to the N-window rule: grounded && phase in ANY rope
// k's lead-in window -> jump(hold); at ropes 1 the predicate is EXACTLY
// phase in [lo, hi]. Never startRun after a pick (ARCH-02): choose resolves
// through applyCard + resumeRun. Traces record POST-tick status/iFrames —
// exactly tickRun's ascend-gate values (game.js:185), so the post-hoc ladder
// evaluator reads what the sim itself saw.
export function runBot(config = {}) {
  const {
    ticks = 1200,
    period = ROPE_PERIOD,
    effects = freshEffects(),
    altitude0 = 0,
    owned = cappedOwned(),
    policy = { lo: 0.2, hi: 0.35, hold: 0.5 },
    pickStrategy = null,
    build = {},
    rng = () => 0.5,
  } = config;

  let { rope, player, run } = startRun();
  rope = { ...rope, period };
  // Story 6.1 (Decided 3): `build` seeds run-shaped state (ropes/charged/
  // airJumps) on the RECORD where tickRun reads it (game.js:146-164), never
  // in run.effects. Default {} + single rope = byte-identical to today.
  run = { ...run, effects, owned, altitude: altitude0, ...build };

  const trace = [];
  let tripTick = null;
  let winTick = null;
  let picks = 0;

  for (let tick = 0; tick < ticks; tick++) {
    if (run.status === 'choose') {
      if (!pickStrategy) break;
      run = applyCard(run, pickStrategy(run.offer, picks));
      ({ rope, player, run } = resumeRun(run));
      rope = { ...rope, period }; // resumeRun re-launches the canonical lead-in
      picks += 1;
    }
    // Story 6.1 (Decided 2): the N-window jump predicate, read through the
    // sim's own rope clamp (game.js:164) every tick — d_k is the phase
    // distance to rope k's feet-edge start, in window [0.45 - hi, 0.45 - lo].
    // At N = 1 this is EXACTLY phase in [lo, hi] — the legacy scripted
    // jumper (equivalence leg, tests/summitgate.test.js). Story 3.2
    // (deferred-work :84): honors launchMul — peak numbers stay honest.
    const nRopes = clampRopes(run.ropes);
    let inWindow = false;
    for (let k = 0; k < nRopes && !inWindow; k++) {
      const d = ((0.45 + k / nRopes - rope.phase) % 1 + 1) % 1;
      inWindow = d >= 0.45 - policy.hi && d <= 0.45 - policy.lo;
    }
    if (player.grounded && inWindow) {
      player = jump(player, policy.hold, run.effects.launchMul ?? 1);
    }
    ({ run, rope, player } = tickRun(run, rope, player, STEP, rng));
    trace.push({
      tick, score: run.score, altitude: run.altitude, y: player.y,
      phase: rope.phase, status: run.status, iFrames: run.iFrames,
    });
    if (run.status === 'over') {
      if (run.outcome === 'summit') winTick = tick;
      else tripTick = tick;
      break;
    }
  }

  let maxPeak = -Infinity;
  for (const e of trace) {
    if (e.altitude + e.y > maxPeak) maxPeak = e.altitude + e.y;
  }
  // deferred-work.md:6 blackout — a tick whose phase step spans >= the 0.1-wide
  // feet window can skip a crossing whole; such numbers are not clean.
  const invalidPhaseStep = (STEP * run.effects.ropeMul) / period >= 0.1;

  return {
    trace,
    elapsedTicks: trace.length,
    trips: tripTick !== null,
    tripTick,
    winTick,
    skips: run.skips,
    altitude: run.altitude,
    maxPeak,
    invalidPhaseStep,
  };
}

// altPerPoint is post-hoc-exact because tickRun accrues
// altitude += ALT_PER_POINT * scoreMul (game.js:111,:141) and the ladder never
// feeds physics (ascent writes area/baseAltitude/outcome only) — Decided 2.
function sweptAltitude(entry, altPerPoint) {
  return entry.altitude + (altPerPoint - ALT_PER_POINT) * entry.score;
}

// Post-hoc ladder evaluation over a logged trace, recomputing tickRun's own
// ascend gate (status in {running, choose} && no i-frames left under the
// sim's own clamped read (Story 6.1), strict `>`, at
// most one ascend per tick). Accepts a trace array or a full runBot result;
// the latter additionally proves the terminal tick was a summit (not a trip,
// which the sim excludes from ascending — "trip > win"), so an 'over' last
// tick is gate-eligible only then.
// An empty trace yields the empty view; a trace ending in a trip
// extrapolates no ETA.
export function evaluateLadder(target, options = {}) {
  const { altPerPoint = ALT_PER_POINT, ladder = AREAS.map((a) => a.ceiling) } = options;
  const trace = Array.isArray(target) ? target : target.trace;
  const terminalAlive = Array.isArray(target) ? false : target.winTick != null;
  const last = trace.length - 1;
  if (last < 0) {
    return { crossTicks: [], winTick: null, summitEta: Infinity, reachedArea: 1, climbRate: 0 };
  }

  const crossTicks = [];
  let areaIdx = 1;
  let winTick = null;
  for (let i = 0; i <= last; i++) {
    const e = trace[i];
    const alive = e.status === 'running' || e.status === 'choose'
      || (i === last && terminalAlive && e.status === 'over');
    // Story 6.1 (Decided 4, ledger :104-105): mirror tickRun's FR3 read
    // (game.js:146): non-finite iFrames = gate-OPEN; closed iff the clamped
    // finite read is > 0. Finite behavior byte-identical (the frozen parity
    // legs are finite-only).
    const iframesLeft = Number.isFinite(e.iFrames)
      ? Math.min(MAX_ROPES, Math.max(0, e.iFrames)) : 0;
    if (!alive || iframesLeft > 0) continue;
    const peak = sweptAltitude(e, altPerPoint) + e.y;
    if (areaIdx === ladder.length && peak > ladder[ladder.length - 1]) {
      winTick = e.tick;
      break;
    }
    if (peak > ladder[areaIdx - 1]) {
      crossTicks.push(e.tick);
      areaIdx += 1;
    }
  }

  const elapsedSec = trace.length * STEP;
  const end = trace[last];
  const climbRate = sweptAltitude(end, altPerPoint) / elapsedSec;
  let summitEta;
  if (winTick !== null) {
    summitEta = winTick * STEP;
  } else if (end.status === 'over' && !terminalAlive) {
    summitEta = Infinity; // trip > extrapolation: a dead run gets no ETA (Decided 7)
  } else {
    // Decided 2 verbatim: elapsed + (ladderTop - maxPeakEnd) / (altPerPoint x skipsPerSec).
    // The velocity is the score delta across the window -- a level-based rate
    // would fold a seeded altitude0 into the velocity (6.6x optimistic at 100).
    let maxPeakEnd = -Infinity;
    for (const e of trace) {
      const p = sweptAltitude(e, altPerPoint) + e.y;
      if (p > maxPeakEnd) maxPeakEnd = p;
    }
    const velocity = (sweptAltitude(end, altPerPoint) - sweptAltitude(trace[0], altPerPoint)) / elapsedSec;
    summitEta = velocity > 0 ? elapsedSec + (ladder[ladder.length - 1] - maxPeakEnd) / velocity : Infinity;
  }

  return {
    crossTicks,
    winTick,
    summitEta,
    reachedArea: winTick !== null ? ladder.length : areaIdx,
    climbRate,
  };
}

// AC1: altitude-per-skip, ceiling-crossing ticks, and summit ETA for a given
// tunable set on one bot run.
export function ascentReport(config = {}) {
  const { altPerPoint = ALT_PER_POINT, ladder = AREAS.map((a) => a.ceiling), ...botConfig } = config;
  const result = runBot(botConfig);
  const ladderView = evaluateLadder(result, { altPerPoint, ladder });
  const end = result.trace[result.trace.length - 1];
  return {
    altitudePerSkip: end && result.skips > 0
      ? sweptAltitude(end, altPerPoint) / result.skips : Infinity,
    crossTicks: ladderView.crossTicks,
    summitEta: ladderView.summitEta,
  };
}

function stackedEffects(card, times) {
  let effects = freshEffects();
  for (let i = 0; i < times; i++) effects = card.apply(effects);
  return effects;
}

// Story 6.1 (Decided 5, ledger :134-136): the effects-records fold — run-shaped
// cards (card.shape === 'run') compose against a FRESH RUN RECORD instead of
// the effects endofunction: stackedRun = card.apply x times on startRun().run
// (the record endofunction patchedRun uses, game.js:294-301), installed
// through runBot's build seed with patchedRun's clamps mirrored. The
// extrarope/reinforce/doublejump rule numbers stop leaking run fields into
// the effects record (the documented 3.2/3.3 blind spot).
function stackedRun(card, times) {
  let { run } = startRun();
  for (let i = 0; i < times; i++) run = card.apply(run);
  return run;
}

function runBuild(card, times) {
  const rec = stackedRun(card, times);
  return {
    ropes: clampRopes(rec.ropes),
    charged: clampCharged(rec.charged),
    airJumps: clampAirJumps(rec.airJumps),
  };
}

function maxHeight(result) {
  let top = -Infinity;
  for (const e of result.trace) if (e.y > top) top = e.y;
  return top;
}

// Decided 7: elapsed is the horizon, or the trip tick when the run died
// first — a tripped variant's rate is honest, never divided by the full horizon.
function climbRate(result) {
  const elapsed = result.trips ? result.tripTick : result.elapsedTicks;
  return result.altitude / elapsed;
}

// AC3: rule report over the shipped catalogue. Offer-suppressed horizons
// (cappedOwned), baseline + each card at 1-pick and at cap; dominance per
// Decided 8 (same axis, >= on every component at BOTH strengths, strict on
// one); reduceClimb = measured climb cut; neutralClimb = trip-free zero-delta.
export function cardRuleReport(options = {}) {
  const { ticks = 1200 } = options;
  const baseline = runBot({ ticks });
  // Horizon must contain at least one skip: baseRate 0 makes every delta NaN.
  const baseRate = climbRate(baseline);
  const baseMax = maxHeight(baseline);

  const cards = CARDS.map((card) => {
    // Story 6.1 (Decided 5): marker-driven fold — run-shaped variants measure
    // on build-seeded records; the effects-shape path (and its numbers) is
    // untouched. Report key sets are unchanged (pinned, balance.test.js:65-75).
    const variant = (times) => card.shape === 'run'
      ? runBot({ ticks, build: runBuild(card, times) })
      : runBot({ ticks, effects: stackedEffects(card, times) });
    const pickRun = variant(1);
    const capRun = variant(card.cap);
    return {
      id: card.id,
      name: card.name,
      axis: AXIS[card.id],
      climbDeltaPick: climbRate(pickRun) / baseRate - 1,
      climbDeltaCap: climbRate(capRun) / baseRate - 1,
      peakDeltaPick: maxHeight(pickRun) / baseMax - 1,
      peakDeltaCap: maxHeight(capRun) / baseMax - 1,
      trips: pickRun.trips || capRun.trips,
    };
  });

  const dominated = [];
  for (const a of cards) {
    for (const b of cards) {
      if (a.id === b.id || a.axis !== b.axis) continue;
      const ge = a.climbDeltaPick <= b.climbDeltaPick && a.climbDeltaCap <= b.climbDeltaCap
        && a.peakDeltaPick <= b.peakDeltaPick && a.peakDeltaCap <= b.peakDeltaCap;
      const strict = a.climbDeltaPick < b.climbDeltaPick || a.climbDeltaCap < b.climbDeltaCap
        || a.peakDeltaPick < b.peakDeltaPick || a.peakDeltaCap < b.peakDeltaCap;
      if (ge && strict) dominated.push({ id: a.id, by: b.id });
    }
  }

  return {
    baseline: {
      skips: baseline.skips,
      altitude: baseline.altitude,
      maxPeak: baseline.maxPeak,
      elapsedTicks: baseline.elapsedTicks,
      altitudePerSkip: baseline.skips > 0 ? baseline.altitude / baseline.skips : Infinity,
      climbRate: baseRate,
    },
    cards,
    dominated,
    reduceClimb: cards.filter((c) => c.climbDeltaPick < 0 || c.climbDeltaCap < 0).map((c) => c.id),
    neutralClimb: cards.filter((c) => !c.trips && c.climbDeltaPick === 0 && c.climbDeltaCap === 0).map((c) => c.id),
  };
}

// AC4: share of seeded offer draws that put two same-axis cards on the table.
// Story 3.2 note (D-e): deliberately still state-less — the exact-enumeration
// twin in tests/balance.test.js is the state-less reference the 3.1 baselines
// were pinned against; narrowing to live state is a 6.1/6.3 decision.
export function collisionReport(options = {}) {
  const { draws = 20000, pick = 2, seed = 0 } = options;
  let collisions = 0;
  for (let i = 0; i < draws; i++) {
    const offer = pickOffers(CARDS, {}, pick, mulberry32(seed + i));
    const axes = new Set(offer.map((c) => AXIS[c.id]));
    if (axes.size < offer.length) collisions += 1;
  }
  return { rate: draws > 0 ? collisions / draws : 0, draws };
}

// AC5: the Epic 6 reuse seam — seeds x tunables x pick-strategy -> summit
// reach rate and win ticks. Story 6.1's master-dial loops configs/seeds over
// this without rework.
export function summitRate(options = {}) {
  const {
    seeds = [0, 1, 2],
    altPerPoint = ALT_PER_POINT,
    ladder = AREAS.map((a) => a.ceiling),
    ...botConfig
  } = options;
  const winTicks = seeds.map((seed) => {
    const result = runBot({ ...botConfig, rng: mulberry32(seed) });
    // Post-hoc (Decided 2): the trace answers any (K, ladder) -- the same run
    // serves the whole dial sweep. At default tunables this equals the sim's
    // own win tick (evaluator-parity leg).
    return evaluateLadder(result, { altPerPoint, ladder }).winTick;
  });
  const summits = winTicks.filter((t) => t !== null).length;
  return {
    seeds: [...seeds],
    summits,
    rate: seeds.length > 0 ? summits / seeds.length : 0,
    winTicks,
  };
}
