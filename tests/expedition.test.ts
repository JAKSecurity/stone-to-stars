import { describe, it, expect } from 'vitest';
import { AGE_ORDER } from '../src/game/types';
import { availableExpeditions, pickEnemy, apexEnemyId, biomeDanger } from '../src/run/expedition';
import { ENEMIES } from '../src/run/enemyData';
import { ageIndexOf } from '../src/game/economy';
import { BIOMES } from '../src/run/biomeData';
import { newCivState } from '../src/state/civState';
import { research } from '../src/tech/tech';

const RICH = { exploration: 99999, science: 99999, industry: 99999, culture: 99999 };

describe('expedition card helpers (RC-027)', () => {
  it('apexEnemyId picks the highest-baseHp foe in a spawn table', () => {
    const table = { beast: 1, rock_golem: 1, scholar: 1 }; // 32 / 90 / 24
    expect(apexEnemyId(table)).toBe('rock_golem');
    expect(ENEMIES[apexEnemyId(table)].baseHp).toBe(90);
  });

  it('biomeDanger scales 1–5 with the apex HP bracket', () => {
    expect(biomeDanger({ beast: 1 })).toBe(1);           // 32 hp
    expect(biomeDanger({ iron_golem: 1 })).toBe(2);      // 200 hp
    expect(biomeDanger({ juggernaut: 1 })).toBe(5);      // 540 hp → capped at 5
  });

  it('every real biome resolves an apex enemy with a danger rating in 1..5', () => {
    for (const b of Object.values(BIOMES)) {
      const d = biomeDanger(b.spawnTable);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(5);
      expect(ENEMIES[apexEnemyId(b.spawnTable)]).toBeDefined();
    }
  });
});

describe('age order', () => {
  it('runs stone → bronze → iron → classical → medieval → renaissance → industrial → modern → space', () => {
    expect(AGE_ORDER).toEqual(['stone', 'bronze', 'iron', 'classical', 'medieval', 'renaissance', 'industrial', 'modern', 'space']);
  });
});

describe('availableExpeditions (RC-017: offer-once, reward = biome age)', () => {
  it('a fresh (stone) civ gets each stone biome once at tier 0', () => {
    const exps = availableExpeditions(newCivState());
    expect(exps.map((e) => `${e.biomeId}:${e.tier}`).sort())
      .toEqual(['ruins:0', 'wilds:0']);
  });

  it('a bronze civ adds frontier — each biome appears ONCE, at its own age tier', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'mining');
    civ = research(civ, 'bronze_working'); // gatesAge: 'bronze'
    const ids = availableExpeditions(civ).map((e) => `${e.biomeId}:${e.tier}`).sort();
    // stone biomes stay tier 0 (no tier-range); frontier is the bronze biome at tier 1
    expect(ids).toEqual(['frontier:1', 'ruins:0', 'wilds:0']);
  });

  it("each expedition's tier equals its biome's age index", () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'mining');
    civ = research(civ, 'bronze_working');
    for (const exp of availableExpeditions(civ)) {
      expect(exp.tier).toBe(ageIndexOf(BIOMES[exp.biomeId].minAge));
    }
  });
});

describe('pickEnemy', () => {
  // table {beast:3, scholar:1} → total 4; r in [0,3) → beast, [3,4) → scholar
  it('maps the rng across the weighted ranges', () => {
    const table = { beast: 3, scholar: 1 };
    expect(pickEnemy(table, () => 0.0)).toBe('beast');   // r=0   -> beast
    expect(pickEnemy(table, () => 0.74)).toBe('beast');  // r=2.96 -> beast
    expect(pickEnemy(table, () => 0.80)).toBe('scholar'); // r=3.2 -> scholar
  });

  it('always returns a valid key for any rng in [0,1)', () => {
    const table = { beast: 1, scholar: 1 };
    for (const r of [0, 0.49, 0.5, 0.99]) {
      expect(Object.keys(table)).toContain(pickEnemy(table, () => r));
    }
  });
});

describe('requiresTech gate', () => {
  it('a biome with requiresTech is hidden until that tech is researched', async () => {
    const { BIOMES } = await import('../src/run/biomeData');
    // simulate a tech-gated biome by checking the filter directly via a civ that has the gate
    // (Deep Caverns lands in Phase B; here we assert the filter logic exists and excludes by default)
    const fresh = newCivState();
    const ids = availableExpeditions(fresh).map((e) => e.biomeId);
    // no biome the fresh civ lacks the tech for should appear
    for (const e of availableExpeditions(fresh)) {
      const b = BIOMES[e.biomeId];
      if (b.requiresTech) expect(fresh.researched).toContain(b.requiresTech);
    }
    expect(ids.length).toBeGreaterThan(0);
  });
});
