import { describe, it, expect } from 'vitest';
import { newCivState, applyRunResult } from '../src/state/civState';
import { research } from '../src/tech/tech';
import { build } from '../src/camp/camp';
import { incomeMult } from '../src/game/economy';

const RICH = { exploration: 99999, science: 99999, industry: 99999, culture: 99999 };

describe('civState', () => {
  it('newCivState starts empty in the Stone Age', () => {
    const civ = newCivState();
    expect(civ.researched).toEqual([]);
    expect(civ.buildings).toEqual([]);
    expect(civ.runs).toBe(0);
    expect(civ.banked).toEqual({ exploration: 0, science: 0, industry: 0, culture: 0 });
    expect(civ.version).toBe(4);
    expect(civ.traditions).toEqual({});
  });

  it('applyRunResult banks collected resources and increments runs', () => {
    const civ = newCivState();
    const after = applyRunResult(civ, {
      collected: { exploration: 5, science: 2, industry: 7, culture: 1 },
      survivedMs: 300000, died: false, tier: 0,
    });
    expect(after.banked).toEqual({ exploration: 5, science: 2, industry: 7, culture: 1 });
    expect(after.runs).toBe(1);
  });

  it('newCivState defaults the RC-027 fields (startWeapon club, empty biomeBests)', () => {
    const civ = newCivState();
    expect(civ.startWeapon).toBe('club');
    expect(civ.biomeBests).toEqual({});
  });

  it('applyRunResult records the per-biome best haul (in-run collection only), keeping the max', () => {
    let civ = newCivState();
    civ = applyRunResult(civ, {
      collected: { exploration: 3, science: 4, industry: 2, culture: 1 }, // total 10
      survivedMs: 1, died: false, tier: 0,
    }, 'wilds');
    expect(civ.biomeBests).toEqual({ wilds: 10 });
    // a worse haul on the same biome does NOT lower the best
    civ = applyRunResult(civ, {
      collected: { exploration: 1, science: 1, industry: 1, culture: 1 }, // total 4
      survivedMs: 1, died: false, tier: 0,
    }, 'wilds');
    expect(civ.biomeBests).toEqual({ wilds: 10 });
    // a different biome tracks independently
    civ = applyRunResult(civ, {
      collected: { exploration: 5, science: 5, industry: 5, culture: 5 }, // total 20
      survivedMs: 1, died: false, tier: 0,
    }, 'ruins');
    expect(civ.biomeBests).toEqual({ wilds: 10, ruins: 20 });
  });

  it('applyRunResult accumulates lifetimeResources (collected + yields), lazy-defaulting old saves', () => {
    // Old v3 save without the optional field still accumulates from zero.
    const stale = { ...newCivState(), lifetimeResources: undefined } as any;
    const r1 = applyRunResult(stale, {
      collected: { exploration: 5, science: 2, industry: 7, culture: 1 },
      survivedMs: 1, died: false, tier: 0,
    });
    expect(r1.lifetimeResources).toEqual({ exploration: 5, science: 2, industry: 7, culture: 1 });
    const r2 = applyRunResult(r1, {
      collected: { exploration: 1, science: 1, industry: 1, culture: 1 },
      survivedMs: 1, died: false, tier: 0,
    });
    expect(r2.lifetimeResources).toEqual({ exploration: 6, science: 3, industry: 8, culture: 2 });
  });

  it('applyRunResult also adds per-run building yields times level', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 0);
    const before = civ.banked.culture;
    const after = applyRunResult(civ, {
      collected: { exploration: 0, science: 0, industry: 0, culture: 0 },
      survivedMs: 1, died: false, tier: 0,
    });
    expect(after.banked.culture).toBe(before + 60); // granary culture yield 3 × YIELD_SCALE(20) × incomeMult(0)=1
  });

  it('building yields scale by the run tier (RC-017)', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 0); // granary yields culture 3
    const before = civ.banked.culture;
    const after = applyRunResult(civ, {
      collected: { exploration: 0, science: 0, industry: 0, culture: 0 },
      survivedMs: 1, died: false, tier: 4,
    });
    expect(after.banked.culture).toBe(before + Math.round(3 * 20 * incomeMult(4))); // × YIELD_SCALE × incomeMult(4)
  });
});
