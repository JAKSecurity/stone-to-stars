import { Expedition, ExpeditionScaling, CivState, AGE_ORDER } from '../game/types';
import { BIOMES } from './biomeData';
import { getAge } from '../tech/tech';

/** Difficulty multipliers for a tier (tier = an AGE_ORDER index; 0 = baseline). */
export function tierScaling(tier: number): ExpeditionScaling {
  return {
    hpMult: 1 + 0.5 * tier,
    speedMult: 1 + 0.1 * tier,
    spawnRateMult: 1 + 0.25 * tier,
    dropMult: 1 + 0.5 * tier,
  };
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
    for (let tier = minIdx; tier <= curIdx; tier++) {
      out.push({ biomeId: biome.id, tier, scaling: tierScaling(tier) });
    }
  }
  return out;
}
