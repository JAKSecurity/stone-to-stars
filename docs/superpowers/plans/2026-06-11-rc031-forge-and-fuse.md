# RC-031 Forge & Fuse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stat-ladder weapon/perk loop with the Forge & Fuse build system: 10 verb archetypes, chain weapon fusion (2 slots), tradeoff passives (2 slots + rare fusion), a pre-run Expedition Kit, a tech-unlocked right-click active item, and per-archetype VFX identity.

**Architecture:** All new game logic is pure and Phaser-free under `src/run/` (`archetypes.ts`, `fusion.ts`, `passives.ts`, `actives.ts`, additions to `projectileMotion.ts`, rewritten `draft.ts`/`weapons.ts`/`weaponData.ts`), unit-tested with fixture catalogs. `RunScene` stays a renderer: it dispatches on resolved `trajectory`/`onHit` instead of the old 5-value `behavior` enum. DOM screens (`expeditionScreen.ts`) gain the Kit picker. Save bumps to v4, **reset on bump** (no migration — Jeff 2026-06-11).

**Tech Stack:** TypeScript, Phaser 3 (Arcade), Vitest, Playwright. Build = `npm run build` (`tsc --noEmit && vite build`); tests = `npm test` (vitest run).

**Spec:** [docs/superpowers/specs/2026-06-11-rc-031-weapon-fusion-design.md](../specs/2026-06-11-rc-031-weapon-fusion-design.md)

**Branch note:** work continues on the current worktree branch `claude/wonderful-wiles-fbbf4c`.

---

## Phase map

- **Phase 1 — Pure engine (Tasks 1–7):** types, archetype presets, fusion, catalog flip, passives, draft v2, actives. Game compiles and plays after every task.
- **Phase 2 — Run integration (Tasks 8–13):** new trajectories/on-hits in RunScene, draft overlay v2 + fusion celebration, active item, catalysts, VFX kits + juice.
- **Phase 3 — Meta & E2E (Tasks 14–17):** CivState v4 + reset gate, Expedition Kit UI, cleanup sweep, Playwright walkthrough.

## File structure

- **Create** `src/run/archetypes.ts` — archetype presets (trajectory + default onHit), `MAX_LEVEL_BY_AGE`, shape resolution.
- **Create** `src/run/fusion.ts` — fusion eligibility, stat derivation, trajectory precedence, onHit union, naming tables.
- **Create** `src/run/passives.ts` + `src/run/passiveData.ts` — tradeoff passives, 2 slots, stat recompute, passive fusion.
- **Create** `src/run/actives.ts` + `src/run/activeData.ts` — active item defs + charge logic.
- **Create** `src/run/vfxKits.ts` — per-archetype VFX kit data + hybrid kit merge.
- **Rewrite** `src/run/weaponData.ts` — 26 base weapons (evolved forms deleted), archetype field, age-scaled maxLevel.
- **Rewrite** `src/run/weapons.ts` — no melee/ranged classes, no evolution; slot/swap/level helpers + `weaponShot` v2.
- **Rewrite** `src/run/draft.ts` — DraftOption v2 generator (fusion-first, weighted), replaces PERKS.
- **Modify** `src/game/types.ts`, `src/run/projectileMotion.ts`, `src/run/modifiers.ts`, `src/tech/techData.ts`, `src/run/bossEvent.ts`, `src/scenes/RunScene.ts`, `src/ui/expeditionScreen.ts`, `src/main.ts`, `src/state/civState.ts`, `src/state/saveLoad.ts`, `src/game/config.ts`.
- **Tests:** new `tests/archetypes.test.ts`, `tests/fusion.test.ts`, `tests/passives.test.ts`, `tests/actives.test.ts`, `tests/draft2.test.ts`; updates to `tests/weapons.test.ts`, `tests/weaponData.test.ts`, `tests/projectileMotion.test.ts`, `tests/modifiers.test.ts`, `tests/civState.test.ts`/save tests.

## Shared contracts (referenced by every task — defined in Task 1/2, do not drift)

```ts
// types.ts
export type ArchetypeId =
  | 'bolt' | 'piercer' | 'spread' | 'orbiter' | 'lobber'
  | 'trail' | 'zone' | 'chain' | 'boomerang' | 'homing';
export type Trajectory = 'straight' | 'lob' | 'orbit' | 'boomerang' | 'trail' | 'homing';
export interface OnHit {
  pierce?: number;      // enemies a projectile passes through
  explode?: number;     // blast radius (px) at impact/landing
  chain?: number;       // extra hops to nearby enemies after first hit
  zoneMs?: number;      // lingering damage field duration at the landing point
  slowPct?: number;     // 0..1 move-speed cut applied to hit enemies for SLOW_MS
  ignoreArmor?: boolean;
}
// weapons.ts
export interface EquippedWeapon { id: string; level: number; hybrid?: WeaponDef }
// fusion.ts
export const FUSION_PREMIUM = 1.15;
export const MAX_BASES = 3;
// draft.ts (v2)
export type DraftOption =
  | { kind: 'fuseWeapons'; early: boolean }
  | { kind: 'fusePassives' }
  | { kind: 'newWeapon'; weaponId: string; replaceId?: string }
  | { kind: 'levelWeapon'; weaponId: string }
  | { kind: 'newPassive'; passiveId: string }
  | { kind: 'levelPassive'; passiveId: string };
```

---

## Task 1: Types v2 — archetype/trajectory/onHit fields (transitional)

**Files:**
- Modify: `src/game/types.ts` (the `WeaponDef` interface, `RunBonus`, `CivState`, `RunModifiers`, `RunStats`)

The old `behavior`/`pierce`/`evolvesTo` fields stay for now (deleted in Task 4); new fields are optional so everything keeps compiling.

- [ ] **Step 1: Add the new types and fields**

In `src/game/types.ts`, immediately above `interface WeaponDef`, add:

```ts
// RC-031 — Forge & Fuse. A weapon's verb. Archetype presets (src/run/archetypes.ts) give each
// archetype a trajectory + default on-hit; hybrids union their parents' shapes.
export type ArchetypeId =
  | 'bolt' | 'piercer' | 'spread' | 'orbiter' | 'lobber'
  | 'trail' | 'zone' | 'chain' | 'boomerang' | 'homing';
export type Trajectory = 'straight' | 'lob' | 'orbit' | 'boomerang' | 'trail' | 'homing';
export interface OnHit {
  pierce?: number;      // enemies a projectile passes through
  explode?: number;     // blast radius (px) at impact/landing
  chain?: number;       // extra hops to nearby enemies after the first hit
  zoneMs?: number;      // lingering damage-field duration (ms) at the landing point
  slowPct?: number;     // 0..1 move-speed cut applied to hit enemies for SLOW_MS
  ignoreArmor?: boolean;
}
```

Inside `interface WeaponDef`, after `behavior`/`pierce`, add:

```ts
  // RC-031 transitional — set on every catalog weapon in Task 4, after which `behavior`,
  // `pierce`, `pierceArmor`, `evolvesTo`, `evolveRequiresPerk` are deleted.
  archetype?: ArchetypeId;
  onHit?: OnHit;          // overrides/extends the archetype preset's default on-hit
  trajectory?: Trajectory;// only set explicitly on hybrids (base weapons resolve via preset)
  bases?: ArchetypeId[];  // constituent archetypes — hybrids carry 2-3, base weapons 1 (implied)
```

In `interface RunBonus`, after `weapons?`, add:

```ts
  actives?: string[];   // active-item ids granted (RC-031: net / poison_gas / grenade_volley)
```

In `interface CivState`, after `biomeBests?`, add:

```ts
  kit?: string[];       // RC-031 Expedition Kit: up to 4 unlocked weapon ids draftable this run
  activeItem?: string;  // RC-031: chosen right-click active id (must be tech-unlocked)
```

In `interface RunModifiers`, after `startWeapon?`, add:

```ts
  actives: string[];    // tech-unlocked active-item ids
  activeItem?: string;  // the one chosen pre-run (validated against `actives`)
```

In `interface RunStats`, after `pickupRadius`, add:

```ts
  regenHps: number;     // RC-031 passives: HP regenerated per second (0 = none)
  xpMult: number;       // RC-031 passives: 1.0 = no change
  activeCharges: number;// RC-031: right-click uses remaining this run
```

- [ ] **Step 2: Fix the two bare `RunStats`/`RunModifiers` literals**

`tsc` will now fail where `RunStats`/`RunModifiers` objects are built without the new fields:
- `src/run/runStats.ts` — in the function that builds the initial `RunStats`, add `regenHps: 0, xpMult: 1, activeCharges: 0` (it will pick up real values in Tasks 7/11).
- `src/run/modifiers.ts` — in the `return` of `computeRunModifiers`, add `actives: [], activeItem: undefined` (real collection lands in Task 7).
- `src/scenes/RunScene.ts:70` — the fallback `RunModifiers` literal: add `actives: []`.
- Run `npm run build` and fix any further missing-field literals the compiler lists (tests fixtures included — `npm test` will name them).

- [ ] **Step 3: Verify build + tests green**

Run: `npm run build && npm test`
Expected: PASS (no behavior change anywhere — fields are additive).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(RC-031): add archetype/onHit/kit/active type fields (transitional)"
```

---

## Task 2: Archetype presets + age-scaled max levels (pure)

**Files:**
- Create: `src/run/archetypes.ts`
- Test: `tests/archetypes.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/archetypes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  ARCHETYPES, MAX_LEVEL_BY_AGE, resolveShape, ARCHETYPE_IDS,
} from '../src/run/archetypes';
import { WeaponDef } from '../src/game/types';

const base = (over: Partial<WeaponDef>): WeaponDef => ({
  id: 'x', name: 'X', tier: 'iron', projectileSprite: 's',
  cooldownMs: 500, damage: 10, count: 1, spread: 0, speed: 400,
  behavior: 'straight', maxLevel: 3, levelScaling: {}, ...over,
});

describe('archetypes', () => {
  it('defines a preset for all 10 archetypes', () => {
    expect(ARCHETYPE_IDS).toHaveLength(10);
    for (const id of ARCHETYPE_IDS) expect(ARCHETYPES[id]).toBeDefined();
  });

  it('age-scaled max levels: early shallow, late deep', () => {
    expect(MAX_LEVEL_BY_AGE.stone).toBe(2);
    expect(MAX_LEVEL_BY_AGE.bronze).toBe(2);
    expect(MAX_LEVEL_BY_AGE.iron).toBe(3);
    expect(MAX_LEVEL_BY_AGE.classical).toBe(3);
    expect(MAX_LEVEL_BY_AGE.medieval).toBe(4);
    expect(MAX_LEVEL_BY_AGE.renaissance).toBe(4);
    expect(MAX_LEVEL_BY_AGE.industrial).toBe(5);
    expect(MAX_LEVEL_BY_AGE.modern).toBe(5);
  });

  it('resolveShape: base weapon takes trajectory + default onHit from its preset', () => {
    const def = base({ archetype: 'piercer', onHit: { pierce: 3 } });
    const s = resolveShape(def);
    expect(s.trajectory).toBe('straight');
    expect(s.onHit.pierce).toBe(3);          // explicit override wins
    expect(s.bases).toEqual(['piercer']);
  });

  it('resolveShape: preset default onHit applies when def has none', () => {
    const s = resolveShape(base({ archetype: 'lobber' }));
    expect(s.trajectory).toBe('lob');
    expect(s.onHit.explode).toBeGreaterThan(0);
  });

  it('resolveShape: hybrids keep their explicit trajectory/onHit/bases', () => {
    const def = base({
      archetype: 'piercer', trajectory: 'orbit',
      onHit: { pierce: 2, explode: 64 }, bases: ['piercer', 'lobber'],
    });
    const s = resolveShape(def);
    expect(s.trajectory).toBe('orbit');
    expect(s.bases).toEqual(['piercer', 'lobber']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- archetypes`
Expected: FAIL — module `src/run/archetypes` not found.

- [ ] **Step 3: Implement `src/run/archetypes.ts`**

```ts
import { AgeId, ArchetypeId, OnHit, Trajectory, WeaponDef } from '../game/types';

// The 10 verbs (spec §2). Each preset = the trajectory the verb rides + its default on-hit.
// Catalog weapons store only `archetype` (+ optional onHit override); hybrids store explicit
// trajectory/onHit/bases because fusion unions them (see fusion.ts).
export const ARCHETYPE_IDS: ArchetypeId[] = [
  'bolt', 'piercer', 'spread', 'orbiter', 'lobber',
  'trail', 'zone', 'chain', 'boomerang', 'homing',
];

export interface ArchetypePreset {
  trajectory: Trajectory;
  onHit: OnHit;          // defaults — a weapon's own onHit field overrides per-key
  label: string;         // one-word verb for draft cards / squint test
}

export const ARCHETYPES: Record<ArchetypeId, ArchetypePreset> = {
  bolt:      { trajectory: 'straight',  onHit: {},                     label: 'bolt' },
  piercer:   { trajectory: 'straight',  onHit: { pierce: 2 },          label: 'piercing' },
  spread:    { trajectory: 'straight',  onHit: {},                     label: 'spread' },
  orbiter:   { trajectory: 'orbit',     onHit: {},                     label: 'orbiting' },
  lobber:    { trajectory: 'lob',       onHit: { explode: 64 },        label: 'explosive' },
  trail:     { trajectory: 'trail',     onHit: {},                     label: 'trailing' },
  zone:      { trajectory: 'lob',       onHit: { explode: 40, zoneMs: 2500 }, label: 'zoning' },
  chain:     { trajectory: 'straight',  onHit: { chain: 2 },           label: 'chaining' },
  boomerang: { trajectory: 'boomerang', onHit: { pierce: 4 },          label: 'returning' },
  homing:    { trajectory: 'homing',    onHit: {},                     label: 'homing' },
};

// Spec §4 — age-scaled level depth: early weapons fuse fast (2 levels), late ones go deep.
export const MAX_LEVEL_BY_AGE: Record<AgeId, number> = {
  stone: 2, bronze: 2, iron: 3, classical: 3,
  medieval: 4, renaissance: 4, industrial: 5, modern: 5,
};

export interface WeaponShape {
  trajectory: Trajectory;
  onHit: OnHit;
  bases: ArchetypeId[];
}

/** A weapon's resolved firing shape: hybrid fields win; base weapons fall back to their
 *  archetype preset. Explicit def.onHit keys override preset defaults key-by-key. */
export function resolveShape(def: WeaponDef): WeaponShape {
  const preset = ARCHETYPES[def.archetype ?? 'bolt'];
  return {
    trajectory: def.trajectory ?? preset.trajectory,
    onHit: { ...preset.onHit, ...(def.onHit ?? {}) },
    bases: def.bases ?? [def.archetype ?? 'bolt'],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- archetypes`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/run/archetypes.ts tests/archetypes.test.ts
git commit -m "feat(RC-031): archetype presets + age-scaled max levels"
```

---

## Task 3: Fusion engine (pure)

**Files:**
- Create: `src/run/fusion.ts`
- Test: `tests/fusion.test.ts`

Stat derivation (spec §2/§4): hybrid DPS budget = (parent A leveled DPS + parent B leveled DPS) × `FUSION_PREMIUM` (1.15). Volley shape takes the max of each axis; cooldown averages; damage solves the budget. Trajectory conflicts resolve by precedence `orbit > trail > lob > boomerang > homing > straight`. Hybrid `maxLevel` = deeper parent + 1. Hybrids cap at 3 bases.

- [ ] **Step 1: Write the failing tests**

Create `tests/fusion.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  fuseWeapons, leveledDps, canFuse, fusionName, TRAJECTORY_PRECEDENCE,
  FUSION_PREMIUM, MAX_BASES, hybridId,
} from '../src/run/fusion';
import { WeaponDef } from '../src/game/types';

const W = (over: Partial<WeaponDef>): WeaponDef => ({
  id: 'w', name: 'W', tier: 'iron', projectileSprite: 'spr_w',
  cooldownMs: 500, damage: 20, count: 1, spread: 0, speed: 400,
  behavior: 'straight', archetype: 'bolt', maxLevel: 3,
  levelScaling: { damage: 5 }, ...over,
});

describe('fusion', () => {
  const spear = W({ id: 'spear', name: 'Spear', archetype: 'piercer', onHit: { pierce: 2 } });
  const torch = W({ id: 'torch', name: 'Torch', archetype: 'trail', cooldownMs: 400, damage: 10 });

  it('leveledDps applies levelScaling before the budget math', () => {
    // level 3 = 2 steps: damage 20 + 5*2 = 30; dps = 30 * 1 * (1000/500) = 60
    expect(leveledDps(spear, 3)).toBeCloseTo(60);
  });

  it('fuses two bases into a hybrid with unioned onHit and premium budget', () => {
    const h = fuseWeapons({ def: spear, level: 3 }, { def: torch, level: 3 });
    expect(h.bases).toEqual(expect.arrayContaining(['piercer', 'trail']));
    expect(h.trajectory).toBe('trail');               // trail outranks straight
    expect(h.onHit.pierce).toBe(2);                   // union keeps the pierce
    expect(h.maxLevel).toBe(4);                       // deeper parent (3) + 1
    // budget: dps(spear L3)=60, dps(torch L3)= (10+10) * (1000/400) = 50 → (110)*1.15 ≈ 126.5
    const hDps = h.damage * h.count * (1000 / h.cooldownMs);
    expect(hDps).toBeGreaterThan(110);                // strictly better than parents' sum × 1.0
    expect(hDps).toBeLessThan(110 * FUSION_PREMIUM * 1.15); // and within premium + rounding slack
  });

  it('numeric onHit fields union by max, ignoreArmor by OR', () => {
    const a = W({ archetype: 'chain', onHit: { chain: 3, pierce: 1 } });
    const b = W({ archetype: 'piercer', onHit: { pierce: 4, ignoreArmor: true } });
    const h = fuseWeapons({ def: a, level: 1 }, { def: b, level: 1 });
    expect(h.onHit.chain).toBe(3);
    expect(h.onHit.pierce).toBe(4);
    expect(h.onHit.ignoreArmor).toBe(true);
  });

  it('canFuse blocks beyond MAX_BASES total bases', () => {
    const hybrid = fuseWeapons({ def: spear, level: 3 }, { def: torch, level: 3 });
    const third = W({ id: 'orb', archetype: 'orbiter' });
    expect(canFuse(hybrid, third)).toBe(true);        // 2 + 1 = 3 → allowed
    const triple = fuseWeapons({ def: hybrid, level: 1 }, { def: third, level: 1 });
    expect(triple.bases).toHaveLength(MAX_BASES);
    expect(canFuse(triple, spear)).toBe(false);       // 3 + 1 > MAX_BASES
  });

  it('same-archetype fusion is allowed and dedupes bases', () => {
    const a = W({ id: 'a', archetype: 'bolt' });
    const b = W({ id: 'b', archetype: 'bolt' });
    const h = fuseWeapons({ def: a, level: 2 }, { def: b, level: 2 });
    expect(h.bases).toEqual(['bolt']);
    expect(canFuse(h, a)).toBe(true);
  });

  it('fusionName: authored 2-way name, prefixed 3-way name, deterministic id', () => {
    expect(fusionName(['piercer', 'trail'])).toBe('Dragonlance');
    expect(fusionName(['piercer', 'trail', 'chain'])).toMatch(/Dragonlance/); // prefixed
    expect(hybridId(['trail', 'piercer'])).toBe(hybridId(['piercer', 'trail'])); // order-free
  });

  it('precedence table covers every trajectory', () => {
    for (const t of ['straight', 'lob', 'orbit', 'boomerang', 'trail', 'homing'] as const) {
      expect(TRAJECTORY_PRECEDENCE[t]).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- fusion`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/run/fusion.ts`**

```ts
import { ArchetypeId, OnHit, Trajectory, WeaponDef } from '../game/types';
import { resolveShape } from './archetypes';

export const FUSION_PREMIUM = 1.15; // fusing is always net-positive; WHEN is the decision
export const MAX_BASES = 3;         // spec §2 — a 3-base hybrid can no longer fuse

// Spec §2 precedence: the more screen-shaping trajectory wins the hybrid's ride.
export const TRAJECTORY_PRECEDENCE: Record<Trajectory, number> = {
  orbit: 6, trail: 5, lob: 4, boomerang: 3, homing: 2, straight: 1,
};

/** A parent in a fusion: its def + the level it was fused at (early fuses are weaker). */
export interface FusionParent { def: WeaponDef; level: number }

/** Per-volley DPS of `def` at `level` — same leveling math as weaponShot. */
export function leveledDps(def: WeaponDef, level: number): number {
  const steps = level - 1;
  const s = def.levelScaling;
  const damage = def.damage + (s.damage ?? 0) * steps;
  const count = def.count + (s.count ?? 0) * steps;
  const cooldown = Math.max(120, def.cooldownMs + (s.cooldownMs ?? 0) * steps);
  return damage * count * (1000 / cooldown);
}

function unionOnHit(a: OnHit, b: OnHit): OnHit {
  const out: OnHit = {};
  const max = (x?: number, y?: number) => (x === undefined && y === undefined)
    ? undefined : Math.max(x ?? 0, y ?? 0);
  out.pierce = max(a.pierce, b.pierce);
  out.explode = max(a.explode, b.explode);
  out.chain = max(a.chain, b.chain);
  out.zoneMs = max(a.zoneMs, b.zoneMs);
  out.slowPct = max(a.slowPct, b.slowPct);
  if (a.ignoreArmor || b.ignoreArmor) out.ignoreArmor = true;
  // drop undefined keys so {} stays {}
  (Object.keys(out) as (keyof OnHit)[]).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
}

/** True if fusing these two is allowed: a MAX_BASES hybrid can never fuse again (spec §2),
 *  and the union of bases must stay within MAX_BASES. */
export function canFuse(a: WeaponDef, b: WeaponDef): boolean {
  const ba = resolveShape(a).bases, bb = resolveShape(b).bases;
  if (ba.length >= MAX_BASES || bb.length >= MAX_BASES) return false;
  return new Set([...ba, ...bb]).size <= MAX_BASES;
}

/** Stable hybrid weapon id from its base set (order-free). */
export function hybridId(bases: ArchetypeId[]): string {
  return `hybrid:${[...bases].sort().join('+')}`;
}

/**
 * Fuse two equipped weapons into one hybrid WeaponDef (spec §2).
 * - components: union (numeric max, boolean OR); trajectory by precedence
 * - budget: (dpsA + dpsB) × FUSION_PREMIUM, solved for damage at the averaged cooldown
 * - identity: authored name from the base-pair table; body sprite from the trajectory winner
 * - leveling: fresh track, maxLevel = deeper parent + 1, scaling = 12% of base damage/level
 */
export function fuseWeapons(a: FusionParent, b: FusionParent): WeaponDef {
  const sa = resolveShape(a.def), sb = resolveShape(b.def);
  const bases = [...new Set([...sa.bases, ...sb.bases])];
  const trajectory = TRAJECTORY_PRECEDENCE[sa.trajectory] >= TRAJECTORY_PRECEDENCE[sb.trajectory]
    ? sa.trajectory : sb.trajectory;
  const body = TRAJECTORY_PRECEDENCE[sa.trajectory] >= TRAJECTORY_PRECEDENCE[sb.trajectory]
    ? a.def : b.def; // trajectory winner donates body sprite + primary archetype
  const targetDps = (leveledDps(a.def, a.level) + leveledDps(b.def, b.level)) * FUSION_PREMIUM;
  const cooldownMs = Math.max(160, Math.round((a.def.cooldownMs + b.def.cooldownMs) / 2));
  const count = Math.max(a.def.count, b.def.count);
  const damage = Math.max(1, Math.round(targetDps * (cooldownMs / 1000) / count));
  return {
    id: hybridId(bases),
    name: fusionName(bases),
    tier: a.def.tier, // display only; range factor uses the body parent's age
    projectileSprite: body.projectileSprite,
    archetype: body.archetype ?? 'bolt',
    bases,
    trajectory,
    onHit: unionOnHit(sa.onHit, sb.onHit),
    cooldownMs,
    damage,
    count,
    spread: Math.max(a.def.spread, b.def.spread),
    speed: Math.max(a.def.speed, b.def.speed),
    maxLevel: Math.max(a.def.maxLevel, b.def.maxLevel) + 1,
    levelScaling: { damage: Math.max(1, Math.round(damage * 0.12)) },
    behavior: 'straight', // legacy field, ignored by v2 paths; deleted in Task 4
  };
}

// ---- Identity layer (spec §2): authored names per base PAIR, prefix for the third base. ----

const pairKey = (a: ArchetypeId, b: ArchetypeId) => [a, b].sort().join('+');

/** Authored 2-way fusion names, keyed by sorted archetype pair. Same-pair = doubled verb. */
export const FUSION_NAMES: Record<string, string> = {
  'bolt+bolt': 'Twinbolt',            'bolt+piercer': 'Lancer Bolt',
  'bolt+spread': 'Scatterbolt',       'bolt+orbiter': 'Comet Ring',
  'bolt+lobber': 'Cannonade',         'bolt+trail': 'Cinderbolt',
  'bolt+zone': 'Shrapnel Field',      'bolt+chain': 'Stormbolt',
  'bolt+boomerang': 'Skipping Bolt',  'bolt+homing': 'Seeker Bolt',
  'piercer+piercer': 'Twin Lance',    'piercer+spread': 'Pike Wall',
  'orbiter+piercer': 'Lance Carousel','lobber+piercer': 'Bunker Piercer',
  'piercer+trail': 'Dragonlance',     'piercer+zone': 'Stake Field',
  'chain+piercer': 'Arc Lance',       'boomerang+piercer': 'Skewer Return',
  'homing+piercer': 'Javelin Seeker', 'spread+spread': 'Wall of Iron',
  'orbiter+spread': 'Bladestorm',     'lobber+spread': 'Grapeshot Rain',
  'spread+trail': 'Burning Fan',      'spread+zone': 'Flak Carpet',
  'chain+spread': 'Forked Volley',    'boomerang+spread': 'Scythe Fan',
  'homing+spread': 'Swarm Burst',     'orbiter+orbiter': 'Twin Halo',
  'lobber+orbiter': 'Meteor Ring',    'orbiter+trail': 'Fire Wheel',
  'orbiter+zone': 'Ward Circle',      'chain+orbiter': 'Tesla Halo',
  'boomerang+orbiter': 'Gyre Blades', 'homing+orbiter': 'Hunter Moons',
  'lobber+lobber': 'Twin Mortars',    'lobber+trail': 'Napalm Arc',
  'lobber+zone': 'Minefield Barrage', 'chain+lobber': 'Thunderhead',
  'boomerang+lobber': 'Orbital Toss', 'homing+lobber': 'Guided Shells',
  'trail+trail': 'Scorched Earth',    'trail+zone': 'Tar & Torch',
  'chain+trail': 'Live Wire',         'boomerang+trail': 'Comet Sweep',
  'homing+trail': 'Burning Hound',    'zone+zone': 'No Man’s Land',
  'chain+zone': 'Static Field',       'boomerang+zone': 'Sower’s Arc',
  'homing+zone': 'Beacon Mines',      'chain+chain': 'Chain Lightning',
  'boomerang+chain': 'Arc Return',    'chain+homing': 'Stalking Spark',
  'boomerang+boomerang': 'Twin Gyre', 'boomerang+homing': 'Faithful Blade',
  'homing+homing': 'Wolfpack',
};

/** Third-base prefix for 3-way hybrids (templated on the 2-way name — spec §2). */
export const THIRD_PREFIX: Record<ArchetypeId, string> = {
  bolt: 'Swift', piercer: 'Impaling', spread: 'Scattering', orbiter: 'Halo',
  lobber: 'Thundering', trail: 'Burning', zone: 'Lingering', chain: 'Storm',
  boomerang: 'Returning', homing: 'Hunting',
};

/** Name a hybrid from its base set: authored pair name (+ prefix for a third base).
 *  Falls back to a generated name so missing table entries never block fusion. */
export function fusionName(bases: ArchetypeId[]): string {
  const sorted = [...bases].sort();
  if (sorted.length === 1) return FUSION_NAMES[pairKey(sorted[0], sorted[0])] ?? `Twin ${sorted[0]}`;
  const two = FUSION_NAMES[pairKey(sorted[0], sorted[1])]
    ?? `${THIRD_PREFIX[sorted[0]]} ${sorted[1]}`; // generated fallback
  if (sorted.length === 2) return two;
  return `${THIRD_PREFIX[sorted[2]]} ${two}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- fusion`
Expected: PASS (7 tests). If the budget-band test is off by rounding, loosen only the upper bound (never the `> sum of parents` lower bound — that's the "fusing is always worth it" guarantee).

- [ ] **Step 5: Commit**

```bash
git add src/run/fusion.ts tests/fusion.test.ts
git commit -m "feat(RC-031): fusion engine — union rules, budget, naming tables"
```

---

## Task 4: Catalog v2 flip — weaponData + weapons.ts rewrite, evolution deleted

**Files:**
- Rewrite: `src/run/weaponData.ts` (26 base weapons; 16 evolved forms deleted)
- Rewrite: `src/run/weapons.ts` (no classes, no evolution; `weaponShot` v2)
- Modify: `src/game/types.ts` (delete legacy `WeaponDef` fields)
- Modify: `src/scenes/RunScene.ts` (compat: read `shot.trajectory`/`shot.onHit`; drop evolve draft case)
- Modify: `src/ui/expeditionScreen.ts` (drop the `weaponClass` chip)
- Test: update `tests/weapons.test.ts`, `tests/weaponData.test.ts` (and any test importing `weaponClass`/`evolutionFor`)

This is the flip task: after it, the old `behavior` enum, melee/ranged split, and evolution system no longer exist. All 26 base weapon ids are kept (every one is granted by a tech or building — verified against `techData.ts`/`buildingData.ts`), so no tech/building data changes are needed here.

- [ ] **Step 1: Update the data-integrity tests first**

In `tests/weaponData.test.ts`, replace evolution-related assertions with:

```ts
import { describe, it, expect } from 'vitest';
import { WEAPONS } from '../src/run/weaponData';
import { MAX_LEVEL_BY_AGE, ARCHETYPES } from '../src/run/archetypes';
import { AGE_ORDER, AgeId } from '../src/game/types';

describe('weaponData v2 integrity', () => {
  const defs = Object.values(WEAPONS);

  it('every weapon has an archetype and age-scaled maxLevel', () => {
    for (const d of defs) {
      expect(ARCHETYPES[d.archetype!], `${d.id} archetype`).toBeDefined();
      expect(d.maxLevel, `${d.id} maxLevel`).toBe(MAX_LEVEL_BY_AGE[d.tier]);
    }
  });

  it('no evolution or class leftovers', () => {
    for (const d of defs) {
      expect((d as any).evolvesTo, d.id).toBeUndefined();
      expect((d as any).evolveRequiresPerk, d.id).toBeUndefined();
      expect((d as any).behavior, d.id).toBeUndefined();
    }
  });

  it('sidegrade band: every weapon’s max-level EFFECTIVE DPS within 0.5×–1.8× of its age median', () => {
    // Effective dps discounts extra projectiles by 50% — a 5-pellet cone rarely lands all 5 on
    // one target, so paper (damage×count×rate) over-values volleys and under-values single shots.
    const effectiveDps = (d: (typeof defs)[number]): number => {
      const steps = d.maxLevel - 1;
      const s = d.levelScaling;
      const dmg = d.damage + (s.damage ?? 0) * steps;
      const count = d.count + (s.count ?? 0) * steps;
      const cd = Math.max(120, d.cooldownMs + (s.cooldownMs ?? 0) * steps);
      return dmg * (1 + (count - 1) * 0.5) * (1000 / cd);
    };
    const byAge = new Map<AgeId, number[]>();
    for (const d of defs) {
      byAge.set(d.tier, [...(byAge.get(d.tier) ?? []), effectiveDps(d)]);
    }
    for (const age of AGE_ORDER) {
      const list = (byAge.get(age) ?? []).sort((a, b) => a - b);
      if (list.length < 2) continue;
      const median = list[Math.floor(list.length / 2)];
      for (const dps of list) {
        expect(dps, `${age} dps band`).toBeGreaterThanOrEqual(median * 0.5);
        expect(dps, `${age} dps band`).toBeLessThanOrEqual(median * 1.8);
      }
    }
  });

  it('each age from iron on offers at least 3 distinct archetypes', () => {
    for (const age of AGE_ORDER.slice(2)) {
      const archs = new Set(defs.filter((d) => d.tier === age).map((d) => d.archetype));
      expect(archs.size, age).toBeGreaterThanOrEqual(3);
    }
  });
});
```

In `tests/weapons.test.ts`: delete tests for `weaponClass`/`evolutionFor`/`applyEvolve`/`MELEE_IDS`; keep/adjust `addWeapon`/`levelWeapon`/`weaponShot` tests per the new semantics below (slot-based, not class-based):

```ts
import { describe, it, expect } from 'vitest';
import {
  addWeapon, swapWeapon, levelWeapon, defOf, initialWeapons, weaponShot, MAX_WEAPON_SLOTS,
} from '../src/run/weapons';
import { WEAPONS } from '../src/run/weaponData';

describe('weapons v2 — slots', () => {
  it('two generic slots: second pick fills the empty slot', () => {
    const eq = addWeapon(initialWeapons('club'), 'bronze_spear');
    expect(eq.map((w) => w.id)).toEqual(['club', 'bronze_spear']);
  });
  it('addWeapon refuses a third weapon (must swap instead)', () => {
    const eq = addWeapon(addWeapon(initialWeapons('club'), 'bronze_spear'), 'gladius');
    expect(eq).toHaveLength(MAX_WEAPON_SLOTS);
    expect(eq.map((w) => w.id)).toEqual(['club', 'bronze_spear']); // unchanged
  });
  it('swapWeapon replaces a named slot at level 1', () => {
    const eq = swapWeapon(addWeapon(initialWeapons('club'), 'bronze_spear'), 'club', 'gladius');
    expect(eq.map((w) => w.id)).toEqual(['gladius', 'bronze_spear']);
    expect(eq[0].level).toBe(1);
  });
  it('levelWeapon caps at the def maxLevel (hybrid defs included via defOf)', () => {
    let eq = initialWeapons('club'); // club maxLevel 2
    eq = levelWeapon(eq, 'club'); eq = levelWeapon(eq, 'club');
    expect(eq[0].level).toBe(2);
  });
  it('weaponShot v2 carries trajectory + onHit', () => {
    const s = weaponShot(WEAPONS.bronze_spear, 1, 1);
    expect(s.trajectory).toBe('straight');
    expect(s.onHit.pierce).toBeGreaterThanOrEqual(1);
  });
});
```

Run: `npm test -- weapon`
Expected: FAIL (new API doesn't exist yet).

- [ ] **Step 2: Rewrite `src/run/weaponData.ts`**

Full replacement — 26 weapons, one per granted id, archetypes per spec §2. Sprites are unchanged (all referenced sprite ids already exist in the art registry).

```ts
import { WeaponDef } from '../game/types';
import { MAX_LEVEL_BY_AGE } from './archetypes';

// RC-031 catalog v2: every weapon is one of the 10 verb archetypes; same-age weapons are
// sidegrades (different shapes of one DPS budget — see the band test). Evolved forms are gone:
// fusion (fusion.ts) replaced evolution. All ids here are granted by techs/buildings.
const ml = MAX_LEVEL_BY_AGE;

export const WEAPONS: Record<string, WeaponDef> = {
  // --- Stone / Bronze (maxLevel 2 — first fusion comes fast) ---
  club:         { id: 'club', name: 'Club', tier: 'stone', projectileSprite: 'shot_club',
    archetype: 'bolt', cooldownMs: 500, damage: 12, count: 1, spread: 0, speed: 420,
    maxLevel: ml.stone, levelScaling: { damage: 6, cooldownMs: -60 } },
  bronze_spear: { id: 'bronze_spear', name: 'Bronze Spear', tier: 'bronze', projectileSprite: 'shot_bronze',
    archetype: 'piercer', onHit: { pierce: 1 }, cooldownMs: 600, damage: 14, count: 2, spread: 0.25, speed: 460,
    maxLevel: ml.bronze, levelScaling: { damage: 7 } },

  // --- Iron (maxLevel 3) ---
  iron_pick:    { id: 'iron_pick', name: 'Iron Pick', tier: 'iron', projectileSprite: 'shot_iron_pick',
    archetype: 'piercer', onHit: { pierce: 2 }, cooldownMs: 550, damage: 18, count: 1, spread: 0, speed: 480,
    maxLevel: ml.iron, levelScaling: { damage: 6, cooldownMs: -40 } },
  war_hammer:   { id: 'war_hammer', name: 'War Hammer', tier: 'iron', projectileSprite: 'shot_hammer',
    archetype: 'bolt', cooldownMs: 900, damage: 34, count: 1, spread: 0, speed: 360,
    maxLevel: ml.iron, levelScaling: { damage: 10, cooldownMs: -60 } },
  sawblade:     { id: 'sawblade', name: 'Sawblade', tier: 'iron', projectileSprite: 'shot_sawblade',
    archetype: 'boomerang', onHit: { pierce: 5 }, cooldownMs: 700, damage: 16, count: 1, spread: 0, speed: 300,
    maxLevel: ml.iron, levelScaling: { damage: 5 } },
  flame_jet:    { id: 'flame_jet', name: 'Flame Jet', tier: 'iron', projectileSprite: 'shot_flame',
    archetype: 'trail', cooldownMs: 450, damage: 9, count: 1, spread: 0, speed: 0,
    maxLevel: ml.iron, levelScaling: { damage: 4 } },

  // --- Classical (maxLevel 3) ---
  javelin:      { id: 'javelin', name: 'Javelin', tier: 'classical', projectileSprite: 'shot_javelin',
    archetype: 'piercer', onHit: { pierce: 2 }, cooldownMs: 560, damage: 24, count: 1, spread: 0, speed: 500,
    maxLevel: ml.classical, levelScaling: { damage: 7, cooldownMs: -40 } },
  gladius:      { id: 'gladius', name: 'Gladius', tier: 'classical', projectileSprite: 'shot_gladius',
    archetype: 'bolt', cooldownMs: 380, damage: 20, count: 1, spread: 0, speed: 460,
    maxLevel: ml.classical, levelScaling: { damage: 6, cooldownMs: -30 } },
  ballista:     { id: 'ballista', name: 'Ballista', tier: 'classical', projectileSprite: 'shot_ballista',
    archetype: 'piercer', onHit: { pierce: 3 }, cooldownMs: 1000, damage: 46, count: 1, spread: 0, speed: 540,
    maxLevel: ml.classical, levelScaling: { damage: 14, cooldownMs: -70 } },
  discus:       { id: 'discus', name: 'Discus', tier: 'classical', projectileSprite: 'shot_discus',
    archetype: 'boomerang', onHit: { pierce: 4 }, cooldownMs: 520, damage: 20, count: 1, spread: 0, speed: 380,
    maxLevel: ml.classical, levelScaling: { damage: 6 } },

  // --- Medieval (maxLevel 4) ---
  crossbow:     { id: 'crossbow', name: 'Crossbow', tier: 'medieval', projectileSprite: 'shot_bolt',
    archetype: 'bolt', cooldownMs: 650, damage: 30, count: 1, spread: 0, speed: 560,
    maxLevel: ml.medieval, levelScaling: { damage: 9, cooldownMs: -40 } },
  longsword:    { id: 'longsword', name: 'Longsword', tier: 'medieval', projectileSprite: 'shot_slash',
    archetype: 'spread', cooldownMs: 420, damage: 18, count: 3, spread: 0.45, speed: 470,
    maxLevel: ml.medieval, levelScaling: { damage: 6 } },
  halberd:      { id: 'halberd', name: 'Halberd', tier: 'medieval', projectileSprite: 'shot_halberd',
    archetype: 'piercer', onHit: { pierce: 3 }, cooldownMs: 820, damage: 44, count: 1, spread: 0, speed: 420,
    maxLevel: ml.medieval, levelScaling: { damage: 13, cooldownMs: -50 } },
  flail:        { id: 'flail', name: 'Flail', tier: 'medieval', projectileSprite: 'shot_flail',
    archetype: 'orbiter', cooldownMs: 560, damage: 18, count: 3, spread: 0.5, speed: 360,
    maxLevel: ml.medieval, levelScaling: { damage: 6, count: 1 } },

  // --- Renaissance (maxLevel 4) ---
  musket:       { id: 'musket', name: 'Musket', tier: 'renaissance', projectileSprite: 'shot_musket',
    archetype: 'bolt', cooldownMs: 900, damage: 58, count: 1, spread: 0, speed: 640,
    maxLevel: ml.renaissance, levelScaling: { damage: 16, cooldownMs: -60 } },
  blunderbuss:  { id: 'blunderbuss', name: 'Blunderbuss', tier: 'renaissance', projectileSprite: 'shot_pellet',
    archetype: 'spread', cooldownMs: 750, damage: 14, count: 5, spread: 0.7, speed: 420,
    maxLevel: ml.renaissance, levelScaling: { damage: 5, count: 1 } },
  volley_pistols:{ id: 'volley_pistols', name: 'Volley Pistols', tier: 'renaissance', projectileSprite: 'shot_pistol',
    archetype: 'chain', onHit: { chain: 2 }, cooldownMs: 520, damage: 24, count: 1, spread: 0, speed: 560,
    maxLevel: ml.renaissance, levelScaling: { damage: 8, cooldownMs: -30 } },
  grenade:      { id: 'grenade', name: 'Grenade', tier: 'renaissance', projectileSprite: 'shot_grenade',
    archetype: 'lobber', onHit: { explode: 64 }, cooldownMs: 1000, damage: 40, count: 2, spread: 0.4, speed: 300,
    maxLevel: ml.renaissance, levelScaling: { damage: 12 } },

  // --- Industrial (maxLevel 5) ---
  gatling:      { id: 'gatling', name: 'Gatling Gun', tier: 'industrial', projectileSprite: 'shot_bullet',
    archetype: 'bolt', cooldownMs: 360, damage: 16, count: 1, spread: 0, speed: 700,
    maxLevel: ml.industrial, levelScaling: { damage: 5, cooldownMs: -15 } },
  flamethrower: { id: 'flamethrower', name: 'Flamethrower', tier: 'industrial', projectileSprite: 'shot_fire',
    archetype: 'trail', cooldownMs: 260, damage: 8, count: 1, spread: 0, speed: 0,
    maxLevel: ml.industrial, levelScaling: { damage: 3 } },
  dynamite:     { id: 'dynamite', name: 'Dynamite', tier: 'industrial', projectileSprite: 'shot_dynamite',
    archetype: 'zone', onHit: { explode: 48, zoneMs: 2500 }, cooldownMs: 1100, damage: 30, count: 2, spread: 0.5, speed: 300,
    maxLevel: ml.industrial, levelScaling: { damage: 9 } },
  tesla_coil:   { id: 'tesla_coil', name: 'Tesla Coil', tier: 'industrial', projectileSprite: 'shot_spark',
    archetype: 'chain', onHit: { chain: 3 }, cooldownMs: 600, damage: 34, count: 1, spread: 0, speed: 620,
    maxLevel: ml.industrial, levelScaling: { damage: 11, cooldownMs: -40 } },

  // --- Modern (maxLevel 5) ---
  assault_rifle:{ id: 'assault_rifle', name: 'Assault Rifle', tier: 'modern', projectileSprite: 'shot_round',
    archetype: 'bolt', cooldownMs: 200, damage: 22, count: 1, spread: 0, speed: 760,
    maxLevel: ml.modern, levelScaling: { damage: 6, cooldownMs: -15 } },
  rpg:          { id: 'rpg', name: 'RPG', tier: 'modern', projectileSprite: 'shot_rocket',
    archetype: 'homing', onHit: { explode: 64 }, cooldownMs: 1100, damage: 72, count: 1, spread: 0, speed: 360,
    maxLevel: ml.modern, levelScaling: { damage: 22 } },
  mortar:       { id: 'mortar', name: 'Mortar', tier: 'modern', projectileSprite: 'shot_shell',
    archetype: 'lobber', onHit: { explode: 80 }, cooldownMs: 950, damage: 54, count: 2, spread: 0.6, speed: 300,
    maxLevel: ml.modern, levelScaling: { damage: 16 } },
  sniper:       { id: 'sniper', name: 'Sniper Rifle', tier: 'modern', projectileSprite: 'shot_tracer',
    archetype: 'piercer', onHit: { pierce: 3, ignoreArmor: true }, cooldownMs: 1000, damage: 90, count: 1, spread: 0, speed: 900,
    maxLevel: ml.modern, levelScaling: { damage: 26, cooldownMs: -60 } },
};
```

- [ ] **Step 3: Rewrite `src/run/weapons.ts`**

Full replacement:

```ts
import { AgeId, AGE_ORDER, OnHit, Trajectory, WeaponDef } from '../game/types';
import { WEAPONS } from './weaponData';
import { resolveShape, ARCHETYPES } from './archetypes';

// RC-031: two GENERIC weapon slots (the melee/ranged split is gone). Fusing both weapons
// (fusion.ts) frees a slot — that's the build arc. Hybrids are runtime defs carried on the
// equipped entry (`hybrid`), never in the WEAPONS catalog.
export const MAX_WEAPON_SLOTS = 2;

export interface EquippedWeapon { id: string; level: number; hybrid?: WeaponDef }

/** The run's starting loadout: the kit's start weapon at level 1. */
export function initialWeapons(startWeapon: string = 'club'): EquippedWeapon[] {
  return [{ id: startWeapon, level: 1 }];
}

/** Resolve an equipped entry to its def: hybrids carry their own; base ids hit the catalog. */
export function defOf(w: EquippedWeapon, defs: Record<string, WeaponDef> = WEAPONS): WeaponDef {
  return w.hybrid ?? defs[w.id];
}

/** Fill an empty slot with `id` at level 1. No-op when full or already held — swaps use swapWeapon. */
export function addWeapon(equipped: EquippedWeapon[], id: string): EquippedWeapon[] {
  if (equipped.length >= MAX_WEAPON_SLOTS) return equipped;
  if (equipped.some((w) => w.id === id)) return equipped;
  return [...equipped, { id, level: 1 }];
}

/** Replace the slot holding `outId` with `inId` at level 1 (explicit swap card). Pure. */
export function swapWeapon(equipped: EquippedWeapon[], outId: string, inId: string): EquippedWeapon[] {
  return equipped.map((w) => (w.id === outId ? { id: inId, level: 1 } : w));
}

/** Raise one equipped weapon a level, capped at its (hybrid-aware) def's maxLevel. Pure. */
export function levelWeapon(
  equipped: EquippedWeapon[], id: string, defs: Record<string, WeaponDef> = WEAPONS,
): EquippedWeapon[] {
  return equipped.map((w) =>
    w.id === id ? { ...w, level: Math.min(w.level + 1, defOf(w, defs).maxLevel) } : w,
  );
}

/** Replace both equipped weapons with the fused hybrid (consumes the parents). Pure. */
export function equipHybrid(hybrid: WeaponDef): EquippedWeapon[] {
  return [{ id: hybrid.id, level: 1, hybrid }];
}

/** One-line firing profile for draft cards: verb + numbers. */
export function weaponStatText(def: WeaponDef): string {
  const shape = resolveShape(def);
  const parts = [
    `${def.damage} dmg`,
    def.count > 1 ? `${def.count} shots` : '1 shot',
    ARCHETYPES[def.archetype ?? 'bolt'].label,
  ];
  if (shape.onHit.pierce) parts.push(`pierce ${shape.onHit.pierce}`);
  if (shape.onHit.chain) parts.push(`chain ${shape.onHit.chain}`);
  if (shape.onHit.explode) parts.push('AoE');
  if (shape.onHit.zoneMs) parts.push('lingers');
  parts.push(`${(1000 / def.cooldownMs).toFixed(1)}/s`);
  return parts.join(' · ');
}

/** What one level-up adds, for the draft card's second line. */
export function weaponLevelGainText(def: WeaponDef): string {
  const s = def.levelScaling;
  const parts: string[] = [];
  if (s.damage) parts.push(`+${s.damage} dmg`);
  if (s.count) parts.push(`+${s.count} shot${s.count > 1 ? 's' : ''}`);
  if (s.cooldownMs) parts.push(s.cooldownMs < 0 ? `+${Math.round(-s.cooldownMs)}ms faster` : `${s.cooldownMs}ms slower`);
  return parts.length ? parts.join(' · ') : 'stronger';
}

const BASE_BULLET_LIFE_MS = 1200;

/** Range factor by age: early 0.25, mid 0.50, end 0.75 (unchanged from RC-009 tuning). */
export function rangeFactorForTier(tier: AgeId): number {
  const i = AGE_ORDER.indexOf(tier);
  if (i <= 2) return 0.25;
  if (i <= 5) return 0.50;
  return 0.75;
}

export interface WeaponShot {
  sprite: string;
  damage: number;
  count: number;
  spread: number;
  speed: number;
  cooldownMs: number;
  trajectory: Trajectory;
  onHit: OnHit;
  lifeMs: number;
}

/** Resolve a def at a level into per-volley firing numbers (v2: trajectory + onHit). Pure. */
export function weaponShot(def: WeaponDef, level: number, damageMult: number): WeaponShot {
  const steps = level - 1;
  const s = def.levelScaling;
  const shape = resolveShape(def);
  return {
    sprite: def.projectileSprite,
    damage: (def.damage + (s.damage ?? 0) * steps) * damageMult,
    count: def.count + (s.count ?? 0) * steps,
    spread: def.spread,
    speed: def.speed,
    cooldownMs: Math.max(120, def.cooldownMs + (s.cooldownMs ?? 0) * steps),
    trajectory: shape.trajectory,
    onHit: shape.onHit,
    lifeMs: Math.round(BASE_BULLET_LIFE_MS * rangeFactorForTier(def.tier)),
  };
}
```

(The old `DraftOption`/`draftOptions`/`rollRunDraft` move to `draft.ts` in Task 6 — for THIS task, leave a temporary re-export so RunScene compiles: copy the old `draftOptions`/`rollRunDraft`/`DraftOption` into `weapons.ts` minus the `evolve` option kind and minus `weaponClass` — the `newWeapon` option keeps working because `addWeapon` still fills slot 2, and when both slots are full simply skip `newWeapon` options. Task 6 replaces all of it.)

- [ ] **Step 4: Delete the legacy WeaponDef fields and patch consumers**

In `src/game/types.ts` `WeaponDef`: delete `behavior`, `pierce?`, `evolvesTo?`, `evolveRequiresPerk?`, `pierceArmor?`, and the transitional `?` on `archetype` (now required: `archetype: ArchetypeId;`).

Also remove the now-dead legacy field everywhere it was set transitionally: the `behavior: 'straight'` line in `fuseWeapons`' return (fusion.ts) and the `behavior: 'straight'` keys in the `tests/fusion.test.ts` `W()` and `tests/archetypes.test.ts` `base()` fixtures.

In `src/scenes/RunScene.ts`:
- `fireWeapon` dispatch: `shot.behavior === 'orbit'` → `shot.trajectory === 'orbit'`; `'lob'` → `shot.trajectory === 'lob'` (trail/boomerang/homing/chain fall through to straight-fire for now — Task 9 implements them; the game must still RUN, just with placeholder straight shots for the 4 new verbs).
- bullet data: `bullet.setData('pierce', shot.onHit.pierce ?? 0)` and `bullet.setData('ignoresArmor', shot.onHit.ignoreArmor ?? false)`.
- Remove the `case 'evolve'` from `draftLabel`/`draftDescription`/`applyDraftOption` and any `evolutionFor` import.

In `src/ui/expeditionScreen.ts`: remove the `weaponClass` import and the `<span class="wcls">…</span>` chip (line ~50); everything else stands.

- [ ] **Step 5: Full verify**

Run: `npm test && npm run build`
Expected: PASS. Manually sanity-check `npm run dev` boots and a run fires club shots.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(RC-031)!: catalog v2 flip — archetypes in, evolution + weapon classes out"
```

---

## Task 5: Passives v2 — tradeoff sidegrades, 2 slots, recompute model (pure)

**Files:**
- Create: `src/run/passiveData.ts`, `src/run/passives.ts`
- Modify: `src/game/types.ts` (PassiveEffect/PassiveDef/EquippedPassive)
- Test: `tests/passives.test.ts`

- [ ] **Step 1: Add the types**

In `src/game/types.ts`, replace `PerkEffect`/`Perk` usage sites untouched for now (deleted in Task 16); ADD:

```ts
// RC-031 — every passive is a sidegrade: at least one positive and one negative axis.
export interface PassiveEffect {
  damageMult?: number;     // additive fraction per level (may be negative)
  fireRateMult?: number;
  moveSpeedMult?: number;
  maxHp?: number;          // flat per level
  pickupRadius?: number;   // flat px per level
  regenHps?: number;       // HP/s per level
  xpMult?: number;         // additive fraction per level
  activeCharges?: number;  // flat right-click charges per level
}
export interface PassiveDef {
  id: string;
  name: string;
  icon: string;            // emoji for HUD slot + draft card
  maxLevel: number;
  effectPerLevel: PassiveEffect;
  desc: string;            // per-level effect line, signs explicit ("+10% damage, −5% fire rate")
}
export interface EquippedPassive { id: string; level: number; hybrid?: PassiveDef }
```

- [ ] **Step 2: Write the failing tests**

Create `tests/passives.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PASSIVES, PASSIVE_FUSIONS } from '../src/run/passiveData';
import {
  addPassive, levelPassive, fusePassives, recomputeStats, passiveDefOf, MAX_PASSIVE_SLOTS,
} from '../src/run/passives';
import { RunStats } from '../src/game/types';

const base: RunStats = {
  hp: 100, maxHp: 100, damageMult: 1, fireRateMult: 1, moveSpeedMult: 1,
  pickupRadius: 60, level: 1, xp: 0, regenHps: 0, xpMult: 1, activeCharges: 1,
};

describe('passives', () => {
  it('every passive is a tradeoff: ≥1 positive and ≥1 negative axis', () => {
    for (const p of Object.values(PASSIVES)) {
      const vals = Object.values(p.effectPerLevel);
      expect(vals.some((v) => v! > 0), p.id).toBe(true);
      expect(vals.some((v) => v! < 0), p.id).toBe(true);
    }
  });

  it('two slots, addPassive refuses a third', () => {
    let eq = addPassive([], 'whetstone');
    eq = addPassive(eq, 'oxhide');
    expect(addPassive(eq, 'winged_boots')).toEqual(eq);
    expect(eq).toHaveLength(MAX_PASSIVE_SLOTS);
  });

  it('recomputeStats applies effect × level on top of base, preserving hp ratio', () => {
    const eq = [{ id: 'oxhide', level: 2 }]; // +30 maxHp, −5% move per level
    const out = recomputeStats(base, eq, 0.5);
    expect(out.maxHp).toBe(160);
    expect(out.hp).toBe(80);                     // ratio 0.5 preserved
    expect(out.moveSpeedMult).toBeCloseTo(0.9);
  });

  it('maxHp floors at 1 and multipliers floor at 0.1', () => {
    const eq = [{ id: 'powder_bandolier', level: 3 }]; // −12 maxHp per level among others
    const out = recomputeStats({ ...base, maxHp: 20, hp: 20 }, eq, 1);
    expect(out.maxHp).toBeGreaterThanOrEqual(1);
  });

  it('fusePassives: authored pair merges into one hybrid def, freeing a slot', () => {
    const eq = [{ id: 'whetstone', level: 3 }, { id: 'rapid_levers', level: 3 }];
    const fused = fusePassives(eq);
    expect(fused).toHaveLength(1);
    expect(fused[0].hybrid).toBeDefined();
    expect(passiveDefOf(fused[0]).name).toBe(PASSIVE_FUSIONS['rapid_levers+whetstone'].name);
  });

  it('fusePassives returns null for unauthored pairs', () => {
    const eq = [{ id: 'whetstone', level: 3 }, { id: 'scholars_kit', level: 3 }];
    expect(fusePassives(eq)).toBeNull();
  });
});
```

Run: `npm test -- passives` → Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `src/run/passiveData.ts`**

```ts
import { PassiveDef } from '../game/types';

// RC-031 passive pool (spec §1/§4): stat-tradeoff sidegrades only — the ONLY risk vocabulary
// in the game. Universal pool now; tech/tradition-gated rares are RC-025's future home.
export const PASSIVES: Record<string, PassiveDef> = {
  whetstone:        { id: 'whetstone', name: 'Whetstone', icon: '🗡️', maxLevel: 3,
    effectPerLevel: { damageMult: 0.10, fireRateMult: -0.05 },
    desc: '+10% damage, −5% fire rate' },
  rapid_levers:     { id: 'rapid_levers', name: 'Rapid Levers', icon: '⚙️', maxLevel: 3,
    effectPerLevel: { fireRateMult: 0.10, damageMult: -0.06 },
    desc: '+10% fire rate, −6% damage' },
  winged_boots:     { id: 'winged_boots', name: 'Winged Boots', icon: '👢', maxLevel: 3,
    effectPerLevel: { moveSpeedMult: 0.10, pickupRadius: -12 },
    desc: '+10% move speed, −12 pickup radius' },
  oxhide:           { id: 'oxhide', name: 'Oxhide', icon: '🛡️', maxLevel: 3,
    effectPerLevel: { maxHp: 30, moveSpeedMult: -0.05 },
    desc: '+30 max HP, −5% move speed' },
  lodestone:        { id: 'lodestone', name: 'Lodestone', icon: '🧲', maxLevel: 3,
    effectPerLevel: { pickupRadius: 35, fireRateMult: -0.04 },
    desc: '+35 pickup radius, −4% fire rate' },
  field_medic:      { id: 'field_medic', name: 'Field Medic', icon: '🩹', maxLevel: 3,
    effectPerLevel: { regenHps: 0.8, damageMult: -0.06 },
    desc: '+0.8 HP/s regen, −6% damage' },
  scholars_kit:     { id: 'scholars_kit', name: "Scholar's Kit", icon: '📜', maxLevel: 3,
    effectPerLevel: { xpMult: 0.12, moveSpeedMult: -0.04 },
    desc: '+12% XP, −4% move speed' },
  powder_bandolier: { id: 'powder_bandolier', name: 'Powder Bandolier', icon: '🎒', maxLevel: 2,
    effectPerLevel: { activeCharges: 1, maxHp: -12 },
    desc: '+1 active charge, −12 max HP' },
};

// Rare authored passive fusions (spec §2): only these pairs fuse. Key = sorted 'a+b'.
export const PASSIVE_FUSIONS: Record<string, PassiveDef> = {
  'rapid_levers+whetstone': { id: 'war_drums', name: 'War Drums', icon: '🥁', maxLevel: 3,
    effectPerLevel: { damageMult: 0.08, fireRateMult: 0.08, maxHp: -10 },
    desc: '+8% damage, +8% fire rate, −10 max HP' },
  'lodestone+winged_boots': { id: 'falconers_glove', name: "Falconer's Glove", icon: '🦅', maxLevel: 3,
    effectPerLevel: { moveSpeedMult: 0.08, pickupRadius: 25, damageMult: -0.05 },
    desc: '+8% move, +25 pickup, −5% damage' },
  'field_medic+oxhide':     { id: 'heartwood', name: 'Heartwood', icon: '🌳', maxLevel: 3,
    effectPerLevel: { maxHp: 25, regenHps: 0.7, fireRateMult: -0.06 },
    desc: '+25 max HP, +0.7 HP/s, −6% fire rate' },
  'powder_bandolier+scholars_kit': { id: 'engineers_manual', name: "Engineer's Manual", icon: '📘', maxLevel: 2,
    effectPerLevel: { activeCharges: 1, xpMult: 0.08, moveSpeedMult: -0.06 },
    desc: '+1 charge, +8% XP, −6% move' },
};
```

- [ ] **Step 4: Implement `src/run/passives.ts`**

```ts
import { EquippedPassive, PassiveDef, RunStats } from '../game/types';
import { PASSIVES, PASSIVE_FUSIONS } from './passiveData';

export const MAX_PASSIVE_SLOTS = 2;

export function passiveDefOf(p: EquippedPassive): PassiveDef {
  return p.hybrid ?? PASSIVES[p.id];
}

export function addPassive(eq: EquippedPassive[], id: string): EquippedPassive[] {
  if (eq.length >= MAX_PASSIVE_SLOTS || eq.some((p) => p.id === id)) return eq;
  return [...eq, { id, level: 1 }];
}

export function levelPassive(eq: EquippedPassive[], id: string): EquippedPassive[] {
  return eq.map((p) =>
    p.id === id ? { ...p, level: Math.min(p.level + 1, passiveDefOf(p).maxLevel) } : p,
  );
}

/** Both passives maxed + authored pair ⇒ the fused loadout (one hybrid, slot freed); else null. */
export function fusePassives(eq: EquippedPassive[]): EquippedPassive[] | null {
  if (eq.length !== 2) return null;
  if (eq.some((p) => p.level < passiveDefOf(p).maxLevel)) return null;
  const key = [eq[0].id, eq[1].id].sort().join('+');
  const hybrid = PASSIVE_FUSIONS[key];
  if (!hybrid) return null;
  return [{ id: hybrid.id, level: 1, hybrid }];
}

/**
 * RECOMPUTE model (not incremental): passives with negative axes can be swapped/fused away,
 * so stats always rebuild from the run's base (civ modifiers) + current passives.
 * `hpRatio` (0..1) preserves current health through maxHp changes.
 */
export function recomputeStats(
  base: RunStats, eq: EquippedPassive[], hpRatio: number,
): RunStats {
  let { damageMult, fireRateMult, moveSpeedMult, pickupRadius, maxHp, regenHps, xpMult, activeCharges } = base;
  for (const p of eq) {
    const def = passiveDefOf(p), e = def.effectPerLevel, lv = p.level;
    damageMult += (e.damageMult ?? 0) * lv;
    fireRateMult += (e.fireRateMult ?? 0) * lv;
    moveSpeedMult += (e.moveSpeedMult ?? 0) * lv;
    pickupRadius += (e.pickupRadius ?? 0) * lv;
    maxHp += (e.maxHp ?? 0) * lv;
    regenHps += (e.regenHps ?? 0) * lv;
    xpMult += (e.xpMult ?? 0) * lv;
    activeCharges += (e.activeCharges ?? 0) * lv;
  }
  maxHp = Math.max(1, Math.round(maxHp));
  const clamp = (v: number) => Math.max(0.1, v);
  return {
    ...base,
    damageMult: clamp(damageMult), fireRateMult: clamp(fireRateMult),
    moveSpeedMult: clamp(moveSpeedMult), pickupRadius: Math.max(10, pickupRadius),
    maxHp, hp: Math.max(1, Math.round(maxHp * hpRatio)),
    regenHps: Math.max(0, regenHps), xpMult: clamp(xpMult),
    activeCharges: Math.max(0, Math.round(activeCharges)),
  };
}
```

- [ ] **Step 5: Run tests, commit**

Run: `npm test -- passives` → Expected: PASS (6 tests). Then `npm run build` → PASS.

```bash
git add src/run/passives.ts src/run/passiveData.ts src/game/types.ts tests/passives.test.ts
git commit -m "feat(RC-031): tradeoff passives — 2 slots, recompute model, rare fusions"
```

---

## Task 6: Draft v2 — fusion-first generator (pure)

**Files:**
- Rewrite: `src/run/draft.ts`
- Test: `tests/draft2.test.ts` (new; delete obsolete `tests/draft.test.ts` cases for PERKS)
- Modify: `src/run/weapons.ts` (delete the temporary draft re-export from Task 4)

- [ ] **Step 1: Write the failing tests**

Create `tests/draft2.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { draftOptions, rollDraft, DraftContext } from '../src/run/draft';
import { WEAPONS } from '../src/run/weaponData';
import { fuseWeapons } from '../src/run/fusion';

const ctx = (over: Partial<DraftContext>): DraftContext => ({
  equipped: [{ id: 'club', level: 1 }],
  passives: [],
  kitPool: ['club', 'bronze_spear', 'gladius', 'javelin'],
  catalysts: 0,
  ...over,
});

describe('draft v2', () => {
  it('offers fusion FIRST when both weapons are maxed', () => {
    const c = ctx({ equipped: [{ id: 'club', level: 2 }, { id: 'bronze_spear', level: 2 }] });
    const opts = draftOptions(c);
    expect(opts[0]).toEqual({ kind: 'fuseWeapons', early: false });
  });

  it('offers EARLY fusion when a catalyst is held and weapons are not maxed', () => {
    const c = ctx({
      equipped: [{ id: 'club', level: 1 }, { id: 'bronze_spear', level: 1 }], catalysts: 1,
    });
    expect(draftOptions(c)[0]).toEqual({ kind: 'fuseWeapons', early: true });
  });

  it('no fusion offer with one weapon, or when bases would exceed the cap', () => {
    expect(draftOptions(ctx({})).some((o) => o.kind === 'fuseWeapons')).toBe(false);
    const triple = fuseWeapons(
      { def: fuseWeapons({ def: WEAPONS.club, level: 2 }, { def: WEAPONS.bronze_spear, level: 2 }), level: 1 },
      { def: WEAPONS.sawblade, level: 1 },
    );
    const c = ctx({ equipped: [
      { id: triple.id, level: triple.maxLevel, hybrid: triple },
      { id: 'gladius', level: 3 },
    ]});
    // 3 bases + gladius's 1 = over MAX_BASES → no offer even though both are maxed
    expect(draftOptions(c).some((o) => o.kind === 'fuseWeapons')).toBe(false);
  });

  it('newWeapon offers only kit weapons; swap variants name the replaced weapon', () => {
    const c = ctx({ equipped: [{ id: 'club', level: 1 }, { id: 'bronze_spear', level: 1 }] });
    const news = draftOptions(c).filter((o) => o.kind === 'newWeapon') as any[];
    for (const o of news) {
      expect(c.kitPool).toContain(o.weaponId);
      expect(['club', 'bronze_spear']).toContain(o.replaceId); // both slots full ⇒ swaps only
    }
  });

  it('rollDraft pins an eligible fusion as the first card and never duplicates options', () => {
    const c = ctx({ equipped: [{ id: 'club', level: 2 }, { id: 'bronze_spear', level: 2 }] });
    const picks = rollDraft(() => 0.42, 3, c);
    expect(picks[0].kind).toBe('fuseWeapons');
    expect(new Set(picks.map((p) => JSON.stringify(p))).size).toBe(picks.length);
  });

  it('passive offers respect slots and maxLevel', () => {
    const c = ctx({ passives: [{ id: 'whetstone', level: 3 }, { id: 'oxhide', level: 1 }] });
    const opts = draftOptions(c);
    expect(opts.some((o) => o.kind === 'newPassive')).toBe(false);      // slots full
    expect(opts.some((o) => o.kind === 'levelPassive' && (o as any).passiveId === 'whetstone')).toBe(false); // maxed
    expect(opts.some((o) => o.kind === 'levelPassive' && (o as any).passiveId === 'oxhide')).toBe(true);
  });
});
```

Run: `npm test -- draft2` → Expected: FAIL.

- [ ] **Step 2: Rewrite `src/run/draft.ts`**

```ts
import { EquippedPassive, WeaponDef } from '../game/types';
import { EquippedWeapon, defOf } from './weapons';
import { WEAPONS } from './weaponData';
import { canFuse } from './fusion';
import { MAX_PASSIVE_SLOTS, passiveDefOf, fusePassives } from './passives';
import { PASSIVES } from './passiveData';

// RC-031 draft v2 (spec §4): fusion offers lead; everything else is a weighted sidegrade mix.
// No strictly-weaker offers by construction — the kit is player-chosen and same-age weapons
// are budget sidegrades, so swaps are lateral.

export type DraftOption =
  | { kind: 'fuseWeapons'; early: boolean }
  | { kind: 'fusePassives' }
  | { kind: 'newWeapon'; weaponId: string; replaceId?: string }
  | { kind: 'levelWeapon'; weaponId: string }
  | { kind: 'newPassive'; passiveId: string }
  | { kind: 'levelPassive'; passiveId: string };

export interface DraftContext {
  equipped: EquippedWeapon[];
  passives: EquippedPassive[];
  kitPool: string[];   // Expedition Kit weapon ids (RunModifiers.weapons)
  catalysts: number;   // held fusion catalysts (mini-boss drops)
  defs?: Record<string, WeaponDef>; // injectable for tests
}

const ROLL_WEIGHT: Record<DraftOption['kind'], number> = {
  fuseWeapons: 0, fusePassives: 0, // pinned, never rolled
  levelWeapon: 3, newWeapon: 2, newPassive: 2, levelPassive: 2,
};

/** All currently-valid options. Pinned fusion offers (if any) come first, in order. */
export function draftOptions(ctx: DraftContext): DraftOption[] {
  const defs = ctx.defs ?? WEAPONS;
  const opts: DraftOption[] = [];

  // Weapon fusion: both slots held, bases within cap, and (both maxed | catalyst in hand).
  if (ctx.equipped.length === 2) {
    const [a, b] = ctx.equipped.map((w) => defOf(w, defs));
    if (canFuse(a, b)) {
      const bothMaxed = ctx.equipped.every((w) => w.level >= defOf(w, defs).maxLevel);
      if (bothMaxed) opts.push({ kind: 'fuseWeapons', early: false });
      else if (ctx.catalysts > 0) opts.push({ kind: 'fuseWeapons', early: true });
    }
  }
  // Passive fusion (rare by construction: needs both maxed AND an authored pair).
  if (fusePassives(ctx.passives)) opts.push({ kind: 'fusePassives' });

  // New/swap weapons from the kit.
  for (const id of ctx.kitPool) {
    if (ctx.equipped.some((w) => w.id === id)) continue;
    if (!defs[id]) continue;
    if (ctx.equipped.length < 2) opts.push({ kind: 'newWeapon', weaponId: id });
    else for (const held of ctx.equipped) {
      opts.push({ kind: 'newWeapon', weaponId: id, replaceId: held.id });
    }
  }
  // Level-ups.
  for (const w of ctx.equipped) {
    if (w.level < defOf(w, defs).maxLevel) opts.push({ kind: 'levelWeapon', weaponId: w.id });
  }
  // Passives.
  if (ctx.passives.length < MAX_PASSIVE_SLOTS) {
    for (const id of Object.keys(PASSIVES)) {
      if (!ctx.passives.some((p) => p.id === id)) opts.push({ kind: 'newPassive', passiveId: id });
    }
  }
  for (const p of ctx.passives) {
    if (p.level < passiveDefOf(p).maxLevel) opts.push({ kind: 'levelPassive', passiveId: p.id });
  }
  return opts;
}

/** Roll `count` cards: pinned fusion offers always lead; the rest are weight-rolled, no dupes. */
export function rollDraft(rng: () => number, count: number, ctx: DraftContext): DraftOption[] {
  const all = draftOptions(ctx);
  const pinned = all.filter((o) => o.kind === 'fuseWeapons' || o.kind === 'fusePassives');
  const pool = all.filter((o) => !pinned.includes(o));
  const out: DraftOption[] = [...pinned].slice(0, count);
  while (out.length < count && pool.length > 0) {
    const total = pool.reduce((s, o) => s + ROLL_WEIGHT[o.kind], 0);
    if (total <= 0) break;
    let r = rng() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= ROLL_WEIGHT[pool[i].kind];
      if (r <= 0) { idx = i; break; }
    }
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}
```

Delete the old `PERKS`/`applyPerk`/`rollDraft(perks)` exports — RunScene still imports them at this point, so ALSO apply the minimal RunScene patch now: remove the `applyPerk` import and the `case 'perk'` from `draftLabel`/`draftDescription`/`applyDraftOption`, and switch `renderDraft` to the new signature:

```ts
const picks = rollDraft(() => Math.random(), this.mods.draftChoices, {
  equipped: this.equipped,
  passives: this.passives,        // new field: private passives: EquippedPassive[] = [];
  kitPool: this.mods.weapons,
  catalysts: this.catalysts,      // new field: private catalysts = 0;
});
```

with a temporary minimal `applyDraftOption` v2 (full card UI lands in Task 10):

```ts
private applyDraftOption(o: DraftOption) {
  switch (o.kind) {
    case 'fuseWeapons': {
      const [a, b] = this.equipped;
      const hybrid = fuseWeapons(
        { def: defOf(a), level: a.level }, { def: defOf(b), level: b.level },
      );
      if (o.early) this.catalysts = Math.max(0, this.catalysts - 1);
      this.equipped = equipHybrid(hybrid);
      this.weaponCooldowns = {};
      break;
    }
    case 'fusePassives':
      this.passives = fusePassives(this.passives) ?? this.passives;
      this.refreshStatsFromPassives();
      break;
    case 'newWeapon':
      this.equipped = o.replaceId
        ? swapWeapon(this.equipped, o.replaceId, o.weaponId)
        : addWeapon(this.equipped, o.weaponId);
      break;
    case 'levelWeapon': this.equipped = levelWeapon(this.equipped, o.weaponId); break;
    case 'newPassive':  this.passives = addPassive(this.passives, o.passiveId); this.refreshStatsFromPassives(); break;
    case 'levelPassive': this.passives = levelPassive(this.passives, o.passiveId); this.refreshStatsFromPassives(); break;
  }
}

/** Rebuild stats from the run's base whenever passives change (recompute model). */
private refreshStatsFromPassives() {
  const ratio = this.stats.hp / this.stats.maxHp;
  this.stats = recomputeStats(this.baseStats, this.passives, ratio);
}
```

`baseStats` = snapshot the initial `RunStats` built in `create()` (store `this.baseStats = { ...this.stats }` right after it's first assembled). The firing loop changes from `WEAPONS[w.id]` to `defOf(w)`:

```ts
const shot = weaponShot(defOf(w), w.level, this.stats.damageMult);
```

`draftLabel`/`draftDescription` minimal v2 (Task 10 styles them properly):

```ts
private draftLabel(o: DraftOption): string {
  switch (o.kind) {
    case 'fuseWeapons': return o.early
      ? '⚗️ FUSE NOW (catalyst — weaker hybrid)'
      : `⚒️ FUSE: ${defOf(this.equipped[0]).name} + ${defOf(this.equipped[1]).name}`;
    case 'fusePassives': return '⚗️ Fuse passives';
    case 'newWeapon': return o.replaceId
      ? `Swap ${defOf(this.equipped.find((w) => w.id === o.replaceId)!).name} → ${WEAPONS[o.weaponId].name}`
      : `New weapon: ${WEAPONS[o.weaponId].name}`;
    case 'levelWeapon': {
      const w = this.equipped.find((x) => x.id === o.weaponId)!;
      return `Upgrade: ${defOf(w).name} (Lv ${w.level}→${Math.min(w.level + 1, defOf(w).maxLevel)})`;
    }
    case 'newPassive': return `${PASSIVES[o.passiveId].icon} ${PASSIVES[o.passiveId].name}`;
    case 'levelPassive': {
      const p = this.passives.find((x) => x.id === o.passiveId)!;
      return `${passiveDefOf(p).icon} ${passiveDefOf(p).name} (Lv ${p.level}→${p.level + 1})`;
    }
  }
}
private draftDescription(o: DraftOption): string {
  switch (o.kind) {
    case 'fuseWeapons': return fusionName(
      [...new Set([...resolveShape(defOf(this.equipped[0])).bases, ...resolveShape(defOf(this.equipped[1])).bases])],
    );
    case 'fusePassives': return 'Merge both passives into one — frees a slot';
    case 'newWeapon': return weaponStatText(WEAPONS[o.weaponId]);
    case 'levelWeapon': return weaponLevelGainText(defOf(this.equipped.find((w) => w.id === o.weaponId)!));
    case 'newPassive': return PASSIVES[o.passiveId].desc;
    case 'levelPassive': return passiveDefOf(this.passives.find((p) => p.id === o.passiveId)!).desc;
  }
}
```

- [ ] **Step 3: Verify + commit**

Run: `npm test && npm run build` → Expected: PASS. `npm run dev`: drafts now show fusion/passive/weapon cards; fusing two maxed weapons produces a hybrid that fires.

```bash
git add -A
git commit -m "feat(RC-031): draft v2 — fusion-first weighted generator + scene flip"
```

---

## Task 7: Active items (pure) + civ wiring

**Files:**
- Create: `src/run/activeData.ts`, `src/run/actives.ts`
- Modify: `src/run/modifiers.ts`, `src/tech/techData.ts`, `src/game/config.ts`
- Test: `tests/actives.test.ts`, extend `tests/modifiers.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/actives.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ACTIVES } from '../src/run/activeData';
import { resolveActiveItem } from '../src/run/actives';

describe('actives', () => {
  it('defines the three age-flavored actives', () => {
    expect(ACTIVES.net.effect.kind).toBe('slow');
    expect(ACTIVES.poison_gas.effect.kind).toBe('dot');
    expect(ACTIVES.grenade_volley.effect.kind).toBe('burst');
  });
  it('resolveActiveItem: chosen item must be unlocked, else first unlocked, else undefined', () => {
    expect(resolveActiveItem('poison_gas', ['net', 'poison_gas'])).toBe('poison_gas');
    expect(resolveActiveItem('grenade_volley', ['net'])).toBe('net');
    expect(resolveActiveItem(undefined, [])).toBeUndefined();
  });
});
```

In `tests/modifiers.test.ts` add:

```ts
it('collects tech-granted actives and validates the chosen one', () => {
  const civ = { ...newCivState(), researched: ['hunting', 'guilds'], activeItem: 'poison_gas' };
  const mods = computeRunModifiers(civ);
  expect(mods.actives).toEqual(expect.arrayContaining(['net', 'poison_gas']));
  expect(mods.activeItem).toBe('poison_gas');
});
```

Run: `npm test -- actives` → FAIL.

- [ ] **Step 2: Implement `src/run/activeData.ts` + `src/run/actives.ts`**

`activeData.ts`:

```ts
// RC-031 active items (spec §1): right-click, 1 charge/run base, tech-unlocked, picked pre-run.
export type ActiveEffect =
  | { kind: 'slow'; radius: number; durationMs: number; pct: number }
  | { kind: 'dot'; radius: number; durationMs: number; dps: number }
  | { kind: 'burst'; radius: number; count: number; damage: number };

export interface ActiveDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  effect: ActiveEffect;
}

export const ACTIVES: Record<string, ActiveDef> = {
  net:            { id: 'net', name: 'Hunting Net', icon: '🕸️',
    desc: 'Slows enemies in an area by 60% for 4s',
    effect: { kind: 'slow', radius: 160, durationMs: 4000, pct: 0.6 } },
  poison_gas:     { id: 'poison_gas', name: 'Poison Gas', icon: '☠️',
    desc: 'Lingering cloud — 14 dmg/s for 8s',
    effect: { kind: 'dot', radius: 140, durationMs: 8000, dps: 14 } },
  grenade_volley: { id: 'grenade_volley', name: 'Grenade Volley', icon: '💣',
    desc: '3 blasts of 50 dmg in an area',
    effect: { kind: 'burst', radius: 70, count: 3, damage: 50 } },
};
```

`actives.ts`:

```ts
import { ACTIVES } from './activeData';

export const BASE_ACTIVE_CHARGES = 1;

/** The run's active item: the chosen one if unlocked, else the first unlocked, else none. */
export function resolveActiveItem(chosen: string | undefined, unlocked: string[]): string | undefined {
  if (chosen && unlocked.includes(chosen) && ACTIVES[chosen]) return chosen;
  return unlocked.find((id) => ACTIVES[id]);
}
```

- [ ] **Step 3: Wire techs + modifiers**

`src/tech/techData.ts` — add `actives` to three existing techs' `runBonus` (create `runBonus` where absent):
- `hunting` (stone): `runBonus: { ...existing, actives: ['net'] }`
- `guilds` (medieval): `runBonus: { weapons: ['flail'], actives: ['poison_gas'] }`
- `gunpowder` (renaissance): `runBonus: { weapons: ['musket'], actives: ['grenade_volley'] }`

`src/run/modifiers.ts` — in `computeRunModifiers`: collect `actives` exactly like `weapons` (a `Set` fed by tech AND building `runBonus.actives ?? []`), then:

```ts
const activeItem = resolveActiveItem(civ.activeItem, [...actives]);
return { ..., actives: [...actives], activeItem };
```

In `src/game/config.ts` add `export const BASE_ACTIVES: string[] = [];` and seed the Set with it (symmetry with `BASE_WEAPONS`).

- [ ] **Step 4: Verify + commit**

Run: `npm test && npm run build` → PASS.

```bash
git add -A
git commit -m "feat(RC-031): active items — defs, tech unlocks, modifier wiring"
```

---

## Task 8: New trajectory math (pure)

**Files:**
- Modify: `src/run/projectileMotion.ts`
- Test: extend `tests/projectileMotion.test.ts`

- [ ] **Step 1: Write the failing tests** (append to `tests/projectileMotion.test.ts`)

```ts
import {
  boomerangVelocity, BOOMERANG_OUT_MS, homingVelocity, HOMING_TURN_RAD_S,
  chainNextTarget, CHAIN_RANGE, CHAIN_FALLOFF,
  TRAIL_DROP_MS, TRAIL_LINGER_MS, TRAIL_RADIUS, ZONE_TICK_MS, SLOW_MS,
} from '../src/run/projectileMotion';

describe('RC-031 trajectories', () => {
  it('boomerang: flies along aim while out, then steers back to the player', () => {
    const out = boomerangVelocity('out', 1, 0, 0, 0, 100, 100, 300);
    expect(out.vx).toBeCloseTo(300); expect(out.vy).toBeCloseTo(0);
    const back = boomerangVelocity('return', 1, 0, 0, 0, 100, 0, 300);
    expect(back.vx).toBeLessThan(0); // heading back toward player at origin
  });

  it('homing: turn rate caps the heading change per tick', () => {
    // moving +x, target straight up: with a tiny dt the new heading must rotate by ≤ turnRate*dt
    const v = homingVelocity(300, 0, 0, 0, 0, -100, 300, 16);
    const angle = Math.atan2(v.vy, v.vx);
    expect(Math.abs(angle)).toBeLessThanOrEqual(HOMING_TURN_RAD_S * (16 / 1000) + 1e-6);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(300, 0); // speed preserved
  });

  it('chain: picks the nearest unhit enemy in range, or null', () => {
    const enemies = [
      { id: 'a', x: 50, y: 0 }, { id: 'b', x: 120, y: 0 }, { id: 'c', x: 999, y: 0 },
    ];
    expect(chainNextTarget(enemies, 0, 0, new Set(['a']), CHAIN_RANGE)?.id).toBe('b');
    expect(chainNextTarget(enemies, 0, 0, new Set(['a', 'b']), CHAIN_RANGE)).toBeNull();
    expect(CHAIN_FALLOFF).toBeGreaterThan(0.5); // hops stay meaningful
  });

  it('feel constants exist and are sane', () => {
    for (const c of [TRAIL_DROP_MS, TRAIL_LINGER_MS, TRAIL_RADIUS, ZONE_TICK_MS, SLOW_MS]) {
      expect(c).toBeGreaterThan(0);
    }
  });
});
```

Run: `npm test -- projectileMotion` → FAIL.

- [ ] **Step 2: Implement** (append to `src/run/projectileMotion.ts`)

```ts
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
  return { vx: (dx / d) * speed * 1.15, vy: (dy / d) * speed * 1.15 }; // returns slightly faster
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
```

- [ ] **Step 3: Run, then commit**

`npm test -- projectileMotion` → PASS.

```bash
git add src/run/projectileMotion.ts tests/projectileMotion.test.ts
git commit -m "feat(RC-031): boomerang/homing/chain/trail/zone motion math"
```

---

## Task 9: RunScene firing + hit pipeline v2

**Files:**
- Modify: `src/scenes/RunScene.ts` (`fireWeapon`, `update`, the bullet–enemy hit handler, `updateEnemyMovement`, `detonate`)

No new pure logic here — this task renders Task 8's math. Locate the bullet–enemy overlap handler first: `grep -n "pierce" src/scenes/RunScene.ts` (it decrements pierce and destroys the bullet when exhausted).

- [ ] **Step 1: Generalize `detonate` and add field patches**

`detonate(x, y, damage, radius = LOB_BLAST)` — add the radius param; existing callers unchanged.

Add scene state + a patch helper (trail and zone share it):

```ts
private patches: Array<{
  x: number; y: number; bornMs: number; lingerMs: number; radius: number;
  tickDamage: number; lastTick: Map<any, number>; gfx: Phaser.GameObjects.Arc; tint: number;
}> = [];

/** Spawn a lingering damage field (trail patch / zone). tickDamage applies per ZONE_TICK_MS per enemy. */
private spawnPatch(x: number, y: number, radius: number, lingerMs: number, tickDamage: number, tint: number) {
  const gfx = this.add.circle(x, y, radius, tint, 0.28).setDepth(6);
  this.patches.push({ x, y, bornMs: this.elapsed, lingerMs, radius, tickDamage, lastTick: new Map(), gfx, tint });
}
```

In `update()` (next to the lob loop), tick patches:

```ts
for (let i = this.patches.length - 1; i >= 0; i--) {
  const p = this.patches[i];
  const age = this.elapsed - p.bornMs;
  if (age >= p.lingerMs) { p.gfx.destroy(); this.patches.splice(i, 1); continue; }
  p.gfx.setAlpha(0.28 * (1 - age / p.lingerMs) + 0.08);
  (this.enemies.getChildren() as any[]).forEach((e) => {
    if (!e.active || !withinRadius(p.x, p.y, e.x, e.y, p.radius)) return;
    const last = p.lastTick.get(e) ?? -Infinity;
    if (this.elapsed - last >= ZONE_TICK_MS) {
      p.lastTick.set(e, this.elapsed);
      this.applyDamageToEnemy(e, p.tickDamage);
    }
  });
}
```

- [ ] **Step 2: Dispatch the new trajectories in `fireWeapon`**

Replace the head of `fireWeapon` with a trajectory switch:

```ts
private fireWeapon(shot: WeaponShot, weaponId: string) {
  switch (shot.trajectory) {
    case 'orbit': this.summonOrbit(shot, weaponId); return;
    case 'lob':   playSfx('shoot'); this.fireLob(shot); return;       // zone lands → spawnPatch via lob landing
    case 'trail': this.dropTrailPatch(shot); return;                  // no projectile at all
    default: break; // straight / boomerang / homing fire projectiles below
  }
  playSfx('shoot');
  const target = this.nearestEnemy() as any;
  const baseAngle = target
    ? Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y)
    : -Math.PI / 2;
  for (let i = 0; i < shot.count; i++) {
    const offset = shot.count > 1 ? (i - (shot.count - 1) / 2) * (shot.spread / (shot.count - 1)) : 0;
    const angle = baseAngle + offset;
    const bullet = this.add.image(this.player.x, this.player.y, shot.sprite) as any;
    bullet.setDisplaySize(12 * RUN_SCALE, 12 * RUN_SCALE);
    this.physics.add.existing(bullet);
    this.bullets.add(bullet);
    bullet.setData('damage', shot.damage);
    bullet.setData('onHit', shot.onHit);
    bullet.setData('pierce', shot.onHit.pierce ?? 0);
    bullet.setData('hitIds', new Set<string>());
    bullet.setData('trajectory', shot.trajectory);
    if (shot.trajectory === 'boomerang') {
      bullet.setData('phase', 'out');
      bullet.setData('aim', { x: Math.cos(angle), y: Math.sin(angle) });
      bullet.setData('bornMs', this.elapsed);
    }
    bullet.body.setVelocity(Math.cos(angle) * shot.speed * RUN_SCALE, Math.sin(angle) * shot.speed * RUN_SCALE);
    if (shot.trajectory !== 'boomerang') this.time.delayedCall(shot.lifeMs, () => bullet.destroy());
  }
}

/** Trail weapons burn the ground behind you — a patch at your feet each cooldown. */
private dropTrailPatch(shot: WeaponShot) {
  this.spawnPatch(this.player.x, this.player.y, TRAIL_RADIUS * RUN_SCALE,
    TRAIL_LINGER_MS, shot.damage, 0xff7733);
}
```

In `fireLob`'s landing resolution (where `t >= 1` calls `detonate`): when the shot's `onHit.zoneMs` is set, also `this.spawnPatch(lob.target.x, lob.target.y, ZONE_RADIUS * RUN_SCALE, onHit.zoneMs, lob.damage * 0.4, 0x99cc33)`. Thread `onHit` onto the lob record in `fireLob` (`onHit: shot.onHit`), and use `detonate(x, y, damage, (onHit.explode ?? LOB_BLAST) * RUN_SCALE)`.

- [ ] **Step 3: Steer boomerang + homing in `update()`**

Next to the orbit block:

```ts
(this.bullets.getChildren() as any[]).forEach((b) => {
  const traj = b.getData('trajectory');
  if (traj === 'boomerang') {
    let phase = b.getData('phase');
    if (phase === 'out' && this.elapsed - b.getData('bornMs') >= BOOMERANG_OUT_MS) {
      phase = 'return'; b.setData('phase', phase);
    }
    const aim = b.getData('aim');
    const v = boomerangVelocity(phase, aim.x, aim.y, this.player.x, this.player.y, b.x, b.y, b.getData('speed') ?? 300 * RUN_SCALE);
    b.body.setVelocity(v.vx, v.vy);
    if (phase === 'return' && Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y) < 24 * RUN_SCALE) b.destroy();
  } else if (traj === 'homing') {
    const t = this.nearestEnemy() as any;
    if (t) {
      const v = homingVelocity(b.body.velocity.x, b.body.velocity.y, b.x, b.y, t.x, t.y, b.getData('speed') ?? 360 * RUN_SCALE, dt);
      b.body.setVelocity(v.vx, v.vy);
    }
  }
});
```

Set `bullet.setData('speed', shot.speed * RUN_SCALE)` in `fireWeapon` so both branches read it.

- [ ] **Step 4: Extend the hit handler (chain, explode, slow, per-bullet hit memory)**

In the existing bullet–enemy overlap handler, after damage is applied and BEFORE the pierce-decrement/destroy logic, add:

```ts
const onHit = (bullet.getData('onHit') ?? {}) as OnHit;
const hitIds = bullet.getData('hitIds') as Set<string>;
hitIds?.add(enemy.getData('uid') ?? String(enemy.name || enemy.x + ',' + enemy.y));

if (onHit.explode) this.detonate(enemy.x, enemy.y, bullet.getData('damage') * 0.6, onHit.explode * RUN_SCALE);
if (onHit.slowPct) { enemy.setData('slowPct', onHit.slowPct); enemy.setData('slowUntil', this.elapsed + SLOW_MS); }
if (onHit.chain) {
  const hops = bullet.getData('hopsLeft') ?? onHit.chain;
  if (hops > 0) {
    const candidates = (this.enemies.getChildren() as any[])
      .filter((e) => e.active)
      .map((e) => ({ id: e.getData('uid'), x: e.x, y: e.y }));
    const next = chainNextTarget(candidates, enemy.x, enemy.y, hitIds, CHAIN_RANGE * RUN_SCALE);
    if (next) {
      bullet.setData('hopsLeft', hops - 1);
      bullet.setData('damage', bullet.getData('damage') * CHAIN_FALLOFF);
      const ang = Phaser.Math.Angle.Between(enemy.x, enemy.y, next.x, next.y);
      const spd = bullet.getData('speed');
      bullet.body.setVelocity(Math.cos(ang) * spd, Math.sin(ang) * spd);
      return; // chain hop keeps the bullet alive regardless of pierce
    }
  }
}
```

Give every enemy a uid in `spawnEnemyAt`: `enemy.setData('uid', `e${++this.enemyUidCounter}`)` (new private counter). Read `ignoresArmor` from `onHit.ignoreArmor` where armor is checked.

In `updateEnemyMovement`, before applying velocity, scale by slow:

```ts
const slowed = enemy.getData('slowUntil') > this.elapsed ? 1 - (enemy.getData('slowPct') ?? 0) : 1;
// multiply the final speed passed to the movement math by `slowed`
```

- [ ] **Step 5: Regen tick (passives) while you're in `update()`**

```ts
if (this.stats.regenHps > 0 && this.stats.hp < this.stats.maxHp) {
  this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + this.stats.regenHps * (dt / 1000));
}
```

And apply `xpMult` in `gainXp`: `const r = addXp(this.stats, Math.round(amount * this.stats.xpMult));`

- [ ] **Step 6: Verify + commit**

`npm test && npm run build` → PASS. `npm run dev`: sawblade returns, tesla chains, dynamite leaves fields, flame_jet burns a trail behind movement, rpg curves.

```bash
git add -A
git commit -m "feat(RC-031): RunScene v2 — trail/zone/chain/boomerang/homing + slow/explode on-hit"
```

---

## Task 10: Draft overlay v2 + loadout HUD + fusion celebration

**Files:**
- Modify: `src/scenes/RunScene.ts` (`renderDraft`, fusion celebration, HUD)

- [ ] **Step 1: Tradeoff-aware draft cards**

In `renderDraft`, color the description line by content: fusion cards gold (`0x8a6d1a` bg, `#ffd75e` text), passive cards with their tradeoff desc split into `+` part (`#9fe6a0`) and `−` part (`#ff9f9f`) — render two side-by-side texts instead of one `sub`; weapon swaps show BOTH stat lines (`current → offered`):

```ts
case 'newWeapon': if (o.replaceId) {
  const cur = this.equipped.find((w) => w.id === o.replaceId)!;
  return `${weaponStatText(defOf(cur))}  →  ${weaponStatText(WEAPONS[o.weaponId])}`;
}
```

- [ ] **Step 2: Fusion celebration (spec §5)**

In `applyDraftOption` `case 'fuseWeapons'`, after equipping the hybrid:

```ts
this.cameras.main.flash(420, 255, 215, 90);
this.cameras.main.shake(180, 0.008);
playSfx('age-up'); // reuse the celebration cue until a bespoke 'fuse' recipe lands
const banner = this.add.text(this.scale.width / 2, this.scale.height * 0.3,
  `⚒️ ${hybrid.name}`, { fontSize: '40px', color: '#ffd75e', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 },
).setOrigin(0.5).setDepth(60).setScale(0.3).setAlpha(0);
this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
this.tweens.add({ targets: banner, alpha: 0, delay: 1500, duration: 600, onComplete: () => banner.destroy() });
```

- [ ] **Step 3: Loadout HUD line**

Extend the HUD text with the loadout: weapon names + levels, passive icons + levels, active icon + charges, catalysts:

Add the field `private activeId?: string` NOW (it stays `undefined` until Task 11 wires it from `this.mods.activeItem`) so this HUD line compiles in this task:

```ts
const loadout = this.equipped.map((w) => `${defOf(w).name} L${w.level}`).join(' | ');
const passiveStr = this.passives.map((p) => `${passiveDefOf(p).icon}${p.level}`).join('');
const activeStr = this.activeId ? `${ACTIVES[this.activeId].icon}×${this.stats.activeCharges}` : '';
const catalystStr = this.catalysts > 0 ? `⚗️×${this.catalysts}` : '';
// append as a second HUD line
```

- [ ] **Step 4: Verify + commit**

`npm run build && npm test` → PASS; `npm run dev`: cards show tradeoff colors, fusing flashes the banner, HUD shows loadout.

```bash
git add -A
git commit -m "feat(RC-031): draft overlay v2, loadout HUD, fusion celebration"
```

---

## Task 11: Active item in the scene (right-click)

**Files:**
- Modify: `src/scenes/RunScene.ts`

- [ ] **Step 1: State + input**

In `create()`:

```ts
this.activeId = this.mods.activeItem;            // private activeId?: string
this.stats.activeCharges = this.activeId ? BASE_ACTIVE_CHARGES : 0;
this.baseStats = { ...this.stats };              // AFTER charges so passives recompute on top
this.input.mouse?.disableContextMenu();
this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
  if (p.rightButtonDown()) this.useActive(p.worldX, p.worldY);
});
```

- [ ] **Step 2: The three effects**

```ts
private useActive(x: number, y: number) {
  if (!this.activeId || this.stats.activeCharges <= 0 || this.paused || this.ceremony) return;
  this.stats.activeCharges -= 1;
  const def = ACTIVES[this.activeId];
  playSfx('draft-open'); // placeholder cue; bespoke recipe optional later
  const e = def.effect;
  if (e.kind === 'slow') {
    const ring = this.add.circle(x, y, e.radius * RUN_SCALE, 0x66ccff, 0.25).setDepth(7);
    this.tweens.add({ targets: ring, alpha: 0, duration: e.durationMs, onComplete: () => ring.destroy() });
    (this.enemies.getChildren() as any[]).forEach((en) => {
      if (en.active && withinRadius(x, y, en.x, en.y, e.radius * RUN_SCALE)) {
        en.setData('slowPct', e.pct);
        en.setData('slowUntil', this.elapsed + e.durationMs);
      }
    });
  } else if (e.kind === 'dot') {
    this.spawnPatch(x, y, e.radius * RUN_SCALE, e.durationMs, e.dps * (ZONE_TICK_MS / 1000), 0x77dd55);
  } else { // burst
    for (let i = 0; i < e.count; i++) {
      const ang = (i / e.count) * Math.PI * 2;
      const bx = x + Math.cos(ang) * e.radius * 0.5 * RUN_SCALE;
      const by = y + Math.sin(ang) * e.radius * 0.5 * RUN_SCALE;
      this.time.delayedCall(i * 120, () => this.detonate(bx, by, e.damage * this.stats.damageMult, e.radius * RUN_SCALE));
    }
  }
}
```

- [ ] **Step 3: Verify + commit**

`npm run build && npm test` → PASS. Dev check: right-click spends a charge, charge count shows in HUD, `powder_bandolier` passive adds a charge via recompute.

```bash
git add -A
git commit -m "feat(RC-031): right-click active item — net/gas/volley effects"
```

---

## Task 12: Fusion catalysts from mini-bosses

**Files:**
- Modify: `src/run/bossEvent.ts`, `src/scenes/RunScene.ts`
- Test: extend `tests/bossEvent.test.ts`

- [ ] **Step 1: Pure drop decision** (test first, in `tests/bossEvent.test.ts`)

```ts
import { dropsCatalyst, CATALYST_DROP_CHANCE } from '../src/run/bossEvent';
it('catalyst drops are a pure rng threshold', () => {
  expect(dropsCatalyst(() => CATALYST_DROP_CHANCE - 0.01)).toBe(true);
  expect(dropsCatalyst(() => CATALYST_DROP_CHANCE + 0.01)).toBe(false);
});
```

Implement in `src/run/bossEvent.ts`:

```ts
export const CATALYST_DROP_CHANCE = 0.35; // RC-031: mini-boss jackpot sometimes adds a catalyst

/** RC-031 — whether this boss kill also drops a fusion catalyst (early-fuse token). */
export function dropsCatalyst(rng: () => number): boolean {
  return rng() < CATALYST_DROP_CHANCE;
}
```

- [ ] **Step 2: Scene wiring**

Where the boss jackpot pays out (the kill path that calls `bossJackpotGems`), add:

```ts
if (dropsCatalyst(() => Math.random())) {
  const tok = this.add.text(e.x, e.y, '⚗️', { fontSize: '28px' }).setOrigin(0.5).setDepth(30) as any;
  this.physics.add.existing(tok);
  this.physics.add.overlap(this.player, tok, () => {
    tok.destroy();
    this.catalysts += 1;
    playSfx('gem-pickup', { semitones: 12 });
  });
}
```

(`this.catalysts` already exists from Task 6 and already feeds `rollDraft`'s ctx and the HUD.)

- [ ] **Step 3: Verify + commit**

`npm test && npm run build` → PASS.

```bash
git add -A
git commit -m "feat(RC-031): mini-boss fusion catalysts — drop, pickup, early-fuse"
```

---

## Task 13: VFX kits + juice (squint test)

**Files:**
- Create: `src/run/vfxKits.ts`; Test: `tests/vfxKits.test.ts`
- Modify: `src/scenes/RunScene.ts`

- [ ] **Step 1: Kit data + merge (pure, test-first)**

`tests/vfxKits.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { VFX_KITS, kitForHybrid } from '../src/run/vfxKits';
import { ARCHETYPE_IDS } from '../src/run/archetypes';

describe('vfx kits', () => {
  it('every archetype owns a kit', () => {
    for (const id of ARCHETYPE_IDS) expect(VFX_KITS[id]).toBeDefined();
  });
  it('hybrid kit: body archetype keeps motion/shake, palette archetype donates tint/impact', () => {
    const k = kitForHybrid('piercer', 'trail');
    expect(k.shake).toBe(VFX_KITS.piercer.shake);
    expect(k.tint).toBe(VFX_KITS.trail.tint);
    expect(k.impact).toBe(VFX_KITS.trail.impact);
  });
});
```

`src/run/vfxKits.ts`:

```ts
import { ArchetypeId } from '../game/types';

// Spec §5 — each verb owns a screen signature. `shake`: 0 none, 1 light, 2 heavy.
export interface VfxKit {
  tint: number;                      // trail particle / palette color
  impact: 'flash' | 'ring' | 'sparks';
  shake: 0 | 1 | 2;
}

export const VFX_KITS: Record<ArchetypeId, VfxKit> = {
  bolt:      { tint: 0xffe9a8, impact: 'flash',  shake: 0 },
  piercer:   { tint: 0xc8e4ff, impact: 'sparks', shake: 0 },
  spread:    { tint: 0xffc9a8, impact: 'flash',  shake: 1 },
  orbiter:   { tint: 0xd9b8ff, impact: 'flash',  shake: 0 },
  lobber:    { tint: 0xffaa33, impact: 'ring',   shake: 2 },
  trail:     { tint: 0xff7733, impact: 'flash',  shake: 0 },
  zone:      { tint: 0x99cc33, impact: 'ring',   shake: 1 },
  chain:     { tint: 0x7df9ff, impact: 'sparks', shake: 0 },
  boomerang: { tint: 0xb8ffd0, impact: 'flash',  shake: 0 },
  homing:    { tint: 0xff8da8, impact: 'ring',   shake: 2 },
};

/** Hybrid identity (spec §5): body archetype keeps motion + shake; palette parent donates
 *  tint + impact, so a Dragonlance reads as spear-flight with flame bursts. */
export function kitForHybrid(body: ArchetypeId, palette: ArchetypeId): VfxKit {
  return { tint: VFX_KITS[palette].tint, impact: VFX_KITS[palette].impact, shake: VFX_KITS[body].shake };
}
```

- [ ] **Step 2: Scene juice**

In the hit handler, add for every damaging hit:

```ts
enemy.setTintFill(0xffffff);
this.time.delayedCall(60, () => enemy.active && enemy.clearTint());
const dmgTxt = this.add.text(enemy.x, enemy.y - 14, String(Math.round(dmg)), {
  fontSize: dmg >= 50 ? '18px' : '13px', color: dmg >= 50 ? '#ffd75e' : '#ffffff',
  stroke: '#000', strokeThickness: 3,
}).setOrigin(0.5).setDepth(35);
this.tweens.add({ targets: dmgTxt, y: dmgTxt.y - 22, alpha: 0, duration: 520, onComplete: () => dmgTxt.destroy() });
// micro-knockback away from the projectile
const kb = Phaser.Math.Angle.Between(bullet.x, bullet.y, enemy.x, enemy.y);
enemy.x += Math.cos(kb) * 4; enemy.y += Math.sin(kb) * 4;
```

Tint projectiles + trail/zone patches with the weapon's kit: in `fireWeapon`, resolve `const kit = this.kitFor(shotDef)` where `kitFor` returns `kitForHybrid(bodyArch, paletteArch)` for hybrids (`bases[0]` body = `def.archetype`, palette = first base ≠ body) and `VFX_KITS[def.archetype]` for base weapons; then `bullet.setTint(kit.tint)`, pass `kit.tint` to `spawnPatch`, and on impact run the kit's `impact` style + `shake` class (0 → none, 1 → `shake(80, 0.003)`, 2 → `shake(140, 0.006)`).

- [ ] **Step 3: Verify + commit**

`npm test && npm run build` → PASS. Dev squint test: with two different archetypes equipped you can tell which is firing with the HUD covered.

```bash
git add -A
git commit -m "feat(RC-031): VFX kits — per-verb tint/impact/shake + hit juice"
```

---

## Task 14: Save v4 — kit/active persisted, reset on bump (pure)

**Files:**
- Modify: `src/state/saveLoad.ts`, `src/state/civState.ts`
- Create: `src/run/kit.ts` (kit validation) + tests in `tests/kit.test.ts`, update `tests/civState.test.ts` / save tests

- [ ] **Step 1: Tests first**

`tests/kit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateKit, KIT_SIZE } from '../src/run/kit';

describe('expedition kit', () => {
  const unlocked = ['club', 'bronze_spear', 'gladius', 'javelin', 'flail', 'musket'];
  it('clamps to KIT_SIZE unlocked weapons, preserving order, defaulting from unlocked', () => {
    const k = validateKit(['musket', 'ghost_gun', 'club', 'flail', 'gladius', 'javelin'], unlocked);
    expect(k.kit).toHaveLength(KIT_SIZE);
    expect(k.kit).toEqual(['musket', 'club', 'flail', 'gladius']);
  });
  it('empty/missing kit defaults to the first unlocked weapons', () => {
    expect(validateKit(undefined, unlocked).kit).toEqual(['club', 'bronze_spear', 'gladius', 'javelin']);
  });
  it('startWeapon must be in the kit (else first kit weapon)', () => {
    expect(validateKit(['club', 'gladius'], unlocked, 'musket').startWeapon).toBe('club');
    expect(validateKit(['club', 'gladius'], unlocked, 'gladius').startWeapon).toBe('gladius');
  });
});
```

Save-version test (in the existing saveLoad test file):

```ts
it('v3 saves reset on load (reset-on-bump, RC-017 stance)', () => {
  const fake = { getItem: () => JSON.stringify({ ...newCivState(), version: 3 }), setItem: () => {}, removeItem: () => {} } as unknown as Storage;
  expect(load(fake)).toBeNull();
});
```

- [ ] **Step 2: Implement**

`src/run/kit.ts`:

```ts
export const KIT_SIZE = 4;

/** Normalize a kit: unlocked-only, deduped, clamped to KIT_SIZE, padded from `unlocked`;
 *  startWeapon coerced into the kit. Pure — UI and modifiers both call this. */
export function validateKit(
  kit: string[] | undefined, unlocked: string[], startWeapon?: string,
): { kit: string[]; startWeapon: string } {
  const seen = new Set<string>();
  const valid = (kit ?? []).filter((id) => unlocked.includes(id) && !seen.has(id) && (seen.add(id), true));
  const out = valid.slice(0, KIT_SIZE);
  for (const id of unlocked) {
    if (out.length >= KIT_SIZE) break;
    if (!out.includes(id)) out.push(id);
  }
  const start = startWeapon && out.includes(startWeapon) ? startWeapon : out[0] ?? 'club';
  return { kit: out, startWeapon: start };
}
```

`saveLoad.ts`: `CURRENT_VERSION = 4` with the comment extended: `// v4 = RC-031 Forge & Fuse (kit/activeItem + catalog rebuild). Reset on bump — no migration (Jeff 2026-06-11).`
`civState.ts` `newCivState()`: `version: 4, kit: ['club'], activeItem: undefined` (keep `startWeapon: 'club'`).
`modifiers.ts` `computeRunModifiers`: after collecting `weapons`, apply the kit:

```ts
const { kit, startWeapon } = validateKit(civ.kit, [...weapons], civ.startWeapon);
return { ..., weapons: kit, startWeapon, ... };
```

- [ ] **Step 3: Verify + commit**

`npm test && npm run build` → PASS (update any test fixture civs that asserted `version: 3`).

```bash
git add -A
git commit -m "feat(RC-031)!: save v4 — expedition kit + active persisted, reset on bump"
```

---

## Task 15: Expedition Kit UI

**Files:**
- Modify: `src/ui/expeditionScreen.ts`, `src/main.ts`, `src/style.css`

Follow the existing start-weapon picker pattern (flat grid, one-click — `expeditionScreen.ts:33-55`) and Jeff's UI rules (jeff-ui-design): a flat always-visible grid, no progressive disclosure.

- [ ] **Step 1: Replace the start-weapon section with the Kit section**

- Grid of ALL unlocked weapons (same card markup); click toggles kit membership (cards show a `✓ in kit` badge; refuse the 5th with a brief shake class).
- Each in-kit card shows a `★ start` toggle; exactly one kit weapon is the start weapon (clicking another moves the star).
- Below: an **Active item** row — one card per unlocked active (from `computeRunModifiers(civ).actives` + `ACTIVES` defs: icon, name, desc), one selected at a time; hidden entirely only when NO active is unlocked yet.
- New callbacks in `ExpeditionCallbacks`: `onKitChange(kit: string[], startWeapon: string): void; onSelectActive(id: string): void;` — replacing `onSelectWeapon`.
- Use `validateKit` for every mutation so the UI can never persist an invalid kit.

In `src/main.ts`, where `onSelectWeapon` currently saves `civ.startWeapon`, replace with:

```ts
onKitChange: (kit, startWeapon) => { civ = { ...civ, kit, startWeapon }; save(civ); rerender(); },
onSelectActive: (id) => { civ = { ...civ, activeItem: id }; save(civ); rerender(); },
```

(match the file's actual local naming for `civ`/`save`/rerender — same pattern the existing callback uses).

In `src/style.css`, add `.kit-badge`, `.kit-star`, `.active-row` styles consistent with the existing `.startweapon` block.

- [ ] **Step 2: Verify + commit**

`npm run build && npm test` → PASS. Dev check: kit picks persist across reload (v4 save), drafts in-run only offer kit weapons, chosen active appears with a charge in the HUD.

```bash
git add -A
git commit -m "feat(RC-031): expedition kit UI — pick 4 weapons + start + active pre-run"
```

---

## Task 16: Cleanup sweep — legacy perk/evolution code dies

**Files:** repo-wide grep sweep

- [ ] **Step 1: Sweep**

`grep -rn "Perk\|applyPerk\|PERKS\|evolve\|weaponClass\|MELEE\|ownedPerks" src/ tests/` — every hit is either deleted (legacy) or renamed (passives). Expected leftovers to remove: `Perk`/`PerkEffect` types in `types.ts`, `ownedPerks` field + uses in RunScene, any `draft.test.ts` remnants.

- [ ] **Step 2: Full verify**

Run: `npm test && npm run build`
Expected: full suite green (246 pre-existing tests minus deleted legacy tests plus ~40 new), build clean. Also `grep -rn "behavior" src/run/weaponData.ts` → no hits.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(RC-031): remove legacy perk/evolution/weapon-class code"
```

---

## Task 17: Playwright end-to-end walkthrough

**Files:**
- Create: `tests/e2e/forge-and-fuse.spec.ts` (or follow the repo's existing Playwright layout)

**REQUIRED SUB-SKILL:** `verify-canvas-game-playwright` — follow it for exposing the scene to `window`, driving trusted input on the canvas, and REVERTING instrumentation before commit.

- [ ] **Step 1: Script the loop (spec acceptance: kit → draft → level → fuse → active → re-fuse)**

Walkthrough assertions, in order:
1. Boot, fresh save → civ screen renders; research `hunting` (gives the net active) if affordable, else proceed bare.
2. Expedition screen: kit grid present; select kit, set start weapon, select active (if unlocked); launch.
3. In-run: sample scene state via the exposed hook — `equipped.length === 1`, active charges ≥ 0.
4. Force XP (per the skill's state-sampling pattern) to trigger drafts; pick a `newWeapon`, then `levelWeapon` cards until both weapons hit max level.
5. Next draft: assert the first card is the fusion offer; pick it; assert `equipped.length === 1` and `equipped[0].hybrid` set; assert the celebration banner appeared.
6. Right-click: assert `activeCharges` decremented and (for net) enemies gained `slowUntil`.
7. Continue to a second fusion (third weapon drafted, leveled, fused) — assert 3 bases and no further fusion offers.
8. End the run — runs are RC-034 dungeons now (clear-the-dungeon win, no timer): either clear remaining enemies via state sampling or die deliberately; run-end screen shows; save persists kit (reload → expedition screen still shows the kit).

RC-034 walkthrough gotchas (from the dungeon session's live verify): heavy worktree churn can wedge Vite HMR into serving STALE modules — start a fresh dev server on a clean port and curl a known-changed module first; the headless Phaser clock runs slow, so `time.delayedCall` fires late — drive scene methods directly or poll with generous waits; draft-card children each need scrollFactor 0 stamped (Phaser 3.90 container quirk) — relevant when Task 10 touches the overlay.

- [ ] **Step 2: Run it, capture evidence**

Run: `npx playwright test forge-and-fuse`
Expected: PASS with screenshots of the fusion celebration + HUD loadout attached to the report.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(RC-031): Playwright walkthrough — kit/draft/fuse/active/re-fuse loop"
```

---

## Acceptance criteria traceability (spec → tasks)

| Spec requirement | Tasks |
|---|---|
| ~10 distinct verb archetypes, sidegrade-banded | 2, 4 (band test) |
| Chain fusion + 3-base cap + catalysts | 3, 6, 12 |
| Tradeoff-only drafts, fusion-first, no weaker offers | 5, 6, 10 |
| Expedition Kit shapes pool, persists (v4, reset on bump) | 14, 15 |
| Right-click active, tech-unlocked, charges | 7, 11 |
| Passives: 2 slots, tradeoffs, rare fusion | 5, 6 |
| VFX identity + fusion celebration + juice | 10, 13 |
| Pure logic unit-tested; Playwright E2E | every pure task + 17 |

## Post-plan notes for the executor

- **Balance numbers are provisional** — the band test enforces sidegrade structure; feel tuning is RC-009's (juice + balance) standing remit, not this plan's.
- RunScene line numbers shift as tasks land; anchor by symbol names (`fireWeapon`, `renderDraft`, `applyDraftOption`), not line numbers.
- If a step's API mismatches reality (e.g. the hit handler's actual shape), adapt minimally and note it in the task report — do NOT redesign contracts mid-task; flag contract problems back to the controller.

