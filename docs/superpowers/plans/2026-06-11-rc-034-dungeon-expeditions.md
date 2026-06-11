# RC-034 Procedural Dungeon Expeditions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the expedition run from a single-screen survival arena into a seeded, procedurally generated explorable map (3×3 screens) with perimeter walls, river/wall chokepoints, enemies placed at generation time that sleep until aggro'd, and a "clear the dungeon" win condition.

**Architecture:** House pattern throughout — pure, registry-injected logic modules with unit tests (`src/run/rng.ts`, `src/run/dungeonGen.ts`, `src/run/dungeonPopulate.ts`), and `src/scenes/RunScene.ts` as a thin renderer that calls them. The world becomes `viewport × 3` in each axis with a follow camera; barriers are axis-aligned bands with one gap (bridge/gateway) so connectivity holds by construction and chokepoint steering is a trivial pure function. Periodic gem faucets become placed deposits (computed from the same per-duration formulas, so RC-033 economy balance is preserved and there is no infinite-camping exploit once the timer is gone).

**Tech Stack:** TypeScript, Phaser 3 (Arcade physics), Vitest. Commands: `npm test` (vitest run), `npm run build` (tsc --noEmit + vite build).

**Working directory:** the RC-034 worktree at `.claude/worktrees/elastic-noyce-e72296` (branch `claude/elastic-noyce-e72296`). All paths below are relative to the repo root.

**Design decisions locked in (from ticket `docs/tickets/RC-034-procedural-dungeon-expeditions.md`):**
- World = 3 screens × 3 screens (viewport-derived at `create()`); hard visible perimeter walls.
- 1–2 **vertical** barrier bands (river or wall), each with one gap (bridge deck / gateway opening). The `Barrier` type carries an `axis` field so steering stays general, but v1 generation only emits `'v'` — start is in the west, boss in the east, so vertical bands always divide them.
- All enemies placed at generation. They start **asleep** (no movement, no fire) and wake when the player comes within `AGGRO_RADIUS` or when damaged. Splitter children spawn awake (unchanged `spawnEnemyAt` default).
- The apex mini-boss (RC-019) is **placed** at the farthest open point instead of arriving on a timer. Banner + HP bar appear on aggro. `shouldSpawnBoss`/`BOSS_TELEGRAPH_MS` go unused by the scene but stay in `src/run/bossEvent.ts` (still tested; timed arrival may return in other modes).
- Win = `enemies.countActive(true) === 0` → existing Zone-Cleared ceremony. The HUD timer becomes an "enemies left" counter; `survivedMs` still reports elapsed time.
- Seeded RNG (mulberry32). The scene rolls a random seed per run; tests pass fixed seeds.
- Deferred to a later slice (do NOT build): gate-opening interaction, minimap, fog of war. Bullets passing over obstacles/water is existing behavior — leave it.

---

## File structure

| File | Status | Responsibility |
|------|--------|----------------|
| `src/run/rng.ts` | Create | mulberry32 seeded PRNG + int/pick helpers. Pure. |
| `src/run/dungeonGen.ts` | Create | Layout geometry: world dims, start, barriers w/ gaps, obstacle scatter, `routeAround` chokepoint steering, feel constants. Pure. |
| `src/run/dungeonPopulate.ts` | Create | Placement: enemies (escalation-by-distance, safe radius, boss at far point) and gem deposits (faucet-parity economy). Pure, registries injected. |
| `src/scenes/RunScene.ts` | Modify | World bounds + follow camera, terrain rendering, sleep/wake, steering, boss-on-aggro, clear condition, HUD. |
| `tests/rng.test.ts` | Create | Determinism, range, pick. |
| `tests/dungeonGen.test.ts` | Create | Determinism, bounds, gap validity, obstacle exclusions, flood-fill connectivity, routeAround. |
| `tests/dungeonPopulate.test.ts` | Create | Counts, safe radius, boss distance, pool membership, gem economy parity, biased pick. |

---

### Task 1: Seeded RNG module

**Files:**
- Create: `src/run/rng.ts`
- Test: `tests/rng.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/rng.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { mulberry32, rngInt, rngPick } from '../src/run/rng';

describe('rng — mulberry32', () => {
  it('is deterministic: same seed yields the same sequence', () => {
    const a = mulberry32(1234), b = mulberry32(1234);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it('different seeds yield different sequences', () => {
    const a = mulberry32(1), b = mulberry32(2);
    const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
    expect(seqA).not.toEqual(seqB);
  });

  it('emits values in [0, 1)', () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 500; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('rng — helpers', () => {
  it('rngInt stays within [min, max] inclusive and hits both endpoints', () => {
    const rng = mulberry32(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = rngInt(rng, 3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.has(3)).toBe(true);
    expect(seen.has(6)).toBe(true);
  });

  it('rngPick returns an element of the array', () => {
    const rng = mulberry32(7);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) expect(arr).toContain(rngPick(rng, arr));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/rng.test.ts`
Expected: FAIL — cannot resolve `../src/run/rng`.

- [ ] **Step 3: Implement the module**

Create `src/run/rng.ts`:

```typescript
// Seeded PRNG (mulberry32) for procedural dungeon generation (RC-034). Deterministic per seed so
// layouts are reproducible in tests and debuggable from a logged seed. Pure — no Phaser.

export type Rng = () => number;

/** mulberry32: tiny, fast, good-enough 32-bit PRNG. Returns values in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] inclusive (mirrors Phaser.Math.Between, but seeded). */
export function rngInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Uniform pick from a non-empty array. */
export function rngPick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/rng.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/run/rng.ts tests/rng.test.ts
git commit -m "feat(RC-034): seeded mulberry32 RNG for procedural generation"
```

---

### Task 2: Dungeon layout geometry

**Files:**
- Create: `src/run/dungeonGen.ts`
- Test: `tests/dungeonGen.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/dungeonGen.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/run/rng';
import {
  generateLayout, DungeonLayout,
  DUNGEON_SCREENS_X, DUNGEON_SCREENS_Y,
  WALL_THICKNESS, BARRIER_THICKNESS, GAP_WIDTH, START_CLEAR_RADIUS, GAP_CLEAR_RADIUS,
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/dungeonGen.test.ts`
Expected: FAIL — cannot resolve `../src/run/dungeonGen`.

- [ ] **Step 3: Implement the module**

Create `src/run/dungeonGen.ts`:

```typescript
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

/** True when an obstacle at (x,y,r) would clip into a barrier band or crowd its opening. */
function nearBarrier(b: Barrier, x: number, y: number, r: number): boolean {
  const across = b.axis === 'v' ? x : y;
  if (Math.abs(across - b.pos) < BARRIER_THICKNESS / 2 + r) return true;
  const gapMid = (b.gap.start + b.gap.end) / 2;
  const gapX = b.axis === 'v' ? b.pos : gapMid;
  const gapY = b.axis === 'v' ? gapMid : b.pos;
  return Math.hypot(x - gapX, y - gapY) < GAP_CLEAR_RADIUS + r;
}
```

Note: the start-pocket test asserts `pos > start.x + START_CLEAR_RADIUS`. With `fracs >= 0.38` and `start.x <= WALL + 180 = 228`, the smallest pos is `0.38 * 3840 - 60 = 1399 > 228 + 260` — holds by construction for any viewport ≥ ~1000px wide; the test documents it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/dungeonGen.test.ts`
Expected: PASS (6 tests). If the connectivity fraction fails on a specific seed, inspect that seed's layout before touching thresholds — a real generator bug (e.g., gap outside bounds) fails here first.

- [ ] **Step 5: Commit**

```bash
git add src/run/dungeonGen.ts tests/dungeonGen.test.ts
git commit -m "feat(RC-034): seeded dungeon layout - perimeter, chokepoint barriers, obstacle scatter"
```

---

### Task 3: Chokepoint steering (`routeAround`)

**Files:**
- Modify: `src/run/dungeonGen.ts` (append)
- Test: `tests/dungeonGen.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/dungeonGen.test.ts` (add `routeAround` and `Barrier` to the existing import from `../src/run/dungeonGen`):

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/dungeonGen.test.ts`
Expected: FAIL — `routeAround` is not exported.

- [ ] **Step 3: Implement**

Append to `src/run/dungeonGen.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/dungeonGen.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/run/dungeonGen.ts tests/dungeonGen.test.ts
git commit -m "feat(RC-034): routeAround - enemies path through chokepoint openings"
```

---

### Task 4: Population — placed enemies and gem deposits

**Files:**
- Create: `src/run/dungeonPopulate.ts`
- Test: `tests/dungeonPopulate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/dungeonPopulate.test.ts`. Fixture registries keep the tests decoupled from live game data; the gem-economy expectations are computed from the faucet formulas (the spec), not from the implementation's output:

```typescript
import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/run/rng';
import { generateLayout, WALL_THICKNESS, BARRIER_THICKNESS } from '../src/run/dungeonGen';
import {
  enemyPlacements, gemPlacements, pickBiasedResource,
  BASE_ENEMY_COUNT, ENEMIES_PER_TIER, ENEMY_SAFE_RADIUS,
} from '../src/run/dungeonPopulate';
import { runDurationForTier } from '../src/game/config';
import { BiomeDef, EnemyDef, RESOURCES } from '../src/game/types';

const FIX_ENEMIES: Record<string, EnemyDef> = {
  grunt: { id: 'grunt', name: 'Grunt', sprite: 's', baseHp: 20, speed: 60, contactDamage: 5, drop: 'industry', xp: 4, displaySize: { w: 24, h: 24 } },
  brute: { id: 'brute', name: 'Brute', sprite: 's', baseHp: 80, speed: 40, contactDamage: 10, drop: 'science', xp: 9, displaySize: { w: 30, h: 30 } },
};
// minAge 'modern' = last age, so escalation has no next-age seed; the pool stays {grunt, brute}.
const FIX_BIOME: BiomeDef = {
  id: 'fix', name: 'Fixture', minAge: 'modern',
  resourceBias: { exploration: 1.5, culture: 0.8 },
  spawnTable: { grunt: 3, brute: 1 },
  tint: '#000',
};
const FIX_BIOMES = { fix: FIX_BIOME };

const layout = generateLayout(mulberry32(5), 1280, 720);
const place = (seed: number, tier: number) =>
  enemyPlacements(mulberry32(seed), layout, tier, FIX_BIOME, 'brute', FIX_BIOMES, FIX_ENEMIES);

describe('dungeonPopulate — enemyPlacements', () => {
  it('is deterministic for a given seed', () => {
    expect(place(9, 2)).toEqual(place(9, 2));
  });

  it('places the tier-scaled count plus exactly one boss', () => {
    const p = place(9, 2);
    expect(p.length).toBe(BASE_ENEMY_COUNT + ENEMIES_PER_TIER * 2 + 1);
    expect(p.filter((e) => e.isBoss).length).toBe(1);
    expect(p.find((e) => e.isBoss)!.id).toBe('brute');
  });

  it('keeps every enemy outside the start safe radius and inside the walls', () => {
    for (const e of place(9, 3)) {
      expect(Math.hypot(e.x - layout.start.x, e.y - layout.start.y)).toBeGreaterThanOrEqual(ENEMY_SAFE_RADIUS);
      expect(e.x).toBeGreaterThan(WALL_THICKNESS);
      expect(e.x).toBeLessThan(layout.width - WALL_THICKNESS);
      expect(e.y).toBeGreaterThan(WALL_THICKNESS);
      expect(e.y).toBeLessThan(layout.height - WALL_THICKNESS);
    }
  });

  it('places no enemy inside a barrier band', () => {
    for (const e of place(9, 3)) {
      for (const b of layout.barriers) {
        const across = b.axis === 'v' ? e.x : e.y;
        expect(Math.abs(across - b.pos)).toBeGreaterThan(BARRIER_THICKNESS / 2);
      }
    }
  });

  it('draws every non-boss id from the biome spawn pool', () => {
    for (const e of place(9, 3)) expect(['grunt', 'brute']).toContain(e.id);
  });

  it('places the boss deep in the dungeon (east half)', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const boss = place(seed, 0).find((e) => e.isBoss)!;
      expect(boss.x).toBeGreaterThan(layout.width / 2);
    }
  });
});

describe('dungeonPopulate — gemPlacements', () => {
  it('matches the retired faucet economy: counts derive from run duration and biome bias', () => {
    const tier = 0;
    const d = runDurationForTier(tier); // 60s at tier 0
    const gems = gemPlacements(mulberry32(3), layout, tier, FIX_BIOME);
    const expectExploration = Math.round((d / 4000) * 1.5); // old 4000ms faucet, bias 1.5
    const expectCulture = Math.round((d / 5000) * 0.8);     // old 5000ms relic faucet, bias 0.8
    const expectDeposits = Math.round(d / 2600);            // old 2600ms deposit faucet
    expect(gems.filter((g) => g.resource === 'exploration').length).toBeGreaterThanOrEqual(expectExploration);
    expect(gems.filter((g) => g.resource === 'culture').length).toBeGreaterThanOrEqual(expectCulture);
    expect(gems.length).toBe(expectExploration + expectCulture + expectDeposits);
  });

  it('keeps every gem inside the walls and out of barrier bands', () => {
    for (const g of gemPlacements(mulberry32(3), layout, 2, FIX_BIOME)) {
      expect(g.x).toBeGreaterThan(WALL_THICKNESS);
      expect(g.x).toBeLessThan(layout.width - WALL_THICKNESS);
      expect(g.y).toBeGreaterThan(WALL_THICKNESS);
      expect(g.y).toBeLessThan(layout.height - WALL_THICKNESS);
      for (const b of layout.barriers) {
        const across = b.axis === 'v' ? g.x : g.y;
        expect(Math.abs(across - b.pos)).toBeGreaterThan(BARRIER_THICKNESS / 2);
      }
      expect(RESOURCES).toContain(g.resource);
    }
  });
});

describe('dungeonPopulate — pickBiasedResource', () => {
  it('returns the first resource when the roll is 0 and the last when the roll is ~1', () => {
    expect(pickBiasedResource(() => 0, FIX_BIOME.resourceBias)).toBe('exploration');
    expect(pickBiasedResource(() => 0.999999, FIX_BIOME.resourceBias)).toBe('culture');
  });
});
```

Note the `toBeGreaterThanOrEqual` on per-resource counts: the deposit bucket rolls biased resources, so it can add more exploration/culture gems on top of the dedicated buckets. The total is exact.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/dungeonPopulate.test.ts`
Expected: FAIL — cannot resolve `../src/run/dungeonPopulate`.

- [ ] **Step 3: Implement the module**

Create `src/run/dungeonPopulate.ts`:

```typescript
// Dungeon population (RC-034): which enemies and gem deposits go where. Pure, registries injected
// (mirrors spawnEscalation.ts) — RunScene materialises these into sprites. The gem counts reproduce
// the retired periodic faucets (4000ms exploration tick, 5000ms culture relic, 2600ms deposit) over
// the age's old run duration, so the RC-033 economy balance carries over and there is no
// camp-forever income now that the timer is gone: the map IS the budget.

import { BiomeDef, EnemyDef, Resource, RESOURCES } from '../game/types';
import { Rng, rngInt } from './rng';
import { DungeonLayout, WALL_THICKNESS, BARRIER_THICKNESS } from './dungeonGen';
import { spawnTableAt } from './spawnEscalation';
import { pickEnemy } from './expedition';
import { runDurationForTier } from '../game/config';

export const BASE_ENEMY_COUNT = 26;   // placed enemies at tier 0 ...
export const ENEMIES_PER_TIER = 8;    // ... plus this many per age tier
export const ENEMY_SAFE_RADIUS = 420; // no enemy placed this close to the start

export interface EnemyPlacement { id: string; x: number; y: number; isBoss?: boolean; }
export interface GemPlacement { x: number; y: number; resource: Resource; }

/** A resource id biased toward the biome's lean (every resource can appear). Pure twin of the old
 *  RunScene.biasedResource — the scene now delegates here. */
export function pickBiasedResource(rng: Rng, bias: Partial<Record<Resource, number>>): Resource {
  const weights = RESOURCES.map((r) => 0.5 + (bias[r] ?? 0));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < RESOURCES.length; i++) {
    roll -= weights[i];
    if (roll < 0) return RESOURCES[i];
  }
  return RESOURCES[RESOURCES.length - 1];
}

/** A random point inside the walls and outside every barrier band (margin-padded). */
function openPoint(rng: Rng, layout: DungeonLayout, margin: number): { x: number; y: number } {
  for (let tries = 0; tries < 60; tries++) {
    const x = rngInt(rng, WALL_THICKNESS + margin, layout.width - WALL_THICKNESS - margin);
    const y = rngInt(rng, WALL_THICKNESS + margin, layout.height - WALL_THICKNESS - margin);
    const inBand = layout.barriers.some((b) =>
      Math.abs((b.axis === 'v' ? x : y) - b.pos) <= BARRIER_THICKNESS / 2 + margin);
    if (!inBand) return { x, y };
  }
  return { x: layout.start.x, y: layout.start.y }; // statistically unreachable fallback
}

/**
 * Place the run's full enemy roster: BASE + PER_TIER x tier mobs drawn from the biome's spawn
 * table, escalated by DEPTH instead of time — the farther from the start, the more the mix shifts
 * toward tough/next-age enemies (distance plays the role elapsed-time used to). The apex mini-boss
 * (RC-019) guards the deepest sampled point. `trickleBiome` is the boss-free table the scene
 * already builds; registries are injected for testability.
 */
export function enemyPlacements(
  rng: Rng, layout: DungeonLayout, tier: number,
  trickleBiome: BiomeDef, bossId: string,
  biomes: Record<string, BiomeDef>, enemies: Record<string, EnemyDef>,
): EnemyPlacement[] {
  const out: EnemyPlacement[] = [];
  const total = BASE_ENEMY_COUNT + ENEMIES_PER_TIER * tier;
  const depthScale = Math.hypot(layout.width, layout.height) * 0.75;
  for (let i = 0; i < total; i++) {
    let x = 0, y = 0;
    for (let tries = 0; tries < 60; tries++) {
      ({ x, y } = openPoint(rng, layout, 60));
      if (Math.hypot(x - layout.start.x, y - layout.start.y) >= ENEMY_SAFE_RADIUS) break;
    }
    const progress = Math.min(1, Math.hypot(x - layout.start.x, y - layout.start.y) / depthScale);
    const table = spawnTableAt(trickleBiome, progress, biomes, enemies);
    out.push({ id: pickEnemy(table, rng), x, y });
  }
  out.push({ ...farthestOpenPoint(rng, layout), id: bossId, isBoss: true });
  return out;
}

/** Best-of-N sample for the point most distant from the start — the boss lair. */
function farthestOpenPoint(rng: Rng, layout: DungeonLayout): { x: number; y: number } {
  let best = { x: layout.width - WALL_THICKNESS - 140, y: layout.height / 2 };
  let bestD = -1;
  for (let i = 0; i < 24; i++) {
    const p = openPoint(rng, layout, 140);
    const d = Math.hypot(p.x - layout.start.x, p.y - layout.start.y);
    if (d > bestD) { bestD = d; best = p; }
  }
  return best;
}

/** Gem deposits scattered at generation, replacing the periodic faucets 1:1 in expected value. */
export function gemPlacements(
  rng: Rng, layout: DungeonLayout, tier: number, biome: BiomeDef,
): GemPlacement[] {
  const d = runDurationForTier(tier);
  const buckets: Array<{ resource: Resource | null; count: number }> = [
    { resource: 'exploration', count: Math.round((d / 4000) * (biome.resourceBias.exploration ?? 1)) },
    { resource: 'culture', count: Math.round((d / 5000) * (biome.resourceBias.culture ?? 1)) },
    { resource: null, count: Math.round(d / 2600) }, // null = biased roll per gem
  ];
  const out: GemPlacement[] = [];
  for (const bucket of buckets) {
    for (let i = 0; i < bucket.count; i++) {
      const { x, y } = openPoint(rng, layout, 40);
      out.push({ x, y, resource: bucket.resource ?? pickBiasedResource(rng, biome.resourceBias) });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/dungeonPopulate.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Run the FULL suite (imports touch live modules)**

Run: `npm test`
Expected: all suites PASS (246 pre-existing + new).

- [ ] **Step 6: Commit**

```bash
git add src/run/dungeonPopulate.ts tests/dungeonPopulate.test.ts
git commit -m "feat(RC-034): dungeon population - placed enemies by depth, faucet-parity gem deposits"
```

---

### Task 5: RunScene — big world, follow camera, terrain

Transitional state after this task: the game compiles and plays in the 3×3 world with walls and chokepoints, but enemies still trickle-spawn on a timer and the win is still timed. Task 6 swaps those.

**Files:**
- Modify: `src/scenes/RunScene.ts`

No unit tests cover the scene (it is the thin renderer); verification is `npm run build` (tsc) + the full suite + the Task 7 walkthrough.

- [ ] **Step 1: Add imports and the layout field**

In `src/scenes/RunScene.ts`, add to the imports block (after the `enemyBehavior` import, line ~30):

```typescript
import { mulberry32 } from '../run/rng';
import {
  generateLayout, routeAround, DungeonLayout, Barrier,
  WALL_THICKNESS, BARRIER_THICKNESS, AGGRO_RADIUS,
} from '../run/dungeonGen';
```

Add a field next to `private biome!: BiomeDef;` (line ~75):

```typescript
private layout!: DungeonLayout;
```

- [ ] **Step 2: Generate the layout; world + camera bounds; follow camera**

Replace the top of `create()` (lines 150–171, from `const { width, height } = this.scale;` through `this.scatterObstacles(width, height);`) with:

```typescript
create() {
    // RC-034: the run is a procedurally generated dungeon DUNGEON_SCREENS x the viewport. The seed
    // is logged so any layout bug is reproducible (generateLayout is deterministic per seed).
    const seed = (Math.random() * 0xffffffff) >>> 0;
    console.info(`[run] dungeon seed ${seed}`);
    this.layout = generateLayout(mulberry32(seed), this.scale.width, this.scale.height);
    const { width, height } = this.layout;
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.setBackgroundColor(this.biome.visual?.ground ?? this.biome.tint);
    this.drawBackground(width, height);

    const player = this.add.image(this.layout.start.x, this.layout.start.y, this.heroSprite);
    player.setDisplaySize(34 * RUN_SCALE, 42 * RUN_SCALE);
    this.physics.add.existing(player);
    this.player = player as any;
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    // The sprite frame has transparent padding, so the default body is wider than the visible hero and
    // you'd snag on obstacle corners with room to spare. Shrink the body to ~64% of the display,
    // centered, so collisions match what you see. (shrinkBody sizes proportionally, not in raw px.)
    this.shrinkBody(this.player, 0.64);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.gems = this.physics.add.group();
    this.obstacles = this.physics.add.staticGroup();
    this.buildTerrain(this.layout);
```

- [ ] **Step 3: Pin the HUD to the screen**

At the HUD creation (line ~188), append `.setScrollFactor(0)`:

```typescript
    this.hud = this.add.text(12, 12, '',
      { fontSize: '20px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setDepth(10).setScrollFactor(0);
```

- [ ] **Step 4: Replace `scatterObstacles` with `buildTerrain`**

Delete the whole `scatterObstacles` method (lines 219–252) and add in its place:

```typescript
  /** RC-034: materialise the generated layout — perimeter walls, chokepoint barriers (river with a
   *  bridge deck / wall with a gateway opening), and the biome-themed obstacle props. All collision
   *  bodies join this.obstacles, so the existing player/enemy colliders cover them. */
  private buildTerrain(layout: DungeonLayout) {
    const { width, height } = layout;
    const t = WALL_THICKNESS;
    this.addStaticRect(width / 2, t / 2, width, t, 0x000000, 0.55);            // north wall
    this.addStaticRect(width / 2, height - t / 2, width, t, 0x000000, 0.55);  // south wall
    this.addStaticRect(t / 2, height / 2, t, height, 0x000000, 0.55);         // west wall
    this.addStaticRect(width - t / 2, height / 2, t, height, 0x000000, 0.55); // east wall

    for (const b of layout.barriers) this.buildBarrier(b, layout);
    for (const o of layout.obstacles) this.addObstacleProp(o.x, o.y, o.r);
  }

  /** A filled, collidable static rectangle registered into the obstacles group. */
  private addStaticRect(x: number, y: number, w: number, h: number, color: number, alpha: number) {
    const rect = this.add.rectangle(x, y, w, h, color, alpha).setDepth(-1);
    rect.setStrokeStyle(2, 0xffffff, 0.08);
    this.physics.add.existing(rect, true);
    this.obstacles.add(rect as any);
  }

  /** One chokepoint: two collidable band segments with the opening between them. Rivers get a
   *  walkable bridge deck across the gap; walls read as a broken gateway (the opening itself).
   *  v1 generation emits vertical bands only — see dungeonGen. */
  private buildBarrier(b: Barrier, layout: DungeonLayout) {
    const color = b.kind === 'river' ? 0x2f6f9f : 0x1a1a22;
    const alpha = b.kind === 'river' ? 0.8 : 0.85;
    const segments = [
      { from: 0, to: b.gap.start },
      { from: b.gap.end, to: layout.height },
    ];
    for (const s of segments) {
      const len = s.to - s.from;
      if (len <= 0) continue;
      this.addStaticRect(b.pos, s.from + len / 2, BARRIER_THICKNESS, len, color, alpha);
    }
    if (b.kind === 'river') {
      this.add.rectangle(b.pos, (b.gap.start + b.gap.end) / 2,
        BARRIER_THICKNESS + 24, b.gap.end - b.gap.start, 0x8a6a42, 0.9)
        .setDepth(-2).setStrokeStyle(2, 0x000000, 0.3);
    }
  }

  /** One biome-themed obstacle prop — sprite + the rc-017 inset-circle body (visuals unchanged
   *  from the pre-RC-034 scatter; only the position source moved to the seeded layout). */
  private addObstacleProp(x: number, y: number, r: number) {
    const set = this.biome.visual?.obstacles ?? [];
    let obj: Phaser.GameObjects.GameObject & { body: Phaser.Physics.Arcade.Body };
    if (set.length) {
      const id = set[Phaser.Math.Between(0, set.length - 1)];
      const img = this.add.image(x, y, id).setDepth(-1);
      img.setDisplaySize(r * 2, r * 2);
      obj = img as any;
    } else {
      const rock = this.add.ellipse(x, y, r * 2, r * 1.6, 0x000000, 0.4).setDepth(-1);
      rock.setStrokeStyle(2, 0xffffff, 0.08);
      obj = rock as any;
    }
    this.physics.add.existing(obj, true);
    const cr = r * 0.8;
    (obj.body as unknown as Phaser.Physics.Arcade.StaticBody).setCircle(cr, r - cr, r - cr);
    this.obstacles.add(obj);
  }
```

- [ ] **Step 5: Scale the background speck cap to the larger world**

In `drawBackground` (line ~212), the speck cap was tuned for one screen. Change:

```typescript
    const specks = Math.min(600, Math.round((width * height) / 9000));
```

to:

```typescript
    const specks = Math.min(1800, Math.round((width * height) / 9000));
```

- [ ] **Step 6: Screen-anchor the ceremony banner and draft panel**

In `showZoneClearedBanner` (line ~426), append `.setScrollFactor(0)` to the text chain:

```typescript
    }).setOrigin(0.5).setDepth(40).setScale(0.4).setAlpha(0).setScrollFactor(0);
```

In `renderDraft` (line ~958), the panel positions children with viewport coords from `this.scale`, which is correct on screen only if the container ignores camera scroll. Change:

```typescript
    const panel = this.add.container(0, 0).setDepth(20);
```

to:

```typescript
    const panel = this.add.container(0, 0).setDepth(20).setScrollFactor(0);
```

- [ ] **Step 7: World-sized ceremony vacuum**

The end-of-run gem magnet must cover (and cross) a 3-screen world within the 3s ceremony. In `startCeremony` (line ~407), change:

```typescript
    this.stats.pickupRadius = Math.max(this.scale.width, this.scale.height);
```

to:

```typescript
    this.stats.pickupRadius = this.layout.width + this.layout.height;
```

Give `vacuumGems` a speed parameter (line ~376):

```typescript
  private vacuumGems(speed = 340) {
    (this.gems.getChildren() as any[]).forEach((g) => {
      const d = Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y);
      if (d < this.stats.pickupRadius * RUN_SCALE) {
        this.physics.moveToObject(g, this.player, speed * RUN_SCALE);
      } else {
        g.body.setVelocity(0, 0);
      }
    });
  }
```

and in `updateCeremony` (line ~414) call it fast enough to cross the world in the ceremony window:

```typescript
    this.vacuumGems(2400);
```

- [ ] **Step 8: Keep the transitional trickle spawner in-world**

`spawnEnemy` (line ~541) and `announceBoss` (line ~582) read `this.scale` for edge coordinates; until Task 6 deletes them, switch both to the world dims so nothing spawns outside the walls. In BOTH methods change:

```typescript
    const { width, height } = this.scale;
```

to:

```typescript
    const { width, height } = this.layout;
```

Likewise the two faucet drops in `update()` (lines ~318 and ~326) — change both `const { width, height } = this.scale;` occurrences inside the relic/resource cooldown blocks to `const { width, height } = this.layout;` (they are deleted entirely in Task 6).

- [ ] **Step 9: Build + full suite**

Run: `npm run build`
Expected: tsc clean, vite build succeeds.

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 10: Commit**

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(RC-034): 3x3-screen dungeon world - follow camera, perimeter walls, chokepoint terrain"
```

---

### Task 6: RunScene — placed enemies, sleep/wake, steering, clear-the-dungeon

**Files:**
- Modify: `src/scenes/RunScene.ts`

- [ ] **Step 1: Swap imports**

Remove from the imports:
- `runDurationForTier` (from `../game/config` — delete the whole import line; the scene no longer has a timer),
- `shouldSpawnBoss` and `BOSS_TELEGRAPH_MS` from the `../run/bossEvent` import (keep `bossFreeTable, bossJackpotGems, BOSS_HP_MULT`),
- `spawnTableAt` import line (escalation now happens in dungeonPopulate),
- `pickEnemy` from the `../run/expedition` import (keep `apexEnemyId`),
- `RESOURCES` from the `../game/types` import (keep `Resource` and the rest).

Add:

```typescript
import { enemyPlacements, gemPlacements, pickBiasedResource } from '../run/dungeonPopulate';
```

- [ ] **Step 2: Remove the timer/trickle fields**

Delete these fields (lines ~87–99) and their `init()` resets (lines ~125, ~129, ~144):
- `private runDurationMs = runDurationForTier(0);` and `this.runDurationMs = runDurationForTier(data.expedition.tier);`
- `private spawnCooldown = 0;` and `this.spawnCooldown = 0;` (in the `this.elapsed = 0; this.spawnCooldown = 0;` line — keep `this.elapsed = 0;`)
- `private bossSpawned = false;` and its `create()` reset `this.bossSpawned = false;`
- `private explorationCooldown = 0; private relicCooldown = 0; private resourceCooldown = 0;` and the init line `this.explorationCooldown = 0; this.relicCooldown = 0; this.resourceCooldown = 0;`

- [ ] **Step 3: Place the roster at the end of `create()`**

The RC-019 boss block at the end of `create()` (lines ~191–197) already computes `bossId` and `trickleBiome`. Immediately after it, append:

```typescript
    // RC-034: the whole roster is placed at generation — no trickle. Mobs sleep until aggro'd;
    // the apex mini-boss is pre-placed at the far end with its RC-019 stats, announced on aggro.
    const placeRng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
    for (const p of enemyPlacements(placeRng, this.layout, this.expedition.tier,
      this.trickleBiome, this.bossId, BIOMES, ENEMIES)) {
      const e = this.spawnEnemyAt(ENEMIES[p.id], p.x, p.y);
      e.setData('asleep', true);
      if (p.isBoss) {
        const maxHp = ENEMIES[p.id].baseHp * BOSS_HP_MULT;
        e.setData('hp', maxHp);
        e.setData('maxHp', maxHp);
        e.setData('isBoss', true);
        this.bossEnemy = e;
      }
    }
    for (const g of gemPlacements(placeRng, this.layout, this.expedition.tier, this.biome)) {
      this.dropGem(g.x, g.y, g.resource);
    }
```

(`seed` is in scope from Task 5's `create()` header. The xor just decorrelates layout and population streams.)

- [ ] **Step 4: Delete the trickle spawner, timed boss, and faucets from `update()`**

Remove these blocks from `update()`:
- the spawn block (lines ~290–297): `this.spawnCooldown -= dt; ... this.spawnCooldown = Math.max(150, 2000 / ramp);`
- the timed boss block (lines ~299–303): `if (shouldSpawnBoss(...)) { ... this.announceBoss(); }` — keep the `if (this.bossHp) {...}` HP-bar maintenance block that follows it.
- the exploration faucet block (lines ~309–313): `this.explorationCooldown -= dt; ...`
- the relic faucet block (lines ~315–321): `this.relicCooldown -= dt; ...`
- the resource deposit faucet block (lines ~323–329): `this.resourceCooldown -= dt; ...`

Also delete the now-orphaned methods `spawnEnemy()` (lines ~540–551), `announceBoss()` (lines ~579–603), and `spawnBoss()` (lines ~605–615).

- [ ] **Step 5: Sleep/wake gate in the enemy update loop**

Replace the movement loop in `update()` (lines ~331–333):

```typescript
    (this.enemies.getChildren() as any[]).forEach((e) => {
      this.updateEnemyMovement(e, dt);
    });
```

with:

```typescript
    (this.enemies.getChildren() as any[]).forEach((e) => {
      if (e.getData('asleep')) {
        const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
        if (d > AGGRO_RADIUS) { e.body.setVelocity(0, 0); return; }
        this.wakeEnemy(e);
      }
      this.updateEnemyMovement(e, dt);
    });
```

Add the wake helper next to `updateEnemyMovement`:

```typescript
  /** RC-034: rouse a sleeping mob (proximity or damage). Waking the boss runs its RC-019 arrival
   *  moment — banner + HP bar — repointed from the old timed telegraph to first contact. */
  private wakeEnemy(e: any) {
    if (!e.getData('asleep')) return;
    e.setData('asleep', false);
    if (e.getData('isBoss')) this.onBossAggro();
  }

  private onBossAggro() {
    playSfx('boss-arrival'); // RC-020
    const { width, height } = this.scale;
    const name = ENEMIES[this.bossId]?.name ?? 'Boss';
    const banner = this.add.text(width / 2, height * 0.22, `⚔ ${name} blocks your path`, {
      fontSize: '34px', color: '#ffdd55', stroke: '#000', strokeThickness: 5, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(60).setScrollFactor(0);
    this.tweens.add({ targets: banner, alpha: 0, y: banner.y - 20, delay: 1600, duration: 700, onComplete: () => banner.destroy() });
    this.createBossHpBar();
  }
```

- [ ] **Step 6: Damage wakes; chokepoint steering; sleeping mobs hold fire**

At the top of `applyDamageToEnemy` (line ~800), right after `if (!enemy.active) return;`, add:

```typescript
    this.wakeEnemy(enemy); // RC-034: getting shot wakes a sleeping mob (and announces the boss)
```

At the top of `updateEnemyMovement` (line ~650), before the behavior switch, add the chokepoint detour — when a barrier separates a mob from the player it beelines to the opening regardless of archetype (archetype steering resumes once it is through):

```typescript
    const waypoint = routeAround(e.x, e.y, this.player.x, this.player.y, this.layout.barriers);
    if (waypoint.x !== this.player.x || waypoint.y !== this.player.y) {
      this.physics.moveTo(e, waypoint.x, waypoint.y, e.getData('speed') as number);
      return;
    }
```

In `updateEnemyFire` (line ~707), after `const atk = ...; if (!atk) continue;`, add:

```typescript
      if (e.getData('asleep')) continue; // RC-034: sleeping mobs hold fire
```

- [ ] **Step 7: Clear-the-dungeon win condition + HUD**

Replace the HUD text + timer check at the bottom of `update()` (lines ~362–368):

```typescript
    this.hud.setText(
      `HP ${Math.ceil(this.stats.hp)}/${this.stats.maxHp}  Lv${this.stats.level}  ` +
      `🧭${this.collected.exploration} 🔬${this.collected.science} 🏭${this.collected.industry} 🎭${this.collected.culture}  ` +
      `⏱ ${Math.max(0, Math.ceil((this.runDurationMs - this.elapsed) / 1000))}s`,
    );

    if (this.elapsed >= this.runDurationMs) this.startCeremony();
```

with:

```typescript
    this.hud.setText(
      `HP ${Math.ceil(this.stats.hp)}/${this.stats.maxHp}  Lv${this.stats.level}  ` +
      `🧭${this.collected.exploration} 🔬${this.collected.science} 🏭${this.collected.industry} 🎭${this.collected.culture}  ` +
      `☠ ${this.enemies.countActive(true)} left`,
    );

    // RC-034: the dungeon is cleared when every placed enemy (and any splitter children) is dead.
    if (this.enemies.countActive(true) === 0) this.startCeremony();
```

- [ ] **Step 8: Delegate `biasedResource` to the pure module**

Replace the method body (lines ~750–759):

```typescript
  /** A resource id biased toward the biome's lean (but every resource can appear). */
  private biasedResource(): Resource {
    return pickBiasedResource(() => Math.random(), this.biome.resourceBias);
  }
```

- [ ] **Step 9: Build + full suite**

Run: `npm run build`
Expected: tsc clean (this catches every orphaned field/import from steps 1–2 — fix any leftover references it names).

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 10: Commit**

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(RC-034): clear-the-dungeon - placed roster, sleep/aggro, chokepoint steering, boss lair"
```

---

### Task 7: End-to-end verification, walkthrough, tracking

**Files:**
- Modify: `docs/BACKLOG.md` (RC-034 row status), `docs/tickets/RC-034-procedural-dungeon-expeditions.md` (acceptance checkboxes)

- [ ] **Step 1: Full suite + production build**

Run: `npm test` then `npm run build`
Expected: all green, build clean.

- [ ] **Step 2: Playwright walkthrough of the actual game**

Invoke the `verify-canvas-game-playwright` skill (house skill for exactly this) against `npm run dev`, and verify each item; where live-state sampling is needed, follow the skill's expose-to-window instrumentation pattern and revert it before commit:

1. Start a Stone-age expedition. The camera follows the hero; the HUD (HP/resources/`☠ N left`) stays pinned top-left while moving.
2. Walk west/north until blocked: visible perimeter wall, no tunneling.
3. Distant enemies are idle; approaching within roughly a screen wakes them; they pursue.
4. Find the river or wall chokepoint; confirm the hero cannot cross the band but can cross at the bridge/gateway; lure a waking enemy from the far side and confirm it routes to the opening rather than pinning against the band.
5. Pick up placed gems; trigger a level-up; the draft panel renders centered on screen (not in world space) and selection resumes play.
6. Approach the boss in the far east: banner + HP bar appear on aggro; kill it for the jackpot burst.
7. Clear all enemies: the `☠` counter hits 0, the Zone-Cleared ceremony fires, distant gems magnet in within the 3s window, and the run-end screen banks resources into the civ.
8. Die on purpose in a second run: the death path still ends the run and banks correctly.
9. Console shows the `[run] dungeon seed N` line and no errors.

Expected: every point observed. Fix and re-verify anything that fails before proceeding (use superpowers:systematic-debugging for any unexpected behavior).

- [ ] **Step 3: Update tracking**

In `docs/BACKLOG.md`, set the RC-034 row Status to `Delivered`. In the ticket file, check off the delivered acceptance criteria and add a `## Resolution` section noting: slices 1+2 shipped (core + generator + steering); slice 3 (minimap, fog of war, gate interaction) deferred — note it remains covered by the ticket's "Proposed slices" or spin a follow-up ticket if the playtest demands it.

- [ ] **Step 4: Commit**

```bash
git add docs/BACKLOG.md docs/tickets/RC-034-procedural-dungeon-expeditions.md
git commit -m "docs(RC-034): mark delivered - dungeon expeditions slices 1+2"
```

(The pre-commit hook re-renders tracking surfaces; the AI Assistant repo's `data/projects.yaml` will carry an uncommitted derived change — commit it there separately.)

---

## Self-review notes

- **Spec coverage vs ticket acceptance criteria:** larger world + camera (Task 5), perimeter walls (Task 5), placed enemies with aggro (Tasks 4, 6), clear-the-dungeon win + ceremony preserved (Task 6), two chokepoint kinds seeded + reproducible (Task 2), no pile-up at barriers (Task 3 + Task 6 step 6 + walkthrough item 4), HUD/draft/boss UI under scrolling camera (Tasks 5–6 + walkthrough items 1, 5, 6), suite green + generator determinism/connectivity tests (Tasks 1–4). Minimap/fog/gate-interaction: explicitly deferred (ticket slice 3).
- **Known simplifications (intentional, do not "fix" en route):** player bullets pass over water/walls (existing obstacle behavior); enemies are destroyed on player contact including the boss (existing RC-019-era kamikaze behavior); `shouldSpawnBoss`/`BOSS_TELEGRAPH_MS` remain exported+tested but unused by the scene.
- **Tuning knobs for the post-merge playtest:** `BASE_ENEMY_COUNT`/`ENEMIES_PER_TIER`, `AGGRO_RADIUS`, `DUNGEON_SCREENS_X/Y`, `GAP_WIDTH`, and the gem-bucket divisors in `gemPlacements`.
