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
