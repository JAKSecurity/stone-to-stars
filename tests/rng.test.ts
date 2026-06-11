import { describe, it, expect } from 'vitest';
import { mulberry32, rngInt, rngPick } from '../src/run/rng';

describe('rng — mulberry32', () => {
  it('is deterministic: same seed yields the same sequence', () => {
    const a = mulberry32(1234), b = mulberry32(1234);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it('different seeds yield different sequences', () => {
    const a = mulberry32(1), b = mulberry32(2);
    const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
    expect(seqA).not.toEqual(seqB);
  });

  it('emits values in [0, 1)', () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 500; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('rng — helpers', () => {
  it('rngInt stays within [min, max] inclusive and hits both endpoints', () => {
    const rng = mulberry32(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = rngInt(rng, 3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.has(3)).toBe(true);
    expect(seen.has(6)).toBe(true);
  });

  it('rngPick returns an element of the array', () => {
    const rng = mulberry32(7);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) expect(arr).toContain(rngPick(rng, arr));
  });

  it('rngInt returns min for an inverted range instead of exceeding max', () => {
    expect(rngInt(mulberry32(1), 5, 4)).toBe(5);
  });

  it('seed 1234 produces a known first value (sequence-stability regression guard)', () => {
    expect(mulberry32(1234)()).toBeCloseTo(0.07329497812315822, 10);
  });
});
