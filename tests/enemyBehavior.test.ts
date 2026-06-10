import { describe, it, expect } from 'vitest';
import {
  initChargerState, chargerStep, CHARGER_CONFIG,
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
    // recover still advances at normal speed (repositioning), no re-trigger until it elapses
    expect(r.vx).toBeCloseTo(0); // entering recover this frame yields 0; next frames chase
    r = chargerStep({ phase: 'recover', timer: 5, dashX: 0, dashY: 0 }, 100, 1, 0, 50, 16);
    expect(r.state.phase).toBe('chase');
    expect(r.vx).toBeCloseTo(50);
  });
});
