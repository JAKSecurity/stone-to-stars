import { describe, it, expect } from 'vitest';
import { computeRunModifiers } from '../src/run/modifiers';
import { newCivState } from '../src/state/civState';
import { research } from '../src/tech/tech';
import { build } from '../src/camp/camp';
import { buyTradition } from '../src/civics/traditions';

const RICH = { exploration: 99999, science: 99999, industry: 99999, culture: 99999 };

describe('computeRunModifiers', () => {
  it('a fresh civ yields the base loadout', () => {
    const m = computeRunModifiers(newCivState());
    expect(m).toEqual({
      maxHp: 100, damageMult: 1.0, draftChoices: 3, weapons: ['club'],
      pickupRadius: 60, moveSpeedMult: 1.0, fireRateMult: 1.0,
      draftRerolls: 0, startWeaponLevel: 1, startWeapon: 'club',
      actives: [], activeItem: undefined,
    });
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

  it('tradition ranks add capped deltas on top of base', () => {
    let civ = { ...newCivState(), banked: { exploration: 0, science: 0, industry: 0, culture: 9999 } };
    civ = buyTradition(civ, 'vigor');      // +8 HP
    civ = buyTradition(civ, 'vigor');      // +8 HP (rank 2 => +16 total)
    civ = buyTradition(civ, 'foraging');   // +6 px
    const m = computeRunModifiers(civ);
    expect(m.maxHp).toBe(116);
    expect(m.pickupRadius).toBe(66);
  });

  it('a rank forced past maxRank is clamped to the documented cap', () => {
    const civ = { ...newCivState(), traditions: { vigor: 99 } }; // maxRank 5 => cap +40
    expect(computeRunModifiers(civ).maxHp).toBe(140);
  });

  it('collects tech-granted actives and validates the chosen one', () => {
    const civ = { ...newCivState(), researched: ['hunting', 'guilds'], activeItem: 'poison_gas' };
    const mods = computeRunModifiers(civ);
    expect(mods.actives).toEqual(expect.arrayContaining(['net', 'poison_gas']));
    expect(mods.activeItem).toBe('poison_gas');
  });
});
