import { describe, it, expect } from 'vitest';
import { PERKS } from '../src/run/draft';

describe('draft PERKS — RC-009 playtest #5', () => {
  it('sharpen and rapid are halved from their originals', () => {
    const sharpen = PERKS.find((p) => p.id === 'sharpen')!;
    const rapid = PERKS.find((p) => p.id === 'rapid')!;
    expect(sharpen.effect.damageMult).toBe(0.125);  // was 0.25
    expect(rapid.effect.fireRateMult).toBe(0.10);   // was 0.20
  });
});
