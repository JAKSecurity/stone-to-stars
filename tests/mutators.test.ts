import { describe, it, expect } from 'vitest';
import { MUTATORS } from '../src/run/mutatorData';
import { combineMutators, applyHaulMult } from '../src/run/mutators';

describe('mutators', () => {
  it('catalog: exactly the 4 launch mutators with half-the-risk values', () => {
    expect(Object.keys(MUTATORS).sort()).toEqual(['frail', 'horde', 'ironclad', 'night_raid']);
    expect(MUTATORS.night_raid.effects.enemySpeedMult).toBe(1.5);
    expect(MUTATORS.night_raid.rewardBonus).toBe(0.25);
    expect(MUTATORS.horde.effects.enemyCountMult).toBe(1.5);
    expect(MUTATORS.horde.rewardBonus).toBe(0.25);
    expect(MUTATORS.frail.effects.maxHpMult).toBe(0.6);
    expect(MUTATORS.frail.rewardBonus).toBe(0.2);
    expect(MUTATORS.ironclad.effects.enemyArmorAdd).toBe(1);
    expect(MUTATORS.ironclad.rewardBonus).toBe(0.2);
  });

  it('combineMutators: identity for none, additive rewardMult for all', () => {
    const none = combineMutators([]);
    expect(none.effects).toEqual({ enemySpeedMult: 1, enemyCountMult: 1, maxHpMult: 1, enemyArmorAdd: 0 });
    expect(none.rewardMult).toBe(1);
    const all = combineMutators(['night_raid', 'horde', 'frail', 'ironclad']);
    expect(all.rewardMult).toBeCloseTo(1.9);
    expect(all.effects.enemySpeedMult).toBe(1.5);
    expect(all.effects.enemyCountMult).toBe(1.5);
    expect(all.effects.maxHpMult).toBe(0.6);
    expect(all.effects.enemyArmorAdd).toBe(1);
  });

  it('combineMutators ignores unknown ids and duplicates', () => {
    const r = combineMutators(['frail', 'frail', 'ghost']);
    expect(r.rewardMult).toBeCloseTo(1.2); // frail counted once, ghost ignored
    expect(r.effects.maxHpMult).toBe(0.6);
  });

  it('applyHaulMult multiplies per resource and rounds', () => {
    const out = applyHaulMult({ exploration: 10, science: 3, industry: 0, culture: 7 }, 1.25);
    expect(out).toEqual({ exploration: 13, science: 4, industry: 0, culture: 9 });
  });

  it('applyHaulMult at ×1 is the identity', () => {
    const c = { exploration: 5, science: 5, industry: 5, culture: 5 };
    expect(applyHaulMult(c, 1)).toEqual(c);
  });
});
