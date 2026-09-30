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
