import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Story 5.7 (FR30/FR27/FR22/FR24/NFR6/NFR7): the pause menu — the audio config
// surface. Product delta: js/shell.js (setupMenu factory + the ONE bumpVolume
// handler) + css/style.css (five static rules). The menu is a VIEW of the
// shipped audio settings (D3): it stores nothing, mirrors nothing; every write
// routes audio.setVolume/toggleMute through the existing write-through path.
//
// Frozen suites are DONORS, never imports (fork-hygiene doctrine, ledger :173;
// this is boot fork #5, counted for the tests/support/shell-harness.js chore):
//   bootLifecycleShell — tests/audiolifecycle.test.js:351-460: the audio-
//     resolving boot (dynamic-specifier rewrite to a wrapper over the REAL
//     js/audio.js + storageMap + document.hidden + the settle() dance). Its
//     DOM is a fixed 4-key textContent map — no createElement — hence ⊕
//   mk()/fire() DOM stub — tests/pickerhud.test.js:43-64 (appendChild/
//     replaceChildren/addEventListener/fire, dom-gated documentStub) and its
//     virtual performance clock (:93/:137-142 — the D-07 lead-in becomes
//     frame-countable, so no leg sleeps), plus the ONE missing line: the
//     insertBefore arm from tests/ceilingmarker.test.js:37 (the markerEl probe
//     shell.js:103 must fall through cleanly on a seeded #hud).
// No existing fork resolves './audio.js' AND stubs createElement (Context §4,
// verified by grep at authoring) — a fifth fork is required and sanctioned.
//
// Legs: L1 AC1 init-from-persistence, both pause entries (one boot).
//       L2 AC2 seams + storage-key census (boot 2 — the ONLY second boot).
//       L3 AC3 input-lock battery, both entries + the idle/over boot shapes.
//       L4 AC4 keyboard/click/persisted sync triangle, one readout, zero drift.
//       L5 AC5 source fences, the CSS/HTML contract, and the bootless factory
//          reuse leg (source-slice new Function — the census-regex family).
// Boots: EXACTLY 2 suite-wide (NFR4). The shape leg is bootless by design.
//
// Mutation battery (story Task 4a; run on a /tmp clone, one mutant alone;
// results table in the story Debug Log):
//   M1 Resume node gains the cards' pointerup→release wiring
//      -> L3(a) delayed-release window red (phantom jump; L3-class ONLY)
//   M2 menu keeps a local vol mirror updated on button click only
//      -> L4 keyboard-sync arm red (readout drifts from getVolume())
//   M3 visible: () => paused || run.status === 'idle'
//      -> L3(d)/L1 boot-shape red (menu chrome at idle = the run-start hole)
//   M4 onVolume also localStorage.setItem('jumprope-menu', ...)
//      -> L2 storage-key census red (second persistence path)
//   M5 .hud-menu gains transition: opacity .2s
//      -> L5 CSS-fence red (the static-CSS law at css/style.css:96-98)
//   M6 an Enter-resumes binding joins the keydown handler
//      -> L5 key-code census red (D5: zero new bindings)

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const rootDir = resolve(testsDir, '..');

let bootCount = 0;
const settle = () => new Promise(r => setTimeout(r, 0));

// ---------- harness: bootMenuShell (fork #5 — see the donor map above) ----------

async function bootMenuShell({ storageMap, dom = true } = {}) {
  const frames = [];
  const handlers = { window: {}, canvas: {} };
  const created = [];
  const mk = tag => {
    const el = {
      tag, children: [], listeners: {}, style: {}, textContent: '', _cn: '',
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
  const hudEls = {
    'hud-score': mk('span'), 'hud-best': mk('span'),
    'hud-prompt': mk('span'), 'hud-owned': mk('span'),
  };
  const canvas = {
    width: 0, height: 0, style: {},
    addEventListener: (type, fn) => { handlers.canvas[type] = fn; },
  };
  const hudRoot = mk('div');
  if (dom) hudEls['hud-ropes'] = mk('span');
  // Seed index.html's real #hud children (ceilingmarker:64-67) so the marker's
  // insertBefore slot resolves by identity and the menu's trailing append is
  // observable as ONE new last child.
  for (const el of [hudEls['hud-score'], hudEls['hud-best'], hudEls['hud-ropes'],
    hudEls['hud-prompt'], hudEls['hud-owned']]) if (el) hudRoot.appendChild(el);
  const documentStub = dom
    ? {
        hidden: false,
        createElement: mk,
        getElementById: id => (id === 'game' ? canvas : id === 'hud' ? hudRoot : hudEls[id]),
      }
    : { hidden: false, getElementById: id => (id === 'game' ? canvas : hudEls[id]) };

  const map = storageMap ?? new Map();
  const storageStub = {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); },
  };
  const clock = { t: 0 };
  const views = [];
  const viewsKey = '__pausemenuViews#' + (bootCount + 1); // per-boot key: a later boot's restore() must never blind an earlier live boot
  globalThis[viewsKey] = views;
  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    fetch: globalThis.fetch,
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    performance: Object.getOwnPropertyDescriptor(globalThis, 'performance'),
    consoleError: console.error,
    audio: globalThis.__menuAudio,
    voices: globalThis.__menuVoices,
  };
  globalThis.document = documentStub;
  globalThis.window = { addEventListener: (type, fn) => { handlers.window[type] = fn; } };
  globalThis.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', { value: storageStub, configurable: true });
  globalThis.performance = { now: () => clock.t }; // pickerhud:93 virtual clock
  globalThis.fetch = () => Promise.reject(new Error('no track in the sandbox'));
  console.error = () => {};

  const renderStubHref = 'data:text/javascript,' + encodeURIComponent([
    'export function createScene() {',
    '  return { render(view) { globalThis["' + viewsKey + '"].push(view); } };',
    '}',
  ].join('\n'));
  const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;
  // Wrapper over the REAL js/audio.js (bootLifecycleShell:419-434 shape) —
  // the stash lets the legs read getVolume()/isMuted() as the LIVE source of
  // truth, and the voice log is the launch WITNESS: shell.js:384 fires
  // handleEvent('jump') on exactly the grounded->airborne launches the AC3
  // lock forbids, while resumeRun's canonical lead-in hop (game.js:96-100,
  // a CONSTRUCTED airborne state) emits nothing. With jumpVelocity(hold) =
  // 350+500*hold, lead-in 0.1s -> 400, a 50ms mutant jump -> 375: vy alone
  // cannot distinguish them — the voice channel can, and it is physics-free.
  const audioWrapHref = 'data:text/javascript,' + encodeURIComponent([
    'import * as real from "' + fileHref('audio.js') + '";',
    'export function createAudio(opts) {',
    '  const a = real.createAudio(opts);',
    '  const voices = [];',
    '  const w = Object.assign({}, a, {',
    '    handleEvent(name) { voices.push(name); return a.handleEvent(name); },',
    '  });',
    '  globalThis.__menuAudio = w;',
    '  globalThis.__menuVoices = voices;',
    '  return w;',
    '}',
    'export const loadSettings = real.loadSettings;',
    'export const saveSettings = real.saveSettings;',
  ].join('\n'));
  // Offer-stripping tickRun wrapper (the pickerhud __phScript inverse, :98-110
  // family): the ~300-frame lock battery would otherwise freeze into the 10th-
  // skip choose status mid-walk — the offer flow is Story 3.x's domain, not
  // this AC's, and a choose freeze would silently end every resume window.
  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `export * from "${fileHref('game.js')}";`,
    'import * as real from "' + fileHref('game.js') + '";',
    'export const tickRun = (...a) => {',
    '  const o = real.tickRun(...a);',
    '  return o.run.status === "choose"',
    '    ? { ...o, run: { ...o.run, status: "running", offer: null } } : o;',
    '};',
  ].join('\n'));

  const src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from '${renderStubHref}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${gameWrapHref}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${fileHref('rope.js')}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`)
    .replace(/import\(\s*['"]\.\/audio\.js['"]\s*\)/, `import('${audioWrapHref}')`);

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//pausemenu-boot ${++bootCount}`));
  await settle(); // the shell's dynamic audio import lands one microtask later

  const wrap = hudRoot.children.find(el => el.className.startsWith('hud-menu'));
  assert.ok(wrap, 'the boot built the .hud-menu node under #hud (D1 trailing append)');
  const row = wrap.children[1];
  const env = {
    frames, handlers, hud: hudEls, canvas, hudRoot, created, views, map, clock, document: documentStub,
    get voices() { return globalThis.__menuVoices ?? []; },
    menu: {
      wrap, resume: wrap.children[0], row, mute: wrap.children[2],
      down: row.children[0], read: row.children[1], up: row.children[2],
    },
    st: { t: 0 },
    audio: () => globalThis.__menuAudio,
    restore() {
      globalThis.document = saved.document;
      globalThis.window = saved.window;
      globalThis.requestAnimationFrame = saved.requestAnimationFrame;
      globalThis.fetch = saved.fetch;
      if (saved.localStorage) Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
      else delete globalThis.localStorage;
      if (saved.performance) Object.defineProperty(globalThis, 'performance', saved.performance);
      else delete globalThis.performance;
      console.error = saved.consoleError;
      if (saved.audio === undefined) delete globalThis.__menuAudio;
      else globalThis.__menuAudio = saved.audio;
      if (saved.voices === undefined) delete globalThis.__menuVoices;
      else globalThis.__menuVoices = saved.voices;
      delete globalThis[viewsKey];
    },
  };
  return env;
}

// ---------- pumps (the shared tick idiom, audiolifecycle:462-465 donor) ----------

function tick(env, st) {
  st.t += 50;
  env.clock.t = st.t; // the virtual performance clock rides the pumped scalar (pickerhud:137)
  env.frames.at(-1)(st.t);
}

const view = env => env.views.at(-1);
const keydown = (env, code) =>
  env.handlers.window.keydown({ code, repeat: false, preventDefault() {} });
const keyup = (env, code) => env.handlers.window.keyup({ code, repeat: false });
const press = env => keydown(env, 'Space');
const release = env => keyup(env, 'Space');
const click = el => el.fire('pointerdown', { preventDefault() {} });

// Scripted jumper (audiolifecycle:484-499): jump-holds when grounded with the
// rope in [0.20, 0.28). Throws loudly on trip — the lock legs need a LIVE run.
function pumpRunning(env, st, frames) {
  for (let i = 0; i < frames; i++) {
    if (env.views.length === 0) { tick(env, st); continue; }
    const v = view(env);
    assert.notEqual(v.run.status, 'over', 'lock battery: the scripted jumper tripped');
    if (v.run.status === 'running' && v.player.grounded
        && v.rope.phase >= 0.2 && v.rope.phase < 0.28) {
      press(env);
      tick(env, st);
      release(env);
      tick(env, st);
    } else {
      tick(env, st);
    }
  }
}

function startRunning(env) {
  press(env);
  tick(env, env.st);
  pumpRunning(env, env.st, 20);
  assert.equal(view(env).run.status, 'running', 'the boot reached running');
  return env.st;
}

// Bring the boot to a SAFE PAUSE POINT: grounded, vy 0, rope phase >= 0.35.
// The grounded interval always runs [landing, next jump-window), so this
// lands 0.35..~0.6 — the resume windows then stay INSIDE one revolution, and
// the D-07-swallowed first ~10 frames can never meet the rope at the feet (a
// leg that died of a rope-hit would prove nothing about the input lock).
function pumpSafePoint(env, st) {
  for (let i = 0; i < 400; i++) {
    const v = view(env);
    if (v.run.status === 'running' && v.player.grounded && v.player.vy === 0
        && v.rope.phase >= 0.35) return;
    assert.notEqual(v.run.status, 'over', 'safe-point pump tripped');
    const vv = view(env);
    if (vv.run.status === 'running' && vv.player.grounded
        && vv.rope.phase >= 0.2 && vv.rope.phase < 0.28) {
      press(env);
      tick(env, st);
      release(env);
      tick(env, st);
    } else {
      tick(env, st);
    }
  }
  assert.fail('never reached a grounded phase>=0.35 pause point');
}

const pauseKey = env => keydown(env, 'KeyP');
const pauseVis = env => { env.document.hidden = true; env.handlers.window.visibilitychange(); };
const resumeClick = (env, st) => { click(env.menu.resume); tick(env, st); };

const menuCls = env => env.menu.wrap.className;
const assertHidden = (env, why) =>
  assert.equal(menuCls(env), 'hud-menu hidden', `menu hidden: ${why}`);
const assertShown = (env, why) =>
  assert.equal(menuCls(env), 'hud-menu', `menu visible: ${why}`);

function assertFrozen(env, st, n, why) {
  const p0 = view(env).rope.phase;
  for (let i = 0; i < n; i++) {
    tick(env, st);
    assert.equal(view(env).rope.phase, p0, `sim frozen behind the menu: ${why} (frame ${i})`);
  }
}

// The launch witness: 'jump' on the voice channel fires EXACTLY at the
// shell's grounded->airborne launches (shell.js:384). resumeRun's lead-in hop
// is a CONSTRUCTED airborne state and emits nothing, so a zero-delta window
// means "no input-driven launch" — the AC3 clause stated in an observable
// that survives the hop (vy cannot: jumpVelocity 0.1s=400 vs a phantom's
// 375..425; vy>0 alone is the shipped lead-in, vy>0 EARLY is the hole).
const jumpVoices = env => env.voices.filter(n => n === 'jump').length;

function assertNoLaunch(env, st, n, why) {
  const j0 = jumpVoices(env);
  for (let i = 0; i < n; i++) {
    tick(env, st);
    assert.equal(jumpVoices(env), j0, `zero launches: ${why} (frame ${i})`);
  }
}

function assertLaunch(env, st, within, why) {
  const j0 = jumpVoices(env);
  for (let i = 0; i < within; i++) {
    tick(env, st);
    if (jumpVoices(env) > j0) {
      assert.ok(view(env).player.vy > 0, `${why}: the launch rides a positive vy`);
      return;
    }
  }
  assert.fail(`${why}: no launch voice within ${within} frames`);
}

// ---------- L1: AC1 — init from persisted settings, both pause entries ----------

let env1 = null;

test('L1 menu presents Resume + volume + mute, initialized from the PRE-SEEDED persisted settings, at BOTH pause entries (AC1, FR27)', async () => {
  env1 = await bootMenuShell({ storageMap: new Map([['jumprope-audio', '{"muted":true,"volume":0.4}']]) });
  const env = env1;
  const st = env.st;
  tick(env, st); // frame 1: updateHud renders the menu once (hidden at idle)
  assertHidden(env, 'idle boot — the menu is pause-only chrome');

  // Additive-layer shape: ONE trailing child on #hud, the DESIGN slot order
  // untouched (marker between the pips and the owned line, ceilingmarker:343).
  const kids = env.hudRoot.children;
  const ropesIdx = kids.indexOf(env.hud['hud-ropes']); // identity, not class: the static spans are classless
  const ownedIdx = kids.indexOf(env.hud['hud-owned']);
  const markerIdx = kids.findIndex(el => el.className === 'hud-marker');
  assert.ok(ropesIdx < markerIdx, 'marker sits AFTER the pips');
  assert.ok(markerIdx < ownedIdx, 'marker sits BEFORE the owned line');
  assert.ok(kids.at(-1).className.startsWith('hud-menu'), 'the menu is the ONE trailing append');

  startRunning(env);
  tick(env, st);
  assertHidden(env, 'mid-run — pause chrome only exists behind the freeze frame');

  // Entry 1: the P key.
  pauseKey(env);
  tick(env, st);
  assertShown(env, 'P-pause opened the menu');
  assert.equal(env.menu.resume.textContent, 'Resume', 'the Resume node is present (FR30)');
  assert.equal(env.menu.read.textContent, 'volume 40%',
    'readout DERIVES from the pre-seeded persisted volume through the real audio loadSettings');
  assert.equal(env.menu.mute.textContent, 'Sound muted',
    'mute label derives from the pre-seeded persisted muted=true');
  assert.match(env.hud['hud-prompt'].textContent, /paused — press P to resume/,
    'the shipped prompt stays byte-identical — the menu is ADDITIVE chrome');
  assert.equal(env.audio().getVolume(), 0.4, 'the live seam reads the seeded 0.4 (one source of truth)');
  pauseKey(env);
  tick(env, st);
  assertHidden(env, 'P-resume hid the menu again');

  // Entry 2: the tab-hide visibility path (D8 — the SAME node, same paused flag).
  const menuNode = env.menu.wrap;
  pauseVis(env);
  tick(env, st);
  assertShown(env, 'visibility-pause opened the SAME menu node');
  assert.equal(env.menu.wrap, menuNode, 'one node for both entries — nothing was rebuilt');
  assert.equal(env.menu.read.textContent, 'volume 40%', 'readout identical at the second entry');
  resumeClick(env, st); // resume FROM the menu, via the Resume button itself
  assertHidden(env, 'the Resume click closed the menu');
  env.document.hidden = false; // leave the tab "shown" without firing the event (no auto-resume surprise)
  tick(env, st);
  assert.equal(view(env).run.status, 'running', 'the click-resumed run is live for the L3 battery');
});


// ---------- L3: AC3 — the input lock holds BEHIND the menu, both entries ----------

test('L3 freeze-frame input lock behind the menu, run TWICE (P- and visibility-entry): Space/canvas inert, held-across-pause press stays dead, the Resume click is pointerdown-only, control clicks never resume, idle/over shapes clean (AC3, FR22 — kills M1, M3)', async () => {
  const env = env1;
  assert.ok(env, 'L1 booted the shared battery env');
  const st = env.st;

  for (const [name, enter, exit] of [
    ['P-entry', env => pauseKey(env), null],
    ['visibility-entry', env => pauseVis(env), env => { env.document.hidden = false; }],
  ]) {
    // (a) Space keydown+keyup behind the menu must never charge a jump — and
    // the Resume CLICK is pointerdown-ONLY (D6): the hostile slow click, a
    // pointerup landing after the lead-in while a fresh Space hold is armed,
    // is EXACTLY the cards-wiring phantom-jump hole (M1 witness window).
    pumpSafePoint(env, st);
    enter(env);
    tick(env, st);
    assertShown(env, `${name}: menu open`);
    keydown(env, 'Space');
    keyup(env, 'Space');
    resumeClick(env, st);
    assertHidden(env, `${name}: the Resume click resumed`);
    assertNoLaunch(env, st, 9, `${name} (a): post-resume lead-in frames stay uncharged`);
    press(env);
    tick(env, st);
    assertNoLaunch(env, st, 1, `${name} (a): a held charge does not jump before release`);
    env.menu.resume.fire('pointerup', {}); // the delayed-release half of a slow click
    assertNoLaunch(env, st, 2, `${name} (a): the delayed pointerup armed NOTHING (D6 — M1 window)`);
    release(env);
    assertLaunch(env, st, 2, `${name} (a): the ONE legitimate jump lands on release — hold model alive`);

    // (b) canvas pointerdown behind the menu: press() early-returns (:205).
    pumpSafePoint(env, st);
    enter(env);
    assertFrozen(env, st, 4, `${name} (b) behind the menu`);
    env.handlers.canvas.pointerdown({}); // the canvas stub registers into handlers.canvas
    resumeClick(env, st);
    assertNoLaunch(env, st, 9, `${name} (b): the canvas tap behind the menu armed nothing`);
    press(env); tick(env, st); release(env);
    assertLaunch(env, st, 2, `${name} (b): the legitimate press path stayed alive`);

    // (c) Space HELD ACROSS pause: enterPause clears pressIntent (:240), the
    // guarded keyup arms nothing (:207) — and no charge may leak out the
    // moment the D-07 lead-in expires.
    pumpSafePoint(env, st);
    keydown(env, 'Space'); // armed while running
    enter(env); // the D-12 clearing
    keyup(env, 'Space'); // guarded while paused
    assertFrozen(env, st, 2, `${name} (c) the held-across-pause freeze`);
    resumeClick(env, st);
    assertNoLaunch(env, st, 10, `${name} (c): the press that straddled pause stayed dead PAST the lead-in`);
    press(env); tick(env, st); release(env);
    assertLaunch(env, st, 2, `${name} (c): a fresh press jumps normally`);

    // (e) control clicks act on settings but NEVER resume: paused stays true,
    // the payload stays frozen between clicks.
    pumpSafePoint(env, st);
    enter(env);
    tick(env, st);
    const p0 = view(env).rope.phase;
    click(env.menu.up); click(env.menu.down); click(env.menu.mute);
    assertFrozen(env, st, 3, `${name} (e) control clicks`);
    assert.equal(view(env).rope.phase, p0, `${name} (e): payload frozen between clicks`);
    assertShown(env, `${name} (e): a volume/mute click does NOT resume`);
    resumeClick(env, st);
    if (exit) exit(env);
  }

  // (d) the menu is pause-only chrome. The idle half of this clause is pinned
  // at L1's boot frame (Space there starts the run exactly as shipped — no
  // run-start hole); the over half completes here.
  for (let i = 0; i < 400 && view(env).run.status !== 'over'; i++) tick(env, st);
  assert.equal(view(env).run.status, 'over', 'the grounded walk eventually trips (over shape reachable)');
  tick(env, st);
  assertHidden(env, 'over status — no menu chrome on the death screen');
  press(env); tick(env, st); release(env); tick(env, st);
  assert.equal(view(env).run.status, 'running', 'Space restarts exactly as shipped behind an invisible menu (M3 clause)');
});

// ---------- L2: AC2 — existing seams only, existing storage path ----------

test('L2 the controls route the shipped seams with write-through to the SINGLE storage key; after the whole walk the map keys deep-equal the shipped set (AC2, FR24 — kills M4)', async () => {
  const env = await bootMenuShell({ storageMap: new Map([['jumprope-audio', '{"muted":false,"volume":0.4}']]) });
  try {
    const st = env.st;
    startRunning(env);
    pauseKey(env);
    tick(env, st);
    assertShown(env, 'boot-2 P-pause');
    click(env.menu.up);
    tick(env, st);
    let saved = JSON.parse(env.map.get('jumprope-audio'));
    assert.equal(saved.volume, 0.4 + 0.1,
      'the + click write-through the existing setVolume path IMMEDIATELY (write-through inside setVolume, audio.js:226; the float-exact law says 0.4+0.1, not 0.5)');
    assert.equal(env.audio().getVolume(), saved.volume, 'the live seam and the persisted JSON agree — one source of truth');
    assert.equal(env.menu.read.textContent, 'volume 50%', 'the readout re-renders in sync with the write (one frame later)');
    click(env.menu.mute);
    tick(env, st);
    saved = JSON.parse(env.map.get('jumprope-audio'));
    assert.equal(saved.muted, true, 'the sound toggle routes audio.toggleMute and persists through saveSettings (audio.js:217-221)');
    assert.equal(env.audio().isMuted(), true, 'the live seam reads the flip');
    assert.equal(env.menu.mute.textContent, 'Sound muted', 'the label re-renders from the seam, never a mirror');
    for (let i = 0; i < 6; i++) keydown(env, 'Minus'); // keyboard-identical clamp (audio.js:224)
    tick(env, st);
    assert.equal(env.audio().getVolume(), 0, 'the floor CLAMPS at 0 (the seam clamps, the step is sign-only — D5)');
    assert.equal(env.menu.read.textContent, 'volume 0%', 'the clamped floor renders too');
    assert.deepEqual([...env.map.keys()], ['jumprope-audio'],
      'mid-walk the map holds ONLY the shipped settings key — the shell gained no setItem of its own');
    resumeClick(env, st);
    for (let i = 0; i < 400 && view(env).run.status !== 'over'; i++) tick(env, st);
    assert.equal(view(env).run.status, 'over', 'the walk ends with a real trip — game.js:318 writes jumprope-best');
    tick(env, st);
    assertHidden(env, 'boot-2 over status');
    assert.deepEqual([...env.map.keys()].sort(), ['jumprope-audio', 'jumprope-best'],
      'the storage-key census: the shipped set EXACTLY (audio.js:7 + game.js:318) — a second persistence path is structurally impossible (kills M4)');
    assert.deepEqual(Object.keys(JSON.parse(env.map.get('jumprope-audio'))).sort(), ['muted', 'volume'],
      'the settings shape stays the shipped {muted, volume} (audio.js:34-43)');
  } finally {
    env.restore();
  }
});

// ---------- L4: AC4 — keyboard shortcuts re-render the menu in sync ----------

test('L4 the menu re-renders in sync with EVERY write path — Minus/Equal/Mute keydowns WHILE PAUSED, button clicks, and the boot load; three write paths, one readout, zero drift (AC4, FR30 — kills M2)', async () => {
  const env = env1;
  assert.ok(env, 'L1 booted the shared env');
  try {
    const st = env.st;
    pumpSafePoint(env, st);
    pauseKey(env);
    tick(env, st);
    const sync = why => {
      tick(env, st);
      assert.equal(env.menu.read.textContent, 'volume ' + Math.round(env.audio().getVolume() * 100) + '%',
        `the readout equals the LIVE seam: ${why}`);
      assert.equal(env.menu.mute.textContent, env.audio().isMuted() ? 'Sound muted' : 'Sound on',
        `the label equals the LIVE seam: ${why}`);
    };
    sync('boot-load persisted settings → readout (triangle arm 1; first pinned at L1)');
    const v0 = env.audio().getVolume();
    keydown(env, 'Minus');
    sync('the Minus keydown while paused — it short-circuits BEFORE the pause toggle (shell.js:290)');
    assert.ok(Math.abs(env.audio().getVolume() - (v0 - 0.1)) < 1e-12, 'the keyboard step is exactly VOLUME_STEP');
    const v1 = env.audio().getVolume();
    click(env.menu.up);
    sync('the + button click (triangle arm 2)');
    assert.ok(Math.abs(env.audio().getVolume() - (v1 + 0.1)) < 1e-12,
      'the button step is the SAME law — bumpVolume(±VOLUME_STEP) is ONE handler for keys AND clicks (FR24)');
    keydown(env, 'Equal');
    sync('the Equal keydown while paused');
    const m0 = env.audio().isMuted();
    keydown(env, 'Mute');
    sync('the OS Mute key while paused (shell.js:289 short-circuit, triangle arm 3)');
    assert.equal(env.audio().isMuted(), !m0, 'the seam flipped exactly once');
    click(env.menu.mute);
    sync('the menu sound button flips it back');
    assert.equal(env.audio().isMuted(), m0, 'back to the boot state — three write paths, zero drift, NO menu-local mirror (M2 dies above)');
    pauseKey(env);
    tick(env, st);
    assertHidden(env, 'L4 exits to a live run');
  } finally {
    env.restore();
  }
});

// ---------- L5: AC5 — source fences, the static CSS/HTML contract, factory shape ----------

const setupMenuSlice = async () => {
  const src = await readFile(resolve(jsDir, 'shell.js'), 'utf8');
  const m = src.match(/\bfunction setupMenu\(root, api\) \{[\s\S]*?\n\}/);
  assert.ok(m, 'setupMenu ships at MODULE scope, closing brace at column 0 (D4)');
  return { src, body: m[0] };
};

test('L5 factory fence: the setupMenu body is semantics-free — no gesture/shell-state tokens, no timers; shell keeps one setVolume site, the shared bump law, ZERO new bindings, ZERO setItem (AC3/AC5 fences — kills M6)', async () => {
  const { src, body } = await setupMenuSlice();
  for (const forbidden of [/\brelease\b/, /\bpress\b/, /unlockAudio/, /\bholdFrom\b/, /\breentryAt\b/,
    /\brun\./, /setTimeout\(/, /setInterval\(/, /requestAnimationFrame\(/, /performance\.now/, /Date\.now|new Date\b|\.getTime\(/]) {
    assert.ok(!forbidden.test(body), `setupMenu must own DOM + guards ONLY — '${forbidden}' is forbidden in the factory (D4/D6 — the AC3 hole made structural)`);
  }
  assert.equal((src.match(/setItem/g) ?? []).length, 0,
    'the shell NEVER gains a setItem call — the settings writes live in the audio layer alone (single persistence truth)');
  const codes = [...new Set([...src.matchAll(/e\.code === '([A-Za-z0-9]+)'/g)].map(x => x[1]))].sort();
  assert.deepEqual(codes, ['ArrowLeft', 'ArrowRight', 'Digit1', 'Digit2', 'Digit3', 'Equal', 'Escape',
    'KeyP', 'Minus', 'Mute', 'Numpad1', 'Numpad2', 'Numpad3', 'Space'],
    'the keydown code census deep-equals the shipped set — ZERO new bindings (D5 — kills M6)');
  assert.equal((src.match(/setVolume\(/g) ?? []).length, 1,
    'EXACTLY ONE setVolume call site in the shell — bumpVolume, the shared handler (FR24, AGENTS.md:53)');
  assert.match(src, /bumpVolume\(-VOLUME_STEP\)/, 'the Minus line routes the shared bump (behavior-identical rewrite, Task 2a)');
  assert.match(src, /bumpVolume\(\+VOLUME_STEP\)/, 'the Equal line routes the shared bump');
});

test('L5 css/html contract: five static .hud-menu rules on the #hud overlay, the animation/transition law held file-wide, the frozen #hud shape untouched (AC5, NFR6/NFR7 — kills M5)', async () => {
  const css = await readFile(resolve(rootDir, 'css', 'style.css'), 'utf8');
  assert.match(css, /\.hud-menu\s*\{[^}]*position: absolute/s,
    '.hud-menu rides the #hud overlay inside the letterbox path (D1 — applyWindowSize needs no menu geometry, NFR7)');
  assert.match(css, /\.hud-menu\.hidden\s*\{[^}]*display: none/s, 'hidden state is a static class — no transition');
  assert.match(css, /\.hud-menu-row\s*\{/, 'the row rule ships (five-rule contract)');
  assert.match(css, /\.hud-menu-btn\s*\{[^}]*pointer-events: auto/s, 'buttons re-enable pointer events, the container never eats canvas taps');
  assert.match(css, /\.hud-menu-btn\s*\{[^}]*min-height: 44px/s, 'thumb-sized targets, the .hud-card note (css:43-46)');
  assert.match(css, /\.hud-menu-read\s*\{/, 'the readout rule ships (five-rule contract)');
  // Property-POSITION scan: the :96-98 law-comment names the words but the
  // law is about declarations — a `transition: opacity` mutant dies HERE (M5).
  assert.equal(css.match(/(animation|transition)\s*:/g), null,
    'ZERO animation/transition DECLARATIONS anywhere in the stylesheet (the css:96-98 law, fenced)');
  const html = await readFile(resolve(rootDir, 'index.html'), 'utf8');
  const hudStart = html.indexOf('<div id="hud"');
  const hudEnd = html.indexOf('</div>', hudStart);
  assert.ok(hudStart >= 0 && hudEnd > hudStart, 'the #hud block exists (ropehud-leg idiom, cheap local restatement)');
  const block = html.slice(hudStart, hudEnd);
  const ids = ['hud-score', 'hud-best', 'hud-ropes', 'hud-prompt', 'hud-owned'];
  const at = ids.map(id => block.indexOf(`id="${id}"`));
  assert.ok(at.every(i => i >= 0), 'the five STATIC #hud children all ship (index.html untouched)');
  assert.deepEqual(at, [...at].sort((a, b) => a - b), 'the static #hud children stay in shipped document order — the panel is runtime-built, never markup-built (NFR6)');
});

test('L5 factory reuse shape: the setupMenu source slice over a DETACHED stub root with visible: () => true and NO pause anywhere — structure builds once, handlers fire the api callbacks (AC5/D4, source-slice family)', async () => {
  const { body } = await setupMenuSlice();
  const calls = [];
  const mk2 = tag => ({
    tag, children: [], listeners: {}, style: {}, textContent: '', className: '',
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(t, fn) { (this.listeners[t] ??= []).push(fn); },
    fire(t, ev = {}) { for (const fn of this.listeners[t] ?? []) fn(ev); },
  });
  const setup = new Function('VOLUME_STEP', 'document', `${body}\nreturn setupMenu;`)(0.1, { createElement: mk2 });
  const root = mk2('div');
  let shown = true;
  let vol = 0.7;
  let mut = false;
  const api = {
    visible: () => shown, volume: () => vol, muted: () => mut, diag: () => '',
    onResume: () => calls.push('resume'),
    onVolume: d => calls.push(['vol', d]),
    onToggleMute: () => calls.push('mute'),
  };
  const menu = setup(root, api);
  assert.equal(root.children.length, 1, 'the factory appends ONE panel to whatever root it is handed — a later idle-screen entry reuses it verbatim');
  const wrap = root.children[0];
  const resume = wrap.children[0]; const row = wrap.children[1]; const muteBtn = wrap.children[2];
  const down = row.children[0]; const read = row.children[1]; const up = row.children[2];
  assert.deepEqual([resume.textContent, down.textContent, up.textContent], ['Resume', '-', '+'], 'the static structure is built ONCE at factory time');
  assert.equal(wrap.className, 'hud-menu hidden', 'built hidden; visibility is rendered state, never construction state');
  menu.render();
  assert.equal(wrap.className, 'hud-menu', 'render paints api.visible() — a plain boolean, NO pause involved');
  assert.equal(read.textContent, 'volume 70%', 'render reads api.volume()');
  assert.equal(muteBtn.textContent, 'Sound on', 'render reads api.muted()');
  resume.fire('pointerdown', {});
  up.fire('pointerdown', {});
  down.fire('pointerdown', { preventDefault() {} });
  muteBtn.fire('pointerdown', {});
  assert.deepEqual(calls, ['resume', ['vol', 0.1], ['vol', -0.1], 'mute'],
    'every control routes ONLY its api callback — the ±VOLUME_STEP law lives in the factory, the clamp lives in the seam');
  vol = null;
  menu.render();
  assert.equal(read.textContent, 'audio off', 'the audio-null boot renders the idle-prompt diagnostic string (single-source readout rule, 2c)');
  vol = 0.5; mut = true;
  menu.render();
  assert.equal(read.textContent, 'volume 50%', 'and recovers when the seam returns');
  assert.equal(muteBtn.textContent, 'Sound muted', 'the muted label renders');
  shown = false;
  menu.render();
  assert.equal(wrap.className, 'hud-menu hidden', 'visibility is re-rendered, never a second source of truth (D3)');
  assert.equal(menu.render.length, 0, 'the factory closes over NOTHING else — render takes no arguments');
});
