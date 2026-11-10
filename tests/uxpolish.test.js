import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bootModule, captureConsoleErrors, fileHref, installStage, installVirtualClock,
  makeGameWrapHref, makeRenderStubHref, mapStorage, settle, shellSrc,
} from './support/shell-harness.js';
import { createRun, tickRun, ROPE_PERIOD, ALT_PER_POINT } from '../js/game.js';
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

// tickRun wrapper over the REAL sim: same surface; the script block can stamp
// ropes into the INPUT (like v1parity's wrapper) and score/choose states onto
// the OUTPUT — values the real state machine also produces.
const UX_GAME_WRAP = `
  export const tickRun = (...args) => {
    const s = globalThis.__uxScript;
    let a = args;
    if (s.forceRopes) a = [{ ...args[0], ropes: s.forceRopes }, ...args.slice(1)];
    let out = real.tickRun(...a);
    if (s.forceScore !== undefined) out = { ...out, run: { ...out.run, score: s.forceScore, altitude: s.forceScore * real.ALT_PER_POINT } };
    if (s.chooseOffer && !s.armed && out.run.status === "running") {
      s.armed = true;
      out = { ...out, run: { ...out.run, status: "choose", offer: s.chooseOffer } };
    }
    return out;
  };`;

async function bootUxShell({ dom }) {
  const map = new Map();
  const script = { forceRopes: null, forceScore: undefined, chooseOffer: null, armed: false };
  const stage = installStage({
    storage: mapStorage(map),
    clock: installVirtualClock(), errors: captureConsoleErrors(),
    metrics: true, createElement: dom, hudRoot: true,
    globals: { __uxScript: script },
  });
  if (dom) stage.hud['hud-ropes'] = stage.mk('span'); // the pip row needs createElement
  await bootModule(await shellSrc({
    render3d: makeRenderStubHref(),
    game: makeGameWrapHref(fileHref('game.js'), UX_GAME_WRAP),
  }), 'ux-boot');
  await settle(); // the (failing, caught) dynamic audio import lands here
  return { ...stage, map, script };
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

// ---------- altitude display (harness shape: no createElement → no overlay) ----------

// Story 2.1 sanctioned re-contract: the pinned number is now ALTITUDE, not
// score (same purpose: integer-string display, float-tail guard, storage
// cleanliness). Expectations derive from ALT_PER_POINT × forceScore.
test('fractional altitude renders as an integer string in HUD, best, and the missed prompt (float-tail fix)', async () => {
  const env = await bootUxShell({ dom: false });
  try {
    startRunning(env);
    env.script.forceScore = 2.2999999999999998; // the documented Wide Brim tail
    const alt = 2.2999999999999998 * ALT_PER_POINT; // 4.5999… — the tail bites at ×2 too
    tick(env);
    assert.match(env.hud['hud-score'].textContent, /^\d+$/, 'HUD altitude is an integer string');
    assert.equal(env.hud['hud-score'].textContent, String(Math.round(alt)), 'the float tail displays rounded');
    assert.equal(env.views.at(-1).run.score, 2.2999999999999998,
      'the simulation record stays the exact float — only the display rounds');
    assert.equal(env.views.at(-1).run.altitude, alt, 'altitude stays the exact float in the record');
    assert.equal(env.hud['hud-best'].textContent, 'best ' + Math.round(alt));

    // Trip with a 4.6-score record (altitude 9.2): saved best and prompt both
    // round, storage clean.
    env.script.forceRopes = 1;
    env.script.forceScore = 4.6;
    const altOver = 4.6 * ALT_PER_POINT;
    for (let i = 0; i < 400 && env.views.at(-1).run.status === 'running'; i++) tick(env);
    assert.equal(env.views.at(-1).run.status, 'over', 'grounded, the rope eventually trips');
    assert.equal(env.map.get('jumprope-best'), String(Math.round(altOver)), 'storage holds the rounded integer');
    assert.match(env.hud['hud-prompt'].textContent,
      new RegExp('^Missed! Altitude ' + Math.round(altOver) + '( best ' + Math.round(altOver) + ')?$'));
    assert.equal(env.hud['hud-best'].textContent, 'best ' + Math.round(altOver));
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
