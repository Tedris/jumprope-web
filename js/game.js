import { createRope, updateRope, atFeet } from './rope.js';
import { createPlayer, jump, updatePlayer, clearsRope } from './player.js';
import { UPGRADES, freshEffects, pickTwo, shouldOfferUpgrade } from './upgrades.js';

export function createRun() {
  return { status: 'running', score: 0, skips: 0, effects: freshEffects(), offer: null };
}

export function tickRun(run, rope, player, dt) {
  const nextRope = updateRope(rope, dt * run.effects.ropeMul);
  const nextPlayer = updatePlayer(player, dt, 1800 / run.effects.floatMul);
  let { score, skips, status, offer } = run;
  let tripped = false;
  const wasFeet = atFeet(rope);
  const isFeet = atFeet(nextRope);
  if (!wasFeet && isFeet) {
    const minHeight = 18 / run.effects.windowMul;
    if (clearsRope(nextPlayer.y, minHeight)) {
      score += run.effects.scoreMul;
      skips += 1;
      if (shouldOfferUpgrade(skips)) {
        status = 'choose';
        offer = pickTwo(UPGRADES, Math.random);
      }
    } else {
      status = 'over';
      tripped = true;
    }
  }
  return { run: { ...run, score, skips, status, offer }, rope: nextRope, player: nextPlayer, tripped };
}

export function applyUpgrade(run, upgrade) {
  return { ...run, effects: upgrade.apply(run.effects), offer: null, status: 'running' };
}

export function loadBest(storage) {
  try {
    return Number(storage.getItem('jumprope-best')) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(storage, score) {
  try {
    storage.setItem('jumprope-best', String(score));
  } catch {
    // storage unavailable; best score is session-only
  }
}

const W = 480;
const H = 640;
const STEP = 1 / 120;

export function startGame(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;

  let rope = createRope(0.9);
  let player = createPlayer();
  let run = createRun();
  let holdFrom = null;
  let best = loadBest(localStorage);
  let acc = 0;
  let last = performance.now();

  function press() {
    if (run.status === 'running') {
      holdFrom = performance.now();
    }
  }

  function release() {
    if (run.status === 'running' && holdFrom !== null) {
      const hold = (performance.now() - holdFrom) / 1000;
      player = jump(player, hold);
      holdFrom = null;
    } else if (run.status === 'choose' && run.offer) {
      run = applyUpgrade(run, run.offer[0]);
    } else if (run.status === 'over') {
      best = Math.max(best, run.score);
      saveBest(localStorage, best);
      rope = createRope(0.9);
      player = createPlayer();
      run = createRun();
    }
  }

  canvas.addEventListener('pointerdown', press);
  canvas.addEventListener('pointerup', release);
  window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(); } });
  window.addEventListener('keyup', e => { if (e.code === 'Space') release(); });

  function step() {
    if (run.status !== 'running') return;
    const out = tickRun(run, rope, player, STEP);
    run = out.run;
    rope = out.rope;
    player = out.player;
    if (out.tripped) {
      best = Math.max(best, run.score);
      saveBest(localStorage, best);
    }
  }

  function draw() {
    ctx.fillStyle = '#f7f3e8';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#3a3a55';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - 80);
    ctx.lineTo(W, H - 80);
    ctx.stroke();

    const cx = W / 2;
    const feet = H - 80;
    const sq = player.squash;
    const bodyH = 70 * (2 - sq);
    const bodyW = 46 * sq;
    const yBase = feet - player.y;
    const theta = rope.phase * Math.PI * 2;
    const bob = Math.sin(theta) * 2;

    ctx.fillStyle = '#c94f6d';
    ctx.fillRect(cx - bodyW / 2, yBase - bodyH, bodyW, bodyH);
    ctx.beginPath();
    ctx.arc(cx, yBase - bodyH - 16 + bob, 18 * Math.sqrt(sq), 0, Math.PI * 2);
    ctx.fill();

    const sway = Math.sin(theta) * 5;
    const handY = yBase - bodyH - 6;
    const lx = cx - bodyW / 2 - 4 + sway;
    const rx = cx + bodyW / 2 + 4 + sway;
    ctx.lineCap = 'round';

    ctx.strokeStyle = '#a84b66';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - bodyW / 2, yBase - bodyH + 6);
    ctx.lineTo(lx, handY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + bodyW / 2, yBase - bodyH + 6);
    ctx.lineTo(rx, handY);
    ctx.stroke();

    ctx.strokeStyle = '#5f4327';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(lx, handY);
    ctx.lineTo(lx - 6, handY + 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rx, handY);
    ctx.lineTo(rx + 6, handY + 9);
    ctx.stroke();

    const bow = Math.sin(theta) * 12;
    ctx.strokeStyle = '#7a5c3e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx - 6, handY + 9);
    ctx.quadraticCurveTo(cx + bow, handY - Math.cos(theta) * 130, rx + 6, handY + 9);
    ctx.stroke();
    ctx.lineWidth = 1;

    ctx.fillStyle = '#222';
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(run.score), cx, 60);
    ctx.font = '16px sans-serif';
    ctx.fillText('best ' + Math.max(best, run.score), cx, 84);

    if (run.status === 'choose' && run.offer) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(40, 240, W - 80, 140);
      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.fillText(run.offer[0].name + ' — ' + run.offer[0].desc, cx, 290);
      ctx.fillText('tap / space to pick', cx, 350);
    }
    if (run.status === 'over') {
      ctx.fillStyle = '#222';
      ctx.font = '28px sans-serif';
      ctx.fillText('Tripped! Score ' + run.score, cx, 300);
    }
    if (run.status === 'running' && run.skips === 0) {
      ctx.fillStyle = '#555';
      ctx.font = '18px sans-serif';
      ctx.fillText('press space / tap when the rope comes', cx, 140);
    }
  }

  function frame(now) {
    acc += (now - last) / 1000;
    last = now;
    if (acc > 0.25) acc = 0.25;
    while (acc >= STEP) {
      step();
      acc -= STEP;
    }
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (typeof document !== 'undefined') {
  startGame(document.getElementById('game'));
}
