import { describe, it, expect } from 'vitest';
import { validTargetTiles } from '../src/ui/placement';
import { newCivState } from '../src/state/civState';
import { research } from '../src/tech/tech';
import { build, unlockedTileCount } from '../src/camp/camp';

const RICH = { exploration: 99999, science: 99999, industry: 99999, culture: 99999 };

describe('validTargetTiles', () => {
  it('a new building can target any unlocked empty tile, excluding occupied ones', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 12); // tile 12 = always-unlocked center
    const targets = validTargetTiles(civ, { kind: 'new', id: 'granary' });
    expect(targets.has(12)).toBe(false);
    expect(targets.size).toBe(unlockedTileCount(civ) - 1);
  });

  it('a move excludes the source tile and all occupied tiles', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 12);
    const targets = validTargetTiles(civ, { kind: 'move', from: 12 });
    expect(targets.has(12)).toBe(false);
    expect(targets.size).toBe(unlockedTileCount(civ) - 1);
  });
});
