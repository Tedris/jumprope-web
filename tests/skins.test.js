import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Story 8.1 (FR36 seam / FR37 / NFR16 / UX-DR3 seed): skins as data — the
// palette-skin seam. { name, colors: { rose, prop, limb } } arrives through
// the shell boot seam and ONE application site (the createScene loop) recolors
// the three EXISTING shared character materials. The frozen 606 are the AC1/
// AC5 inert proof (untouched-green IS the proof); this suite owns the seams'
// own contract: the normalizeSkin factory (Node-side, architecture.md:154-156),
// identity-addressed material application, the D2 dim-under-skin falsifier,
// the inert-ship censuses, and the 3-tier legibility witness D4 extends in 8.5.
//
// Boot craft donor: tests/areavistas.test.js:29-121 (recording-stub three-
// world boot). IDENTITY-ADDRESS, not birthHex-address (story Testing
// guidance): the three character materials are the FIRST THREE materials
// constructed (js/render3d.js:187-189) — birthHex stays the shipped constant
// under the set-after-construction seam, so a birthHex finder would silently
// address the construction, not the skin. Delta baselines are taken AFTER
// boot; the application loop writes each material's Color exactly once.

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const render3dPath = resolve(jsDir, 'render3d.js');
const interpolateHref = pathToFileURL(resolve(jsDir, 'interpolate.js')).href;

const THREE_SKIN_STUB_HREF = 'data:text/javascript,' + encodeURIComponent([
  'export const NearestFilter = 1003;',
  'globalThis.__skinReg ||= { scenes: [], meshes: [], materials: [], geometries: [], targets: [], colorSets: 0 };',
  'const reg = globalThis.__skinReg;',
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
    .replace(/from\s*['"]three['"]/, `from '${THREE_SKIN_STUB_HREF}'`)
    .replace(/from\s*['"][^'"]*interpolate\.js['"]/, `from '${interpolateHref}'`);
  const mod = await import('data:text/javascript,' + encodeURIComponent(`${rewritten}\n//skin boot ${++boots}`));
  const reg = globalThis.__skinReg;
  for (const k of Object.keys(reg)) reg[k] = Array.isArray(reg[k]) ? [] : 0;
  const scene = mod.createScene(canvas, skin);
  const world = reg.scenes[0];                        // world builds BEFORE post (pinned elsewhere)
  // IDENTITY-ADDRESS law (story Testing guidance): the character materials
  // are the first three constructions (:187-189), in order rose, limb, prop.
  const mats = reg.materials.slice(0, 3);
  return { scene, reg, world, mats, floor: world.children[0], horizon: horizonGroupOf(world) };
}

// The horizonGroup (areavistas :125-130 donor): the ONE scene-root Group whose
// every child is a Box Mesh.
function horizonGroupOf(world) {
  const groups = world.children.filter(c => (c.children?.length ?? 0) > 3
    && c.children.every(ch => ch.geometry?.constructor.name === 'BoxGeometry'));
  assert.strictEqual(groups.length, 1, 'exactly one horizonGroup at the scene root');
  return groups[0];
}

function ghostGroupOf(world) {
  return world.children.find(g => (g.children?.length ?? 0) === 4
    && g.children.every(c => c.geometry?.constructor.name === 'TubeGeometry'));
}

function skinView(runExtras = {}, extras = {}) {
  return {
    run: { status: 'running', area: 1, ...runExtras },
    rope: { phase: 0.5 },
    player: { y: 0 },
    prevPhase: 0.5,
    alpha: 0,
    now: 0,
    ...extras
  };
}

// Text-derive a shipped `const NAME = 0x...` value (areavistas:161-166 donor
// — the derive-literals rule: never re-type a signed-off hex in a test).
async function shippedConst(name) {
  const src = await readFile(render3dPath, 'utf8');
  const m = src.match(new RegExp(`const ${name} = (0x[0-9a-fA-F]+|0\\.\\d+)`));
  assert.ok(m, `the shipped look constant ${name} is present in js/render3d.js`);
  return Number(m[1]);
}

// Cross-source extraction of the shell-internal factory (markerHeal donor
// idiom, areavistas:179-184): a silent delete or rewrite of the shipped
// normalizeSkin reddens here — the pairing fence. shell.js cannot be imported
// (boot IO), so the shipped function text IS the seam under test.
async function normalizeSkinFromShell() {
  const src = await readFile(resolve(jsDir, 'shell.js'), 'utf8');
  const m = src.match(/function normalizeSkin\(raw\) \{[\s\S]*?\n\}/);
  assert.ok(m, 'the shipped normalizeSkin factory is present in js/shell.js (pairing fence)');
  return new Function(`${m[0]}; return normalizeSkin;`)();
}

// The story's worked sample skin (D4): prop is the dark silhouette part and
// is EXCLUDED from the legibility witness, mirroring the shipped law.
const MINT = { name: 'mint', colors: { rose: 0x7ce38b, prop: 0x10151f, limb: 0x9aa4b2 } };

const channelDelta = (a, b) => [16, 8, 0].every(sh => Math.abs(((a >>> sh) & 0xff) - ((b >>> sh) & 0xff)) >= 0x40);

// ---------------------------------------------------------------------------
// §a Factory contract — Node-side, same change (architecture.md:154-156)
// ---------------------------------------------------------------------------

test('§a normalizeSkin passes a full record through and pins the record shape law (AC3/AC6)', async () => {
  const normalizeSkin = await normalizeSkinFromShell();
  const out = normalizeSkin({ name: 'mint', colors: { rose: 0x7ce38b, prop: 0x10151f, limb: 0x9aa4b2 } });
  assert.deepEqual(out, { name: 'mint', colors: { rose: 0x7ce38b, prop: 0x10151f, limb: 0x9aa4b2 } },
    'a valid record passes through untouched — the normalizer is shape-sanitize only');
  assert.deepEqual(Object.keys(out).sort(), ['colors', 'name'], 'the record shape law: { name, colors }');
  assert.deepEqual(Object.keys(out.colors).sort(), ['limb', 'prop', 'rose'], 'the colors shape law: { rose, prop, limb }');
});

test('§a partial records keep present colors and DROP missing keys — never fabricate (AC3)', async () => {
  const normalizeSkin = await normalizeSkinFromShell();
  assert.deepEqual(normalizeSkin({ name: 'half', colors: { rose: 5 } }), { name: 'half', colors: { rose: 5 } },
    'one color kept, the other keys ABSENT — the application site falls back, the factory never invents');
  assert.deepEqual(normalizeSkin({ name: 'two', colors: { prop: 7, limb: 8 } }), { name: 'two', colors: { prop: 7, limb: 8 } },
    'two colors kept, rose absent');
});

test('§a hostile records are data: shape-sanitize to { name, colors: {} }, nothing thrown (AC3, NFR16)', async () => {
  const normalizeSkin = await normalizeSkinFromShell();
  for (const raw of [null, undefined, 'x', 42, [], {}, { colors: 'red' }, { colors: { rose: '0xff0000' } },
    { colors: [3] }, { name: null, colors: { rose: NaN, prop: 1.5, limb: '2' } }]) {
    let out;
    assert.doesNotThrow(() => { out = normalizeSkin(raw); }, `raw ${JSON.stringify(raw)} must degrade, never throw`);
    assert.deepEqual(out.colors, {}, `raw ${JSON.stringify(raw)}: non-integer/non-object colors collapse to ABSENT keys`);
    assert.equal(typeof out.name, 'string');
  }
});

test('§a name coerces to string through the ?? arm (D3 law verbatim)', async () => {
  const normalizeSkin = await normalizeSkinFromShell();
  assert.strictEqual(normalizeSkin({ name: 42 }).name, '42',
    'strictEqual: the String() coercion is the law — a mutant that drops it reddens here');
  assert.strictEqual(normalizeSkin({ name: null }).name, '');
  assert.strictEqual(normalizeSkin('x').name, '');
  assert.strictEqual(normalizeSkin(undefined).name, '', 'the INERT boot placeholder normalizes to the empty record');
});

// ---------------------------------------------------------------------------
// §b AC2 — skin record through the boot seam, ONE application site
// ---------------------------------------------------------------------------

test('§b a full skin recolors the three identity-addressed materials at ONE site — three writes, birth untouched (AC2)', async () => {
  const env = await bootSkin(MINT);
  const ROSE = await shippedConst('ROSE');
  const FLOOR = await shippedConst('FLOOR');
  const PROP = await shippedConst('PROP');
  assert.deepEqual(env.mats.map(m => m.birthHex), [ROSE, FLOOR, PROP],
    'identity pinned: the first three constructions are roseMat, limbMat, propMat (:187-189)');
  assert.deepEqual(env.mats.map(m => m.color.hex), [MINT.colors.rose, MINT.colors.limb, MINT.colors.prop],
    'the live hexes carry the skin; birthHex stays the construction constant (set-after-construction)');
  assert.equal(env.reg.colorSets, 3,
    'the boot delta is EXACTLY three Color#set writes — the one-application-site witness (D1)');
});

test('§b a skinned boot constructs no new material and keeps the snap uniform on every world material (AC2, rider (d))', async () => {
  const plain = await bootSkin(undefined);
  const plainCount = plain.reg.materials.length; // snapshot BEFORE the next boot resets reg
  const skinned = await bootSkin(MINT);
  assert.equal(skinned.reg.materials.length, plainCount,
    'no new material construction — the seam writes colors, never builds materials');
  // The snap-uniform probe (render3d.test.js:156-165 donor form) on the SKINNED scene.
  const mat = skinned.world.children.find(c => c.material?.onBeforeCompile)?.material;
  assert.ok(mat, 'the stub world scene carries a snap-injected world material');
  mat.userData = {}; // real materials carry userData; the stub Node does not
  const probe = { uniforms: {}, vertexShader: '#include <project_vertex>' };
  mat.onBeforeCompile(probe);
  assert.ok(probe.uniforms.uSnapGrid, 'the shared snap uniform still rides the materials under a skin');
});

// ---------------------------------------------------------------------------
// §c AC3 — partial records through the seam
// ---------------------------------------------------------------------------

test('§c a partial boot record recolors rose and leaves limb/prop on the shipped constants — still three writes (AC3)', async () => {
  const env = await bootSkin({ name: 'half', colors: { rose: MINT.colors.rose } });
  const [rose, limb, prop] = env.mats.map(m => m.color.hex);
  assert.equal(rose, MINT.colors.rose, 'the one present color applies');
  assert.equal(limb, await shippedConst('FLOOR'), 'the missing limb color falls back to the shipped constant (NFR16)');
  assert.equal(prop, await shippedConst('PROP'), 'the missing prop color falls back to the shipped constant');
  assert.equal(env.reg.colorSets, 3, 'exactly the loop three writes at boot — the one-site witness survives partiality');
});

// ---------------------------------------------------------------------------
// §d AC1 — the inert tripwire (the frozen 606 remain the real proof)
// ---------------------------------------------------------------------------

test('§d a default boot carries the three shipped constants and takes ZERO skin writes — the INERT story-shape tripwire (AC1)', async () => {
  const env = await bootSkin(undefined);
  const ROSE = await shippedConst('ROSE');
  const FLOOR = await shippedConst('FLOOR');
  const PROP = await shippedConst('PROP');
  assert.deepEqual(env.mats.map(m => m.color.hex), [ROSE, FLOOR, PROP], 'no skin: the shipped defaults ride');
  assert.equal(env.reg.colorSets, 0, 'the application loop writes NOTHING without a colors record — byte-inert boot (the 7.3 pattern)');
});

test('§d the SHIPPED boot composition takes ZERO color writes: bootSkin(normalizeSkin(undefined)) (AC1, review BH-1/EH-1/A81-4)', async () => {
  const normalizeSkin = await normalizeSkinFromShell();
  const env = await bootSkin(normalizeSkin(undefined)); // the EXACT record shell.js:81 sends
  const ROSE = await shippedConst('ROSE');
  const FLOOR = await shippedConst('FLOOR');
  const PROP = await shippedConst('PROP');
  assert.equal(env.reg.colorSets, 0,
    "the placeholder record { name: '', colors: {} } enters no loop — key-count guard, byte-inert shipped boot");
  assert.deepEqual(env.mats.map(m => m.color.hex), [ROSE, FLOOR, PROP], 'the shipped defaults ride untouched');
});

// ---------------------------------------------------------------------------
// §e AC4 — the i-frame dim under a skin (the D2 falsifier)
// ---------------------------------------------------------------------------

test('§e under a skin the ON edge dims to GHOST_DIM and the OFF edge restores the SKIN hexes, not the shipped ones (AC4, D2)', async () => {
  const env = await bootSkin(MINT);
  const [roseMat, limbMat] = env.mats;
  const ghostMat = ghostGroupOf(env.world).children[0].material;
  const DIM = await shippedConst('GHOST_DIM');
  const ROSE = await shippedConst('ROSE');
  const FLOOR = await shippedConst('FLOOR');
  const GO = await shippedConst('GHOST_OPACITY');
  const GOB = await shippedConst('GHOST_OPACITY_BLANK');
  env.scene.render(skinView({ iFrames: 0 }, { now: 100 }));           // baseline: no edge, no writes
  let before = env.reg.colorSets;
  env.scene.render(skinView({ iFrames: 2 }, { now: 104 }));           // ON edge
  assert.equal(roseMat.color.hex, DIM, 'the ON arm is GHOST_DIM verbatim on roseMat');
  assert.equal(limbMat.color.hex, DIM, 'the ON arm is GHOST_DIM verbatim on limbMat');
  assert.equal(ghostMat.opacity, GOB, 'the ghosts lift to GHOST_OPACITY_BLANK on the ON edge (derived, not inlined)');
  assert.equal(env.reg.colorSets - before, 2, 'EXACTLY two color writes on the ON edge (the donor census shape)');
  before = env.reg.colorSets;
  env.scene.render(skinView({ iFrames: 0 }, { now: 108 }));           // OFF edge
  assert.equal(roseMat.color.hex, MINT.colors.rose, 'the OFF edge restores the SKIN rose, NOT ROSE (the D2 falsifier)');
  assert.equal(limbMat.color.hex, MINT.colors.limb, 'the OFF edge restores the SKIN limb, NOT FLOOR');
  assert.notEqual(roseMat.color.hex, ROSE, 'the shipped ROSE must NOT bleed back under a skin');
  assert.notEqual(limbMat.color.hex, FLOOR, 'the shipped FLOOR must NOT bleed back under a skin');
  assert.equal(ghostMat.opacity, GO, 'the ghost opacity pair is unchanged by the skin (derived GHOST_OPACITY)');
  assert.equal(env.reg.colorSets - before, 2, 'EXACTLY two color writes on the OFF edge');
});

// ---------------------------------------------------------------------------
// §f AC5 — the inert-ship censuses (re-affirmances, list-only evidence)
// ---------------------------------------------------------------------------

test('§f the normalizeSkin factory body holds zero browser IO and zero import tokens (purity rider)', async () => {
  const src = await readFile(resolve(jsDir, 'shell.js'), 'utf8');
  const body = src.match(/function normalizeSkin\(raw\) \{[\s\S]*?\n\}/);
  assert.ok(body, 'the factory is present (pairing fence)');
  for (const token of ['localStorage', 'fetch', 'eval', 'import', 'document', 'window']) {
    assert.ok(!body[0].includes(token), `the pure factory must carry no ${token} reference (boundary.test.js:103-109 sibling)`);
  }
});

test('§f shell.js keeps EXACTLY one loadMeta(localStorage) boot site and ONE skin consumption site (boot-fence re-affirmance)', async () => {
  const src = await readFile(resolve(jsDir, 'shell.js'), 'utf8');
  assert.equal((src.match(/loadMeta\(localStorage\)/g) ?? []).length, 1,
    'the metalegger :56-59 fence stays armed: exactly one boot meta read (this story adds none)');
  assert.equal((src.match(/createScene\(canvas, normalizeSkin\(/g) ?? []).length, 1,
    'the normalizer is consumed at exactly ONE shell boot site (D3 — the :62 arg)');
  assert.equal((src.match(/createScene\(/g) ?? []).length, 1, 'shell.js still calls createScene exactly once');
});

test('§f render3d keeps its shipped material pipeline shape (rider (d) census)', async () => {
  const src = await readFile(render3dPath, 'utf8');
  // Shipped count taken from HEAD ff1d97b: the worldMaterial( token appears 7
  // times (the definition :175, the five constructor calls :187-189/:191/:205,
  // and one comment mention) — the seam adds no constructor and no call.
  assert.equal((src.match(/worldMaterial\(/g) ?? []).length, 7, 'the worldMaterial pipeline count is unchanged by the seam');
  assert.equal((src.match(/roseMat\.color\.set\(/g) ?? []).length, 1, 'the body-material single-writer law is untouched');
  assert.equal((src.match(/limbMat\.color\.set\(/g) ?? []).length, 1, 'the limbMat twin likewise (the D1 loop form is why)');
});

// ---------------------------------------------------------------------------
// §g AC6 — the legibility witness: 3 of 5 palettes (D4; 8.5 extends to five)
// ---------------------------------------------------------------------------

test('§g the sample skin pops on the three camouflage-prone grounds: per-channel >= 0x40 vs slab AND background (AC6, D4)', async () => {
  // The D4 sample: alley (tier 1, the shipped five-color stage), stratosphere
  // (tier 4, thin pale cloud shelves), moon-approach (tier 5, the light moon
  // floor). Numbers live in the story doc; colors are READ from the booted
  // scene — never inlined here.
  for (const tier of [1, 4, 5]) {
    const env = await bootSkin(MINT);
    env.scene.render(skinView({ area: tier }));
    const grounds = [
      ...new Set(env.horizon.children.filter(s => s.visible).map(s => s.material.color.hex)),
      env.world.background.hex,
      env.floor.material.color.hex // the tier floor — D4's named moon ground (EH-2)
    ];
    for (const [part, hex] of [['rose', env.mats[0].color.hex], ['limb', env.mats[1].color.hex]]) {
      for (const ground of grounds) {
        assert.ok(channelDelta(hex, ground),
          `tier ${tier}: the skin ${part} 0x${hex.toString(16)} must differ from ground 0x${ground.toString(16)} by >= 0x40 per channel`);
      }
    }
  }
});
