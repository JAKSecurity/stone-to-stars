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
