import { describe, it, expect } from 'vitest';
import { ENEMIES } from '../src/run/enemyData';
import { RESOURCES } from '../src/game/types';
import { SPRITES } from '../src/art/registry';

describe('enemyData', () => {
  it('defines beast and scholar', () => {
    expect(ENEMIES.beast).toBeDefined();
    expect(ENEMIES.scholar).toBeDefined();
  });

  it('each entry key matches its id and uses a registered sprite', () => {
    for (const [key, def] of Object.entries(ENEMIES)) {
      expect(def.id).toBe(key);
      expect(SPRITES[def.sprite], def.sprite).toBeDefined();
    }
  });

  it('each entry has positive stats and a valid drop resource', () => {
    for (const def of Object.values(ENEMIES)) {
      expect(def.baseHp).toBeGreaterThan(0);
      expect(def.speed).toBeGreaterThan(0);
      expect(def.contactDamage).toBeGreaterThan(0);
      expect(def.xp).toBeGreaterThan(0);
      expect(RESOURCES).toContain(def.drop);
      expect(def.displaySize.w).toBeGreaterThan(0);
      expect(def.displaySize.h).toBeGreaterThan(0);
    }
  });

  it('every enemy has a non-empty display name', () => {
    for (const def of Object.values(ENEMIES)) {
      expect(typeof def.name).toBe('string');
      expect(def.name.length).toBeGreaterThan(0);
    }
  });
});
