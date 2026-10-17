import { createRun, tickRun, applyUpgrade, loadBest, saveBest, startRun, ROPE_PERIOD } from './game.js';
import { createRope } from './rope.js';
import { createPlayer, jump } from './player.js';
import { createScene } from './render3d.js';

const STEP = 1 / 120;

// The buffer tracks the window (coerced so Node-side stub environments
// without innerWidth fall back to the old default and stay green);
// js/render3d.js discovers size changes through its passive poll.
function windowSize() {
  return [Number(window.innerWidth) || 480, Number(window.innerHeight) || 640];
}

export function startGame(canvas) {
  [canvas.width, canvas.height] = windowSize();
  const scene = createScene(canvas);
  const rng = Math.random;
  const hudScore = document.getElementById('hud-score');
  const hudBest = document.getElementById('hud-best');
  const hudPrompt = document.getElementById('hud-prompt');

  let rope = createRope(ROPE_PERIOD);
  let player = createPlayer();
  let run = { ...createRun(), status: 'idle' };
  let prevPhase = rope.phase;
  let holdFrom = null;
  let pressIntent = null;
  let releaseIntent = false;
  let best = loadBest(localStorage);
  let acc = 0;
  let last = performance.now();

  function press() {
    if (pressIntent === null) pressIntent = performance.now();
  }

  function release() {
    releaseIntent = true;
  }

  canvas.addEventListener('pointerdown', press);
  canvas.addEventListener('pointerup', release);
  window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(); } });
  window.addEventListener('keyup', e => { if (e.code === 'Space') release(); });
  window.addEventListener('resize', () => { [canvas.width, canvas.height] = windowSize(); });

  function consumeIntents() {
    if (pressIntent !== null) {
      if (run.status === 'running') {
        holdFrom = pressIntent;
      } else if (run.status === 'idle') {
        ({ rope, player, run } = startRun());
      }
      pressIntent = null;
    }
    if (releaseIntent) {
      if (run.status === 'running' && holdFrom !== null) {
        player = jump(player, (performance.now() - holdFrom) / 1000);
        holdFrom = null;
      } else if (run.status === 'choose' && run.offer) {
        run = applyUpgrade(run, run.offer[0]);
      } else if (run.status === 'over') {
        best = Math.max(best, run.score);
        saveBest(localStorage, best);
        ({ rope, player, run } = startRun());
      }
      releaseIntent = false;
    }
  }

  function updateHud() {
    hudScore.textContent = String(run.score);
    hudBest.textContent = 'best ' + Math.max(best, run.score);
    let prompt = '';
    if (run.status === 'choose' && run.offer) {
      prompt = run.offer[0].name + ' — ' + run.offer[0].desc + ' — tap / space to pick';
    } else if (run.status === 'over') {
      prompt = 'Missed! Score ' + run.score;
    } else if (run.status === 'idle') {
      prompt = 'press space / tap to start';
    } else if (run.status === 'running' && run.skips === 0) {
      prompt = 'press space / tap when the rope reaches your feet';
    }
    hudPrompt.textContent = prompt;
  }

  function frame(now) {
    acc += (now - last) / 1000;
    last = now;
    if (acc > 0.25) acc = 0.25;
    while (acc >= STEP) {
      consumeIntents();
      if (run.status === 'running') {
        prevPhase = rope.phase;
        const out = tickRun(run, rope, player, STEP, rng);
        ({ run, rope, player } = out);
        if (out.tripped) {
          best = Math.max(best, run.score);
          saveBest(localStorage, best);
        }
      } else {
        prevPhase = rope.phase;
      }
      acc -= STEP;
    }
    updateHud();
    try {
      scene.render({ run, rope, player, prevPhase, alpha: acc / STEP, best, now });
    } catch (err) {
      console.error('render failed:', err);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (typeof document !== 'undefined') {
  startGame(document.getElementById('game'));
}
