import { RunModifiers, RunStats } from '../game/types';

export function initialRunStats(mods: RunModifiers): RunStats {
  return {
    hp: mods.maxHp,
    maxHp: mods.maxHp,
    damageMult: mods.damageMult,
    fireRateMult: 1,
    moveSpeedMult: 1,
    pickupRadius: 60,
    level: 1,
    xp: 0,
  };
}

export function xpForLevel(level: number): number {
  // ~3x the original (5 + 3*level) so level-ups land every ~15-30s instead of every few seconds —
  // they were interrupting play. Tune by feel.
  return 15 + 9 * level;
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
