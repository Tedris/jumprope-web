export const UPGRADES = [
  { id: 'float', name: 'Cloud Shoes', desc: '+15% hang time',
    apply: s => ({ ...s, floatMul: s.floatMul * 1.15 }) },
  { id: 'slowrope', name: 'Heavy Rope', desc: 'Rope swings slower',
    apply: s => ({ ...s, ropeMul: s.ropeMul * 0.9 }) },
  { id: 'multi', name: 'Golden Handle', desc: '+1 skip score',
    apply: s => ({ ...s, scoreMul: s.scoreMul + 1 }) },
  { id: 'window', name: 'Wide Stance', desc: '+10% clearance forgiveness',
    apply: s => ({ ...s, windowMul: s.windowMul * 1.1 }) },
];

export function freshEffects() {
  return { floatMul: 1, ropeMul: 1, scoreMul: 1, windowMul: 1 };
}

export function pickTwo(upgrades, rng) {
  const a = Math.floor(rng() * upgrades.length);
  let b = Math.floor(rng() * upgrades.length);
  if (b === a) b = (b + 1) % upgrades.length;
  return [upgrades[a], upgrades[b]];
}

export function shouldOfferUpgrade(skips) {
  return skips > 0 && skips % 10 === 0;
}
