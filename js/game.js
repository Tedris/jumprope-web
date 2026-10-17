import { updateRope, atFeet } from './rope.js';
import { jump, createPlayer, updatePlayer, clearsRope } from './player.js';
import { CARDS, freshEffects, pickOffers, shouldOfferUpgrade, offerCount } from './upgrades.js';

// Shell-side HUD reads the catalogue through game.js: tests/shell.test.js's
// frozen bootShell harness only rewrites the game/rope/player/render3d
// specifiers, so shell.js must not gain a direct './upgrades.js' import.
export { CARDS } from './upgrades.js';

export const START_PHASE = 0.33;
export const ROPE_PERIOD = 1.3;

// The one canonical lead-in (ARCH-02): both cold start and post-pick resume
// compose this exact pair — never duplicate the constants.
export function leadIn() {
  return {
    rope: { phase: START_PHASE, period: ROPE_PERIOD },
    player: jump(createPlayer(), 0.1),
  };
}

export function startRun() {
  return { ...leadIn(), run: { ...createRun(), status: 'running' } };
}

export function resumeRun(run) {
  return { ...leadIn(), run: { ...run, status: 'running', offer: null } };
}

export function createRun() {
  return { status: 'running', score: 0, skips: 0, effects: freshEffects(), offer: null, owned: {} };
}

export function tickRun(run, rope, player, dt, rng = Math.random) {
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
        const offers = pickOffers(CARDS, run.owned ?? {}, offerCount(skips), rng);
        // Pitfall 6: an exhausted pool must never freeze the run in choose.
        if (offers.length > 0) {
          status = 'choose';
          offer = offers;
        }
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

// status stays untouched — resumeRun owns the running transition (D-06).
export function applyCard(run, card) {
  return {
    ...run,
    effects: card.apply(run.effects),
    owned: { ...run.owned, [card.id]: (run.owned[card.id] ?? 0) + 1 },
    offer: null,
  };
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
