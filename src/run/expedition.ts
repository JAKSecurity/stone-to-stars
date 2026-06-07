import { Expedition, ExpeditionScaling, CivState, AGE_ORDER } from '../game/types';
import { BIOMES } from './biomeData';
import { getAge, isResearched } from '../tech/tech';

/** Difficulty multipliers for a tier (tier = an AGE_ORDER index; 0 = baseline). */
export function tierScaling(tier: number): ExpeditionScaling {
  return {
    hpMult: 1 + 0.5 * tier,
    speedMult: 1 + 0.1 * tier,
    spawnRateMult: 1 + 0.25 * tier,
    dropMult: 1 + 0.5 * tier,
  };
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
 * Every expedition the player can currently run: each unlocked biome (minAge reached)
 * offered at tiers from its minAge index up to the civ's current age index.
 */
export function availableExpeditions(civ: CivState): Expedition[] {
  const curIdx = AGE_ORDER.indexOf(getAge(civ));
  const out: Expedition[] = [];
  for (const biome of Object.values(BIOMES)) {
    const minIdx = AGE_ORDER.indexOf(biome.minAge);
    if (minIdx > curIdx) continue;
    if (biome.requiresTech && !isResearched(civ, biome.requiresTech)) continue;
    for (let tier = minIdx; tier <= curIdx; tier++) {
      out.push({ biomeId: biome.id, tier, scaling: tierScaling(tier) });
    }
  }
  return out;
}
