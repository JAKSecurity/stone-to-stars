import { describe, it, expect } from 'vitest';
import { PASSIVES, PASSIVE_FUSIONS } from '../src/run/passiveData';
import { RELICS } from '../src/run/relicData';
import { SPRITES, validateSpriteDef } from '../src/art/registry';
import { draftOptions, rollDraft, DraftContext } from '../src/run/draft';
import { TECHS } from '../src/tech/techData';
import { TRADITIONS } from '../src/civics/traditionData';
import {
  unlockedRelics, relicsUnlockedByTech, relicForTradition,
  foodDropChance, foodHeal, rollFoodDrop, rollBonusGem,
  bloodRushBonus, secondWindRevive, regenBudget, regenTick,
} from '../src/run/relics';
import {
  FOOD_DROP_CHANCE, FOOD_HEAL, FEAST_DROP_MULT, FEAST_HEAL_MULT,
  BLOOD_RUSH_FIRE_BONUS, PROSPECTOR_CHANCE,
} from '../src/run/relicData';

describe('relic data', () => {
  it('has exactly the 6 spec relics', () => {
    expect(Object.keys(RELICS).sort()).toEqual([
      'blood_rush', 'bramble_mail', 'harvest_feast',
      'overcharge', 'prospectors_eye', 'second_wind',
    ]);
  });

  it('every relic has id-key match, name, icon, and a desc', () => {
    for (const [key, r] of Object.entries(RELICS)) {
      expect(r.id).toBe(key);
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.icon.length).toBeGreaterThan(0);
      expect(r.desc.length).toBeGreaterThan(0);
    }
  });

  it('every tech unlock points at a real tech; tradition unlocks at a real tradition within maxRank', () => {
    for (const r of Object.values(RELICS)) {
      if (r.unlock.kind === 'tech') {
        expect(TECHS[r.unlock.techId], `${r.id} gate`).toBeDefined();
      } else {
        const t = TRADITIONS[r.unlock.traditionId];
        expect(t, `${r.id} gate`).toBeDefined();
        expect(r.unlock.rank).toBeGreaterThan(0);
        expect(r.unlock.rank).toBeLessThanOrEqual(t.maxRank);
      }
    }
  });

  it('gates match the ratified spec table', () => {
    expect(RELICS.blood_rush.unlock).toEqual({ kind: 'tech', techId: 'hunting' });
    expect(RELICS.bramble_mail.unlock).toEqual({ kind: 'tech', techId: 'bronze_working' });
    expect(RELICS.prospectors_eye.unlock).toEqual({ kind: 'tech', techId: 'currency' });
    expect(RELICS.second_wind.unlock).toEqual({ kind: 'tech', techId: 'masonry' });
    expect(RELICS.overcharge.unlock).toEqual({ kind: 'tech', techId: 'electricity' });
    expect(RELICS.harvest_feast.unlock).toEqual({ kind: 'tradition', traditionId: 'vigor', rank: 3 });
  });
});

describe('relic unlock resolution', () => {
  it('tech relics unlock when the tech is researched', () => {
    expect(unlockedRelics([], {})).toEqual([]);
    expect(unlockedRelics(['hunting'], {})).toEqual(['blood_rush']);
    expect(unlockedRelics(['hunting', 'currency'], {}).sort())
      .toEqual(['blood_rush', 'prospectors_eye']);
  });

  it('tradition relic unlocks at rank >= threshold', () => {
    expect(unlockedRelics([], { vigor: 2 })).toEqual([]);
    expect(unlockedRelics([], { vigor: 3 })).toEqual(['harvest_feast']);
    expect(unlockedRelics([], { vigor: 5 })).toEqual(['harvest_feast']);
  });

  it('reverse lookups for civ-screen surfacing', () => {
    expect(relicsUnlockedByTech('hunting').map((r) => r.id)).toEqual(['blood_rush']);
    expect(relicsUnlockedByTech('pottery')).toEqual([]);
    expect(relicForTradition('vigor')?.id).toBe('harvest_feast');
    expect(relicForTradition('drill')).toBeUndefined();
  });
});

describe('food drops (healing layer A)', () => {
  it('chance and heal: 2%/5HP base, 6%/10HP with harvest_feast', () => {
    expect(foodDropChance(false)).toBeCloseTo(FOOD_DROP_CHANCE);
    expect(foodDropChance(true)).toBeCloseTo(FOOD_DROP_CHANCE * FEAST_DROP_MULT);
    expect(foodHeal(false)).toBe(FOOD_HEAL);
    expect(foodHeal(true)).toBe(FOOD_HEAL * FEAST_HEAL_MULT);
  });

  it('rollFoodDrop is deterministic against the rng value', () => {
    expect(rollFoodDrop(() => 0.019, false)).toBe(true);
    expect(rollFoodDrop(() => 0.021, false)).toBe(false);
    expect(rollFoodDrop(() => 0.059, true)).toBe(true);
    expect(rollFoodDrop(() => 0.061, true)).toBe(false);
  });
});

describe('relic mechanics helpers', () => {
  it('rollBonusGem only procs with the relic and under the chance', () => {
    expect(rollBonusGem(() => 0.05, true)).toBe(true);
    expect(rollBonusGem(() => PROSPECTOR_CHANCE + 0.01, true)).toBe(false);
    expect(rollBonusGem(() => 0.0, false)).toBe(false);
  });

  it('bloodRushBonus is the flat bonus while now < until, else 0', () => {
    expect(bloodRushBonus(1000, 2000)).toBeCloseTo(BLOOD_RUSH_FIRE_BONUS);
    expect(bloodRushBonus(2000, 2000)).toBe(0);
    expect(bloodRushBonus(0, -Infinity)).toBe(0);
  });

  it('secondWindRevive returns 30% of maxHp, floored at 1', () => {
    expect(secondWindRevive(100)).toBe(30);
    expect(secondWindRevive(1)).toBe(1);
  });
});

describe('regen lifetime budget (healing layer B)', () => {
  it('budget is 25% of maxHp', () => {
    expect(regenBudget(100)).toBe(25);
    expect(regenBudget(200)).toBe(50);
  });

  it('regenTick heals rate*dt while under budget and below maxHp', () => {
    expect(regenTick(0.6, 1000, 0, 100, 50)).toBeCloseTo(0.6);
  });

  it('regenTick clamps to the remaining budget, then shuts off', () => {
    expect(regenTick(0.6, 1000, 24.7, 100, 50)).toBeCloseTo(0.3);
    expect(regenTick(0.6, 1000, 25, 100, 50)).toBe(0);
  });

  it('regenTick never overheals past maxHp and is 0 at full HP or zero rate', () => {
    expect(regenTick(0.6, 1000, 0, 100, 99.8)).toBeCloseTo(0.2);
    expect(regenTick(0.6, 1000, 0, 100, 100)).toBe(0);
    expect(regenTick(0, 1000, 0, 100, 50)).toBe(0);
  });

  it('budget tracks CURRENT maxHp: raising maxHp re-opens a spent budget', () => {
    expect(regenTick(0.6, 1000, 25, 100, 50)).toBe(0);
    expect(regenTick(0.6, 1000, 25, 130, 50)).toBeCloseTo(0.6);
  });
});

describe('relic draft cards', () => {
  const baseCtx: DraftContext = {
    equipped: [{ id: 'club', level: 1 }], passives: [], kitPool: ['club'], catalysts: 0,
  };

  it('unlocked relics are offered while the relic slot is empty', () => {
    const opts = draftOptions({ ...baseCtx, relicPool: ['blood_rush', 'second_wind'], relic: null });
    const relicOpts = opts.filter((o) => o.kind === 'newRelic');
    expect(relicOpts).toEqual([
      { kind: 'newRelic', relicId: 'blood_rush' },
      { kind: 'newRelic', relicId: 'second_wind' },
    ]);
  });

  it('no relic cards once a relic is held, with an empty pool, or for unknown ids', () => {
    expect(draftOptions({ ...baseCtx, relicPool: ['blood_rush'], relic: 'second_wind' })
      .filter((o) => o.kind === 'newRelic')).toEqual([]);
    expect(draftOptions({ ...baseCtx, relicPool: [], relic: null })
      .filter((o) => o.kind === 'newRelic')).toEqual([]);
    expect(draftOptions({ ...baseCtx, relicPool: ['nonsense'], relic: null })
      .filter((o) => o.kind === 'newRelic')).toEqual([]);
    // omitted fields (old callers) behave like empty pool
    expect(draftOptions(baseCtx).filter((o) => o.kind === 'newRelic')).toEqual([]);
  });

  it('rollDraft can yield a relic card (weight 1, never pinned)', () => {
    // with one relic option in a tiny pool, sweep rng values and assert it appears at least once.
    const ctx = { ...baseCtx, kitPool: [], relicPool: ['blood_rush'], relic: null };
    const kinds = new Set<string>();
    for (let r = 0.05; r < 1; r += 0.1) {
      for (const o of rollDraft(() => r, 3, ctx)) kinds.add(o.kind);
    }
    expect(kinds.has('newRelic')).toBe(true);
  });
});

describe('regen cards disclose the 25% lifetime cap (spec §4)', () => {
  it('field_medic and heartwood descs mention the cap', () => {
    expect(PASSIVES.field_medic.desc).toContain('25%');
    expect(PASSIVE_FUSIONS['field_medic+oxhide'].desc).toContain('25%');
  });
});

describe('food pickup sprite', () => {
  it('food_ration is registered and valid', () => {
    expect(SPRITES.food_ration).toBeDefined();
    expect(validateSpriteDef(SPRITES.food_ration)).toEqual([]);
  });
});
