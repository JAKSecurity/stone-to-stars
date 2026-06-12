import { describe, it, expect } from 'vitest';
import { WEAPONS } from '../src/run/weaponData';
import { MAX_LEVEL_BY_AGE, ARCHETYPES } from '../src/run/archetypes';
import { AGE_ORDER, AgeId } from '../src/game/types';

describe('weaponData v2 integrity', () => {
  const defs = Object.values(WEAPONS);

  it('every weapon has an archetype and age-scaled maxLevel', () => {
    for (const d of defs) {
      expect(ARCHETYPES[d.archetype!], `${d.id} archetype`).toBeDefined();
      expect(d.maxLevel, `${d.id} maxLevel`).toBe(MAX_LEVEL_BY_AGE[d.tier]);
    }
  });

  it('no evolution or class leftovers', () => {
    for (const d of defs) {
      expect((d as any).evolvesTo, d.id).toBeUndefined();
      expect((d as any).evolveRequiresPerk, d.id).toBeUndefined();
      expect((d as any).behavior, d.id).toBeUndefined();
    }
  });

  it('sidegrade band: every weapon’s max-level EFFECTIVE DPS within 0.5×–1.8× of its age median', () => {
    // Effective dps discounts extra projectiles by 50% — a 5-pellet cone rarely lands all 5 on
    // one target, so paper (damage×count×rate) over-values volleys and under-values single shots.
    const effectiveDps = (d: (typeof defs)[number]): number => {
      const steps = d.maxLevel - 1;
      const s = d.levelScaling;
      const dmg = d.damage + (s.damage ?? 0) * steps;
      const count = d.count + (s.count ?? 0) * steps;
      const cd = Math.max(120, d.cooldownMs + (s.cooldownMs ?? 0) * steps);
      return dmg * (1 + (count - 1) * 0.5) * (1000 / cd);
    };
    const byAge = new Map<AgeId, number[]>();
    for (const d of defs) {
      byAge.set(d.tier, [...(byAge.get(d.tier) ?? []), effectiveDps(d)]);
    }
    for (const age of AGE_ORDER) {
      const list = (byAge.get(age) ?? []).sort((a, b) => a - b);
      if (list.length < 2) continue;
      const median = list[Math.floor(list.length / 2)];
      for (const dps of list) {
        expect(dps, `${age} dps band`).toBeGreaterThanOrEqual(median * 0.5);
        expect(dps, `${age} dps band`).toBeLessThanOrEqual(median * 1.8);
      }
    }
  });

  it('each age from iron on offers at least 3 distinct archetypes', () => {
    // RC-041: space is a deliberate mini-age with a single weapon (laser_array) — exempt.
    for (const age of AGE_ORDER.slice(2).filter((a) => a !== 'space')) {
      const archs = new Set(defs.filter((d) => d.tier === age).map((d) => d.archetype));
      expect(archs.size, age).toBeGreaterThanOrEqual(3);
    }
  });
});
