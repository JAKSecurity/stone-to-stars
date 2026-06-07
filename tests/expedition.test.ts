import { describe, it, expect } from 'vitest';
import { AGE_ORDER } from '../src/game/types';
import { tierScaling } from '../src/run/expedition';

describe('age order', () => {
  it('runs stone → bronze → iron', () => {
    expect(AGE_ORDER).toEqual(['stone', 'bronze', 'iron']);
  });
});

describe('tierScaling', () => {
  it('tier 0 is the baseline (all multipliers 1)', () => {
    expect(tierScaling(0)).toEqual({ hpMult: 1, speedMult: 1, spawnRateMult: 1, dropMult: 1 });
  });

  it('higher tiers scale hp/speed/spawn/drop', () => {
    expect(tierScaling(2)).toEqual({ hpMult: 2, speedMult: 1.2, spawnRateMult: 1.5, dropMult: 2 });
  });
});

import { availableExpeditions } from '../src/run/expedition';
import { newCivState } from '../src/state/civState';
import { research } from '../src/tech/tech';

const RICH = { exploration: 99, science: 99, industry: 99, culture: 99 };

describe('availableExpeditions', () => {
  it('a fresh (stone) civ gets only the stone biomes at tier 0', () => {
    const exps = availableExpeditions(newCivState());
    expect(exps.map((e) => `${e.biomeId}:${e.tier}`).sort())
      .toEqual(['ruins:0', 'wilds:0']);
  });

  it('a bronze civ unlocks frontier and tier-1 versions of the stone biomes', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'mining');
    civ = research(civ, 'bronze_working'); // gatesAge: 'bronze'
    const ids = availableExpeditions(civ).map((e) => `${e.biomeId}:${e.tier}`).sort();
    expect(ids).toEqual(['frontier:1', 'ruins:0', 'ruins:1', 'wilds:0', 'wilds:1']);
  });

  it('each expedition carries the scaling for its tier', () => {
    const wilds0 = availableExpeditions(newCivState()).find((e) => e.biomeId === 'wilds');
    expect(wilds0!.scaling).toEqual({ hpMult: 1, speedMult: 1, spawnRateMult: 1, dropMult: 1 });
  });
});
