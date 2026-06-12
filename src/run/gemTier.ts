import { Resource } from '../game/types';
import { rewardValueForTier } from '../game/economy';

export type GemTier = 'chipped' | 'cut' | 'brilliant';

/** Cosmetic gem tier for a run, keyed to the expedition's age tier (an AGE_ORDER index, 0–8).
 *  Early ages drop rough shards; late ages drop brilliant gems. Pure cosmetic — no balance. */
export function gemTierForExpeditionTier(tier: number): GemTier {
  if (tier <= 2) return 'chipped';   // stone / bronze / iron
  if (tier <= 5) return 'cut';       // classical / medieval / renaissance
  return 'brilliant';                // industrial / modern / space
}

/** Sprite id for a resource gem at a tier. The 'cut' baseline keeps the original `gem_<resource>`
 *  id (so existing references stay valid); the other tiers add a suffix. */
export function gemSpriteId(resource: Resource, tier: GemTier): string {
  return tier === 'cut' ? `gem_${resource}` : `gem_${resource}_${tier}`;
}

/** Next cosmetic tier up, clamped at the top — used for the RC-019 boss jackpot's upgraded gem. */
export function bumpTier(tier: GemTier): GemTier {
  if (tier === 'chipped') return 'cut';
  if (tier === 'cut') return 'brilliant';
  return 'brilliant';
}

/** RC-022 B5 — value bracket for at-a-glance gem readability, independent of the cosmetic
 *  expedition tier above. Thresholds are RELATIVE to `rewardValueForTier(tier)` so ordinary
 *  kill/deposit drops (≈1×base) stay `minor` at every run tier; shrine/courier jackpots (≈3×base)
 *  hit `major`; boss jackpot burst gems (≈4×base) and the big gem (≈20×base) are unmistakably
 *  `major`. Fixed absolute thresholds broke at tier ≥ 2 where base ≈ 10+. */
export type GemValueTier = 'minor' | 'solid' | 'major';

export function gemValueTier(value: number, tier: number): GemValueTier {
  const base = rewardValueForTier(tier);
  if (value >= 3 * base) return 'major';
  if (value >= 2 * base) return 'solid';
  return 'minor';
}

/** Display-size multiplier for a gem's value tier — a jackpot reads visibly bigger than a chip. */
export function gemDisplayScale(value: number, tier: number): number {
  switch (gemValueTier(value, tier)) {
    case 'major': return 1.55;
    case 'solid': return 1.25;
    default: return 1.0;
  }
}
