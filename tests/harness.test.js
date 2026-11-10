import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bootModule, captureConsoleErrors, fileHref, installStage, installVirtualClock,
  makeGameWrapHref, makeRenderStubHref, mapStorage, settle, shellSrc,
} from './support/shell-harness.js';

// The consolidation suite (chore test-harness + CI): source fences over the
// story's product/CI deltas, the boot-fork census, and the behavior legs for
// the shared primitives themselves. Boots: EXACTLY 2 (H1, H2) — both booted
// THROUGH the module, proving the primitives under test. No relative
// specifier into js/ (pathToFileURL seams only — boundary.test.js doctrine);
// the fences read js/ and .github/ by file path.

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const BOOT_SUITES = [
  'shell.test.js', 'uxpolish.test.js', 'altitude.test.js', 'ascent.test.js',
  'pausemenu.test.js', 'polish.test.js', 'leadinhop.test.js',
];

// ---------- source fences ----------

test('fence: saveBest( appears EXACTLY once in js/shell.js — the trip write is the one save site', async () => {
  const src = await readFile(resolve(jsDir, 'shell.js'), 'utf8');
  assert.equal((src.match(/saveBest\(/g) ?? []).length, 1,
    'FR22 single save path: the over-restart write is deleted (ledger :50) — the observable it '
    + 'duplicated stays pinned by the existing legs (winloss.test.js persistent-best leg, the '
    + 'altitude restart/max shell legs, the ascent summit-win leg)');
  assert.match(src, /if \(out\.tripped \|\| run\.outcome === 'summit'\) \{[^}]*saveBest\(localStorage, best\);/,
    'the surviving call sits in the trip/summit arm — the single surviving path (shell.js D-N02 site)');
  assert.doesNotMatch(src, /restartArmed = false;\s*\n\s*best = Math\.max/,
    'the restart branch never re-derives best');
});

test('fence: the CI workflow carries the [18, 26] matrix, tags-ignore, concurrency, and the unchanged oracle', async () => {
  const yml = await readFile(resolve(testsDir, '..', '.github', 'workflows', 'test.yml'), 'utf8');
  assert.match(yml, /node-version:\s*\[\s*18\s*,\s*26\s*\]/,
    'the matrix names the documented floor >= 18 (AGENTS.md) and the current tip (ledger :117)');
  assert.match(yml, /node-version:\s*\$\{\{\s*matrix\.node-version\s*\}\}/,
    'setup-node consumes the matrix entry — one job definition, two runs');
  assert.match(yml, /tags-ignore:\s*\[.*\*\*.*\]/,
    'tag pushes never trigger a push run (ledger :118)');
  assert.match(yml, /concurrency:/, 'per-ref run coalescing (ledger :118)');
  assert.match(yml, /cancel-in-progress:\s*false/, 'in-flight runs of the same ref are never cancelled');
  assert.match(yml, /run:\s*\.\/run_tests\.sh/, 'the oracle line is unchanged (VERIFY-CONTRACT rule 8)');
  assert.doesNotMatch(yml, /\b(npm (i|ci|install|add)|yarn|pnpm)\b/, 'zero dependencies preserved');
});

test('fork census: the seven boot suites author zero data-URL modules — tests/support/shell-harness.js is the single author', async () => {
  for (const name of BOOT_SUITES) {
    const src = await readFile(resolve(testsDir, name), 'utf8');
    assert.equal((src.match(/data:text\/javascript,/g) ?? []).length, 0,
      `${name} still authors a data-URL module inline — fold it into the shared primitives`);
  }
});

// ---------- behavior legs (the ONLY two boots) ----------

test('H1: a 1000 ms virtual-clock jump closes the D-07 re-entry window with zero wall time', async () => {
  const stage = installStage({
    storage: mapStorage(new Map()),
    clock: installVirtualClock(), errors: captureConsoleErrors(),
  });
  // Rope parked (leadinhop idiom): the acc-burst frame can never trip mid-leg.
  const game = makeGameWrapHref(fileHref('game.js'), `
  export const tickRun = (...a) => real.tickRun(a[0], { ...a[1], phase: 0.05, period: 100 }, ...a.slice(2));`);
  await bootModule(await shellSrc({ render3d: makeRenderStubHref(), game }), 'harness-clock-boot');
  await settle();
  try {
    const wall0 = Date.now();
    const pump = (ms = 50) => stage.frames.at(-1)(stage.clock.advance(ms));
    stage.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    pump();
    assert.equal(stage.views.at(-1).run.status, 'running', 'the opening press started the run');
    stage.document.hidden = true;
    stage.handlers.window.visibilitychange(); // D-04 visibility pause
    stage.document.hidden = false;
    stage.handlers.window.visibilitychange(); // resume arms reentryAt = now (D-07 lead-in)
    stage.clock.advance(1000); // ONE virtual jump — the leg must never sleep
    pump(16); // the acc clamp burns 250 ms of the hop in one frame
    for (let i = 0; i < 6; i += 1) pump(50); // the rest of the 444 ms hop lands on virtual time
    assert.equal(stage.views.at(-1).player.grounded, true, 'the lead-in hop landed on the jump');
    stage.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    pump(16);
    stage.handlers.window.keyup({ code: 'Space' });
    pump(16);
    assert.equal(stage.views.at(-1).player.grounded, false,
      'the release PAST the window launches — the window closed on virtual time alone; '
      + 'a dropped performance stub leaves the shell on wall time and stays locked');
    assert.ok(Date.now() - wall0 < 250, 'zero wall time elapsed: 1000 ms of shell time, ~0 ms of real time');
  } finally {
    stage.restore();
  }
});

test('H2: a renderer throw routes through console.error into env.errors — the capture wiring is live', async () => {
  const stage = installStage({
    storage: mapStorage(new Map()),
    clock: installVirtualClock(), errors: captureConsoleErrors(),
  });
  await bootModule(await shellSrc({ render3d: makeRenderStubHref({ throws: true }) }), 'harness-error-boot');
  await settle();
  try {
    stage.frames.at(-1)(stage.clock.advance(16));
    assert.ok(stage.errors.length >= 1,
      'the frame-loop catch logged through the spied console.error — dropped capture wiring runs this red');
    assert.match(String(stage.errors[0][0]), /render failed/,
      'the error-leg pattern holds: shell.js:756 is the product console.error site and it lands in env.errors');
  } finally {
    stage.restore();
  }
});
