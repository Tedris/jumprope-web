import { createRun, tickRun, applyUpgrade, loadBest, saveBest } from './game.js';
import { createRope } from './rope.js';
import { createPlayer, jump } from './player.js';
import { createScene } from './render3d.js';

const W = 480;
const H = 640;
const STEP = 1 / 120;

export function startGame(canvas) {
  canvas.width = W;
  canvas.height = H;
  const scene = createScene(canvas);
  const hudScore = document.getElementById('hud-score');
  const hudBest = document.getElementById('hud-best');
  const hudPrompt = document.getElementById('hud-prompt');

  let rope = createRope(1.3);
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

  function consumeIntents() {
    if (pressIntent !== null) {
      if (run.status === 'running') {
        holdFrom = pressIntent;
      } else if (run.status === 'idle') {
        rope = { phase: 0.33, period: 1.3 };
        player = jump(player, 0.1);
        run = { ...run, status: 'running' };
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
        rope = { phase: 0.33, period: 1.3 };
        player = jump(createPlayer(), 0.1);
        run = createRun();
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
      prompt = 'press space / tap when the box reaches you';
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
        const out = tickRun(run, rope, player, STEP);
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
    scene.render({ run, rope, player, prevPhase, alpha: acc / STEP, best });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (typeof document !== 'undefined') {
  startGame(document.getElementById('game'));
}
