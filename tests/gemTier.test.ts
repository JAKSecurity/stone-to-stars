import { describe, it, expect } from 'vitest';
import { gemTierForExpeditionTier, gemSpriteId } from '../src/run/gemTier';

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
