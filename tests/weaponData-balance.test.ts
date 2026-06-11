import { describe, it, expect } from 'vitest';
import { WEAPONS } from '../src/run/weaponData';

describe('weaponData — RC-009 playtest #11', () => {
  it('gatling base cooldown is doubled (~50% slower fire)', () => {
    expect(WEAPONS.gatling.cooldownMs).toBe(360); // was 180
  });
});
