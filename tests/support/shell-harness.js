// Shared boot primitives for the shell-boot family (chore test-harness + CI
// consolidation). Each of the seven bootShell forks (shell/uxpolish/altitude/
// ascent/pausemenu/polish/leadinhop) composes its boot from these primitives;
// no cleverness — this module ships exactly what the donor suites already do,
// composed rather than copied. Like tests/support/balance-harness.js, it keeps
// zero relative specifiers into js/ (pathToFileURL only), so the SPECIFIER_RE
// walk in tests/boundary.test.js never registers it as a graph entry.

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const harnessDir = dirname(fileURLToPath(import.meta.url));
export const jsDir = resolve(harnessDir, '..', '..', 'js');
export const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;
export const settle = () => new Promise(r => setTimeout(r, 0));

const HUD_IDS = ['hud-score', 'hud-best', 'hud-prompt', 'hud-owned'];

// Data-URL module author; `tag` appends the uniqueness trailer (boot guard).
export function dataUrl(src, tag) {
  return 'data:text/javascript,' + encodeURIComponent(tag ? `${src}\n//${tag}` : src);
}

let bootSeq = 0;

// Import + bootCount guard: the unique trailer makes every boot a distinct
// module instance so the bootstrap guard re-runs (the donors' ++bootCount).
export async function bootModule(src, tag) {
  await import(dataUrl(src, `${tag} ${++bootSeq}`));
}

// The four static seam rewrites (plus the dynamic audio site when `audio` is
// given) every donor boot applies to the shell source.
export async function shellSrc({ render3d, game = fileHref('game.js'), rope = fileHref('rope.js'), player = fileHref('player.js'), audio } = {}) {
  let src = await readFile(resolve(jsDir, 'shell.js'), 'utf8');
  src = src.replace(/from\s*['"]\.\/render3d\.js['"]/, `from '${render3d}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${game}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${rope}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${player}'`);
  if (audio) src = src.replace(/import\(\s*['"]\.\/audio\.js['"]\s*\)/, `import('${audio}')`);
  return src;
}

// ---------- data-URL wrapper authors ----------

// Recording render stub (optionally the forced-throw variant of shell.test):
// logs every view onto globalThis[viewsKey], then throws when asked.
export function makeRenderStubHref({ throws = false, viewsKey = '__shellTestViews' } = {}) {
  return dataUrl([
    'export function createScene() {',
    '  return {',
    '    render(view) {',
    `      globalThis["${viewsKey}"].push(view);`,
    throws ? '      throw new Error("forced renderer failure");' : '',
    '    }',
    '  };',
    '}'
  ].filter(Boolean).join('\n'));
}

// tickRun/startRun wrapper over the REAL js/game.js: the prelude re-exports
// and namespaces the real module; `inject` carries the suite's own overrides.
export function makeGameWrapHref(srcUrl, inject) {
  return dataUrl([
    `export * from "${srcUrl}";`,
    `import * as real from "${srcUrl}";`,
    inject,
  ].join('\n'));
}

// createAudio wrapper over the REAL js/audio.js: the body sees the live `a`
// and returns the wrapped object; the settings re-exports ship with it.
export function makeAudioWrapHref(srcUrl, body) {
  return dataUrl([
    `import * as real from "${srcUrl}";`,
    'export function createAudio(opts) {',
    '  const a = real.createAudio(opts);',
    body,
    '}',
    'export const loadSettings = real.loadSettings;',
    'export const saveSettings = real.saveSettings;',
  ].join('\n'));
}

// ---------- stub factories ----------

// mk()/fire() element factory (pickerhud.test.js:43-64 donor) + the fixed HUD
// capture map. insertBefore is an OPTION: the shell's marker probe
// (shell.js:106) takes the insert path only when the stub offers it
// (ceilingmarker.test.js:37 donor line) — stubs without it keep the shipped
// append placement.
export function makeDom({ createElement = false, insertBefore = false, spans = false, hudIds = HUD_IDS } = {}) {
  const created = [];
  const mk = tag => {
    const el = {
      tag, children: [], listeners: {}, style: {}, textContent: '', _cn: '',
      get className() { return this._cn; },
      set className(v) { this._cn = v; },
      appendChild(c) { this.children.push(c); return c; },
      replaceChildren(...cs) { this.children = cs; },
      addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); },
      fire(type, ev = {}) { for (const fn of this.listeners[type] ?? []) fn(ev); },
    };
    if (insertBefore) {
      el.insertBefore = (c, ref) => {
        const i = el.children.indexOf(ref);
        if (i < 0) el.children.push(c); else el.children.splice(i, 0, c);
        return c;
      };
    }
    created.push(el);
    return el;
  };
  const hud = {};
  for (const id of hudIds) hud[id] = spans ? mk('span') : { textContent: '' };
  return { mk, created, hud };
}

// Map-backed localStorage stub (the uxpolish/altitude/ascent/pausemenu donor).
export const mapStorage = map => ({
  getItem: k => (map.has(k) ? map.get(k) : null),
  setItem: (k, v) => { map.set(k, v); },
});

// Virtual performance clock (pickerhud.test.js:93 stub + :137-142 pump
// idiom). `.t` is the public scalar the suite pumps — the same object the
// stubbed now() reads, so env.clock.t = / += mutations stay live.
export function installVirtualClock() {
  const clock = {
    t: 0,
    now() { return clock.t; },
    advance(ms) { clock.t += ms; return clock.t; },
    install() {
      this._saved = Object.getOwnPropertyDescriptor(globalThis, 'performance');
      // defineProperty, not assignment: `performance` stays non-writable
      // during the boot, as the leadinhop donor had it (review F2).
      Object.defineProperty(globalThis, 'performance', {
        value: { now: () => clock.t }, configurable: true,
      });
    },
    restore() {
      if (this._saved) Object.defineProperty(globalThis, 'performance', this._saved);
      else delete globalThis.performance;
    },
  };
  return clock;
}

// console.error spy: every boot's env carries the captured args array.
export function captureConsoleErrors() {
  const handle = {
    errors: [],
    install() {
      this._saved = console.error;
      console.error = (...args) => { handle.errors.push(args); };
    },
    restore() { console.error = this._saved; },
  };
  return handle;
}

// ---------- the shared globals dance ----------

// One install/restore snapshot of every stub global the boots swap, with the
// DOM stubs composed from makeDom. Defaults reproduce the majority donor
// shape: 4-key textContent HUD map, hidden:false document, metrics window
// with a dead-false matchMedia pair, value-descriptor localStorage.
export function installStage({
  storage,
  clock = null,
  errors,
  viewsKey = '__shellTestViews',
  createElement = false,
  insertBefore = false,
  spans = false,
  hudRoot: makeHudRoot = false,
  hidden = true,
  metrics = false,
  matchMedia = undefined,
  fetchReject = false,
  AudioContextStub = undefined,
  deleteAudioContext = false,
  globals = {},
  stash = [],
} = {}) {
  const frames = [];
  const handlers = { window: {}, canvas: {} };
  const dom = makeDom({ createElement, insertBefore, spans });
  const canvas = {
    width: 0, height: 0, style: {},
    addEventListener: (type, fn) => { handlers.canvas[type] = fn; },
  };
  const hudRoot = makeHudRoot ? dom.mk('div') : undefined;
  const byId = id => (id === 'game' ? canvas : createElement && hudRoot && id === 'hud' ? hudRoot : dom.hud[id]);
  const documentStub = { ...(hidden ? { hidden: false } : {}), ...(createElement ? { createElement: dom.mk } : {}), getElementById: byId };
  const windowStub = {
    addEventListener: (type, fn) => { handlers.window[type] = fn; },
    ...(metrics ? {
      innerWidth: 480, innerHeight: 640,
      matchMedia: matchMedia ?? (() => ({ matches: false, addEventListener() {} })),
    } : {}),
  };
  const views = [];
  globalThis[viewsKey] = views;

  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    // Descriptor, not value: reading Node 26's experimental localStorage
    // getter emits an ExperimentalWarning through console.error and would
    // pollute the error spy (the donors' own guard, shell.test.js:53-57);
    // capture-before-install keeps the restore CHAIN intact under
    // overlapping boots (review F1).
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    consoleError: console.error,
  };
  if (fetchReject) saved.fetch = globalThis.fetch;
  if (AudioContextStub !== undefined || deleteAudioContext) saved.AudioContext = globalThis.AudioContext;
  const stashed = {};
  for (const key of stash) stashed[key] = globalThis[key];
  for (const key of Object.keys(globals)) globalThis[key] = globals[key];

  globalThis.document = documentStub;
  globalThis.window = windowStub;
  // When a virtual clock drives the boot, the pumped frame timestamp stamps
  // the clock, so shell-side performance.now() reads ride the pump scalar
  // (the polish flake fix, ledger :184/:185; a no-op for the suites whose
  // tick already advances clock.t before pumping the same scalar).
  globalThis.requestAnimationFrame = clock
    ? cb => { frames.push(t => { clock.t = t; return cb(t); }); return frames.length; }
    : cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  if (clock) clock.install();
  if (fetchReject) globalThis.fetch = () => Promise.reject(new Error('no track in the sandbox'));
  if (AudioContextStub !== undefined) globalThis.AudioContext = AudioContextStub;
  else if (deleteAudioContext) delete globalThis.AudioContext;
  errors.install();

  return {
    frames, handlers, canvas, document: documentStub, window: windowStub,
    views, clock, errors: errors.errors,
    ...dom, hudRoot, documentStub, windowStub,
    restore() {
      globalThis.document = saved.document;
      globalThis.window = saved.window;
      globalThis.requestAnimationFrame = saved.requestAnimationFrame;
      if (clock) clock.restore();
      if (fetchReject) globalThis.fetch = saved.fetch;
      if (AudioContextStub !== undefined || deleteAudioContext) globalThis.AudioContext = saved.AudioContext;
      if (saved.localStorage) Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
      else delete globalThis.localStorage;
      for (const key of stash) globalThis[key] = stashed[key];
      delete globalThis[viewsKey];
      for (const key of Object.keys(globals)) delete globalThis[key];
      errors.restore();
    },
  };
}
