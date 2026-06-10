import { describe, it, expect } from 'vitest';
import { spawnTableAt, nextAgeBiomeId } from '../src/run/spawnEscalation';
import { BIOMES } from '../src/run/biomeData';
import { ENEMIES } from '../src/run/enemyData';

describe('spawnEscalation', () => {
  it('nextAgeBiomeId returns the biome of the next age, or null at the top', () => {
    expect(nextAgeBiomeId(BIOMES.wilds, BIOMES)).toBeTruthy();      // stone → a bronze+ biome
    expect(nextAgeBiomeId(BIOMES.no_mans_land, BIOMES)).toBeNull(); // modern is the last age
  });

  it('at progress 0 the table is the biome base table', () => {
    expect(spawnTableAt(BIOMES.wilds, 0, BIOMES, ENEMIES)).toEqual(BIOMES.wilds.spawnTable);
  });

  it('at progress 1 it weights the biome tough enemy up and seeds a next-age enemy', () => {
    const late = spawnTableAt(BIOMES.colosseum, 1, BIOMES, ENEMIES); // classical → medieval seeds
    // cyclops is the highest-baseHp classical enemy → its weight rises vs the base table
    expect(late.cyclops).toBeGreaterThan(BIOMES.colosseum.spawnTable.cyclops ?? 0);
    // at least one enemy id NOT in the base table appears (a next-age seed)
    const baseIds = new Set(Object.keys(BIOMES.colosseum.spawnTable));
    expect(Object.keys(late).some((id) => !baseIds.has(id))).toBe(true);
  });
});
