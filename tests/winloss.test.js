// Story 2.4: win & loss presentation with true permadeath.
// Shell legs run the REAL shell over a data-URL harness (ceilingmarker/uxpolish
// idiom); one Node-side leg pins the summit-tick events channel directly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tickRun } from '../js/game.js';
import { createRope } from '../js/rope.js';
import { AREAS, SUMMIT_AREA, ALT_PER_POINT, CARDS } from '../js/game.js';
import { freshEffects } from '../js/upgrades.js';

const jsDir = resolve(import.meta.dirname, '..', 'js');
const fileHref = (name) => pathToFileURL(resolve(jsDir, name)).href;
const settle = () => new Promise((r) => setTimeout(r, 0));
let bootCount = 0;

function makeDom() {
  const created = [];
  const mk = (tag) => {
    const el = {
      tag,
      children: [],
      listeners: {},
      style: {},
      textContent: '',
      _cn: '',
      get className() { return this._cn; },
      set className(v) { this._cn = v; },
      appendChild(c) { this.children.push(c); return c; },
      insertBefore(c, ref) { const i = this.children.indexOf(ref); if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; },
      replaceChildren(...cs) { this.children = cs; },
      addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); },
      fire(type, ev = {}) { for (const fn of this.listeners[type] ?? []) fn(ev); },
    };
    created.push(el);
    return el;
  };
  return { created, mk };
}

// boot: { dom = true, best } — `best` pre-seeds jumprope-best in storage.
async function bootWinlossShell({ dom = true, best } = {}) {
  const frames = [];
  const handlers = { window: {}, canvas: {} };
  const { created, mk } = makeDom();
  const hudEls = {
    'hud-score': mk('span'),
    'hud-best': mk('span'),
    'hud-prompt': mk('span'),
    'hud-owned': mk('span'),
  };
  const canvas = {
    width: 0, height: 0, style: {},
    addEventListener: (type, fn) => { handlers.canvas[type] = fn; },
  };
  const hudRoot = mk('div');
  if (dom) hudEls['hud-ropes'] = mk('span');
  for (const el of [hudEls['hud-score'], hudEls['hud-best'], hudEls['hud-ropes'],
    hudEls['hud-prompt'], hudEls['hud-owned']]) if (el) hudRoot.appendChild(el);
  const documentStub = dom
    ? {
        hidden: false,
        createElement: mk,
        getElementById: (id) => (id === 'game' ? canvas : id === 'hud' ? hudRoot : hudEls[id]),
      }
    : { hidden: false, getElementById: (id) => (id === 'game' ? canvas : hudEls[id]) };

  const map = new Map();
  if (best !== undefined) map.set('jumprope-best', String(best));
  const storageStub = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); },
  };
  const script = { forceScore: undefined, forceArea: null, forceOwned: null, chooseOffer: null, armed: false };
  globalThis.__wlScript = script;
  const views = [];
  globalThis.__shellTestViews = views;

  const clock = { t: 0 };
  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    performance: Object.getOwnPropertyDescriptor(globalThis, 'performance'),
    consoleError: console.error,
  };
  globalThis.document = documentStub;
  globalThis.window = {
    addEventListener: (type, fn) => { handlers.window[type] = fn; },
    innerWidth: 480, innerHeight: 640,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
  };
  globalThis.requestAnimationFrame = (cb) => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', { value: storageStub, configurable: true });
  globalThis.performance = { now: () => clock.t };
  console.error = () => {};

  // tickRun wrapper: OUTPUT-side stamps (the sim's INPUT only carries them
  // from the NEXT tick); conditionals are !== null/undefined, never truthy.
  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `export * from "${fileHref('game.js')}";`,
    'import * as real from "' + fileHref('game.js') + '";',
    'export const tickRun = (...args) => {',
    '  const s = globalThis.__wlScript;',
    '  let a = args;',
    '  if (s.forceArea !== null) a = [{ ...args[0], area: s.forceArea }, ...args.slice(1)];',
    '  let out = real.tickRun(...a);',
    '  if (s.forceScore !== undefined) out = { ...out, run: { ...out.run, score: s.forceScore, altitude: s.forceScore * real.ALT_PER_POINT } };',
    '  if (s.forceOwned !== null) out = { ...out, run: { ...out.run, owned: s.forceOwned } };',
    '  if (s.chooseOffer && !s.armed && out.run.status === "running") {',
    '    s.armed = true;',
    '    out = { ...out, run: { ...out.run, status: "choose", offer: s.chooseOffer } };',
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

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//winloss-boot ${++bootCount}`));
  await settle();

  const restore = () => {
    globalThis.document = saved.document;
    globalThis.window = saved.window;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    if (saved.localStorage) Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
    else delete globalThis.localStorage;
    if (saved.performance) Object.defineProperty(globalThis, 'performance', saved.performance);
    else delete globalThis.performance;
    delete globalThis.__wlScript;
    delete globalThis.__shellTestViews;
    console.error = saved.consoleError;
  };
  return { frames, handlers, hud: hudEls, views, map, script, clock, created, hudRoot, restore };
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

// leadIn() ships a pre-launched hop; grounded assertions wait for it (the
// first rope pass is survived airborne — see story 2.3's Dev Notes).
function landFirst(env) {
  for (let i = 0; i < 30 && !env.views.at(-1).player.grounded; i++) tick(env);
  assert.equal(env.views.at(-1).player.grounded, true, 'the start hop landed');
}

// Grounded after landFirst, the next rope pass is the last-rope trip.
function tripToDeath(env) {
  for (let i = 0; i < 400 && env.views.at(-1).run.status === 'running'; i++) tick(env);
  const v = env.views.at(-1);
  assert.equal(v.run.status, 'over', 'grounded, the rope eventually trips');
  assert.equal(v.run.outcome, 'tripped', 'the scripted death is a loss, not a win');
  return v;
}

function winViaCeiling(env) {
  landFirst(env);
  env.script.forceArea = SUMMIT_AREA;
  env.script.forceScore = (AREAS[AREAS.length - 1].ceiling + 2) / ALT_PER_POINT;
  for (let i = 0; i < 10 && env.views.at(-1).run.status === 'running'; i++) tick(env);
  const v = env.views.at(-1);
  assert.equal(v.run.status, 'over', 'altitude past the summit ceiling wins');
  assert.equal(v.run.outcome, 'summit', 'the sim presents it as the summit outcome');
  return v;
}

const baselineKeys = (env) => [...env.map.keys()].sort();

function assertPermadeathBaseline(v, env, bootKeys) {
  const r = v.run;
  assert.equal(r.ropes, 1, 'permadeath: a fresh row has one rope');
  assert.deepEqual(r.owned, {}, 'permadeath: no cards carry between runs');
  assert.deepEqual(r.effects, freshEffects(), 'permadeath: no effects carry between runs');
  assert.equal(r.area, 1, 'permadeath: area resets to the ladder floor');
  assert.equal(r.baseAltitude, 0, 'permadeath: altitude base resets');
  assert.equal(r.altitude, 0, 'permadeath: altitude starts at 0');
  assert.equal(r.score, 0, 'permadeath: score starts at 0');
  assert.equal(r.offer, null, 'permadeath: no carry-over offer');
  assert.deepEqual(baselineKeys(env), [...new Set([...bootKeys, 'jumprope-best'])].sort(),
    'only best-altitude persisted across the run boundary');
}

// ---------- AC1/AC2: the run-over copy ----------

test('the loss line reads Missed! Altitude with the new-best tail and persistent best', async () => {
  const env = await bootWinlossShell();
  try {
    startRunning(env);
    landFirst(env);
    const v = tripToDeath(env);
    const n = Math.round(v.run.altitude);
    assert.equal(env.hud['hud-prompt'].textContent, `Missed! Altitude ${n} best ${n}`,
      'a run that beat the boot best (0) gets the tail');
    assert.equal(env.hud['hud-prompt']._cn, '', 'the loss stays bone — no role class');
    assert.equal(env.hud['hud-best'].textContent, 'best ' + n, 'the persistent best line carries best-altitude');
  } finally { env.restore(); }
});

test('the loss line carries no best tail when the run did not beat best', async () => {
  const env = await bootWinlossShell({ best: 500 });
  try {
    startRunning(env);
    landFirst(env);
    const v = tripToDeath(env);
    const n = Math.round(v.run.altitude);
    assert.equal(env.hud['hud-prompt'].textContent, `Missed! Altitude ${n}`,
      'no tail — best stands (EXPERIENCE.md: "+ best N when new")');
    assert.equal(env.hud['hud-best'].textContent, 'best 500', 'the standing best stays visible');
  } finally { env.restore(); }
});

test('the win line reads Summit. Altitude best B in win amber, distinct from the loss', async () => {
  const env = await bootWinlossShell();
  try {
    startRunning(env);
    const v = winViaCeiling(env);
    const n = Math.round(v.run.altitude);
    // Story 7.4 (authorized PREFIX re-contract): the scripted summit flips the
    // summits>=1 predicate — the D4 announce line may trail the frozen win
    // copy on this surface; unlocks.test.js owns the announce string itself.
    assert.ok(env.hud['hud-prompt'].textContent.startsWith(`Summit. Altitude ${n} best ${n}`),
      'the win line STARTS with the frozen Summit. copy (the unlock line may trail)');
    assert.equal(env.hud['hud-prompt']._cn, 'role-amber', 'the DESIGN win token #ffcf6e');
    assert.ok(!env.hud['hud-prompt'].textContent.includes('Missed'), 'a summit run never reads loss copy');
  } finally { env.restore(); }
});

// ---------- AC3: permadeath through restart ----------

test('restart after a card-owning loss starts from the full baseline', async () => {
  const env = await bootWinlossShell();
  try {
    startRunning(env);
    env.script.forceOwned = { [CARDS[0].id]: 2 };
    landFirst(env);
    tripToDeath(env);
    assert.deepEqual(env.views.at(-1).run.owned, { [CARDS[0].id]: 2 }, 'the dead run really owned cards');
    env.script.forceOwned = null; // stop stamping: the restart record must be raw
    const bootKeys = baselineKeys(env);
    env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    env.handlers.window.keyup({ code: 'Space' });
    tick(env, 100); // past the trip hitstop gate
    assert.equal(env.views.at(-1).run.status, 'running', 'the press-released restarted');
    assertPermadeathBaseline(env.views.at(-1), env, bootKeys);
  } finally { env.restore(); }
});

test('restart after a summit win starts from the full baseline too', async () => {
  const env = await bootWinlossShell();
  try {
    startRunning(env);
    winViaCeiling(env);
    env.script.forceArea = null; // stop stamping: the restart record must be raw
    env.script.forceScore = undefined;
    const bootKeys = baselineKeys(env);
    env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    env.handlers.window.keyup({ code: 'Space' });
    tick(env, 100);
    assert.equal(env.views.at(-1).run.status, 'running', 'the win screen restarts the same way');
    assertPermadeathBaseline(env.views.at(-1), env, bootKeys);
    assert.ok(Number(env.map.get('jumprope-best')) > 0, 'the win best persisted');
  } finally { env.restore(); }
});

// ---------- AC4: restart hygiene ----------

test('a jump key held across the death cannot launch the new run', async () => {
  const env = await bootWinlossShell();
  try {
    startRunning(env);
    landFirst(env);
    env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    for (let i = 0; i < 400 && env.views.at(-1).run.status === 'running'; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'over', 'the run tripped while the key was held');
    env.handlers.window.keyup({ code: 'Space' });
    for (let i = 0; i < 4; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'over', 'the stale release starts nothing (FR22)');
  } finally { env.restore(); }
});

test('a pointer held across the death cannot launch the new run', async () => {
  const env = await bootWinlossShell();
  try {
    startRunning(env);
    landFirst(env);
    env.handlers.canvas.pointerdown({ clientX: 0 });
    for (let i = 0; i < 400 && env.views.at(-1).run.status === 'running'; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'over', 'the run tripped while the pointer was held');
    env.handlers.canvas.pointerup({});
    for (let i = 0; i < 4; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'over', 'the stale pointer release starts nothing');
  } finally { env.restore(); }
});

test('a fresh press-release over the over screen restarts exactly once', async () => {
  const env = await bootWinlossShell();
  try {
    startRunning(env);
    landFirst(env);
    tripToDeath(env);
    env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    env.handlers.window.keyup({ code: 'Space' });
    tick(env, 100);
    assert.equal(env.views.at(-1).run.status, 'running', 'fresh press restarts');
    // Witness against a silent second startRun: the lead-in hop's vy falls
    // monotonically while airborne (flight ~444 ms outlasts this window);
    // a second start would re-fire it at 400.
    let vy = env.views.at(-1).player.vy;
    for (let i = 0; i < 4; i++) {
      tick(env);
      assert.ok(env.views.at(-1).player.vy < vy, 'no silent second startRun');
      vy = env.views.at(-1).player.vy;
    }
    const r = env.views.at(-1).run;
    assert.equal(r.status, 'running', 'still the one restarted run');
    assert.ok(!/Missed|Summit/.test(env.hud['hud-prompt'].textContent), 'the over copy is gone for good');
  } finally { env.restore(); }
});

test('blur on the over screen restarts nothing', async () => {
  const env = await bootWinlossShell();
  try {
    startRunning(env);
    landFirst(env);
    tripToDeath(env);
    env.handlers.window.blur();
    for (let i = 0; i < 4; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'over', 'focus loss never restarts a dead run (T-05-07)');
  } finally { env.restore(); }
});

test('a hold charged before the death cannot jump the restarted run', async () => {
  const env = await bootWinlossShell();
  try {
    startRunning(env);
    landFirst(env);
    env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    for (let i = 0; i < 400 && env.views.at(-1).run.status === 'running'; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'over', 'the run tripped while the key was held');
    env.handlers.window.keyup({ code: 'Space' });
    env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    env.handlers.window.keyup({ code: 'Space' });
    tick(env, 100);
    assert.equal(env.views.at(-1).run.status, 'running', 'the fresh press restarted');
    const vy = env.views.at(-1).player.vy;
    env.handlers.window.blur();
    tick(env);
    assert.ok(env.views.at(-1).player.vy <= vy,
      'blur fires no phantom jump — the pre-death hold died with the run');
  } finally { env.restore(); }
});

// ---------- AC1 claim: the summit tick's events channel ----------

test('a summit tick carrying a 10th skip pushes win without the ghost offer event', () => {
  // Sim-side: the SAME tick clears its 10th skip (offer fires) and breaks the
  // summit ceiling. The offer FIELD is nulled; the channel must not keep a
  // cue for a pick that can never be presented (deferred-work claim, 5.1-safe).
  const rope = createRope(1.3);
  const run = {
    status: 'running', score: 9, altitude: AREAS[AREAS.length - 1].ceiling + 20, skips: 9,
    effects: freshEffects(), offer: null, owned: {}, buffer: 0, streak: 0,
    ropes: 1, iFrames: 0, area: SUMMIT_AREA, baseAltitude: 0, outcome: null,
  };
  const player = { y: 20, vy: 0, grounded: false, squash: 1, squashVel: 0 }; // clears the pass
  rope.phase = 0.449; // next step enters the feet window — exactly one crossing
  const out = tickRun(run, rope, player, 0.02, () => 0.5, null);
  assert.equal(out.run.status, 'over', 'the summit tick ends the run');
  assert.equal(out.run.outcome, 'summit');
  assert.ok(out.events.includes('win'), 'the win cue rides the channel');
  assert.ok(!out.events.includes('offer'), 'no ghost offer on the win tick');
});
