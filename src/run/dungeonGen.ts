// Procedural dungeon layout for expedition runs (RC-034). Pure geometry — no Phaser — mirroring
// enemyBehavior.ts / bossEvent.ts: this module decides, RunScene renders. Feel constants live here
// for the playtest tuner. All units are world px (post-RUN_SCALE; the scene's viewport is the
// measuring stick: the world is the viewport tiled DUNGEON_SCREENS_X x DUNGEON_SCREENS_Y).

import { Rng, rngInt } from './rng';

export const DUNGEON_SCREENS_X = 3;    // world width  = viewport width  x this
export const DUNGEON_SCREENS_Y = 3;    // world height = viewport height x this
export const WALL_THICKNESS = 48;      // visible perimeter wall band
export const BARRIER_THICKNESS = 72;   // river/wall chokepoint band
export const GAP_WIDTH = 260;          // bridge/gateway opening along a barrier
export const START_CLEAR_RADIUS = 260; // obstacle-free pocket around the player start
export const GAP_CLEAR_RADIUS = 200;   // obstacle-free approach around each opening (connectivity)
export const AGGRO_RADIUS = 720;       // placed enemies sleep until the player is this close

/** One chokepoint band spanning the world, passable only through its gap. v1 generation emits only
 *  vertical bands ('v': blocks east-west travel at x=pos); the axis field keeps steering general. */
export interface Barrier {
  axis: 'h' | 'v';
  pos: number;                          // band centre on the blocked axis (x for 'v', y for 'h')
  gap: { start: number; end: number };  // open interval along the band's run (y for 'v', x for 'h')
  kind: 'river' | 'wall';
}

export interface Obstacle { x: number; y: number; r: number; }

export interface DungeonLayout {
  width: number;
  height: number;
  start: { x: number; y: number };
  barriers: Barrier[];
  obstacles: Obstacle[];
}

/** Generate a dungeon: start in the west, 1-2 vertical chokepoints dividing west from east, and
 *  biome-agnostic obstacle scatter (the scene themes the visuals). Deterministic per rng. */
export function generateLayout(rng: Rng, viewW: number, viewH: number): DungeonLayout {
  const width = viewW * DUNGEON_SCREENS_X;
  const height = viewH * DUNGEON_SCREENS_Y;
  const start = {
    x: WALL_THICKNESS + 180,
    y: rngInt(rng, Math.round(height * 0.3), Math.round(height * 0.7)),
  };

  const count = rngInt(rng, 1, 2);
  const kinds: Array<'river' | 'wall'> = rng() < 0.5 ? ['river', 'wall'] : ['wall', 'river'];
  const fracs = count === 1 ? [0.5] : [0.38, 0.66];
  const barriers: Barrier[] = fracs.map((f, i) => {
    const pos = Math.round(width * f) + rngInt(rng, -60, 60);
    const gapStart = rngInt(rng, WALL_THICKNESS + 40, height - WALL_THICKNESS - 40 - GAP_WIDTH);
    return { axis: 'v' as const, pos, gap: { start: gapStart, end: gapStart + GAP_WIDTH }, kind: kinds[i] };
  });

  // Obstacle scatter at the pre-RC-034 density (area / 90000 + 4), rejection-sampled away from the
  // walls, the start pocket, the barrier bands, and each opening's approach (connectivity guard).
  const obstacles: Obstacle[] = [];
  const target = Math.round((width * height) / 90000) + 4;
  for (let i = 0; i < target * 6 && obstacles.length < target; i++) {
    const r = rngInt(rng, 26, 46);
    const x = rngInt(rng, WALL_THICKNESS + r, width - WALL_THICKNESS - r);
    const y = rngInt(rng, WALL_THICKNESS + r, height - WALL_THICKNESS - r);
    if (Math.hypot(x - start.x, y - start.y) < START_CLEAR_RADIUS) continue;
    if (barriers.some((b) => nearBarrier(b, x, y, r))) continue;
    obstacles.push({ x, y, r });
  }
  return { width, height, start, barriers, obstacles };
}

/**
 * Where a chasing enemy should head: the player directly, or — when one or more barrier bands
 * separate them — the opening of the band nearest the enemy (cross chokepoints in order). The
 * returned point IS the player position when nothing blocks; callers can compare to detect routing.
 * Pure; RunScene applies the velocity.
 */
export function routeAround(
  ex: number, ey: number, px: number, py: number, barriers: Barrier[],
): { x: number; y: number } {
  let best: Barrier | null = null;
  let bestDist = Infinity;
  for (const b of barriers) {
    const e = b.axis === 'v' ? ex : ey;
    const p = b.axis === 'v' ? px : py;
    if ((e < b.pos) === (p < b.pos)) continue; // same side of this band
    const d = Math.abs(e - b.pos);
    if (d < bestDist) { bestDist = d; best = b; }
  }
  if (!best) return { x: px, y: py };
  const gapMid = (best.gap.start + best.gap.end) / 2;
  return best.axis === 'v' ? { x: best.pos, y: gapMid } : { x: gapMid, y: best.pos };
}

/**
 * RC-038: clamp a point into the playable field — the world inset by `margin` on every edge.
 * Pure; used at every spawn site and by the per-frame containment sweep so nothing (enemy, gem,
 * player) can come to rest in or beyond the perimeter wall band. Each axis is clamped independently
 * into [margin, world − margin], so an off-corner point snaps to the nearest in-bounds corner.
 */
export function clampToPlayable(
  x: number, y: number, worldW: number, worldH: number, margin: number,
): { x: number; y: number } {
  return {
    x: Math.max(margin, Math.min(worldW - margin, x)),
    y: Math.max(margin, Math.min(worldH - margin, y)),
  };
}

/** True when an obstacle at (x,y,r) would clip into a barrier band or crowd its opening. */
function nearBarrier(b: Barrier, x: number, y: number, r: number): boolean {
  const across = b.axis === 'v' ? x : y;
  if (Math.abs(across - b.pos) < BARRIER_THICKNESS / 2 + r) return true;
  const gapMid = (b.gap.start + b.gap.end) / 2;
  const gapX = b.axis === 'v' ? b.pos : gapMid;
  const gapY = b.axis === 'v' ? gapMid : b.pos;
  return Math.hypot(x - gapX, y - gapY) < GAP_CLEAR_RADIUS + r;
}
