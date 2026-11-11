import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bootModule, captureConsoleErrors, fileHref, installStage, installVirtualClock,
  makeAudioWrapHref, makeGameWrapHref, makeRenderStubHref, settle, shellSrc,
} from './support/shell-harness.js';
import { CARDS, pickOffers, lockedIdsFor } from '../js/upgrades.js';
import { startRun } from '../js/game.js';

// Story 7.4 (FR33/FR34, AC2-AC4): the locks FLIP — three catalogue-branch cards
// (one per S2 counter family, thresholds furthestArea>=2 / summits>=1 /
// skips>=1000, D1/D2) ride the 7.3 derivation untouched, and an unlock announces
// itself EXACTLY ONCE in the PS1 voice on the next non-running prompt surface
// (D4/D5). Seed honesty (epics.md:117 rider A2): every comparison leg measures
// the SHIPPED behavior of the same build across an arg/meta difference — no
// recorded current-build numerics anywhere. Donors: locks.test.js (direct
// legs), runmark.test.js (bootRunmarkShell + pumps — forked, never imported).
//
// The trio is the story's DECIDED-BY-DEV surface: ids/names/predicates pinned
// here AND in locks leg (b) (the flip); the derivation legs read the REAL
// CARDS entries, so an inert pool reddens (a)/(f) for the right reason.

const TRIO_IDS = ['springsoles', 'luckyecho', 'longstride'];
const TRIO_UPPER = ['SPRING SOLES', 'LUCKY ECHO', 'LONG STRIDE'];
const FRESH_META = { furthestArea: 5, summits: 0, skips: 999 }; // one skips-flip short

let bootCount = 0;

// Seeded LCG (numerical-recipes constants, locks.test.js donor) — deterministic.
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------- harness (bootRunmarkShell donor) ----------

// Deal-scripted wrapper: the inverse-CDF draw pinned to 0.75 — inside the
// trio's cumulative interval of the 15-pool, so an UNLOCKED deal shows the
// trio where the locked deal provably never can (behavior comparison, not a
// recorded numeric). Offers are recorded and choose is stripped beside the
// drain (runmark's RUNMARK_GAME_WRAP), keeping the scripted walk alive.
const DEAL_GAME_WRAP = `
  export const tickRun = (...a) => {
    const g = () => { globalThis.__unlocksDraws += 1; return 0.75; };
    const o = real.tickRun(a[0], a[1], a[2], a[3], g, a[5]);
    if (o.run.status === "choose") {
      (globalThis.__unlocksOffers ??= []).push(o.run.offer.map(c => c.id));
      return { ...o, run: { ...o.run, status: "running", offer: null } };
    }
    return o;
  };`;

// Leg (c3) only: the runmark SUMMIT_GAME_WRAP donor (near-summit startRun seed
// + trip-resurrection so the walk can ONLY end at the REAL summit) with the
// pinned draw fused in. startRun PASSES ITS ARGS THROUGH — the shell's frozen
// lockedIds ride exactly like shipped code.
const SUMMIT_DEAL_WRAP = `
  export const tickRun = (...a) => {
    const g = () => { globalThis.__unlocksDraws += 1; return 0.75; };
    const o = real.tickRun(a[0], a[1], a[2], a[3], g, a[5]);
    if (o.run.status === "choose") return { ...o, run: { ...o.run, status: "running", offer: null } };
    if (o.run.status === "over" && o.run.outcome === "tripped")
      return { ...o, run: { ...o.run, status: "running", outcome: null }, tripped: false };
    return o;
  };
  export const startRun = (...a) => {
    const s = real.startRun(...a);
    return { ...s, run: { ...s.run, area: real.SUMMIT_AREA,
      altitude: real.AREAS[real.SUMMIT_AREA - 1].ceiling - 60,
      baseAltitude: real.AREAS[real.SUMMIT_AREA - 2].ceiling } };
  };`;

async function bootUnlocksShell({ storageMap = new Map(), inject = DEAL_GAME_WRAP, reduced = null } = {}) {
  const map = storageMap;
  globalThis.__unlocksOffers = [];
  globalThis.__unlocksDraws = 0;
  const storage = {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
  };
  const viewsKey = '__unlocksViews#' + (++bootCount); // per-boot boot guard (runmark :76 idiom)
  const stage = installStage({
    storage, clock: installVirtualClock(), errors: captureConsoleErrors(),
    viewsKey, createElement: true, insertBefore: true, spans: true, hudRoot: true,
    fetchReject: true,
    // leg (e) A/B: the reducedmotion :276 donor — the ONE boot difference.
    ...(reduced === null ? {} : { matchMedia: () => ({ matches: reduced, addEventListener() {} }) }),
  });
  if (stage.hud['hud-ropes']) stage.hud['hud-ropes'] = stage.mk('span');
  for (const el of [stage.hud['hud-score'], stage.hud['hud-best'], stage.hud['hud-ropes'],
    stage.hud['hud-prompt'], stage.hud['hud-owned']]) if (el) stage.hudRoot.appendChild(el);
  await bootModule(await shellSrc({
    render3d: makeRenderStubHref({ viewsKey }), game: makeGameWrapHref(fileHref('game.js'), inject),
    audio: makeAudioWrapHref(fileHref('audio.js'), 'return a;'),
  }), 'unlocks-boot');
  await settle();
  return { ...stage, map, st: { t: 0 } };
}

// ---------- pumps (runmark :97-179 donors) ----------

function tick(env, st) {
  st.t += 50;
  env.clock.t = st.t;
  env.frames.at(-1)(st.t);
}

const view = env => env.views.at(-1);
const promptOf = env => env.hud['hud-prompt'].textContent;
const keydown = (env, code) =>
  env.handlers.window.keydown({ code, repeat: false, preventDefault() {} });
const keyup = (env, code) => env.handlers.window.keyup({ code, repeat: false });
const press = env => keydown(env, 'Space');
const release = env => keyup(env, 'Space');

function startRunning(env) {
  press(env);
  tick(env, env.st);
  for (let i = 0; i < 20; i++) {
    const v = view(env);
    if (v.run.status === 'running' && v.player.grounded && v.rope.phase >= 0.2 && v.rope.phase < 0.28) {
      press(env);
      tick(env, env.st);
      release(env);
      tick(env, env.st);
    } else {
      tick(env, env.st);
    }
  }
  assert.equal(view(env).run.status, 'running', 'the boot reached running');
}

// Skip pump (runmark pumpSkips donor); when a sink is given, EVERY rendered
// prompt is sampled — the mid-run silence is witnessed frame by frame.
function pumpSkips(env, st, want, sink = null) {
  for (let i = 0; i < Math.max(400, want * 60) && view(env).run.skips < want; i++) {
    const v = view(env);
    assert.notEqual(v.run.status, 'over', 'the skip pump tripped');
    if (v.player.grounded && v.rope.phase >= 0.2 && v.rope.phase < 0.28) {
      press(env);
      tick(env, st);
      if (sink) sink.push(promptOf(env));
      release(env);
      tick(env, st);
    } else {
      tick(env, st);
    }
    if (sink) sink.push(promptOf(env));
  }
  assert.ok(view(env).run.skips >= want, `the pump scored at least ${want} skips`);
}

// The no-input drain (runmark tripWalk donor) — a REAL trip through the death arm.
function tripWalk(env, st) {
  for (let i = 0; i < 400 && view(env).run.status !== 'over'; i++) tick(env, st);
  assert.equal(view(env).run.status, 'over', 'the no-input walk ends with a real trip');
  assert.equal(view(env).run.outcome, 'tripped', 'the ending is the shipped trip arm');
}

// Jump-hold pump that STOPS at over (runmark pumpToOver donor; leg c3 summit).
function pumpToOver(env, st, cap) {
  for (let i = 0; i < cap && view(env).run.status === 'running'; i++) {
    const v = view(env);
    if (v.player.grounded && v.rope.phase >= 0.2 && v.rope.phase < 0.28) {
      press(env);
      tick(env, st);
      release(env);
      tick(env, st);
    } else {
      tick(env, st);
    }
  }
}

// The scripted single-flip run: seed one SHORT of the skips threshold, run to
// a real trip end — exactly the longstride predicate flips at accrual.
function singleFlipRun(env) {
  startRunning(env);
  pumpSkips(env, env.st, 2);
  tripWalk(env, env.st);
  tick(env, env.st); // the first frame with the over surface live
}

// ---------- (a) threshold law on the shipped entries (direct) ----------

test('(a) threshold law: the shipped unlock entries gate at 2/1/1000, ±1 witnessed, absent meta = all locked', () => {
  const gated = CARDS.filter((c) => 'unlock' in c);
  assert.deepEqual(gated.map((c) => c.id), TRIO_IDS, 'EXACTLY the three catalogue-branch cards carry unlock metadata, pool order');
  assert.deepEqual(gated.map((c) => c.unlock),
    [{ furthestArea: 2 }, { summits: 1 }, { skips: 1000 }],
    'the D1 predicates — one per counter family');
  assert.deepEqual(lockedIdsFor(CARDS, undefined), TRIO_IDS, 'absent meta = a fresh session = all three locked');
  assert.deepEqual(lockedIdsFor(CARDS, {}), TRIO_IDS, 'the {}-meta vacuity note (7.3 D4): no satisfied threshold');
  for (const [meta, expected] of [
    [{ furthestArea: 1, summits: 1, skips: 1000 }, ['springsoles']],
    [{ furthestArea: 2, summits: 1, skips: 1000 }, []],
    [{ furthestArea: 2, summits: 0, skips: 1000 }, ['luckyecho']],
    [{ furthestArea: 2, summits: 1, skips: 999 }, ['longstride']],
    [{ furthestArea: 0, summits: 0, skips: 0 }, TRIO_IDS],
  ]) {
    assert.deepEqual(lockedIdsFor(CARDS, meta), expected,
      `meta ${JSON.stringify(meta)} locks EXACTLY ${JSON.stringify(expected)} — the ±1 boundary is the threshold, not off-by-one`);
  }
  // The frozen-record law (locks (f) twin): a run created under the locked
  // view deals NONE of the trio across the seed sweep; a grown-counter
  // creation ships an empty lock set that DOES deal them.
  const freshRun = startRun(lockedIdsFor(CARDS, undefined));
  assert.deepEqual(freshRun.run.lockedIds, TRIO_IDS, 'the trio rides the 17th key, frozen at creation');
  for (let seed = 1; seed <= 40; seed++) {
    const deals = pickOffers(CARDS, {}, 3, seeded(seed), undefined, freshRun.run.lockedIds);
    assert.ok(!deals.some((c) => TRIO_IDS.includes(c.id)), `seed ${seed}: the locked creation deals none of the trio`);
  }
  const grownRun = startRun(lockedIdsFor(CARDS, { furthestArea: 9, summits: 9, skips: 9999 }));
  assert.deepEqual(grownRun.run.lockedIds, [], 'grown counters create an untrio-less run (non-vacuity)');
  assert.ok(pickOffers(CARDS, {}, 3, seeded(7), undefined, grownRun.run.lockedIds).length === 3,
    'the grown creation deals from the full 15-pool');
  assert.ok(pickOffers(CARDS, {}, 3, seeded(1), undefined, grownRun.run.lockedIds).some((c) => TRIO_IDS.includes(c.id))
    || pickOffers(CARDS, {}, 3, seeded(2), undefined, grownRun.run.lockedIds).some((c) => TRIO_IDS.includes(c.id))
    || pickOffers(CARDS, {}, 3, seeded(3), undefined, grownRun.run.lockedIds).some((c) => TRIO_IDS.includes(c.id)),
    'the unlocked pool is dealable — the trio is not locked-in-deal by construction');
});

// ---------- (b) unlock-then-deal through the shipped filter (boot, rng parity) ----------

test('(b) unlock-then-deal: meta over the thresholds deals the trio through the one filter; the locked run deals none and consumes the SAME rng calls', async () => {
  const grow = await bootUnlocksShell({
    storageMap: new Map([['jumprope-meta', JSON.stringify({ furthestArea: 2, summits: 1, skips: 1000 })]]),
  });
  let locked;
  try {
    startRunning(grow);
    globalThis.__unlocksDraws = 0;
    pumpSkips(grow, grow.st, 32); // offers fire at skips 10/20/30
    locked = globalThis.__unlocksDraws;
    const offers = globalThis.__unlocksOffers;
    assert.ok(offers.length >= 3, `the grown meta crossed ${offers.length} deals`);
    assert.ok(offers.some((o) => o.includes('springsoles')), 'the unlocked card appears in the offers');
  } finally { grow.restore(); }
  const fresh = await bootUnlocksShell();
  try {
    startRunning(fresh);
    globalThis.__unlocksDraws = 0;
    pumpSkips(fresh, fresh.st, 32);
    const draws = globalThis.__unlocksDraws;
    assert.ok(globalThis.__unlocksOffers.length >= 3, 'the fresh run crossed the same deals (pump parity)');
    assert.ok(globalThis.__unlocksOffers.every((o) => !o.some((id) => TRIO_IDS.includes(id))),
      'the locked trio never appears — hidden exactly like a capped-owned card');
    assert.equal(draws, locked, 'rng-call parity across the lock difference — the lock read consumes zero rng (FR32 law)');
  } finally { fresh.restore(); }
});

// ---------- (c) the announce — once, voiced, never mid-run ----------

test('(c) the ANNOUNCE: a skips-threshold crossing announces LONG STRIDE exactly once on the over surface, never mid-run, never again next run', async () => {
  const env = await bootUnlocksShell({
    storageMap: new Map([['jumprope-meta', JSON.stringify(FRESH_META)]]),
  });
  try {
    assert.ok(!promptOf(env).includes('unlocked'), 'the boot idle surface is silent — nothing earned yet');
    const seen = [];
    startRunning(env);
    pumpSkips(env, env.st, 2, seen);
    tripWalk(env, env.st);
    tick(env, env.st);
    seen.forEach((p, i) => assert.ok(!p.includes('unlocked'), `running frame ${i} carries no announce — fiction, not a notifications list (FR34)`));
    const over = promptOf(env);
    assert.equal(over.split('unlocked:').length - 1, 1, 'EXACTLY one announce line on the over surface');
    assert.ok(over.endsWith('\nunlocked: LONG STRIDE'), `the over copy rides the D5 template: ${JSON.stringify(over)}`);
    assert.ok(!over.includes(TRIO_UPPER[0]) && !over.includes(TRIO_UPPER[1]),
      'the unflipped cards stay unannounced — only the flip arms the line');
    assert.ok(over.includes('Missed!'), 'the announce rides the existing outcome copy, not a replacement (D5)');
    // Restart: startFreshRun is the ONE clear site — the next run stays silent.
    press(env);
    tick(env, env.st);
    release(env);
    tick(env, env.st);
    const seen2 = [];
    pumpSkips(env, env.st, 4, seen2);
    tripWalk(env, env.st);
    tick(env, env.st);
    seen2.forEach((p, i) => assert.ok(!p.includes('unlocked'), `run 2 running frame ${i} repeats nothing`));
    assert.ok(!promptOf(env).includes('unlocked'), 'run 2 ends with NO announce — the one-shot cleared at startFreshRun');
  } finally { env.restore(); }
});

test('(c2) cold boot with every threshold ALREADY met announces NOTHING — boot never arms (D4c)', async () => {
  const env = await bootUnlocksShell({
    storageMap: new Map([['jumprope-meta', JSON.stringify({ furthestArea: 9, summits: 9, skips: 9999 })]]),
  });
  try {
    tick(env, env.st);
    assert.match(promptOf(env), /^press space \/ tap to start/, 'the idle surface is the shipped copy and NOTHING else');
    assert.ok(!promptOf(env).includes('unlocked'), 'an unlock already in storage is NOT re-announced — no announce backlog');
    startRunning(env);
    pumpSkips(env, env.st, 2);
    tripWalk(env, env.st);
    tick(env, env.st);
    assert.ok(!promptOf(env).includes('unlocked'), 'a run with no flips stays silent through its over surface too');
  } finally { env.restore(); }
});

test('(c3) a first summit flips reach AND summit in ONE moment: one line, both cards, pool order', async () => {
  const env = await bootUnlocksShell({
    storageMap: new Map([['jumprope-meta', JSON.stringify({ furthestArea: 1, summits: 0, skips: 0 })]]),
    inject: SUMMIT_DEAL_WRAP,
  });
  try {
    press(env); // idle -> startFreshRun -> the seeded near-summit state
    tick(env, env.st);
    pumpToOver(env, env.st, 800);
    tick(env, env.st);
    const run = view(env).run;
    assert.equal(run.outcome, 'summit', 'the walk ended at the REAL summit branch');
    const over = promptOf(env);
    assert.ok(over.includes('Summit.'), 'the summit outcome copy still leads (D5)');
    assert.equal(over.split('unlocked:').length - 1, 1, 'ONE announce moment for a multi-family run (D4d)');
    assert.ok(over.endsWith('\nunlocked: SPRING SOLES, LUCKY ECHO'), `both flip cards, pool order: ${JSON.stringify(over)}`);
    assert.ok(!over.includes(TRIO_UPPER[2]), 'the unflipped persistence card stays quiet');
    const meta = JSON.parse(env.map.get('jumprope-meta'));
    assert.equal(meta.summits, 1);
    assert.ok(meta.furthestArea >= 2, 'the flip facts match the accrual the announce read');
  } finally { env.restore(); }
});

// ---------- (d) the meta-shape guard (runmark leg (g) twin) ----------

test('(d) after the announcing run the persisted meta is EXACTLY the three counters — no announce key (D4)', async () => {
  const env = await bootUnlocksShell({
    storageMap: new Map([['jumprope-meta', JSON.stringify(FRESH_META)]]),
  });
  try {
    singleFlipRun(env);
    assert.ok(promptOf(env).includes('unlocked'), 'the leg precondition held: this run DID announce');
    const raw = env.map.get('jumprope-meta');
    assert.deepEqual(Object.keys(JSON.parse(raw)).sort(), ['furthestArea', 'skips', 'summits'],
      'the announce is shell-local — the stored shape stays closed at three counters');
  } finally { env.restore(); }
});

// ---------- (e) reduced-motion A/B (FR23, reducedmotion L9 donor) ----------

test('(e) the announcing stream renders byte-identical prompt text and sim trace under both reducedMotion flags — timer-free by construction (FR23)', async () => {
  const record = async (reduced) => {
    const env = await bootUnlocksShell({
      storageMap: new Map([['jumprope-meta', JSON.stringify(FRESH_META)]]), reduced,
    });
    try {
      const prompts = [promptOf(env)];
      const trace = [];
      const sample = () => {
        prompts.push(promptOf(env));
        const r = view(env).run;
        trace.push({ status: r.status, altitude: r.altitude, skips: r.skips, area: r.area, outcome: r.outcome ?? null });
      };
      startRunning(env);
      sample();
      pumpSkips(env, env.st, 2, prompts);
      trace.push({ status: view(env).run.status, altitude: view(env).run.altitude, skips: view(env).run.skips, area: view(env).run.area, outcome: null });
      for (let i = 0; i < 400 && view(env).run.status !== 'over'; i++) { tick(env, env.st); sample(); }
      tick(env, env.st);
      sample();
      assert.ok(view(env).run.status === 'over', 'the scripted stream reached a real run end');
      return { prompts, trace };
    } finally { env.restore(); }
  };
  const reduced = await record(true);
  const full = await record(false);
  assert.ok(reduced.prompts.some(p => p.includes('unlocked: LONG STRIDE')),
    'the announcing stream genuinely announced on BOTH boots (the A/B is not vacuous)');
  assert.deepEqual(reduced.prompts, full.prompts, 'every rendered prompt line is identical across the flag');
  assert.deepEqual(reduced.trace, full.trace, 'the sim trace is byte-identical across the flag — no timing rides the announce (NFR8/FR23)');
});

// ---------- (f) the fresh-session bit-identity ship guard ----------

test('(f) fresh-session bit-identity: the locked view derives the trio AND deals the v2 12-pool deal card-for-card (AC4)', () => {
  assert.deepEqual(lockedIdsFor(CARDS, undefined), TRIO_IDS, 'the AC4 ship guard: all three locked at a fresh session, pool order');
  const legacy = CARDS.filter((c) => !TRIO_IDS.includes(c.id));
  assert.equal(legacy.length + 3, CARDS.length, 'the legacy pool is the v2 catalogue minus the trio');
  for (let seed = 1; seed <= 100; seed++) {
    for (const count of [2, 3]) {
      const v2 = legacy; // the pre-7.4 deal reference: the same build, trio absent
      const threaded = pickOffers(CARDS, {}, count, seeded(seed), undefined, lockedIdsFor(CARDS, undefined));
      const reference = pickOffers(v2, {}, count, seeded(seed));
      assert.deepEqual(threaded.map((c) => c.id), reference.map((c) => c.id),
        `seed ${seed} pick-${count}: the locked 15-pool deals the 12-pool deal bit-for-bit`);
    }
  }
});
