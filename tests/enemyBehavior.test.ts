import { describe, it, expect } from 'vitest';
import {
  initChargerState, chargerStep, CHARGER_CONFIG,
  circlerVelocity, CIRCLER_RADIUS,
  standoffVelocity, STANDOFF_MIN, STANDOFF_MAX,
  fleeVelocity,
} from '../src/run/enemyBehavior';

describe('enemyBehavior — charger', () => {
  const cfg = CHARGER_CONFIG;

  it('chases toward the player while the player is out of trigger range', () => {
    const r = chargerStep(initChargerState(), cfg.trigger + 100, 1, 0, 50, 16);
    expect(r.state.phase).toBe('chase');
    expect(r.vx).toBeCloseTo(50);   // dirX(1) * speed(50)
    expect(r.vy).toBeCloseTo(0);
  });

  it('enters windup (and stops) when the player crosses the trigger range', () => {
    const r = chargerStep(initChargerState(), cfg.trigger, 1, 0, 50, 16);
    expect(r.state.phase).toBe('windup');
    expect(r.state.timer).toBe(cfg.windupMs);
    expect(r.vx).toBe(0);
    expect(r.vy).toBe(0);
  });

  it('holds zero velocity for the whole windup, then dashes', () => {
    let s = { phase: 'windup' as const, timer: cfg.windupMs, dashX: 0, dashY: 0 };
    // most of the windup: still stopped
    let r = chargerStep(s, 100, 1, 0, 50, cfg.windupMs - 10);
    expect(r.state.phase).toBe('windup');
    expect(r.vx).toBe(0);
    // final tick completes the windup → dash, direction locked to current dir
    r = chargerStep(r.state, 100, 1, 0, 50, 20);
    expect(r.state.phase).toBe('dash');
    expect(r.vx).toBeCloseTo(50 * cfg.dashMult); // speed * dashMult
  });

  it('locks the dash direction — a moving player does not bend the dash', () => {
    const dashing = { phase: 'dash' as const, timer: cfg.dashMs, dashX: 1, dashY: 0 };
    // player is now straight up (dir 0,-1) but the dash must stay along the locked +x
    const r = chargerStep(dashing, 100, 0, -1, 50, 16);
    expect(r.vx).toBeCloseTo(50 * cfg.dashMult);
    expect(r.vy).toBeCloseTo(0);
  });

  it('after the dash recovers, then returns to chase', () => {
    let r = chargerStep({ phase: 'dash', timer: 5, dashX: 1, dashY: 0 }, 100, 1, 0, 50, 16);
    expect(r.state.phase).toBe('recover');
    expect(r.state.timer).toBe(cfg.recoverMs);
    // dash→recover transition frame: the dash case returns vx:0 on exit
    expect(r.vx).toBeCloseTo(0);
    // mid-recover: the enemy repositions at normal chase speed while on cooldown
    r = chargerStep({ phase: 'recover', timer: cfg.recoverMs, dashX: 0, dashY: 0 }, 200, 1, 0, 50, 16);
    expect(r.state.phase).toBe('recover');
    expect(r.vx).toBeCloseTo(50);
    r = chargerStep({ phase: 'recover', timer: 5, dashX: 0, dashY: 0 }, 100, 1, 0, 50, 16);
    expect(r.state.phase).toBe('chase');
    expect(r.vx).toBeCloseTo(50);
  });
});

describe('enemyBehavior — circler', () => {
  it('moves purely tangentially (perpendicular to the player vector) when on the band', () => {
    // enemy is CIRCLER_RADIUS to the right of the player → on band, no radial correction
    const v = circlerVelocity(100 + CIRCLER_RADIUS, 100, 100, 100, 1, 50);
    // outward radial is +x; velocity must be perpendicular to it (vx ≈ 0) and full speed
    expect(v.vx).toBeCloseTo(0);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(50);
  });

  it('reverses orbit sense with dir', () => {
    const cw = circlerVelocity(100 + CIRCLER_RADIUS, 100, 100, 100, 1, 50);
    const ccw = circlerVelocity(100 + CIRCLER_RADIUS, 100, 100, 100, -1, 50);
    expect(ccw.vy).toBeCloseTo(-cw.vy);
  });

  it('pushes outward when inside the band and inward when outside', () => {
    // inside: 40px right of player (< radius) → radial component points outward (+x)
    const inside = circlerVelocity(140, 100, 100, 100, 1, 50);
    expect(inside.vx).toBeGreaterThan(0);
    // outside: far right of player (> radius) → radial component points inward (−x)
    const outside = circlerVelocity(100 + CIRCLER_RADIUS + 200, 100, 100, 100, 1, 50);
    expect(outside.vx).toBeLessThan(0);
  });
});

describe('enemyBehavior — standoff', () => {
  it('advances when farther than the max band', () => {
    const v = standoffVelocity(STANDOFF_MAX + 50, 1, 0, 60);
    expect(v.vx).toBeCloseTo(60); // toward the player
  });

  it('holds position inside the band', () => {
    const mid = (STANDOFF_MIN + STANDOFF_MAX) / 2;
    const v = standoffVelocity(mid, 1, 0, 60);
    expect(v.vx).toBe(0);
    expect(v.vy).toBe(0);
  });

  it('kites away when closer than the min band', () => {
    const v = standoffVelocity(STANDOFF_MIN - 50, 1, 0, 60);
    expect(v.vx).toBeCloseTo(-60); // away from the player
  });

  it('holds at the exact boundary distances', () => {
    expect(standoffVelocity(STANDOFF_MAX, 1, 0, 60).vx).toBe(0);
    expect(standoffVelocity(STANDOFF_MIN, 1, 0, 60).vx).toBe(0);
  });
});

describe('enemyBehavior — flee (RC-026 courier)', () => {
  it('runs directly away from the player at full speed', () => {
    const v = fleeVelocity(0, 0, 100, 0, 80); // player at origin, enemy at +x
    expect(v.vx).toBeCloseTo(80);
    expect(v.vy).toBeCloseTo(0);
  });
  it('normalizes diagonals (speed preserved)', () => {
    const v = fleeVelocity(0, 0, 30, 40, 100);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(100);
    expect(v.vx).toBeCloseTo(60);
    expect(v.vy).toBeCloseTo(80);
  });
  it('degenerate overlap (zero distance) still moves (any direction, full speed)', () => {
    const v = fleeVelocity(50, 50, 50, 50, 90);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(90);
  });
});
