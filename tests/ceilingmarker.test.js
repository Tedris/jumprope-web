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

async function bootCeilingShell({ dom }) {
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
  // Seed index.html's real #hud children so the marker's insertBefore slot
  // (pips → marker → owned, DESIGN HUD order) is observable.
  for (const el of [hudEls['hud-score'], hudEls['hud-best'], hudEls['hud-ropes'],
    hudEls['hud-prompt'], hudEls['hud-owned']]) if (el) hudRoot.appendChild(el);
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
  const script = { forceScore: undefined, forceArea: null, forceAreaOut: null, chooseOffer: null, armed: false };
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
    '  if (s.forceArea !== null) a = [{ ...args[0], area: s.forceArea }, ...args.slice(1)];',
    '  if (s.forceAreaOut !== null) a = [{ ...args[0], area: Math.min(Math.max(Math.round(Number.isFinite(s.forceAreaOut) ? s.forceAreaOut : 1), 1), real.AREAS.length) }, ...args.slice(1)];',
    '  let out = real.tickRun(...a);',
    '  if (s.forceScore !== undefined) out = { ...out, run: { ...out.run, score: s.forceScore, altitude: s.forceScore * real.ALT_PER_POINT } };',
    '  if (s.forceAreaOut !== null) out = { ...out, run: { ...out.run, area: s.forceAreaOut } };',
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
// lands. The first rope pass is the rising edge at (0.45−0.33)×1.3 ≈ 0.156 s
// and it is survived AIRBORNE (hop y ≈ 40 > minHeight 18), not because it
// arrives late.
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

// The flip leg above stamps area from the harness; this leg watches the SIM
// ascend — an altitude pinned a hair over the ceiling breaks it at the next
// rope crossing (strict-`>` semantics, Story 2.2) — and the marker follows.
test('a physical ascend flips the marker target end-to-end', async () => {
  const env = await bootCeilingShell({ dom: true });
  try {
    startRunning(env);
    landFirst(env);
    env.script.forceScore = (AREAS[0].ceiling + 2) / ALT_PER_POINT;
    for (let i = 0; i < 30 && env.views.at(-1).run.area === 1; i++) tick(env);
    const { run, player } = env.views.at(-1);
    assert.equal(run.area, 2, 'the real sim crossed the ceiling (no forceArea involved)');
    assert.equal(marker(env).textContent,
      'ceiling ' + Math.max(0, Math.ceil(AREAS[1].ceiling - run.altitude - player.y)) + ' ↑',
      'the marker target followed the sim into the next area');
  } finally { env.restore(); }
});

test('at the ceiling the distance clamps to zero without faking an ascent', async () => {
  const env = await bootCeilingShell({ dom: true });
  try {
    startRunning(env);
    env.script.forceArea = 1;
    landFirst(env); // grounded first: an airborne peak at-ceiling would legally ascend
    env.script.forceScore = AREAS[0].ceiling / ALT_PER_POINT; // peak EXACTLY at the ceiling
    // Tick twice: the wrapper stamps altitude on the OUTPUT, so only from
    // tick 2 does the sim's own INPUT carry the ceiling altitude while the
    // crossing check runs — the strict-`>` claim needs the sim to see it.
    tick(env);
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
    let dropped = false;
    for (let i = 0; i < 10; i++) {
      tick(env);
      const { player, run } = env.views.at(-1);
      assert.equal(run.status, 'running', `frame ${i}: mid-arc — a trip here would skew the countdown`);
      const d = markerDist(env);
      assert.equal(d, Math.max(0, Math.ceil(AREAS[0].ceiling - run.altitude - player.y)),
        `frame ${i}: the marker IS the payload formula — no renderer/sim truth added`);
      if (prevY !== null && player.y > prevY) {
        assert.ok(d <= prevD, `frame ${i}: climbing never raises the number`);
        if (d < prevD) dropped = true;
      }
      minDist = Math.min(minDist, d);
      prevY = player.y;
      prevD = d;
    }
    assert.ok(dropped, 'the climb strictly dropped the number at least once');
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
    assert.notEqual(marker(env).textContent, '', 'running first: makes the blank asserts below falsifiable');
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

// ---------- HUD slot 3 (DESIGN order: pips → marker → owned) ----------

test('the marker sits between the rope pips and the owned line', async () => {
  const env = await bootCeilingShell({ dom: true });
  try {
    const kids = env.hudRoot.children;
    const i = kids.indexOf(marker(env));
    assert.ok(i > kids.indexOf(env.hud['hud-ropes']), 'marker below the rope pips');
    assert.ok(i < kids.indexOf(env.hud['hud-owned']), 'marker above the owned line');
  } finally { env.restore(); }
});

test('a crafted out-of-domain area clamps at read instead of throwing', async () => {
  // markerLine's `?? 1` only heals nullish; the clamp (clampRopes doctrine)
  // must survive 0/NaN/past-the-end — an updateHud throw would freeze
  // scene.render every subsequent frame. The payload carries the crafted
  // value; real.tickRun gets a clamped stand-in (its own guard defers to 4.1).
  for (const [area, row] of [[0, 1], [9, AREAS.length], [2.5, 3], [NaN, 1]]) {
    const env = await bootCeilingShell({ dom: true });
    try {
      startRunning(env);
      env.script.forceAreaOut = area; // payload-only: 4.1 shipped clampArea; this stand-in keeps the leg marker-side (story 4.5 sanctioned comment re-contract)
      env.script.forceScore = 40 / ALT_PER_POINT;
      for (let i = 0; i < 8; i++) tick(env); // land on t=450, the first sim tick
      const { run, player } = env.views.at(-1);
      assert.equal(markerDist(env),
        Math.max(0, Math.ceil(AREAS[row - 1].ceiling - run.altitude - player.y)),
        `crafted area ${area} clamps into the ladder marker-side`);
    } finally { env.restore(); }
  }
});

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
