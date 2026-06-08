import { describe, it, expect } from 'vitest';
import { G, incomeMult, costMult, gemValueForTier, ageIndexOf } from '../src/game/economy';

describe('economy — multipliers', () => {
  it('G is 1.75', () => { expect(G).toBe(1.75); });

  it('income and cost use the SAME base (matched curves — the core invariant)', () => {
    for (let k = 0; k <= 7; k++) expect(incomeMult(k)).toBeCloseTo(costMult(k));
  });

  it('advancing one age costs Gx the current age income (constant velocity)', () => {
    for (let n = 0; n <= 6; n++) expect(costMult(n + 1) / incomeMult(n)).toBeCloseTo(G);
  });

  it('gemValueForTier rounds G^tier', () => {
    expect([0,1,2,3,4,5,6,7].map(gemValueForTier)).toEqual([1, 2, 3, 5, 9, 16, 29, 50]);
  });

  it('ageIndexOf maps the age ladder to 0..7', () => {
    expect(ageIndexOf('stone')).toBe(0);
    expect(ageIndexOf('modern')).toBe(7);
  });
});
