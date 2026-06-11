import { describe, it, expect } from 'vitest';
import {
  nextRankCost, nextRankCostBundle, traditionRank, canBuyTradition, buyTradition,
} from '../src/civics/traditions';
import { newCivState } from '../src/state/civState';
import { CivState, AgeId, AGE_ORDER } from '../src/game/types';
import { research, getAge, canResearch } from '../src/tech/tech';
import { TECHS } from '../src/tech/techData';

const RICH = { exploration: 0, science: 0, industry: 0, culture: 9999 };
function richCiv(): CivState { return { ...newCivState(), banked: { ...RICH } }; }

describe('nextRankCost', () => {
  it('follows base * 5.0^(rank) for successive ranks of Vigor (base 240)', () => {
    const civ = richCiv();
    expect(nextRankCost(civ, 'vigor')).toBe(240);           // rank 0 -> 1  round(240*5^0)
    const r1 = buyTradition(civ, 'vigor');
    expect(nextRankCost(r1, 'vigor')).toBe(1200);           // rank 1 -> 2  round(240*5^1)
    const r2 = buyTradition(r1, 'vigor');
    expect(nextRankCost(r2, 'vigor')).toBe(6000);           // rank 2 -> 3  round(240*5^2)
  });

  it('returns null when the node is at max rank', () => {
    // vigor costs 240+1200+6000+30000+150000 = 187440 to max (new curve: base 240 * 5^rank)
    let civ = { ...richCiv(), banked: { exploration: 0, science: 0, industry: 0, culture: 200000 } };
    for (let i = 0; i < 5; i++) civ = buyTradition(civ, 'vigor'); // maxRank 5
    expect(traditionRank(civ, 'vigor')).toBe(5);
    expect(nextRankCost(civ, 'vigor')).toBeNull();
  });
});

describe('canBuyTradition', () => {
  it('false when culture is insufficient', () => {
    const broke = { ...newCivState(), banked: { exploration: 0, science: 0, industry: 0, culture: 10 } };
    expect(canBuyTradition(broke, 'vigor')).toBe(false); // costs 24
  });

  it('false when already at max rank', () => {
    let civ = richCiv();
    for (let i = 0; i < 5; i++) civ = buyTradition(civ, 'vigor');
    expect(canBuyTradition(civ, 'vigor')).toBe(false);
  });

  it('false for an age-gated node before its age, true after', () => {
    const civ = richCiv(); // Stone age, no tech
    expect(canBuyTradition(civ, 'oratory')).toBe(false); // requires classical
    // research the chain that gates the Classical age, then it unlocks.
    const classical = reachClassical(civ);
    expect(canBuyTradition(classical, 'oratory')).toBe(true);
  });
});

describe('buyTradition', () => {
  it('increments rank and spends exactly the culture cost, untouched other resources', () => {
    const civ = { ...newCivState(), banked: { exploration: 5, science: 5, industry: 5, culture: 300 } };
    const after = buyTradition(civ, 'vigor');
    expect(traditionRank(after, 'vigor')).toBe(1);
    expect(after.banked.culture).toBe(60);   // 300 - 240 (vigor base 240, RC-009 playtest #9)
    expect(after.banked).toMatchObject({ exploration: 5, science: 5, industry: 5 });
  });

  it('is a no-op (returns the same state) when the purchase is illegal', () => {
    const broke = { ...newCivState(), banked: { exploration: 0, science: 0, industry: 0, culture: 1 } };
    expect(buyTradition(broke, 'vigor')).toBe(broke);
  });

  it('nextRankCostBundle is culture-only', () => {
    expect(nextRankCostBundle(richCiv(), 'foraging')).toEqual({ culture: 200 }); // foraging base 200 (RC-009 #9)
  });
});

// Helper: research the tech chain up to whatever gates the Classical age.
// Uses the real tech graph so the test stays honest if the gating chain changes.
function reachClassical(start: CivState): CivState {
  // A rich civ can research anything affordable; walk gatesAge until age >= classical.
  // Implemented in the test via the tech module to avoid hardcoding ids here.
  return researchUntilAge(start, 'classical');
}

/**
 * Research techs one at a time until the civ reaches `target` age.
 * NOTE: We replenish ALL resources to 9999 each iteration because the path to
 * Classical requires industry and science (not just culture). The richCiv()
 * helper seeds only culture=9999; topping up here keeps the helper honest
 * about the actual tech graph without hard-coding specific tech ids.
 */
function researchUntilAge(civ: CivState, target: AgeId): CivState {
  const want = AGE_ORDER.indexOf(target);
  let guard = 0;
  while (AGE_ORDER.indexOf(getAge(civ)) < want && guard++ < 50) {
    // Replenish all resources so the civ can afford anything in the chain.
    civ = { ...civ, banked: { exploration: 9999, science: 9999, industry: 9999, culture: 9999 } };
    // research the first currently-researchable tech (rich civ affords everything)
    const next = Object.values(TECHS).find((t) => canResearch(civ, t.id));
    if (!next) break;
    civ = research(civ, next.id);
  }
  return civ;
}
