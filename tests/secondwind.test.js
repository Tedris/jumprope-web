import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as game from '../js/game.js';
import { CARDS, freshEffects } from '../js/upgrades.js';
import { createPlayer, jump, jumpVelocity } from '../js/player.js';
import { AREAS } from '../js/areas.js';

// Story 3.4 — Second Wind: run.airJumps is a scalar 0..1 refreshed to exactly
// 1 on every ground contact while owned.doublejump >= 1 (AC2: copies beyond 1
// raise nothing — the refresh cap enforces it, not the counter); the shell's
// release branch discriminates ground vs air launches on player.grounded at
// release (AC4's state gate — this ALSO folds in the never-landed grounded-
// guard fix: airborne presses without a charge are now silently DENIED, a
// sanctioned baseline change; FR17's ground-jump physics stay byte-identical).
// Expectations derive from the card records and shipped constants, never a
// hardcoded table (NFR5). tickRun rigs mirror tests/multirope.test.js; the
// shell boots are the tests/shell.test.js source-rewrite mechanism (juice/
// pickflow idiom) plus a fake monotonic clock (feelcap) so hold timing is
// exact; the game.js/audio.js wrappers are the altitude/feelcap precedents.

const DT = 1 / 60;
const STEP = 1 / 120;
const FR = 4; // fake ms per pumped frame
const PARKED = { phase: 0.05, period: 100 }; // ascent.test.js idiom: no crossing
const groundedPlayer = { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };
const rngStub = () => 0.5;

const cardById = (id) => CARDS.find((c) => c.id === id);
const doublejump = cardById('doublejump');

// ---------- sim legs ----------

// Leg 1 — factory contract (house rule: contract test ships in the change).
test('contract: createRun carries airJumps 0; tickRun return keys unchanged; garbage heals on write', () => {
  assert.equal(game.createRun().airJumps, 0, 'mid-air charge state is part of the record (FR12)');
  const out = game.tickRun(game.createRun(), PARKED, groundedPlayer, DT, rngStub);
  assert.deepEqual(Object.keys(out).sort(), ['events', 'player', 'rope', 'run', 'tripped'],
    'the tickRun return-shape is untouched by the new key');
  // The i-frames heal arm: any non-finite value reads as "no charge" — states
  // are data, never a throw. Airborne player: the pass-through arm, no refresh.
  const air = { y: 40, vy: -50, grounded: false, squash: 1, squashVel: 0 };
  for (const bad of [NaN, Infinity, -Infinity, null, undefined, 'x']) {
    const r = game.tickRun({ ...game.createRun(), airJumps: bad }, PARKED, air, DT, rngStub);
    assert.doesNotThrow(() => r);
    assert.equal(r.run.airJumps, 0, `${String(bad)} reads uncharged and heals to 0 on write`);
  }
  assert.equal(game.tickRun({ ...game.createRun(), airJumps: 5 }, PARKED, air, DT, rngStub).run.airJumps, 1,
    '5+ clamps to the one-per-contact cap');
  assert.equal(game.tickRun({ ...game.createRun(), airJumps: -3 }, PARKED, air, DT, rngStub).run.airJumps, 0);
});

// Leg 2 — AC2: the ground-contact refresh, exactly 1 per contact.
test('AC2: ground contact refreshes exactly one charge; consumed stays 0 until the next landing', () => {
  const owned1 = { ...game.createRun(), owned: { doublejump: 1 } };
  assert.equal(game.tickRun(owned1, PARKED, groundedPlayer, DT, rngStub).run.airJumps, 1,
    'a grounded tick with the card owned raises the charge to exactly 1');
  assert.equal(game.tickRun(game.createRun(), PARKED, groundedPlayer, DT, rngStub).run.airJumps, 0,
    'no card, no charge — grounded ticks keep it 0');
  // Consumed mid-air: pass-through until a grounded tick.
  let run = { ...owned1, airJumps: 0 };
  let player = { y: 60, vy: -20, grounded: false, squash: 1, squashVel: 0 };
  for (let t = 0; t < 5; t++) {
    ({ run, player } = game.tickRun(run, PARKED, player, DT, rngStub));
    assert.equal(run.airJumps, 0, 'airborne ticks pass the consumed charge through untouched');
  }
  // The landing tick refreshes.
  ({ run, player } = game.tickRun(run, PARKED, player, DT, rngStub));
  while (!player.grounded) ({ run, player } = game.tickRun(run, PARKED, player, 1 / 30, rngStub));
  assert.equal(run.airJumps, 1, 'exactly on ground contact the charge comes back');
  // Copies beyond 1 raise nothing (cap derived from the record, never hardcoded).
  const copies = game.tickRun({ ...game.createRun(), owned: { doublejump: doublejump.cap + 3 } },
    PARKED, groundedPlayer, DT, rngStub);
  assert.equal(copies.run.airJumps, 1, 'cap+3 copies still refresh to exactly 1 (design, not omission)');
});

// Leg 3 — the pick path: run-shaped whole-record patch (ADR-2).
test('pick: applyCard grants airJumps 1 as a run-shape patch; a second pick can never exceed 1', () => {
  const r1 = game.applyCard(game.createRun(), doublejump);
  assert.equal(r1.airJumps, 1, 'the pick grants the charge immediately (Spare Rope idiom)');
  assert.equal(r1.owned.doublejump, 1, 'owned tallies like every card');
  assert.deepEqual(r1.effects, freshEffects(), 'the five effect keys ride through untouched (Pitfall 3)');
  const r2 = game.applyCard(r1, doublejump);
  assert.equal(r2.owned.doublejump, 2, 'owned counts both copies');
  assert.equal(r2.airJumps, 1, 'the patchedRun clamp caps the charge at 1 (AC2)');
  assert.equal(game.applyCard({ ...r1, airJumps: 0 }, doublejump).airJumps, 1,
    'a pick made mid-air after consuming lands at 1, never 2');
  assert.equal(game.applyCard({ ...game.createRun(), airJumps: 'x' }, doublejump).airJumps, 0,
    'garbage through apply heals to 0 in the write (heal-on-write doctrine, Story 3.3 D-b)');
});

// Leg 4 — AC3: the air launch feeds the ceiling chain; the rope is unbothered.
test('AC3: chained air-launch peaks feed the FR6 ceiling check; phase/score untouched (NFR8)', () => {
  const ceiling = AREAS[0].ceiling;
  // A full ground arc peaks at 100 (vy 600, g 1800); the chain adds another
  // 100 on top — enough to break the rig ceiling the bare arc cannot.
  function fly({ own, chain, iFrames = 0 }) {
    let run = { ...game.createRun(), owned: own ? { doublejump: 1 } : {},
      altitude: ceiling - 160, iFrames };
    let rope = { ...PARKED };
    let player = jump(createPlayer(), 0.5);
    const events = [];
    const phases = [];
    let chained = !chain;
    for (let t = 0; t < 400; t++) {
      const out = game.tickRun(run, rope, player, STEP, rngStub);
      run = out.run; rope = out.rope; player = out.player;
      if (!chained && player.vy < 0) { player = jump(player, 0.5); chained = true; } // harness-side air launch
      events.push(...out.events);
      phases.push(rope.phase);
      if (chained && player.grounded) break;
    }
    return { run, events, phases };
  }
  const bare = fly({ own: false, chain: false });
  assert.equal(bare.run.area, 1, 'the ground arc alone must peak under the rig ceiling (control)');
  assert.ok(!bare.events.includes('ascend'));
  const chained = fly({ own: true, chain: true });
  assert.equal(chained.run.area, 2, 'the air-launch peak breaks the ceiling the ground arc cannot (FR6 chain)');
  assert.ok(chained.events.includes('ascend'), 'the chain ascends through the one crossing check');
  // NFR8: the Second-Wind twin with the charge UNUSED is tick-for-tick
  // identical to the no-card twin — the card alone bends no rope.
  const twin = fly({ own: true, chain: false });
  assert.deepEqual(twin.phases, bare.phases, 'rope phase is byte-identical to the no-card twin');
  assert.equal(twin.run.score, bare.run.score, 'score is identical too');
  // Story 4.5 inheritance: a peak during an i-frame blank does not ascend.
  const during = fly({ own: true, chain: true, iFrames: 2 });
  assert.equal(during.run.area, 1, 'the i-frame suppression covers air peaks the same as ground peaks');
  assert.ok(!during.events.includes('ascend'));
});

// ---------- shell-cap kit ----------
//
// The REAL js/shell.js frame loop, booted through the data-URL source-rewrite
// mechanism: render3d -> recording stub, game.js -> wrapper (seeds the fresh
// run through startRun and one-shots a rope-phase force), audio.js -> wrapper
// logging every handleEvent NAME (feelcap audioWrap precedent). One fake
// monotonic clock drives frame(), the press/hold bookkeeping and the D-07
// lead-in alike — hold timing is exact, never wall-clock dependent.

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const fileHref = (name) => pathToFileURL(resolve(jsDir, name)).href;
const settle = () => new Promise((r) => setTimeout(r, 0));

let bootCount = 0;

async function bootSW({ own = null, launchMul = null } = {}) {
  const id = `sw${++bootCount}`;
  const frames = [];
  const handlers = { window: {}, canvas: {} };
  const hud = {
    'hud-score': { textContent: '' },
    'hud-best': { textContent: '' },
    'hud-prompt': { textContent: '' },
    'hud-owned': { textContent: '' },
  };
  const canvas = {
    width: 0, height: 0, style: {},
    addEventListener: (type, fn) => { handlers.canvas[type] = fn; },
  };
  const views = [];
  const voices = [];
  const script = { forcePhase: null };
  const viewKey = `__swViews_${id}`;
  const voiceKey = `__swVoices_${id}`;
  const scriptKey = `__swScript_${id}`;
  globalThis[viewKey] = views;
  globalThis[voiceKey] = voices;
  globalThis[scriptKey] = script;

  const seedBits = [];
  if (own !== null) seedBits.push(`owned: ${JSON.stringify(own)}`);
  if (launchMul !== null) {
    seedBits.push(`effects: { ...s.run.effects, launchMul: ${JSON.stringify(launchMul)} }`);
  }
  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `export * from "${fileHref('game.js')}";`,
    'import * as real from "' + fileHref('game.js') + '";',
    seedBits.length > 0
      ? ['export const startRun = () => {', '  const s = real.startRun();',
         `  return { ...s, run: { ...s.run, ${seedBits.join(', ')} } };`, '}'].join('\n')
      : 'export const startRun = () => real.startRun();',
    'export const tickRun = (...a) => {',
    `  const s = globalThis.${scriptKey};`,
    '  if (s.forcePhase !== null) {',
    '    a = [a[0], { ...a[1], phase: s.forcePhase }, ...a.slice(2)];',
    '    s.forcePhase = null;',
    '  }',
    '  return real.tickRun(...a);',
    '};',
  ].join('\n'));

  const audioWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `import * as real from "${fileHref('audio.js')}";`,
    'export function createAudio(opts) {',
    '  const a = real.createAudio(opts);',
    '  return { ...a, handleEvent(n) {',
    `    globalThis.${voiceKey}.push(n);`,
    '    return a.handleEvent(n);',
    '  } };',
    '}',
    'export const loadSettings = real.loadSettings;',
    'export const saveSettings = real.saveSettings;',
  ].join('\n'));

  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    performance: Object.getOwnPropertyDescriptor(globalThis, 'performance'),
    AudioContext: globalThis.AudioContext,
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    consoleError: console.error,
  };
  const clock = { t: 0 };
  globalThis.document = { getElementById: (name) => (name === 'game' ? canvas : hud[name]) };
  globalThis.window = {
    addEventListener: (type, fn) => { handlers.window[type] = fn; },
    innerWidth: 480, innerHeight: 640,
  };
  globalThis.requestAnimationFrame = (cb) => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: () => null, setItem: () => {} }, configurable: true,
  });
  Object.defineProperty(globalThis, 'performance', {
    value: { now: () => clock.t }, configurable: true,
  });
  delete globalThis.AudioContext; // the silent degradation path; the wrapper still logs
  console.error = () => {};

  const renderStubHref = 'data:text/javascript,' + encodeURIComponent([
    'export function createScene() {',
    '  return {',
    '    render(view) {',
    `      globalThis.${viewKey}.push(view);`,
    '    }',
    '  };',
    '}',
  ].join('\n'));

  let src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from '${renderStubHref}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${gameWrapHref}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${fileHref('rope.js')}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`)
    .replace(/import\(\s*['"]\.\/audio\.js['"]\s*\)/, `import('${audioWrapHref}')`);

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//secondwind-boot ${id}`));
  await settle(); // the shell's dynamic audio import lands one microtask later

  const restore = () => {
    globalThis.document = saved.document;
    globalThis.window = saved.window;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    if (saved.performance) Object.defineProperty(globalThis, 'performance', saved.performance);
    else delete globalThis.performance;
    globalThis.AudioContext = saved.AudioContext;
    if (saved.localStorage) {
      Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
    } else {
      delete globalThis.localStorage;
    }
    console.error = saved.consoleError;
    delete globalThis[viewKey];
    delete globalThis[voiceKey];
    delete globalThis[scriptKey];
  };
  return { frames, handlers, hud, views, voices, script, clock, restore };
}

// One full press: keydown, three pumps (any acc phase fires >= 1 STEP in
// 12 ms, consuming pressIntent -> holdFrom), keyup, three pumps (same
// argument consumes the release -> the launch/deny decision).
function pressCycle(env) {
  env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
  pump(env, 3);
  env.handlers.window.keyup({ code: 'Space' });
  pump(env, 3);
}

function pump(env, n = 1) {
  for (let i = 0; i < n; i++) {
    env.clock.t += FR;
    env.frames.at(-1)(env.clock.t);
  }
}

// Start the run through the idle press, then land the lead-in hop.
function start(env) {
  env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
  pump(env, 3);
  assert.equal(view(env).run.status, 'running', 'the opening Space started the run');
  env.handlers.window.keyup({ code: 'Space' });
  for (let g = 0; g < 200 && view(env).player.grounded === false; g += 1) pump(env);
  assert.ok(view(env).player.grounded, 'the lead-in hop landed inside the budget');
}

// The grounded cycle's clean press at the feelcap phase window — the ONLY
// ground launcher in these legs, keeping every crossing a cleared one.
function groundedJumpAtWindow(env, budget = 400) {
  for (let g = 0; g < budget; g += 1) {
    const v = view(env);
    if (v.run.status === 'over') assert.fail('rig went over before the window (trip-avoidance broken)');
    if (v.player.grounded && v.run.skips >= 1 && v.rope.phase >= 0.245 && v.rope.phase < 0.255) {
      pressCycle(env);
      const launched = view(env).player;
      assert.ok(!launched.grounded, 'the grounded press launched (baseline path intact)');
      return;
    }
    pump(env);
  }
  assert.fail('the grounded phase window never arrived within the budget');
}

// Pump to the post-apex descent of the current flight (vy turned negative).
function toDescend(env, budget = 200) {
  for (let g = 0; g < budget; g += 1) {
    if (!view(env).player.grounded && view(env).player.vy < 0) return;
    pump(env);
  }
  assert.fail('the flight never reached its descent within the budget');
}

function view(env) { return env.views.at(-1); }

// vy rises (launches) strictly while airborne between the two view snapshots.
function vySeries(env, a, b) {
  return env.views.slice(a, b).map((v) => v.player.vy);
}

function countLaunches(series) {
  let n = 0;
  for (let i = 1; i < series.length; i += 1) {
    if (series[i] > series[i - 1] + 100) n += 1;
  }
  return n;
}

// ---------- shell legs ----------

// Leg 5 — AC1 on the real frame loop: ground jump, then one permitted air
// launch that consumes the charge; landing refreshes it.
test('AC1 (shell): airborne press with a charge launches with the hold model and consumes it', async () => {
  const env = await bootSW({ own: { doublejump: 1 } });
  try {
    start(env);
    assert.equal(view(env).run.airJumps, 1, 'owned card + grounded = the charge is live');
    const air0 = env.views.length;
    groundedJumpAtWindow(env);
    assert.equal(view(env).run.airJumps, 1, 'the ground jump never touches the charge');
    toDescend(env);
    const voice0 = env.voices.length;
    const t0 = env.views.length;
    pressCycle(env);
    const v = view(env);
    const series = vySeries(env, t0, env.views.length);
    assert.equal(countLaunches(series), 1, 'the permitted air press launched');
    assert.ok(v.player.y > 0 && !v.player.grounded, 'the launch happened mid-air');
    assert.equal(v.run.airJumps, 0, 'the charge is consumed until the next ground contact (FR12)');
    assert.deepEqual(env.voices.slice(voice0), ['jump'],
      'the air launch plays the jump voice exactly once — no sim takeoff edge airborne-to-airborne');
    for (let g = 0; g < 200 && view(env).player.grounded === false; g += 1) pump(env);
    assert.ok(view(env).player.grounded, 'the chained flight landed');
    assert.equal(view(env).run.airJumps, 1, 'AC2 through the frame loop: the landing refreshed the charge');
  } finally { env.restore(); }
});

// Leg 6 — AC4 leg: air-to-air denial. A second press inside the same flight
// must not launch, must not voice, must not touch state.
test('AC4 (shell): a second airborne press in one flight is denied silently', async () => {
  const env = await bootSW({ own: { doublejump: 1 } });
  try {
    start(env);
    groundedJumpAtWindow(env);
    toDescend(env);
    pressCycle(env); // the permitted launch (consumes the charge)
    const vyBefore = view(env).player.vy;
    const t0 = env.views.length;
    const voice0 = env.voices.length;
    pressCycle(env); // same flight, no charge left
    const series = vySeries(env, t0, env.views.length);
    assert.equal(countLaunches(series), 0, 'air-to-air: no launch (one mid-air jump per ground contact)');
    assert.ok(view(env).player.vy <= vyBefore + 1, 'vy kept decaying — the denial changed no velocity');
    assert.equal(env.voices.slice(voice0).filter((n) => n === 'jump').length, 0, 'the denial is silent');
    assert.equal(view(env).run.airJumps, 0, 'the denial consumed nothing further');
  } finally { env.restore(); }
});

// Leg 7 — AC4 leg: double-press spam mid-flight yields at most ONE mid-air
// launch per ground contact.
test('AC4 (shell): spam of six presses in one flight launches at most once', async () => {
  const env = await bootSW({ own: { doublejump: 1 } });
  try {
    start(env);
    groundedJumpAtWindow(env);
    toDescend(env);
    const t0 = env.views.length;
    const voice0 = env.voices.length;
    for (let i = 0; i < 6; i += 1) pressCycle(env);
    const series = vySeries(env, t0, env.views.length);
    assert.equal(countLaunches(series), 1, 'six airborne presses, one launch — the charge gate holds under spam');
    assert.equal(env.voices.slice(voice0).filter((n) => n === 'jump').length, 1,
      'exactly one jump voice across the six presses');
    assert.equal(view(env).run.airJumps, 0);
  } finally { env.restore(); }
});

// Leg 8 — the folded grounded-guard fix (replacement-behavior leg): with no
// card owned, an airborne press is DENIED — today's un-gated free flight is
// gone. The twin grounded press on the same rig still launches, byte-model.
test('no-card denial (shell): airborne presses without Second Wind never launch; grounded twin does', async () => {
  const env = await bootSW();
  try {
    start(env);
    groundedJumpAtWindow(env); // the grounded twin first: the press still launches exactly as v1
    toDescend(env);
    const t0 = env.views.length;
    const voice0 = env.voices.length;
    const vyBefore = view(env).player.vy;
    pressCycle(env);
    const series = vySeries(env, t0, env.views.length);
    assert.equal(countLaunches(series), 0,
      'the baseline free-flight flap is folded away: airborne press, no charge = no launch');
    assert.ok(view(env).player.vy <= vyBefore + 1, 'vy untouched by the denial');
    assert.equal(env.voices.slice(voice0).filter((n) => n === 'jump').length, 0, 'the denial is silent');
    assert.equal(view(env).run.airJumps, 0, 'no owned.doublejump keeps the field 0');
    for (let g = 0; g < 200 && view(env).player.grounded === false; g += 1) pump(env);
    assert.ok(view(env).player.grounded, 'the flight landed');
    assert.equal(view(env).run.airJumps, 0, 'ground-contact refresh with no card stays 0');
  } finally { env.restore(); }
});

// Leg 9 — the denial arms NOTHING: no launch, and no D-N01 mercy buffer. The
// rig forces a feet-window crossing right after the denied press (multirope
// rig idiom through the wrapper); baseline the press both launched and armed
// the buffer — with the fix the crossing must trip.
test('denied press forgives nothing (shell): the forced crossing trips instead of a mercy near-miss', async () => {
  const env = await bootSW(); // no card — airborne presses are denied
  try {
    env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    pump(env, 3);
    assert.equal(view(env).run.status, 'running', 'the opening Space started the run');
    env.handlers.window.keyup({ code: 'Space' });
    // The lead-in hop's descent is the no-card airborne window, pressed LOW
    // (16..24 px) so the forced crossing lands INSIDE the D-N01 buffer's
    // ~0.1 phase-second life — a denial that leaked a buffer arm would still
    // be alive at the crossing and forgive it.
    let found = false;
    for (let g = 0; g < 200 && !found; g += 1) {
      const p = view(env).player;
      if (!p.grounded && p.vy < 0 && p.y > 16 && p.y <= 24) found = true;
      else pump(env);
    }
    assert.ok(found, 'the lead-in descent window (16..24 px, falling) never arrived within the budget');
    const t0 = env.views.length;
    pressCycle(env);
    assert.equal(countLaunches(vySeries(env, t0, env.views.length)), 0,
      'the press was denied — the baseline free-flight flap is gone');
    env.script.forcePhase = 0.4494; // next STEP rises into the feet window under the low player
    for (let g = 0; g < 10 && view(env).run.status === 'running'; g += 1) pump(env);
    assert.equal(view(env).run.status, 'over',
      'no buffer was armed by the denial — the crossing trips (a forgiven skip would mean the press leaked a buffer arm)');
    assert.equal(view(env).run.outcome, 'tripped');
  } finally { env.restore(); }
});

// Leg 10 — the combo: highjump x doublejump — the air launch rides the SAME
// third-arg launchMul expression as ground jumps (GDD "max peak").
test('combo (shell): the air launch multiplies by launchMul exactly like the ground path', async () => {
  const lm = 1.1; // one Launch Heels pick: cardById('highjump').apply multiplies freshEffects().launchMul
  assert.equal(cardById('highjump').apply(freshEffects()).launchMul, lm,
    'the rig constant is derived from the card, never hardcoded');
  const env = await bootSW({ own: { doublejump: 1, highjump: 1 }, launchMul: lm });
  try {
    start(env);
    groundedJumpAtWindow(env);
    const vyG = view(env).player.vy; // the grounded launch of THIS cycle: hold
    assert.ok(vyG >= jumpVelocity(FR / 1000) * lm - 16 && vyG <= jumpVelocity(5 * FR / 1000) * lm,
      `grounded launch vy ${vyG} rides the same third-arg expression x ${lm}`);
    assert.ok(vyG > jumpVelocity(5 * FR / 1000),
      `grounded vy ${vyG} exceeds the un-multiplied ceiling ${jumpVelocity(5 * FR / 1000)} (mutant: grounded site loses launchMul)`);
    toDescend(env);
    env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    pump(env, 2); // pressIntent consumed -> holdFrom
    pump(env, 35); // hold ~0.15 s — short enough that the release lands
    env.handlers.window.keyup({ code: 'Space' });  // STRICTLY mid-flight: the arc
    pump(env, 3);  // release consumed -> the air launch (hang left: ~0.04 s)
    const vy = view(env).player.vy;
    assert.ok(!view(env).player.grounded && view(env).player.y > 0,
      'the launch was airborne, not a hold-through-landing (airJumps below is the state twin)');
    assert.equal(view(env).run.airJumps, 0, 'the charge was consumed — the release took the AIR branch');
    const hLo = 35 * FR / 1000; // keydown f0, press consumed f1..3, keyup f37, release f38..40
    const hHi = 39 * FR / 1000 + STEP; // hold spans [35, 39] frames plus the drain offset
    assert.ok(vy >= jumpVelocity(hLo) * lm - 16, `vy ${vy} >= ${jumpVelocity(hLo) * lm - 16} (launchMul rode the air launch)`);
    assert.ok(vy <= jumpVelocity(hHi) * lm, `vy ${vy} <= ${jumpVelocity(hHi) * lm} (hold not overcounted)`);
    assert.ok(vy > jumpVelocity(hHi), `vy ${vy} exceeds the un-multiplied ceiling ${jumpVelocity(hHi)} (mutant: dropped launchMul)`);
  } finally { env.restore(); }
});
