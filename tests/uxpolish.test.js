import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRun, tickRun, ROPE_PERIOD } from '../js/game.js';
import { CARDS } from '../js/upgrades.js';

// UI polish (2026-11-05): three shipped fixes pinned in one file.
//  1. Score display is an integer string (the Wide Brim 0.75 / Lucky Tally
//     1.15 accumulation used to leak float tails into HUD/best/prompt). The
//     simulation record stays a float — only the display/save sites round.
//  2. The offer renders as selectable DOM cards (name + description, tap to
//     select, hold-to-confirm, swipe/arrow to cycle) ONLY when a real DOM
//     exists — the DOM-less harness shape keeps the frozen text-prompt path.
//  3. (renderer rope-follow needs three — pinned by live browser smoke, not
//     here; the boundary fence keeps render3d out of the Node import graph.)
//
// The harness owns a fake performance clock: ALL pick/hold/lead-in timing in
// the shell reads performance.now(), so one stub makes the 800 ms hold
// confirm deterministic in ~17 pumped frames. Zero production seams beyond
// the tickRun output wrapper (forcing score/choose states a real run also
// reaches — the rig manufactures VALUES, the production code does the
// formatting, rendering, and confirming).

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;
const settle = () => new Promise(r => setTimeout(r, 0));
let bootCount = 0;

// Minimal DOM: enough for the overlay layer (createElement, replaceChildren,
// addEventListener, className/style/textContent). No querySelector/dataset —
// the production overlay deliberately avoids them.
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

async function bootUxShell({ dom }) {
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
  if (dom) hudEls['hud-ropes'] = mk('span'); // the pip row needs createElement
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
  const script = { forceRopes: null, forceScore: undefined, chooseOffer: null, armed: false };
  globalThis.__uxScript = script;
  const views = [];
  globalThis.__shellTestViews = views;

  const clock = { t: 0 };
  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    performance: Object.getOwnPropertyDescriptor(globalThis, 'performance'),
    __uxScript: globalThis.__uxScript,
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

  // tickRun wrapper over the REAL sim: same surface; the script block can
  // stamp ropes into the INPUT (like v1parity's wrapper) and score/choose
  // states onto the OUTPUT — values the real state machine also produces.
  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `export * from "${fileHref('game.js')}";`,
    'import * as real from "' + fileHref('game.js') + '";',
    'export const tickRun = (...args) => {',
    '  const s = globalThis.__uxScript;',
    '  let a = args;',
    '  if (s.forceRopes) a = [{ ...args[0], ropes: s.forceRopes }, ...args.slice(1)];',
    '  let out = real.tickRun(...a);',
    '  if (s.forceScore !== undefined) out = { ...out, run: { ...out.run, score: s.forceScore } };',
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

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//ux-boot ${++bootCount}`));
  await settle(); // the (failing, caught) dynamic audio import lands here

  const restore = () => {
    globalThis.document = saved.document;
    globalThis.window = saved.window;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    if (saved.localStorage) Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
    else delete globalThis.localStorage;
    if (saved.performance) Object.defineProperty(globalThis, 'performance', saved.performance);
    else delete globalThis.performance;
    delete globalThis.__uxScript;
    delete globalThis.__shellTestViews;
    console.error = saved.consoleError;
  };
  return { frames, handlers, hud: hudEls, views, map, script, clock, created, hudRoot, restore };
}

// 50 ms fake-clock frames — the same pump idiom as polish.test.js, but the
// pumped now IS the fake clock the shell's press/pick timing stamps against.
function tick(env, ms = 50) {
  env.clock.t += ms;
  env.frames.at(-1)(env.clock.t);
}

function startRunning(env) {
  env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
  tick(env);
  assert.equal(env.views.at(-1).run.status, 'running', 'opening Space started the run');
}

function barOf(card) {
  return card.children.find(c => c._cn === 'card-fill').children[0];
}
function strip(env) {
  return env.created.find(el => el._cn === 'hud-cards');
}
function runToChoose(env, offer) {
  env.script.chooseOffer = offer;
  env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
  tick(env); // the first running tick flips into choose via the wrapper
  assert.equal(env.views.at(-1).run.status, 'choose', 'the wrapper reached the offer');
  return env;
}

function activeCards(env) {
  return strip(env).children; // live refs — cursor moves rebuild the strip
}

// ---------- score display (harness shape: no createElement → no overlay) ----------

test('fractional score renders as an integer string in HUD, best, and the missed prompt (float-tail fix)', async () => {
  const env = await bootUxShell({ dom: false });
  try {
    startRunning(env);
    env.script.forceScore = 2.2999999999999998; // the documented Wide Brim tail
    tick(env);
    assert.match(env.hud['hud-score'].textContent, /^\d+$/, 'HUD score is an integer string');
    assert.equal(env.hud['hud-score'].textContent, '2', '2.2999… displays as 2');
    assert.equal(env.views.at(-1).run.score, 2.2999999999999998,
      'the simulation record stays the exact float — only the display rounds');
    assert.equal(env.hud['hud-best'].textContent, 'best 2');

    // Trip with a 4.6 record: saved best and prompt both round, storage clean.
    env.script.forceRopes = 1;
    env.script.forceScore = 4.6;
    for (let i = 0; i < 400 && env.views.at(-1).run.status === 'running'; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'over', 'grounded, the rope eventually trips');
    assert.equal(env.map.get('jumprope-best'), '5', 'storage holds the rounded integer');
    assert.match(env.hud['hud-prompt'].textContent, /^Missed! Score 5$/);
    assert.equal(env.hud['hud-best'].textContent, 'best 5');
  } finally { env.restore(); }
});

// ---------- card overlay (real-DOM harness shape) ----------

test('the offer renders as selectable cards with name, description, and owned readout', async () => {
  const env = await bootUxShell({ dom: true });
  try {
    const offer = [CARDS[0], CARDS[2]];
    runToChoose(env, offer);
    const cards = activeCards(env);
    assert.equal(cards.length, 2, 'one card per offered card');
    for (const [i, card] of offer.entries()) {
      const text = JSON.stringify(cards[i].children.map(c => c.textContent));
      assert.ok(text.includes(card.name), `card ${i} shows its name`);
      assert.ok(text.includes(card.desc ?? ''), `card ${i} shows its description`);
      assert.ok(text.includes(String(card.icon ?? '')), `card ${i} shows its icon`);
    }
    assert.ok(cards[0]._cn.includes('selected'), 'cursor starts on the first card');
    assert.equal(env.hud['hud-prompt'].textContent, '', 'the text prompt defers to the cards');
  } finally { env.restore(); }
});

test('tapping a card selects it and holding confirms through the shared pick path', async () => {
  const env = await bootUxShell({ dom: true });
  try {
    const offer = [CARDS[0], CARDS[2]];
    runToChoose(env, offer);
    const held = activeCards(env)[1];
    held.fire('pointerdown', { clientX: 150, preventDefault() {} });
    tick(env);
    assert.ok(activeCards(env)[1]._cn.includes('selected'), 'tap moved the cursor');
    assert.ok(!activeCards(env)[0]._cn.includes('selected'));
    for (let i = 0; i < 20 && env.views.at(-1).run.status === 'choose'; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'running', 'the hold confirmed via tickPick');
    assert.equal(env.views.at(-1).run.owned[offer[1].id], 1, 'the tapped card was applied');
    held.fire('pointerup', {}); // the confirm-release is swallowed (Pitfall 4)
    tick(env);
    assert.equal(env.views.at(-1).run.status, 'running', 'the swallowed release did not restart');
  } finally { env.restore(); }
});

test('an early release cancels the card fill; blur hygiene cancels a card hold', async () => {
  const env = await bootUxShell({ dom: true });
  try {
    const offer = [CARDS[1], CARDS[3]];
    runToChoose(env, offer);
    activeCards(env)[1].fire('pointerdown', { clientX: 150, preventDefault() {} });
    tick(env); tick(env);
    assert.notEqual(barOf(activeCards(env)[1]).style.width, '0%', 'the fill started on the held card');
    activeCards(env)[1].fire('pointerup', {});
    for (let i = 0; i < 20; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'choose', 'early release cancelled the confirm');
    assert.equal(env.views.at(-1).run.owned?.[offer[1].id] ?? 0, 0, 'nothing applied');

    activeCards(env)[1].fire('pointerdown', { clientX: 150, preventDefault() {} });
    tick(env);
    env.handlers.window.blur();
    for (let i = 0; i < 25; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'choose', 'blur killed the pending hold');
    assert.equal(barOf(activeCards(env)[1]).style.width, '0%', 'the fill bar reset');
  } finally { env.restore(); }
});

test('swipe cycles the cursor and never confirms; arrow keys cycle with parity', async () => {
  const env = await bootUxShell({ dom: true });
  try {
    const offer = [CARDS[0], CARDS[1], CARDS[2]];
    runToChoose(env, offer);
    assert.equal(activeCards(env).length, 3);
    // left-swipe = next card, and it must drop any armed hold
    activeCards(env)[0].fire('pointerdown', { clientX: 100, preventDefault() {} });
    strip(env).fire('pointerdown', { clientX: 100 });
    strip(env).fire('pointermove', { clientX: 100 - 80 });
    tick(env);
    assert.ok(activeCards(env)[1]._cn.includes('selected'), 'swipe left advanced the cursor');
    for (let i = 0; i < 25; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'choose', 'the swipe-armed hold was cleared');
    assert.equal(Object.keys(env.views.at(-1).run.owned ?? {}).length, 0, 'swiping never confirms');
    // right-swipe cycles back (wraps)
    strip(env).fire('pointerdown', { clientX: 100 });
    strip(env).fire('pointermove', { clientX: 100 + 80 });
    tick(env);
    assert.ok(activeCards(env)[0]._cn.includes('selected'), 'swipe right went back');
    // keyboard parity
    env.handlers.window.keydown({ code: 'ArrowRight', repeat: false, preventDefault() {} });
    tick(env);
    assert.ok(activeCards(env)[1]._cn.includes('selected'), 'ArrowRight cycles like Space');
    env.handlers.window.keydown({ code: 'ArrowLeft', repeat: false, preventDefault() {} });
    tick(env);
    assert.ok(activeCards(env)[0]._cn.includes('selected'), 'ArrowLeft cycles backwards');
    // Space keeps its cycle-and-arm semantics
    env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    env.handlers.window.keyup({ code: 'Space' });
    tick(env);
    assert.ok(activeCards(env)[1]._cn.includes('selected'), 'Space still cycles the shared cursor');
  } finally { env.restore(); }
});

test('the overlay rebuilds when the offer changes and clears on leave', async () => {
  const env = await bootUxShell({ dom: true });
  try {
    runToChoose(env, [CARDS[0], CARDS[1]]);
    assert.equal(activeCards(env).length, 2);
    const offer = [CARDS[2], CARDS[3]];
    env.script.chooseOffer = offer;
    // confirm the current pick so the run resumes, then force choose again
    activeCards(env)[0].fire('pointerdown', { clientX: 100, preventDefault() {} });
    for (let i = 0; i < 20 && env.views.at(-1).run.status === 'choose'; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'running', 'first pick applied');
    assert.equal(activeCards(env).length, 0, 'the strip emptied while running');
    env.script.armed = false; // wrapper re-arms the next running tick
    tick(env);
    const rebuilt = activeCards(env);
    const text = JSON.stringify(rebuilt.map(c => c.children.map(k => k.textContent)));
    assert.ok(text.includes(CARDS[2].name) && text.includes(CARDS[3].name),
      'the second offer renders fresh cards');
  } finally { env.restore(); }
});
