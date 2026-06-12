import { describe, it, expect } from 'vitest';
import {
  VOLLEY_COOLDOWN_MS, VOLLEY_DAMAGE_MULT,
  SLASH_RANGE, SLASH_ARC_RAD, SLASH_WINDUP_MS, SLASH_COOLDOWN_MS,
  BEAM_AIM_MS, BEAM_WIDTH, BEAM_COOLDOWN_MS, BEAM_DAMAGE_MULT,
  FLAME_CONE_RANGE, FLAME_COOLDOWN_MS, FLAME_PATCHES,
  MORTAR_COOLDOWN_MS, MORTAR_BLAST, MORTAR_FLIGHT_MS,
  SPAWNER_COOLDOWN_MS, SPAWNER_CAP,
  HAUNT_DROP_MS, HAUNT_LINGER_MS,
  ENRAGE_THRESHOLD, ENRAGE_MULT,
  arcContains, beamHits, enrageActive, flamePatchPoints, spawnerMaySummon,
} from '../src/run/enemyAttacks';

describe('enemyAttacks — constants sanity', () => {
  it('every timing/feel constant is positive', () => {
    for (const c of [
      VOLLEY_COOLDOWN_MS, VOLLEY_DAMAGE_MULT,
      SLASH_RANGE, SLASH_ARC_RAD, SLASH_WINDUP_MS, SLASH_COOLDOWN_MS,
      BEAM_AIM_MS, BEAM_WIDTH, BEAM_COOLDOWN_MS, BEAM_DAMAGE_MULT,
      FLAME_CONE_RANGE, FLAME_COOLDOWN_MS, FLAME_PATCHES,
      MORTAR_COOLDOWN_MS, MORTAR_BLAST, MORTAR_FLIGHT_MS,
      SPAWNER_COOLDOWN_MS, SPAWNER_CAP,
      HAUNT_DROP_MS, HAUNT_LINGER_MS,
      ENRAGE_THRESHOLD, ENRAGE_MULT,
    ]) {
      expect(c).toBeGreaterThan(0);
    }
  });

  it('volley is much faster but weaker than a basic ranged shot (3400ms baseline)', () => {
    expect(VOLLEY_COOLDOWN_MS).toBeLessThan(3400);
    expect(3400 / VOLLEY_COOLDOWN_MS).toBeGreaterThanOrEqual(4); // ~5x cadence
    expect(VOLLEY_DAMAGE_MULT).toBeLessThan(1);
  });

  it('the slash arc is 120 degrees and enrage is a sub-full-HP buff', () => {
    expect(SLASH_ARC_RAD).toBeCloseTo((2 * Math.PI) / 3, 6);
    expect(ENRAGE_THRESHOLD).toBeGreaterThan(0);
    expect(ENRAGE_THRESHOLD).toBeLessThan(1);
    expect(ENRAGE_MULT).toBeGreaterThan(1);
  });
});

describe('enemyAttacks — arcContains', () => {
  // Apex at origin, facing +x (0 rad), 120 deg arc (+/-60 deg), range 100.
  const ax = 0, ay = 0, facing = 0, range = 100, arc = SLASH_ARC_RAD;

  it('a target dead ahead within range is inside', () => {
    expect(arcContains(ax, ay, facing, range, arc, 50, 0)).toBe(true);
  });

  it('a target behind the apex is outside', () => {
    expect(arcContains(ax, ay, facing, range, arc, -50, 0)).toBe(false);
  });

  it('a target beyond the range is outside even if dead ahead', () => {
    expect(arcContains(ax, ay, facing, range, arc, 150, 0)).toBe(false);
  });

  it('a target at ~45 deg off-axis is inside the 120 deg arc, ~75 deg is outside', () => {
    const r = 50;
    // 45 < 60 half-arc => inside
    expect(arcContains(ax, ay, facing, range, arc, r * Math.cos(Math.PI / 4), r * Math.sin(Math.PI / 4))).toBe(true);
    // 75 > 60 half-arc => outside
    const a75 = (75 * Math.PI) / 180;
    expect(arcContains(ax, ay, facing, range, arc, r * Math.cos(a75), r * Math.sin(a75))).toBe(false);
  });

  it('a target exactly on the arc edge (half-arc angle) is inside (inclusive)', () => {
    const half = arc / 2; // 60 deg
    const r = 50;
    expect(arcContains(ax, ay, facing, range, arc, r * Math.cos(half), r * Math.sin(half))).toBe(true);
  });

  it('handles the +/-PI seam: facing toward -x, target just across the seam', () => {
    // facing PI (toward -x). A target at angle -PI + 0.1 (just below the -x axis) is 0.1 rad off => inside.
    const ang = -Math.PI + 0.1;
    const r = 50;
    expect(arcContains(ax, ay, Math.PI, range, arc, r * Math.cos(ang), r * Math.sin(ang))).toBe(true);
    // and a target at angle +0.1 (toward +x, opposite the facing) is outside.
    expect(arcContains(ax, ay, Math.PI, range, arc, r * Math.cos(0.1), r * Math.sin(0.1))).toBe(false);
  });
});

describe('enemyAttacks — beamHits', () => {
  // Beam from origin along +x, length 100, width 26 (half-width 13).
  const x1 = 0, y1 = 0, dir = 0, length = 100, width = BEAM_WIDTH;

  it('a point on the beam line within length is hit', () => {
    expect(beamHits(x1, y1, dir, length, width, 50, 0)).toBe(true);
  });

  it('a point within half-width of the line is hit', () => {
    expect(beamHits(x1, y1, dir, length, width, 50, 12)).toBe(true); // 12 < 13 half-width
  });

  it('a point further than half-width off the line is missed', () => {
    expect(beamHits(x1, y1, dir, length, width, 50, 20)).toBe(false); // 20 > 13
  });

  it('a point beyond the length is missed', () => {
    expect(beamHits(x1, y1, dir, length, width, 120, 0)).toBe(false);
  });

  it('a point behind the origin is missed', () => {
    expect(beamHits(x1, y1, dir, length, width, -10, 0)).toBe(false);
  });

  it('works along an angled beam (45 deg)', () => {
    const d = Math.PI / 4;
    // a point 50px along the 45 deg line is hit
    expect(beamHits(0, 0, d, 100, width, 50 * Math.cos(d), 50 * Math.sin(d))).toBe(true);
    // a point well off that line is missed
    expect(beamHits(0, 0, d, 100, width, 50, 0)).toBe(false);
  });
});

describe('enemyAttacks — enrageActive', () => {
  it('is true below the threshold', () => {
    expect(enrageActive(29, 100)).toBe(true); // 0.29 < 0.30
  });

  it('is false at exactly the threshold (strict <)', () => {
    expect(enrageActive(30, 100)).toBe(false); // 0.30 is not < 0.30
  });

  it('is false at full HP', () => {
    expect(enrageActive(100, 100)).toBe(false);
  });

  it('is false for a non-positive maxHp', () => {
    expect(enrageActive(0, 0)).toBe(false);
  });
});

describe('enemyAttacks — flamePatchPoints', () => {
  it('returns FLAME_PATCHES points by default', () => {
    expect(flamePatchPoints(0, 0, 0)).toHaveLength(FLAME_PATCHES);
  });

  it('spaces points evenly out to the range tip (last patch at FLAME_CONE_RANGE)', () => {
    const pts = flamePatchPoints(0, 0, 0); // facing +x
    const step = FLAME_CONE_RANGE / FLAME_PATCHES;
    pts.forEach((p, i) => {
      expect(p.x).toBeCloseTo(step * (i + 1), 6);
      expect(p.y).toBeCloseTo(0, 6);
    });
    expect(pts[pts.length - 1].x).toBeCloseTo(FLAME_CONE_RANGE, 6);
  });

  it('orients points along an arbitrary facing', () => {
    const pts = flamePatchPoints(10, 20, Math.PI / 2, 100, 2); // facing +y
    expect(pts).toHaveLength(2);
    expect(pts[0].x).toBeCloseTo(10, 6); // x unchanged (facing +y)
    expect(pts[0].y).toBeCloseTo(70, 6); // 20 + 50
    expect(pts[1].y).toBeCloseTo(120, 6); // 20 + 100
  });

  it('returns no points for n<=0', () => {
    expect(flamePatchPoints(0, 0, 0, 100, 0)).toHaveLength(0);
  });
});

describe('enemyAttacks — spawnerMaySummon', () => {
  it('allows summoning below the cap', () => {
    expect(spawnerMaySummon(0)).toBe(true);
    expect(spawnerMaySummon(SPAWNER_CAP - 1)).toBe(true);
  });

  it('blocks summoning at or above the cap', () => {
    expect(spawnerMaySummon(SPAWNER_CAP)).toBe(false);
    expect(spawnerMaySummon(SPAWNER_CAP + 2)).toBe(false);
  });
});