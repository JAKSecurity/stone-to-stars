import { describe, it, expect } from 'vitest';
import { BUILDINGS } from '../src/camp/buildingData';
import { AGE_ORDER } from '../src/game/types';

describe('buildingData ages', () => {
  it('every building declares a valid age', () => {
    for (const def of Object.values(BUILDINGS)) {
      expect(AGE_ORDER, `${def.id} age`).toContain(def.age);
    }
  });
  it('ages match the unlock ladder (spot check)', () => {
    expect(BUILDINGS.granary.age).toBe('stone');
    expect(BUILDINGS.forge.age).toBe('bronze');
    expect(BUILDINGS.smelter.age).toBe('iron');
    expect(BUILDINGS.motor_pool.age).toBe('modern');
  });
});
