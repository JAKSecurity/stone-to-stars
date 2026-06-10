import { describe, it, expect } from 'vitest';
import { newCivState, applyRunResult } from '../src/state/civState';
import { research } from '../src/tech/tech';
import { build } from '../src/camp/camp';

const RICH = { exploration: 99, science: 99, industry: 99, culture: 99 };

describe('civState', () => {
  it('newCivState starts empty in the Stone Age', () => {
    const civ = newCivState();
    expect(civ.researched).toEqual([]);
    expect(civ.buildings).toEqual([]);
    expect(civ.runs).toBe(0);
    expect(civ.banked).toEqual({ exploration: 0, science: 0, industry: 0, culture: 0 });
    expect(civ.version).toBe(2);
    expect(civ.traditions).toEqual({});
  });

  it('applyRunResult banks collected resources and increments runs', () => {
    const civ = newCivState();
    const after = applyRunResult(civ, {
      collected: { exploration: 5, science: 2, industry: 7, culture: 1 },
      survivedMs: 300000, died: false,
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
      survivedMs: 1, died: false,
    });
    expect(after.banked.culture).toBe(before + 3);
  });
});
