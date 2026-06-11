import { Perk, RunStats } from '../game/types';

export const PERKS: Perk[] = [
  { id: 'sharpen',   name: 'Sharpen',    desc: '+12.5% damage',     effect: { damageMult: 0.125 } },
  { id: 'rapid',     name: 'Rapid Fire', desc: '+10% fire rate',    effect: { fireRateMult: 0.10 } },
  { id: 'swift',     name: 'Swift',      desc: '+15% move speed',   effect: { moveSpeedMult: 0.15 } },
  { id: 'vigor',     name: 'Vigor',      desc: '+30 max HP, heal',  effect: { maxHp: 30 } },
  { id: 'magnet',    name: 'Magnet',     desc: '+40 pickup radius', effect: { pickupRadius: 40 } },
];

export function rollDraft(rng: () => number, count: number): Perk[] {
  const pool = [...PERKS];
  const out: Perk[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length) % pool.length;
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

export function applyPerk(stats: RunStats, perk: Perk): RunStats {
  const e = perk.effect;
  const next: RunStats = { ...stats };
  if (e.damageMult) next.damageMult = stats.damageMult + e.damageMult;
  if (e.fireRateMult) next.fireRateMult = stats.fireRateMult + e.fireRateMult;
  if (e.moveSpeedMult) next.moveSpeedMult = stats.moveSpeedMult + e.moveSpeedMult;
  if (e.pickupRadius) next.pickupRadius = stats.pickupRadius + e.pickupRadius;
  if (e.maxHp) {
    next.maxHp = stats.maxHp + e.maxHp;
    next.hp = stats.hp + e.maxHp;
  }
  return next;
}
