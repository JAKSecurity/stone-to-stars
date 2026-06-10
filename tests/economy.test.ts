import { describe, it, expect } from 'vitest';
import { G, INCOME_G, incomeMult, costMult, gemValueForTier, rewardValueForTier, REWARD_MULT, ageIndexOf } from '../src/game/economy';
import { runDurationForTier } from '../src/game/config';

describe('economy — multipliers', () => {
  it('G is 1.75 and INCOME_G is the gentler 1.26', () => {
    expect(G).toBe(1.75);
    expect(INCOME_G).toBe(1.26);
  });

  it('income grows on the gentler INCOME_G curve, decoupled from cost (G)', () => {
    expect(incomeMult(0)).toBe(1);
    expect(costMult(0)).toBe(1);
    for (let k = 1; k <= 7; k++) expect(incomeMult(k)).toBeLessThan(costMult(k));
  });

  it('tier-7 income is ~1/10 of the old matched (G^7) curve — late-game flood fix', () => {
    expect(incomeMult(7) / (G ** 7)).toBeCloseTo(0.1, 1);
  });

  it('gemValueForTier rounds INCOME_G^tier', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(gemValueForTier)).toEqual([1, 1, 2, 2, 3, 3, 4, 5]);
  });

  it('ageIndexOf maps the age ladder to 0..7', () => {
    expect(ageIndexOf('stone')).toBe(0);
    expect(ageIndexOf('modern')).toBe(7);
  });

  it('rewardValueForTier is gem value scaled by the generosity multiplier', () => {
    expect(REWARD_MULT).toBe(2.5);
    for (let t = 0; t <= 7; t++) {
      expect(rewardValueForTier(t)).toBe(Math.round(gemValueForTier(t) * REWARD_MULT));
    }
    expect(rewardValueForTier(0)).toBe(3); // round(1 × 2.5)
  });

  it('runDurationForTier is 1 min in the starting area, +1 min per age', () => {
    expect(runDurationForTier(0)).toBe(60_000);
    expect(runDurationForTier(1)).toBe(120_000);
    expect(runDurationForTier(7)).toBe(480_000);
  });
});
