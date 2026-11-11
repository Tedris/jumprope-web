import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, isAvailable, pickOffers, lockedIdsFor } from '../js/upgrades.js';
import { createRun, startRun, resumeRun, applyCard, tickRun } from '../js/game.js';

// Story 7.3 (FR32/FR33): catalogue locks in the deal. The derivation (lockedIdsFor)
// and the predicate extension are PURE DATA read at the one filter point, so these
// legs import the sim directly — catalogue.test.js / offerstate.test.js donors, no
// shell harness. Seed honesty (epics.md:117, rider A2): every bit-identity pin
// compares the SHIPPED behavior of the same build (form-vs-form across the
// trailing arg); no recorded current-build numerics anywhere.

// Seeded LCG (numerical-recipes constants, exact 32-bit via Math.imul) —
// same idiom as tests/catalogue.test.js, deterministic, no Math.random.
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Counting rng wrapper — reports how many draws the batch consumed, so the
// rng-never-shift law is OBSERVED (equal call counts), not argued.
function counting(seed) {
  const next = seeded(seed);
  const rng = () => { rng.calls += 1; return next(); };
  rng.calls = 0;
  return rng;
}

// Tick rig (tests/offercadence.test.js idiom): the feet-cross rising edge lands
// exactly CROSS_TICKS tickRun calls ahead (0.0001 of float headroom inside
// [0.45, 0.55]); airborne at COMFORT_Y is a clean pass. Fresh rope + player per
// crossing, generalized by ropeMul so post-pick scripts stay honest.
const STEP = 1 / 120;
const RIG_PERIOD = 1.3;
const INC = STEP / RIG_PERIOD;
const CROSS_TICKS = 8;
const COMFORT_Y = 40;
const rngStub = () => 0.5;
const rigRope = (crossTicks, ropeMul = 1) => ({
  phase: 0.4501 - crossTicks * INC * ropeMul, period: RIG_PERIOD,
});
const airPlayer = (y) => ({ y, vy: 0, grounded: false, squash: 1, squashVel: 0 });

function scriptCrossing({ run, rope, player, rng }) {
  const events = [];
  for (let tick = 0; tick < CROSS_TICKS; tick++) {
    const out = tickRun(run, rope, player, STEP, rng, null);
    events.push(...out.events);
    ({ run, rope, player } = out);
  }
  return { run, events };
}

const cleanCross = (run0, rng = rngStub, ropeMul = 1) => scriptCrossing({
  run: run0, rope: rigRope(CROSS_TICKS, ropeMul), player: airPlayer(COMFORT_Y), rng,
});

// Crafted pool for the derivation/predicate legs: PLAIN carries no unlock
// metadata, VACUOUS an empty threshold set, LOCK_* single- and multi-key S2
// mirrors. NO stateCap anywhere — this is the leg that falsifies the D1
// ordering landmine (a lock check below the early return would never run).
// name !== id ON PURPOSE (review 7.3 Blind F1): leg (a)'s id-projection pin —
// a derivation mapping to card.name instead of card.id reddens here, where a
// name===id fixture would sail through and ship silently-inert locks.
const mkCard = (id, extra) => ({
  id, name: id + ' card', desc: id, icon: 'x', role: 'foundation', color: 'sky',
  rarity: 'common', cap: 3, apply: (s) => ({ ...s }), ...extra,
});
const LOCK_AREA = mkCard('lockarea', { unlock: { furthestArea: 3 } });
const LOCK_PAIR = mkCard('lockpair', { unlock: { summits: 1, skips: 100 } });
const PLAIN = mkCard('plain');
const VACUOUS = mkCard('vacuous', { unlock: {} });

test('(a) derivation law: locked iff unlock metadata exists AND not every threshold is met', () => {
  assert.deepEqual(lockedIdsFor([LOCK_AREA], { furthestArea: 3 }), [], 'threshold met = unlocked');
  assert.deepEqual(lockedIdsFor([LOCK_AREA], { furthestArea: 4 }), [], 'above threshold unlocked too');
  assert.deepEqual(lockedIdsFor([LOCK_AREA], { furthestArea: 2 }), ['lockarea'], 'one short = locked');
  assert.deepEqual(lockedIdsFor([LOCK_AREA], { summits: 9 }), ['lockarea'],
    'the missing counter key reads 0 (law-form (meta?.[key] ?? 0) >= min)');
  assert.deepEqual(lockedIdsFor([LOCK_AREA], undefined), ['lockarea'],
    'absent meta reads as a fresh session — every counter 0');
  assert.deepEqual(lockedIdsFor([LOCK_AREA], null), ['lockarea'], 'null meta likewise');
  assert.deepEqual(lockedIdsFor([LOCK_AREA], {}), ['lockarea'], 'empty meta likewise');
  assert.deepEqual(lockedIdsFor([LOCK_PAIR], { summits: 1, skips: 100 }), [], 'every threshold met');
  assert.deepEqual(lockedIdsFor([LOCK_PAIR], { summits: 1, skips: 99 }), ['lockpair'],
    'one threshold short keeps it locked — ALL must be met to unlock');
  assert.deepEqual(lockedIdsFor([LOCK_PAIR], { summits: 0, skips: 100 }), ['lockpair'], 'likewise');
  assert.deepEqual(lockedIdsFor([VACUOUS], undefined), [],
    'unlock: {} is vacuously satisfied = UNLOCKED (D4 polarity: locked = NOT-all-met)');
  assert.deepEqual(lockedIdsFor([VACUOUS], { furthestArea: 9 }), [], 'empty unlock stays inert under any meta');
  // no-`unlock` cards NEVER lock under any meta:
  for (const meta of [undefined, {}, { furthestArea: 9, summits: 9, skips: 999 }]) {
    assert.deepEqual(lockedIdsFor([PLAIN], meta), [], `plain stays unlocked under ${JSON.stringify(meta)}`);
  }
  assert.deepEqual(lockedIdsFor([LOCK_PAIR, PLAIN, LOCK_AREA], {}), ['lockpair', 'lockarea'],
    'pool-order output, deterministic, no rng (D4)');
});

test('(i) derive-then-deal end to end: ids, never names, reach the filter (review 7.3 Blind F1)', () => {
  // The 7.4 caller chain is lockedIdsFor(CARDS, meta) → run.lockedIds → the
  // deal filter. A name-projection bug between derivation and deal would ship
  // locks that never lock; this leg DEALS from the DERIVED set with names
  // distinct from ids, across seeds, so the projection is witnessed.
  const POOL = [LOCK_AREA, PLAIN];
  const locked = lockedIdsFor(POOL, { furthestArea: 1 });
  assert.deepEqual(locked, ['lockarea'], 'derivation emits the ID, not the name');
  for (let seed = 1; seed <= 30; seed++) {
    const deals = pickOffers(POOL, {}, 2, seeded(seed), undefined, locked);
    assert.ok(!deals.some((c) => c.id === 'lockarea'), `seed ${seed}: the derived lock holds in the deal`);
    assert.ok(deals.some((c) => c.id === 'plain'), `seed ${seed}: the unlocked sibling still deals`);
  }
  const free = pickOffers(POOL, {}, 2, seeded(7), undefined, lockedIdsFor(POOL, { furthestArea: 3 }));
  assert.equal(free.length, 2, 'unlocked meta deals the full pair — the witness is non-vacuous');
});

test('(b) INERT guard (story-shape tripwire): the shipped catalogue carries zero unlock metadata', () => {
  // Story 7.3 ships INERT (AC4): which cards lock and at which thresholds is
  // decision S2 at Story 7.4 kickoff (FR33, epics.md:1059) — that story will
  // RE-CONTRACT this leg by adding real `unlock` entries and relaxing the
  // every-arm. Until then this tripwire catches any drive-by lock.
  assert.ok(CARDS.every((c) => !('unlock' in c)),
    'no CARDS entry may carry unlock metadata in 7.3 — deal bit-identity (AC2/AC4)');
  for (const meta of [undefined, {}, { furthestArea: 9, summits: 9, skips: 999 }]) {
    assert.deepEqual(lockedIdsFor(CARDS, meta), [],
      `the shipped catalogue derives zero locks under ${JSON.stringify(meta)} (AC4)`);
  }
});

test('(c) filter point: lockedIds hides across every count; the predicate reads lockedIds, never metadata', () => {
  // Crafted stateCap-FREE pool (falsifies the D1 ordering landmine: a lock
  // check placed below the early return would never run for these cards).
  const POOL = [mkCard('alpha', { unlock: { furthestArea: 3 } }), mkCard('bravo'),
    mkCard('charlie', { unlock: { summits: 1 } }), mkCard('delta')];
  const BARE = POOL.map(({ unlock, ...card }) => card);
  const idsOf = (deals) => deals.map((deal) => deal.map((card) => card.id));
  let sawAlpha = false;
  for (let count = 1; count <= 4; count++) {
    for (let seed = 1; seed <= 30; seed++) {
      const deal = pickOffers(POOL, {}, count, seeded(seed), undefined, ['bravo']);
      assert.ok(!deal.some((card) => card.id === 'bravo'), `count ${count}: bravo never deals`);
      assert.equal(new Set(deal.map((card) => card.id)).size, deal.length, 'never repeats');
      assert.equal(deal.length, count < 4 ? count : 3,
        'full offers until the locked card shrinks the pool, then fewer-than-count');
      if (deal.some((card) => card.id === 'alpha')) sawAlpha = true;
    }
  }
  assert.ok(sawAlpha, 'non-vacuity: the hidden one is bravo, not the whole pool');
  // unlock metadata alone never hides — the predicate consumes the LOCK SET,
  // not card fields; metadata-bearing and stripped pools deal identically at
  // identical rng call counts for the same lockedIds (any value).
  for (const lockedIds of [['bravo'], ['nope'], [], undefined]) {
    for (let seed = 1; seed <= 20; seed++) {
      const a = counting(seed); const b = counting(seed);
      const withMeta = pickOffers(POOL, {}, 2, a, undefined, lockedIds);
      const stripped = pickOffers(BARE, {}, 2, b, undefined, lockedIds);
      assert.deepEqual(idsOf([withMeta]), idsOf([stripped]),
        `unlock metadata is invisible to the predicate (lockedIds ${JSON.stringify(lockedIds)})`);
      assert.equal(a.calls, b.calls, 'identical rng consumption across the metadata twin');
    }
  }
  // the predicate directly: trailing 4th arg, invalid (non-array) data INERT.
  assert.equal(isAvailable(PLAIN, {}, undefined, ['plain']), false, 'locked by set');
  assert.equal(isAvailable(PLAIN, {}, undefined, []), true, 'empty set locks nothing');
  assert.equal(isAvailable(PLAIN, {}, undefined), true, 'omitted keeps the exact 3-arg contract');
  assert.equal(isAvailable(PLAIN, {}, undefined, 'plain'), true,
    'a crafted STRING lock set is inert, never a substring match (epics.md:106)');
  assert.equal(isAvailable(PLAIN, { plain: PLAIN.cap }, undefined, []), false,
    'the owned cap still rules beside the extension');
});

test('(d) rng-stream pin (AC2): identical seeds deal identical cards with identical consumption across the 6th arg', () => {
  const floatCap = CARDS.find((c) => c.id === 'float').cap;
  const OWNED = [{}, { feather: 1 }, { float: floatCap }];
  const STATES = [undefined, { ropes: 5, charged: 2 }, { ropes: 2, charged: 0 }];
  const batch = () => {
    const rows = [];
    for (let seed = 1; seed <= 24; seed++) {
      for (const owned of OWNED) {
        for (const state of STATES) {
          const a = counting(seed); const b = counting(seed); const c = counting(seed);
          const shipped = pickOffers(CARDS, owned, 2, a, state);            // the shipped call
          const empty = pickOffers(CARDS, owned, 2, b, state, []);          // explicit empty set
          const omitted = pickOffers(CARDS, owned, 2, c, state, undefined); // trailing arg omitted
          rows.push({
            ids: [shipped, empty, omitted].map((deal) => deal.map((card) => card.id)),
            calls: [a.calls, b.calls, c.calls],
          });
        }
      }
    }
    return rows;
  };
  const first = batch();
  for (const [n, row] of first.entries()) {
    assert.deepEqual(row.ids[1], row.ids[0], `row ${n}: lockedIds [] deals exactly the shipped cards`);
    assert.deepEqual(row.ids[2], row.ids[0], `row ${n}: omitted 6th arg deals exactly the shipped cards`);
    assert.equal(row.calls[1], row.calls[0], `row ${n}: [] consumes zero extra rng — stream never shifts`);
    assert.equal(row.calls[2], row.calls[0], `row ${n}: omission consumes zero extra rng`);
  }
  assert.deepEqual(batch(), first, 'x2 determinism witness: the whole batch replays identically');
});

test('(e) the run-creation ride: lockedIds is the sanitized 17th record key', () => {
  assert.deepEqual(createRun().lockedIds, [], 'default contract: an empty frozen set');
  assert.deepEqual(startRun().run.lockedIds, [], 'startRun passes it through to the record');
  assert.deepEqual(startRun(['float', 'multi']).run.lockedIds, ['float', 'multi'], 'the set rides verbatim');
  assert.deepEqual(startRun(['float', 7, null, 'multi']).run.lockedIds, ['float', 'multi'],
    'non-strings are dropped, order kept — sanitized like every other run field');
  assert.deepEqual(createRun(['x', 3]).lockedIds, ['x'], 'sanitize leg on createRun directly');
  for (const junk of ['nope', null, undefined, true, { locked: true }, 42]) {
    assert.deepEqual(createRun(junk).lockedIds, [], `non-array arg ${JSON.stringify(junk)} sanitizes to []`);
  }
  assert.deepEqual(createRun([{}]).lockedIds, [], 'array of non-strings sanitizes to []');
});

test("(e') resumeRun freezes the set for the run's life; a record MISSING the key heals via ?? []", () => {
  const resumed = resumeRun({ ...createRun(), lockedIds: ['float'] });
  assert.deepEqual(resumed.run.lockedIds, ['float'], 'the spread preserves the record lock set');
  const withKey = { ...createRun(), skips: 9 };
  const without = { ...createRun(), skips: 9 };
  delete without.lockedIds;
  const a = cleanCross(withKey);
  const b = cleanCross(without);
  assert.equal(a.run.status, 'choose', 'rig: the cleared 10th skip arms the deal');
  assert.deepEqual(b.events, a.events, 'the healed twin deals with identical events');
  assert.deepEqual(b.run.offer.map((card) => card.id), a.run.offer.map((card) => card.id),
    'missing key deals exactly like [] — the run.owned ?? {} twin heal');
});

test('(f) frozen mid-run: the deal reads the RECORD, never a fresh derivation', () => {
  assert.deepEqual(lockedIdsFor(CARDS, { furthestArea: 9, summits: 9, skips: 999 }), [],
    'rig premise: grown counters derive no locks YET (the ship is inert) — the record still rules');
  let frozenSawFloat = false;
  let freeSawFloat = false;
  for (let seed = 1; seed <= 40; seed++) {
    const frozen = cleanCross({ ...createRun(), skips: 9, lockedIds: ['float'] }, seeded(seed));
    assert.equal(frozen.run.status, 'choose', `seed ${seed}: the 10th skip arms the deal`);
    if (frozen.run.offer.some((card) => card.id === 'float')) frozenSawFloat = true;
    const free = cleanCross({ ...createRun(), skips: 9, lockedIds: [] }, seeded(seed));
    if (free.run.offer.some((card) => card.id === 'float')) freeSawFloat = true;
  }
  assert.ok(!frozenSawFloat, 'a run created with float locked never deals float, however counters grow');
  assert.ok(freeSawFloat, 'non-vacuity: a run created with [] does deal float across the same seeds');
});

test('(g) tickRun-level bit-identity inside the shipped cadence (AC2/AC3 witness)', () => {
  // Scripted rng-driven deal crossings past skips 10/20/30 (the offercadence
  // tick idiom, size 2 then 3): a createRun()-default record and a twin with
  // the key deleted must walk identically — events, offers, rng consumption.
  const walk = (record) => {
    const rng = counting(0x5EED);
    const events = []; const offers = [];
    let run = record; let ropeMul = 1;
    while (run.skips < 30) {
      const out = scriptCrossing({ run, rope: rigRope(CROSS_TICKS, ropeMul), player: airPlayer(COMFORT_Y), rng });
      events.push(...out.events);
      run = out.run;
      if (run.status === 'choose') {
        offers.push(run.offer.map((card) => card.id));
        const picked = applyCard(run, run.offer[0]);
        run = resumeRun(picked).run;
        ropeMul = run.effects.ropeMul ?? 1;
      }
    }
    return { events, offers, calls: rng.calls };
  };
  const a = walk({ ...createRun(), lockedIds: [] });
  const twin = { ...createRun() };
  delete twin.lockedIds;
  const b = walk(twin);
  assert.ok(a.offers.length >= 3, 'rig: the walk crossed the 10th, 20th and 30th-skip offers');
  assert.deepEqual(b.events, a.events, 'identical event channel — the empty/healed set changes no tick');
  assert.deepEqual(b.offers, a.offers, 'identical offers across every boundary');
  assert.equal(b.calls, a.calls, 'identical rng consumption — the stream never shifted');
});

test('(h) the FORGIVEN deal twin honors locks — buffer-forgiven 30th-skip deal (D2 twins, review F1 falsifier)', () => {
  // Review F1: leg (g) crosses only cleared paths, so unthreading the 6.2
  // forgiven twin (game.js:227-228) stayed green. This leg drives a FORGIVEN
  // crossing onto the 30th skip where float is the ONLY available card
  // (every sibling pinned at its owned cap): threaded locks exclude it —
  // exhausted pool arms NO choose (Pitfall 6) — while the unthreaded/healed
  // pool deals it. If the twin ever drops the 6th arg, the locked arm deals
  // float and this leg reddens deterministically.
  const capsOwn = {};
  for (const c of CARDS) if (c.id !== 'float') capsOwn[c.id] = c.cap ?? Infinity;
  const forgone = (withKey) => {
    const rng = counting(0x5EED);
    const run0 = { ...createRun(), skips: 29, buffer: 0.1, owned: { ...capsOwn } };
    if (withKey === 'locked') run0.lockedIds = ['float'];
    else if (withKey === 'empty') run0.lockedIds = [];
    else delete run0.lockedIds; // the heal arm: key absent, `?? []` must cover
    const out = scriptCrossing({ run: run0, rope: rigRope(CROSS_TICKS, 1), player: airPlayer(8), rng });
    return out;
  };
  const locked = forgone('locked');
  assert.equal(locked.run.skips, 30, 'rig: the crossing was FORGIVEN onto the 30th skip (buffer consumed, scored)');
  assert.ok(locked.events.includes('nearMiss') && !locked.events.includes('trip'), 'rig: forgiven pass, not a trip');
  assert.equal(locked.run.status, 'running',
    'locks exclude the only available card — the exhausted pool arms NO choose (Pitfall 6) and no locked card deals');
  assert.ok(!locked.events.includes('offer'), 'no offer fired with every dealable card locked (review F1 falsifier)');
  const open = forgone('empty');
  assert.equal(open.run.status, 'choose', 'rig: with empty locks the forgiven twin DOES deal at the 30th — the arm is live');
  assert.deepEqual(open.run.offer.map((c) => c.id), ['float'], 'the forgiven deal routes the filter: the unlocked pool is exactly [float]');
  const healed = forgone('heal');
  assert.equal(healed.run.status, 'choose', 'the `?? []` heal at the forgiven twin behaves as the empty set');
  assert.deepEqual(healed.run.offer.map((c) => c.id), ['float'], 'heal and explicit-empty deal identically at the twin');
});
