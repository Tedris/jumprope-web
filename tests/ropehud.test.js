import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MIN_ROPES, MAX_ROPES } from '../js/game.js';

// Story 1.3: the rope-count pip row on the HUD, exercised over the REAL
// js/shell.js booted through the shell.test.js data-URL harness pattern.
// Two deltas from that harness: the hud map gains a 'hud-ropes' span stub
// whose replaceChildren records the pip children, and the './game.js'
// specifier points at a wrapper that forwards everything real but scripts
// run.ropes into every tickRun call — so counts are controllable while all
// sim behavior stays real. No relative js/ specifier besides the pure
// game.js import below, keeping the boundary.test.js walk green.

const testsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testsDir, '..');
const jsDir = resolve(projectRoot, 'js');

let bootCount = 0;

async function bootRopeHudShell({ frozenHud = false } = {}) {
  const frames = [];
  const handlers = { window: {}, canvas: {} };
  const hud = {
    'hud-score': { textContent: '' },
    'hud-best': { textContent: '' },
    'hud-prompt': { textContent: '' },
    'hud-owned': { textContent: '' }
  };
  if (!frozenHud) {
    hud['hud-ropes'] = {
      textContent: '',
      kids: undefined,
      calls: 0,
      replaceChildren(...kids) { this.calls += 1; this.kids = kids; }
    };
  }
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    addEventListener: (type, fn) => { handlers.canvas[type] = fn; }
  };
  const errors = [];
  const views = [];
  globalThis.__shellTestViews = views;

  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    consoleError: console.error
  };
  globalThis.document = {
    hidden: false,
    getElementById: id => (id === 'game' ? canvas : hud[id]),
    createElement: tag => ({ tag, className: '', textContent: '' })
  };
  globalThis.window = {
    addEventListener: (type, fn) => { handlers.window[type] = fn; }
  };
  globalThis.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: () => null, setItem: () => {} }, configurable: true
  });
  console.error = (...args) => { errors.push(args); };

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
  // Wrapper over the REAL game.js: everything forwards unchanged except
  // tickRun, which scripts run.ropes ({ ropes: n } to set, { drop: true } to
  // remove the field) before delegating to the real transition.
  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    'export * from "' + fileHref('game.js') + '";',
    'import { tickRun as realTickRun } from "' + fileHref('game.js') + '";',
    'export const tickRun = (run, ...rest) => {',
    '  const s = globalThis.__ropehudScript;',
    '  let base = run;',
    '  if (s) {',
    '    base = { ...run };',
    '    if (s.drop) delete base.ropes;',
    '    else base.ropes = s.ropes;',
    '  }',
    '  return realTickRun(base, ...rest);',
    '};',
  ].join('\n'));

  const src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from '${renderStubHref}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${gameWrapHref}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${fileHref('rope.js')}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`);

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//ropehud-boot ${++bootCount}`));

  const restore = () => {
    delete globalThis.__ropehudScript;
    delete globalThis.__shellTestViews;
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
  return { frames, handlers, hud, errors, views, document: globalThis.document, restore };
}

// ---------- pumping helpers (shell.test.js / polish.test.js idiom) ----------

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

function keydown(env, code) {
  env.handlers.window.keydown({ code, repeat: false, preventDefault() {} });
}

function startRunning(env, st) {
  press(env);
  tick(env, st);
  assert.ok(env.views.length > 0, 'the shell rendered at least one frame');
  assert.equal(env.views.at(-1).run.status, 'running', 'the opening Space tap started the run');
}

// ---------- pip assertions ----------

function assertPips(env, held, ghosts, label) {
  const kids = env.hud['hud-ropes'].kids;
  assert.ok(Array.isArray(kids), `${label}: the pip row must be built`);
  assert.equal(kids.length, held + ghosts, `${label}: pip count`);
  kids.forEach((pip, i) => {
    const solid = i < held;
    assert.equal(pip.className, solid ? 'pip-held' : 'pip-ghost',
      `pip ${i} must be ${solid ? 'a solid' : 'a ghost'} (fill order holds/ghosts)`);
    assert.equal(pip.textContent, solid ? '\u2588' : '\u2592', `pip ${i} glyph`);
  });
}

// ---------- contract legs (AC 3) ----------

test('contract: #hud-ropes lives inside #hud between hud-best and hud-prompt, with DESIGN.md pip colors', async () => {
  const html = await readFile(resolve(projectRoot, 'index.html'), 'utf8');
  const css = await readFile(resolve(projectRoot, 'css', 'style.css'), 'utf8');
  const hudStart = html.indexOf('<div id="hud"');
  const hudEnd = html.indexOf('</div>', hudStart);
  assert.ok(hudStart >= 0 && hudEnd > hudStart, 'the #hud block must exist');
  const block = html.slice(hudStart, hudEnd);
  const best = block.indexOf('id="hud-best"');
  const ropes = block.indexOf('id="hud-ropes"');
  const prompt = block.indexOf('id="hud-prompt"');
  assert.ok(best >= 0 && ropes >= 0 && prompt >= 0, 'hud-ropes must sit inside #hud');
  assert.ok(best < ropes && ropes < prompt, 'document order: best -> ropes -> prompt');
  assert.match(css, /#hud-ropes\s*\{/, 'the pip row has its own HUD slot rule');
  assert.match(css, /\.pip-held\s*\{[^}]*#f4f0d8/i, 'pip-held carries the DESIGN.md rope token');
  assert.match(css, /\.pip-ghost\s*\{[^}]*#4d4a3e/i, 'pip-ghost carries the DESIGN.md ropeLost token');
});

// ---------- render legs (AC 1) ----------

test('held counts 1..MAX_ROPES draw that many solid pips, ghosts zero on a fresh run', async () => {
  for (let held = MIN_ROPES; held <= MAX_ROPES; held += 1) {
    globalThis.__ropehudScript = { ropes: held };
    const env = await bootRopeHudShell();
    try {
      const st = { t: performance.now() };
      startRunning(env, st);
      assertPips(env, held, 0, `held ${held} on a fresh run`);
    } finally {
      env.restore();
    }
  }
});

test('clamp-as-displayed: out-of-range counts render through clampRopes, never raw', async () => {
  // Expectations derive from the FR1 exports, not a hardcoded table:
  // Infinity-arm -> MAX_ROPES; NaN/nullish/out-of-range arms -> MIN_ROPES.
  const cases = [
    [{ ropes: MAX_ROPES + 4 }, MAX_ROPES, 'too many clamps down to MAX'],
    [{ ropes: 0 }, MIN_ROPES, 'zero clamps up to MIN'],
    [{ ropes: NaN }, MIN_ROPES, 'NaN falls to MIN'],
    [{ drop: true }, MIN_ROPES, 'field-absent falls to MIN'],
  ];
  for (const [script, expected, label] of cases) {
    globalThis.__ropehudScript = script;
    const env = await bootRopeHudShell();
    try {
      const st = { t: performance.now() };
      startRunning(env, st);
      assertPips(env, expected, 0, label);
    } finally {
      env.restore();
    }
  }
});

// ---------- ghosts + same-frame-batch (AC 2) ----------

test('count change lands in the same frame batch: 3 -> 2 renders 2 solids + 1 ghost, ghosts never shrink', async () => {
  globalThis.__ropehudScript = { ropes: 3 };
  const env = await bootRopeHudShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    assertPips(env, 3, 0, 'fresh run at 3 ropes');
    assert.equal(env.hud['hud-ropes'].calls, 1, 'first draw builds the row once');
    tick(env, st);
    assert.equal(env.hud['hud-ropes'].calls, 1, 'signature-unchanged frames must not rebuild the row');

    globalThis.__ropehudScript = { ropes: 2 };
    tick(env, st);
    assertPips(env, 2, 1, 'the strip frame shows the loss immediately');

    globalThis.__ropehudScript = { ropes: 1 };
    tick(env, st);
    assertPips(env, 1, 2, 'ever-max keeps the row width: ghosts grow, never shrink');
  } finally {
    env.restore();
  }
});

// ---------- restart reset (permadeath-clean row) ----------

test('restart through over resets the row: no ghost memory survives a new run', async () => {
  globalThis.__ropehudScript = { ropes: 3 };
  const env = await bootRopeHudShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    assertPips(env, 3, 0, 'ever-max grows to 3');

    globalThis.__ropehudScript = { ropes: 1 };
    for (let i = 0; i < 200 && env.views.at(-1).run.status === 'running'; i++) tick(env, st);
    assert.equal(env.views.at(-1).run.status, 'over', 'the last-rope trip ends the run');
    assertPips(env, 1, 2, 'the dead run keeps its ghost row');

    press(env);
    release(env);
    // The trip's juice freeze holds the drain gate for ~80ms; pump past it.
    for (let i = 0; i < 5 && env.views.at(-1).run.status === 'over'; i++) tick(env, st);
    assert.equal(env.views.at(-1).run.status, 'running', 'the release restarted the run');
    assertPips(env, 1, 0, 'the new run starts with a single solid pip');
  } finally {
    env.restore();
  }
});

// ---------- null-guard belt (frozen harness shape) ----------

test('boot with the frozen 4-span hud map: no hud-ropes element, zero errors', async () => {
  globalThis.__ropehudScript = { ropes: 2 };
  const env = await bootRopeHudShell({ frozenHud: true });
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    for (let i = 0; i < 8; i++) tick(env, st);
    assert.equal(env.frames.length, 10, 'the rAF loop keeps re-arming');
    assert.deepEqual(env.errors, [], 'the missing span must never throw');
  } finally {
    env.restore();
  }
});

// ---------- pause / hidden-tab hygiene (AC 4) ----------

test('P pause and tab-hide keep working with pips live: prompt paths untouched, zero errors', async () => {
  globalThis.__ropehudScript = { ropes: 3 };
  const env = await bootRopeHudShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    assertPips(env, 3, 0, 'pips live before the pause');

    keydown(env, 'KeyP');
    tick(env, st);
    assert.match(env.hud['hud-prompt'].textContent, /paused — press P to resume/);
    assertPips(env, 3, 0, 'the freeze frame keeps drawing the row');
    keydown(env, 'KeyP');
    tick(env, st);

    env.document.hidden = true;
    env.handlers.window.visibilitychange();
    tick(env, st);
    assert.match(env.hud['hud-prompt'].textContent, /paused — press P to resume/);
    env.document.hidden = false;
    env.handlers.window.visibilitychange();
    tick(env, st);
    assert.equal(env.views.at(-1).run.status, 'running', 'tab-return auto-resumed');
    assert.deepEqual(env.errors, [], 'pause/visibility legs must not touch the pip path');
  } finally {
    env.restore();
  }
});
