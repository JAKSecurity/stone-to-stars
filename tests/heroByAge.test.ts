import { describe, it, expect } from 'vitest';
import { HERO_SPRITE_BY_AGE, heroSpriteFor } from '../src/game/heroByAge';
import { SPRITES } from '../src/art/registry';

describe('heroByAge', () => {
  it('falls back to the base hero for ages with no entry', () => {
    expect(heroSpriteFor('stone')).toBe('hero');
    expect(heroSpriteFor('bronze')).toBe('hero');
  });
  it('maps iron to hero_iron', () => {
    expect(heroSpriteFor('iron')).toBe('hero_iron');
  });
  it('maps space to hero_space (RC-041)', () => {
    expect(heroSpriteFor('space')).toBe('hero_space');
  });
  it('every mapped hero sprite is registered in SPRITES', () => {
    for (const id of Object.values(HERO_SPRITE_BY_AGE)) {
      expect(SPRITES[id as string]).toBeDefined();
    }
  });
  it('the base hero is registered', () => {
    expect(SPRITES['hero']).toBeDefined();
  });
});
