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
});
