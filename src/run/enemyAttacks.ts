// RC-040 — Enemy attack-profile constants + geometry/timing helpers. Pure (no Phaser): the math
// lives here so it is unit-testable and the feel constants sit in one place for the playtest tuner
// (mirrors projectileMotion.ts / enemyBehavior.ts). RunScene reads these and renders the telegraphs.
// All px values are pre-RUN_SCALE — the scene multiplies by RUN_SCALE when it consumes them.

// ---- volley: ~5x the basic ranged cadence (3400ms), weaker per shot ----
export const VOLLEY_COOLDOWN_MS = 700;          // ~5x the basic ranged 3400
export const VOLLEY_DAMAGE_MULT = 0.35;         // of the basic ranged shot damage

// ---- slash: a melee arc sweep with a wind-up telegraph ----
export const SLASH_RANGE = 120;                 // px (pre-RUN_SCALE)
export const SLASH_ARC_RAD = Math.PI * 2 / 3;   // 120 degrees
export const SLASH_WINDUP_MS = 600;
export const SLASH_COOLDOWN_MS = 2200;

// ---- beam: a full-length laser along a locked aim line ----
export const BEAM_AIM_MS = 600;
export const BEAM_WIDTH = 26;                   // px (pre-RUN_SCALE)
export const BEAM_COOLDOWN_MS = 4200;
export const BEAM_DAMAGE_MULT = 1.6;

// ---- flamejet: a short cone dropping burning ground patches that damage the player ----
export const FLAME_CONE_RANGE = 200;            // patch line length (pre-RUN_SCALE)
export const FLAME_COOLDOWN_MS = 2600;
export const FLAME_PATCHES = 4;                 // patches dropped along the cone line

// ---- mortar: a lobbed AoE shell landing at the player's position ----
export const MORTAR_COOLDOWN_MS = 3800;
export const MORTAR_BLAST = 70;                 // px (pre-RUN_SCALE)
export const MORTAR_FLIGHT_MS = 900;

// ---- spawner: summons minions, hard-capped alive per spawner ----
export const SPAWNER_COOLDOWN_MS = 6000;
export const SPAWNER_CAP = 3;                   // alive children per spawner

// ---- haunt: leaves a damaging trail along its own path ----
export const HAUNT_DROP_MS = 400;
export const HAUNT_LINGER_MS = 1800;

// ---- enrage: below the HP threshold, speed + fire-rate scale up ----
export const ENRAGE_THRESHOLD = 0.3;
export const ENRAGE_MULT = 1.6;                 // speed + fire-rate multiplier when enraged

export interface XY { x: number; y: number; }

/** Wrap a radian delta into (-PI, PI]. */
function wrapAngle(delta: number): number {
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  return delta;
}

/** True if (tx,ty) lies inside the arc of arcRad centered on facingRad within range of (ax,ay). */
export function arcContains(
  ax: number, ay: number, facingRad: number, range: number, arcRad: number,
  tx: number, ty: number,
): boolean {
  const dx = tx - ax, dy = ty - ay;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist === 0) return true; // at the apex — inside any arc
  const toTarget = Math.atan2(dy, dx);
  const delta = Math.abs(wrapAngle(toTarget - facingRad));
  return delta <= arcRad / 2;
}

/** True if (px,py) is within width/2 of the segment from (x1,y1) along dirRad for length. */
export function beamHits(
  x1: number, y1: number, dirRad: number, length: number, width: number,
  px: number, py: number,
): boolean {
  const dirX = Math.cos(dirRad), dirY = Math.sin(dirRad);
  const relX = px - x1, relY = py - y1;
  // projection of the point onto the beam direction (distance along the line from the origin)
  const along = relX * dirX + relY * dirY;
  if (along < 0 || along > length) return false; // behind the origin or beyond the length
  // perpendicular distance from the line
  const perp = Math.abs(relX * dirY - relY * dirX);
  return perp <= width / 2;
}

/** True if HP is below the enrage threshold (hp/maxHp < ENRAGE_THRESHOLD). */
export function enrageActive(hp: number, maxHp: number): boolean {
  if (maxHp <= 0) return false;
  return hp / maxHp < ENRAGE_THRESHOLD;
}

/** Points along the flame cone line from (ex,ey) toward facingRad: n evenly spaced out to range. */
export function flamePatchPoints(
  ex: number, ey: number, facingRad: number,
  range = FLAME_CONE_RANGE, n = FLAME_PATCHES,
): XY[] {
  const dirX = Math.cos(facingRad), dirY = Math.sin(facingRad);
  const pts: XY[] = [];
  if (n <= 0) return pts;
  // evenly spaced from the first step out to range (last patch lands at the cone tip)
  for (let i = 1; i <= n; i++) {
    const d = (range * i) / n;
    pts.push({ x: ex + dirX * d, y: ey + dirY * d });
  }
  return pts;
}

/** Spawner may summon iff aliveChildren < SPAWNER_CAP. */
export function spawnerMaySummon(aliveChildren: number): boolean {
  return aliveChildren < SPAWNER_CAP;
}

// ---- RC-009: tier-based damage multipliers ----

/** Regular-enemy damage multiplier by run tier: linear 1.0 (tier 0) → 3.0 (tier 7).
 *  RC-041: tier 8 (space) clamps at the playtest-tuned modern cap — the space age has no
 *  regular expeditions; the RC-042 finale brings its own boss multiplier. */
export function enemyDamageMult(tier: number): number {
  return 1 + (Math.max(0, Math.min(7, tier)) / 7) * 2;
}

/** Apex-boss damage multiplier by run tier: linear 1.0 (tier 0) → 6.0 (tier 7); tier 8 clamps (see above). */
export function bossDamageMult(tier: number): number {
  return 1 + (Math.max(0, Math.min(7, tier)) / 7) * 5;
}