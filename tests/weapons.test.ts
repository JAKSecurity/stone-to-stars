import { describe, it, expect } from 'vitest';
import {
  addWeapon, swapWeapon, levelWeapon, initialWeapons, weaponShot, MAX_WEAPON_SLOTS, equipHybrid,
} from '../src/run/weapons';
import { WEAPONS } from '../src/run/weaponData';

describe('weapons v2 — slots', () => {
  it('two generic slots: second pick fills the empty slot', () => {
    const eq = addWeapon(initialWeapons('club'), 'bronze_spear');
    expect(eq.map((w) => w.id)).toEqual(['club', 'bronze_spear']);
  });
  it('addWeapon refuses a third weapon (must swap instead)', () => {
    const eq = addWeapon(addWeapon(initialWeapons('club'), 'bronze_spear'), 'gladius');
    expect(eq).toHaveLength(MAX_WEAPON_SLOTS);
    expect(eq.map((w) => w.id)).toEqual(['club', 'bronze_spear']); // unchanged
  });
  it('swapWeapon replaces a named slot at level 1', () => {
    const eq = swapWeapon(addWeapon(initialWeapons('club'), 'bronze_spear'), 'club', 'gladius');
    expect(eq.map((w) => w.id)).toEqual(['gladius', 'bronze_spear']);
    expect(eq[0].level).toBe(1);
  });
  it('levelWeapon caps at the def maxLevel (hybrid defs included via defOf)', () => {
    let eq = initialWeapons('club'); // club maxLevel 2
    eq = levelWeapon(eq, 'club'); eq = levelWeapon(eq, 'club');
    expect(eq[0].level).toBe(2);
  });
  it('weaponShot v2 carries trajectory + onHit', () => {
    const s = weaponShot(WEAPONS.bronze_spear, 1, 1);
    expect(s.trajectory).toBe('straight');
    expect(s.onHit.pierce).toBeGreaterThanOrEqual(1);
  });

  it('equipHybrid replaces both weapons with the hybrid def at level 1', () => {
    const hybrid = { ...WEAPONS.club, id: 'hybrid:bolt+piercer', name: 'Lancer Bolt', bases: ['bolt', 'piercer'] as any[] } as any;
    const eq = equipHybrid(hybrid);
    expect(eq).toHaveLength(1);
    expect(eq[0]).toEqual({ id: 'hybrid:bolt+piercer', level: 1, hybrid });
  });
});
