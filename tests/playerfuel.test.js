import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CARDS, pickOffers, offerCount } from '../js/upgrades.js';
import { startRun } from '../js/game.js';

// Story 8.5 (FR37 regression pin, NFR14, the 7.5 metagate pattern): nothing
// installed, nothing changed — the Player Fuel PROVE. Epic 8's four surfaces
// (8.1 seam, 8.2 URL equip, 8.3 JSON manifest, 8.4 the shelved .glb spike) are
// inert against the default boot; this suite makes the inertness a WITNESSED
// property: identity-addressed shipped-default materials, the zero-request
// tripwire with its non-vacuity twin, the static #hud shape, the closed
// three-key storage space, the zero-sim-adjacency census, the R1 pairing fence
// guarding the skins §g five-tier extension, and the mod-applied twin (the
// renderer arm LIVE, the sim arm PROVABLY inert). ZERO product code is this
// story's shape (D1): the js/ + index.html + css/ + tests/support/ byte-zero
// law is AC1's diff fact, and the working-tree half lives inside §c below.
//
// Donor craft, COPIED never imported (the suites are self-contained): the
// three-stub boot from tests/skins.test.js:106-121 (identity-address law: the
// three character materials are the FIRST THREE constructions, render3d.js:
// 191-193, in order rose/limb/prop — birthHex-addressing is DEAD on the seam),
// the withFetch/responseFor channels and the mirror boot from
// tests/mods.test.js:209-243, the shippedConst/table/normalizeSkin extraction
// family from the same file, the withLocation stub from tests/equip.test.js:
// 177-187, the byte-identical-to-HEAD arm from equip §f:363-373, the readdir
// key census from tests/metalegger.test.js:109-138, the pausemenu L5 #hud form
// (pausemenu.test.js:571-579), and the counting wrapper from
// tests/locks.test.js:25-29. shell.js cannot be imported (boot IO), so the
// shipped function text IS the seam — mirror drift reddens HERE, never a
// frozen file (the pairing-fence direction).

const runGit = promisify(execFile);
const testsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(testsDir, '..');
const jsDir = resolve(rootDir, 'js');
const render3dPath = resolve(jsDir, 'render3d.js');
const shellPath = resolve(jsDir, 'shell.js');
const skinsTestPath = resolve(testsDir, 'skins.test.js');
const modsAssetPath = resolve(rootDir, 'mods', 'mint.json');
const interpolateHref = pathToFileURL(resolve(jsDir, 'interpolate.js')).href;

const THREE_PF_STUB_HREF = 'data:text/javascript,' + encodeURIComponent([
  'export const NearestFilter = 1003;',
  'globalThis.__pfReg ||= { scenes: [], meshes: [], materials: [], geometries: [], targets: [], colorSets: 0 };',
  'const reg = globalThis.__pfReg;',
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

// Boot the renderer through the seam (the skins :106-121 / mods :116-129
// donor): skin is the record-as-DATA argument; undefined = the inert shipped
// path the default boot takes.
async function bootSkin(skin, canvas = { width: 480, height: 640 }) {
  const src = await readFile(render3dPath, 'utf8');
  const rewritten = src
    .replace(/from\s*['"]three['"]/, `from '${THREE_PF_STUB_HREF}'`)
    .replace(/from\s*['"][^'"]*interpolate\.js['"]/, `from '${interpolateHref}'`);
  const mod = await import('data:text/javascript,' + encodeURIComponent(`${rewritten}\n//playerfuel boot ${++boots}`));
  const reg = globalThis.__pfReg;
  for (const k of Object.keys(reg)) reg[k] = Array.isArray(reg[k]) ? [] : 0;
  const scene = mod.createScene(canvas, skin);
  const world = reg.scenes[0];
  // IDENTITY-ADDRESS law: the character materials are the first three
  // constructions, in order rose, limb, prop (render3d.js:191-193).
  const mats = reg.materials.slice(0, 3);
  return { scene, reg, world, mats };
}

// Text-derive a shipped `const NAME = 0x...` value (the derive-literals rule:
// never re-type a signed-off hex in a test — the shippedConst donor family).
async function shippedConst(name) {
  const src = await readFile(render3dPath, 'utf8');
  const m = src.match(new RegExp(`const ${name} = (0x[0-9a-fA-F]+|0\\.\\d+)`));
  assert.ok(m, `the shipped look constant ${name} is present in js/render3d.js`);
  return Number(m[1]);
}

// Cross-source extraction (the mods :145-182 family): the shipped factories
// ARE the mechanism under test; the loader references the validator BY NAME,
// so the extraction keeps the shipped wiring (pairing fence).
async function modsFactories() {
  const src = await readFile(shellPath, 'utf8');
  const cap = src.match(/^const MOD_MANIFEST_MAX_BYTES = \d+;$/m);
  assert.ok(cap, 'the shipped MOD_MANIFEST_MAX_BYTES literal is present in js/shell.js at module scope (pairing fence)');
  const deadline = src.match(/^const MOD_MANIFEST_TIMEOUT_MS = \d+;$/m);
  assert.ok(deadline, 'the shipped MOD_MANIFEST_TIMEOUT_MS literal is present in js/shell.js at module scope (pairing fence)');
  const parse = src.match(/function parseModManifest\(text\) \{[\s\S]*?\n\}/);
  assert.ok(parse, 'the shipped parseModManifest factory is present in js/shell.js (pairing fence)');
  const mods = src.match(/function resolveModsParam\(search\) \{[\s\S]*?\n\}/);
  assert.ok(mods, 'the shipped resolveModsParam factory is present in js/shell.js (pairing fence)');
  const load = src.match(/async function loadModManifest\(url\) \{[\s\S]*?\n\}/);
  assert.ok(load, 'the shipped loadModManifest factory is present in js/shell.js (pairing fence)');
  return new Function(
    `${cap[0]}\n${deadline[0]}\n${parse[0]}\n${mods[0]}\n${load[0]};`
    + ' return { MOD_MANIFEST_MAX_BYTES, MOD_MANIFEST_TIMEOUT_MS, parseModManifest, resolveModsParam, loadModManifest };'
  )();
}

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

// The read-channel stubs (the mods :209-224 donor law): set IMMEDIATELY
// before the call, ALWAYS restored in finally — a leaked channel would
// retint later suites' request legs (the Pitfall).
async function withFetch(stub, fn) {
  const had = 'fetch' in globalThis;
  const prev = globalThis.fetch;
  if (stub === undefined) delete globalThis.fetch;
  else globalThis.fetch = stub;
  try {
    return await fn();
  } finally {
    if (had) globalThis.fetch = prev; else delete globalThis.fetch;
  }
}

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

// A response over fixed JSON text: ok-flagged, byte-exact.
function responseFor(text, { ok = true } = {}) {
  return { ok, arrayBuffer: async () => new TextEncoder().encode(text).buffer };
}

// The mirror boot (the mods :231-243 donor): the shipped module-scope seam
// VERBATIM (js/shell.js :202-203 guard + pre-resolution, :233 composition
// tail), test-local because shell.js cannot be imported. The recorder is the
// prove suite's instrument — the seam lines themselves stay verbatim, and the
// shipped-text fences are §e's and the frozen mods suite's pairing legs.
async function mirrorBoot(search, serveText, recorder = null) {
  const { loadModManifest, resolveModsParam } = await modsFactories();
  const resolveSkinParam = await resolverFromShell();
  const normalizeSkin = await normalizeSkinFromShell();
  const SKINS = await tableFromShell();
  return withFetch(url => {
    if (recorder) recorder.push(url);
    return Promise.resolve(responseFor(serveText));
  }, () =>
    withLocation(search, async () => {
      const equipSearch = typeof location !== 'undefined' && location.search ? location.search : '';
      const modManifest = await loadModManifest(resolveModsParam(equipSearch));
      return bootSkin(normalizeSkin(resolveSkinParam(equipSearch, SKINS) ?? modManifest?.skin));
    }));
}

// Boot-arm rng census (review round BH-1): count Math.random draws across a
// mirrorBoot. The shipped renderer/boot draws ZERO (render3d.js:679 law,
// shell never draws at boot) — so a boot-time rng leak into ANY arm reddens
// its count, and the twin's equality is witnessed at the boot, not inferred
// from streams a boot cannot reach.
async function rngCensus(fn) {
  const real = Math.random;
  let draws = 0;
  Math.random = () => { draws++; return real(); };
  try {
    return { result: await fn(), draws };
  } finally {
    Math.random = real;
  }
}

// Seeded LCG (numerical-recipes constants, exact 32-bit via Math.imul) and
// the counting wrapper (the locks.test.js:15-29 donor) — the rng-never-shift
// law is OBSERVED (equal call counts), never argued. The boot census
// (rngCensus, review round BH-1) makes the BOOT ARMS themselves observable:
// the shipped renderer consumes zero randomness at boot (render3d.js:679),
// so any boot-time rng leak reddens the draw count, never rides a stream.
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function counting(seed) {
  const next = seeded(seed);
  const rng = () => { rng.calls += 1; return next(); };
  rng.calls = 0;
  return rng;
}

// The deal-stream twin arm (the locks :161/:188 donor craft): startRun()
// fresh-view per seed — there is NO shapes play in this story, so the
// veteran-shape argument never appears (7-5 :72) — then sequential shipped
// pickOffers calls through ONE counting rng. Offer ids + consumption only;
// zero current-build numerics (seed-honesty, deferred-work.md :259).
function dealStream() {
  const ids = [];
  const calls = [];
  for (let seed = 1; seed <= 10; seed++) {
    const rng = counting(seed);
    const { run } = startRun();
    for (let n = 0; n < 3; n++) {
      ids.push(pickOffers(CARDS, run.owned ?? {}, offerCount(run.skips), rng,
        { ropes: run.ropes, charged: run.charged }, run.lockedIds ?? []).map(card => card.id));
    }
    calls.push(rng.calls);
  }
  return { ids, calls };
}

// ---------------------------------------------------------------------------
// §a The shipped-default materials (AC2a; D3 leg (a), TWO arms)
// ---------------------------------------------------------------------------

test('§a(1) the default boot carries the shipped colors on the identity-addressed trio — ZERO color writes (AC2a runtime arm)', async () => {
  const env = await bootSkin(undefined);
  const defaults = [await shippedConst('ROSE'), await shippedConst('FLOOR'), await shippedConst('PROP')];
  assert.deepEqual(env.mats.map(m => m.color.hex), defaults,
    'rose/limb/prop carry the DERIVED shipped defaults [ROSE, FLOOR, PROP] — never inlined (the identity-address law: the FIRST THREE constructions, render3d.js:191-193, in order rose/limb/prop)');
  assert.equal(env.reg.colorSets, 0,
    'EXACTLY zero color writes at the default boot — the skins §d inert tripwire re-observed inside the prove suite (FR37)');
});

test('§a(2) the material-construction census is unchanged source-side — five shipped token counts (AC2a source arm)', async () => {
  const src = await readFile(render3dPath, 'utf8');
  assert.equal((src.match(/worldMaterial\(/g) ?? []).length, 7,
    'the worldMaterial pipeline census holds (the skins §f donor :336-345 — definition, five constructor calls, one comment mention)');
  assert.equal((src.match(/roseMat\.color\.set\(/g) ?? []).length, 1, 'the body-material single-writer law is untouched');
  assert.equal((src.match(/limbMat\.color\.set\(/g) ?? []).length, 1, 'the limbMat twin likewise (the 8.1 D1 loop form is why)');
  assert.equal((src.match(/new THREE\.MeshLambertMaterial/g) ?? []).length, 1,
    'the single builder body remains (render3d.js:180) — no constructor was ever added');
  assert.equal((src.match(/new THREE\.MeshBasicMaterial/g) ?? []).length, 4,
    'the four named constructions remain (render3d.js:241/:364/:383/:402) — the materials census is OBSERVED unchanged here');
});

// ---------------------------------------------------------------------------
// §b The zero-request default-boot law + its non-vacuity twin (AC2b; D3 (b))
// ---------------------------------------------------------------------------

test('§b(1) a boot with no query params NEVER touches the network channel (AC2b, NFR14 — the mods §c donor)', async () => {
  const { loadModManifest, resolveModsParam } = await modsFactories();
  assert.equal(resolveModsParam(''), null,
    "'' resolves to NO path — the !url short-circuit runs BEFORE the typeof probe (the mods §c :462-470 default-boot-law donor)");
  let touched = false;
  const out = await withFetch(url => { touched = true; return Promise.resolve(responseFor('{"v":1,"name":"x"}')); },
    () => loadModManifest(resolveModsParam('')));
  assert.equal(out, null, 'the absent-param boot is null — shipped defaults');
  assert.equal(touched, false, 'the channel was NEVER TOUCHED at the factory seam (NFR14 zero-extra-request law)');
  const calls = [];
  await mirrorBoot('', await readFile(modsAssetPath, 'utf8'), calls);
  assert.deepEqual(calls, [], 'and the mirror-composition boot with location.search = "" touched it ZERO times — the shipped default boot makes zero requests');
});

test('§b(2) non-vacuity twin: ?mods=mods/mint.json touches the channel EXACTLY ONCE, url verbatim — the census can SEE requests (AC2b)', async () => {
  const served = await readFile(modsAssetPath, 'utf8'); // committed bytes, served via responseFor (the mods §c :403 donor)
  const calls = [];
  await mirrorBoot('?mods=mods/mint.json', served, calls);
  assert.deepEqual(calls, ['mods/mint.json'],
    'EXACTLY ONE request, the resolved PATH verbatim — so the zero above means something; count-2 would be a boot-budget violation (NFR14)');
});

// ---------------------------------------------------------------------------
// §c The static #hud shape + the working-tree chrome fence (AC2c; D3 (c))
// ---------------------------------------------------------------------------

test('§c the #hud shape census is unchanged: five static children in shipped document order; index.html/css byte-identical to HEAD (AC2c)', async () => {
  const html = await readFile(resolve(rootDir, 'index.html'), 'utf8');
  const hudStart = html.indexOf('<div id="hud"');
  const hudEnd = html.indexOf('</div>', hudStart);
  assert.ok(hudStart >= 0 && hudEnd > hudStart, 'the #hud block exists (the pausemenu L5 :571-579 donor form)');
  const block = html.slice(hudStart, hudEnd);
  const ids = ['hud-score', 'hud-best', 'hud-ropes', 'hud-prompt', 'hud-owned'];
  const at = ids.map(id => block.indexOf(`id="${id}"`));
  assert.ok(at.every(i => i >= 0), 'the five STATIC #hud children all ship (index.html untouched)');
  assert.equal((block.match(/<span/g) ?? []).length, 5,
    'EXACTLY five <span> children inside #hud — a SIXTH static child is chrome creep this AC2c witness exists to catch (review round BH-2); a non-span wrapper reddens the id-presence assert above');
  assert.deepEqual(at, [...at].sort((a, b) => a - b),
    'the static #hud children stay in shipped document order — the panel is runtime-built, never markup-built (NFR6); the runtime half stays untouched-green in pausemenu L1/L5 own boots');
  for (const p of ['index.html', 'css/style.css']) {
    let head;
    try {
      ({ stdout: head } = await runGit('git', ['show', `HEAD:${p}`], { encoding: 'buffer', maxBuffer: 1 << 24 }));
    } catch (err) {
      if (/not a git repository|bad revision|invalid object/i.test(String(err.stderr) + String(err.message))) continue; // no VCS for THIS file: skip it, keep checking the other (review BH-2)
      throw err;
    }
    const work = await readFile(resolve(rootDir, p));
    assert.ok(work.equals(Buffer.from(head)), `${p} is byte-identical to HEAD — working-tree chrome dirt dies here; COMMITTED chrome drift is owned by the §6 twins (neither file sits in an allow-set) — this leg owns uncommitted drift (review BH-2/EH-1)`);
  }
});

// ---------------------------------------------------------------------------
// §d The three-key storage census — armed, unspent (AC2d; D3 (d))
// ---------------------------------------------------------------------------

test('§d the boot storage keys are EXACTLY the shipped three at the shipped sites; shell.js holds ZERO (AC2d — armed, not spent)', async () => {
  // The source-side census (the 7.5-style arm; the runtime walk stays the
  // frozen pausemenu L2 leg — this story refuses the expensive duplicate).
  // The readdir idiom is the metalegger :109-138 donor form.
  const files = (await readdir(jsDir)).filter(f => f.endsWith('.js')).sort();
  const sites = {};
  const literals = new Set();
  for (const f of files) {
    const src = await readFile(resolve(jsDir, f), 'utf8');
    const hits = [...src.matchAll(/['"`](jumprope-[^'"`]+)['"`]/g)].map(m => m[1]);
    if (hits.length > 0) sites[f] = hits;
    for (const h of hits) literals.add(h);
  }
  assert.deepEqual([...literals].sort(), ['jumprope-audio', 'jumprope-best', 'jumprope-meta'],
    'the jumprope-* literal set across js/ is EXACTLY the shipped three — the retro :58 fourth-key tripwire stays ARMED, UNSPENT; no leg here pays it (pausemenu L2 :432 remains the runtime witness)');
  assert.deepEqual(sites, {
    'audio.js': ['jumprope-audio'],                                    // the shipped site audio.js:7
    'game.js': ['jumprope-best', 'jumprope-best', 'jumprope-meta', 'jumprope-meta'] // best :339/:347, meta :367/:390
  }, 'the five shipped literal sites are the WHOLE map — js/shell.js holds ZERO occurrences (the equip §e :353-358 donor: a jumprope-skin key would need written STOP-AND-ASK + the pausemenu L2 re-contract)');
});

// ---------------------------------------------------------------------------
// §e Zero sim adjacency — the sim CANNOT see a skin (AC4 structural half; D5)
// ---------------------------------------------------------------------------

test('§e zero-sim-adjacency: js/game.js carries ZERO skin tokens, createScene(canvas, skin) is the ONE consumer, modManifest lives ONLY in shell.js (AC4, D5)', async () => {
  const gameCode = (await readFile(resolve(jsDir, 'game.js'), 'utf8')).replace(/^[ \t]*\/\/.*$/gm, '');
  assert.equal((gameCode.match(/\bskin/ig) ?? []).length, 0,
    'js/game.js contains ZERO skin tokens (comment-stripped, the BH-3 lesson) — the sim literally cannot see a skin (FR37; startRun(lockedIds) game.js:108 takes no cosmetic input)');
  const render = await readFile(render3dPath, 'utf8');
  assert.equal((render.match(/createScene\(canvas, skin\)/g) ?? []).length, 1,
    'the skin enters the product ONLY at the ONE createScene signature (render3d.js:154 — the one-seam law)');
  const files = (await readdir(jsDir)).filter(f => f.endsWith('.js')).sort();
  const counts = {};
  for (const f of files) {
    counts[f] = (await readFile(resolve(jsDir, f), 'utf8')).match(/modManifest/g)?.length ?? 0;
  }
  assert.ok(counts['shell.js'] > 0, 'js/shell.js holds the modManifest tokens — the loader is SHELL-INTERNAL');
  for (const [f, n] of Object.entries(counts)) {
    if (f === 'shell.js') continue;
    assert.equal(n, 0, `js/${f} holds ZERO modManifest tokens — fetch/parse/eval NEVER enters the sim graph (the boundary fence, purity rider :1159)`);
  }
});

// ---------------------------------------------------------------------------
// §f The R1 pairing fence — the five-tier loop cannot silently revert
// ---------------------------------------------------------------------------

test('§f the R1 pairing fence: the five-tier loop appears EXACTLY ONCE in skins.test.js (the §g extension is the shipped shape)', async () => {
  const src = await readFile(skinsTestPath, 'utf8');
  assert.equal((src.match(/for \(const tier of \[1, 2, 3, 4, 5\]\)/g) ?? []).length, 1,
    'the R1 extension is REAL in the shipped witness (epics.md:1186) — a silent revert to the three-tier loop reddens HERE, the mods §f :640 donor form');
});

// ---------------------------------------------------------------------------
// §g The mod-applied twin: renderer LIVE, sim inert (AC4; D5).
// Band-gate rider UNTRIGGERED — P1 cosmetic-only (prd.md :137): no
// deal/physics touch — sweep unchanged; the sweep numerics ride the 7.5 D3
// :29-33 citation in the story record, never a leg (seed-honesty :259).
// ---------------------------------------------------------------------------

test('§g the mod-applied twin: the shipped example mod RECOLORS the renderer arm while the same-seed deal streams + rng draws stay IDENTICAL to the bare boot (AC4)', async () => {
  const text = await readFile(modsAssetPath, 'utf8');
  const mint = JSON.parse(text).skin.colors; // DERIVED from the committed witness — never re-typed
  // Arm A — the bare composition; the deal stream is observed right after it.
  const bareCalls = [];
  const bareArm = await rngCensus(() => mirrorBoot('', text, bareCalls));
  const bare = bareArm.result;
  assert.deepEqual(bareCalls, [], 'the bare composition requested nothing (the NFR14 law, one more witness)');
  assert.equal(bare.reg.colorSets, 0, 'and its materials ride the shipped defaults (colorSets 0)');
  assert.equal(bareArm.draws, 0, 'the bare BOOT drew ZERO shipped rng (review round BH-1: the boot arm is OBSERVED, not argued)');
  const A = dealStream();
  // Arm B — the skin-carrying composition: ?mods=mods/mint.json served from
  // the committed bytes (the mods §d :483 donor — live proof the mod DID apply).
  const modCalls = [];
  const modArm = await rngCensus(() => mirrorBoot('?mods=mods/mint.json', text, modCalls));
  const modded = modArm.result;
  assert.deepEqual(modCalls, ['mods/mint.json'], 'the manifest read EXACTLY one request, url verbatim');
  assert.deepEqual(modded.mats.map(m => m.color.hex), [mint.rose, mint.limb, mint.prop],
    'the three identity-addressed materials carry the mint hexes — the shipped example mod APPLIES through the ONE seam');
  assert.equal(modded.reg.colorSets, 3, 'EXACTLY three color writes — the 8.1 application law unchanged, once per material');
  assert.equal(modArm.draws, 0, 'the skin-carrying BOOT drew ZERO shipped rng TOO — the manifest path never touches the shipped randomness at boot (review round BH-1)');
  const B = dealStream();
  assert.deepEqual(B.ids, A.ids,
    'the same-seed offer-id streams are deepEqual between the bare and the skin-carrying compositions — the sim never sees the boot (D5, the deal twin at seeds 1..10; BH-3: the LCG guard aliases seeds 0 and 1, so 0..9 would witness 9 streams)');
  assert.deepEqual(B.calls, A.calls,
    'identical rng consumption across the twin (the locks :25-29/:166 law) — no draw ever shifted; the streams share a LOCAL seeded() (their invariance witness), and the BOOT arms are censused SEPARATELY above for zero shipped-rng draws (review round BH-1: boot-induced shifts land in the census, never hide in a stream)');
});
