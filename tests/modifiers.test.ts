import { describe, it, expect } from 'vitest';
import { computeRunModifiers } from '../src/run/modifiers';
import { newCivState } from '../src/state/civState';
import { research } from '../src/tech/tech';
import { build } from '../src/camp/camp';

const RICH = { exploration: 99, science: 99, industry: 99, culture: 99 };

describe('computeRunModifiers', () => {
  it('a fresh civ yields the base loadout', () => {
    const m = computeRunModifiers(newCivState());
    expect(m).toEqual({ maxHp: 100, damageMult: 1.0, draftChoices: 3, weapons: ['club'] });
  });

  it('tech run-bonuses stack onto the base', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'hunting');
    civ = research(civ, 'mysticism');
    civ = research(civ, 'writing');
    const m = computeRunModifiers(civ);
    expect(m.maxHp).toBe(115);
    expect(m.damageMult).toBeCloseTo(1.10);
    expect(m.draftChoices).toBe(4);
  });

  it('building run-bonuses scale with level and grant weapons once', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 0);
    civ = research(civ, 'mining');
    civ = research(civ, 'bronze_working');
    civ = build(civ, 'forge', 1);
    const m = computeRunModifiers(civ);
    expect(m.maxHp).toBe(125);
    expect(m.damageMult).toBeCloseTo(1.10);
    expect(m.weapons).toEqual(['club', 'bronze_spear']);
  });
});
