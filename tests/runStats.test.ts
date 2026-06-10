import { describe, it, expect } from 'vitest';
import { initialRunStats, xpForLevel, addXp } from '../src/run/runStats';
import { RunModifiers } from '../src/game/types';

const FULL_MODS: RunModifiers = {
  maxHp: 120, damageMult: 1.1, draftChoices: 3, weapons: ['club'],
  pickupRadius: 90, moveSpeedMult: 1.15, fireRateMult: 1.2,
  draftRerolls: 2, startWeaponLevel: 3,
};

describe('runStats', () => {
  it('initial stats derive from run modifiers', () => {
    const s = initialRunStats({ maxHp: 120, damageMult: 1.2, draftChoices: 3, weapons: ['club'], pickupRadius: 60, moveSpeedMult: 1, fireRateMult: 1, draftRerolls: 0, startWeaponLevel: 1 });
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
    const s = initialRunStats({ maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'], pickupRadius: 60, moveSpeedMult: 1, fireRateMult: 1, draftRerolls: 0, startWeaponLevel: 1 });
    const r = addXp(s, 20);
    expect(r.stats.level).toBe(3);
    expect(r.stats.xp).toBe(1);
    expect(r.levelsGained).toBe(2);
  });

  it('addXp returns levelsGained=0 when XP does not cross a threshold', () => {
    const s = initialRunStats({ maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'], pickupRadius: 60, moveSpeedMult: 1, fireRateMult: 1, draftRerolls: 0, startWeaponLevel: 1 });
    // xpForLevel(1) = 8; adding 3 should not level up
    const r = addXp(s, 3);
    expect(r.stats.level).toBe(1);
    expect(r.stats.xp).toBe(3);
    expect(r.levelsGained).toBe(0);
  });

  it('addXp returns levelsGained=1 for a single threshold crossing', () => {
    const s = initialRunStats({ maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'], pickupRadius: 60, moveSpeedMult: 1, fireRateMult: 1, draftRerolls: 0, startWeaponLevel: 1 });
    // xpForLevel(1) = 8; add exactly 8 to level up once
    const r = addXp(s, 8);
    expect(r.stats.level).toBe(2);
    expect(r.stats.xp).toBe(0);
    expect(r.levelsGained).toBe(1);
  });

  it('addXp returns levelsGained=3 crossing three thresholds (draft queue depth)', () => {
    // Simulate a large XP grant (e.g. high-tier enemy or multi-kill)
    // xpForLevel(1)=8, xpForLevel(2)=11, xpForLevel(3)=14  =>  8+11+14=33 XP crosses 3 levels
    const s = initialRunStats({ maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'], pickupRadius: 60, moveSpeedMult: 1, fireRateMult: 1, draftRerolls: 0, startWeaponLevel: 1 });
    const r = addXp(s, 33);
    expect(r.levelsGained).toBe(3);
    expect(r.stats.level).toBe(4);
    expect(r.stats.xp).toBe(0);
  });

  it('addXp accumulates correctly across sequential calls (queue drains properly)', () => {
    const s = initialRunStats({ maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'], pickupRadius: 60, moveSpeedMult: 1, fireRateMult: 1, draftRerolls: 0, startWeaponLevel: 1 });
    // First call: 3 XP — no level up
    const r1 = addXp(s, 3);
    expect(r1.levelsGained).toBe(0);
    // Second call: 5 more XP — crosses xpForLevel(1)=8, 3+5=8
    const r2 = addXp(r1.stats, 5);
    expect(r2.levelsGained).toBe(1);
    expect(r2.stats.level).toBe(2);
    expect(r2.stats.xp).toBe(0);
  });
});

describe('initialRunStats seeds modifier axes', () => {
  it('reads pickupRadius / moveSpeedMult / fireRateMult from mods', () => {
    const s = initialRunStats(FULL_MODS);
    expect(s.pickupRadius).toBe(90);
    expect(s.moveSpeedMult).toBe(1.15);
    expect(s.fireRateMult).toBe(1.2);
    expect(s.maxHp).toBe(120);
    expect(s.hp).toBe(120);
  });
});
