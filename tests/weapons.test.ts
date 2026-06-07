import { describe, it, expect } from 'vitest';
import {
  MAX_WEAPON_SLOTS, initialWeapons, addWeapon, levelWeapon,
  evolutionFor, applyEvolve,
} from '../src/run/weapons';
import { WeaponDef } from '../src/game/types';

// A self-contained fixture so the test does not depend on RC-008 content.
const FIXTURE: Record<string, WeaponDef> = {
  spark: {
    id: 'spark', name: 'Spark', tier: 'stone', projectileSprite: 'x',
    cooldownMs: 500, damage: 5, count: 1, spread: 0, speed: 400, behavior: 'straight',
    maxLevel: 3, levelScaling: {}, evolvesTo: 'blaze', evolveRequiresPerk: 'sharpen',
  },
  blaze: {
    id: 'blaze', name: 'Blaze', tier: 'bronze', projectileSprite: 'x',
    cooldownMs: 400, damage: 12, count: 2, spread: 0.2, speed: 440, behavior: 'cone',
    maxLevel: 3, levelScaling: {},
  },
};

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

describe('weapons — evolution', () => {
  it('evolutionFor returns the evolved id when maxed and the perk is owned', () => {
    const r = evolutionFor({ id: 'spark', level: 3 }, ['sharpen'], FIXTURE);
    expect(r).toBe('blaze');
  });

  it('evolutionFor returns null when below max level', () => {
    expect(evolutionFor({ id: 'spark', level: 2 }, ['sharpen'], FIXTURE)).toBeNull();
  });

  it('evolutionFor returns null when the required perk is not owned', () => {
    expect(evolutionFor({ id: 'spark', level: 3 }, ['rapid'], FIXTURE)).toBeNull();
  });

  it('evolutionFor returns null for a weapon with no evolution', () => {
    expect(evolutionFor({ id: 'blaze', level: 3 }, ['sharpen'], FIXTURE)).toBeNull();
  });

  it('applyEvolve replaces the weapon with its evolved form at level 1', () => {
    const eq = [{ id: 'club', level: 2 }, { id: 'spark', level: 3 }];
    expect(applyEvolve(eq, 'spark', 'blaze')).toEqual([
      { id: 'club', level: 2 }, { id: 'blaze', level: 1 },
    ]);
  });
});
