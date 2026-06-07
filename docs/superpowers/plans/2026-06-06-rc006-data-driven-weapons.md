# RC-006 — Data-Driven Weapon System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `RunScene`'s hardcoded single-weapon firing with a data-driven, multi-weapon system (civ-gated draftable pool, per-weapon cooldowns, weapon level-ups, and a perk-paired evolution mechanic) — with no content regression (club + bronze spear still work).

**Architecture:** All weapon *logic* lives in pure, unit-tested modules — `src/run/weaponData.ts` (the `WeaponDef` catalog) and `src/run/weapons.ts` (slots, leveling, evolution eligibility, firing params, draft-option rolling). `RunScene` becomes a thin renderer that ticks each equipped weapon's cooldown and fires per its `WeaponDef`, and whose level-up draft renders a blend of weapon/level/perk/evolution options. This mirrors the existing `economy`/`tech`/`camp` pure-logic-vs-presentation split. Civ unlocks (`RunModifiers.weapons`) become the *draftable pool*; a run starts with only the base club equipped.

**Tech Stack:** TypeScript + Vite + Phaser 3 (run scene) + Vitest (unit tests) + Playwright (live canvas verification, via `verify-canvas-game-playwright`).

**Spec:** `docs/superpowers/specs/2026-06-06-iron-age-slice-design.md` §3a. **This plan is RC-006 only** — the first of four C3 tickets (RC-006 weapons → RC-007 enemy/biome/expedition systems → RC-008 Iron content → RC-009 juice/balance). Evolution *content* (bronze_spear→Iron Lance, Iron weapons) lands in RC-008; RC-006 ships the evolution *mechanism* and unit-tests it with a fixture.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/game/types.ts` | Add `WeaponDef` interface | Modify |
| `src/run/weaponData.ts` | The `WeaponDef` catalog (club, bronze_spear) | Create |
| `src/run/weapons.ts` | Pure logic: slots, equip/level/evolve, firing params, draft options | Create |
| `src/scenes/RunScene.ts` | Multi-weapon firing loop + draft-option rendering | Modify |
| `tests/weaponData.test.ts` | Catalog sanity | Create |
| `tests/weapons.test.ts` | All pure weapon logic | Create |

Unchanged: `src/run/modifiers.ts` (still computes the civ weapon set — now *interpreted* as the pool), `src/run/draft.ts` (`PERKS`/`applyPerk` reused), `tests/modifiers.test.ts` (still green — `m.weapons` is the pool).

---

## Task 1: `WeaponDef` type + weapon catalog

**Files:**
- Modify: `src/game/types.ts`
- Create: `src/run/weaponData.ts`
- Test: `tests/weaponData.test.ts`

- [ ] **Step 1: Add the `WeaponDef` interface to `src/game/types.ts`**

Add after the `RunBonus` interface (it references `AgeId`, already defined at the top of the file):

```ts
export interface WeaponDef {
  id: string;
  name: string;
  tier: AgeId;                 // for pool gating / display
  projectileSprite: string;    // art registry texture id (e.g. 'shot_club')
  cooldownMs: number;          // base time between volleys
  damage: number;              // base damage per projectile
  count: number;               // projectiles per volley
  spread: number;              // total fan angle (radians) across the volley when count > 1
  speed: number;               // projectile px/s
  behavior: 'straight' | 'pierce' | 'orbit' | 'cone' | 'lob';
  pierce?: number;             // distinct enemies a projectile passes through (behavior 'pierce')
  maxLevel: number;
  levelScaling: {              // per-level deltas applied (level - 1) times
    damage?: number;
    cooldownMs?: number;
    count?: number;
  };
  evolvesTo?: string;          // weapon id of the evolved form
  evolveRequiresPerk?: string; // perk id that, owned while this weapon is maxed, enables evolution
}
```

- [ ] **Step 2: Write the failing catalog test**

Create `tests/weaponData.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { WEAPONS } from '../src/run/weaponData';

describe('weaponData', () => {
  it('defines the base club and the bronze spear', () => {
    expect(WEAPONS.club).toBeDefined();
    expect(WEAPONS.bronze_spear).toBeDefined();
  });

  it('every weapon has a positive cooldown, damage, count, and maxLevel', () => {
    for (const def of Object.values(WEAPONS)) {
      expect(def.cooldownMs).toBeGreaterThan(0);
      expect(def.damage).toBeGreaterThan(0);
      expect(def.count).toBeGreaterThanOrEqual(1);
      expect(def.maxLevel).toBeGreaterThanOrEqual(1);
      expect(def.id).toBe(def.id); // id present
    }
  });

  it('the club projectile sprite matches the existing art id', () => {
    expect(WEAPONS.club.projectileSprite).toBe('shot_club');
    expect(WEAPONS.bronze_spear.projectileSprite).toBe('shot_bronze');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- weaponData`
Expected: FAIL — `Cannot find module '../src/run/weaponData'`.

- [ ] **Step 4: Create `src/run/weaponData.ts`**

```ts
import { WeaponDef } from '../game/types';

// The weapon catalog. Civ unlocks add weapon ids to a run's draftable pool;
// the player starts every run with only the base club equipped (see weapons.ts).
// Evolution content (evolvesTo / evolveRequiresPerk) is wired in RC-008.
export const WEAPONS: Record<string, WeaponDef> = {
  club: {
    id: 'club', name: 'Club', tier: 'stone',
    projectileSprite: 'shot_club',
    cooldownMs: 500, damage: 12, count: 1, spread: 0, speed: 420,
    behavior: 'straight',
    maxLevel: 5,
    levelScaling: { damage: 4, cooldownMs: -40 },
  },
  bronze_spear: {
    id: 'bronze_spear', name: 'Bronze Spear', tier: 'bronze',
    projectileSprite: 'shot_bronze',
    cooldownMs: 600, damage: 14, count: 2, spread: 0.25, speed: 460,
    behavior: 'pierce', pierce: 1,
    maxLevel: 5,
    levelScaling: { damage: 5, cooldownMs: -40 },
  },
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- weaponData`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/game/types.ts src/run/weaponData.ts tests/weaponData.test.ts
git commit -m "feat(weapons): WeaponDef type + club/bronze_spear catalog"
```

---

## Task 2: Slots — initial loadout, add, level

**Files:**
- Create: `src/run/weapons.ts`
- Test: `tests/weapons.test.ts`

- [ ] **Step 1: Write the failing slot tests**

Create `tests/weapons.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  MAX_WEAPON_SLOTS, initialWeapons, addWeapon, levelWeapon,
} from '../src/run/weapons';

describe('weapons — slots', () => {
  it('a run starts with only the base club at level 1', () => {
    expect(initialWeapons()).toEqual([{ id: 'club', level: 1 }]);
  });

  it('addWeapon appends a new weapon at level 1', () => {
    const out = addWeapon(initialWeapons(), 'bronze_spear');
    expect(out).toEqual([{ id: 'club', level: 1 }, { id: 'bronze_spear', level: 1 }]);
  });

  it('addWeapon is a no-op when the weapon is already equipped', () => {
    const eq = [{ id: 'club', level: 3 }];
    expect(addWeapon(eq, 'club')).toEqual(eq);
  });

  it('addWeapon is a no-op when all slots are full', () => {
    const full = Array.from({ length: MAX_WEAPON_SLOTS }, (_, i) => ({ id: `w${i}`, level: 1 }));
    expect(addWeapon(full, 'bronze_spear')).toEqual(full);
  });

  it('levelWeapon raises one weapon and caps at its maxLevel', () => {
    let eq = [{ id: 'club', level: 4 }];
    eq = levelWeapon(eq, 'club'); // 4 -> 5
    expect(eq).toEqual([{ id: 'club', level: 5 }]);
    eq = levelWeapon(eq, 'club'); // 5 -> capped at 5 (club maxLevel)
    expect(eq).toEqual([{ id: 'club', level: 5 }]);
  });

  it('levelWeapon never mutates its input', () => {
    const eq = [{ id: 'club', level: 1 }];
    levelWeapon(eq, 'club');
    expect(eq).toEqual([{ id: 'club', level: 1 }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- weapons`
Expected: FAIL — `Cannot find module '../src/run/weapons'`.

- [ ] **Step 3: Create `src/run/weapons.ts` with the slot logic**

```ts
import { WEAPONS } from './weaponData';

export const MAX_WEAPON_SLOTS = 4;

export interface EquippedWeapon {
  id: string;
  level: number;
}

/** Every run starts with the base club; civ unlocks are drafted in (see draftOptions). */
export function initialWeapons(): EquippedWeapon[] {
  return [{ id: 'club', level: 1 }];
}

/** Append a new weapon at level 1; no-op if already equipped or slots are full. */
export function addWeapon(equipped: EquippedWeapon[], id: string): EquippedWeapon[] {
  if (equipped.some((w) => w.id === id)) return equipped;
  if (equipped.length >= MAX_WEAPON_SLOTS) return equipped;
  return [...equipped, { id, level: 1 }];
}

/** Raise one equipped weapon by a level, capped at its def's maxLevel. Pure. */
export function levelWeapon(equipped: EquippedWeapon[], id: string): EquippedWeapon[] {
  return equipped.map((w) =>
    w.id === id ? { ...w, level: Math.min(w.level + 1, WEAPONS[id].maxLevel) } : w,
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- weapons`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/run/weapons.ts tests/weapons.test.ts
git commit -m "feat(weapons): equipped-slot logic (initial/add/level) with cap"
```

---

## Task 3: Evolution eligibility + apply

**Files:**
- Modify: `src/run/weapons.ts`
- Test: `tests/weapons.test.ts`

- [ ] **Step 1: Add the failing evolution tests**

Append to `tests/weapons.test.ts` (add the two new names to the existing import from `../src/run/weapons`):

```ts
import { evolutionFor, applyEvolve } from '../src/run/weapons';
import { WeaponDef } from '../src/game/types';

// A self-contained fixture so the test does not depend on RC-008 content.
const FIXTURE: Record<string, WeaponDef> = {
  spark: {
    id: 'spark', name: 'Spark', tier: 'stone', projectileSprite: 'x',
    cooldownMs: 500, damage: 5, count: 1, spread: 0, speed: 400, behavior: 'straight',
    maxLevel: 3, levelScaling: {}, evolvesTo: 'blaze', evolveRequiresPerk: 'sharpen',
  },
  blaze: {
    id: 'blaze', name: 'Blaze', tier: 'bronze', projectileSprite: 'x',
    cooldownMs: 400, damage: 12, count: 2, spread: 0.2, speed: 440, behavior: 'cone',
    maxLevel: 3, levelScaling: {},
  },
};

describe('weapons — evolution', () => {
  it('evolutionFor returns the evolved id when maxed and the perk is owned', () => {
    const r = evolutionFor({ id: 'spark', level: 3 }, ['sharpen'], FIXTURE);
    expect(r).toBe('blaze');
  });

  it('evolutionFor returns null when below max level', () => {
    expect(evolutionFor({ id: 'spark', level: 2 }, ['sharpen'], FIXTURE)).toBeNull();
  });

  it('evolutionFor returns null when the required perk is not owned', () => {
    expect(evolutionFor({ id: 'spark', level: 3 }, ['rapid'], FIXTURE)).toBeNull();
  });

  it('evolutionFor returns null for a weapon with no evolution', () => {
    expect(evolutionFor({ id: 'blaze', level: 3 }, ['sharpen'], FIXTURE)).toBeNull();
  });

  it('applyEvolve replaces the weapon with its evolved form at level 1', () => {
    const eq = [{ id: 'club', level: 2 }, { id: 'spark', level: 3 }];
    expect(applyEvolve(eq, 'spark', 'blaze')).toEqual([
      { id: 'club', level: 2 }, { id: 'blaze', level: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- weapons`
Expected: FAIL — `evolutionFor is not a function` / `applyEvolve is not a function`.

- [ ] **Step 3: Add the evolution logic to `src/run/weapons.ts`**

Add the import line at the top and the two functions at the end:

```ts
import { WeaponDef } from '../game/types';
```

```ts
/**
 * The evolved weapon id, if `weapon` is at its max level AND `ownedPerks` includes its
 * required perk; otherwise null. `defs` is injectable so tests use a fixture catalog.
 */
export function evolutionFor(
  weapon: EquippedWeapon,
  ownedPerks: string[],
  defs: Record<string, WeaponDef> = WEAPONS,
): string | null {
  const def = defs[weapon.id];
  if (!def?.evolvesTo || !def.evolveRequiresPerk) return null;
  if (weapon.level < def.maxLevel) return null;
  if (!ownedPerks.includes(def.evolveRequiresPerk)) return null;
  return def.evolvesTo;
}

/** Replace `fromId` with its evolved form `toId`, reset to level 1. Pure. */
export function applyEvolve(
  equipped: EquippedWeapon[], fromId: string, toId: string,
): EquippedWeapon[] {
  return equipped.map((w) => (w.id === fromId ? { id: toId, level: 1 } : w));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- weapons`
Expected: PASS (11 tests total in the file).

- [ ] **Step 5: Commit**

```bash
git add src/run/weapons.ts tests/weapons.test.ts
git commit -m "feat(weapons): perk-paired evolution eligibility + apply"
```

---

## Task 4: Firing parameters (`weaponShot`)

**Files:**
- Modify: `src/run/weapons.ts`
- Test: `tests/weapons.test.ts`

- [ ] **Step 1: Add the failing firing-params tests**

Append to `tests/weapons.test.ts` (add `weaponShot` and `WeaponShot` to the weapons import):

```ts
import { weaponShot } from '../src/run/weapons';
import { WEAPONS } from '../src/run/weaponData';

describe('weapons — weaponShot', () => {
  it('level 1 club returns its base numbers, scaled by damageMult', () => {
    const shot = weaponShot(WEAPONS.club, 1, 2.0);
    expect(shot.damage).toBe(24);      // 12 * 2.0
    expect(shot.count).toBe(1);
    expect(shot.cooldownMs).toBe(500);
    expect(shot.sprite).toBe('shot_club');
    expect(shot.pierce).toBe(0);
  });

  it('higher levels apply (level-1) steps of levelScaling', () => {
    const shot = weaponShot(WEAPONS.club, 3, 1.0); // 2 steps: +4 dmg, -40 cd each
    expect(shot.damage).toBe(20);      // 12 + 4*2
    expect(shot.cooldownMs).toBe(420); // 500 - 40*2
  });

  it('cooldown never drops below the 120ms floor', () => {
    const shot = weaponShot(WEAPONS.club, 5, 1.0); // 4 steps: 500 - 160 = 340 (above floor)
    expect(shot.cooldownMs).toBe(340);
  });

  it('carries pierce from the def', () => {
    const shot = weaponShot(WEAPONS.bronze_spear, 1, 1.0);
    expect(shot.pierce).toBe(1);
    expect(shot.count).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- weapons`
Expected: FAIL — `weaponShot is not a function`.

- [ ] **Step 3: Add `WeaponShot` + `weaponShot` to `src/run/weapons.ts`**

Add at the end:

```ts
export interface WeaponShot {
  sprite: string;
  damage: number;
  count: number;
  spread: number;
  speed: number;
  cooldownMs: number;
  behavior: WeaponDef['behavior'];
  pierce: number;
}

/** Resolve a weapon def at a given level into concrete per-volley firing numbers. Pure. */
export function weaponShot(def: WeaponDef, level: number, damageMult: number): WeaponShot {
  const steps = level - 1;
  const s = def.levelScaling;
  return {
    sprite: def.projectileSprite,
    damage: (def.damage + (s.damage ?? 0) * steps) * damageMult,
    count: def.count + (s.count ?? 0) * steps,
    spread: def.spread,
    speed: def.speed,
    cooldownMs: Math.max(120, def.cooldownMs + (s.cooldownMs ?? 0) * steps),
    behavior: def.behavior,
    pierce: def.pierce ?? 0,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- weapons`
Expected: PASS (15 tests total in the file).

- [ ] **Step 5: Commit**

```bash
git add src/run/weapons.ts tests/weapons.test.ts
git commit -m "feat(weapons): weaponShot resolves def+level into firing numbers"
```

---

## Task 5: Draft options (`draftOptions` + `rollRunDraft`)

**Files:**
- Modify: `src/run/weapons.ts`
- Test: `tests/weapons.test.ts`

- [ ] **Step 1: Add the failing draft tests**

Append to `tests/weapons.test.ts` (add `draftOptions`, `rollRunDraft`, `DraftContext` to the weapons import):

```ts
import { draftOptions, rollRunDraft } from '../src/run/weapons';

function stubRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('weapons — draft options', () => {
  it('offers a new weapon from the pool, a club level-up, and perks', () => {
    const opts = draftOptions({
      equipped: [{ id: 'club', level: 1 }],
      ownedPerks: [],
      pool: ['club', 'bronze_spear'],
    });
    expect(opts).toContainEqual({ kind: 'newWeapon', weaponId: 'bronze_spear' });
    expect(opts).toContainEqual({ kind: 'levelWeapon', weaponId: 'club' });
    expect(opts.some((o) => o.kind === 'perk')).toBe(true);
    // club is already equipped, so it is never offered as a NEW weapon
    expect(opts).not.toContainEqual({ kind: 'newWeapon', weaponId: 'club' });
  });

  it('does not offer a level-up for a maxed weapon', () => {
    const opts = draftOptions({
      equipped: [{ id: 'club', level: 5 }], // club maxLevel is 5
      ownedPerks: [],
      pool: ['club'],
    });
    expect(opts).not.toContainEqual({ kind: 'levelWeapon', weaponId: 'club' });
  });

  it('does not offer new weapons when all slots are full', () => {
    const full = [
      { id: 'club', level: 1 }, { id: 'bronze_spear', level: 1 },
      { id: 'a', level: 1 }, { id: 'b', level: 1 },
    ];
    const opts = draftOptions({ equipped: full, ownedPerks: [], pool: ['club', 'bronze_spear', 'c'] });
    expect(opts.some((o) => o.kind === 'newWeapon')).toBe(false);
  });

  it('rollRunDraft returns distinct options up to the requested count', () => {
    const picks = rollRunDraft(stubRng([0, 0, 0]), 3, {
      equipped: [{ id: 'club', level: 1 }],
      ownedPerks: [],
      pool: ['club', 'bronze_spear'],
    });
    expect(picks).toHaveLength(3);
    expect(new Set(picks.map((p) => JSON.stringify(p))).size).toBe(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- weapons`
Expected: FAIL — `draftOptions is not a function`.

- [ ] **Step 3: Add the draft logic to `src/run/weapons.ts`**

Add the imports at the top (alongside the existing ones) and the code at the end:

```ts
import { Perk } from '../game/types';
import { PERKS } from './draft';
```

```ts
export type DraftOption =
  | { kind: 'perk'; perk: Perk }
  | { kind: 'newWeapon'; weaponId: string }
  | { kind: 'levelWeapon'; weaponId: string }
  | { kind: 'evolve'; fromId: string; toId: string };

export interface DraftContext {
  equipped: EquippedWeapon[];
  ownedPerks: string[];
  pool: string[]; // civ-unlocked weapon ids (RunModifiers.weapons)
}

/** All currently-valid draft options, in priority order (evolutions first). */
export function draftOptions(ctx: DraftContext): DraftOption[] {
  const opts: DraftOption[] = [];

  for (const w of ctx.equipped) {
    const to = evolutionFor(w, ctx.ownedPerks);
    if (to) opts.push({ kind: 'evolve', fromId: w.id, toId: to });
  }
  if (ctx.equipped.length < MAX_WEAPON_SLOTS) {
    for (const id of ctx.pool) {
      if (!ctx.equipped.some((w) => w.id === id)) opts.push({ kind: 'newWeapon', weaponId: id });
    }
  }
  for (const w of ctx.equipped) {
    if (w.level < WEAPONS[w.id].maxLevel) opts.push({ kind: 'levelWeapon', weaponId: w.id });
  }
  for (const p of PERKS) opts.push({ kind: 'perk', perk: p });

  return opts;
}

/** Pick `count` distinct options at random (no replacement) — same shape as draft.rollDraft. */
export function rollRunDraft(rng: () => number, count: number, ctx: DraftContext): DraftOption[] {
  const pool = draftOptions(ctx);
  const out: DraftOption[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length) % pool.length;
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- weapons`
Expected: PASS (19 tests total in the file).

- [ ] **Step 5: Run the FULL suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS — all prior tests (50) plus the new weaponData (3) + weapons (19).

- [ ] **Step 6: Commit**

```bash
git add src/run/weapons.ts tests/weapons.test.ts
git commit -m "feat(weapons): blended draft options (weapon/level/perk/evolve) + roller"
```

---

## Task 6: RunScene — multi-weapon firing loop

**Files:**
- Modify: `src/scenes/RunScene.ts`

No unit test (Phaser scene). Verified by `npm run build` here and Playwright in Task 8.

- [ ] **Step 1: Update imports and scene fields**

Replace the weapon-related import line and add the new state fields.

Change the import block (top of file) to add the weapon modules:

```ts
import { rollRunDraft, applyPerk as _unusedApplyPerk } from '../run/draft'; // see below
```

Actually keep `draft` import as-is and ADD a new import line:

```ts
import {
  EquippedWeapon, initialWeapons, addWeapon, levelWeapon, applyEvolve,
  weaponShot, rollRunDraft, DraftOption,
} from '../run/weapons';
import { WEAPONS } from '../run/weaponData';
```

Keep the existing `import { rollDraft, applyPerk } from '../run/draft';` line but remove `rollDraft` (now unused):

```ts
import { applyPerk } from '../run/draft';
```

Add these fields near the other private fields (replace the `private fireCooldown = 0;` line):

```ts
private equipped: EquippedWeapon[] = initialWeapons();
private ownedPerks: string[] = [];
private weaponCooldowns: Record<string, number> = {};
```

- [ ] **Step 2: Reset weapon state in `init()`**

In `init()`, replace `this.elapsed = 0; this.fireCooldown = 0; this.spawnCooldown = 0;` with:

```ts
this.elapsed = 0; this.spawnCooldown = 0;
this.equipped = initialWeapons();
this.ownedPerks = [];
this.weaponCooldowns = {};
```

- [ ] **Step 3: Replace the single-weapon fire block in `update()`**

Remove this block:

```ts
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      this.fire();
      this.fireCooldown = 500 / this.stats.fireRateMult;
    }
```

Replace with a per-weapon loop:

```ts
    for (const w of this.equipped) {
      this.weaponCooldowns[w.id] = (this.weaponCooldowns[w.id] ?? 0) - dt;
      if (this.weaponCooldowns[w.id] <= 0) {
        const shot = weaponShot(WEAPONS[w.id], w.level, this.stats.damageMult);
        this.fireWeapon(shot);
        this.weaponCooldowns[w.id] = shot.cooldownMs / this.stats.fireRateMult;
      }
    }
```

- [ ] **Step 4: Replace `fire()` with `fireWeapon(shot)`**

Delete the entire existing `private fire() { ... }` method and replace with:

```ts
  private fireWeapon(shot: import('../run/weapons').WeaponShot) {
    const target = this.nearestEnemy() as any;
    const baseAngle = target
      ? Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y)
      : -Math.PI / 2;
    for (let i = 0; i < shot.count; i++) {
      // fan the volley around the aim angle when there is more than one projectile
      const offset = shot.count > 1
        ? (i - (shot.count - 1) / 2) * (shot.spread / (shot.count - 1))
        : 0;
      const angle = baseAngle + offset;
      const bullet = this.add.image(this.player.x, this.player.y, shot.sprite) as any;
      bullet.setDisplaySize(12, 12);
      this.physics.add.existing(bullet);
      this.bullets.add(bullet);
      bullet.setData('damage', shot.damage);
      bullet.setData('pierce', shot.pierce);
      bullet.body.setVelocity(Math.cos(angle) * shot.speed, Math.sin(angle) * shot.speed);
      this.time.delayedCall(1200, () => bullet.destroy());
    }
  }
```

- [ ] **Step 5: Update `hitEnemy()` to honor pierce (and never double-hit one enemy)**

Replace the body of `hitEnemy` with:

```ts
  private hitEnemy(bullet: any, enemy: any) {
    if (!bullet.active || !enemy.active) return;
    // A piercing bullet stays alive; make sure it never hits the SAME enemy twice.
    let hitSet = bullet.getData('hitSet') as Set<any> | undefined;
    if (!hitSet) { hitSet = new Set(); bullet.setData('hitSet', hitSet); }
    if (hitSet.has(enemy)) return;
    hitSet.add(enemy);

    const damage = bullet.getData('damage');
    const pierce = bullet.getData('pierce') ?? 0;
    if (pierce > 0) {
      bullet.setData('pierce', pierce - 1);
    } else {
      bullet.destroy();
    }

    const hp = enemy.getData('hp') - damage;
    if (hp <= 0) {
      this.dropGem(enemy.x, enemy.y, enemy.getData('drop'));
      enemy.destroy();
      this.gainXp(3);
    } else {
      enemy.setData('hp', hp);
    }
  }
```

- [ ] **Step 6: Build to confirm it compiles**

Run: `npm run build`
Expected: PASS (no TypeScript errors). If `applyEvolve`/`addWeapon`/`levelWeapon`/`rollRunDraft`/`DraftOption` report as unused, that is expected until Task 7 — proceed to Task 7 before judging unused-import errors. If the build blocks on unused imports, complete Task 7 first, then build.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/RunScene.ts
git commit -m "refactor(run): data-driven multi-weapon firing loop with pierce"
```

---

## Task 7: RunScene — blended level-up draft

**Files:**
- Modify: `src/scenes/RunScene.ts`

- [ ] **Step 1: Rewrite `openDraft()` to roll blended options**

Replace the existing `openDraft()` method with:

```ts
  private openDraft() {
    this.paused = true;
    this.physics.pause();
    const picks = rollRunDraft(() => Math.random(), this.mods.draftChoices, {
      equipped: this.equipped,
      ownedPerks: this.ownedPerks,
      pool: this.mods.weapons,
    });
    const { width, height } = this.scale;
    const panel = this.add.container(0, 0).setDepth(20);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    panel.add(bg);
    const title = this.add.text(width / 2, height / 2 - 120, 'Level up — choose one',
      { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
    panel.add(title);
    picks.forEach((opt, i) => {
      const y = height / 2 - 50 + i * 56;
      const card = this.add.rectangle(width / 2, y, 380, 48, 0x238636)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(width / 2, y, this.draftLabel(opt),
        { fontSize: '15px', color: '#fff' }).setOrigin(0.5);
      card.on('pointerdown', () => {
        this.applyDraftOption(opt);
        panel.destroy();
        this.paused = false;
        this.physics.resume();
      });
      panel.add(card); panel.add(label);
    });
  }
```

- [ ] **Step 2: Add the `draftLabel()` and `applyDraftOption()` helpers**

Add directly after `openDraft()`:

```ts
  private draftLabel(o: DraftOption): string {
    switch (o.kind) {
      case 'perk': return `${o.perk.name} — ${o.perk.desc}`;
      case 'newWeapon': return `New weapon: ${WEAPONS[o.weaponId].name}`;
      case 'levelWeapon': return `Upgrade: ${WEAPONS[o.weaponId].name}`;
      case 'evolve': return `Evolve: ${WEAPONS[o.fromId].name} → ${WEAPONS[o.toId].name}`;
    }
  }

  private applyDraftOption(o: DraftOption) {
    switch (o.kind) {
      case 'perk':
        this.stats = applyPerk(this.stats, o.perk);
        this.ownedPerks.push(o.perk.id);
        break;
      case 'newWeapon':
        this.equipped = addWeapon(this.equipped, o.weaponId);
        break;
      case 'levelWeapon':
        this.equipped = levelWeapon(this.equipped, o.weaponId);
        break;
      case 'evolve':
        this.equipped = applyEvolve(this.equipped, o.fromId, o.toId);
        break;
    }
  }
```

- [ ] **Step 3: Build to confirm it compiles with no unused imports**

Run: `npm run build`
Expected: PASS — every imported weapon symbol is now used.

- [ ] **Step 4: Run the full unit suite (should be untouched but confirm)**

Run: `npm test`
Expected: PASS (72 tests: 50 prior + 3 weaponData + 19 weapons).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(run): blended level-up draft (weapon/level/perk/evolve)"
```

---

## Task 8: Live verification (Playwright) + close-out

**Files:** none (verification only). Use the `verify-canvas-game-playwright` skill.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (note the local URL, typically `http://localhost:5173`).

- [ ] **Step 2: Drive a run and verify multi-weapon firing + the new draft**

Using Playwright (per `verify-canvas-game-playwright`: expose `window.__game`, drive WASD, click canvas cards with trusted events), confirm in a live run:
- Bullets fire from the club on its own cooldown and damage/kill enemies (no NaN-HP regression — enemies die, gems drop, XP rises).
- On level-up, the draft panel renders a **mix** of option kinds (at minimum perks + a club "Upgrade"; with a Forge built, a "New weapon: Bronze Spear" card appears).
- Picking "New weapon: Bronze Spear" makes a **second** projectile type start firing on its own cadence (two weapons firing simultaneously).
- Picking "Upgrade" on a weapon visibly increases its rate/damage.

Expected: all four observations hold. If any fails, treat as a `systematic-debugging` session before proceeding.

- [ ] **Step 3: Verify the no-Forge path still works**

With a fresh save (no Forge), confirm a run still plays with just the club and the draft offers club upgrades + perks (no weapon cards beyond what the pool allows).

- [ ] **Step 4: Revert any instrumentation**

Remove any `window.__game` exposure or debug hooks added for verification. Confirm `git diff` shows only intended changes.

Run: `git status` and `git diff --stat`
Expected: no stray instrumentation files; only the planned source changes are present (and already committed).

- [ ] **Step 5: Final build + full suite**

Run: `npm run build && npm test`
Expected: build clean; all 72 tests pass.

- [ ] **Step 6: Update trackers and close RC-006**

- Mark RC-006 `Delivered` in `docs/BACKLOG.md` (Active table).
- Note completion in `MEMORY.md` (weapon system now data-driven; pool semantics; evolution mechanism present, content pending RC-008).
- Commit (the pre-commit hook renders ticket Status headers + projects.yaml):

```bash
git add docs/BACKLOG.md MEMORY.md docs/tickets/
git commit -m "docs: close RC-006 (data-driven weapon system)"
```

---

## Self-Review (completed by author)

**Spec coverage (§3a):** ✓ `WeaponDef` + catalog (Task 1) · ✓ 4-slot cap (Task 2, `MAX_WEAPON_SLOTS`) · ✓ civ-gated pool, start-with-club (Task 2 `initialWeapons` + Task 5 `draftOptions` reading `ctx.pool`) · ✓ multi-weapon per-cooldown firing (Task 6) · ✓ draft offers weapon/level/perk (Task 5 + Task 7) · ✓ perk-paired evolution mechanism (Task 3) — *content deferred to RC-008 by design*. The `RunModifiers.weapons` "interpretation shift" (active → pool) is handled in RunScene (Tasks 6–7); `modifiers.ts` and its test are intentionally unchanged.

**Placeholder scan:** No TBD/TODO; every code step shows complete code; test bodies are concrete with expected values computed from the spec'd formulas (e.g., club L3 damage = 12 + 4×2 = 20), not copied from output.

**Type consistency:** `EquippedWeapon {id,level}`, `WeaponShot`, `DraftOption`, `DraftContext {equipped,ownedPerks,pool}` are used identically across tasks; `weaponShot(def,level,damageMult)`, `evolutionFor(weapon,ownedPerks,defs?)`, `rollRunDraft(rng,count,ctx)` signatures match between definition and call sites (RunScene). The behavior union `'straight'|'pierce'|'orbit'|'cone'|'lob'` is identical in Task 1 (`WeaponDef`) and Task 4 (`WeaponShot.behavior` reuses `WeaponDef['behavior']`).

**Out-of-scope guardrail:** No new content weapons/enemies/biomes (those are RC-007/008); evolution wired but dormant; balance numbers are reasonable placeholders to be tuned in RC-009.
