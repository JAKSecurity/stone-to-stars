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
    expect(civ.version).toBe(2);
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
