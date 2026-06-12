import { describe, it, expect } from 'vitest';
import {
  WAVES, InvasionWave, FormationState, formationStep, MOTHERSHIP_HP_MULT, mothershipPhase,
} from '../src/run/invasion';
import { ENEMIES } from '../src/run/enemyData';
import { BIOMES } from '../src/run/biomeData';

describe('RC-042 — WAVES data', () => {
  it('authors exactly 5 waves', () => {
    expect(WAVES.length).toBe(5);
  });

  it('every wave is well-formed: real enemy ids, positive cols/spacing/speeds/drops', () => {
    for (const [i, w] of WAVES.entries()) {
      expect(w.rows.length, `wave ${i + 1} has rows`).toBeGreaterThan(0);
      for (const id of w.rows) expect(ENEMIES[id], `wave ${i + 1} row id ${id}`).toBeDefined();
      expect(w.cols, `wave ${i + 1} cols`).toBeGreaterThan(0);
      expect(w.spacing, `wave ${i + 1} spacing`).toBeGreaterThan(0);
      expect(w.marchSpeed, `wave ${i + 1} marchSpeed`).toBeGreaterThan(0);
      expect(w.dropPx, `wave ${i + 1} dropPx`).toBeGreaterThan(0);
    }
  });

  it('escalates: march speed, drop distance, and formation size never decrease', () => {
    for (let i = 1; i < WAVES.length; i++) {
      expect(WAVES[i].marchSpeed, `wave ${i + 1} speed`).toBeGreaterThanOrEqual(WAVES[i - 1].marchSpeed);
      expect(WAVES[i].dropPx, `wave ${i + 1} drop`).toBeGreaterThanOrEqual(WAVES[i - 1].dropPx);
      const size = (w: InvasionWave) => w.rows.length * w.cols;
      expect(size(WAVES[i]), `wave ${i + 1} size`).toBeGreaterThanOrEqual(size(WAVES[i - 1]));
    }
  });

  it('escalates in composition: wave 1 is drone-only, the final wave fields an elite row', () => {
    expect(new Set(WAVES[0].rows)).toEqual(new Set(['invader_drone']));
    expect(WAVES[WAVES.length - 1].rows).toContain('invader_elite');
  });
});

describe('RC-042 — formationStep', () => {
  it('marches x by dir·speed·dt without dropping inside the bounds', () => {
    const s: FormationState = { x: 100, dir: 1 };
    const r = formationStep(s, 1000, 50, 0, 1000);
    expect(r.s).toEqual({ x: 150, dir: 1 });
    expect(r.dropped).toBe(false);
  });

  it('marches left when dir is -1', () => {
    const r = formationStep({ x: 500, dir: -1 }, 500, 80, 0, 1000);
    expect(r.s).toEqual({ x: 460, dir: -1 });
    expect(r.dropped).toBe(false);
  });

  it('clamps, reverses, and drops on crossing the max bound', () => {
    const r = formationStep({ x: 980, dir: 1 }, 1000, 50, 0, 1000); // would be 1030
    expect(r.s).toEqual({ x: 1000, dir: -1 });
    expect(r.dropped).toBe(true);
  });

  it('clamps, reverses, and drops on crossing the min bound', () => {
    const r = formationStep({ x: 20, dir: -1 }, 1000, 50, 0, 1000); // would be -30
    expect(r.s).toEqual({ x: 0, dir: 1 });
    expect(r.dropped).toBe(true);
  });

  it('landing exactly on a bound counts as the drop (deterministic at both edges)', () => {
    const atMax = formationStep({ x: 950, dir: 1 }, 1000, 50, 0, 1000); // exactly 1000
    expect(atMax.s).toEqual({ x: 1000, dir: -1 });
    expect(atMax.dropped).toBe(true);
    const atMin = formationStep({ x: 50, dir: -1 }, 1000, 50, 0, 1000); // exactly 0
    expect(atMin.s).toEqual({ x: 0, dir: 1 });
    expect(atMin.dropped).toBe(true);
  });

  it('is pure — the input state is not mutated', () => {
    const s: FormationState = { x: 980, dir: 1 };
    formationStep(s, 1000, 50, 0, 1000);
    expect(s).toEqual({ x: 980, dir: 1 });
  });
});

describe('RC-042 — mothership', () => {
  it('MOTHERSHIP_HP_MULT scales the tier-8 boss base up', () => {
    expect(MOTHERSHIP_HP_MULT).toBeGreaterThan(1);
  });

  it('phases by HP thirds, boundaries falling to the harder phase', () => {
    expect(mothershipPhase(1)).toBe(1);
    expect(mothershipPhase(0.9)).toBe(1);
    expect(mothershipPhase(0.7)).toBe(1);       // just above 2/3
    expect(mothershipPhase(2 / 3)).toBe(2);     // boundary → phase 2
    expect(mothershipPhase(0.5)).toBe(2);
    expect(mothershipPhase(0.34)).toBe(2);      // just above 1/3
    expect(mothershipPhase(1 / 3)).toBe(3);     // boundary → phase 3
    expect(mothershipPhase(0.1)).toBe(3);
    expect(mothershipPhase(0)).toBe(3);
  });
});

describe('RC-042 — invader enemy defs', () => {
  it('defines all four invaders', () => {
    for (const id of ['invader_drone', 'invader_soldier', 'invader_elite', 'invader_mothership']) {
      expect(ENEMIES[id], id).toBeDefined();
    }
  });

  it('drone has no attack profile and no basic attack (pure contact swarm body)', () => {
    expect(ENEMIES.invader_drone.attackProfile).toBeUndefined();
    expect(ENEMIES.invader_drone.attack).toBeUndefined();
  });

  it('soldier fires the beam profile, elite the mortar profile', () => {
    expect(ENEMIES.invader_soldier.attackProfile).toBe('beam');
    expect(ENEMIES.invader_elite.attackProfile).toBe('mortar');
  });

  it('mothership is profile-less here (RunScene drives its per-phase arsenal) and is the widest enemy', () => {
    expect(ENEMIES.invader_mothership.attackProfile).toBeUndefined();
    expect(ENEMIES.invader_mothership.attack).toBeUndefined();
    for (const def of Object.values(ENEMIES)) {
      expect(ENEMIES.invader_mothership.displaySize.w).toBeGreaterThanOrEqual(def.displaySize.w);
    }
  });

  it('invaders sit at space-tier stats — tankier than the modern rank-and-file', () => {
    expect(ENEMIES.invader_drone.baseHp).toBeGreaterThan(ENEMIES.rifleman.baseHp);
    expect(ENEMIES.invader_soldier.baseHp).toBeGreaterThan(ENEMIES.gunship.baseHp);
    expect(ENEMIES.invader_elite.baseHp).toBeGreaterThan(ENEMIES.halftrack.baseHp);
    expect(ENEMIES.invader_mothership.baseHp).toBeGreaterThan(ENEMIES.juggernaut.baseHp);
  });
});

describe('RC-042 — last_stand finale biome', () => {
  it('is a finale biome gated behind planetary_defense at the space age', () => {
    const b = BIOMES.last_stand;
    expect(b).toBeDefined();
    expect(b.finale).toBe(true);
    expect(b.minAge).toBe('space');
    expect(b.requiresTech).toBe('planetary_defense');
  });

  it('has no obstacles (a flat last-city arena) and a total spawn table', () => {
    const b = BIOMES.last_stand;
    expect(b.visual?.obstacles).toEqual([]);
    for (const id of Object.keys(b.spawnTable)) expect(ENEMIES[id], id).toBeDefined();
  });

  it('no other biome is a finale', () => {
    for (const b of Object.values(BIOMES)) {
      if (b.id !== 'last_stand') expect(b.finale, b.id).toBeUndefined();
    }
  });
});
