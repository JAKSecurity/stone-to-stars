import { AgeId } from './types';

// Age -> hero sprite id. Ages without an entry fall back to the base hero.
// Each new age appends its hero here.
export const HERO_SPRITE_BY_AGE: Partial<Record<AgeId, string>> = {
  iron: 'hero_iron',
  classical: 'hero_classical',
  medieval: 'hero_medieval',
  renaissance: 'hero_renaissance',
  industrial: 'hero_industrial',
  modern: 'hero_modern',
  space: 'hero_space',
};

export function heroSpriteFor(age: AgeId): string {
  return HERO_SPRITE_BY_AGE[age] ?? 'hero';
}
