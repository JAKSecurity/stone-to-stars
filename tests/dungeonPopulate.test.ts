import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/run/rng';
import { generateLayout, WALL_THICKNESS, BARRIER_THICKNESS } from '../src/run/dungeonGen';
import {
  enemyPlacements, gemPlacements, pickBiasedResource,
  BASE_ENEMY_COUNT, ENEMIES_PER_TIER, ENEMY_SAFE_RADIUS,
} from '../src/run/dungeonPopulate';
import { runDurationForTier } from '../src/game/config';
import { BiomeDef, EnemyDef, RESOURCES } from '../src/game/types';

const FIX_ENEMIES: Record<string, EnemyDef> = {
  grunt: { id: 'grunt', name: 'Grunt', sprite: 's', baseHp: 20, speed: 60, contactDamage: 5, drop: 'industry', xp: 4, displaySize: { w: 24, h: 24 } },
  brute: { id: 'brute', name: 'Brute', sprite: 's', baseHp: 80, speed: 40, contactDamage: 10, drop: 'science', xp: 9, displaySize: { w: 30, h: 30 } },
};
// minAge 'modern' = last age, so escalation has no next-age seed; the pool stays {grunt, brute}.
const FIX_BIOME: BiomeDef = {
  id: 'fix', name: 'Fixture', minAge: 'modern',
  resourceBias: { exploration: 1.5, culture: 0.8 },
  spawnTable: { grunt: 3, brute: 1 },
  tint: '#000',
};
const FIX_BIOMES = { fix: FIX_BIOME };

const layout = generateLayout(mulberry32(5), 1280, 720);
const place = (seed: number, tier: number) =>
  enemyPlacements(mulberry32(seed), layout, tier, FIX_BIOME, 'brute', FIX_BIOMES, FIX_ENEMIES);

describe('dungeonPopulate — enemyPlacements', () => {
  it('is deterministic for a given seed', () => {
    expect(place(9, 2)).toEqual(place(9, 2));
  });

  it('places the tier-scaled count plus exactly one boss', () => {
    const p = place(9, 2);
    expect(p.length).toBe(BASE_ENEMY_COUNT + ENEMIES_PER_TIER * 2 + 1);
    expect(p.filter((e) => e.isBoss).length).toBe(1);
    expect(p.find((e) => e.isBoss)!.id).toBe('brute');
  });

  it('keeps every enemy outside the start safe radius and inside the walls', () => {
    for (const e of place(9, 3)) {
      expect(Math.hypot(e.x - layout.start.x, e.y - layout.start.y)).toBeGreaterThanOrEqual(ENEMY_SAFE_RADIUS);
      expect(e.x).toBeGreaterThan(WALL_THICKNESS);
      expect(e.x).toBeLessThan(layout.width - WALL_THICKNESS);
      expect(e.y).toBeGreaterThan(WALL_THICKNESS);
      expect(e.y).toBeLessThan(layout.height - WALL_THICKNESS);
    }
  });

  it('places no enemy inside a barrier band', () => {
    for (const e of place(9, 3)) {
      for (const b of layout.barriers) {
        const across = b.axis === 'v' ? e.x : e.y;
        expect(Math.abs(across - b.pos)).toBeGreaterThan(BARRIER_THICKNESS / 2);
      }
    }
  });

  it('draws every non-boss id from the biome spawn pool', () => {
    for (const e of place(9, 3)) expect(['grunt', 'brute']).toContain(e.id);
  });

  it('places the boss deep in the dungeon (east half)', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const boss = place(seed, 0).find((e) => e.isBoss)!;
      expect(boss.x).toBeGreaterThan(layout.width / 2);
    }
  });
});

describe('dungeonPopulate — gemPlacements', () => {
  it('matches the retired faucet economy: counts derive from run duration and biome bias', () => {
    const tier = 0;
    const d = runDurationForTier(tier); // 60s at tier 0
    const gems = gemPlacements(mulberry32(3), layout, tier, FIX_BIOME);
    const expectExploration = Math.round((d / 4000) * 1.5); // old 4000ms faucet, bias 1.5
    const expectCulture = Math.round((d / 5000) * 0.8);     // old 5000ms relic faucet, bias 0.8
    const expectDeposits = Math.round(d / 2600);            // old 2600ms deposit faucet
    expect(gems.filter((g) => g.resource === 'exploration').length).toBeGreaterThanOrEqual(expectExploration);
    expect(gems.filter((g) => g.resource === 'culture').length).toBeGreaterThanOrEqual(expectCulture);
    expect(gems.length).toBe(expectExploration + expectCulture + expectDeposits);
  });

  it('keeps every gem inside the walls and out of barrier bands', () => {
    for (const g of gemPlacements(mulberry32(3), layout, 2, FIX_BIOME)) {
      expect(g.x).toBeGreaterThan(WALL_THICKNESS);
      expect(g.x).toBeLessThan(layout.width - WALL_THICKNESS);
      expect(g.y).toBeGreaterThan(WALL_THICKNESS);
      expect(g.y).toBeLessThan(layout.height - WALL_THICKNESS);
      for (const b of layout.barriers) {
        const across = b.axis === 'v' ? g.x : g.y;
        expect(Math.abs(across - b.pos)).toBeGreaterThan(BARRIER_THICKNESS / 2);
      }
      expect(RESOURCES).toContain(g.resource);
    }
  });
});

describe('dungeonPopulate — pickBiasedResource', () => {
  it('returns the first resource when the roll is 0 and the last when the roll is ~1', () => {
    expect(pickBiasedResource(() => 0, FIX_BIOME.resourceBias)).toBe('exploration');
    expect(pickBiasedResource(() => 0.999999, FIX_BIOME.resourceBias)).toBe('culture');
  });
});
