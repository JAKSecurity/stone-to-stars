import { describe, it, expect } from 'vitest';
import { TECHS } from '../src/tech/techData';
import { isResearched, canResearch, research, getAge, techUnlocksBuilding, techCost } from '../src/tech/tech';
import { newCivState } from '../src/state/civState';

describe('tech', () => {
  it('defines the slice techs with a mining → bronze_working prereq, iron age techs, classical age techs, medieval age techs, renaissance age techs, industrial age techs, and modern age techs', () => {
    expect(Object.keys(TECHS).sort()).toEqual(
      [
        'assembly_line', 'astronomy', 'ballistics', 'banking', 'bronze_working', 'chivalry', 'combustion',
        'currency', 'deep_mining', 'electricity', 'engineering', 'feudalism', 'flight', 'guilds',
        'gunpowder', 'hunting', 'iron_working', 'masonry', 'mathematics', 'mechanics', 'mining',
        'mysticism', 'philosophy', 'pottery', 'printing_press', 'radio', 'railroad', 'smelting',
        'steam_power', 'writing',
      ].sort(),
    );
    expect(TECHS.bronze_working.requires).toEqual(['mining']);
    expect(TECHS.bronze_working.gatesAge).toBe('bronze');
    expect(TECHS.iron_working.requires).toEqual(['bronze_working']);
    expect(TECHS.iron_working.gatesAge).toBe('iron');
    expect(TECHS.mathematics.gatesAge).toBe('classical');
    expect(TECHS.mathematics.requires).toEqual(['iron_working']);
    expect(TECHS.feudalism.gatesAge).toBe('medieval');
    expect(TECHS.gunpowder.gatesAge).toBe('renaissance');
    expect(TECHS.steam_power.gatesAge).toBe('industrial');
    expect(TECHS.combustion.gatesAge).toBe('modern');
  });

  it('a fresh civ has no tech and is in the Stone Age', () => {
    const civ = newCivState();
    expect(isResearched(civ, 'pottery')).toBe(false);
    expect(getAge(civ)).toBe('stone');
  });

  it('cannot research a tech you cannot afford', () => {
    const civ = newCivState();
    expect(canResearch(civ, 'pottery')).toBe(false);
  });

  it('cannot research a tech whose prerequisites are unmet, even if affordable', () => {
    const civ = { ...newCivState(), banked: { exploration: 0, science: 99, industry: 99, culture: 99 } };
    expect(canResearch(civ, 'bronze_working')).toBe(false);
  });

  it('research subtracts cost, records the tech, and is idempotent-guarded', () => {
    const cost = techCost('pottery').industry ?? 0; // exact age-scaled pottery cost
    const civ = { ...newCivState(), banked: { exploration: 0, science: 0, industry: cost, culture: 0 } };
    const after = research(civ, 'pottery');
    expect(after.researched).toContain('pottery');
    expect(after.banked.industry).toBe(0);
    expect(() => research(after, 'pottery')).toThrow();
  });

  it('researching the gate tech advances the age', () => {
    let civ = { ...newCivState(), banked: { exploration: 0, science: 99, industry: 99, culture: 99 } };
    civ = research(civ, 'mining');
    expect(getAge(civ)).toBe('stone');
    civ = research(civ, 'bronze_working');
    expect(getAge(civ)).toBe('bronze');
  });

  it('techUnlocksBuilding maps tech → building id', () => {
    expect(techUnlocksBuilding('pottery')).toBe('granary');
    expect(techUnlocksBuilding('hunting')).toBeUndefined();
  });
});
