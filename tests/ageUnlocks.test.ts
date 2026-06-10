import { describe, it, expect } from 'vitest';
import { ageUnlocks } from '../src/game/ageUnlocks';

describe('ageUnlocks', () => {
  it('derives what enters at the Bronze age from the data', () => {
    const u = ageUnlocks('bronze');
    expect(u.biomes).toEqual(['Frontier']);
    expect(u.techs).toEqual(['Bronze Working']);
    expect(u.buildings).toEqual(['Forge']);
    expect(u.weapons).toEqual(['Bronze Spear']);
  });

  it('lists the Stone age starting content', () => {
    const u = ageUnlocks('stone');
    expect(u.biomes).toContain('The Wilds');
    expect(u.biomes).toContain('Ancient Ruins');
    expect(u.buildings).toEqual(expect.arrayContaining(['Granary', 'Mine']));
    expect(u.techs.length).toBeGreaterThanOrEqual(4); // pottery/hunting/mysticism/mining/writing
  });

  it('every age contributes at least its techs', () => {
    for (const age of ['bronze', 'iron', 'classical', 'medieval', 'renaissance', 'industrial', 'modern'] as const) {
      expect(ageUnlocks(age).techs.length).toBeGreaterThan(0);
    }
  });
});
