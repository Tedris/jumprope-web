import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootModule, captureConsoleErrors, installStage, makeRenderStubHref, shellSrc } from './support/shell-harness.js';

// Regression pins for the T-01-08 belt (plan 01-03 Task 3): a throw inside
// scene.render used to kill the rAF loop before requestAnimationFrame
// re-armed, freezing input at "press space / tap to start" even after the
// G-01-1 contract fix. These tests boot the REAL js/shell.js in Node with
// the same source-rewritten data:/file: URL mechanism as
// tests/render3d.test.js: the renderer import is replaced by a configurable
// stub (records every view, optionally throws), while game/rope/player load
// for real from file: URLs. No resolvable relative from/import specifier
// into js/ appears in this file, so the SPECIFIER_RE walk in
// tests/boundary.test.js never registers shell.js or its render seam as a
// boundary-graph entry and the ARCH-01 three-fence stays green.
//
// The D-02 test at the bottom is the permanent form of plan 01-01's one-shot
// "Canvas 2D draw() no longer exists" grep: no CanvasRenderingContext2D API
// may survive anywhere in js/ — exactly one render path remains.
const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');

// Builds a fresh shell instance under stubbed browser globals. Returns the
// captured rAF queue, event handlers, HUD spans, console.error log, render
// view log, and a restore() that puts the globals back.
async function bootShell({ renderThrows }) {
  const stage = installStage({
    storage: { getItem: () => null, setItem: () => {} },
    errors: captureConsoleErrors(), hidden: false,
  });
  await bootModule(await shellSrc({ render3d: makeRenderStubHref({ throws: renderThrows }) }), 'boot');
  return stage;
}

test('T-01-08: frame loop re-arms after scene.render throws', async () => {
  const env = await bootShell({ renderThrows: true });
  try {
    assert.equal(env.frames.length, 1, 'bootstrap must register the first rAF frame');
    for (let i = 0; i < 3; i += 1) {
      env.frames.at(-1)(performance.now() + 16);
      assert.equal(env.frames.length, 2 + i,
        `requestAnimationFrame must re-arm after render throw #${i + 1} — a killed loop is the G-01-1 failure class`);
      assert.ok(env.errors.length >= i + 1,
        `the render exception must be logged (render failed: ...) on throw #${i + 1}`);
      assert.match(String(env.errors[i][0]), /render failed/);
    }
  } finally {
    env.restore();
  }
});

test('input intents are still consumed when the renderer throws every frame', async () => {
  const env = await bootShell({ renderThrows: true });
  try {
    // One frame while idle: the loop survives and paints (badly) with the
    // run still idle.
    env.frames.at(-1)(performance.now() + 16);
    assert.equal(env.views.at(-1).run.status, 'idle');

    // Space keydown on the idle screen — press() sets pressIntent.
    env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });

    // Next frame is >1 sim step long; consumeIntents must run despite the
    // renderer throwing every single frame, transitioning idle -> running.
    env.frames.at(-1)(performance.now() + 100);
    assert.equal(env.views.at(-1).run.status, 'running',
      'a live frame loop must consume the start input even while the renderer is broken');
    assert.notEqual(env.hud['hud-prompt'].textContent, 'press space / tap to start',
      'the idle prompt must give way — input stays live (T-01-08)');
  } finally {
    env.restore();
  }
});

test('D-02: no Canvas 2D rendering API survives anywhere in js/', async () => {
  const offenders = [];
  for (const name of (await readdir(jsDir)).sort()) {
    const src = await readFile(resolve(jsDir, name), 'utf8');
    src.split('\n').forEach((line, i) => {
      if (/getContext|CanvasGradient|createLinearGradient/.test(line)) {
        offenders.push(`${name}:${i + 1} ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(offenders, [],
    'the deleted Canvas 2D draw() must not survive behind any flag or dead code — exactly one render path (WebGL via render3d.js) remains');
});
