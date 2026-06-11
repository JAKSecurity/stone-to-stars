import { describe, it, expect } from 'vitest';
import { BIOMES } from '../src/run/biomeData';
import { ENEMIES } from '../src/run/enemyData';
import { AGE_ORDER, RESOURCES } from '../src/game/types';
import { SPRITES } from '../src/art/registry';

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

describe('biomeData', () => {
  it('defines the base biomes (wilds, ruins, frontier) and caverns (RC-008)', () => {
    const ids = Object.keys(BIOMES).sort();
    expect(ids).toContain('wilds');
    expect(ids).toContain('ruins');
    expect(ids).toContain('frontier');
    expect(ids).toContain('caverns');
  });

  it('every spawn-table entry references a real enemy and a positive weight', () => {
    for (const biome of Object.values(BIOMES)) {
      const entries = Object.entries(biome.spawnTable);
      expect(entries.length).toBeGreaterThan(0);
      for (const [enemyId, weight] of entries) {
        expect(ENEMIES[enemyId]).toBeDefined();
        expect(weight).toBeGreaterThan(0);
      }
    }
  });

  it('every biome has a valid minAge and resource-bias keys', () => {
    for (const [key, biome] of Object.entries(BIOMES)) {
      expect(biome.id).toBe(key);
      expect(AGE_ORDER).toContain(biome.minAge);
      for (const r of Object.keys(biome.resourceBias)) {
        expect(RESOURCES).toContain(r);
      }
    }
  });

  // RC-021 — every biome carries visual identity (palette + obstacle sprite set)
  it('every biome has a valid visual palette and registered obstacle sprites', () => {
    for (const [key, biome] of Object.entries(BIOMES)) {
      const v = biome.visual;
      expect(v, `biome ${key} should define visual identity`).toBeDefined();
      if (!v) continue;
      for (const c of [v.ground, v.grid, v.speck]) {
        expect(HEX.test(c), `biome ${key} color ${c} is a valid hex`).toBe(true);
      }
      expect(v.obstacles.length, `biome ${key} should scatter at least one obstacle`).toBeGreaterThan(0);
      for (const id of v.obstacles) {
        expect(SPRITES[id], `biome ${key} obstacle sprite ${id} should be registered`).toBeDefined();
      }
    }
  });
});

describe('biomeData — RC-033 science faucet', () => {
  // The RC-019 mini-boss removes a biome's highest-HP enemy from the random spawn stream.
  const apexId = (table: Record<string, number>) =>
    Object.keys(table).reduce((a, b) => (ENEMIES[b]?.baseHp ?? 0) > (ENEMIES[a]?.baseHp ?? 0) ? b : a);
  const hasScienceDropper = (table: Record<string, number>) => {
    const apex = apexId(table);
    return Object.keys(table).some((id) => id !== apex && ENEMIES[id]?.drop === 'science');
  };

  it('the two previously-starved biomes now field a science-dropping enemy', () => {
    // colosseum (classical) gained a bronze automaton; cursed_keep (medieval) a dark scholar.
    expect(ENEMIES.automaton.drop, 'automaton drops science').toBe('science');
    expect(ENEMIES.scholar.drop, 'scholar drops science').toBe('science');
    expect(BIOMES.colosseum.spawnTable.automaton, 'automaton in colosseum table').toBeGreaterThan(0);
    expect(BIOMES.cursed_keep.spawnTable.scholar, 'scholar in cursed_keep table').toBeGreaterThan(0);
    expect(BIOMES.colosseum.resourceBias.science, 'colosseum science bias').toBeGreaterThan(0);
    expect(BIOMES.cursed_keep.resourceBias.science, 'cursed_keep science bias').toBeGreaterThan(0);
  });

  it('every Bronze-or-later biome has a science kill faucet (no age is a science desert)', () => {
    // Science tech demand begins in the Bronze age; any biome at that age or later must field a
    // science-dropping enemy that survives the mini-boss de-trickle, or that age starves for science.
    for (const biome of Object.values(BIOMES)) {
      if (AGE_ORDER.indexOf(biome.minAge) < 1) continue; // Stone has no science demand
      expect(hasScienceDropper(biome.spawnTable), `${biome.id} (${biome.minAge}) needs a science dropper`).toBe(true);
    }
  });
});
