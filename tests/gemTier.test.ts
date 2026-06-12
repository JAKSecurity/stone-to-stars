import { describe, it, expect } from 'vitest';
import { gemTierForExpeditionTier, gemSpriteId, bumpTier, gemValueTier, gemDisplayScale } from '../src/run/gemTier';
import { rewardValueForTier } from '../src/game/economy';

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

describe('gemTier — value tier + display scale (RC-022 B5 — tier-relative thresholds)', () => {
  // Regression: ordinary kill drops (1×base) must be minor at EVERY run tier — the bug was that
  // tier ≥ 2 base ≈ 10+ crossed the old absolute threshold of 10, making every drop "major".
  it('a normal kill drop (1×base) is minor at tier 0 and tier 4', () => {
    const base0 = rewardValueForTier(0);
    const base4 = rewardValueForTier(4);
    expect(gemValueTier(base0, 0)).toBe('minor');
    expect(gemValueTier(base4, 4)).toBe('minor');
  });

  it('tier 0 (base ~3): brackets minor / solid / major correctly', () => {
    const base = rewardValueForTier(0); // ≈3
    expect(gemValueTier(base, 0)).toBe('minor');           // 1×base → minor
    expect(gemValueTier(base * 2, 0)).toBe('solid');       // 2×base → solid
    expect(gemValueTier(base * 3, 0)).toBe('major');       // 3×base → major (shrine jackpot)
    expect(gemValueTier(base * 20, 0)).toBe('major');      // 20×base → major (boss big gem)
  });

  it('tier 4 (base ~28): brackets minor / solid / major correctly', () => {
    const base = rewardValueForTier(4); // ≈28
    expect(gemValueTier(base, 4)).toBe('minor');           // 1×base → minor
    expect(gemValueTier(base * 2, 4)).toBe('solid');       // 2×base → solid
    expect(gemValueTier(base * 3, 4)).toBe('major');       // 3×base → major
    expect(gemValueTier(base * 4, 4)).toBe('major');       // 4×base → major (boss burst gems)
  });

  it('display scale grows with the value tier (tier 0)', () => {
    const base = rewardValueForTier(0);
    expect(gemDisplayScale(base, 0)).toBe(1.0);            // minor
    expect(gemDisplayScale(base * 2, 0)).toBe(1.25);       // solid
    expect(gemDisplayScale(base * 3, 0)).toBe(1.55);       // major
    // monotonic
    expect(gemDisplayScale(base * 3, 0)).toBeGreaterThan(gemDisplayScale(base * 2, 0));
    expect(gemDisplayScale(base * 2, 0)).toBeGreaterThan(gemDisplayScale(base, 0));
  });
});
