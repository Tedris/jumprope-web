import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Story 3.5 (FR13/FR14): digit picker keys + the state-aware owned line.
// Harness: the uxpolish.test.js data-URL boot — real js/shell.js over a
// recording render stub, fixed hud maps, fake clock, and a tickRun wrapper
// that can stamp a CHOOSE freeze with a scripted offer (the frozen
// chooseOffer idiom). No relative import specifiers into js/ appear in this
// file, so boundary.test.js's SPECIFIER_RE walk never sees the shell seam;
// pure legs import game.js through a computed pathToFileURL href.
//
// Mutation matrix: M1 drop `pickIdx = k - 1` -> legs 1/4 red; M2 drop the
// range check -> leg 2 red (crash or stray pick); M3 drop the choose-status
// guard -> leg 3 red; M4 confirm without clearing holdFrom -> the held-from-
// running leg red (the FROZEN pickflow legs cannot reach it — there the
// press arms only the pick hold); M5 hint from pickIdx not i -> leg 6 red
// after a cursor cycle; M6 owned line reads constants/stale fields -> legs
// 7/8 red; M7 no repeat guard -> leg 5 red.

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;
const settle = () => new Promise(r => setTimeout(r, 0));
let bootCount = 0;

async function bootShell({ dom = false } = {}) {
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
  const created = [];
  const mk = (tag, kind) => {
    const el = {
      tag, children: [], listeners: {}, style: {}, textContent: '', _cn: '',
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
  const hudRoot = mk('div');
  if (dom) hudEls['hud-ropes'] = mk('span', 'pips');
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
  const script = { chooseOffer: null, armed: false };
  globalThis.__phScript = script;
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
  globalThis.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', { value: storageStub, configurable: true });
  globalThis.performance = { now: () => clock.t };
  console.error = () => {};

  // tickRun wrapper over the REAL sim: stamps a scripted choose freeze on the
  // first running tick while armed (the uxpolish/pickflow chooseOffer idiom).
  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `export * from "${fileHref('game.js')}";`,
    'import * as real from "' + fileHref('game.js') + '";',
    'export const tickRun = (...args) => {',
    '  const s = globalThis.__phScript;',
    '  const out = real.tickRun(...args);',
    '  if (s.chooseOffer && !s.armed && out.run.status === "running") {',
    '    s.armed = true;',
    '    return { ...out, run: { ...out.run, status: "choose", offer: s.chooseOffer } };',
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

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//pickerhud-boot ${++bootCount}`));
  await settle(); // the (failing, caught) dynamic audio import lands here

  const restore = () => {
    globalThis.document = saved.document;
    globalThis.window = saved.window;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    if (saved.localStorage) Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
    else delete globalThis.localStorage;
    if (saved.performance) Object.defineProperty(globalThis, 'performance', saved.performance);
    else delete globalThis.performance;
    delete globalThis.__phScript;
    delete globalThis.__shellTestViews;
    console.error = saved.consoleError;
  };
  return { frames, handlers, hud: hudEls, views, script, clock, created, hudRoot, restore };
}

// 50 ms fake-clock frames — the polish/uxpolish pump idiom; the pumped now IS
// the fake clock the shell's pick timing stamps against.
function tick(env, ms = 50) {
  env.clock.t += ms;
  env.frames.at(-1)(env.clock.t);
}

const view = env => env.views.at(-1);

function keydown(env, code, repeat = false) {
  const ev = { code, repeat, preventDefault() { ev.prevented = true; } };
  env.handlers.window.keydown(ev);
  return ev;
}

function startRunning(env) {
  env.script.chooseOffer = null;
  keydown(env, 'Space');
  tick(env);
  assert.equal(view(env).run.status, 'running', 'the opening Space started the run');
}

// (Re)stamp a choose freeze with `offer` on the next running tick, then pump
// until it lands. Throws loudly on 'over' (the frozen harness discipline).
function freezeAt(env, offer) {
  env.script.chooseOffer = offer;
  env.script.armed = false;
  for (let guard = 0; guard < 20; guard++) {
    tick(env);
    const st = view(env).run.status;
    if (st === 'choose') return;
    assert.notEqual(st, 'over', 'harness: the scripted run tripped before the freeze');
  }
  throw new Error('harness: the scripted choose freeze never landed');
}

const game = await import(fileHref('game.js'));
const card = id => game.CARDS.find(c => c.id === id);

// ---------- AC1: digit keys pick through the shared path ----------

test('AC1: Digit2 confirms offer[1] instantly, applied and resumed', async () => {
  const env = await bootShell();
  try {
    startRunning(env);
    const offer = [card('float'), card('multi')];
    freezeAt(env, offer);
    const ev = keydown(env, 'Digit2');
    assert.ok(ev.prevented, 'a valid digit takes preventDefault');
    tick(env); // render the post-pick frame (and keep the freeze stamp off)
    const v = view(env);
    assert.equal(v.run.status, 'running', 'the run resumed at once — no hold wait');
    assert.equal(v.run.owned[offer[1].id], 1, 'offer[1] was picked, not the cursor entry');
    assert.equal(v.run.offer, null, 'the freeze ended');
    // Full sweep: every digit k is valid exactly when k <= offer.length —
    // one 3-card offer exercises the Digit3-valid case (skips > 30 deals
    // three cards in production).
    const offer3 = [card('float'), card('multi'), card('feather')];
    freezeAt(env, offer3);
    keydown(env, 'Digit3');
    tick(env);
    assert.equal(view(env).run.owned[offer3[2].id], 1, 'Digit3 picks offer[2] of a 3-card offer');
    freezeAt(env, offer3);
    keydown(env, 'Digit1');
    tick(env);
    assert.equal(view(env).run.owned[offer3[0].id], 1, 'and Digit1 picks offer[0] of three');
  } finally { env.restore(); }
});

test('AC1: out-of-range digits are fully inert — no pick, no preventDefault', async () => {
  const env = await bootShell();
  try {
    startRunning(env);
    const offer = [card('float'), card('multi')];
    freezeAt(env, offer);
    const hi = keydown(env, 'Digit3'); // 2-card offer
    assert.ok(!hi.prevented, 'a digit beyond the offer never claims the event');
    const zero = keydown(env, 'Digit0');
    assert.ok(!zero.prevented, 'Digit0 is not a picker key');
    tick(env);
    const v = view(env);
    assert.equal(v.run.status, 'choose', 'the freeze holds');
    assert.equal(v.run.offer.length, 2, 'the offer is intact');
    assert.deepEqual(v.run.owned, {}, 'nothing was picked');
  } finally { env.restore(); }
});

test('AC1: digits outside the freeze are inert — no pick, no jump side effect', async () => {
  const env = await bootShell();
  try {
    startRunning(env);
    const offer = [card('float'), card('multi')];
    freezeAt(env, offer);
    keydown(env, 'Digit1');
    tick(env); // resumed
    const ev = keydown(env, 'Digit1');
    assert.ok(!ev.prevented, 'no preventDefault while running — everything else stays inert');
    tick(env);
    const v = view(env);
    assert.equal(v.run.status, 'running', 'still the same run');
    assert.equal(v.run.owned[offer[0].id], 1, 'the owned map is untouched');
    assert.equal(v.run.owned[offer[1].id], undefined, 'no phantom second pick');
  } finally { env.restore(); }
});

test('AC1: a Space held across a digit pick never launches — and the digit beats the cycled cursor', async () => {
  const env = await bootShell();
  try {
    startRunning(env);
    const offer = [card('float'), card('multi')];
    freezeAt(env, offer);
    keydown(env, 'Space');
    tick(env); // consumed at choose: cursor -> offer[1], hold-confirm armed
    tick(env, 100); // fill ~100/800 — nowhere near confirm
    keydown(env, 'Digit1'); // the digit picks offer[0], over the cycled cursor
    tick(env);
    assert.equal(view(env).run.owned[offer[0].id], 1, 'the digit entry was picked');
    assert.equal(view(env).run.owned[offer[1].id], undefined, 'the cycled cursor did not confirm');
    env.handlers.window.keyup({ code: 'Space' });
    const vys = [];
    for (let i = 0; i < 20; i++) { tick(env); vys.push(view(env).player.vy); }
    assert.ok(vys.every(vy => vy <= 400), 'the confirm-release never re-launched the player');
  } finally { env.restore(); }
});

// The M4 killer: a Space press consumed WHILE RUNNING (holdFrom armed) then
// held across the freeze — confirmPick's `holdFrom = null` is the statement
// the frozen pickflow legs cannot reach (there the press arms only the pick
// hold). Without the clear, the stale hold would launch once the lead-in
// lock expires.
test('AC1: a Space held from a running press across a digit pick never launches after the lock', async () => {
  const env = await bootShell();
  try {
    startRunning(env);
    keydown(env, 'Space'); // press consumed while RUNNING: holdFrom armed
    tick(env);
    assert.equal(view(env).run.status, 'running', 'mid-run, holding Space');
    const offer = [card('float'), card('multi')];
    freezeAt(env, offer); // the freeze lands while the key is still held
    keydown(env, 'Digit1');
    tick(env);
    assert.equal(view(env).run.owned[offer[0].id], 1, 'the digit picked');
    for (let i = 0; i < 12; i++) tick(env); // 600 ms — the lead-in lock expires
    env.handlers.window.keyup({ code: 'Space' }); // the stale hold releases late
    for (let i = 0; i < 4; i++) tick(env);
    const p = view(env).player;
    assert.ok(p.grounded && p.y <= 0,
      'the held-across pick never re-launches — confirmPick cleared the stale hold');
  } finally { env.restore(); }
});

test('AC1: OS key-repeat of a digit confirms exactly once', async () => {
  const env = await bootShell();
  try {
    startRunning(env);
    const offer = [card('float'), card('multi')];
    freezeAt(env, offer);
    const held = keydown(env, 'Digit1', true);
    assert.ok(!held.prevented, 'a repeat never claims the event');
    tick(env);
    assert.equal(view(env).run.status, 'choose', 'a repeat press never picks');
    keydown(env, 'Digit1');
    tick(env);
    assert.equal(view(env).run.owned[offer[0].id], 1, 'the real press picks once');
  } finally { env.restore(); }
});

// ---------- AC2: rendered number hints, pointer path intact ----------

test('AC2: cards render 1/2/3 hints in RENDER order — stable under cursor cycles', async () => {
  const env = await bootShell({ dom: true });
  try {
    startRunning(env);
    const offer = [card('float'), card('multi'), card('windup')];
    freezeAt(env, offer);
    tick(env); // the card overlay renders
    const strip = env.created.find(el => el._cn === 'hud-cards');
    const hints = () => strip.children.map(c => c.children.find(k => k._cn === 'card-hint').textContent);
    assert.equal(strip.children.length, 3, 'one card per offer entry');
    assert.deepEqual(hints(), ['1', '2', '3'], 'hints match the rendered card order');
    keydown(env, 'ArrowRight'); // cycle the cursor — hints must NOT move
    tick(env);
    assert.deepEqual(hints(), ['1', '2', '3'], 'the hint is the card slot, not the cursor');
    assert.ok(strip.children.some(c => c.children.some(k => (k._cn ?? '').startsWith('card-icon'))),
      'the pointer-pickable card anatomy is intact (icon/name/desc/read/fill)');
  } finally { env.restore(); }
});

// ---------- AC3/AC4: the state-aware owned line ----------

test('AC3: the owned line reads live state — rope count, charges, double-jump', async () => {
  const env = await bootShell();
  try {
    startRunning(env);
    const stateOffer = [card('extrarope'), card('reinforce'), card('doublejump')];
    freezeAt(env, stateOffer);
    keydown(env, 'Digit1');
    freezeAt(env, stateOffer);
    keydown(env, 'Digit2');
    freezeAt(env, stateOffer);
    keydown(env, 'Digit3');
    tick(env);
    const expected = [
      `${card('extrarope').icon}×${view(env).run.ropes}`,
      `${card('reinforce').icon}⟳${view(env).run.charged}`,
      `${card('doublejump').icon}↑${view(env).run.airJumps}`,
    ].join(' ');
    assert.equal(env.hud['hud-owned'].textContent, expected,
      'state cards show their live fields; the multipliers stay icon-only');
    assert.equal(env.hud['hud-owned'].textContent,
      `${card('extrarope').icon}×2 ${card('reinforce').icon}⟳1 ${card('doublejump').icon}↑1`,
      'and the concrete values are: 2 ropes, 1 cord charge, double jump ready');
  } finally { env.restore(); }
});

test('AC4: a trip consumes the charge and the line follows in the same frame — then the rope', async () => {
  const env = await bootShell();
  try {
    startRunning(env);
    const offer = [card('extrarope'), card('reinforce')];
    freezeAt(env, offer);
    keydown(env, 'Digit1');
    freezeAt(env, offer);
    keydown(env, 'Digit2');
    env.script.chooseOffer = null; // no more freezes — let the idle jumper trip
    tick(env);
    const seen = [];
    let trips = 0;
    for (let guard = 0; guard < 400 && trips < 2; guard++) {
      tick(env);
      const r = view(env).run;
      if (r.status !== 'running') break;
      const line = env.hud['hud-owned'].textContent;
      if (trips === 0 && r.charged === 0) {
        assert.equal(line, `${card('extrarope').icon}×2 ${card('reinforce').icon}⟳0`,
          'the charge trip blanked ⟳ in the SAME rendered frame, ropes intact (FR14)');
        assert.equal(r.ropes, 2, 'the reinforced rope survived');
        trips = 1;
      }
      if (trips === 1 && r.ropes === 1) {
        assert.equal(line, `${card('extrarope').icon}×1 ${card('reinforce').icon}⟳0`,
          'the second trip dropped the rope count — ×1, no stale ×2');
        trips = 2;
      }
      seen.push(line);
    }
    assert.equal(trips, 2, 'both trips (charge, then rope) resolved inside the budget');
  } finally { env.restore(); }
});

// ---------- the named clamp (ledger nit paid) ----------

test('clampAirJumps: the 3.4 heal, named — non-finite reads uncharged', async () => {
  for (const bad of [NaN, 'x', null, undefined, Infinity, -Infinity]) {
    assert.equal(game.clampAirJumps(bad), 0, `${String(bad)} reads as no charge`);
  }
  assert.equal(game.clampAirJumps(5), 1);
  assert.equal(game.clampAirJumps(-3), 0);
  assert.equal(game.clampAirJumps(1.7), 1, 'fractions truncate like clampRopes/clampCharged');
  assert.equal(game.clampAirJumps(0.9), 0, 'trunc, not round');
  assert.equal(game.MAX_AIRJUMPS, 1);
});
