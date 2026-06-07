import { describe, it, expect } from 'vitest';
import {
  MAX_WEAPON_SLOTS, initialWeapons, addWeapon, levelWeapon,
} from '../src/run/weapons';

describe('weapons — slots', () => {
  it('a run starts with only the base club at level 1', () => {
    expect(initialWeapons()).toEqual([{ id: 'club', level: 1 }]);
  });

  it('addWeapon appends a new weapon at level 1', () => {
    const out = addWeapon(initialWeapons(), 'bronze_spear');
    expect(out).toEqual([{ id: 'club', level: 1 }, { id: 'bronze_spear', level: 1 }]);
  });

  it('addWeapon is a no-op when the weapon is already equipped', () => {
    const eq = [{ id: 'club', level: 3 }];
    expect(addWeapon(eq, 'club')).toEqual(eq);
  });

  it('addWeapon is a no-op when all slots are full', () => {
    const full = Array.from({ length: MAX_WEAPON_SLOTS }, (_, i) => ({ id: `w${i}`, level: 1 }));
    expect(addWeapon(full, 'bronze_spear')).toEqual(full);
  });

  it('levelWeapon raises one weapon and caps at its maxLevel', () => {
    let eq = [{ id: 'club', level: 4 }];
    eq = levelWeapon(eq, 'club'); // 4 -> 5
    expect(eq).toEqual([{ id: 'club', level: 5 }]);
    eq = levelWeapon(eq, 'club'); // 5 -> capped at 5 (club maxLevel)
    expect(eq).toEqual([{ id: 'club', level: 5 }]);
  });

  it('levelWeapon never mutates its input', () => {
    const eq = [{ id: 'club', level: 1 }];
    levelWeapon(eq, 'club');
    expect(eq).toEqual([{ id: 'club', level: 1 }]);
  });
});
