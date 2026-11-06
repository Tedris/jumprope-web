import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AREAS, SUMMIT_AREA, ALT_PER_POINT } from '../js/game.js';
import { CARDS } from '../js/upgrades.js';

// Story 2.3 (FR8): the ceiling marker — distance-to-ceiling as a HUD line
// computed PURELY from the one-way view payload (run + player), never a
// second altitude path. Harness idiom copied from tests/uxpolish.test.js
// (createElement-capable DOM stub + rewritten import graph); every existing
// test file stays byte-identical (house rule). Expectations derive from the
// AREAS ladder — never a hardcoded ceiling table.

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;
const settle = () => new Promise(r => setTimeout(r, 0));
let bootCount = 0;

// Minimal DOM: createElement/appendChild/className/style/textContent — the
// same shape uxpolish pins; the marker layer must live inside it.
function makeDom() {
  const created = [];
  const mk = tag => {
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
      replaceChildren(...cs) { this.children = cs; },
      addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); },
      fire(type, ev = {}) { for (const fn of this.listeners[type] ?? []) fn(ev); },
    };
    created.push(el);
    return el;
  };
  return { created, mk };
}

async function bootCeilingShell({ dom }) {
  const frames = [];
  const handlers = { window: {}, canvas: {} };
  const hudEls = {
    'hud-score': { textContent: '' },
    'hud-best': { textContent: '' },
    'hud-prompt': { textContent: '' },
    'hud-owned': { textContent: '' },
  };
  const canvas = {
    width: 0, height: 0, style: {},
    addEventListener: (type, fn) => { handlers.canvas[type] = fn; },
  };
  const { created, mk } = makeDom();
  const hudRoot = mk('div');
  if (dom) hudEls['hud-ropes'] = mk('span');
  const documentStub = dom
    ? {
        hidden: false,
        createElement: mk,
        getElementById: id => (id === 'game' ? canvas : id === 'hud' ? hudRoot : hudEls[id]),
      }
    : { hidden: false, getElementById: id => (id === 'game' ? canvas : hudEls[id]) };

  const map = new Map();
  const storageStub = {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); },
  };
  const script = { forceScore: undefined, forceArea: null, chooseOffer: null, armed: false };
  globalThis.__cmScript = script;
  const views = [];
  globalThis.__shellTestViews = views;

  const clock = { t: 0 };
  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    performance: Object.getOwnPropertyDescriptor(globalThis, 'performance'),
    __cmScript: globalThis.__cmScript,
    consoleError: console.error,
  };
  globalThis.document = documentStub;
  globalThis.window = {
    addEventListener: (type, fn) => { handlers.window[type] = fn; },
    innerWidth: 480, innerHeight: 640,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
  };
  globalThis.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', { value: storageStub, configurable: true });
  globalThis.performance = { now: () => clock.t };
  console.error = () => {};

  // tickRun wrapper over the REAL sim: stamps area/score onto records the real
  // state machine also produces (ascent sets area; score drives altitude via
  // ALT_PER_POINT — the altitude===ALT×score invariant stays intact).
  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `export * from "${fileHref('game.js')}";`,
    'import * as real from "' + fileHref('game.js') + '";',
    'export const tickRun = (...args) => {',
    '  const s = globalThis.__cmScript;',
    '  let a = args;',
    '  if (s.forceArea) a = [{ ...args[0], area: s.forceArea }, ...args.slice(1)];',
    '  let out = real.tickRun(...a);',
    '  if (s.forceScore !== undefined) out = { ...out, run: { ...out.run, score: s.forceScore, altitude: s.forceScore * real.ALT_PER_POINT } };',
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

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//ceiling-boot ${++bootCount}`));
  await settle();

  const restore = () => {
    globalThis.document = saved.document;
    globalThis.window = saved.window;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    if (saved.localStorage) Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
    else delete globalThis.localStorage;
    if (saved.performance) Object.defineProperty(globalThis, 'performance', saved.performance);
    else delete globalThis.performance;
    delete globalThis.__cmScript;
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

// startRun()'s leadIn ships a PRE-LAUNCHED hop (game.js leadIn: player =
// jump(createPlayer(), 0.1)) — strict-number legs assert only after that hop
// lands; the first rope pass arrives at ~0.87 s, so the wait never trips.
function landFirst(env) {
  for (let i = 0; i < 30 && !env.views.at(-1).player.grounded; i++) tick(env);
  assert.equal(env.views.at(-1).player.grounded, true, 'the start hop landed');
}

function marker(env) {
  return env.created.find(el => el._cn === 'hud-marker');
}

function markerDist(env) {
  const m = /(?:ceiling|summit) (\d+) ↑/.exec(marker(env)?.textContent ?? '');
  return m ? Number(m[1]) : NaN;
}

// ---------- AC1: distance-to-ceiling per area, derived from AREAS ----------

test('running marker shows distance to the current area ceiling in every area', async () => {
  const alt = 40; // below every ladder ceiling — Math.max(0,·) never masks a wrong target
  for (let a = 1; a <= AREAS.length; a++) {
    const env = await bootCeilingShell({ dom: true });
    try {
      startRunning(env);
      env.script.forceArea = a;
      env.script.forceScore = alt / ALT_PER_POINT;
      landFirst(env);
      const expect = (a === SUMMIT_AREA ? 'summit ' : 'ceiling ') + (AREAS[a - 1].ceiling - alt) + ' ↑';
      assert.equal(marker(env).textContent, expect,
        `area ${a} marker derives from AREAS[${a - 1}].ceiling (grounded, y=0)`);
    } finally { env.restore(); }
  }
});

test('marker flips its target when the area flips (ladder derivation, one step)', async () => {
  const env = await bootCeilingShell({ dom: true });
  try {
    startRunning(env);
    env.script.forceScore = 40 / ALT_PER_POINT;
    env.script.forceArea = 1;
    landFirst(env);
    const d1 = markerDist(env);
    env.script.forceArea = 2;
    tick(env);
    const d2 = markerDist(env);
    assert.equal(d1, AREAS[0].ceiling - 40, 'area-1 target');
    assert.equal(d2, AREAS[1].ceiling - 40, 'area-2 target comes from the NEXT ladder row');
    assert.ok(d2 > d1, 'the next ceiling is farther — the flip is observable');
  } finally { env.restore(); }
});

test('at the ceiling the distance clamps to zero without faking an ascent', async () => {
  const env = await bootCeilingShell({ dom: true });
  try {
    startRunning(env);
    env.script.forceArea = 1;
    landFirst(env); // grounded first: an airborne peak at-ceiling would legally ascend
    env.script.forceScore = AREAS[0].ceiling / ALT_PER_POINT; // peak EXACTLY at the ceiling
    tick(env);
    assert.equal(marker(env).textContent, 'ceiling 0 ↑', 'clamped floor of the distance formula');
    assert.equal(env.views.at(-1).run.status, 'running', 'strict > means at-ceiling is not an ascent');
    assert.equal(env.views.at(-1).run.area, 1, 'area unchanged at the exact ceiling');
  } finally { env.restore(); }
});

// ---------- AC2: payload-only proximity — counts down through the jump arc ----------

test('marker counts down through the jump arc from payload alone', async () => {
  const env = await bootCeilingShell({ dom: true });
  try {
    startRunning(env);
    env.script.forceArea = 1;
    const alt = AREAS[0].ceiling - 100; // peak of the scripted hold stays BELOW the ceiling
    env.script.forceScore = alt / ALT_PER_POINT;
    for (let i = 0; i < 10; i++) tick(env); // cross the lead-in gate (450 ms)
    env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    tick(env);
    env.clock.t += 250;
    env.handlers.window.keyup({ code: 'Space', preventDefault() {} });
    const start = markerDist(env);
    let minDist = start;
    let prevY = null;
    let prevD = start;
    for (let i = 0; i < 10; i++) {
      tick(env);
      const { player, run } = env.views.at(-1);
      const d = markerDist(env);
      assert.equal(d, Math.max(0, Math.ceil(AREAS[0].ceiling - run.altitude - player.y)),
        `frame ${i}: the marker IS the payload formula — no renderer/sim truth added`);
      if (prevY !== null && player.y > prevY) {
        assert.ok(d < prevD, `frame ${i}: climbing means the number dropped`);
      }
      minDist = Math.min(minDist, d);
      prevY = player.y;
      prevD = d;
    }
    assert.ok(minDist < start, 'the climb visibly counted down toward the ceiling');
  } finally { env.restore(); }
});

// ---------- AC3: summit presentation (contrast pair with an intermediate) ----------

test('the summit area presents as a win target, intermediate areas as ceilings', async () => {
  const pair = [
    [SUMMIT_AREA, 'summit '],
    [SUMMIT_AREA - 1, 'ceiling '],
  ];
  for (const [area, prefix] of pair) {
    const env = await bootCeilingShell({ dom: true });
    try {
      startRunning(env);
      env.script.forceArea = area;
      env.script.forceScore = 40 / ALT_PER_POINT;
      tick(env);
      assert.match(marker(env).textContent, new RegExp('^' + prefix + '\\d+ ↑$'),
        `area ${area} uses the ${prefix.trim()} presentation`);
    } finally { env.restore(); }
  }
});

// ---------- AC1/4: non-running statuses blank the marker ----------

test('idle, choose, and over records leave the marker blank', async () => {
  const env = await bootCeilingShell({ dom: true }); // idle
  try {
    tick(env);
    assert.equal(marker(env).textContent, '', 'idle: no marker');

    env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    tick(env); // running
    env.script.chooseOffer = [CARDS[0], CARDS[1]];
    tick(env); // choose via the wrapper
    assert.equal(env.views.at(-1).run.status, 'choose');
    assert.equal(marker(env).textContent, '', 'choose: no marker');
  } finally { env.restore(); }

  const env2 = await bootCeilingShell({ dom: true });
  try {
    startRunning(env2);
    env2.script.forceScore = 40 / ALT_PER_POINT;
    for (let i = 0; i < 400 && env2.views.at(-1).run.status === 'running'; i++) tick(env2);
    assert.equal(env2.views.at(-1).run.status, 'over', 'grounded, the rope eventually trips');
    assert.equal(marker(env2).textContent, '', 'over: no marker');
  } finally { env2.restore(); }
});

// ---------- AC4: frozen-harness shape — no createElement, no layer ----------

test('without createElement the marker layer never exists and nothing throws', async () => {
  const env = await bootCeilingShell({ dom: false });
  try {
    startRunning(env);
    env.script.forceArea = 1;
    env.script.forceScore = 20;
    tick(env);
    tick(env);
    assert.equal(env.created.find(el => el._cn === 'hud-marker'), undefined,
      'DOM-less harness: no marker node was built');
    assert.equal(env.views.at(-1).run.status, 'running', 'the shell booted and ticks unchanged');
  } finally { env.restore(); }
});
