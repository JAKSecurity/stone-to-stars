// Pure logic for the RC-019 mini-boss arrival event: arrival timing, de-trickling the boss from the
// random spawn stream, and the kill jackpot. No Phaser — RunScene renders; this decides. Feel
// constants live here for the playtest tuner (mirrors src/run/enemyBehavior.ts / projectileMotion.ts).
import { GemTier, bumpTier } from './gemTier';

export const BOSS_ARRIVAL_PROGRESS = 0.7;   // fraction of run elapsed at which the boss arrives
export const CATALYST_DROP_CHANCE = 0.35;   // RC-031: mini-boss jackpot sometimes adds a catalyst

/** RC-031 — whether this boss kill also drops a fusion catalyst (early-fuse token). */
export function dropsCatalyst(rng: () => number): boolean {
  return rng() < CATALYST_DROP_CHANCE;
}
export const BOSS_TELEGRAPH_MS = 1200;      // delay between the warning/banner and the boss appearing
export const BOSS_HP_MULT = 5;              // boss spawns with baseHp × this
export const BOSS_GEM_COUNT = 10;           // gems in the kill burst
export const BOSS_GEM_VALUE_MULT = 4;       // burst gem value vs a normal kill gem
export const BOSS_BIG_GEM_VALUE_MULT = 20;  // the single upgraded gem's value vs a normal gem

/** True once the run has elapsed past the arrival fraction and the boss has not yet been announced. */
export function shouldSpawnBoss(elapsedMs: number, runDurationMs: number, alreadySpawned: boolean): boolean {
  if (alreadySpawned) return false;
  if (runDurationMs <= 0) return false;
  return elapsedMs / runDurationMs >= BOSS_ARRIVAL_PROGRESS;
}

/** A copy of `table` without `bossId` — the random spawn stream draws from this so the boss never
 *  trickles in (and late-game escalation targets the next-toughest enemy). Does not mutate `table`. */
export function bossFreeTable(table: Record<string, number>, bossId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, w] of Object.entries(table)) if (id !== bossId) out[id] = w;
  return out;
}

export interface JackpotGem { value: number; tier: GemTier; }

/** The kill reward: BOSS_GEM_COUNT gems at boosted value, plus one upgraded (bumped-tier, big-value)
 *  gem. `baseValue` is a normal kill gem's value for the run tier; `tier` the run's normal gem tier. */
export function bossJackpotGems(baseValue: number, tier: GemTier): JackpotGem[] {
  const gems: JackpotGem[] = [];
  for (let i = 0; i < BOSS_GEM_COUNT; i++) gems.push({ value: baseValue * BOSS_GEM_VALUE_MULT, tier });
  gems.push({ value: baseValue * BOSS_BIG_GEM_VALUE_MULT, tier: bumpTier(tier) });
  return gems;
}
