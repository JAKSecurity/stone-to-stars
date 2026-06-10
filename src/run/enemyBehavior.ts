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
