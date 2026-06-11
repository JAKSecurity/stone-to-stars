import { describe, it, expect } from 'vitest';
import {
  shouldSpawnBoss, bossFreeTable, bossJackpotGems,
  BOSS_ARRIVAL_PROGRESS, BOSS_GEM_COUNT, BOSS_GEM_VALUE_MULT, BOSS_BIG_GEM_VALUE_MULT,
  dropsCatalyst, CATALYST_DROP_CHANCE,
} from '../src/run/bossEvent';

describe('bossEvent — shouldSpawnBoss', () => {
  it('fires once the run passes the arrival fraction, and not before', () => {
    const dur = 1000;
    expect(shouldSpawnBoss(dur * (BOSS_ARRIVAL_PROGRESS - 0.01), dur, false)).toBe(false);
    expect(shouldSpawnBoss(dur * BOSS_ARRIVAL_PROGRESS, dur, false)).toBe(true);
    expect(shouldSpawnBoss(dur, dur, false)).toBe(true);
  });
  it('never fires twice (alreadySpawned) or on a zero-length run', () => {
    expect(shouldSpawnBoss(999, 1000, true)).toBe(false);
    expect(shouldSpawnBoss(10, 0, false)).toBe(false);
  });
});

describe('bossEvent — bossFreeTable', () => {
  it('removes only the boss id and does not mutate the input', () => {
    const table = { scholar: 6, hoplite: 3, cyclops: 1 };
    const free = bossFreeTable(table, 'cyclops');
    expect(free).toEqual({ scholar: 6, hoplite: 3 });
    expect(table.cyclops).toBe(1); // input untouched
  });
});

describe('bossEvent — bossJackpotGems', () => {
  it('returns the burst at boosted value plus one upgraded big gem', () => {
    const gems = bossJackpotGems(5, 'cut');
    expect(gems).toHaveLength(BOSS_GEM_COUNT + 1);
    const burst = gems.slice(0, BOSS_GEM_COUNT);
    expect(burst.every((g) => g.value === 5 * BOSS_GEM_VALUE_MULT && g.tier === 'cut')).toBe(true);
    const big = gems[gems.length - 1];
    expect(big.value).toBe(5 * BOSS_BIG_GEM_VALUE_MULT);
    expect(big.tier).toBe('brilliant'); // bumpTier('cut')
  });
});

it('catalyst drops are a pure rng threshold', () => {
  expect(dropsCatalyst(() => CATALYST_DROP_CHANCE - 0.01)).toBe(true);
  expect(dropsCatalyst(() => CATALYST_DROP_CHANCE + 0.01)).toBe(false);
});
