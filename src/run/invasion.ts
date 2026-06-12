// RC-042 — The Last Stand: pure wave/formation/phase math for the C4 finale. No Phaser — RunScene's
// formation controller consumes these (spawning the grids, moving the block, driving the mothership);
// the math lives here so it is unit-testable and the feel constants sit in one place for the playtest
// tuner (mirrors enemyAttacks.ts / bossEvent.ts). All px values are pre-RUN_SCALE.

/** One authored invasion wave: a grid of `rows.length × cols` invaders (one enemy id per row, top to
 *  bottom), marching laterally at `marchSpeed` and dropping `dropPx` toward the player at each edge. */
export interface InvasionWave {
  rows: string[];      // enemy id per row, top to bottom
  cols: number;        // invaders per row
  marchSpeed: number;  // px/s lateral march speed of the block
  dropPx: number;      // px the block drops toward the player on each edge reversal
  spacing: number;     // px between grid members (both axes)
}

/** The 5 authored waves — escalating size, speed, drop aggression, and composition:
 *  drone swarms → soldier (beam) rows mixed in → an elite (mortar) front rank on the last wave. */
export const WAVES: InvasionWave[] = [
  { rows: ['invader_drone', 'invader_drone'], cols: 6, marchSpeed: 60, dropPx: 40, spacing: 64 },
  { rows: ['invader_drone', 'invader_drone', 'invader_drone'], cols: 7, marchSpeed: 70, dropPx: 44, spacing: 60 },
  { rows: ['invader_soldier', 'invader_drone', 'invader_drone'], cols: 7, marchSpeed: 80, dropPx: 48, spacing: 60 },
  { rows: ['invader_soldier', 'invader_soldier', 'invader_drone', 'invader_drone'], cols: 8, marchSpeed: 90, dropPx: 52, spacing: 56 },
  { rows: ['invader_elite', 'invader_soldier', 'invader_soldier', 'invader_drone'], cols: 8, marchSpeed: 100, dropPx: 56, spacing: 56 },
];

/** The marching block's lateral state: origin x and current march direction. */
export interface FormationState { x: number; dir: 1 | -1 }

/**
 * One step of the space-invaders march: advances x by dir·speed·dt; on crossing (or exactly
 * reaching) a bound it clamps to the bound, reverses direction, and reports `dropped: true` —
 * the caller applies the wave's dropPx toward the player. Pure: returns a fresh state.
 */
export function formationStep(
  s: FormationState, dtMs: number, marchSpeed: number, minX: number, maxX: number,
): { s: FormationState; dropped: boolean } {
  const x = s.x + s.dir * marchSpeed * (dtMs / 1000);
  if (x <= minX) return { s: { x: minX, dir: 1 }, dropped: true };
  if (x >= maxX) return { s: { x: maxX, dir: -1 }, dropped: true };
  return { s: { x, dir: s.dir }, dropped: false };
}

/** Mothership HP = the tier-8 boss base (def.baseHp × bossEvent.BOSS_HP_MULT) × this finale
 *  multiplier — the final boss outlasts any regular apex boss. Tune by playtest. */
export const MOTHERSHIP_HP_MULT = 2;

/**
 * The mothership's phase by remaining HP fraction, in thirds: >2/3 → 1 (plasma volleys, mortar
 * profile), >1/3 → 2 (beam sweeps + drone spawns), else 3 (enrage — both, faster). Boundaries
 * fall to the harder phase.
 */
export function mothershipPhase(hpFrac: number): 1 | 2 | 3 {
  if (hpFrac > 2 / 3) return 1;
  if (hpFrac > 1 / 3) return 2;
  return 3;
}
