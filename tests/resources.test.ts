import { describe, it, expect } from 'vitest';
import { RESOURCES } from '../src/game/types';
import { emptyBundle, addBundles, canAfford, spend } from '../src/economy/resources';

describe('resources', () => {
  it('has exactly four resource types', () => {
    expect(RESOURCES).toEqual(['exploration', 'science', 'industry', 'culture']);
  });

  it('emptyBundle is all zeros', () => {
    expect(emptyBundle()).toEqual({ exploration: 0, science: 0, industry: 0, culture: 0 });
  });

  it('addBundles adds a partial onto a full bundle', () => {
    const base = { exploration: 1, science: 2, industry: 3, culture: 4 };
    expect(addBundles(base, { science: 10, culture: 1 })).toEqual({
      exploration: 1, science: 12, industry: 3, culture: 5,
    });
    expect(base.science).toBe(2);
  });

  it('canAfford is true only when every cost key is covered', () => {
    const banked = { exploration: 0, science: 5, industry: 10, culture: 0 };
    expect(canAfford(banked, { industry: 10, science: 5 })).toBe(true);
    expect(canAfford(banked, { industry: 11 })).toBe(false);
    expect(canAfford(banked, {})).toBe(true);
  });

  it('spend subtracts a partial cost and never mutates input', () => {
    const banked = { exploration: 0, science: 5, industry: 10, culture: 0 };
    expect(spend(banked, { industry: 4, science: 5 })).toEqual({
      exploration: 0, science: 0, industry: 6, culture: 0,
    });
    expect(banked.industry).toBe(10);
  });
});
