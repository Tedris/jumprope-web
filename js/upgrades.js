export const CARDS = [
  { id: 'float', name: 'Cloud Shoes', desc: '+15% hang time', icon: '☁',
    role: 'foundation', color: 'sky', rarity: 'common', cap: 4,
    apply: s => ({ ...s, floatMul: s.floatMul * 1.15 }) },
  { id: 'slowrope', name: 'Heavy Rope', desc: 'Slower pace', icon: '⌛',
    role: 'pace', color: 'slate', rarity: 'common', cap: 3,
    apply: s => ({ ...s, ropeMul: s.ropeMul * 0.9 }) },
  { id: 'multi', name: 'Golden Handle', desc: '+1 skip score', icon: '✦',
    role: 'volume', color: 'amber', rarity: 'uncommon', cap: 3,
    apply: s => ({ ...s, scoreMul: s.scoreMul + 1 }) },
  { id: 'window', name: 'Wide Stance', desc: '+10% clearance forgiveness', icon: '◇',
    role: 'margin', color: 'mint', rarity: 'uncommon', cap: 3,
    apply: s => ({ ...s, windowMul: s.windowMul * 1.1 }) },
  { id: 'feather', name: 'Featherweight', desc: '+5% hang time', icon: '✽',
    role: 'foundation', color: 'sky', rarity: 'common', cap: 5,
    apply: s => ({ ...s, floatMul: s.floatMul * 1.05 }) },
  { id: 'tally', name: 'Lucky Tally', desc: '+15% skip score', icon: '♣',
    role: 'volume', color: 'amber', rarity: 'uncommon', cap: 3,
    apply: s => ({ ...s, scoreMul: s.scoreMul * 1.15 }) },
  // Pitfall 1 policy: the ONLY ropeMul-up card — cap 2 holds stacked ropeMul
  // to 1.12^2 ≈ 1.25, five-fold inside the ≈15.6 feet-window blackout bound.
  { id: 'windup', name: 'Wind-Up Handle', desc: '+12% rope speed, +1 score', icon: '⚙',
    role: 'risk', color: 'ember', rarity: 'rare', cap: 2,
    apply: s => ({ ...s, ropeMul: s.ropeMul * 1.12, scoreMul: s.scoreMul + 1 }) },
  { id: 'widebrim', name: 'Wide Brim', desc: '+20% forgiveness, −0.25 score', icon: '⌸',
    role: 'margin', color: 'mint', rarity: 'uncommon', cap: 2,
    apply: s => ({ ...s, windowMul: s.windowMul * 1.2, scoreMul: s.scoreMul - 0.25 }) },
];

// Compat alias: tests/upgrades.test.js freezes the UPGRADES named export.
export const UPGRADES = CARDS;

// Starting balancing knob (RESEARCH Pattern 2 / A1) — UAT tunes values only.
export const RARITY_WEIGHT = { common: 70, uncommon: 25, rare: 5 };

export function freshEffects() {
  return { floatMul: 1, ropeMul: 1, scoreMul: 1, windowMul: 1 };
}

export function isAvailable(card, owned) {
  return (owned[card.id] ?? 0) < (card.cap ?? Infinity);
}

// Inverse-CDF weighted draw over RARITY_WEIGHT, availability-filtered first
// (CARD-05: no dead picks) with splice-removal so draws are distinct without
// replacement. May return fewer than count, never a repeat; mutates nothing.
export function pickOffers(pool, owned, count, rng) {
  const remaining = pool.filter(c => isAvailable(c, owned));
  const out = [];
  while (out.length < count && remaining.length > 0) {
    const total = remaining.reduce((t, c) => t + (RARITY_WEIGHT[c.rarity] ?? 1), 0);
    let r = rng() * total;
    let idx = 0;
    for (let i = 0; i < remaining.length; i++) {
      r -= RARITY_WEIGHT[remaining[i].rarity] ?? 1;
      if (r < 0) { idx = i; break; }
    }
    out.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return out;
}

// 2-arg compat shim — the distinct-pair property at tests/upgrades.test.js:17-24
// is kept by splice-removal in pickOffers, not the old retry-bias branch.
export function pickTwo(pickList, rng) {
  return pickOffers(pickList, {}, 2, rng);
}

export function shouldOfferUpgrade(skips) {
  return skips > 0 && skips % 10 === 0;
}
