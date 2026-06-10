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
