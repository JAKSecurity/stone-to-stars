export interface Vec2 { x: number; y: number; }

/** Direction + clamped magnitude from a joystick origin to the current touch point.
 *  x/y are a unit direction (0 when below the deadzone); magnitude is 0..1. */
export function joystickVector(
  origin: Vec2, current: Vec2, maxRadius: number, deadzone = 0.12,
): { x: number; y: number; magnitude: number } {
  const dx = current.x - origin.x;
  const dy = current.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return { x: 0, y: 0, magnitude: 0 };
  const magnitude = Math.min(dist / maxRadius, 1);
  if (magnitude < deadzone) return { x: 0, y: 0, magnitude: 0 };
  return { x: dx / dist, y: dy / dist, magnitude };
}

/** Where the touch active should aim: the nearest enemy if any, else along the last
 *  movement direction, else straight up. Returns a WORLD point. */
export function activeAimPoint(
  px: number, py: number, target: Vec2 | null, lastDir: Vec2, reach = 200,
): Vec2 {
  if (target) return { x: target.x, y: target.y };
  const len = Math.hypot(lastDir.x, lastDir.y);
  if (len > 0) return { x: px + (lastDir.x / len) * reach, y: py + (lastDir.y / len) * reach };
  return { x: px, y: py - reach };
}
