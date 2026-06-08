import { describe, it, expect } from 'vitest';
import { SPRITES, validateSpriteDef } from '../src/art/registry';

const RESOURCES = ['exploration', 'science', 'industry', 'culture'];
const TIER_IDS = (r: string) => [`gem_${r}`, `gem_${r}_chipped`, `gem_${r}_brilliant`];

describe('gem tiers (RC-004)', () => {
  it('registers all three tiers for every resource and each is valid', () => {
    for (const r of RESOURCES) {
      for (const id of TIER_IDS(r)) {
        expect(SPRITES[id], `sprite ${id} should be registered`).toBeDefined();
        expect(validateSpriteDef(SPRITES[id]), `sprite ${id}: ${validateSpriteDef(SPRITES[id]).join('; ')}`).toEqual([]);
      }
    }
  });

  it('keeps the original baseline id (cut) for backward compatibility', () => {
    expect(SPRITES['gem_industry']).toBeDefined();
    expect(SPRITES['gem_industry'].id).toBe('gem_industry');
  });
});
