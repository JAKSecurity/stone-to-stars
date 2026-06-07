import { describe, it, expect } from 'vitest';
import { WEAPONS } from '../src/run/weaponData';

describe('weaponData', () => {
  it('defines the base club and the bronze spear', () => {
    expect(WEAPONS.club).toBeDefined();
    expect(WEAPONS.bronze_spear).toBeDefined();
  });

  it('every weapon has a positive cooldown, damage, count, and maxLevel', () => {
    for (const [key, def] of Object.entries(WEAPONS)) {
      expect(def.cooldownMs).toBeGreaterThan(0);
      expect(def.damage).toBeGreaterThan(0);
      expect(def.count).toBeGreaterThanOrEqual(1);
      expect(def.maxLevel).toBeGreaterThanOrEqual(1);
      expect(def.id).toBe(key); // catalog key matches the entry's own id
    }
  });

  it('the club projectile sprite matches the existing art id', () => {
    expect(WEAPONS.club.projectileSprite).toBe('shot_club');
    expect(WEAPONS.bronze_spear.projectileSprite).toBe('shot_bronze');
  });
});
