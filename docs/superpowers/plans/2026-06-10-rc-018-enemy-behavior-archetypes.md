# RC-018 Enemy Behavior Archetypes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give enemies distinct movement archetypes (charger, splitter, circler, standoff) driven by a data field, so ages feel mechanically distinct and positioning matters.

**Architecture:** A new pure, Phaser-free module `src/run/enemyBehavior.ts` holds all motion geometry + feel constants + decision functions (mirrors `src/run/projectileMotion.ts`), unit-tested in isolation. `RunScene` becomes a thin renderer: its single chase loop becomes a `switch` on `EnemyDef.behavior` that calls the pure functions and applies the returned velocity, renders the charger telegraph, and spawns splitter children on death. Enemy assignments live in `src/run/enemyData.ts`. `behavior`/`split` are optional `EnemyDef` fields, so absent ⇒ today's chase and no save bump.

**Tech Stack:** TypeScript, Phaser 3 (Arcade physics), Vitest, Playwright. Build = `npm run build` (`tsc --noEmit && vite build`); tests = `npm test` (`vitest run`).

**Spec:** [docs/superpowers/specs/2026-06-10-rc-018-enemy-behavior-archetypes-design.md](../specs/2026-06-10-rc-018-enemy-behavior-archetypes-design.md)

---

## File Structure

- **Create** `src/run/enemyBehavior.ts` — pure logic: charger state machine, circler velocity, standoff velocity, feel constants. No Phaser import.
- **Create** `tests/enemyBehavior.test.ts` — Vitest unit tests for the above.
- **Modify** `src/game/types.ts` — add `behavior` + `split` to `EnemyDef`.
- **Modify** `src/run/enemyData.ts` — assign archetypes to thematic enemies.
- **Modify** `tests/enemyData.test.ts` — data-integrity tests for `behavior`/`split`.
- **Modify** `src/scenes/RunScene.ts` — `spawnEnemyAt` helper, movement dispatch, charger telegraph, splitter death-spawn.

---

## Task 1: Add `behavior` and `split` fields to `EnemyDef`

**Files:**
- Modify: `src/game/types.ts:83-96` (the `EnemyDef` interface)

- [ ] **Step 1: Add the fields**

In `src/game/types.ts`, inside `interface EnemyDef`, after the existing `attack?` line, add:

```ts
  // RC-018 — movement archetype, orthogonal to `attack` (firing). Absent ⇒ 'chase' (default).
  // 'charger' telegraphs then dashes; 'circler' orbits/strafes; 'standoff' holds firing distance.
  behavior?: 'chase' | 'charger' | 'splitter' | 'circler' | 'standoff';
  // 'splitter' only: on death, spawn `count` children of enemy id `into` (e.g. rock_golem → cave_dwellers).
  split?: { into: string; count: number };
```

- [ ] **Step 2: Verify the build still compiles**

Run: `npm run build`
Expected: PASS (no type errors; nothing references the new fields yet).

- [ ] **Step 3: Commit**

```bash
git add src/game/types.ts
git commit -m "feat(RC-018): add behavior + split fields to EnemyDef"
```

---

## Task 2: Charger state machine (pure)

**Files:**
- Create: `src/run/enemyBehavior.ts`
- Test: `tests/enemyBehavior.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/enemyBehavior.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/enemyBehavior.test.ts`
Expected: FAIL — `Cannot find module '../src/run/enemyBehavior'`.

- [ ] **Step 3: Write the charger implementation**

Create `src/run/enemyBehavior.ts`:

```ts
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
```

Note the `recover` case returns chase-speed velocity but does not re-enter `windup` until the timer
elapses — that is the cooldown. The test for "entering recover this frame yields 0" is satisfied by
the `dash`→`recover` transition branch returning `vx: 0`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/enemyBehavior.test.ts`
Expected: PASS (5 charger tests).

- [ ] **Step 5: Commit**

```bash
git add src/run/enemyBehavior.ts tests/enemyBehavior.test.ts
git commit -m "feat(RC-018): charger state machine (pure, unit-tested)"
```

---

## Task 3: Circler velocity (pure)

**Files:**
- Modify: `src/run/enemyBehavior.ts` (append)
- Test: `tests/enemyBehavior.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/enemyBehavior.test.ts`:

```ts
import { circlerVelocity, CIRCLER_RADIUS } from '../src/run/enemyBehavior';

describe('enemyBehavior — circler', () => {
  it('moves purely tangentially (perpendicular to the player vector) when on the band', () => {
    // enemy is CIRCLER_RADIUS to the right of the player → on band, no radial correction
    const v = circlerVelocity(100 + CIRCLER_RADIUS, 100, 100, 100, 1, 50);
    // outward radial is +x; velocity must be perpendicular to it (vx ≈ 0) and full speed
    expect(v.vx).toBeCloseTo(0);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(50);
  });

  it('reverses orbit sense with dir', () => {
    const cw = circlerVelocity(100 + CIRCLER_RADIUS, 100, 100, 100, 1, 50);
    const ccw = circlerVelocity(100 + CIRCLER_RADIUS, 100, 100, 100, -1, 50);
    expect(ccw.vy).toBeCloseTo(-cw.vy);
  });

  it('pushes outward when inside the band and inward when outside', () => {
    // inside: 40px right of player (< radius) → radial component points outward (+x)
    const inside = circlerVelocity(140, 100, 100, 100, 1, 50);
    expect(inside.vx).toBeGreaterThan(0);
    // outside: far right of player (> radius) → radial component points inward (−x)
    const outside = circlerVelocity(100 + CIRCLER_RADIUS + 200, 100, 100, 100, 1, 50);
    expect(outside.vx).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/enemyBehavior.test.ts`
Expected: FAIL — `circlerVelocity` / `CIRCLER_RADIUS` not exported.

- [ ] **Step 3: Implement circler**

Append to `src/run/enemyBehavior.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/enemyBehavior.test.ts`
Expected: PASS (charger + circler tests).

- [ ] **Step 5: Commit**

```bash
git add src/run/enemyBehavior.ts tests/enemyBehavior.test.ts
git commit -m "feat(RC-018): circler orbit velocity (pure, unit-tested)"
```

---

## Task 4: Standoff velocity (pure)

**Files:**
- Modify: `src/run/enemyBehavior.ts` (append)
- Test: `tests/enemyBehavior.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/enemyBehavior.test.ts`:

```ts
import { standoffVelocity, STANDOFF_MIN, STANDOFF_MAX } from '../src/run/enemyBehavior';

describe('enemyBehavior — standoff', () => {
  it('advances when farther than the max band', () => {
    const v = standoffVelocity(STANDOFF_MAX + 50, 1, 0, 60);
    expect(v.vx).toBeCloseTo(60); // toward the player
  });

  it('holds position inside the band', () => {
    const mid = (STANDOFF_MIN + STANDOFF_MAX) / 2;
    const v = standoffVelocity(mid, 1, 0, 60);
    expect(v.vx).toBe(0);
    expect(v.vy).toBe(0);
  });

  it('kites away when closer than the min band', () => {
    const v = standoffVelocity(STANDOFF_MIN - 50, 1, 0, 60);
    expect(v.vx).toBeCloseTo(-60); // away from the player
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/enemyBehavior.test.ts`
Expected: FAIL — `standoffVelocity` not exported.

- [ ] **Step 3: Implement standoff**

Append to `src/run/enemyBehavior.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/enemyBehavior.test.ts`
Expected: PASS (charger + circler + standoff tests).

- [ ] **Step 5: Commit**

```bash
git add src/run/enemyBehavior.ts tests/enemyBehavior.test.ts
git commit -m "feat(RC-018): standoff positioning velocity (pure, unit-tested)"
```

---

## Task 5: Assign archetypes in `enemyData.ts` + integrity tests

**Files:**
- Modify: `src/run/enemyData.ts` (specific enemy entries)
- Test: `tests/enemyData.test.ts` (append)

- [ ] **Step 1: Write the failing integrity tests**

Append to `tests/enemyData.test.ts` (inside the existing top-level `describe('enemyData', ...)` or as a new `describe` block at the end of the file — use a new block):

```ts
describe('enemyData — RC-018 behavior archetypes', () => {
  const ALLOWED = new Set(['chase', 'charger', 'splitter', 'circler', 'standoff', undefined]);

  it('every behavior is a known archetype (or absent ⇒ chase)', () => {
    for (const def of Object.values(ENEMIES)) {
      expect(ALLOWED.has(def.behavior as any), `${def.id}: ${def.behavior}`).toBe(true);
    }
  });

  it('at least three distinct non-chase archetypes are assigned', () => {
    const kinds = new Set(
      Object.values(ENEMIES).map((d) => d.behavior).filter((b) => b && b !== 'chase'),
    );
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });

  it('every splitter targets an existing, non-splitting enemy (no infinite split)', () => {
    for (const def of Object.values(ENEMIES)) {
      if (def.behavior !== 'splitter') continue;
      expect(def.split, `${def.id} is a splitter but has no split{}`).toBeDefined();
      const child = ENEMIES[def.split!.into];
      expect(child, `${def.id} splits into unknown ${def.split!.into}`).toBeDefined();
      expect(child.behavior === 'splitter').toBe(false);
      expect(def.split!.count).toBeGreaterThan(0);
    }
  });

  it('only splitters carry a split{} payload', () => {
    for (const def of Object.values(ENEMIES)) {
      if (def.split) expect(def.behavior).toBe('splitter');
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/enemyData.test.ts`
Expected: FAIL — "at least three distinct non-chase archetypes" (none assigned yet).

- [ ] **Step 3: Assign archetypes**

In `src/run/enemyData.ts`, add the `behavior` (and `split`) fields to exactly these entries. Make the
minimal edits shown — leave every other field unchanged:

- `rock_golem` — add `behavior: 'splitter', split: { into: 'cave_dweller', count: 2 },`
- `harpy` — add `behavior: 'circler',`
- `drone` — add `behavior: 'circler',`
- `centaur` — add `behavior: 'charger',`
- `halftrack` — add `behavior: 'charger',`
- `scholar` — add `behavior: 'standoff',`
- `musketeer` — add `behavior: 'standoff',`
- `rifleman` — add `behavior: 'standoff',`
- `grenadier` — add `behavior: 'standoff',`
- `gunship` — add `behavior: 'standoff',`
- `gargoyle` — add `behavior: 'standoff',`
- `dragon` — add `behavior: 'standoff',`

Example — `rock_golem` becomes:

```ts
  rock_golem: {
    id: 'rock_golem', name: 'Rock Golem', sprite: 'rock_golem',
    baseHp: 90, speed: 35, contactDamage: 14, drop: 'industry', xp: 9,
    displaySize: { w: 38, h: 40 }, armor: 1,
    behavior: 'splitter', split: { into: 'cave_dweller', count: 2 },
  },
```

Example — `harpy` becomes:

```ts
  harpy: { id: 'harpy', name: 'Harpy', sprite: 'harpy',
    baseHp: 40, speed: 115, contactDamage: 9, drop: 'culture', xp: 5, displaySize: { w: 34, h: 30 }, attack: 'ranged', behavior: 'circler' },
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/enemyData.test.ts`
Expected: PASS (existing enemyData tests + 4 new integrity tests).

- [ ] **Step 5: Commit**

```bash
git add src/run/enemyData.ts tests/enemyData.test.ts
git commit -m "feat(RC-018): assign charger/splitter/circler/standoff archetypes"
```

---

## Task 6: Wire behaviors into RunScene

This is integration glue (Phaser); the gate is `npm run build` + the existing test suite staying
green. Live behavior is verified in Task 7.

**Files:**
- Modify: `src/scenes/RunScene.ts` — imports, `spawnEnemy`/`spawnEnemyAt` refactor (~`:506-533`), movement dispatch (~`:299-301`), `applyDamageToEnemy` death branch (~`:671-676`).

- [ ] **Step 1: Add imports**

At the top of `src/scenes/RunScene.ts`, ensure `EnemyDef` is imported from `../game/types` (add it to
the existing type import if absent), and add the behavior module import near the `projectileMotion`
import:

```ts
import {
  ChargerState, ChargerPhase, initChargerState, chargerStep, CHARGER_CONFIG,
  circlerVelocity, CIRCLER_RADIUS, standoffVelocity, STANDOFF_MIN, STANDOFF_MAX,
} from '../run/enemyBehavior';
```

- [ ] **Step 2: Extract `spawnEnemyAt` and set behavior data**

Replace the body of `spawnEnemy()` (`src/scenes/RunScene.ts:506-533`) so it computes the edge
position and the def, then delegates to a new `spawnEnemyAt`. The new helper carries the original
setData block plus the behavior/split/state wiring:

```ts
  private spawnEnemy() {
    const { width, height } = this.scale;
    const edge = Phaser.Math.Between(0, 3);
    const x = edge === 0 ? 0 : edge === 1 ? width : Phaser.Math.Between(0, width);
    const y = edge === 2 ? 0 : edge === 3 ? height : Phaser.Math.Between(0, height);

    // RC-017: spawn mix escalates over the run — toward this age's tough enemies + next-age seeds.
    const progress = this.elapsed / this.runDurationMs;
    const table = spawnTableAt(this.biome, progress, BIOMES, ENEMIES);
    const def = ENEMIES[pickEnemy(table, () => Math.random())];
    this.spawnEnemyAt(def, x, y);
  }

  /** Create one enemy of `def` at (x,y) with all run-state data. Shared by edge spawns and
   *  RC-018 splitter death-spawns. */
  private spawnEnemyAt(def: EnemyDef, x: number, y: number) {
    const enemy = this.add.image(x, y, def.sprite) as any;
    enemy.setDisplaySize(def.displaySize.w * RUN_SCALE, def.displaySize.h * RUN_SCALE);
    this.physics.add.existing(enemy);
    this.enemies.add(enemy);
    enemy.setData('hp', def.baseHp);
    enemy.setData('drop', def.drop);
    enemy.setData('xp', def.xp);
    enemy.setData('speed', def.speed * RUN_SCALE);
    enemy.setData('contactDamage', def.contactDamage);
    enemy.setData('armor', def.armor ?? 0);
    enemy.setData('attack', def.attack);
    // RC-018 movement archetype + per-enemy mutable state.
    enemy.setData('behavior', def.behavior ?? 'chase');
    enemy.setData('split', def.split);
    if (def.behavior === 'charger') enemy.setData('chargerState', initChargerState());
    if (def.behavior === 'circler') enemy.setData('circlerDir', Phaser.Math.Between(0, 1) === 0 ? -1 : 1);
    // Stagger first shots so spawns don't volley in unison.
    enemy.setData('fireMs', Phaser.Math.Between(800, 2600));
    // Match the hitbox to the visible mob so you don't get stuck on enemies that look clear.
    this.shrinkBody(enemy, 0.72);
    return enemy;
  }
```

- [ ] **Step 3: Replace the chase loop with a behavior dispatch**

Replace the movement loop at `src/scenes/RunScene.ts:299-301`:

```ts
    (this.enemies.getChildren() as any[]).forEach((e) => {
      this.updateEnemyMovement(e, dt);
    });
```

Then add the dispatch method (place it next to `updateEnemyFire`):

```ts
  /** RC-018: per-frame movement by archetype. `chase`/default keeps the simple beeline; the
   *  others call the pure enemyBehavior functions and apply the returned velocity. */
  private updateEnemyMovement(e: any, dt: number) {
    const behavior = (e.getData('behavior') ?? 'chase') as string;
    const speed = e.getData('speed') as number;
    if (behavior === 'chase') { this.physics.moveToObject(e, this.player, speed); return; }

    const dx = this.player.x - e.x, dy = this.player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;

    if (behavior === 'charger') {
      const cfg = { ...CHARGER_CONFIG, trigger: CHARGER_CONFIG.trigger * RUN_SCALE };
      const prev = (e.getData('chargerState') as ChargerState) ?? initChargerState();
      const r = chargerStep(prev, dist, ux, uy, speed, dt, cfg);
      e.setData('chargerState', r.state);
      e.body.setVelocity(r.vx, r.vy);
      this.renderChargerTell(e, r.state.phase);
    } else if (behavior === 'circler') {
      const dir = (e.getData('circlerDir') as number) ?? 1;
      const r = circlerVelocity(e.x, e.y, this.player.x, this.player.y, dir, speed, CIRCLER_RADIUS * RUN_SCALE);
      e.body.setVelocity(r.vx, r.vy);
    } else if (behavior === 'standoff') {
      const r = standoffVelocity(dist, ux, uy, speed, STANDOFF_MIN * RUN_SCALE, STANDOFF_MAX * RUN_SCALE);
      e.body.setVelocity(r.vx, r.vy);
    } else {
      this.physics.moveToObject(e, this.player, speed);
    }
  }

  /** RC-018: charger telegraph. Renders only on phase changes — an amber scale-pulse during the
   *  windup so the dash is readable before it lands, cleared when the dash begins. */
  private renderChargerTell(e: any, phase: ChargerPhase) {
    if (e.getData('chargerPhase') === phase) return;
    e.setData('chargerPhase', phase);
    if (phase === 'windup') {
      e.setTint(0xffcc33);
      e.setData('baseScaleX', e.scaleX); e.setData('baseScaleY', e.scaleY); // restore point
      const tween = this.tweens.add({
        targets: e, scaleX: e.scaleX * 1.25, scaleY: e.scaleY * 1.25,
        duration: 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      e.setData('tellTween', tween);
    } else {
      this.stopChargerTell(e);
      e.clearTint();
    }
  }

  /** Stop a charger's telegraph tween (if any) and restore its base scale. Safe to call before the
   *  sprite is destroyed; do NOT call after destroy() (the data manager is gone). */
  private stopChargerTell(e: any) {
    const tween = e.getData('tellTween') as Phaser.Tweens.Tween | undefined;
    if (tween) { tween.stop(); e.setData('tellTween', undefined); }
    const bx = e.getData('baseScaleX'), by = e.getData('baseScaleY');
    if (typeof bx === 'number' && typeof by === 'number') e.setScale(bx, by);
  }
```

- [ ] **Step 4: Spawn splitter children on death**

In `applyDamageToEnemy`, in the death branch (`src/scenes/RunScene.ts:671`, right after
`const ex = enemy.x, ey = enemy.y;` and **before** `enemy.destroy();`), add. Both reads happen before
`destroy()` — a destroyed Phaser sprite's data manager is gone, so `getData` after `destroy()` throws:

```ts
      // RC-018: stop any charger telegraph tween before the sprite is freed.
      this.stopChargerTell(enemy);
      // RC-018: a splitter bursts into weaker children at its death position.
      const split = enemy.getData('split') as { into: string; count: number } | undefined;
      if (split && ENEMIES[split.into]) {
        for (let s = 0; s < split.count; s++) {
          const jx = ex + Phaser.Math.Between(-14, 14), jy = ey + Phaser.Math.Between(-14, 14);
          this.spawnEnemyAt(ENEMIES[split.into], jx, jy);
        }
      }
```

- [ ] **Step 5: Verify the build and full suite**

Run: `npm run build`
Expected: PASS (no type errors).

Run: `npm test`
Expected: PASS — all prior tests plus the new `enemyBehavior` + `enemyData` tests green.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(RC-018): dispatch enemy movement by archetype + charger tell + split spawn"
```

---

## Task 7: Live-verify each archetype (Playwright)

**REQUIRED SUB-SKILL:** Use `verify-canvas-game-playwright` for the instrumentation pattern (expose
the game to `window`, drive input, sample live state, revert instrumentation before any commit).

- [ ] **Step 1: Build and serve the game**

Run: `npm run build` then start the dev/preview server (e.g. `npm run dev`), and open the run scene
in a browser via Playwright.

- [ ] **Step 2: Verify each archetype visibly**

Confirm in a live run (Stone/Bronze first for splitter, later ages for charger/standoff/circler — or
temporarily force a biome whose spawn table includes the target enemies):
- **charger** (centaur/halftrack): approaches, *pauses with an amber scale-pulse*, then dashes; the
  dash holds its locked direction (sidestep during windup and it misses).
- **splitter** (rock_golem): on death, two cave_dwellers appear at the death spot and chase.
- **circler** (harpy/drone): orbits/strafes the player at a standoff radius instead of beelining,
  firing while it circles.
- **standoff** (musketeer/rifleman/etc.): advances to firing range then holds, plinking; closing the
  distance pushes it to kite away.

- [ ] **Step 3: Revert any instrumentation**

Ensure no `window` exposure or debug hooks remain in `RunScene.ts`. Run `git diff` to confirm the
working tree has only intended changes.

- [ ] **Step 4: Final verification**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 5: Update the ticket status**

Mark RC-018 acceptance criteria checked in `docs/tickets/RC-018-enemy-behavior-archetypes.md` and set
its status to Delivered (the pre-commit render hook will roll up BACKLOG/projects.yaml). Commit:

```bash
git add docs/tickets/RC-018-enemy-behavior-archetypes.md
git commit -m "docs(RC-018): mark enemy behavior archetypes delivered"
```

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1), pure module charger/circler/standoff (Tasks 2-4),
  assignment table (Task 5), RunScene dispatch + charger tell + splitter spawn (Task 6), unit tests
  (Tasks 2-5) + Playwright live-verify (Task 7). All spec sections mapped.
- **Type consistency:** `ChargerState`/`ChargerPhase`/`ChargerConfig`, `chargerStep`,
  `circlerVelocity`, `standoffVelocity`, `BehaviorVel`, `spawnEnemyAt`, `updateEnemyMovement`,
  `renderChargerTell` are named identically everywhere they appear.
- **Standoff kiting** is included per the approved spec (ranged back away inside `STANDOFF_MIN`).
- **No save bump:** `behavior`/`split` are optional `EnemyDef` fields; `CivState.version` untouched.
