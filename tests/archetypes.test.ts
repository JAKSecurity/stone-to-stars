import { describe, it, expect } from 'vitest';
import {
  ARCHETYPES, MAX_LEVEL_BY_AGE, resolveShape, ARCHETYPE_IDS,
} from '../src/run/archetypes';
import { WeaponDef } from '../src/game/types';

const base = (over: Partial<WeaponDef>): WeaponDef => ({
  id: 'x', name: 'X', tier: 'iron', projectileSprite: 's',
  cooldownMs: 500, damage: 10, count: 1, spread: 0, speed: 400,
  archetype: 'bolt', maxLevel: 3, levelScaling: {}, ...over,
});

describe('archetypes', () => {
  it('defines a preset for all 10 archetypes', () => {
    expect(ARCHETYPE_IDS).toHaveLength(10);
    for (const id of ARCHETYPE_IDS) expect(ARCHETYPES[id]).toBeDefined();
  });

  it('age-scaled max levels: early shallow, late deep', () => {
    expect(MAX_LEVEL_BY_AGE.stone).toBe(2);
    expect(MAX_LEVEL_BY_AGE.bronze).toBe(2);
    expect(MAX_LEVEL_BY_AGE.iron).toBe(3);
    expect(MAX_LEVEL_BY_AGE.classical).toBe(3);
    expect(MAX_LEVEL_BY_AGE.medieval).toBe(4);
    expect(MAX_LEVEL_BY_AGE.renaissance).toBe(4);
    expect(MAX_LEVEL_BY_AGE.industrial).toBe(5);
    expect(MAX_LEVEL_BY_AGE.modern).toBe(5);
  });

  it('resolveShape: base weapon takes trajectory + default onHit from its preset', () => {
    const def = base({ archetype: 'piercer', onHit: { pierce: 3 } });
    const s = resolveShape(def);
    expect(s.trajectory).toBe('straight');
    expect(s.onHit.pierce).toBe(3);          // explicit override wins
    expect(s.bases).toEqual(['piercer']);
  });

  it('resolveShape: preset default onHit applies when def has none', () => {
    const s = resolveShape(base({ archetype: 'lobber' }));
    expect(s.trajectory).toBe('lob');
    expect(s.onHit.explode).toBeGreaterThan(0);
  });

  it('resolveShape: hybrids keep their explicit trajectory/onHit/bases', () => {
    const def = base({
      archetype: 'piercer', trajectory: 'orbit',
      onHit: { pierce: 2, explode: 64 }, bases: ['piercer', 'lobber'],
    });
    const s = resolveShape(def);
    expect(s.trajectory).toBe('orbit');
    expect(s.bases).toEqual(['piercer', 'lobber']);
  });
});
