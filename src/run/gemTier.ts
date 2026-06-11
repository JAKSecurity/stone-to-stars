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

/** Next cosmetic tier up, clamped at the top — used for the RC-019 boss jackpot's upgraded gem. */
export function bumpTier(tier: GemTier): GemTier {
  if (tier === 'chipped') return 'cut';
  if (tier === 'cut') return 'brilliant';
  return 'brilliant';
}

/** RC-022 B5 — value bracket for at-a-glance gem readability, independent of the cosmetic
 *  expedition tier above. A run's per-kill gems are low; boss-jackpot gems are high. The brackets
 *  are chosen so a tier-0 base value (~1) reads `minor`, a mid-run kill reads `solid`, and a boss
 *  jackpot's big gem (10s) reads `major` — the unmistakable one that gets the glow. */
export type GemValueTier = 'minor' | 'solid' | 'major';

export function gemValueTier(value: number): GemValueTier {
  if (value >= 10) return 'major';
  if (value >= 4) return 'solid';
  return 'minor';
}

/** Display-size multiplier for a gem's value tier — a jackpot reads visibly bigger than a chip. */
export function gemDisplayScale(value: number): number {
  switch (gemValueTier(value)) {
    case 'major': return 1.55;
    case 'solid': return 1.25;
    default: return 1.0;
  }
}
