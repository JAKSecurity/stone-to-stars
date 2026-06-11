import { describe, it, expect } from 'vitest';
import {
  fuseWeapons, leveledDps, canFuse, fusionName, TRAJECTORY_PRECEDENCE,
  FUSION_PREMIUM, MAX_BASES, hybridId,
} from '../src/run/fusion';
import { WeaponDef } from '../src/game/types';

const W = (over: Partial<WeaponDef>): WeaponDef => ({
  id: 'w', name: 'W', tier: 'iron', projectileSprite: 'spr_w',
  cooldownMs: 500, damage: 20, count: 1, spread: 0, speed: 400,
  behavior: 'straight', archetype: 'bolt', maxLevel: 3,
  levelScaling: { damage: 5 }, ...over,
});

describe('fusion', () => {
  const spear = W({ id: 'spear', name: 'Spear', archetype: 'piercer', onHit: { pierce: 2 } });
  const torch = W({ id: 'torch', name: 'Torch', archetype: 'trail', cooldownMs: 400, damage: 10 });

  it('leveledDps applies levelScaling before the budget math', () => {
    // level 3 = 2 steps: damage 20 + 5*2 = 30; dps = 30 * 1 * (1000/500) = 60
    expect(leveledDps(spear, 3)).toBeCloseTo(60);
  });

  it('fuses two bases into a hybrid with unioned onHit and premium budget', () => {
    const h = fuseWeapons({ def: spear, level: 3 }, { def: torch, level: 3 });
    expect(h.bases).toEqual(expect.arrayContaining(['piercer', 'trail']));
    expect(h.trajectory).toBe('trail');               // trail outranks straight
    expect(h.onHit!.pierce).toBe(2);                   // union keeps the pierce
    expect(h.maxLevel).toBe(4);                       // deeper parent (3) + 1
    // budget: dps(spear L3)=60, dps(torch L3)= (10+10) * (1000/400) = 50 → (110)*1.15 ≈ 126.5
    const hDps = h.damage * h.count * (1000 / h.cooldownMs);
    expect(hDps).toBeGreaterThan(110);                // strictly better than parents' sum × 1.0
    expect(hDps).toBeLessThan(110 * FUSION_PREMIUM * 1.15); // and within premium + rounding slack
  });

  it('numeric onHit fields union by max, ignoreArmor by OR', () => {
    const a = W({ archetype: 'chain', onHit: { chain: 3, pierce: 1 } });
    const b = W({ archetype: 'piercer', onHit: { pierce: 4, ignoreArmor: true } });
    const h = fuseWeapons({ def: a, level: 1 }, { def: b, level: 1 });
    expect(h.onHit!.chain).toBe(3);
    expect(h.onHit!.pierce).toBe(4);
    expect(h.onHit!.ignoreArmor).toBe(true);
  });

  it('canFuse blocks beyond MAX_BASES total bases', () => {
    const hybrid = fuseWeapons({ def: spear, level: 3 }, { def: torch, level: 3 });
    const third = W({ id: 'orb', archetype: 'orbiter' });
    expect(canFuse(hybrid, third)).toBe(true);        // 2 + 1 = 3 → allowed
    const triple = fuseWeapons({ def: hybrid, level: 1 }, { def: third, level: 1 });
    expect(triple.bases).toHaveLength(MAX_BASES);
    expect(canFuse(triple, spear)).toBe(false);       // 3 + 1 > MAX_BASES
  });

  it('same-archetype fusion is allowed and dedupes bases', () => {
    const a = W({ id: 'a', archetype: 'bolt' });
    const b = W({ id: 'b', archetype: 'bolt' });
    const h = fuseWeapons({ def: a, level: 2 }, { def: b, level: 2 });
    expect(h.bases).toEqual(['bolt']);
    expect(canFuse(h, a)).toBe(true);
  });

  it('fusionName: authored 2-way name, prefixed 3-way name, deterministic id', () => {
    expect(fusionName(['piercer', 'trail'])).toBe('Dragonlance');
    expect(fusionName(['piercer', 'trail', 'chain'])).toMatch(/Dragonlance/); // prefixed
    expect(hybridId(['trail', 'piercer'])).toBe(hybridId(['piercer', 'trail'])); // order-free
  });

  it('precedence table covers every trajectory', () => {
    for (const t of ['straight', 'lob', 'orbit', 'boomerang', 'trail', 'homing'] as const) {
      expect(TRAJECTORY_PRECEDENCE[t]).toBeGreaterThan(0);
    }
  });

  it('budget lower bound holds even for adversarial low-damage/high-count parents', () => {
    const cases: Array<[Partial<WeaponDef>, Partial<WeaponDef>]> = [
      [{ id: 'p1', damage: 1, count: 8, cooldownMs: 200 }, { id: 'p2', damage: 1, count: 8, cooldownMs: 200 }],
      [{ id: 'p3', damage: 2, count: 5, cooldownMs: 333 }, { id: 'p4', damage: 1, count: 7, cooldownMs: 451 }],
      [{ id: 'p5', damage: 1, count: 1, cooldownMs: 1100 }, { id: 'p6', damage: 1, count: 1, cooldownMs: 990 }],
    ];
    for (const [oa, ob] of cases) {
      const a = W({ ...oa, archetype: 'bolt' }), b = W({ ...ob, archetype: 'piercer' });
      const h = fuseWeapons({ def: a, level: 1 }, { def: b, level: 1 });
      const hDps = h.damage * h.count * (1000 / h.cooldownMs);
      expect(hDps).toBeGreaterThanOrEqual(leveledDps(a, 1) + leveledDps(b, 1));
    }
  });
});
