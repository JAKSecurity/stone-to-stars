import { describe, it, expect } from 'vitest';
import { initialRunStats, xpForLevel, addXp } from '../src/run/runStats';

describe('runStats', () => {
  it('initial stats derive from run modifiers', () => {
    const s = initialRunStats({ maxHp: 120, damageMult: 1.2, draftChoices: 3, weapons: ['club'] });
    expect(s.hp).toBe(120);
    expect(s.maxHp).toBe(120);
    expect(s.damageMult).toBe(1.2);
    expect(s.level).toBe(1);
    expect(s.xp).toBe(0);
    expect(s.fireRateMult).toBe(1);
    expect(s.moveSpeedMult).toBe(1);
  });

  it('xpForLevel rises with level', () => {
    expect(xpForLevel(1)).toBe(8);
    expect(xpForLevel(2)).toBe(11);
  });

  it('addXp carries over and can produce multiple level-ups', () => {
    const s = initialRunStats({ maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'] });
    const r = addXp(s, 20);
    expect(r.stats.level).toBe(3);
    expect(r.stats.xp).toBe(1);
    expect(r.levelsGained).toBe(2);
  });
});
