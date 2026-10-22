import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// FEEL-02/FEEL-03 (plan 04-02): juice proofs on the REAL js/shell.js frame
// loop. Same source-rewriting data:-URL harness as tests/shell.test.js: the
// render seam becomes a recording stub (globalThis.__shellTestViews) while
// game/rope/player AND the lazily-imported audio leaf load for real from
// file: URLs (the audio rewrite exists because wave-1 plan 04-03 added that
// import; audio.js boots Node-clean in its 'unsupported' mode). Zero relative
// import specifiers into js/ appear in this file, so the SPECIFIER_RE walk in
// tests/boundary.test.js never registers the shell seam and the ARCH-01
// three-fence stays green. The imported module namespace is captured so
// JUICE_TIERS is reachable for data pins and temporary test-local A/B
// mutation (shipping code never writes the table; restore in finally).
//
// Clock model: timeline legs drive frame() with a fake now in 4 ms strides
// (deterministic step schedule); the callout leg drives it with the REAL
// performance.now() because updateHud's flash branch consults that clock
// directly — a drifting fake now would silently defeat the FLASH_MS timeout.
const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');

let bootCount = 0;

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`)
    .replace(/import\(\s*['"]\.\/audio\.js['"]\s*\)/, `import('${fileHref('audio.js')}')`);

  // Each boot must be a distinct module instance (unique data: URL) so both
  // the bootstrap guard re-runs AND JUICE_TIERS is per-boot-mutable.
  const mod = await import('data:text/javascript,' + encodeURIComponent(`${src}\n//boot ${++bootCount}`));

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
  return { mod, frames, handlers, hud, views, restore };
}

function keydown(env) {
  env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
}

function keyup(env) {
  env.handlers.window.keyup({ code: 'Space' });
}

// Unwrapped per-frame phase deltas: phase advances < 0.02 per frame, so the
// half-open wrap correction below is exact (zero stays zero).
function deltas(phases) {
  return phases.map((p, i) => i === 0 ? 0 : (p - phases[i - 1] + 1.5) % 1 - 0.5);
}

// One scripted boot: start press, then frames in exact 4 ms fake strides
// until `warmup + 40` frames past the first skip. The first skip is the
// lead-in jump's clean pass (~phase 0.45) — zero player input, so the step
// schedule is fully deterministic and identical across boots; the ONLY
// difference between a control and a juice boot is the frozen hitstop value
// in this boot's own JUICE_TIERS copy.
async function recordTimeline({ hitstop }) {
  const env = await bootShell();
  try {
    for (const tier of Object.values(env.mod.JUICE_TIERS)) tier.hitstop = hitstop;
    const st = { t: performance.now() };
    keydown(env); // leave 'idle' on the first consumed frame
    const phases = [];
    let skipFrame = -1;
    for (let guard = 0; guard < 400; guard += 1) {
      st.t += 4;
      env.frames.at(-1)(st.t);
      const v = env.views.at(-1);
      assert.notEqual(v.run.status, 'over',
        'juice harness: the lead-in jump must clear the first crossing — a trip means the scripted boot went wrong');
      phases.push(v.rope.phase);
      if (skipFrame < 0 && v.run.skips > 0) skipFrame = phases.length - 1;
      if (skipFrame >= 0 && phases.length >= skipFrame + 40) break;
    }
    assert.notEqual(skipFrame, -1,
      'juice harness: no skip landed within the frame budget (~1.3 s of fake time) — the drain never reached the first feet-crossing');
    return { phases, d: deltas(phases), skipFrame };
  } finally {
    env.restore();
  }
}

test('JUICE_TIERS data pins: D-N12 seeds verbatim, magnitudes inside band, tier order skip < nearMiss < trip, no jump tier (FEEL-02)', async () => {
  const env = await bootShell();
  try {
    const t = env.mod.JUICE_TIERS;
    assert.deepEqual(Object.keys(t).sort(), ['nearMiss', 'skip', 'trip'],
      "exactly the three juice tiers — 'jump' gets no juice");
    assert.deepEqual(t.skip, { hitstop: 8, shake: 0.5, particles: 4 });
    assert.deepEqual(t.nearMiss, { hitstop: 40, shake: 1.5, particles: 10 });
    assert.deepEqual(t.trip, { hitstop: 80, shake: 2, particles: 16 });
    // D-N12 bands as a data invariant (independent of the verbatim pins).
    assert.ok(t.skip.hitstop <= 16 && t.nearMiss.hitstop === 40 && t.trip.hitstop === 80);
    for (const tier of Object.values(t)) {
      assert.ok(tier.shake <= 2, 'shake stays inside the 2 post-pass px band');
      assert.ok(tier.particles >= 1 && tier.particles <= 24, 'particle counts small and pooled');
    }
    assert.ok(t.skip.hitstop < t.nearMiss.hitstop && t.nearMiss.hitstop < t.trip.hitstop,
      'magnitude scales with significance (FEEL-02)');
  } finally {
    env.restore();
  }
});

test('hitstop stalls the sim on a scripted skip, conserving total steps — the freeze delays, never drops (FEEL-02 / D-N05)', async () => {
  // Test-local A/B (plan flagged_assumption): the shipped 8 ms skip seed is
  // smaller than one STEP (8.33 ms), so at any frame quantum its freeze
  // window provably contains no control step — timelines would match even
  // with the gate working. Freeze the whole table at 60 ms for the juice leg
  // and at 0 for the control leg; each boot owns its table copy.
  const ctrl = await recordTimeline({ hitstop: 0 });
  const juice = await recordTimeline({ hitstop: 60 });
  const F = juice.skipFrame;
  assert.equal(F, ctrl.skipFrame,
    'both boots must fire the skip on the same frame — identical deterministic step schedule');

  // Stall: the 60 ms deadline freezes every frame in (F, F+15) — 4 ms
  // strides, and the gate releases exactly at F+15 (now < stopUntil).
  for (let i = 1; i <= 13; i += 1) {
    assert.equal(juice.d[F + i], 0,
      `frame F+${i} sits inside the 60 ms freeze window — the sim must not advance there`);
  }
  const ctrlWindow = ctrl.d.slice(F + 1, F + 14);
  assert.ok(ctrlWindow.some(x => x > 0),
    'the unjuiced control advances somewhere in the frozen window (otherwise the A/B proves nothing)');
  assert.ok(ctrlWindow.reduce((a, b) => a + b, 0) > juice.d.slice(F + 1, F + 14).reduce((a, b) => a + b, 0),
    'the juice run lags the control inside the freeze — steps were deferred, not scheduled identically');

  // Conservation: 60 ms of held steps drain the frame the deadline passes,
  // so 31 frames (124 ms) after the skip both timelines carry the exact same
  // unwrapped phase advance.
  const sum = (arr, a, b) => arr.slice(a, b).reduce((x, y) => x + y, 0);
  const juiceTotal = sum(juice.d, F, F + 31);
  const ctrlTotal = sum(ctrl.d, F, F + 31);
  assert.ok(Math.abs(juiceTotal - ctrlTotal) < 1e-12,
    `total phase advance F..F+30 must match the control (juice ${juiceTotal}, ctrl ${ctrlTotal}) — delayed, never dropped`);
});

test('a scripted late press trips the buffer near-miss path and the HUD flashes CLOSE! ×N, then reverts after FLASH_MS (FEEL-03 / D-N01/D-N04)', async () => {
  const env = await bootShell();
  try {
    const st = { t: performance.now() };
    const pump = async () => {
      st.t = performance.now();
      env.frames.at(-1)(st.t);
      return env.views.at(-1);
    };
    const pumpUntil = async (pred, budgetMs, why) => {
      const end = performance.now() + budgetMs;
      while (performance.now() < end) {
        const v = await pump();
        if (pred(v)) return true;
        await sleep(2);
      }
      assert.fail(`juice harness: ${why} (never happened within ${budgetMs} ms of real frames)`);
    };

    // Real clock: updateHud compares performance.now() against flashUntil,
    // and the buffer window must be sampled in wall time like real gameplay.
    keydown(env);
    await pumpUntil(v => v.run.skips >= 1, 3000, 'the lead-in skip never scored');

    // Second crossing: release a hair before the feet window so the jump
    // fails clearance while the delivered press keeps the buffer alive —
    // tickRun resolves the forgiven pass (near-miss) at the crossing.
    await pumpUntil(v => v.run.status === 'running' && v.player.grounded
      && v.rope.phase >= 0.38 && v.rope.phase < 0.41, 4000,
    'the jumper never got grounded just before the second feet-crossing');
    keydown(env);
    await pump();
    await pump();
    keyup(env);

    let crossedAt = 0;
    await pumpUntil(v => {
      if (!crossedAt && v.run.skips >= 2) crossedAt = st.t;
      return /CLOSE! \u00d7\d+/.test(env.hud['hud-prompt'].textContent);
    }, 1000, 'the CLOSE! callout never reached the HUD prompt');
    assert.ok(crossedAt > 0, 'the near-miss crossing must have scored a skip');
    assert.ok(performance.now() - crossedAt <= 150 + 60,
      'the callout appears within the FLASH_MS window of the crossing frame');
    assert.match(env.hud['hud-prompt'].textContent, /CLOSE! \u00d71\b/,
      'the ×N suffix rides straight from run.streak');
    assert.ok(env.views.at(-1).run.streak >= 1, 'the sim tracked the near-miss streak');

    // Timeout: the flash rides updateHud's existing FLASH_MS branch, so once
    // real time passes crossing+FLASH_MS the prompt reverts to running text.
    await sleep(240);
    const v = await pump();
    assert.doesNotMatch(env.hud['hud-prompt'].textContent, /CLOSE!/,
      'the callout must time out after FLASH_MS and leave the running prompt');
    assert.equal(v.run.status, 'running', 'the near-miss flash never derailed the run');
  } finally {
    env.restore();
  }
});

// ---------------------------------------------------------------------------
// Task 2: render-side juice. Same data-URL mechanism as tests/render3d.test.js
// but with a REGISTERING three-stub (globalThis.__juiceReg records every mesh,
// material and camera the scene build allocates) so the pool, the shake
// uniform and the camera invariant are all machine-inspectable.
// ---------------------------------------------------------------------------

let renderBoot = 0;

const THREE_REG_STUB_HREF = 'data:text/javascript,' + encodeURIComponent([
  'export const NearestFilter = 1003;',
  'globalThis.__juiceReg = { meshes: [], materials: [], cameras: [] };',
  'const reg = globalThis.__juiceReg;',
  'export class Vec3 {',
  '  constructor() { this.x = 0; this.y = 0; this.z = 0; }',
  '  set(x, y, z) { this.x = x; this.y = y; this.z = z; }',
  '  setScalar(v) { this.x = v; this.y = v; this.z = v; }',
  '}',
  'export class Node {',
  '  constructor() {',
  '    this.position = new Vec3();',
  '    this.rotation = new Vec3();',
  '    this.scale = new Vec3();',
  '    this.scale.setScalar(1);',
  '  }',
  '  add() {}',
  '  setSize() {}',
  '  setRenderTarget() {}',
  '  setPixelRatio() {}',
  '  compile() {}',
  '  updateProjectionMatrix() {}',
  '  lookAt() {}',
  '  render() {}',
  '}',
  'export class WebGLRenderer extends Node {}',
  'export class Scene extends Node {}',
  'export class Color { constructor() {} }',
  'export class Vector3 extends Vec3 {',
  '  constructor(x = 0, y = 0, z = 0) { super(); this.x = x; this.y = y; this.z = z; }',
  '}',
  'export class Vector2 {',
  '  constructor(x = 0, y = 0) { this.x = x; this.y = y; }',
  '  set(x, y) { this.x = x; this.y = y; }',
  '}',
  'export class WebGLRenderTarget {',
  '  constructor() { this.texture = {}; }',
  '  setSize() {}',
  '}',
  'export class PerspectiveCamera extends Node { constructor() { super(); reg.cameras.push(this); } }',
  'export class OrthographicCamera extends Node { constructor() { super(); reg.cameras.push(this); } }',
  'export class Group extends Node {}',
  'export class PlaneGeometry extends Node {}',
  'export class BoxGeometry extends Node {}',
  'export class TubeGeometry extends Node {}',
  'export class CatmullRomCurve3 extends Node {}',
  'export class CircleGeometry extends Node {}',
  'export class MeshBasicMaterial { constructor(o = {}) { this.transparent = false; this.opacity = 1; Object.assign(this, o); reg.materials.push(this); } }',
  'export class MeshLambertMaterial { constructor(o = {}) { Object.assign(this, o); reg.materials.push(this); } }',
  'export class ShaderMaterial { constructor(o = {}) { this.uniforms = o.uniforms; reg.materials.push(this); } }',
  'export class DirectionalLight extends Node {}',
  'export class Fog { constructor() {} }',
  'export class Mesh extends Node {',
  '  constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; reg.meshes.push(this); }',
  '}'
].join('\n'));

async function bootRender() {
  const href = name => pathToFileURL(resolve(jsDir, name)).href;
  const src = await readFile(resolve(jsDir, 'render3d.js'), 'utf8');
  const rewritten = src
    .replace(/from\s*['"]three['"]/, `from '${THREE_REG_STUB_HREF}'`)
    .replace(/from\s*['"][^'"]*interpolate\.js['"]/, `from '${href('interpolate.js')}'`);
  const mod = await import('data:text/javascript,' + encodeURIComponent(`${rewritten}\n//render ${++renderBoot}`));
  const reg = globalThis.__juiceReg;
  reg.meshes.length = 0;
  reg.materials.length = 0;
  reg.cameras.length = 0;
  const scene = mod.createScene({ width: 480, height: 640 });
  const ditherMat = reg.materials.find(m => m.uniforms && m.uniforms.uInternalRes);
  // cameras[0] is the world PerspectiveCamera (the post quad's ortho comes later).
  return { scene, reg, ditherMat, camera: reg.cameras[0] };
}

// The particle pool reads as flat transparent quads: PlaneGeometry + a
// transparent basic material (the blob shadow is a Circle, the floor a
// Lambert, the post quad a ShaderMaterial — all excluded).
const poolQuads = reg => reg.meshes.filter(m => m.geometry && m.geometry.constructor.name === 'PlaneGeometry'
  && m.material && m.material.transparent === true);

function runningView(now, juice) {
  return {
    run: { status: 'running', score: 3, skips: 3 },
    rope: { phase: 0.5, period: 1.3 },
    player: { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 },
    prevPhase: 0.5,
    alpha: 0,
    best: 0,
    now,
    juice
  };
}

test('uShake jitters the post-pass sample UV on a juice impulse and decays closed-form to exactly zero by 140 ms', async () => {
  const { scene, ditherMat } = await bootRender();
  const uv = () => [ditherMat.uniforms.uShake.value.x, ditherMat.uniforms.uShake.value.y];
  const px = () => {
    const [x, y] = uv();
    return Math.hypot(x * 180, y * 240);   // internal buffer is 180x240 at 480x640
  };

  for (const now of [400, 700, 900]) scene.render(runningView(now, undefined));
  assert.deepEqual(uv(), [0, 0], 'no juice, no jitter');

  const J = { at: 1000, shake: 2, particles: 10 };
  scene.render(runningView(1000, J));      // impulse onset: sin(0) = 0
  scene.render(runningView(1016, J));
  const early = px();
  assert.ok(early > 0 && early <= 2, `t=16 ms: nonzero sub-2px jitter, got ${early}`);
  scene.render(runningView(1050, J));
  const late = px();
  assert.ok(late > 0, 't=50 ms: the impulse is still live');
  assert.ok(late < early, 'the envelope decays monotonically (exp(-t/50) bound on |sin|)');
  scene.render(runningView(1140, J));
  assert.deepEqual(uv(), [0, 0], 't=140 ms: closed-form gate returns the uniform to exact rest');
  scene.render(runningView(5000, J));
  assert.deepEqual(uv(), [0, 0], 'long after the impulse the post pass renders the pre-plan (0,0) path');
});

test('the particle pool is 16 quads built once; a spawn pass shows min(n, 16) and the closed-form decay hides every quad by t > 0.45 s', async () => {
  const { scene, reg } = await bootRender();
  const quads = poolQuads(reg);
  assert.equal(quads.length, 16, 'the pool must be exactly 16 pooled quads, built once at scene creation');
  assert.ok(quads.every(q => q.visible === false), 'the pool starts hidden');

  const J = { at: 1000, shake: 2, particles: 10 };
  scene.render(runningView(1000, J));
  assert.equal(quads.filter(q => q.visible).length, 10, 'spawn shows exactly min(10, 16) quads');
  scene.render(runningView(1100, J));
  assert.equal(quads.filter(q => q.visible).length, 10, 'quads stay live through the 0.45 s lifetime');
  assert.ok(quads.filter(q => q.visible).some(q => q.position.y !== 0.5),
    'live quads advance on the closed-form trajectory (origin y 0.5 + sin term - droop)');

  scene.render(runningView(1460, J));
  assert.equal(quads.filter(q => q.visible).length, 0, 'every quad is hidden once t > 0.45 s');
  assert.equal(poolQuads(reg).length, 16, 'no geometry is allocated per spawn — the pool size is constant');
});

test('a spawn burst clips at the pool size (T-4-04): requesting more quads than pooled still shows exactly 16', async () => {
  const { scene, reg } = await bootRender();
  scene.render(runningView(1000, { at: 1000, shake: 2, particles: 40 }));
  assert.equal(poolQuads(reg).filter(q => q.visible).length, 16, 'spawns clip at the pool size by design');
});

test('the camera position/rotation stay bit-identical across juiced and unjuiced frames (Phase-2 zero-camera-motion invariant)', async () => {
  const { scene, camera } = await bootRender();
  const snap = c => [c.position.x, c.position.y, c.position.z, c.rotation.x, c.rotation.y, c.rotation.z];
  const before = snap(camera);
  scene.render(runningView(1000, { at: 1000, shake: 2, particles: 16 }));
  scene.render(runningView(1016, { at: 1000, shake: 2, particles: 16 }));
  scene.render(runningView(1032, undefined));
  scene.render(runningView(1100, { at: 1100, shake: 2, particles: 16 }));
  assert.deepEqual(snap(camera), before,
    'D-N06: shake is UV-space — the camera object never moves, juiced or not');
});

test('with view.juice absent, render() leaves uShake at (0, 0) and the pool hidden (pre-plan render path)', async () => {
  const { scene, reg, ditherMat } = await bootRender();
  const quads = poolQuads(reg);
  for (const now of [0, 300, 700, 1300]) scene.render(runningView(now, undefined));
  assert.deepEqual([ditherMat.uniforms.uShake.value.x, ditherMat.uniforms.uShake.value.y], [0, 0]);
  assert.equal(quads.filter(q => q.visible).length, 0, 'the pool stays hidden without juice');
});
