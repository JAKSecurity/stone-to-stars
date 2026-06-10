import { describe, it, expect } from 'vitest';
import {
  MAX_WEAPON_SLOTS, weaponClass, rangeFactorForTier, initialWeapons, addWeapon, levelWeapon,
  evolutionFor, applyEvolve, weaponShot, draftOptions, rollRunDraft,
} from '../src/run/weapons';
import { WEAPONS } from '../src/run/weaponData';

function stubRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}
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

describe('weapons — classes & slots', () => {
  it('classifies hand weapons as melee, everything else ranged', () => {
    expect(weaponClass('club')).toBe('melee');
    expect(weaponClass('war_hammer')).toBe('melee');
    expect(weaponClass('musket')).toBe('ranged');
    expect(weaponClass('flame_jet')).toBe('ranged');
    expect(MAX_WEAPON_SLOTS).toBe(2); // one melee + one ranged
  });

  it('a run starts with only the base club at level 1', () => {
    expect(initialWeapons()).toEqual([{ id: 'club', level: 1 }]);
  });

  it('initialWeapons starts with the chosen weapon (RC-027 starting-weapon choice)', () => {
    expect(initialWeapons('musket')).toEqual([{ id: 'musket', level: 1 }]);
  });

  it('addWeapon fills the empty ranged slot, keeping the melee club', () => {
    const out = addWeapon(initialWeapons(), 'musket'); // ranged
    expect(out).toEqual([{ id: 'club', level: 1 }, { id: 'musket', level: 1 }]);
  });

  it('addWeapon SWAPS the weapon of the same class (drafting a new one replaces it)', () => {
    const out = addWeapon([{ id: 'club', level: 5 }], 'war_hammer'); // both melee
    expect(out).toEqual([{ id: 'war_hammer', level: 1 }]);
  });

  it('addWeapon swaps only the matching class, leaving the other slot intact', () => {
    const out = addWeapon([{ id: 'club', level: 3 }, { id: 'musket', level: 2 }], 'war_hammer');
    expect(out).toEqual([{ id: 'musket', level: 2 }, { id: 'war_hammer', level: 1 }]);
  });

  it('addWeapon is a no-op when that exact weapon is already equipped', () => {
    const eq = [{ id: 'club', level: 3 }];
    expect(addWeapon(eq, 'club')).toEqual(eq);
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

describe('weapons — weaponShot', () => {
  it('level 1 club returns its base numbers, scaled by damageMult', () => {
    const shot = weaponShot(WEAPONS.club, 1, 2.0);
    expect(shot.damage).toBe(24);      // 12 * 2.0
    expect(shot.count).toBe(1);
    expect(shot.cooldownMs).toBe(500);
    expect(shot.sprite).toBe('shot_club');
    expect(shot.pierce).toBe(0);
  });

  it('higher levels apply (level-1) steps of levelScaling', () => {
    const shot = weaponShot(WEAPONS.club, 3, 1.0); // 2 steps: +4 dmg, -40 cd each
    expect(shot.damage).toBe(20);      // 12 + 4*2
    expect(shot.cooldownMs).toBe(420); // 500 - 40*2
  });

  it('cooldown never drops below the 120ms floor', () => {
    const shot = weaponShot(WEAPONS.club, 5, 1.0); // 4 steps: 500 - 160 = 340 (above floor)
    expect(shot.cooldownMs).toBe(340);
  });

  it('carries pierce from the def', () => {
    const shot = weaponShot(WEAPONS.bronze_spear, 1, 1.0);
    expect(shot.pierce).toBe(1);
    expect(shot.count).toBe(2);
  });

  it('range factor cuts hard for early ages, tapering back for late', () => {
    expect(rangeFactorForTier('stone')).toBe(0.25);     // -75%
    expect(rangeFactorForTier('classical')).toBe(0.50); // -50%
    expect(rangeFactorForTier('modern')).toBe(0.75);    // -25%
  });

  it('carries a tier-scaled lifetime (range) and the armor-pierce flag', () => {
    expect(weaponShot(WEAPONS.club, 1, 1).lifeMs).toBe(300);      // stone: 1200 × 0.25
    expect(weaponShot(WEAPONS.club, 1, 1).ignoresArmor).toBe(false);
    expect(weaponShot(WEAPONS.sniper, 1, 1).lifeMs).toBe(900);    // modern: 1200 × 0.75
    expect(weaponShot(WEAPONS.sniper, 1, 1).ignoresArmor).toBe(true);
  });
});

describe('weapons — draft options', () => {
  it('offers a new weapon from the pool, a club level-up, and perks', () => {
    const opts = draftOptions({
      equipped: [{ id: 'club', level: 1 }],
      ownedPerks: [],
      pool: ['club', 'bronze_spear'],
    });
    expect(opts).toContainEqual({ kind: 'newWeapon', weaponId: 'bronze_spear' });
    expect(opts).toContainEqual({ kind: 'levelWeapon', weaponId: 'club' });
    expect(opts.some((o) => o.kind === 'perk')).toBe(true);
    // club is already equipped, so it is never offered as a NEW weapon
    expect(opts).not.toContainEqual({ kind: 'newWeapon', weaponId: 'club' });
  });

  it('does not offer a level-up for a maxed weapon', () => {
    const opts = draftOptions({
      equipped: [{ id: 'club', level: 5 }], // club maxLevel is 5
      ownedPerks: [],
      pool: ['club'],
    });
    expect(opts).not.toContainEqual({ kind: 'levelWeapon', weaponId: 'club' });
  });

  it('offers a pool weapon you do not hold even with both class slots filled (it swaps in)', () => {
    const opts = draftOptions({
      equipped: [{ id: 'club', level: 1 }, { id: 'musket', level: 1 }],
      ownedPerks: [],
      pool: ['club', 'musket', 'war_hammer'],
    });
    expect(opts).toContainEqual({ kind: 'newWeapon', weaponId: 'war_hammer' });
    // already-equipped weapons are never offered as NEW
    expect(opts).not.toContainEqual({ kind: 'newWeapon', weaponId: 'club' });
    expect(opts).not.toContainEqual({ kind: 'newWeapon', weaponId: 'musket' });
  });

  it('rollRunDraft returns distinct options up to the requested count', () => {
    const picks = rollRunDraft(stubRng([0, 0, 0]), 3, {
      equipped: [{ id: 'club', level: 1 }],
      ownedPerks: [],
      pool: ['club', 'bronze_spear'],
    });
    expect(picks).toHaveLength(3);
    expect(new Set(picks.map((p) => JSON.stringify(p))).size).toBe(3);
  });
});
