import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// End-to-end pick-flow proof for CARD-01/02/04/05/06 (plan 03-01 Task 1).
// Boots the REAL js/shell.js through the same source-rewriting data:-URL
// harness as tests/shell.test.js: the render seam becomes a recording stub
// (globalThis.__shellTestViews) while game/rope/player load for real from
// file: URLs. Zero relative import specifiers into js/ appear in this file,
// so the SPECIFIER_RE walk in tests/boundary.test.js never registers the
// shell seam and the ARCH-01 three-fence stays green. The pure-seam legs
// below import game.js/upgrades.js through computed pathToFileURL hrefs,
// which SPECIFIER_RE cannot see either.
const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');

let bootCount = 0;

async function bootShell() {
  const frames = [];
  const handlers = { window: {}, canvas: {} };
  const hud = {
    'hud-score': { textContent: '' },
    'hud-best': { textContent: '' },
    'hud-prompt': { textContent: '' },
    'hud-owned': { textContent: '' }
  };
  const canvas = {
    width: 0,
    height: 0,
    addEventListener: (type, fn) => { handlers.canvas[type] = fn; }
  };
  const views = [];
  globalThis.__shellTestViews = views;

  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    // Descriptor, not value: reading Node 26's experimental localStorage
    // getter emits an ExperimentalWarning through console.error.
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    consoleError: console.error
  };
  globalThis.document = { getElementById: id => (id === 'game' ? canvas : hud[id]) };
  globalThis.window = {
    addEventListener: (type, fn) => { handlers.window[type] = fn; }
  };
  globalThis.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: () => null, setItem: () => {} }, configurable: true
  });
  console.error = () => {};

  const renderStubHref = 'data:text/javascript,' + encodeURIComponent([
    'export function createScene() {',
    '  return {',
    '    render(view) {',
    '      globalThis.__shellTestViews.push(view);',
    '    }',
    '  };',
    '}'
  ].join('\n'));

  const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;
  const src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from '${renderStubHref}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${fileHref('game.js')}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${fileHref('rope.js')}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`);

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//boot ${++bootCount}`));

  const restore = () => {
    globalThis.document = saved.document;
    globalThis.window = saved.window;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    if (saved.localStorage) {
      Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
    } else {
      delete globalThis.localStorage;
    }
    console.error = saved.consoleError;
  };
  return { frames, handlers, hud, views, restore };
}

function tick(env, st) {
  st.t += 50;
  env.frames.at(-1)(st.t);
}

function press(env) {
  env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
}

function release(env) {
  env.handlers.window.keyup({ code: 'Space' });
}

// Drives frames ~50 ms apart on the caller-owned clock state and jump-holds
// when grounded with rope.phase in [0.20, 0.28): the lead-in plus these
// ~0-hold (vy ≈ 350) jumps clear every cycle — physics is deterministic under
// the fixed STEP, and the shell's real Math.random rng feeds only the offer
// draw. The SAME st must keep driving later ticks: the shell accumulates
// (now - last), so a restarted clock would run the loop backwards. Throws
// loudly if 'choose' never lands (frame budget ≈ 125 s of simulation).
function driveToChoose(env) {
  const st = { t: performance.now(), budget: 0 };
  press(env); // leave 'idle' on the first consumed frame
  tick(env, st);
  while (true) {
    if (++st.budget > 1200) {
      throw new Error('pickflow harness: "choose" never landed within the frame budget — the scripted jumper failed to reach the cadence freeze');
    }
    const view = env.views.at(-1);
    if (view.run.status === 'choose') return { view, st };
    assert.notEqual(view.run.status, 'over',
      'pickflow harness: the scripted jumper tripped before the cadence freeze');
    if (view.run.status === 'running' && view.player.grounded
        && view.rope.phase >= 0.2 && view.rope.phase < 0.28) {
      press(env);
      tick(env, st);
      release(env);
      tick(env, st);
    } else {
      tick(env, st);
    }
  }
}

function promptLines(env) {
  return env.hud['hud-prompt'].textContent.split('\n');
}

function cursorIndex(env) {
  return promptLines(env).findIndex(l => l.startsWith('> '));
}

// ~0.45 s of pumped frames ≈ the 0.1-hold lead-in jump still airborne.
const EXPECT_EFFECT = {
  float: ['floatMul', 1.15],
  slowrope: ['ropeMul', 0.9],
  multi: ['scoreMul', 2],
  window: ['windowMul', 1.1]
};

test('choose renders one offer line per card: cursor, icon, name, cap readout', async () => {
  const env = await bootShell();
  try {
    const { view: v } = driveToChoose(env);
    assert.equal(v.run.status, 'choose');
    assert.equal(v.run.offer.length, 2);
    const lines = promptLines(env);
    assert.equal(lines.length, 2, 'one offer line per offered card');
    assert.equal(lines.filter(l => l.startsWith('> ')).length, 1, 'exactly one cursor');
    assert.equal(cursorIndex(env), 0, 'the cursor is visible before any press');
    v.run.offer.forEach((card, i) => {
      assert.ok(lines[i].includes(card.icon), `line ${i} shows the card icon`);
      assert.ok(lines[i].includes(card.name), `line ${i} shows the card name`);
      assert.match(lines[i], /×\d+\/\d+/, `line ${i} carries the ×owned/cap readout (CARD-04)`);
    });
    assert.equal(env.hud['hud-owned'].textContent, '', 'nothing owned yet: strip is empty');
  } finally {
    env.restore();
  }
});

test('press cycles the cursor and wraps past the last offer (D-02)', async () => {
  const env = await bootShell();
  try {
    const { view: v, st } = driveToChoose(env);
    const n = v.run.offer.length;
    const visited = new Set([cursorIndex(env)]);
    press(env);
    tick(env, st);
    release(env);
    tick(env, st); // early release: cancels the hold, the cursor stays
    visited.add(cursorIndex(env));
    assert.equal(cursorIndex(env), 1 % n, 'one press-release advances the cursor');
    for (let k = 1; k < n; k++) {
      press(env);
      tick(env, st);
      release(env);
      tick(env, st);
      visited.add(cursorIndex(env));
    }
    assert.equal(cursorIndex(env), 0, 'cycling offer.length presses wraps back to the first offer');
    assert.deepEqual([...visited].sort(), [...Array(n).keys()], 'every offer index was reachable (plural-selection invariant, length-2 leg)');
  } finally {
    env.restore();
  }
});

test('hold confirms once while held; release and lock never charge a jump (D-03/D-05/D-07)', async () => {
  const env = await bootShell();
  try {
    const { view: v, st } = driveToChoose(env);
    press(env); // one cycle: cursor -> offer[1], which the hold then confirms
    tick(env, st);
    const picked = v.run.offer[1];
    const lines = promptLines(env);
    assert.ok(lines[1].includes('['), 'the fill cue rides the active line while holding');
    assert.ok(!lines[0].includes('['), 'the fill cue stays off the inactive lines');
    let guard = 0;
    while (env.views.at(-1).run.status === 'choose') {
      if (++guard > 120) assert.fail('the hold never confirmed within ~3 s of real pumping');
      await new Promise(r => setTimeout(r, 25));
      tick(env, st);
    }
    const done = env.views.at(-1);
    // Confirm fired WHILE STILL HELD, exactly once.
    assert.equal(done.run.status, 'running');
    assert.equal(done.run.owned[picked.id], 1, 'owned count landed before any later input');
    const [field, want] = EXPECT_EFFECT[picked.id];
    assert.ok(Math.abs(done.run.effects[field] - want) < 1e-9, 'the effect applied instantly');
    // D-06: re-entry through the shared lead-in.
    assert.ok(done.rope.phase >= 0.33 && done.rope.phase < 0.5, 'rope back to the lead-in phase');
    assert.equal(done.player.grounded, false, 'lead-in jump airborne');
    // D-05: a single uppercase flash line replaces the offer list.
    assert.equal(env.hud['hud-prompt'].textContent, picked.name.toUpperCase());
    const vys = [done.player.vy];
    release(env);
    tick(env, st);
    vys.push(env.views.at(-1).player.vy);
    tick(env, st);
    vys.push(env.views.at(-1).player.vy);
    // The lead-in launch velocity is 400; a >0.8 s release-charge would set
    // jumpVelocity = 600 — the ceiling below proves no release ever charged.
    assert.ok(vys.every(vy => vy <= 400), 'the confirm-release never re-launched the player');
    for (let i = 1; i < vys.length; i++) {
      assert.ok(vys[i] < vys[i - 1], 'vy keeps decaying under gravity — no release-charged jump (Pitfall 4)');
    }
    assert.ok(!env.hud['hud-prompt'].textContent.includes('> '), 'the prompt no longer lists offers');
    assert.equal(env.views.at(-1).run.owned[picked.id], 1, 'confirm fired exactly once');
    // CARD-06: the owned icon strip reflects run.owned during the run.
    assert.ok(env.hud['hud-owned'].textContent.includes(picked.icon), 'icon strip shows the picked card');
  } finally {
    env.restore();
  }
});

test('reachability invariant on a three-card offer shape (assumption-delta)', async () => {
  const { CARDS, pickOffers } = await import(pathToFileURL(resolve(jsDir, 'upgrades.js')).href);
  const { createRun, applyCard, resumeRun, startRun } = await import(pathToFileURL(resolve(jsDir, 'game.js')).href);
  let i = 0;
  const values = [0.5, 0.2, 0.9, 0.7, 0.4, 0.1];
  const offers = pickOffers(CARDS, {}, 3, () => values[i++ % values.length]);
  assert.equal(offers.length, 3);
  assert.equal(new Set(offers.map(c => c.id)).size, 3, 'weighted draws are distinct without replacement');
  const visited = new Set();
  let idx = 0;
  for (let press = 1; press <= 3; press++) {
    idx = (idx + 1) % offers.length; // the shell's cycling expression
    visited.add(idx);
    const picked = offers[idx];
    const applied = applyCard({ ...createRun(), status: 'choose', offer: offers }, picked);
    assert.equal(applied.owned[picked.id], 1, `index ${idx} is confirmable`);
    const resumed = resumeRun(applied);
    assert.equal(resumed.run.status, 'running');
    assert.equal(resumed.rope.phase, startRun().rope.phase, 'resumeRun shares the one lead-in path (ARCH-02)');
  }
  assert.deepEqual([...visited].sort(), [0, 1, 2], 'every index visited on a length-3 offer');
});

test('exhausted pool skips the freeze; a one-card pool still offers one line', async () => {
  const { CARDS, pickOffers, isAvailable } = await import(pathToFileURL(resolve(jsDir, 'upgrades.js')).href);
  const { createRun, tickRun } = await import(pathToFileURL(resolve(jsDir, 'game.js')).href);
  const capped = Object.fromEntries(CARDS.map(c => [c.id, c.cap]));
  // CARD-05: no dead picks — a capped-out card never appears in an offer.
  assert.deepEqual(pickOffers(CARDS, capped, 2, () => 0.5), [], 'all capped: empty offer pool');
  const oneLeft = { ...capped, [CARDS[0].id]: 0 };
  assert.deepEqual(pickOffers(CARDS, oneLeft, 2, () => 0.5).map(c => c.id), [CARDS[0].id],
    'one available card: a one-line pickable offer, never a repeat');
  assert.equal(isAvailable(CARDS[0], oneLeft), true);
  assert.equal(isAvailable(CARDS[1], oneLeft), false);
  // Pitfall 6: tickRun never sets choose with an empty offer.
  const run = { ...createRun(), skips: 9, owned: capped };
  const rope = { phase: 0.44, period: 0.9 };
  const player = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
  const out = tickRun(run, rope, player, 1 / 60, () => 0.5);
  assert.equal(out.run.skips, 10, 'the skip still scores');
  assert.equal(out.run.status, 'running', 'a capped-out pool never freezes the run in choose');
  assert.equal(out.run.offer, null);
});
