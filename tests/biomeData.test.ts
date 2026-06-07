import { describe, it, expect } from 'vitest';
import { BIOMES } from '../src/run/biomeData';
import { ENEMIES } from '../src/run/enemyData';
import { AGE_ORDER, RESOURCES } from '../src/game/types';

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
});
