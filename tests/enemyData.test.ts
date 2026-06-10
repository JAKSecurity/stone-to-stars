import { describe, it, expect } from 'vitest';
import { ENEMIES } from '../src/run/enemyData';
import { RESOURCES } from '../src/game/types';
import { SPRITES } from '../src/art/registry';

describe('enemyData', () => {
  it('defines beast and scholar', () => {
    expect(ENEMIES.beast).toBeDefined();
    expect(ENEMIES.scholar).toBeDefined();
  });

  it('each entry key matches its id and uses a registered sprite', () => {
    for (const [key, def] of Object.entries(ENEMIES)) {
      expect(def.id).toBe(key);
      expect(SPRITES[def.sprite], def.sprite).toBeDefined();
    }
  });

  it('each entry has positive stats and a valid drop resource', () => {
    for (const def of Object.values(ENEMIES)) {
      expect(def.baseHp).toBeGreaterThan(0);
      expect(def.speed).toBeGreaterThan(0);
      expect(def.contactDamage).toBeGreaterThan(0);
      expect(def.xp).toBeGreaterThan(0);
      expect(RESOURCES).toContain(def.drop);
      expect(def.displaySize.w).toBeGreaterThan(0);
      expect(def.displaySize.h).toBeGreaterThan(0);
    }
  });

  it('every enemy has a non-empty display name', () => {
    for (const def of Object.values(ENEMIES)) {
      expect(typeof def.name).toBe('string');
      expect(def.name.length).toBeGreaterThan(0);
    }
  });
});

describe('enemyData — RC-018 behavior archetypes', () => {
  const ALLOWED = new Set(['chase', 'charger', 'splitter', 'circler', 'standoff', undefined]);

  it('every behavior is a known archetype (or absent ⇒ chase)', () => {
    for (const def of Object.values(ENEMIES)) {
      expect(ALLOWED.has(def.behavior as any), `${def.id}: ${def.behavior}`).toBe(true);
    }
  });

  it('at least three distinct non-chase archetypes are assigned', () => {
    const kinds = new Set(
      Object.values(ENEMIES).map((d) => d.behavior).filter((b) => b && b !== 'chase'),
    );
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });

  it('every splitter targets an existing, non-splitting enemy (no infinite split)', () => {
    for (const def of Object.values(ENEMIES)) {
      if (def.behavior !== 'splitter') continue;
      expect(def.split, `${def.id} is a splitter but has no split{}`).toBeDefined();
      const child = ENEMIES[def.split!.into];
      expect(child, `${def.id} splits into unknown ${def.split!.into}`).toBeDefined();
      expect(child.behavior === 'splitter').toBe(false);
      expect(def.split!.count).toBeGreaterThan(0);
    }
  });

  it('only splitters carry a split{} payload', () => {
    for (const def of Object.values(ENEMIES)) {
      if (def.split) expect(def.behavior).toBe('splitter');
    }
  });
});
