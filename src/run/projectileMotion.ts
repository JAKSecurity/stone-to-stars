// Pure motion math for the orbit and lob projectile behaviors (RC-015). No Phaser imports — the
// geometry lives here so it is unit-testable, and the feel constants sit in one place for the
// playtest tuner (mirrors how expedition.ts / weapons.ts keep logic out of the scene).

export const ORBIT_RADIUS = 90;            // px from the player center
export const ORBIT_ANGULAR_SPEED = 3.0;    // rad/s (~one revolution every ~2.1s)
export const ORBIT_HIT_INTERVAL_MS = 320;  // per-enemy re-hit cooldown for a persistent orbiter
export const LOB_PEAK_HEIGHT = 70;         // px apex of the visual arc
export const LOB_BLAST_RADIUS = 64;        // px AoE radius at the landing point
export const LOB_MIN_FLIGHT_MS = 350;
export const LOB_MAX_FLIGHT_MS = 1100;

export interface XY { x: number; y: number; }

/** Angle (radians) of orbiter `index` of `count`, `elapsedMs` into the run clock. */
export function orbitAngle(
  index: number, count: number, elapsedMs: number, angularSpeed = ORBIT_ANGULAR_SPEED,
): number {
  return (index / count) * Math.PI * 2 + (elapsedMs / 1000) * angularSpeed;
}

/** World position of an orbiter at `angle` around (cx,cy) at `radius`. */
export function orbitPosition(cx: number, cy: number, radius: number, angle: number): XY {
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

/** Flight time (ms) for a lob covering `distance` px at `speed` px/s, clamped to a sane window. */
export function lobFlightMs(
  distance: number, speed: number, min = LOB_MIN_FLIGHT_MS, max = LOB_MAX_FLIGHT_MS,
): number {
  if (speed <= 0) return max;
  return Math.max(min, Math.min(max, (distance / speed) * 1000));
}

/** Progress 0..1 of a lob `elapsedMs` into a `flightMs` flight. */
export function lobProgress(elapsedMs: number, flightMs: number): number {
  if (flightMs <= 0) return 1;
  return Math.max(0, Math.min(1, elapsedMs / flightMs));
}

/** Ground (shadow) position of a lob at progress t — component-wise lerp start→target. */
export function lobGroundPosition(start: XY, target: XY, t: number): XY {
  return { x: start.x + (target.x - start.x) * t, y: start.y + (target.y - start.y) * t };
}

/** Upward visual offset (px) of the arc at progress t — parabola peaking at t=0.5. */
export function lobArcHeight(t: number, peak = LOB_PEAK_HEIGHT): number {
  return peak * 4 * t * (1 - t);
}

/** True if (bx,by) lies within `r` px of (ax,ay). */
export function withinRadius(ax: number, ay: number, bx: number, by: number, r: number): boolean {
  const dx = bx - ax, dy = by - ay;
  return dx * dx + dy * dy <= r * r;
}

// ---- RC-031 Forge & Fuse trajectories (pure math; RunScene renders) ----

export const BOOMERANG_OUT_MS = 450;     // outbound flight time before the return leg
export const HOMING_TURN_RAD_S = 3.5;    // max steering rate
export const CHAIN_RANGE = 180;          // px hop search radius
export const CHAIN_FALLOFF = 0.75;       // damage multiplier per hop
export const TRAIL_DROP_MS = 250;        // trail weapons drop a patch this often while firing
export const TRAIL_LINGER_MS = 1500;     // how long a trail patch burns
export const TRAIL_RADIUS = 26;          // patch hit radius
export const ZONE_TICK_MS = 400;         // lingering fields re-hit cadence (trail + zone)
export const ZONE_RADIUS = 70;           // zone (mine field) radius
export const SLOW_MS = 2000;             // onHit.slowPct duration
export const BOOMERANG_RETURN_MULT = 1.15; // return leg flies this much faster than the outbound

export type BoomerangPhase = 'out' | 'return';

export interface Velocity { vx: number; vy: number }

/** Velocity of a boomerang: outbound rides the locked aim; the return leg steers at the player. */
export function boomerangVelocity(
  phase: BoomerangPhase, aimX: number, aimY: number,
  px: number, py: number, bx: number, by: number, speed: number,
): Velocity {
  if (phase === 'out') return { vx: aimX * speed, vy: aimY * speed };
  const dx = px - bx, dy = py - by;
  const d = Math.hypot(dx, dy) || 1;
  return { vx: (dx / d) * speed * BOOMERANG_RETURN_MULT, vy: (dy / d) * speed * BOOMERANG_RETURN_MULT }; // returns slightly faster
}

/** Steer (vx,vy) toward (tx,ty) by at most HOMING_TURN_RAD_S·dt, preserving speed. */
export function homingVelocity(
  vx: number, vy: number, bx: number, by: number, tx: number, ty: number,
  speed: number, dtMs: number,
): Velocity {
  const want = Math.atan2(ty - by, tx - bx);
  const cur = Math.atan2(vy, vx);
  let delta = want - cur;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const maxTurn = HOMING_TURN_RAD_S * (dtMs / 1000);
  const next = cur + Math.max(-maxTurn, Math.min(maxTurn, delta));
  return { vx: Math.cos(next) * speed, vy: Math.sin(next) * speed };
}

export interface ChainCandidate { id: string; x: number; y: number }

/** Nearest unhit candidate within `range` of (fromX, fromY), else null. */
export function chainNextTarget(
  candidates: ChainCandidate[], fromX: number, fromY: number,
  hit: Set<string>, range: number,
): ChainCandidate | null {
  let best: ChainCandidate | null = null, bestD = range;
  for (const c of candidates) {
    if (hit.has(c.id)) continue;
    const d = Math.hypot(c.x - fromX, c.y - fromY);
    if (d <= bestD) { bestD = d; best = c; }
  }
  return best;
}
