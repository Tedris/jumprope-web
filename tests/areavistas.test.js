import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AREAS } from '../js/areas.js';

// Story 4.3 (FR15 / NFR1 / NFR7 / NFR10): area vistas — palette, fog, horizon.
//
// Boundary discipline (same doctrine as tests/render3d.test.js:7-15): js/render3d.js
// is read as TEXT, its two import specifiers are rewritten (a richer THREE stub +
// a file: URL for interpolate.js) and the rewrite is imported as a data: URL. No
// relative specifier into js/render3d.js appears here, so the SPECIFIER_RE walk in
// tests/boundary.test.js never registers the renderer as an entry and ARCH-01 stays
// green. The boot is DELIBERATELY re-implemented rather than shared: a test file
// cannot import helpers from the frozen suites (byte-identical discipline), and
// those stubs' Color/Fog constructors record NOTHING (render3d.test.js:55/:83) —
// colors are unreadable through them. This richer stub records constructor args,
// .set() writes and every geometry allocation instead, which is what §6's census
// and §2's color legs need. Expectations derive from the AREAS records and from
// the shipped look CONSTANTS text-derived out of the renderer source — never
// re-typed hex literals (derive-literals house rule, Story 4.1 review doctrine).

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const render3dPath = resolve(jsDir, 'render3d.js');
const interpolateHref = pathToFileURL(resolve(jsDir, 'interpolate.js')).href;

const THREE_VISTA_STUB_HREF = 'data:text/javascript,' + encodeURIComponent([
  'export const NearestFilter = 1003;',
  'globalThis.__vistaReg ||= { scenes: [], meshes: [], materials: [], geometries: [], targets: [], colorSets: 0 };',
  'const reg = globalThis.__vistaReg;',
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
  // Color RECORDS (the frozen stub is color-blind): birth keeps the construction
  // value, hex the live one; every .set() increments the write census (§4).
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
  // Every geometry construction registers — §6 census proves renders allocate none.
  'class Geo extends Node { constructor(args) { super(); this.args = args; reg.geometries.push(this); } }',
  'export class PlaneGeometry extends Geo { constructor(w, h) { super([w, h]); this.w = w; this.h = h; } }',
  'export class BoxGeometry extends Geo { constructor(w, h, d) { super([w, h, d]); this.w = w; this.h = h; this.d = d; } }',
  'export class TubeGeometry extends Geo { constructor(...a) { super(a); } }',
  'export class CatmullRomCurve3 extends Geo { constructor(...a) { super(a); } }',
  'export class CylinderGeometry extends Geo { constructor(...a) { super(a); } }',
  'export class SphereGeometry extends Geo { constructor(...a) { super(a); } }',
  'export class CircleGeometry extends Geo { constructor(...a) { super(a); } }',
  // Materials record construction args: birthHex is the construction-time color,
  // color a live Color instance (§2 character-identity + tier-color legs).
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

async function bootVista(canvas = { width: 480, height: 640 }) {
  const src = await readFile(render3dPath, 'utf8');
  const rewritten = src
    .replace(/from\s*['"]three['"]/, `from '${THREE_VISTA_STUB_HREF}'`)
    .replace(/from\s*['"][^'"]*interpolate\.js['"]/, `from '${interpolateHref}'`);
  const mod = await import('data:text/javascript,' + encodeURIComponent(`${rewritten}\n//vista boot ${++boots}`));
  const reg = globalThis.__vistaReg;
  for (const k of Object.keys(reg)) reg[k] = Array.isArray(reg[k]) ? [] : 0;
  const scene = mod.createScene(canvas);
  const world = reg.scenes[0];                        // world builds BEFORE post (pinned elsewhere)
  const floor = world.children[0];                    // floor stays the first scene-root child
  const horizon = horizonGroupOf(world);
  return { scene, reg, world, floor, horizon };
}

// The horizonGroup: the ONE scene-root Group whose every child is a Box Mesh.
// rig children are Groups, ropePivot has 3 children (Tube + 2 handles), the
// particle pool is Plane quads — none match, so this filter is the §3 pin.
function horizonGroupOf(world) {
  const groups = world.children.filter(c => (c.children?.length ?? 0) > 3
    && c.children.every(ch => ch.geometry?.constructor.name === 'BoxGeometry'));
  assert.strictEqual(groups.length, 1, 'exactly one horizonGroup at the scene root (§3)');
  return groups[0];
}

function vistaView(area, overrides = {}) {
  return {
    run: { status: 'running', area },
    rope: { phase: 0.5 },
    player: { y: 0 },
    prevPhase: 0.5,
    alpha: 0,
    now: 0,
    ...overrides
  };
}

// Everything a vista owns, in one comparable snapshot.
function vistaCensus(env) {
  return {
    fog: env.world.fog.color.hex,
    bg: env.world.background.hex,
    floor: env.floor.material.color.hex,
    visible: env.horizon.children.filter(s => s.visible).map(s => s.position.x).sort((a, b) => a - b),
    slabHexes: [...new Set(env.horizon.children.filter(s => s.visible).map(s => s.material.birthHex))].sort((a, b) => a - b)
  };
}

async function sourceOf(file) {
  return readFile(resolve(jsDir, file), 'utf8');
}

// Text-derive a shipped `const NAME = 0x...` value out of the renderer source:
// the derive-literals rule (§1/§2) — never re-type a signed-off hex in a test.
async function shippedConst(name) {
  const src = await sourceOf('render3d.js');
  const m = src.match(new RegExp(`const ${name} = (0x[0-9a-fA-F]+)`));
  assert.ok(m, `the shipped look constant ${name} is present in js/render3d.js`);
  return Number(m[1]);
}

async function shippedIntConst(name) {
  const src = await sourceOf('render3d.js');
  const m = src.match(new RegExp(`const ${name} = ([0-9]+)`));
  assert.ok(m, `the shipped constant ${name} is present in js/render3d.js`);
  return Number(m[1]);
}

// The D-c display-side heal, derived CROSS-SOURCE from js/shell.js itself
// (review 4.3, Blind F1): extracting markerLine's clamp expression and
// evaluating it beats mirroring vistaFor — a silent edit to either side's
// heal reddens the pairing fence, including the documented +Infinity arm.
async function markerHeal() {
  const src = await sourceOf('shell.js');
  const m = src.match(/const area = (Math\.min\(Math\.max\([^;]+AREAS\.length\));/);
  assert.ok(m, 'js/shell.js carries the markerLine area heal (pairing fence)');
  return area => new Function('run', 'AREAS', `return ${m[1]};`)({ area }, AREAS);
}

function channelsAreMonotonic(upper, lower) {
  const ch = (hex, shift) => (hex >>> shift) & 0xff;
  return [16, 8, 0].every(shift => ch(lower, shift) <= ch(upper, shift));
}

// ---------------------------------------------------------------------------
// §1 Fog ladder contract (AC1) — js/areas.js, no boot needed
// ---------------------------------------------------------------------------

test('§1 the fog ladder darkens monotonically per channel down the tiers (kills M8)', async () => {
  for (let i = 1; i < AREAS.length; i++) {
    assert.ok(channelsAreMonotonic(AREAS[i - 1].fog, AREAS[i].fog),
      `row ${i + 1} (${AREAS[i].name}) must be per-channel <= row ${i} (${AREAS[i - 1].name}) fog`);
  }
});

test('§1 row 1 fog equals the shipped SKY constant — the signed-off alley look, text-derived (D-a)', async () => {
  assert.strictEqual(AREAS[0].fog, await shippedConst('SKY'),
    'area 1 fog catches the data up to the signed-off render, never the reverse');
});

test('§1 the AREAS contract this story consumes holds: fog numbers, frozen rows, palette === name (D-g)', () => {
  for (const row of AREAS) {
    assert.strictEqual(typeof row.fog, 'number', `row ${row.area} fog stays a number`);
    assert.ok(Object.isFrozen(row), `row ${row.area} stays Object.freeze'd`);
    assert.strictEqual(row.palette, row.name, `row ${row.area} palette follows the name`);
  }
});

// ---------------------------------------------------------------------------
// §2 Vista matches tier (AC1) — boot once, tour 1..5, all state derived
// ---------------------------------------------------------------------------

test('§2 fog follows AREAS.fog and background equals fog on every tier (D-06; kills M2)', async () => {
  const env = await bootVista();
  for (let t = 1; t <= AREAS.length; t++) {
    env.scene.render(vistaView(t));
    assert.strictEqual(env.world.fog.color.hex, AREAS[t - 1].fog,
      `tier ${t} fog === AREAS fog (the VISTAS/AREAS drift fence)`);
    assert.strictEqual(env.world.background.hex, env.world.fog.color.hex,
      `tier ${t}: background equals fog color (D-06 hides the world edge by construction)`);
  }
});

test('§2 floor colors are pairwise distinct across tiers; tier 1 equals the shipped FLOOR (AC1)', async () => {
  const env = await bootVista();
  const floors = [];
  for (let t = 1; t <= AREAS.length; t++) {
    env.scene.render(vistaView(t));
    floors.push(env.floor.material.color.hex);
  }
  assert.strictEqual(floors.length, new Set(floors).size, 'every tier shows its own floor color');
  assert.strictEqual(floors[0], await shippedConst('FLOOR'), 'the alley floor is the signed-off constant');
});

test('§2 silhouette visible sets and slab colors are pairwise distinct across tiers; tier-1 slabs keep PROP', async () => {
  const env = await bootVista();
  const sets = [];
  const colors = [];
  for (let t = 1; t <= AREAS.length; t++) {
    env.scene.render(vistaView(t));
    const c = vistaCensus(env);
    sets.push(c.visible.join(','));
    colors.push(c.slabHexes.join(','));
  }
  assert.strictEqual(new Set(sets).size, AREAS.length, 'each tier draws its own skyline (§3 rig)');
  assert.strictEqual(new Set(colors).size, AREAS.length, 'each tier silhouettes in its own prop color');
  env.scene.render(vistaView(1));
  assert.deepStrictEqual(vistaCensus(env).slabHexes, [await shippedConst('PROP')],
    'tier-1 silhouettes are the shipped PROP look by reference (D-a/D-d)');
});

test('§2 the 1..5 tour never recolors the character or particles — same stage, same grammar (kills M9)', async () => {
  const env = await bootVista();
  for (let t = 1; t <= AREAS.length; t++) env.scene.render(vistaView(t));
  const ropeMeshes = env.reg.meshes.filter(m => m.geometry?.constructor.name === 'TubeGeometry');
  // Two-part census (Story 5.3, R2): the ROPE stays identity-keyed — ropeTube is
  // still the FIRST-registered tube mesh (construction order: js/render3d.js's
  // rope precedes the ghost pool, pinned below), so ropeMeshes[0] in the loop
  // keeps its exact meaning. The four held-rope ghosts are ENUMERATED, not
  // exempted: identity-keyed (review 4.4, Blind F1), they join the census and
  // pass it untouched because their material is birth-static (one shared
  // ghostMat, no vista arm ever writes it).
  assert.equal(ropeMeshes.length, 1 + 4,
    'exactly one rope + exactly four ghosts (MAX_ROPES − 1, js/game.js:25) — a NEW tube mesh must be added to the census here, never covered by a geometry-class exemption (Story 5.3)');
  const ghostMeshes = ropeMeshes.filter(m => m !== ropeMeshes[0]);
  assert.equal(ghostMeshes.length, 4, 'the ghost identities are enumerated — not silently swept (Story 5.3)');
  assert.ok(ghostMeshes.every(m => env.reg.meshes.indexOf(m) > env.reg.meshes.indexOf(ropeMeshes[0])),
    'construction order pinned: the rope tube registers BEFORE every ghost, so ropeMeshes[0] below keys on the rope by IDENTITY');
  assert.ok(ghostMeshes.every(m => m.material === ghostMeshes[0].material
    && m.material.color.hex === m.material.color.birth),
    'ghosts share ONE birth-static material — which is why the frozen loop below passes them untouched');
  const slabSet = new Set(env.horizon.children);
  const floorMat = env.floor.material;
  const slabMats = new Set(env.horizon.children.map(s => s.material));
  for (const mesh of env.reg.meshes) {
    if (mesh === env.floor || slabSet.has(mesh)) continue;
    const m = mesh.material;
    if (!m.color) continue;                                          // shader uniform carrier
    // AUTHORIZED RE-CONTRACT (Story 4.4, FR16): the rope tube's COLOR is area
    // state now — VISTAS gains a rope column and the edge a fifth write. The
    // rope ladder is fenced in tests/ceilingbreak.test.js §3; character and
    // particles stay byte-frozen here — a vista recolor of the RIG must still die.
    // Identity-keyed (review 4.4, Blind F1): a NEW tube mesh must be added to
    // the census here, not silently covered by a geometry-class exemption.
    if (mesh === ropeMeshes[0]) continue;
    assert.ok(!slabMats.has(m), 'vista materials are never shared with rig/rope/particle meshes (D-d)');
    assert.strictEqual(m.color.hex, m.birthHex,
      `${m.birthHex.toString(16)} keeps its construction color through every vista switch (D-d)`);
  }
});

// ---------------------------------------------------------------------------
// §3 Horizon geometry (AC1, D-18/D-e)
// ---------------------------------------------------------------------------

test('§3 every tier respects the D-18 judgment zone: |x| - w/2 >= 6, z = -8, >= 2 slabs, distinct sets', async () => {
  const env = await bootVista();
  const seen = [];
  for (let t = 1; t <= AREAS.length; t++) {
    env.scene.render(vistaView(t));
    const visible = env.horizon.children.filter(s => s.visible);
    assert.ok(visible.length >= 2, `tier ${t} shows at least two silhouettes`);
    for (const slab of visible) {
      assert.ok(Math.abs(slab.position.x) - slab.geometry.w / 2 >= 6,
        `tier ${t}: slab at x=${slab.position.x} w=${slab.geometry.w} must stay clear of the judgment zone`);
      assert.strictEqual(slab.position.z, -8, `tier ${t}: slabs sit in the shipped z = -8 fog band (D-e)`);
    }
    seen.push(visible.map(s => s.position.x).sort((a, b) => a - b).join(','));
  }
  assert.strictEqual(new Set(seen).size, AREAS.length, 'per-tier skyline silhouettes are pairwise distinct');
});

test('§3 the horizon is ONE prebuilt Group of >3 Box meshes at the scene root (fingerprint safety)', async () => {
  const env = await bootVista();
  assert.ok(env.horizon.children.length > 3, 'the horizonGroup carries more than a trio of slabs');
  assert.ok(env.horizon.children.every(s => s.material && s.geometry), 'every horizon child is a full Mesh');
  // The frozen trio filter (render3d.test.js:242) must still see exactly two
  // 3-children Groups at the root: rig + ropePivot, never the horizon.
  const trios = env.world.children.filter(c => (c.children?.length ?? 0) === 3);
  assert.ok(trios.every(g => !g.children.every(c => c.geometry?.constructor.name === 'BoxGeometry')),
    'no horizon tier is trio-shaped at the scene root');
});

// ---------------------------------------------------------------------------
// §4 State-only switching (AC3)
// ---------------------------------------------------------------------------

test('§4 the vista applies ON EDGE ONLY: a repeated area writes zero colors (cache == apply, D-b)', async () => {
  const env = await bootVista();
  env.scene.render(vistaView(2));                                   // edge: writes
  assert.strictEqual(env.world.fog.color.hex, AREAS[1].fog);
  const writes = env.reg.colorSets;
  env.scene.render(vistaView(2));                                   // repeat: silent
  assert.strictEqual(env.reg.colorSets, writes, 'same-area renders write no vista colors (kills M1 staleness)');
});

test('§4 a descending crafted tour 5 -> 3 follows state without policing one-way-ness (AC3)', async () => {
  const env = await bootVista();
  env.scene.render(vistaView(5));
  env.scene.render(vistaView(3));
  assert.strictEqual(env.world.fog.color.hex, AREAS[2].fog, 'the renderer obeys the payload, the SIM owns one-way-ness');
});

test('§4 render never writes back into the view records (one-way payload, AC3)', async () => {
  const env = await bootVista();
  const view = vistaView(4);
  const before = { run: structuredClone(view.run), rope: structuredClone(view.rope), player: structuredClone(view.player) };
  env.scene.render(view);
  assert.deepStrictEqual(view.run, before.run, 'run untouched by the renderer');
  assert.deepStrictEqual(view.rope, before.rope, 'rope untouched by the renderer');
  assert.deepStrictEqual(view.player, before.player, 'player untouched by the renderer');
});

test('§4 render3d.js imports EXACTLY {three, ./interpolate.js} — the boot wheel and M7 fence', async () => {
  const specs = [...(await sourceOf('render3d.js')).matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(?\s*['"]([^'"]+)['"]/g)].map(m => m[1] ?? m[2]);
  assert.deepStrictEqual(specs.sort(), ['./interpolate.js', 'three'],
    'a third specifier (e.g. ./areas.js) breaks the two frozen data-URL boots (D-a)');
});

// ---------------------------------------------------------------------------
// §5 Crafted payload heals (D-c)
// ---------------------------------------------------------------------------

test('§5 a run-less payload boots to tier 1 without throwing', async () => {
  const env = await bootVista();
  env.scene.render({ run: {}, rope: { phase: 0.5 }, player: { y: 0 }, prevPhase: 0.5, alpha: 0, now: 0 });
  assert.strictEqual(env.world.fog.color.hex, await shippedConst('SKY'), 'no area = the shipped alley look');
});

test('§5 crafted areas are data: every crafted value heals exactly like shell.js markerLine (kills M4)', async () => {
  const env = await bootVista();
  const healFromMarker = await markerHeal(); // cross-source: shell.js, not a vistaFor copy
  const crafted = [undefined, null, NaN, 0, -2, '3', 4.6, 9, Infinity, {}];
  for (const area of crafted) {
    env.scene.render(vistaView(area));                               // must never throw
    assert.strictEqual(env.world.fog.color.hex, AREAS[healFromMarker(area) - 1].fog,
      `area ${String(area)} lands where shell's markerLine heals it — tier ${healFromMarker(area)} (review 4.3)`);
  }
});

test('§5 a crafted frame cannot poison the cache: the next valid payload re-lands (AC3)', async () => {
  const env = await bootVista();
  env.scene.render(vistaView('nonsense'));
  env.scene.render(vistaView(4));
  assert.strictEqual(env.world.fog.color.hex, AREAS[3].fog);
  assert.strictEqual(env.world.background.hex, AREAS[3].fog);
});

// ---------------------------------------------------------------------------
// §6 Cheap pipeline & zero bitmaps (AC1 tail, AC4, NFR1/NFR10 mechanism)
// ---------------------------------------------------------------------------

test('§6 the renderer contains zero bitmap constructs — procedural/inline only (NFR10)', async () => {
  const src = await sourceOf('render3d.js');
  assert.ok(!/TextureLoader|new Image\b|createImageBitmap|data:image|\.png|\.jpg|\.webp/.test(src),
    'no bitmap texture machinery may ever enter the renderer (NFR10)');
});

test('§6 js/ gains no module files beyond the shipped set (no vista geometry files)', async () => {
  const shipped = /^(?:areas|audio|game|interpolate|player|render3d|rope|shell|upgrades)\.js$/;
  const offenders = (await readdir(jsDir)).filter(n => n.endsWith('.js') && !shipped.test(n));
  assert.deepStrictEqual(offenders, [], 'the vista is tables inside render3d.js, not new files (D-a)');
});

test('§6 the render-pass count is unchanged: one world pass + one post pass (D-02)', async () => {
  const src = await sourceOf('render3d.js');
  const calls = src.match(/renderer\.render\(/g) ?? [];
  assert.strictEqual(calls.length, 2, 'vistas add zero render passes (D-02 one-post-pass invariant)');
});

test('§6 renders allocate ZERO geometry across a 20-frame five-tier tour; visible slabs stay <= 6 (kills M6/M3)', async () => {
  const env = await bootVista();
  const baseline = env.reg.geometries.length;
  for (let frame = 0; frame < 20; frame++) {
    env.scene.render(vistaView((frame % AREAS.length) + 1));
    const visible = env.horizon.children.filter(s => s.visible).length;
    assert.ok(visible <= 6, `frame ${frame}: at most the busiest tier's slab count draws (${visible})`);
  }
  assert.strictEqual(env.reg.geometries.length, baseline,
    'zero per-frame geometry — the vista flips .visible on prebuilt slabs (D-e/NFR1)');
});

test('§6 the internal render target stays the single 240-row target (NFR1 mechanism)', async () => {
  const env = await bootVista();
  env.scene.render(vistaView(3));
  assert.strictEqual(env.reg.targets.length, 1, 'the vista adds no second render target');
  assert.strictEqual(env.reg.targets[0].height, await shippedIntConst('INTERNAL_H'),
    'the 240-row internal target is untouched (INTERNAL_H)');
});

// ---------------------------------------------------------------------------
// §7 Letterbox resize & reduced motion (AC4/NFR7, FR23 base)
// ---------------------------------------------------------------------------

test('§7 a mid-run resize follows the shipped formulas and the applied vista survives byte-identical (NFR7)', async () => {
  const canvas = { width: 480, height: 640 };
  const env = await bootVista(canvas);
  env.scene.render(vistaView(3));
  const internalH = await shippedIntConst('INTERNAL_H');
  const snapS = await shippedIntConst('SNAP_S');
  const uSnap = { ...snapUniformOf(env) };
  const probe = uSnap.probe;
  const before = vistaCensus(env);
  const writesAtResize = env.reg.colorSets;   // edge writes done; a resize must add none
  assert.strictEqual(probe.uniforms.uSnapGrid.value.x, Math.round(internalH * 480 / 640) / (2 * snapS),
    'boot snap grid follows the shipped rows-driven formula');

  canvas.width = 960;
  canvas.height = 540;
  env.scene.render(vistaView(3));                                   // passive poll re-applies the buffer
  const internalW = Math.round(internalH * 960 / 540);
  assert.strictEqual(probe.uniforms.uSnapGrid.value.x, internalW / (2 * snapS), 'uSnapGrid follows the resize');
  assert.strictEqual(probe.uniforms.uSnapGrid.value.y, internalH / (2 * snapS));
  const dither = env.reg.materials.find(m => m.uniforms && m.uniforms.uInternalRes);
  assert.ok(dither, 'the post quad uniform carrier is reachable');
  assert.strictEqual(dither.uniforms.uInternalRes.value.x, internalW, 'uInternalRes follows the resize');
  assert.strictEqual(dither.uniforms.uInternalRes.value.y, internalH);
  assert.strictEqual(env.reg.colorSets, writesAtResize,
    'the resize never re-applies the vista — the cache survives (kills M5)');
  assert.deepStrictEqual(vistaCensus(env), before, 'the applied vista survives the resize byte-identical');
});

test('§7 reducedMotion true vs false on the same tier shows the identical vista (FR23 base)', async () => {
  const a = await bootVista();
  a.scene.render(vistaView(2, { reducedMotion: true }));
  const b = await bootVista();
  b.scene.render(vistaView(2, { reducedMotion: false }));
  assert.deepStrictEqual(vistaCensus(a), vistaCensus(b), 'motion flags never touch the vista state');
});

// The shared snap uniform rides every world material's onBeforeCompile — same
// probe as the frozen render3d.test.js:158-165 (re-derived, not imported).
function snapUniformOf(env) {
  const mat = env.world.children.find(c => c.material?.onBeforeCompile)?.material;
  assert.ok(mat, 'the stub world scene carries a snap-injected world material');
  mat.userData = {};
  const probe = { uniforms: {}, vertexShader: '#include <project_vertex>' };
  mat.onBeforeCompile(probe);
  return { probe };
}
