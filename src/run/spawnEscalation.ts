import { BiomeDef, EnemyDef, AGE_ORDER } from '../game/types';

// Within-run difficulty escalation tuning (RC-017). Late in a run the spawn mix shifts toward the
// age's tough enemies and seeds the next age's, so surviving past halfway is an achievement and the
// age boundaries blend. These are feel constants — tune by playtest.
const TOUGH_LATE_BONUS = 4;   // weight added to the toughest base enemy at progress 1
const SEED_LATE_WEIGHT = 2;   // weight of the next-age seed enemy at progress 1

/** Id of the toughest (highest baseHp) enemy in a spawn table. */
function toughest(table: Record<string, number>, enemies: Record<string, EnemyDef>): string {
  const ids = Object.keys(table);
  return ids.reduce((a, b) => (enemies[b].baseHp > enemies[a].baseHp ? b : a), ids[0]);
}

/** The biome representing the age after `biome`'s age, or null if `biome` is the last age. */
export function nextAgeBiomeId(biome: BiomeDef, biomes: Record<string, BiomeDef>): string | null {
  const nextAge = AGE_ORDER[AGE_ORDER.indexOf(biome.minAge) + 1];
  if (!nextAge) return null;
  const next = Object.values(biomes).find((b) => b.minAge === nextAge);
  return next ? next.id : null;
}

/**
 * Spawn weights for a biome at run `progress` (0..1). At 0 it is the base table; as it rises the
 * biome's toughest enemy gains weight and the next age's toughest enemy is seeded in — so the back
 * half of a run is harder and the age boundary blends. Pure (registries injected).
 */
export function spawnTableAt(
  biome: BiomeDef, progress: number,
  biomes: Record<string, BiomeDef>, enemies: Record<string, EnemyDef>,
): Record<string, number> {
  const p = Math.max(0, Math.min(1, progress));
  const table: Record<string, number> = { ...biome.spawnTable };
  if (p === 0) return table;

  const tough = toughest(biome.spawnTable, enemies);
  table[tough] = (table[tough] ?? 0) + TOUGH_LATE_BONUS * p;

  const nextId = nextAgeBiomeId(biome, biomes);
  if (nextId) {
    const seed = toughest(biomes[nextId].spawnTable, enemies);
    table[seed] = (table[seed] ?? 0) + SEED_LATE_WEIGHT * p;
  }
  return table;
}
