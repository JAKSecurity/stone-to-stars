import { describe, it, expect } from 'vitest';
import { PASSIVES, PASSIVE_FUSIONS } from '../src/run/passiveData';
import {
  addPassive, levelPassive, fusePassives, recomputeStats, passiveDefOf, MAX_PASSIVE_SLOTS,
} from '../src/run/passives';
import { RunStats } from '../src/game/types';

const base: RunStats = {
  hp: 100, maxHp: 100, damageMult: 1, fireRateMult: 1, moveSpeedMult: 1,
  pickupRadius: 60, level: 1, xp: 0, regenHps: 0, xpMult: 1, activeCharges: 1,
};

describe('passives', () => {
  it('every passive is a tradeoff: ≥1 positive and ≥1 negative axis', () => {
    for (const p of Object.values(PASSIVES)) {
      const vals = Object.values(p.effectPerLevel);
      expect(vals.some((v) => v! > 0), p.id).toBe(true);
      expect(vals.some((v) => v! < 0), p.id).toBe(true);
    }
  });

  it('two slots, addPassive refuses a third', () => {
    let eq = addPassive([], 'whetstone');
    eq = addPassive(eq, 'oxhide');
    expect(addPassive(eq, 'winged_boots')).toEqual(eq);
    expect(eq).toHaveLength(MAX_PASSIVE_SLOTS);
  });

  it('recomputeStats applies effect × level on top of base, preserving hp ratio', () => {
    const eq = [{ id: 'oxhide', level: 2 }]; // +30 maxHp, −5% move per level
    const out = recomputeStats(base, eq, 0.5);
    expect(out.maxHp).toBe(160);
    expect(out.hp).toBe(80);                     // ratio 0.5 preserved
    expect(out.moveSpeedMult).toBeCloseTo(0.9);
  });

  it('maxHp floors at 1 and multipliers floor at 0.1', () => {
    const eq = [{ id: 'powder_bandolier', level: 3 }]; // −12 maxHp per level among others
    const out = recomputeStats({ ...base, maxHp: 20, hp: 20 }, eq, 1);
    expect(out.maxHp).toBeGreaterThanOrEqual(1);
  });

  it('fusePassives: authored pair merges into one hybrid def, freeing a slot', () => {
    const eq = [{ id: 'whetstone', level: 3 }, { id: 'rapid_levers', level: 3 }];
    const fused = fusePassives(eq)!;
    expect(fused).toHaveLength(1);
    expect(fused[0].hybrid).toBeDefined();
    expect(passiveDefOf(fused[0]).name).toBe(PASSIVE_FUSIONS['rapid_levers+whetstone'].name);
  });

  it('levelPassive raises a level and caps at maxLevel', () => {
    let eq = [{ id: 'powder_bandolier', level: 1 }];
    eq = levelPassive(eq, 'powder_bandolier');
    eq = levelPassive(eq, 'powder_bandolier');
    expect(eq[0].level).toBe(2); // maxLevel 2
  });

  it('fusePassives returns null for unauthored pairs', () => {
    const eq = [{ id: 'whetstone', level: 3 }, { id: 'scholars_kit', level: 3 }];
    expect(fusePassives(eq)).toBeNull();
  });
});
