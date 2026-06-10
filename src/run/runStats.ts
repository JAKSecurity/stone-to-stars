import { RunModifiers, RunStats } from '../game/types';

export function initialRunStats(mods: RunModifiers): RunStats {
  return {
    hp: mods.maxHp,
    maxHp: mods.maxHp,
    damageMult: mods.damageMult,
    fireRateMult: mods.fireRateMult,
    moveSpeedMult: mods.moveSpeedMult,
    pickupRadius: mods.pickupRadius,
    level: 1,
    xp: 0,
  };
}

export function xpForLevel(level: number): number {
  return 5 + 3 * level;
}

export function addXp(stats: RunStats, amount: number): { stats: RunStats; levelsGained: number } {
  let { level, xp } = stats;
  xp += amount;
  let levelsGained = 0;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    levelsGained += 1;
  }
  return { stats: { ...stats, level, xp }, levelsGained };
}
