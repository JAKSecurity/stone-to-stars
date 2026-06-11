import { describe, it, expect } from 'vitest';
import { POIS, SHRINE_WAVE_BASE, SHRINE_WAVE_PER_TIER, COURIER_DESPAWN_MS, ALTAR_WAKE_SCREENS } from '../src/run/poiData';
import { rollPois, shrineWave, shrineJackpot, courierJackpot } from '../src/run/poi';
import { mulberry32 } from '../src/run/rng';

describe('poi', () => {
  it('catalog defines the 3 launch POIs', () => {
    expect(Object.keys(POIS).sort()).toEqual(['altar', 'courier', 'shrine']);
    for (const p of Object.values(POIS)) { expect(p.icon).toBeTruthy(); expect(p.sprite).toBeTruthy(); }
  });

  it('rollPois: 2 DISTINCT types, deterministic for a seed', () => {
    const a = rollPois(mulberry32(42));
    const b = rollPois(mulberry32(42));
    expect(a).toEqual(b);
    expect(a).toHaveLength(2);
    expect(new Set(a).size).toBe(2);
  });

  it('rollPois covers all pairs across seeds', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 200; s++) seen.add(rollPois(mulberry32(s)).sort().join('+'));
    expect(seen.size).toBe(3); // C(3,2) pairs
  });

  it('shrineWave: tier-scaled count drawn from the biome spawn table', () => {
    const table = { wolf: 3, bear: 1 };
    const wave = shrineWave(mulberry32(7), table, 2);
    expect(wave).toHaveLength(SHRINE_WAVE_BASE + SHRINE_WAVE_PER_TIER * 2);
    for (const id of wave) expect(['wolf', 'bear']).toContain(id);
    expect(shrineWave(mulberry32(7), table, 2)).toEqual(wave); // seeded-deterministic
  });

  it('jackpots scale with tier and pay the right identity', () => {
    const s0 = shrineJackpot(0), s4 = shrineJackpot(4);
    expect(s0.length).toBeGreaterThan(0);
    expect(s4.reduce((t, g) => t + g.value, 0)).toBeGreaterThan(s0.reduce((t, g) => t + g.value, 0));
    const c = courierJackpot(mulberry32(3), 2);
    const resources = new Set(c.map((g) => g.resource));
    expect(resources.size).toBeGreaterThan(1); // mixed gems
    expect(COURIER_DESPAWN_MS).toBeGreaterThan(0);
    expect(ALTAR_WAKE_SCREENS).toBeGreaterThan(0);
  });
});
