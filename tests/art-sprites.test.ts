import { describe, it, expect } from 'vitest';
import { SPRITES, validateSpriteDef } from '../src/art/registry';
import { SpriteDef } from '../src/art/types';

describe('validateSpriteDef', () => {
  it('accepts a well-formed def', () => {
    const ok: SpriteDef = { id: 'x', w: 10, h: 10, prims: [{ kind: 'circle', cx: 5, cy: 5, r: 3, color: '#abc' }] };
    expect(validateSpriteDef(ok)).toEqual([]);
  });
  it('flags empty id, non-positive size, no prims', () => {
    expect(validateSpriteDef({ id: '', w: 0, h: 0, prims: [] } as SpriteDef).length).toBeGreaterThan(0);
  });
  it('flags a circle outside the canvas bounds', () => {
    const bad: SpriteDef = { id: 'b', w: 10, h: 10, prims: [{ kind: 'circle', cx: 50, cy: 5, r: 3, color: '#abc' }] };
    expect(validateSpriteDef(bad).length).toBeGreaterThan(0);
  });
  it('flags a poly with fewer than 3 points', () => {
    const bad: SpriteDef = { id: 'b', w: 10, h: 10, prims: [{ kind: 'poly', points: [[1, 1], [2, 2]], color: '#abc' }] };
    expect(validateSpriteDef(bad).length).toBeGreaterThan(0);
  });
});

describe('SPRITES registry', () => {
  it('every registered sprite is valid', () => {
    for (const [id, def] of Object.entries(SPRITES)) {
      expect(def.id, `id key ${id} matches def.id`).toBe(id);
      expect(validateSpriteDef(def), `sprite ${id}: ${validateSpriteDef(def).join('; ')}`).toEqual([]);
    }
  });

  it('Iron Age enemy sprites are registered and valid', () => {
    const ironIds = ['cave_dweller', 'rock_golem', 'automaton', 'iron_golem'];
    for (const id of ironIds) {
      expect(SPRITES[id], `sprite ${id} should be registered`).toBeDefined();
      expect(validateSpriteDef(SPRITES[id]), `sprite ${id}: ${validateSpriteDef(SPRITES[id]).join('; ')}`).toEqual([]);
    }
  });

  it('Iron Age building sprites are registered and valid', () => {
    const ironBuildingIds = ['smelter', 'foundry', 'deep_mine'];
    for (const id of ironBuildingIds) {
      expect(SPRITES[id], `sprite ${id} should be registered`).toBeDefined();
      expect(validateSpriteDef(SPRITES[id]), `sprite ${id}: ${validateSpriteDef(SPRITES[id]).join('; ')}`).toEqual([]);
    }
  });

  it('Classical building sprites are registered and valid', () => {
    const classicalBuildingIds = ['academy', 'market', 'workshop'];
    for (const id of classicalBuildingIds) {
      expect(SPRITES[id], `sprite ${id} should be registered`).toBeDefined();
      expect(validateSpriteDef(SPRITES[id]), `sprite ${id}: ${validateSpriteDef(SPRITES[id]).join('; ')}`).toEqual([]);
    }
  });

  it('Iron Age projectile sprites are registered and valid', () => {
    const ironProjectileIds = ['shot_iron_pick', 'shot_hammer', 'shot_sawblade', 'shot_flame'];
    for (const id of ironProjectileIds) {
      expect(SPRITES[id], `sprite ${id} should be registered`).toBeDefined();
      expect(validateSpriteDef(SPRITES[id]), `sprite ${id}: ${validateSpriteDef(SPRITES[id]).join('; ')}`).toEqual([]);
    }
  });

  it('Iron Age hero sprite is registered and valid', () => {
    expect(SPRITES['hero_iron'], 'sprite hero_iron should be registered').toBeDefined();
    expect(validateSpriteDef(SPRITES['hero_iron']), `sprite hero_iron: ${validateSpriteDef(SPRITES['hero_iron']).join('; ')}`).toEqual([]);
  });

  it('Classical enemy sprites are registered and valid', () => {
    const classicalIds = ['harpy', 'hoplite', 'centaur', 'cyclops'];
    for (const id of classicalIds) {
      expect(SPRITES[id], `sprite ${id} should be registered`).toBeDefined();
      expect(validateSpriteDef(SPRITES[id]), `sprite ${id}: ${validateSpriteDef(SPRITES[id]).join('; ')}`).toEqual([]);
    }
  });

  it('Classical projectile + hero sprites are registered and valid', () => {
    const classicalSpriteIds = ['shot_javelin', 'shot_gladius', 'shot_ballista', 'shot_discus', 'hero_classical'];
    for (const id of classicalSpriteIds) {
      expect(SPRITES[id], `sprite ${id} should be registered`).toBeDefined();
      expect(validateSpriteDef(SPRITES[id]), `sprite ${id}: ${validateSpriteDef(SPRITES[id]).join('; ')}`).toEqual([]);
    }
  });

  it('Medieval building sprites are registered and valid', () => {
    const medievalBuildingIds = ['keep', 'cathedral', 'armory'];
    for (const id of medievalBuildingIds) {
      expect(SPRITES[id], `sprite ${id} should be registered`).toBeDefined();
      expect(validateSpriteDef(SPRITES[id]), `sprite ${id}: ${validateSpriteDef(SPRITES[id]).join('; ')}`).toEqual([]);
    }
  });

  it('Medieval enemy sprites are registered and valid', () => {
    const medievalIds = ['skeleton', 'knight', 'gargoyle', 'dragon'];
    for (const id of medievalIds) {
      expect(SPRITES[id], `sprite ${id} should be registered`).toBeDefined();
      expect(validateSpriteDef(SPRITES[id]), `sprite ${id}: ${validateSpriteDef(SPRITES[id]).join('; ')}`).toEqual([]);
    }
  });

  it('Medieval projectile + hero sprites are registered and valid', () => {
    const medievalSpriteIds = ['shot_bolt', 'shot_slash', 'shot_halberd', 'shot_flail', 'hero_medieval'];
    for (const id of medievalSpriteIds) {
      expect(SPRITES[id], `sprite ${id} should be registered`).toBeDefined();
      expect(validateSpriteDef(SPRITES[id]), `sprite ${id}: ${validateSpriteDef(SPRITES[id]).join('; ')}`).toEqual([]);
    }
  });

  it('Renaissance building sprites are registered and valid', () => {
    const renaissanceBuildingIds = ['gunsmith', 'university', 'bank'];
    for (const id of renaissanceBuildingIds) {
      expect(SPRITES[id], `sprite ${id} should be registered`).toBeDefined();
      expect(validateSpriteDef(SPRITES[id]), `sprite ${id}: ${validateSpriteDef(SPRITES[id]).join('; ')}`).toEqual([]);
    }
  });

  it('Renaissance enemy sprites are registered and valid', () => {
    const renaissanceIds = ['musketeer', 'pikeman', 'grenadier', 'dreadnought'];
    for (const id of renaissanceIds) {
      expect(SPRITES[id], `sprite ${id} should be registered`).toBeDefined();
      expect(validateSpriteDef(SPRITES[id]), `sprite ${id}: ${validateSpriteDef(SPRITES[id]).join('; ')}`).toEqual([]);
    }
  });
});
