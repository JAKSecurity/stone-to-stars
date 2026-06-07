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
