import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Story 8.2 (FR39, P2 = URL query param, UX-DR2, NFR14/NFR16): equip without
// a menu — the no-chrome surface. ?skin=<name> on the page URL, read
// SHELL-side at boot against the shipped SKINS table, resolved through
// Story 8.1's seam (normalizeSkin -> createScene's ONE application site;
// render3d.js is byte-zero this story). A miss — unknown name, empty param,
// malformed search, hostile value — is inert default + total silence. The
// frozen 620 are the untouched-green proof (zero re-contracts authorized);
// this suite owns the mechanism's own contract: the resolveSkinParam factory
// (Node-side, architecture.md:154-156), the table's witness pairing to the
// 8.1 MINT colors, the inert-composition tripwire, the location-stub boots,
// and the ownership/no-chrome censuses.
//
// shell.js cannot be imported (boot IO), so the shipped function text IS the
// seam under test (skins.test.js:157-166 cross-source extraction donor — the
// pairing fence: a silent delete or rename reddens here). Boot craft donor:
// tests/skins.test.js:29-121 (recording-stub boot, itself an areavistas
// :29-121 fold): IDENTITY-ADDRESS the three character materials — the FIRST
// THREE constructions, in order rose, limb, prop (render3d.js:187-189) —
// never birthHex-address, which under the set-after-construction seam would
// address the construction, not the skin.

const runGit = promisify(execFile);
const testsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(testsDir, '..');
const jsDir = resolve(rootDir, 'js');
const render3dPath = resolve(jsDir, 'render3d.js');
const shellPath = resolve(jsDir, 'shell.js');
const interpolateHref = pathToFileURL(resolve(jsDir, 'interpolate.js')).href;

const THREE_EQUIP_STUB_HREF = 'data:text/javascript,' + encodeURIComponent([
  'export const NearestFilter = 1003;',
  'globalThis.__equipReg ||= { scenes: [], meshes: [], materials: [], geometries: [], targets: [], colorSets: 0 };',
  'const reg = globalThis.__equipReg;',
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
  '    this.children = [];',
  '    this.visible = true;',
  '  }',
  '  add(child) { this.children.push(child); }',
  '  setSize() {}',
  '  setRenderTarget() {}',
  '  setPixelRatio() {}',
  '  compile() {}',
  '  updateProjectionMatrix() {}',
  '  lookAt() {}',
  '  render() {}',
  '}',
  'export class WebGLRenderer extends Node {}',
  'export class Scene extends Node { constructor() { super(); reg.scenes.push(this); } }',
  // Color RECORDS (areavistas donor): birth keeps the construction value, hex
  // the live one; every .set() increments the write census.
  'export class Color {',
  '  constructor(hex = 0) { this.hex = hex; this.birth = hex; }',
  '  set(hex) { this.hex = hex; reg.colorSets += 1; }',
  '}',
  'export class Vector3 extends Vec3 {',
  '  constructor(x = 0, y = 0, z = 0) { super(); this.x = x; this.y = y; this.z = z; }',
  '}',
  'export class Vector2 {',
  '  constructor(x = 0, y = 0) { this.x = x; this.y = y; }',
  '  set(x, y) { this.x = x; this.y = y; }',
  '}',
  'export class WebGLRenderTarget {',
  '  constructor(w, h) { this.width = w; this.height = h; this.texture = {}; reg.targets.push(this); }',
  '  setSize(w, h) { this.width = w; this.height = h; }',
  '}',
  'export class PerspectiveCamera extends Node {}',
  'export class OrthographicCamera extends Node {}',
  'export class Group extends Node {}',
  'class Geo extends Node { constructor(args) { super(); this.args = args; reg.geometries.push(this); } }',
  'export class PlaneGeometry extends Geo { constructor(w, h) { super([w, h]); this.w = w; this.h = h; } }',
  'export class BoxGeometry extends Geo { constructor(w, h, d) { super([w, h, d]); this.w = w; this.h = h; this.d = d; } }',
  'export class TubeGeometry extends Geo { constructor(...a) { super(a); } }',
  'export class CatmullRomCurve3 extends Geo { constructor(...a) { super(a); } }',
  'export class CylinderGeometry extends Geo { constructor(...a) { super(a); } }',
  'export class SphereGeometry extends Geo { constructor(...a) { super(a); } }',
  'export class CircleGeometry extends Geo { constructor(...a) { super(a); } }',
  'export class MeshBasicMaterial {',
  '  constructor(o = {}) { this.birthHex = o.color; this.color = new Color(o.color);',
  '    for (const k in o) if (k !== "color") this[k] = o[k]; reg.materials.push(this); }',
  '}',
  'export class MeshLambertMaterial {',
  '  constructor(o = {}) { this.birthHex = o.color; this.color = new Color(o.color);',
  '    for (const k in o) if (k !== "color") this[k] = o[k]; reg.materials.push(this); }',
  '}',
  'export class ShaderMaterial { constructor(o = {}) { this.uniforms = o.uniforms; reg.materials.push(this); } }',
  'export class DirectionalLight extends Node {}',
  'export class Fog { constructor(color, near, far) { this.color = new Color(color); this.near = near; this.far = far; } }',
  'export class Mesh extends Node {',
  '  constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; reg.meshes.push(this); }',
  '}'
].join('\n'));

let boots = 0;

// Boot the renderer through the seam: skin is the record-as-DATA argument
// (undefined = the inert shipped path every frozen boot takes).
async function bootSkin(skin, canvas = { width: 480, height: 640 }) {
  const src = await readFile(render3dPath, 'utf8');
  const rewritten = src
    .replace(/from\s*['"]three['"]/, `from '${THREE_EQUIP_STUB_HREF}'`)
    .replace(/from\s*['"][^'"]*interpolate\.js['"]/, `from '${interpolateHref}'`);
  const mod = await import('data:text/javascript,' + encodeURIComponent(`${rewritten}\n//equip boot ${++boots}`));
  const reg = globalThis.__equipReg;
  for (const k of Object.keys(reg)) reg[k] = Array.isArray(reg[k]) ? [] : 0;
  const scene = mod.createScene(canvas, skin);
  const world = reg.scenes[0];                        // world builds BEFORE post (pinned elsewhere)
  // IDENTITY-ADDRESS law: the character materials are the first three
  // constructions, in order rose, limb, prop (skins.test.js:116-118 donor).
  const mats = reg.materials.slice(0, 3);
  return { scene, reg, world, mats };
}

// Text-derive a shipped `const NAME = 0x...` value (areavistas:161-166 donor
// — the derive-literals rule: never re-type a signed-off hex in a test).
async function shippedConst(name) {
  const src = await readFile(render3dPath, 'utf8');
  const m = src.match(new RegExp(`const ${name} = (0x[0-9a-fA-F]+|0\\.\\d+)`));
  assert.ok(m, `the shipped look constant ${name} is present in js/render3d.js`);
  return Number(m[1]);
}

// Cross-source extraction (the markerHeal/normalizeSkin donor family): the
// shipped resolver and the shipped table ARE the mechanism under test — a
// silent delete or rename reddens the pairing fence, like the 8.1 fences.
async function resolverFromShell() {
  const src = await readFile(shellPath, 'utf8');
  const m = src.match(/function resolveSkinParam\(search, table\) \{[\s\S]*?\n\}/);
  assert.ok(m, 'the shipped resolveSkinParam factory is present in js/shell.js (pairing fence)');
  return new Function(`${m[0]}; return resolveSkinParam;`)();
}

async function tableFromShell() {
  const src = await readFile(shellPath, 'utf8');
  const m = src.match(/^const SKINS = \{.*\};$/m);
  assert.ok(m, 'the shipped SKINS table literal is present in js/shell.js at module scope (pairing fence)');
  return new Function(`${m[0]} return SKINS;`)();
}

async function normalizeSkinFromShell() {
  const src = await readFile(shellPath, 'utf8');
  const m = src.match(/function normalizeSkin\(raw\) \{[\s\S]*?\n\}/);
  assert.ok(m, 'the shipped normalizeSkin factory is present in js/shell.js (pairing fence)');
  return new Function(`${m[0]}; return normalizeSkin;`)();
}

// The 8.1 legibility-certified witness, derived from its frozen source line
// (skins.test.js:170) — never re-typed here; drift reddens this fence.
async function mintWitness() {
  const src = await readFile(resolve(testsDir, 'skins.test.js'), 'utf8');
  const m = src.match(/^const MINT = \{ name: 'mint', colors: \{ rose: (0x[0-9a-f]+), prop: (0x[0-9a-f]+), limb: (0x[0-9a-f]+) \} \};$/m);
  assert.ok(m, 'the 8.1 MINT witness line is present in tests/skins.test.js (pairing fence)');
  return { name: 'mint', colors: { rose: Number(m[1]), prop: Number(m[2]), limb: Number(m[3]) } };
}

// The browser-shape stub (story Testing guidance §d): set IMMEDIATELY before
// the data-URL boot, ALWAYS restore in finally — render3d re-evaluates
// LOOK_KNOBS at every module-eval, and a leaked stub could retint later boots.
// The stub carries NO knob keys (only the skin param), so look defaults ride.
async function withLocation(search, fn) {
  const had = 'location' in globalThis;
  const prev = globalThis.location;
  globalThis.location = { search };
  try {
    return await fn();
  } finally {
    if (had) globalThis.location = prev; else delete globalThis.location;
  }
}

// ---------------------------------------------------------------------------
// §a Resolver contract — Node-side, same change (factory-convention rule)
// ---------------------------------------------------------------------------

test('§a the resolver hits the table: bare/with-no-?/with-neighbors/case-insensitive, identity record (AC1)', async () => {
  const resolveSkinParam = await resolverFromShell();
  const SKINS = await tableFromShell();
  assert.equal(resolveSkinParam('', SKINS), undefined, "the empty search ('' = no param) resolves to nothing");
  assert.equal(resolveSkinParam('?skin=mint', SKINS), SKINS.mint,
    'the hit returns the TABLE RECORD itself (identity) — the seam copies per boot via normalizeSkin, the table is never mutated');
  assert.equal(resolveSkinParam('skin=mint', SKINS), SKINS.mint, 'URLSearchParams tolerates a search with no leading ?');
  assert.equal(resolveSkinParam('?x=1&skin=mint', SKINS), SKINS.mint, 'a neighbor param never shadows the skin param');
  assert.equal(resolveSkinParam('?skin=Mint', SKINS), SKINS.mint, 'lowercased law: ?skin=Mint hits');
  assert.equal(resolveSkinParam('?skin=MINT', SKINS), SKINS.mint, 'lowercased law: ?skin=MINT hits');
});

test('§a the garbage law: every miss is undefined, nothing thrown — inert default + silence (AC4, D5)', async () => {
  const resolveSkinParam = await resolverFromShell();
  const SKINS = await tableFromShell();
  for (const raw of ['?skin=', '?skin', '?skin=nosuch', '?skin=MiNTx', '?skin=a&skin=mint',
    '?skin=../../etc', '?skin=constructor', '?skin=__proto__', 'skin%%=mint']) {
    let out;
    assert.doesNotThrow(() => { out = resolveSkinParam(raw, SKINS); }, `${raw} must degrade, never throw`);
    assert.equal(out, undefined, `${raw} misses the table — the shipped defaults play, NOTHING is shown (AC4)`);
  }
  // First-wins law (D5, pinned so dev cannot rediscover it): .get takes the
  // FIRST value — a shadowing duplicate misses.
  assert.equal(new URLSearchParams('?skin=a&skin=mint').get('skin'), 'a',
    'the mechanism behind the duplicate law: URLSearchParams .get = first wins');
  // The Object.hasOwn falsifier: a prototype-chain name is NOT inventory.
  // table[v] (the forbidden form) would equip a Function here.
  assert.equal(typeof Object.hasOwn, 'function', 'the hasOwn law is expressible on this runtime');
});

test('§a the resolver body holds zero browser IO and zero import/location tokens (purity rider, D3)', async () => {
  const src = await readFile(shellPath, 'utf8');
  const body = src.match(/function resolveSkinParam\(search, table\) \{[\s\S]*?\n\}/);
  assert.ok(body, 'the factory is present (pairing fence)');
  for (const token of ['localStorage', 'fetch', 'eval', 'import', 'document', 'window', 'setItem', 'location']) {
    assert.ok(!body[0].includes(token), `the pure resolver must carry no ${token} reference — the read belongs to the boot site, not the factory`);
  }
});

// ---------------------------------------------------------------------------
// §b Table shape + the 8.1 witness pairing
// ---------------------------------------------------------------------------

test('§b the SKINS table is clean data: lowercase keys, every entry survives normalizeSkin, mint EQUALS the 8.1 witness (AC3, D2)', async () => {
  const SKINS = await tableFromShell();
  const normalizeSkin = await normalizeSkinFromShell();
  const keys = Object.keys(SKINS);
  assert.ok(keys.length >= 1, 'the table ships at least the mint witness');
  for (const k of keys) {
    assert.equal(k, k.toLowerCase(), `table key '${k}' is lowercase (the resolver lowercases the param against it)`);
    const out = normalizeSkin(SKINS[k]);
    assert.ok(Object.keys(out.colors).length > 0, `entry '${k}' survives normalizeSkin with non-empty colors`);
  }
  const MINT = await mintWitness();
  assert.deepEqual(SKINS.mint, MINT,
    'the mint witness pairs EXACTLY to the 8.1 legibility-certified colors (skins.test.js §g) — recoloring the table reddens the certified legibility claim');
});

// ---------------------------------------------------------------------------
// §c The inert-composition tripwire (the frozen 620 remain the real proof)
// ---------------------------------------------------------------------------

test('§c the Node boot composition takes ZERO color writes: bootSkin(normalizeSkin(resolveSkinParam("", SKINS))) (AC1/AC3, D4)', async () => {
  const resolveSkinParam = await resolverFromShell();
  const normalizeSkin = await normalizeSkinFromShell();
  const SKINS = await tableFromShell();
  const env = await bootSkin(normalizeSkin(resolveSkinParam('', SKINS))); // the EXACT record Node boots send
  const ROSE = await shippedConst('ROSE');
  const FLOOR = await shippedConst('FLOOR');
  const PROP = await shippedConst('PROP');
  assert.equal(env.reg.colorSets, 0,
    "the guard lands '' -> undefined -> { name: '', colors: {} } -> the key-count guard writes NOTHING: every frozen boot is bit-identical (the 7.3 INERT pattern)");
  assert.deepEqual(env.mats.map(m => m.color.hex), [ROSE, FLOOR, PROP], 'the shipped defaults ride untouched');
});

// ---------------------------------------------------------------------------
// §d Browser-shape boots — location stubs (AC1/AC3/AC4 end-to-end)
// ---------------------------------------------------------------------------

test('§d ?skin=mint end-to-end through the boot-site composition: the three materials carry the mint hexes, look defaults ride (AC1, AC3)', async () => {
  const resolveSkinParam = await resolverFromShell();
  const normalizeSkin = await normalizeSkinFromShell();
  const SKINS = await tableFromShell();
  const env = await withLocation('?skin=mint', async () => {
    // The boot-site expression VERBATIM (js/shell.js:110-111): the guard reads
    // the stub; the resolved record flows through the 8.1 seam. The full shell
    // cannot be imported (boot IO) — this composition IS the shipped path.
    const equipSearch = typeof location !== 'undefined' && location.search ? location.search : '';
    return bootSkin(normalizeSkin(resolveSkinParam(equipSearch, SKINS)));
  });
  assert.deepEqual(env.mats.map(m => m.color.hex),
    [SKINS.mint.colors.rose, SKINS.mint.colors.limb, SKINS.mint.colors.prop],
    'identity-addressed rose/limb/prop carry the mint hexes — ?skin=mint visibly recolors (the live-witness claim)');
  assert.equal(env.reg.colorSets, 3, 'EXACTLY three color writes — the ONE application site, once per material (8.1 D1 law unchanged)');
  const src = await readFile(render3dPath, 'utf8');
  const near = Number(src.match(/num\('fogNear', ([0-9.]+)\)/)[1]);
  const far = Number(src.match(/num\('fogFar', ([0-9.]+)\)/)[1]);
  assert.deepEqual([env.world.fog.near, env.world.fog.far], [near, far],
    "the skin param cannot collide with a look knob — no knob keys in the stub, LOOK_KNOBS takes the shipped fallbacks ('skin' is not one of light/fogNear/fogFar)");
});

test('§d a garbage location twin (?skin=) boots the shipped defaults with ZERO color writes and nothing shown (AC4)', async () => {
  const resolveSkinParam = await resolverFromShell();
  const normalizeSkin = await normalizeSkinFromShell();
  const SKINS = await tableFromShell();
  const env = await withLocation('?skin=', async () => {
    const equipSearch = typeof location !== 'undefined' && location.search ? location.search : '';
    return bootSkin(normalizeSkin(resolveSkinParam(equipSearch, SKINS)));
  });
  const ROSE = await shippedConst('ROSE');
  const FLOOR = await shippedConst('FLOOR');
  const PROP = await shippedConst('PROP');
  assert.equal(env.reg.colorSets, 0, 'an empty param writes NOTHING — the key-count guard, total silence');
  assert.deepEqual(env.mats.map(m => m.color.hex), [ROSE, FLOOR, PROP], 'the game plays with shipped defaults');
});

test('§d a garbage location twin (?skin=nosuch) boots the shipped defaults with ZERO color writes and nothing shown (AC4)', async () => {
  const resolveSkinParam = await resolverFromShell();
  const normalizeSkin = await normalizeSkinFromShell();
  const SKINS = await tableFromShell();
  const env = await withLocation('?skin=nosuch', async () => {
    const equipSearch = typeof location !== 'undefined' && location.search ? location.search : '';
    return bootSkin(normalizeSkin(resolveSkinParam(equipSearch, SKINS)));
  });
  const ROSE = await shippedConst('ROSE');
  const FLOOR = await shippedConst('FLOOR');
  const PROP = await shippedConst('PROP');
  assert.equal(env.reg.colorSets, 0, 'an unknown name writes NOTHING — inert default + silence (UX-DR2, NFR16)');
  assert.deepEqual(env.mats.map(m => m.color.hex), [ROSE, FLOOR, PROP], 'the game plays with shipped defaults');
});

// ---------------------------------------------------------------------------
// §e Ownership + persistence fences (the purity rider, mechanized)
// ---------------------------------------------------------------------------

test('§e the URL read is shell-side ONLY: one guarded read site in shell.js, render3d untouched, no persistence, one boot call (AC5/AC6, D1)', async () => {
  const shell = await readFile(shellPath, 'utf8');
  const render = await readFile(render3dPath, 'utf8');
  assert.equal((shell.match(/typeof location !== 'undefined'/g) ?? []).length, 1,
    'the guarded read shape appears EXACTLY once in shell.js (D4 — the LOOK_KNOBS idiom, one site)');
  assert.equal((shell.match(/location\.search/g) ?? []).length, 2,
    'location.search appears in shell.js exactly twice — BOTH inside the one guard expression (D1: exactly one READ SITE)');
  assert.equal(shell.split('\n').filter(l => l.includes('location.search')).length, 1,
    'all location.search reads sit on ONE line — the guard line, nowhere else in the shell');
  assert.equal((render.match(/location\.search/g) ?? []).length, 2,
    'render3d keeps EXACTLY its two LOOK_KNOBS location.search tokens (render3d.js:53) — the param read leaked NOT into the render/sim graph (epics.md:1159; BROWSER_IO_RE would NOT catch this, so this leg owns it)');
  assert.equal((shell.match(/loadMeta\(localStorage\)/g) ?? []).length, 1,
    'the metalegger :52-59 boot fence stays armed: exactly one boot meta read (this story adds none)');
  assert.equal((shell.match(/setItem\(/g) ?? []).length, 0,
    'the shell gains ZERO setItem sites — the URL is a per-load choice, nothing persists (AC6; the pausemenu L5 sibling fence)');
  assert.equal((shell.match(/createScene\(/g) ?? []).length, 1,
    'shell.js still calls createScene exactly once — the swap landed INSIDE the one consumption site');
});

test('§e zero new jumprope-* storage key literals: the fourth-key tripwire stays armed, unspent (AC6)', async () => {
  const shell = await readFile(shellPath, 'utf8');
  assert.equal((shell.match(/jumprope-/g) ?? []).length, 0,
    'shell.js names no persistence key — a jumprope-skin key would need written STOP-AND-ASK + the pausemenu L2 re-contract (retro :58 tripwire, armed not spent)');
});

// ---------------------------------------------------------------------------
// §f No-chrome diff-facts (AC2/AC3/AC5/AC7 by census)
// ---------------------------------------------------------------------------

test('§f index.html and css/style.css are byte-identical to HEAD — zero DOM, zero CSS, zero chrome (AC2/AC3, rider (f))', async () => {
  for (const p of ['index.html', 'css/style.css']) {
    let head;
    try {
      ({ stdout: head } = await runGit('git', ['show', `HEAD:${p}`], { encoding: 'buffer', maxBuffer: 1 << 24 }));
    } catch (err) {
      if (/not a git repository|bad revision|invalid object/i.test(String(err.stderr) + String(err.message))) return; // no VCS: nothing to diff-census
      throw err;
    }
    const work = await readFile(resolve(rootDir, p));
    assert.ok(work.equals(Buffer.from(head)), `${p} is byte-identical to HEAD — the no-chrome law holds by diff fact (the census skips this file otherwise)`);
  }
});

test('§f the shell key-comparison census deep-equals the shipped set: ZERO new bindings (AC5 — pausemenu L5 donor form)', async () => {
  const src = await readFile(shellPath, 'utf8');
  // Review F4 donor law: bind COMPARISONS, not one spelling.
  const codes = [...new Set([...src.matchAll(/e\.(?:code|key)\s*[!=]==?\s*['"]([A-Za-z0-9]+)['"]/g)].map(x => x[1]))].sort();
  assert.deepEqual(codes, ['ArrowLeft', 'ArrowRight', 'Digit1', 'Digit2', 'Digit3', 'Equal', 'Escape',
    'KeyP', 'Minus', 'Mute', 'Numpad1', 'Numpad2', 'Numpad3', 'Space'],
    'the key-comparison census is UNCHANGED — P2 chose the URL param, the L5 zero-new-bindings fence stays untouched-green (the AC5 L5 clause is moot by the chosen mechanism)');
  assert.equal((src.match(/\be\.key\b/g) ?? []).length, 0,
    'the shell keys on e.code ONLY — unchanged (review F4 donor)');
});
