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
    regenHps: 0,
    xpMult: 1,
    activeCharges: 0,
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

/** RC-022: fraction (0..1) of the way from the current level to the next, for the HUD XP bar.
 *  Reuses xpForLevel so the bar can never disagree with addXp's threshold. Clamped to [0,1]
 *  (a freshly-leveled stat with xp 0 reads 0; a stat carrying ≥threshold xp — shouldn't happen
 *  post-addXp, but guard anyway — reads a full bar). */
export function xpProgress(stats: RunStats): number {
  const need = xpForLevel(stats.level);
  if (need <= 0) return 0;
  return Math.max(0, Math.min(1, stats.xp / need));
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
