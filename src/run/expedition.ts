import { Expedition, CivState, AGE_ORDER } from '../game/types';
import { BIOMES } from './biomeData';
import { ENEMIES } from './enemyData';
import { getAge, isResearched } from '../tech/tech';

/** The toughest enemy in a spawn table (by base HP) — the biome's "apex" callout. */
export function apexEnemyId(spawnTable: Record<string, number>): string {
  return Object.keys(spawnTable).reduce((apex, id) =>
    (ENEMIES[id]?.baseHp ?? 0) > (ENEMIES[apex]?.baseHp ?? 0) ? id : apex);
}

/** A 1–5 danger rating from the apex enemy's HP bracket, for the expedition card's threat cue. */
export function biomeDanger(spawnTable: Record<string, number>): number {
  const hp = ENEMIES[apexEnemyId(spawnTable)]?.baseHp ?? 0;
  return Math.min(5, 1 + Math.floor(hp / 110));
}

/** Weighted random pick of an enemy id from a biome spawn table. Pure (rng injected). */
export function pickEnemy(spawnTable: Record<string, number>, rng: () => number): string {
  const entries = Object.entries(spawnTable);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [id, w] of entries) {
    r -= w;
    if (r < 0) return id;
  }
  return entries[entries.length - 1][0]; // float-safe fallback
}

/**
 * Every expedition the player can currently run: each unlocked biome (minAge reached + any required
 * tech) offered ONCE, at its own age tier. Enemies have fixed per-age stats; the reward is
 * incomeMult(tier). Old biomes stay runnable but pay exponentially less — RC-017.
 */
export function availableExpeditions(civ: CivState): Expedition[] {
  const curIdx = AGE_ORDER.indexOf(getAge(civ));
  const out: Expedition[] = [];
  for (const biome of Object.values(BIOMES)) {
    const minIdx = AGE_ORDER.indexOf(biome.minAge);
    if (minIdx > curIdx) continue;
    if (biome.requiresTech && !isResearched(civ, biome.requiresTech)) continue;
    out.push({ biomeId: biome.id, tier: minIdx });
  }
  return out;
}
