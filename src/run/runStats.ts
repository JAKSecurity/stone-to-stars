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
  // Base pace (preserved for early levels): level-ups land every ~15-30s, not every few seconds.
  const base = 15 + 9 * level;
  // Ramp the cost up with level so level-ups (and thus draft/damage growth) thin out late: ~2× by
  // mid-game (~lvl 11) and ~4× by end-game (~lvl 31). Early game is left essentially steady (lvl 1
  // is exactly the base). This throttles late-game damage scaling without touching XP earned.
  const ramp = 1 + 0.10 * (level - 1);
  return Math.round(base * ramp);
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
