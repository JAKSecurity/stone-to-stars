import { describe, it, expect } from 'vitest';
import { PERKS, rollDraft, applyPerk } from '../src/run/draft';
import { initialRunStats } from '../src/run/runStats';

function stubRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('draft', () => {
  it('rollDraft returns the requested count of distinct perks', () => {
    const picks = rollDraft(stubRng([0, 0, 0]), 3);
    expect(picks).toHaveLength(3);
    const ids = picks.map((p) => p.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('rollDraft never exceeds the pool size', () => {
    const picks = rollDraft(stubRng([0]), 99);
    expect(picks).toHaveLength(PERKS.length);
  });

  it('applyPerk applies a damage perk multiplicatively-additively and never mutates', () => {
    const s = initialRunStats({ maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'] });
    const perk = { id: 'x', name: 'X', desc: '', effect: { damageMult: 0.25 } };
    const after = applyPerk(s, perk);
    expect(after.damageMult).toBeCloseTo(1.25);
    expect(s.damageMult).toBe(1);
  });

  it('a maxHp perk raises both maxHp and heals current hp', () => {
    const s = { ...initialRunStats({ maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'] }), hp: 40 };
    const perk = { id: 'y', name: 'Y', desc: '', effect: { maxHp: 30 } };
    const after = applyPerk(s, perk);
    expect(after.maxHp).toBe(130);
    expect(after.hp).toBe(70);
  });
});
