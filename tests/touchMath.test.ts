import { describe, it, expect } from 'vitest';
import { joystickVector, activeAimPoint } from '../src/scenes/touchMath';

describe('joystickVector', () => {
  it('points right at half magnitude when dragged right by half the radius', () => {
    const v = joystickVector({ x: 0, y: 0 }, { x: 30, y: 0 }, 60);
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(0);
    expect(v.magnitude).toBeCloseTo(0.5);
  });

  it('clamps magnitude to 1 beyond the max radius', () => {
    const v = joystickVector({ x: 0, y: 0 }, { x: 600, y: 0 }, 60);
    expect(v.magnitude).toBe(1);
  });

  it('returns a zero vector inside the deadzone', () => {
    const v = joystickVector({ x: 0, y: 0 }, { x: 2, y: 0 }, 60);
    expect(v).toEqual({ x: 0, y: 0, magnitude: 0 });
  });
});

describe('activeAimPoint', () => {
  it('returns the target position when an enemy exists', () => {
    expect(activeAimPoint(100, 100, { x: 250, y: 80 }, { x: 0, y: -1 })).toEqual({ x: 250, y: 80 });
  });

  it('fires along the last move direction when no enemy', () => {
    const p = activeAimPoint(100, 100, null, { x: 1, y: 0 }, 200);
    expect(p.x).toBeCloseTo(300);
    expect(p.y).toBeCloseTo(100);
  });

  it('fires straight up when no enemy and no movement', () => {
    const p = activeAimPoint(100, 100, null, { x: 0, y: 0 }, 200);
    expect(p).toEqual({ x: 100, y: -100 });
  });
});
