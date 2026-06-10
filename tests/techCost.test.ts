import { describe, it, expect } from 'vitest';
import { techCost } from '../src/tech/tech';
import { costMult, ageIndexOf, COST_BASE } from '../src/game/economy';

// Effective multiplier for an age (so these survive an A8 COST_BASE recalibration).
const m = (age: string) => COST_BASE * costMult(ageIndexOf(age as any));

describe('techCost — derived flat base × G^age', () => {
  it('a stone unlock tech (pottery) costs the unlock primary base, single resource', () => {
    expect(techCost('pottery')).toEqual({ industry: Math.round(11 * m('stone')) });
  });

  it('a stone run-bonus tech (hunting) costs the bonus primary base', () => {
    expect(techCost('hunting')).toEqual({ industry: Math.round(9 * m('stone')) });
  });

  it('an unlock tech with two resources keeps both, primary = the larger current one', () => {
    // mining current {industry:15, science:5} → industry primary, science secondary
    expect(techCost('mining')).toEqual({
      industry: Math.round(11 * m('stone')), science: Math.round(6 * m('stone')),
    });
  });

  it('a gating tech (bronze_working) uses the gate base × G^1', () => {
    expect(techCost('bronze_working')).toEqual({
      industry: Math.round(14 * m('bronze')), science: Math.round(9 * m('bronze')),
    });
  });

  it('primary is the larger current resource (mathematics: science > industry)', () => {
    expect(techCost('mathematics')).toEqual({
      science: Math.round(14 * m('classical')), industry: Math.round(9 * m('classical')),
    });
  });

  it('scales exponentially with age (modern gate ≫ bronze gate)', () => {
    expect(techCost('combustion').industry ?? 0).toBeGreaterThan((techCost('bronze_working').industry ?? 0) * 10);
  });
});
