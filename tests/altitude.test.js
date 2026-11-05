import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as game from '../js/game.js';
import { CARDS } from '../js/upgrades.js';
import { jump } from '../js/player.js';

// Story 2.1: run.altitude is a sim field accumulated at the two scoring sites
// (altitude += ALT_PER_POINT × scoreMul), it replaces score as the one HUD
// number, and the stored 'jumprope-best' value adopts the altitude meaning.
// Expectations derive from the exported ALT_PER_POINT + the card records,
// never a hardcoded table (house rule). Namespace import (startrun idiom) so
// a missing export surfaces as a failing assertion, not a module link error.

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;
const settle = () => new Promise(r => setTimeout(r, 0));
let bootCount = 0;

// ---------- sim legs (hand-built records, startrun.test.js:20-37 idiom) ----------

// phase 0.44 with period 0.9 at dt 1/60 rises into the [0.45, 0.55] feet
// window — exactly one crossing per tick, the proven single-edge script.
const FEET_EDGE = { phase: 0.44, period: 0.9 };
const DT = 1 / 60;
const AIRBORNE = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
const GROUNDED = { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };
// next tick's y = 22 − (1800·DT)·DT = 21.5 ∈ [18, 27): clears + near band.
const NEAR_BAND = { y: 22, vy: 0, grounded: false, squash: 1, squashVel: 0 };
const rngStub = () => 0.5;

test('factory contract: createRun carries altitude 0 and ALT_PER_POINT is a finite positive constant', () => {
  assert.equal(typeof game.ALT_PER_POINT, 'number', 'ALT_PER_POINT must be exported from js/game.js');
  assert.ok(Number.isFinite(game.ALT_PER_POINT) && game.ALT_PER_POINT > 0,
    'ALT_PER_POINT must be finite and > 0 (placeholder owned by Epic 6)');
  assert.equal(game.ALT_PER_POINT, 2,
    'AC 5 pins the placeholder value — the Epic 6 balance pass re-contracts this leg when it lands real numbers');
  const run = game.createRun();
  assert.equal(run.altitude, 0);
  assert.deepEqual(Object.keys(run).sort(), [
    'altitude', 'buffer', 'effects', 'iFrames', 'offer', 'owned', 'ropes', 'score', 'skips', 'status', 'streak',
  ], 'the createRun record-key set must stay explicit — altitude joins score');
});

test('clean pass accrues ALT_PER_POINT × scoreMul alongside the score', () => {
  const out = game.tickRun(game.createRun(), FEET_EDGE, AIRBORNE, DT, rngStub);
  assert.equal(out.run.score, out.run.effects.scoreMul, 'the pass-score formula is unchanged');
  assert.equal(out.run.altitude, game.ALT_PER_POINT * out.run.effects.scoreMul);
});

test('near-miss pass accrues the same as a clean pass', () => {
  const out = game.tickRun(game.createRun(), FEET_EDGE, NEAR_BAND, DT, rngStub);
  assert.ok(out.events.includes('nearMiss'), 'the rig must land in the near band');
  assert.equal(out.run.altitude, game.ALT_PER_POINT * out.run.effects.scoreMul);
});

test('mercy-saved pass accrues (armed via press on the buffer branch)', () => {
  const out = game.tickRun(game.createRun(), FEET_EDGE, GROUNDED, DT, rngStub, true);
  assert.equal(out.run.score, out.run.effects.scoreMul, 'mercy scores like a clean skip');
  assert.equal(out.run.altitude, game.ALT_PER_POINT * out.run.effects.scoreMul);
});

test('i-frame crossing accrues nothing AND scores nothing', () => {
  const out = game.tickRun({ ...game.createRun(), altitude: 7, iFrames: 1 }, FEET_EDGE, AIRBORNE, DT, rngStub);
  assert.equal(out.run.score, 0);
  assert.equal(out.run.altitude, 7, 'crossing during i-frames carries the seeded altitude, not resets');
});

test('a fatal trip accrues no altitude', () => {
  const out = game.tickRun({ ...game.createRun(), altitude: 7, ropes: 1 }, FEET_EDGE, GROUNDED, DT, rngStub);
  assert.equal(out.tripped, true);
  assert.equal(out.run.score, 0);
  assert.equal(out.run.altitude, 7, 'the trip freezes the run; altitude survives the death tick');
});

test('a missing altitude field heals to 0 via ?? (same idiom as ropes)', () => {
  const healed = { ...game.createRun(), altitude: undefined };
  const out = game.tickRun(healed, FEET_EDGE, AIRBORNE, DT, rngStub);
  assert.equal(out.run.altitude, game.ALT_PER_POINT * out.run.effects.scoreMul);
});

test('effects composition: Golden Handle + Lucky Tally accrue ALT × effects.scoreMul exactly', () => {
  const multi = CARDS.find(c => c.id === 'multi');
  const tally = CARDS.find(c => c.id === 'tally');
  let run = game.createRun();
  run = game.applyCard(run, multi);
  run = game.applyCard(run, tally);
  const out = game.tickRun(run, FEET_EDGE, AIRBORNE, DT, rngStub);
  assert.equal(out.run.score, out.run.effects.scoreMul, 'FR21 formula untouched by the cards');
  assert.equal(out.run.altitude, game.ALT_PER_POINT * out.run.effects.scoreMul);
});

test('invariant: altitude === ALT_PER_POINT × score on every tick of a 1000-tick headless run', () => {
  // headless-sim.test.js scripted-jumper technique; no cards so scoreMul stays 1.
  let { rope, player, run } = game.startRun();
  for (let tick = 0; tick < 1000; tick++) {
    assert.notEqual(run.status, 'over', `scripted player tripped at tick ${tick}`);
    if (player.grounded && rope.phase >= 0.2 && rope.phase <= 0.35) player = jump(player, 0.5);
    ({ run, rope, player } = game.tickRun(run, rope, player, 1 / 120, rngStub));
    assert.ok(Number.isFinite(run.altitude), `altitude finite at tick ${tick}`);
    assert.equal(run.altitude, game.ALT_PER_POINT * run.score, `invariant at tick ${tick}`);
  }
  assert.ok(run.score > 0, 'the scripted run must actually have scored, or the invariant is vacuous');
});

// ---------- shell harness (bootShell pattern, shell.test.js:30-105) ----------

// The tickRun wrapper manufactures score/choose-state VALUES the real state
// machine also reaches (uxpolish precedent); altitude is stamped consistently
// with score — forceScore × ALT_PER_POINT — so the HUD legs pin the SOURCE,
// not the arithmetic.
async function bootAltShell({ preSeed = {}, throws = false } = {}) {
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
  const errors = [];
  const views = [];
  globalThis.__shellTestViews = views;

  const map = new Map(Object.entries(preSeed));
  const storageStub = throws
    ? {
        getItem() { throw new Error('denied'); },
        setItem() { throw new Error('denied'); },
      }
    : {
        getItem: k => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => { map.set(k, v); },
      };
  const script = { forceRopes: null, forceScore: undefined };
  globalThis.__altScript = script;

  const clock = { t: 0 };
  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    performance: Object.getOwnPropertyDescriptor(globalThis, 'performance'),
    consoleError: console.error,
  };
  globalThis.document = { hidden: false, getElementById: id => (id === 'game' ? canvas : hud[id]) };
  globalThis.window = {
    addEventListener: (type, fn) => { handlers.window[type] = fn; },
    innerWidth: 480, innerHeight: 640,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
  };
  globalThis.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', { value: storageStub, configurable: true });
  globalThis.performance = { now: () => clock.t };
  console.error = (...args) => { errors.push(args); };

  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `export * from "${fileHref('game.js')}";`,
    'import * as real from "' + fileHref('game.js') + '";',
    'export const tickRun = (...args) => {',
    '  const s = globalThis.__altScript;',
    '  let a = args;',
    '  if (s.forceRopes) a = [{ ...args[0], ropes: s.forceRopes }, ...args.slice(1)];',
    '  let out = real.tickRun(...a);',
    '  if (s.forceScore !== undefined) {',
    '    out = { ...out, run: { ...out.run, score: s.forceScore, altitude: s.forceScore * real.ALT_PER_POINT } };',
    '  }',
    '  return out;',
    '};',
  ].join('\n'));

  const src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from 'data:text/javascript,${encodeURIComponent(
      'export function createScene() { return { render(view) { globalThis.__shellTestViews.push(view); } }; }')}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${gameWrapHref}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${fileHref('rope.js')}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`);

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//alt-boot ${++bootCount}`));
  await settle(); // the (failing, caught) dynamic audio import lands here

  const restore = () => {
    globalThis.document = saved.document;
    globalThis.window = saved.window;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    if (saved.localStorage) Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
    else delete globalThis.localStorage;
    if (saved.performance) Object.defineProperty(globalThis, 'performance', saved.performance);
    else delete globalThis.performance;
    delete globalThis.__altScript;
    delete globalThis.__shellTestViews;
    console.error = saved.consoleError;
  };
  return { frames, handlers, hud, views, map, script, clock, errors, restore };
}

function tick(env, ms = 50) {
  env.clock.t += ms;
  env.frames.at(-1)(env.clock.t);
}

function startRunning(env) {
  env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
  tick(env);
  assert.equal(env.views.at(-1).run.status, 'running', 'opening Space started the run');
}

// ---------- shell legs: the one number ----------

test('HUD shows altitude (not score) as the one primary number', async () => {
  const env = await bootAltShell();
  try {
    startRunning(env);
    env.script.forceScore = 3.5; // altitude = 7 under the placeholder — clearly
    tick(env);                   // distinct from Math.round(score) = 4
    assert.equal(env.views.at(-1).run.altitude, 3.5 * game.ALT_PER_POINT);
    assert.equal(env.hud['hud-score'].textContent, String(Math.round(3.5 * game.ALT_PER_POINT)),
      'hud-score must read altitude — pointing it back at run.score is the mutation this pins');
    assert.equal(env.hud['hud-best'].textContent, 'best ' + Math.round(3.5 * game.ALT_PER_POINT));
  } finally { env.restore(); }
});

test('pause → resume keeps altitude (resumeRun spread carry, belt leg)', async () => {
  const env = await bootAltShell();
  try {
    startRunning(env);
    env.script.forceScore = 3.5;
    tick(env);
    const before = env.hud['hud-score'].textContent;
    env.handlers.window.keydown({ code: 'KeyP', repeat: false, preventDefault() {} });
    tick(env);
    assert.equal(env.hud['hud-score'].textContent, before, 'freeze-frame HUD holds');
    env.script.forceScore = undefined;
    env.handlers.window.keydown({ code: 'KeyP', repeat: false, preventDefault() {} });
    tick(env, 40); // the post-resume lead-in runs, no scoring inside it
    assert.equal(env.views.at(-1).run.status, 'running');
    assert.equal(env.views.at(-1).run.altitude, 3.5 * game.ALT_PER_POINT,
      'resumeRun must carry altitude untouched — startRun there would wipe it');
    assert.equal(env.hud['hud-score'].textContent, before);
  } finally { env.restore(); }
});

test('restart after over zeroes altitude and shows 0; best was already saved from altitude', async () => {
  const env = await bootAltShell();
  try {
    startRunning(env);
    env.script.forceRopes = 1;
    for (let i = 0; i < 400 && env.views.at(-1).run.status === 'running'; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'over', 'grounded, the rope eventually trips');
    const altAtOver = env.views.at(-1).run.altitude;
    assert.ok(altAtOver > 0, 'the tripped run must have altitude on the books');
    assert.equal(env.map.get('jumprope-best'), String(Math.round(altAtOver)),
      'the trip-time best-save reads altitude');
    env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    env.handlers.window.keyup({ code: 'Space' });
    tick(env, 100); // past the trip hitstop gate, so the drain consumes the release
    assert.equal(env.views.at(-1).run.status, 'running', 'release restarted the run');
    assert.equal(env.hud['hud-score'].textContent, '0', 'the permadeath restart shows altitude 0');
    assert.equal(env.map.get('jumprope-best'), String(Math.round(altAtOver)), 'restart re-save is idempotent');
  } finally { env.restore(); }
});

// ---------- persistence legs (AC 3 / AC 4) ----------

test('a stored v1 best is adopted as initial best-altitude on load', async () => {
  const env = await bootAltShell({ preSeed: { 'jumprope-best': '77' } });
  try {
    tick(env); // one idle frame paints the HUD
    assert.equal(env.hud['hud-score'].textContent, '0');
    assert.equal(env.hud['hud-best'].textContent, 'best 77',
      'the jumprope-best value keeps its name and adopts the altitude meaning');
  } finally { env.restore(); }
});

test('a trip records the rounded best-ALTITUDE into storage', async () => {
  const env = await bootAltShell();
  try {
    startRunning(env);
    env.script.forceRopes = 1;
    env.script.forceScore = 4.6; // altitude 9.2 → stored '9' under the placeholder
    for (let i = 0; i < 400 && env.views.at(-1).run.status === 'running'; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'over');
    assert.equal(env.map.get('jumprope-best'), String(Math.round(4.6 * game.ALT_PER_POINT)),
      'storage holds the rounded altitude integer');
    assert.equal(env.hud['hud-best'].textContent, 'best ' + Math.round(4.6 * game.ALT_PER_POINT));
  } finally { env.restore(); }
});

test('the max rule keeps a higher stored best untouched', async () => {
  const env = await bootAltShell({ preSeed: { 'jumprope-best': '77' } });
  try {
    startRunning(env);
    env.script.forceRopes = 1;
    env.script.forceScore = 4.6; // 9.2 < 77
    for (let i = 0; i < 400 && env.views.at(-1).run.status === 'running'; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'over');
    assert.equal(env.map.get('jumprope-best'), '77', 'a lower run never lowers the best');
    assert.equal(env.hud['hud-best'].textContent, 'best 77');
  } finally { env.restore(); }
});

test('storage that throws degrades to session-only, exactly as v1', async () => {
  const env = await bootAltShell({ throws: true });
  try {
    startRunning(env); // loadBest threw at boot — silent, best starts at 0
    env.script.forceRopes = 1;
    env.script.forceScore = 4.6;
    for (let i = 0; i < 400 && env.views.at(-1).run.status === 'running'; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'over');
    assert.equal(env.hud['hud-best'].textContent, 'best ' + Math.round(4.6 * game.ALT_PER_POINT),
      'the session keeps a best even while persistence is dead');
    env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    env.handlers.window.keyup({ code: 'Space' });
    tick(env, 100); // past the trip hitstop gate, so the drain consumes the release
    assert.equal(env.views.at(-1).run.status, 'running', 'restart works with dead storage');
    assert.deepEqual(env.errors, [], 'no surfaced errors from the storage seam');
  } finally { env.restore(); }
});
