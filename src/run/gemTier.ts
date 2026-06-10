import { Resource } from '../game/types';

export type GemTier = 'chipped' | 'cut' | 'brilliant';

/** Cosmetic gem tier for a run, keyed to the expedition's age tier (an AGE_ORDER index, 0–7).
 *  Early ages drop rough shards; late ages drop brilliant gems. Pure cosmetic — no balance. */
export function gemTierForExpeditionTier(tier: number): GemTier {
  if (tier <= 2) return 'chipped';   // stone / bronze / iron
  if (tier <= 5) return 'cut';       // classical / medieval / renaissance
  return 'brilliant';                // industrial / modern
}

/** Sprite id for a resource gem at a tier. The 'cut' baseline keeps the original `gem_<resource>`
 *  id (so existing references stay valid); the other tiers add a suffix. */
export function gemSpriteId(resource: Resource, tier: GemTier): string {
  return tier === 'cut' ? `gem_${resource}` : `gem_${resource}_${tier}`;
}
