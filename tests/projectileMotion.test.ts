import { describe, it, expect } from 'vitest';
import {
  orbitAngle, orbitPosition, lobFlightMs, lobProgress, lobGroundPosition, lobArcHeight, withinRadius,
  ORBIT_ANGULAR_SPEED, LOB_PEAK_HEIGHT, LOB_MIN_FLIGHT_MS, LOB_MAX_FLIGHT_MS,
} from '../src/run/projectileMotion';

describe('projectileMotion — orbit', () => {
  it('spaces N orbiters evenly and advances with the run clock', () => {
    expect(orbitAngle(0, 4, 0)).toBeCloseTo(0);
    expect(orbitAngle(1, 4, 0)).toBeCloseTo(Math.PI / 2);
    expect(orbitAngle(2, 4, 0)).toBeCloseTo(Math.PI);
    expect(orbitAngle(0, 4, 1000) - orbitAngle(0, 4, 0)).toBeCloseTo(ORBIT_ANGULAR_SPEED);
  });

  it('keeps orbiters on the circle of the given radius', () => {
    const right = orbitPosition(100, 100, 90, 0);
    expect(right.x).toBeCloseTo(190); expect(right.y).toBeCloseTo(100);
    const up = orbitPosition(100, 100, 90, -Math.PI / 2);
    expect(up.x).toBeCloseTo(100); expect(up.y).toBeCloseTo(10);
    const p = orbitPosition(0, 0, 90, 1.234);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(90);
  });
});

describe('projectileMotion — lob', () => {
  it('derives flight time from distance/speed and clamps both ends', () => {
    expect(lobFlightMs(300, 600)).toBeCloseTo(500);
    expect(lobFlightMs(10, 600)).toBe(LOB_MIN_FLIGHT_MS);
    expect(lobFlightMs(100000, 100)).toBe(LOB_MAX_FLIGHT_MS);
    expect(lobFlightMs(300, 0)).toBe(LOB_MAX_FLIGHT_MS);
  });

  it('clamps progress to [0,1] and treats a zero flight as landed', () => {
    expect(lobProgress(250, 500)).toBeCloseTo(0.5);
    expect(lobProgress(-10, 500)).toBe(0);
    expect(lobProgress(900, 500)).toBe(1);
    expect(lobProgress(5, 0)).toBe(1);
  });

  it('lerps the ground position from start to target', () => {
    const s = { x: 0, y: 0 }, e = { x: 100, y: 200 };
    expect(lobGroundPosition(s, e, 0)).toEqual({ x: 0, y: 0 });
    expect(lobGroundPosition(s, e, 1)).toEqual({ x: 100, y: 200 });
    expect(lobGroundPosition(s, e, 0.5)).toEqual({ x: 50, y: 100 });
  });

  it('arc height is zero at the ends and peaks at the midpoint', () => {
    expect(lobArcHeight(0)).toBeCloseTo(0);
    expect(lobArcHeight(1)).toBeCloseTo(0);
    expect(lobArcHeight(0.5)).toBeCloseTo(LOB_PEAK_HEIGHT);
  });
});

describe('projectileMotion — withinRadius', () => {
  it('is true inside and on the edge, false outside', () => {
    expect(withinRadius(0, 0, 3, 4, 5)).toBe(true);
    expect(withinRadius(0, 0, 2, 2, 5)).toBe(true);
    expect(withinRadius(0, 0, 6, 0, 5)).toBe(false);
  });
});
