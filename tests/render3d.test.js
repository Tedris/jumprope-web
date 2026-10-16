import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Regression pin for G-01-1: createScene used to return the bare render
// closure, so shell.js' scene.render(...) threw on the first rAF frame and
// killed the loop. The contract is pinned here without loading the real
// 'three' package or a DOM: js/render3d.js is read as text, its two import
// specifiers are rewritten (stub for the render lib, file: URL for the real
// interpolate module), and the rewritten source is imported as a data: URL.
// No relative specifier into js/ appears in this file, so the SPECIFIER_RE
// walk in tests/boundary.test.js never registers render3d.js as an entry and
// the ARCH-01 three-fence stays green.
const testsDir = dirname(fileURLToPath(import.meta.url));
const render3dPath = resolve(testsDir, '..', 'js', 'render3d.js');
const interpolateHref = pathToFileURL(resolve(testsDir, '..', 'js', 'interpolate.js')).href;

const THREE_STUB_HREF = 'data:text/javascript,' + encodeURIComponent([
  'export class Vec3 {',
  '  constructor() { this.x = 0; this.y = 0; this.z = 0; }',
  '  set(x, y, z) { this.x = x; this.y = y; this.z = z; }',
  '}',
  'export class Node {',
  '  constructor() { this.position = new Vec3(); this.rotation = new Vec3(); }',
  '  add() {}',
  '  setSize() {}',
  '  lookAt() {}',
  '  translate() {}',
  '  set() {}',
  '  render() {}',
  '}',
  'export class WebGLRenderer extends Node {}',
  'export class Scene extends Node {}',
  'export class Color { constructor() {} }',
  'export class PerspectiveCamera extends Node {}',
  'export class PlaneGeometry extends Node {}',
  'export class BoxGeometry extends Node {}',
  'export class MeshBasicMaterial extends Node {}',
  'export class Mesh extends Node {}'
].join('\n'));

async function loadStubbedCreateScene() {
  const src = await readFile(render3dPath, 'utf8');
  const rewritten = src
    .replace(/from\s*['"]three['"]/, `from '${THREE_STUB_HREF}'`)
    .replace(/from\s*['"][^'"]*interpolate\.js['"]/, `from '${interpolateHref}'`);
  const mod = await import('data:text/javascript,' + encodeURIComponent(rewritten));
  return mod.createScene;
}

const stubCanvas = { width: 480, height: 640 };

test('createScene returns a plain object, not the bare render closure', async () => {
  const createScene = await loadStubbedCreateScene();
  const scene = createScene(stubCanvas);
  assert.strictEqual(typeof scene, 'object',
    'G-01-1 contract: createScene must return a plain object, not the bare render closure');
});

test('the returned object exposes a render function', async () => {
  const createScene = await loadStubbedCreateScene();
  const scene = createScene(stubCanvas);
  assert.strictEqual(typeof scene.render, 'function',
    'G-01-1 contract: scene.render must be a function callable by the shell frame loop');
});

test('scene.render runs against the stubbed renderer without throwing', async () => {
  const createScene = await loadStubbedCreateScene();
  const scene = createScene(stubCanvas);
  scene.render({
    run: {},
    rope: { phase: 0.5 },
    player: { y: 0 },
    prevPhase: 0.4,
    alpha: 0.5,
    best: 0
  });
});
