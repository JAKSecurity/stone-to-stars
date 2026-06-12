import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/run/rng';
import {
  generateLayout, DungeonLayout,
  DUNGEON_SCREENS_X, DUNGEON_SCREENS_Y,
  WALL_THICKNESS, BARRIER_THICKNESS, GAP_WIDTH, START_CLEAR_RADIUS, GAP_CLEAR_RADIUS,
  routeAround, Barrier, clampToPlayable,
} from '../src/run/dungeonGen';

const VIEW_W = 1280, VIEW_H = 720;
const layoutFor = (seed: number) => generateLayout(mulberry32(seed), VIEW_W, VIEW_H);

describe('dungeonGen — generateLayout', () => {
  it('is deterministic for a given seed', () => {
    expect(layoutFor(42)).toEqual(layoutFor(42));
  });

  it('sizes the world to the configured screen multiple', () => {
    const l = layoutFor(1);
    expect(l.width).toBe(VIEW_W * DUNGEON_SCREENS_X);
    expect(l.height).toBe(VIEW_H * DUNGEON_SCREENS_Y);
  });

  it('places the start in the west, inside the walls', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const l = layoutFor(seed);
      expect(l.start.x).toBeGreaterThan(WALL_THICKNESS);
      expect(l.start.x).toBeLessThan(l.width * 0.25);
      expect(l.start.y).toBeGreaterThan(WALL_THICKNESS);
      expect(l.start.y).toBeLessThan(l.height - WALL_THICKNESS);
    }
  });

  it('generates 1-2 vertical barriers east of the start, each with an in-bounds gap', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const l = layoutFor(seed);
      expect(l.barriers.length).toBeGreaterThanOrEqual(1);
      expect(l.barriers.length).toBeLessThanOrEqual(2);
      for (const b of l.barriers) {
        expect(b.axis).toBe('v');
        expect(['river', 'wall']).toContain(b.kind);
        expect(b.pos).toBeGreaterThan(l.start.x + START_CLEAR_RADIUS);
        expect(b.pos).toBeLessThan(l.width - WALL_THICKNESS);
        expect(b.gap.end - b.gap.start).toBe(GAP_WIDTH);
        expect(b.gap.start).toBeGreaterThanOrEqual(WALL_THICKNESS);
        expect(b.gap.end).toBeLessThanOrEqual(l.height - WALL_THICKNESS);
      }
    }
  });

  it('keeps obstacles inside the walls, out of barrier bands, gap approaches, and the start pocket', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const l = layoutFor(seed);
      expect(l.obstacles.length).toBeGreaterThan(10); // density formula yields ~40+ for 9 screens
      for (const o of l.obstacles) {
        expect(o.x - o.r).toBeGreaterThanOrEqual(WALL_THICKNESS);
        expect(o.x + o.r).toBeLessThanOrEqual(l.width - WALL_THICKNESS);
        expect(o.y - o.r).toBeGreaterThanOrEqual(WALL_THICKNESS);
        expect(o.y + o.r).toBeLessThanOrEqual(l.height - WALL_THICKNESS);
        expect(Math.hypot(o.x - l.start.x, o.y - l.start.y)).toBeGreaterThanOrEqual(START_CLEAR_RADIUS);
        for (const b of l.barriers) {
          expect(Math.abs(o.x - b.pos)).toBeGreaterThanOrEqual(BARRIER_THICKNESS / 2 + o.r);
          const gapMid = (b.gap.start + b.gap.end) / 2;
          expect(Math.hypot(o.x - b.pos, o.y - gapMid)).toBeGreaterThanOrEqual(GAP_CLEAR_RADIUS + o.r);
        }
      }
    }
  });
});

// --- Connectivity: coarse-grid flood fill from the start. Walls, barrier bands (minus the gap),
// and obstacle circles block; everything else is open. The far side of every barrier must be
// reachable, and stray obstacle clusters must not wall off a meaningful fraction of the floor.
function floodStats(l: DungeonLayout) {
  const cell = 32;
  const cols = Math.floor(l.width / cell), rows = Math.floor(l.height / cell);
  const open = (cx: number, cy: number): boolean => {
    const x = cx * cell + cell / 2, y = cy * cell + cell / 2;
    if (x < WALL_THICKNESS || x > l.width - WALL_THICKNESS) return false;
    if (y < WALL_THICKNESS || y > l.height - WALL_THICKNESS) return false;
    for (const b of l.barriers) {
      const across = b.axis === 'v' ? x : y;
      const along = b.axis === 'v' ? y : x;
      if (Math.abs(across - b.pos) < BARRIER_THICKNESS / 2 + cell / 2
        && (along < b.gap.start || along > b.gap.end)) return false;
    }
    return !l.obstacles.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + cell / 2);
  };
  const key = (cx: number, cy: number) => cy * cols + cx;
  const startC = { x: Math.floor(l.start.x / cell), y: Math.floor(l.start.y / cell) };
  const seen = new Set<number>([key(startC.x, startC.y)]);
  const queue = [startC];
  while (queue.length) {
    const { x, y } = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (seen.has(key(nx, ny)) || !open(nx, ny)) continue;
      seen.add(key(nx, ny));
      queue.push({ x: nx, y: ny });
    }
  }
  let openCount = 0, farReached = 0;
  const maxBarrier = Math.max(...l.barriers.map((b) => b.pos));
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      if (!open(cx, cy)) continue;
      openCount++;
      if (cx * cell + cell / 2 > maxBarrier && seen.has(key(cx, cy))) farReached++;
    }
  }
  return { frac: seen.size / openCount, farReached };
}

describe('dungeonGen — connectivity', () => {
  it('the start can reach the far side of every barrier, and nearly all open floor', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const stats = floodStats(layoutFor(seed));
      expect(stats.farReached).toBeGreaterThan(0);
      expect(stats.frac).toBeGreaterThan(0.95);
    }
  });
});

describe('dungeonGen — clampToPlayable (RC-038)', () => {
  const W = 3840, H = 2160, M = 72; // WALL_THICKNESS(48) + 24 in the scene; arbitrary here

  it('leaves an in-bounds point untouched', () => {
    expect(clampToPlayable(1000, 800, W, H, M)).toEqual({ x: 1000, y: 800 });
  });

  it('clamps a point past the left edge to the x margin', () => {
    expect(clampToPlayable(-100, 800, W, H, M)).toEqual({ x: M, y: 800 });
  });

  it('clamps a point past the right edge to world − margin', () => {
    expect(clampToPlayable(W + 500, 800, W, H, M)).toEqual({ x: W - M, y: 800 });
  });

  it('clamps a point past the top edge to the y margin', () => {
    expect(clampToPlayable(1000, -50, W, H, M)).toEqual({ x: 1000, y: M });
  });

  it('clamps a point past the bottom edge to world − margin', () => {
    expect(clampToPlayable(1000, H + 200, W, H, M)).toEqual({ x: 1000, y: H - M });
  });

  it('clamps an off-corner point to the nearest in-bounds corner (both axes)', () => {
    expect(clampToPlayable(-30, -30, W, H, M)).toEqual({ x: M, y: M });
    expect(clampToPlayable(W + 30, H + 30, W, H, M)).toEqual({ x: W - M, y: H - M });
  });

  it('snaps a point exactly on the margin to itself (boundary inclusive)', () => {
    expect(clampToPlayable(M, M, W, H, M)).toEqual({ x: M, y: M });
    expect(clampToPlayable(W - M, H - M, W, H, M)).toEqual({ x: W - M, y: H - M });
  });
});

describe('dungeonGen — routeAround', () => {
  const v = (pos: number, gapStart: number): Barrier =>
    ({ axis: 'v', pos, gap: { start: gapStart, end: gapStart + GAP_WIDTH }, kind: 'river' });

  it('returns the player position when no barrier separates them', () => {
    expect(routeAround(100, 100, 300, 300, [])).toEqual({ x: 300, y: 300 });
    expect(routeAround(100, 100, 300, 300, [v(900, 400)])).toEqual({ x: 300, y: 300 }); // same side
  });

  it('targets the gap centre when a vertical barrier separates enemy and player', () => {
    const b = v(900, 400); // gap spans y 400..660, centre 530
    expect(routeAround(1200, 100, 300, 300, [b])).toEqual({ x: 900, y: 530 });
  });

  it('targets the barrier nearest the enemy when two bands separate them', () => {
    const near = v(900, 400);  // enemy at x=2000 must cross x=1500 first
    const far = v(1500, 100);  // gap centre y = 230
    expect(routeAround(2000, 500, 300, 500, [near, far])).toEqual({ x: 1500, y: 230 });
  });

  it('handles horizontal barriers symmetrically', () => {
    const h: Barrier = { axis: 'h', pos: 800, gap: { start: 1000, end: 1000 + GAP_WIDTH }, kind: 'wall' };
    expect(routeAround(500, 1200, 500, 300, [h])).toEqual({ x: 1130, y: 800 });
  });
});
