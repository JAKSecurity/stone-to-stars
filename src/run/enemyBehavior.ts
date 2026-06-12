// Pure motion/decision logic for enemy movement archetypes (RC-018). No Phaser imports — the
// geometry lives here so it is unit-testable, and the feel constants sit in one place for the
// playtest tuner (mirrors src/run/projectileMotion.ts from RC-015). RunScene is a thin renderer
// that calls these and applies the returned velocity. Distances/speeds are in the caller's units;
// the scene passes RUN_SCALE-scaled values and scaled threshold configs at the call site.

export interface BehaviorVel { vx: number; vy: number; }

// --- Charger: telegraph (windup) then a locked-direction dash ---

export type ChargerPhase = 'chase' | 'windup' | 'dash' | 'recover';

export interface ChargerState {
  phase: ChargerPhase;
  timer: number; // ms remaining in the current timed phase (windup/dash/recover)
  dashX: number; // dash unit direction, locked when the windup completes
  dashY: number;
}

export interface ChargerConfig {
  trigger: number;   // px proximity to the player that starts a windup
  windupMs: number;  // telegraph duration (enemy stopped)
  dashMult: number;  // dash speed = base speed * dashMult
  dashMs: number;    // dash duration
  recoverMs: number; // cooldown before it can wind up again
}

// Pre-RUN_SCALE feel defaults — tunable. The scene scales `trigger` by RUN_SCALE at the call site.
export const CHARGER_CONFIG: ChargerConfig = {
  trigger: 260, windupMs: 600, dashMult: 3.0, dashMs: 420, recoverMs: 1500,
};

export function initChargerState(): ChargerState {
  return { phase: 'chase', timer: 0, dashX: 0, dashY: 0 };
}

/**
 * Advance one charger by `dtMs`. `dist` is px to the player; (dirX,dirY) is the unit vector toward
 * the player; `speed` is the enemy's chase speed (already scaled by the caller). Returns the next
 * state plus the velocity to apply this frame. The dash direction locks at windup→dash so the dash
 * commits to where the player was and stays dodgeable.
 */
export function chargerStep(
  state: ChargerState, dist: number, dirX: number, dirY: number,
  speed: number, dtMs: number, cfg: ChargerConfig = CHARGER_CONFIG,
): { state: ChargerState; vx: number; vy: number } {
  switch (state.phase) {
    case 'chase':
      if (dist <= cfg.trigger) {
        return { state: { phase: 'windup', timer: cfg.windupMs, dashX: 0, dashY: 0 }, vx: 0, vy: 0 };
      }
      return { state, vx: dirX * speed, vy: dirY * speed };
    case 'windup': {
      const timer = state.timer - dtMs;
      if (timer <= 0) {
        const dashed: ChargerState = { phase: 'dash', timer: cfg.dashMs, dashX: dirX, dashY: dirY };
        return { state: dashed, vx: dirX * speed * cfg.dashMult, vy: dirY * speed * cfg.dashMult };
      }
      return { state: { ...state, timer }, vx: 0, vy: 0 };
    }
    case 'dash': {
      const timer = state.timer - dtMs;
      if (timer <= 0) {
        return { state: { phase: 'recover', timer: cfg.recoverMs, dashX: 0, dashY: 0 }, vx: 0, vy: 0 };
      }
      return {
        state: { ...state, timer },
        vx: state.dashX * speed * cfg.dashMult, vy: state.dashY * speed * cfg.dashMult,
      };
    }
    case 'recover': {
      const timer = state.timer - dtMs;
      const next: ChargerPhase = timer <= 0 ? 'chase' : 'recover';
      return { state: { phase: next, timer: Math.max(0, timer), dashX: 0, dashY: 0 }, vx: dirX * speed, vy: dirY * speed };
    }
  }
}

// --- Circler: orbit/strafe the player at a fixed band, sense fixed per-enemy ---

export const CIRCLER_RADIUS = 140; // px orbit band around the player (pre-RUN_SCALE)
export const CIRCLER_PULL = 2.0;   // radius-correction gain: px/s of radial pull per px of band error

/**
 * Velocity for a circler orbiting (px,py) at `radius`, sense `dir` (±1), at `speed`. Tangential
 * motion carries it around the band; a clamped radial term spirals it onto the band then holds.
 */
export function circlerVelocity(
  ex: number, ey: number, px: number, py: number, dir: number, speed: number,
  radius = CIRCLER_RADIUS, pull = CIRCLER_PULL,
): BehaviorVel {
  let rx = ex - px, ry = ey - py; // player → enemy (outward)
  let dist = Math.hypot(rx, ry);
  if (dist < 1e-6) { rx = 1; ry = 0; dist = 1; } // degenerate: pick an arbitrary radial
  const ux = rx / dist, uy = ry / dist;          // outward unit
  const tx = -uy * dir, ty = ux * dir;           // tangent (outward rotated 90°, sense by dir)
  const radial = Math.max(-speed, Math.min(speed, (radius - dist) * pull)); // inside ⇒ +out, outside ⇒ −in
  return { vx: tx * speed + ux * radial, vy: ty * speed + uy * radial };
}

// --- Standoff: hold a firing distance instead of beelining ---

export const STANDOFF_MIN = 170; // closer than this ⇒ kite away (px, pre-RUN_SCALE)
export const STANDOFF_MAX = 230; // farther than this ⇒ advance; between ⇒ hold

/**
 * Velocity for a ranged enemy holding a standoff band. (dirX,dirY) is the unit vector toward the
 * player. Beyond `max` it advances; inside `min` it kites directly away; in the band it holds.
 */
export function standoffVelocity(
  dist: number, dirX: number, dirY: number, speed: number,
  min = STANDOFF_MIN, max = STANDOFF_MAX,
): BehaviorVel {
  if (dist > max) return { vx: dirX * speed, vy: dirY * speed };
  if (dist < min) return { vx: -dirX * speed, vy: -dirY * speed };
  return { vx: 0, vy: 0 };
}

// ---- Flee (RC-026 treasure courier): run directly away from the player. The scene applies
// routeAround on top (same as chase) so the courier slides along barriers instead of pinning. ----

/** Velocity pointing AWAY from (px,py) for an enemy at (ex,ey), magnitude `speed`.
 *  Zero-distance degenerate case picks +x so the courier never freezes under the player. */
export function fleeVelocity(
  px: number, py: number, ex: number, ey: number, speed: number,
): BehaviorVel {
  const dx = ex - px, dy = ey - py;
  const d = Math.hypot(dx, dy);
  if (d === 0) return { vx: speed, vy: 0 };
  return { vx: (dx / d) * speed, vy: (dy / d) * speed };
}
