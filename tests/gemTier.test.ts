import { describe, it, expect } from 'vitest';
import { gemTierForExpeditionTier, gemSpriteId, bumpTier, gemValueTier, gemDisplayScale } from '../src/run/gemTier';

describe('gemTier — bracket by expedition tier', () => {
  it('maps stone/bronze/iron (0–2) to chipped', () => {
    expect(gemTierForExpeditionTier(0)).toBe('chipped');
    expect(gemTierForExpeditionTier(2)).toBe('chipped');
  });
  it('maps classical/medieval/renaissance (3–5) to cut', () => {
    expect(gemTierForExpeditionTier(3)).toBe('cut');
    expect(gemTierForExpeditionTier(5)).toBe('cut');
  });
  it('maps industrial/modern (6–7) to brilliant', () => {
    expect(gemTierForExpeditionTier(6)).toBe('brilliant');
    expect(gemTierForExpeditionTier(7)).toBe('brilliant');
  });
});

describe('gemTier — sprite id', () => {
  it('keeps the original id for the cut baseline', () => {
    expect(gemSpriteId('industry', 'cut')).toBe('gem_industry');
  });
  it('suffixes the other tiers', () => {
    expect(gemSpriteId('science', 'chipped')).toBe('gem_science_chipped');
    expect(gemSpriteId('culture', 'brilliant')).toBe('gem_culture_brilliant');
  });
});

describe('gemTier — bumpTier', () => {
  it('steps chipped→cut→brilliant and clamps at brilliant', () => {
    expect(bumpTier('chipped')).toBe('cut');
    expect(bumpTier('cut')).toBe('brilliant');
    expect(bumpTier('brilliant')).toBe('brilliant');
  });
});

describe('gemTier — value tier + display scale (RC-022 B5)', () => {
  it('brackets a value into minor/solid/major', () => {
    expect(gemValueTier(1)).toBe('minor');
    expect(gemValueTier(3)).toBe('minor');
    expect(gemValueTier(4)).toBe('solid');
    expect(gemValueTier(9)).toBe('solid');
    expect(gemValueTier(10)).toBe('major');
    expect(gemValueTier(50)).toBe('major');
  });

  it('display scale grows with the value tier', () => {
    expect(gemDisplayScale(1)).toBe(1.0);
    expect(gemDisplayScale(5)).toBe(1.25);
    expect(gemDisplayScale(20)).toBe(1.55);
    // monotonic non-decreasing
    expect(gemDisplayScale(20)).toBeGreaterThan(gemDisplayScale(5));
    expect(gemDisplayScale(5)).toBeGreaterThan(gemDisplayScale(1));
  });
});
