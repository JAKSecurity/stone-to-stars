# Culture Traditions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a flat, always-visible "Traditions" board to the civ screen — a culture-only, hard-capped permanent meta-progression layer that gives banked culture a perpetual sink without reintroducing a late-game economy runaway.

**Architecture:** Mirror the existing `tech/` and `camp/` module split: a pure data registry (`civics/traditionData.ts`) + pure logic module (`civics/traditions.ts`), consumed by `computeRunModifiers` and rendered as a third panel in `civScreen.ts`. Five new capped axes are added to `RunModifiers` and seeded into the run via `initialRunStats` / `RunScene`. `CivState` gains a `traditions` map behind a versioned save migration (v1 → v2).

**Tech Stack:** TypeScript, Vitest (unit), Phaser 3 (run scene), Playwright (`verify-canvas-game-playwright`) for live verification. Pure logic is DOM/Phaser-free and unit-tested first (TDD).

**Source spec:** [docs/superpowers/specs/2026-06-10-culture-traditions-design.md](../specs/2026-06-10-culture-traditions-design.md) — ratified by Jeff 2026-06-10 with all four forks resolved as recommended (8 nodes/40 ranks; light age-gating of Oratory→Classical & Heritage→Medieval; no run-duration tradition; `COST_G = 1.6`).

---

## File Structure

**Create:**
- `src/civics/traditionData.ts` — the `TRADITIONS` registry (eight `TraditionDef`s). Pure data, no imports beyond types.
- `src/civics/traditions.ts` — pure logic: `nextRankCost`, `nextRankCostBundle`, `traditionRank`, `canBuyTradition`, `buyTradition`.
- `tests/traditions.test.ts` — unit tests for the logic module.

**Modify:**
- `src/game/types.ts` — add `RunModifierDelta` and `TraditionDef` types; add `traditions` to `CivState`; add five fields to `RunModifiers`.
- `src/game/config.ts` — add five `BASE_*` constants for the new modifier axes.
- `src/state/civState.ts` — `newCivState` adds `traditions: {}`, bump `version` to 2.
- `src/state/saveLoad.ts` — `CURRENT_VERSION = 2`; migrate v1 saves instead of discarding them.
- `src/run/modifiers.ts` — sum tradition deltas (rank-clamped) onto the base; seed the five new axes.
- `src/run/runStats.ts` — `initialRunStats` reads the new axes from `mods` instead of hardcoding.
- `src/scenes/RunScene.ts` — fix the default-stats literal; seed `startWeaponLevel`; add the draft-reroll affordance.
- `src/ui/civScreen.ts` — render the Traditions panel; add `onBuyTradition` to `CivCallbacks`.
- `src/main.ts` — wire the `onBuyTradition` callback.
- `tests/civState.test.ts`, `tests/saveLoad.test.ts`, `tests/modifiers.test.ts` — update for the new fields/version.

**Commands** (run from repo root): tests `npm test`, single file `npx vitest run tests/traditions.test.ts`, type-check `npx tsc --noEmit`, dev server `npm run dev`.

---

## Task 1: Types — `RunModifierDelta`, `TraditionDef`, `CivState.traditions`, `RunModifiers` axes

**Files:**
- Modify: `src/game/types.ts`

No test of its own (type-only change; exercised by every later task). After editing, the type-check step is the gate.

- [ ] **Step 1: Add the new types and fields**

In `src/game/types.ts`, after the `RunBonus` interface, add:

```ts
/** The additive subset of RunModifiers that traditions (and future sources) can contribute. */
export interface RunModifierDelta {
  maxHp?: number;            // flat HP
  damageMult?: number;       // additive fraction (0.03 = +3%)
  draftChoices?: number;     // flat add
  pickupRadius?: number;     // flat px
  moveSpeedMult?: number;    // additive fraction
  fireRateMult?: number;     // additive fraction
  draftRerolls?: number;     // flat add (level-up reroll uses)
  startWeaponLevel?: number; // flat add to the starting weapon level
}

export interface TraditionDef {
  id: string;
  name: string;
  icon: string;                 // emoji shown on the card
  base: number;                 // rank-1 culture cost
  maxRank: number;
  effectPerRank: RunModifierDelta; // applied min(rank,maxRank) times in computeRunModifiers
  requiresAge?: AgeId;          // age gate (absent = cost-gated only)
  blurb: (rank: number) => string; // effect text at a given rank, for the card
}
```

Add `traditions` to `CivState` (after `buildings`):

```ts
  buildings: PlacedBuilding[];
  traditions: Record<string, number>; // traditionId -> rank (absent/0 = unowned)
  runs: number;
```

Extend `RunModifiers` (after `weapons`):

```ts
export interface RunModifiers {
  maxHp: number;
  damageMult: number;
  draftChoices: number;
  weapons: string[];
  pickupRadius: number;     // px
  moveSpeedMult: number;    // 1.0 = no change
  fireRateMult: number;     // 1.0 = no change
  draftRerolls: number;     // 0 = no rerolls
  startWeaponLevel: number; // 1 = weapons start at level 1
}
```

- [ ] **Step 2: Type-check (expected to FAIL with known call sites)**

Run: `npx tsc --noEmit`
Expected: FAIL — errors at `src/state/civState.ts` (missing `traditions`), `src/run/modifiers.ts` and `src/run/runStats.ts` / `src/scenes/RunScene.ts` (missing `RunModifiers` fields), and the three test files. These are fixed in Tasks 2–9. Do **not** chase them here; this step just confirms the types compiled and the expected breakages surfaced.

- [ ] **Step 3: Commit**

```bash
git add src/game/types.ts
git commit -m "feat(types): add Tradition + RunModifierDelta types and new RunModifiers axes"
```

---

## Task 2: Config — base values for the new run-modifier axes

**Files:**
- Modify: `src/game/config.ts`

- [ ] **Step 1: Add the base constants**

Append to `src/game/config.ts`:

```ts
// Base values for tradition-driven run-modifier axes (no traditions = these defaults).
export const BASE_PICKUP_RADIUS = 60;     // matches the prior hardcoded RunStats pickupRadius
export const BASE_MOVE_MULT = 1.0;
export const BASE_FIRE_MULT = 1.0;
export const BASE_DRAFT_REROLLS = 0;
export const BASE_START_WEAPON_LEVEL = 1;
```

- [ ] **Step 2: Commit**

```bash
git add src/game/config.ts
git commit -m "feat(config): base constants for tradition run-modifier axes"
```

---

## Task 3: Tradition data registry

**Files:**
- Create: `src/civics/traditionData.ts`

- [ ] **Step 1: Write the registry**

Create `src/civics/traditionData.ts`:

```ts
import { TraditionDef } from '../game/types';

/** Per-node exponential culture cost multiplier. Just under tech's G=1.75 so the long tail
 *  stays reachable as income creeps up on INCOME_G=1.26 (see RC-028 spec, fork F4). */
export const COST_G = 1.6;

/** Eight nodes / 40 total ranks. Every effect is hard-capped by maxRank — a fully-maxed board
 *  is a fixed power ceiling, not a per-run multiplier, so it cannot create an economy runaway. */
export const TRADITIONS: Record<string, TraditionDef> = {
  vigor: {
    id: 'vigor', name: 'Vigor', icon: '❤️', base: 24, maxRank: 5,
    effectPerRank: { maxHp: 8 },
    blurb: (r) => `+${8 * r} start HP`,
  },
  foraging: {
    id: 'foraging', name: 'Foraging', icon: '🧺', base: 20, maxRank: 5,
    effectPerRank: { pickupRadius: 6 },
    blurb: (r) => `+${6 * r} px pickup radius`,
  },
  drill: {
    id: 'drill', name: 'Drill', icon: '⚙️', base: 28, maxRank: 5,
    effectPerRank: { fireRateMult: 0.04 },
    blurb: (r) => `+${Math.round(4 * r)}% fire rate`,
  },
  logistics: {
    id: 'logistics', name: 'Logistics', icon: '🥾', base: 22, maxRank: 5,
    effectPerRank: { moveSpeedMult: 0.03 },
    blurb: (r) => `+${Math.round(3 * r)}% move speed`,
  },
  tactics: {
    id: 'tactics', name: 'Tactics', icon: '⚔️', base: 30, maxRank: 5,
    effectPerRank: { damageMult: 0.03 },
    blurb: (r) => `+${Math.round(3 * r)}% damage`,
  },
  scholarship: {
    id: 'scholarship', name: 'Scholarship', icon: '📜', base: 40, maxRank: 2,
    effectPerRank: { draftChoices: 1 },
    blurb: (r) => `+${r} draft choice${r === 1 ? '' : 's'}`,
  },
  oratory: {
    id: 'oratory', name: 'Oratory', icon: '🗣️', base: 45, maxRank: 3,
    effectPerRank: { draftRerolls: 1 }, requiresAge: 'classical',
    blurb: (r) => `+${r} draft reroll${r === 1 ? '' : 's'} per run`,
  },
  heritage: {
    id: 'heritage', name: 'Heritage', icon: '🏛️', base: 60, maxRank: 2,
    effectPerRank: { startWeaponLevel: 1 }, requiresAge: 'medieval',
    blurb: (r) => `Start weapon +${r} level${r === 1 ? '' : 's'}`,
  },
};
```

- [ ] **Step 2: Type-check the new file compiles**

Run: `npx tsc --noEmit`
Expected: the same pre-existing breakages from Task 1's call sites remain, but **no new error** originates in `traditionData.ts`. (Confirm by checking no error path contains `traditionData`.)

- [ ] **Step 3: Commit**

```bash
git add src/civics/traditionData.ts
git commit -m "feat(civics): tradition registry — 8 nodes, culture-only, COST_G=1.6"
```

---

## Task 4: Tradition logic module (TDD)

**Files:**
- Create: `src/civics/traditions.ts`
- Test: `tests/traditions.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/traditions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  nextRankCost, nextRankCostBundle, traditionRank, canBuyTradition, buyTradition,
} from '../src/civics/traditions';
import { newCivState } from '../src/state/civState';
import { CivState } from '../src/game/types';
import { research } from '../src/tech/tech';

const RICH = { exploration: 0, science: 0, industry: 0, culture: 9999 };
function richCiv(): CivState { return { ...newCivState(), banked: { ...RICH } }; }

describe('nextRankCost', () => {
  it('follows base * 1.6^(rank) for successive ranks of Vigor (base 24)', () => {
    const civ = richCiv();
    expect(nextRankCost(civ, 'vigor')).toBe(24);            // rank 0 -> 1
    const r1 = buyTradition(civ, 'vigor');
    expect(nextRankCost(r1, 'vigor')).toBe(38);             // round(24*1.6)
    const r2 = buyTradition(r1, 'vigor');
    expect(nextRankCost(r2, 'vigor')).toBe(61);             // round(24*1.6^2)
  });

  it('returns null when the node is at max rank', () => {
    let civ = richCiv();
    for (let i = 0; i < 5; i++) civ = buyTradition(civ, 'vigor'); // maxRank 5
    expect(traditionRank(civ, 'vigor')).toBe(5);
    expect(nextRankCost(civ, 'vigor')).toBeNull();
  });
});

describe('canBuyTradition', () => {
  it('false when culture is insufficient', () => {
    const broke = { ...newCivState(), banked: { exploration: 0, science: 0, industry: 0, culture: 10 } };
    expect(canBuyTradition(broke, 'vigor')).toBe(false); // costs 24
  });

  it('false when already at max rank', () => {
    let civ = richCiv();
    for (let i = 0; i < 5; i++) civ = buyTradition(civ, 'vigor');
    expect(canBuyTradition(civ, 'vigor')).toBe(false);
  });

  it('false for an age-gated node before its age, true after', () => {
    const civ = richCiv(); // Stone age, no tech
    expect(canBuyTradition(civ, 'oratory')).toBe(false); // requires classical
    // research the chain that gates the Classical age, then it unlocks.
    const classical = reachClassical(civ);
    expect(canBuyTradition(classical, 'oratory')).toBe(true);
  });
});

describe('buyTradition', () => {
  it('increments rank and spends exactly the culture cost, untouched other resources', () => {
    const civ = { ...newCivState(), banked: { exploration: 5, science: 5, industry: 5, culture: 100 } };
    const after = buyTradition(civ, 'vigor');
    expect(traditionRank(after, 'vigor')).toBe(1);
    expect(after.banked.culture).toBe(76);   // 100 - 24
    expect(after.banked).toMatchObject({ exploration: 5, science: 5, industry: 5 });
  });

  it('is a no-op (returns the same state) when the purchase is illegal', () => {
    const broke = { ...newCivState(), banked: { exploration: 0, science: 0, industry: 0, culture: 1 } };
    expect(buyTradition(broke, 'vigor')).toBe(broke);
  });

  it('nextRankCostBundle is culture-only', () => {
    expect(nextRankCostBundle(richCiv(), 'foraging')).toEqual({ culture: 20 });
  });
});

// Helper: research the tech chain up to whatever gates the Classical age.
// Uses the real tech graph so the test stays honest if the gating chain changes.
function reachClassical(start: CivState): CivState {
  // A rich civ can research anything affordable; walk gatesAge until age >= classical.
  // Implemented in the test via the tech module to avoid hardcoding ids here.
  return researchUntilAge(start, 'classical');
}
```

This test references two helpers that must exist for it to run. Add them at the bottom of the test file (NOT in src):

```ts
import { TECHS } from '../src/tech/techData';
import { getAge } from '../src/tech/tech';
import { AGE_ORDER, AgeId } from '../src/game/types';
import { canResearch } from '../src/tech/tech';

function researchUntilAge(civ: CivState, target: AgeId): CivState {
  const want = AGE_ORDER.indexOf(target);
  let guard = 0;
  while (AGE_ORDER.indexOf(getAge(civ)) < want && guard++ < 50) {
    // research the first currently-researchable tech (rich civ affords everything)
    const next = Object.values(TECHS).find((t) => canResearch(civ, t.id));
    if (!next) break;
    civ = research(civ, next.id);
  }
  return civ;
}
```

> Note for the implementer: keep all four imports at the **top** of the test file (Vitest hoists `describe`, not imports). The inline `import` lines above are shown next to their use only for readability — consolidate them with the existing import block.

- [ ] **Step 2: Run the tests to verify they FAIL**

Run: `npx vitest run tests/traditions.test.ts`
Expected: FAIL — `traditions.ts` does not exist, so every import is undefined.

- [ ] **Step 3: Implement the logic module**

Create `src/civics/traditions.ts`:

```ts
import { CivState, ResourceBundle } from '../game/types';
import { canAfford, spend } from '../economy/resources';
import { getAge } from '../tech/tech';
import { AGE_ORDER } from '../game/types';
import { TRADITIONS, COST_G } from './traditionData';

export function traditionRank(civ: CivState, id: string): number {
  return civ.traditions[id] ?? 0;
}

/** Culture cost of the NEXT rank, or null if maxed / unknown id. */
export function nextRankCost(civ: CivState, id: string): number | null {
  const def = TRADITIONS[id];
  if (!def) return null;
  const rank = traditionRank(civ, id);
  if (rank >= def.maxRank) return null;
  return Math.round(def.base * COST_G ** rank);
}

/** The next-rank cost as a culture-only ResourceBundle fragment, or null if maxed. */
export function nextRankCostBundle(civ: CivState, id: string): Partial<ResourceBundle> | null {
  const cost = nextRankCost(civ, id);
  return cost === null ? null : { culture: cost };
}

function ageSatisfied(civ: CivState, id: string): boolean {
  const def = TRADITIONS[id];
  if (!def?.requiresAge) return true;
  return AGE_ORDER.indexOf(getAge(civ)) >= AGE_ORDER.indexOf(def.requiresAge);
}

export function canBuyTradition(civ: CivState, id: string): boolean {
  const bundle = nextRankCostBundle(civ, id); // null => maxed/unknown
  if (!bundle) return false;
  if (!ageSatisfied(civ, id)) return false;
  return canAfford(civ.banked, bundle);
}

/** Buy the next rank. Returns a NEW civ, or the SAME ref unchanged if the purchase is illegal. */
export function buyTradition(civ: CivState, id: string): CivState {
  if (!canBuyTradition(civ, id)) return civ;
  const bundle = nextRankCostBundle(civ, id)!;
  return {
    ...civ,
    banked: spend(civ.banked, bundle),
    traditions: { ...civ.traditions, [id]: traditionRank(civ, id) + 1 },
  };
}
```

- [ ] **Step 4: Run the tests to verify they PASS**

Run: `npx vitest run tests/traditions.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/civics/traditions.ts tests/traditions.test.ts
git commit -m "feat(civics): tradition purchase/cost logic + tests"
```

---

## Task 5: CivState init + save migration (v1 → v2)

**Files:**
- Modify: `src/state/civState.ts`, `src/state/saveLoad.ts`
- Test: `tests/civState.test.ts`, `tests/saveLoad.test.ts`

- [ ] **Step 1: Update the failing tests first**

In `tests/civState.test.ts`, change the version assertion and add a traditions assertion in the first test:

```ts
    expect(civ.version).toBe(2);
    expect(civ.traditions).toEqual({});
```

In `tests/saveLoad.test.ts`, add a migration test inside the `describe('saveLoad', ...)` block:

```ts
  it('migrates a v1 save (no traditions) to v2 with an empty traditions map', () => {
    const storage = memStorage();
    const v1 = {
      version: 1,
      banked: { exploration: 1, science: 2, industry: 3, culture: 4 },
      researched: ['hunting'], buildings: [], runs: 2,
    };
    storage.setItem(SAVE_KEY, JSON.stringify(v1));
    const loaded = load(storage)!;
    expect(loaded.version).toBe(2);
    expect(loaded.traditions).toEqual({});
    expect(loaded.banked.culture).toBe(4); // other fields preserved
    expect(loaded.researched).toEqual(['hunting']);
  });
```

The existing `'load returns null on a version mismatch'` test (version 999) must STILL pass — 999 is an unknown future version, not a known-old one.

- [ ] **Step 2: Run the updated tests to verify they FAIL**

Run: `npx vitest run tests/civState.test.ts tests/saveLoad.test.ts`
Expected: FAIL — `newCivState` still returns version 1 / no `traditions`; `load` still discards the v1 save.

- [ ] **Step 3: Update `newCivState`**

In `src/state/civState.ts`, change `newCivState`:

```ts
export function newCivState(): CivState {
  return {
    version: 2,
    banked: emptyBundle(),
    researched: [],
    buildings: [],
    traditions: {},
    runs: 0,
  };
}
```

- [ ] **Step 4: Add migration to `load`**

In `src/state/saveLoad.ts`, change `CURRENT_VERSION` and add a `migrate` step:

```ts
const CURRENT_VERSION = 2;

/** Bring a parsed save up to CURRENT_VERSION. Returns null for unknown/future versions. */
function migrate(parsed: any): CivState | null {
  let civ = parsed;
  if (civ.version === 1) {
    civ = { ...civ, version: 2, traditions: {} };
  }
  if (civ.version !== CURRENT_VERSION) return null;
  return civ as CivState;
}

export function load(storage: Storage = localStorage): CivState | null {
  const raw = storage.getItem(SAVE_KEY);
  if (raw === null) return null;
  try {
    return migrate(deserialize(raw));
  } catch {
    return null;
  }
}
```

Leave `SAVE_KEY = 'rogue-civ-save-v1'` unchanged — the storage key is not the schema version; migration is driven by the `version` field so existing saves survive.

- [ ] **Step 5: Run the tests to verify they PASS**

Run: `npx vitest run tests/civState.test.ts tests/saveLoad.test.ts`
Expected: PASS (including the unchanged round-trip and version-999 tests).

- [ ] **Step 6: Commit**

```bash
git add src/state/civState.ts src/state/saveLoad.ts tests/civState.test.ts tests/saveLoad.test.ts
git commit -m "feat(state): traditions in newCivState + v1->v2 save migration"
```

---

## Task 6: `computeRunModifiers` — sum capped tradition deltas + seed new axes

**Files:**
- Modify: `src/run/modifiers.ts`
- Test: `tests/modifiers.test.ts`

- [ ] **Step 1: Update + extend the tests first**

In `tests/modifiers.test.ts`, update the fresh-civ assertion to include the new axes:

```ts
  it('a fresh civ yields the base loadout', () => {
    const m = computeRunModifiers(newCivState());
    expect(m).toEqual({
      maxHp: 100, damageMult: 1.0, draftChoices: 3, weapons: ['club'],
      pickupRadius: 60, moveSpeedMult: 1.0, fireRateMult: 1.0,
      draftRerolls: 0, startWeaponLevel: 1,
    });
  });
```

Add two new tests in the same `describe` block:

```ts
  it('tradition ranks add capped deltas on top of base', () => {
    let civ = { ...newCivState(), banked: { exploration: 0, science: 0, industry: 0, culture: 9999 } };
    civ = buyTradition(civ, 'vigor');      // +8 HP
    civ = buyTradition(civ, 'vigor');      // +8 HP (rank 2 => +16 total)
    civ = buyTradition(civ, 'foraging');   // +6 px
    const m = computeRunModifiers(civ);
    expect(m.maxHp).toBe(116);
    expect(m.pickupRadius).toBe(66);
  });

  it('a rank forced past maxRank is clamped to the documented cap', () => {
    const civ = { ...newCivState(), traditions: { vigor: 99 } }; // maxRank 5 => cap +40
    expect(computeRunModifiers(civ).maxHp).toBe(140);
  });
```

Add the import at the top of the file:

```ts
import { buyTradition } from '../src/civics/traditions';
```

- [ ] **Step 2: Run to verify FAIL**

Run: `npx vitest run tests/modifiers.test.ts`
Expected: FAIL — `computeRunModifiers` does not yet return the new axes nor apply traditions.

- [ ] **Step 3: Implement the traditions loop + new base axes**

Replace `src/run/modifiers.ts` with:

```ts
import {
  CivState, RunModifiers, RunModifierDelta,
} from '../game/types';
import {
  BASE_MAX_HP, BASE_DAMAGE_MULT, BASE_DRAFT_CHOICES, BASE_WEAPONS,
  BASE_PICKUP_RADIUS, BASE_MOVE_MULT, BASE_FIRE_MULT,
  BASE_DRAFT_REROLLS, BASE_START_WEAPON_LEVEL,
} from '../game/config';
import { TECHS } from '../tech/techData';
import { BUILDINGS } from '../camp/buildingData';
import { TRADITIONS } from '../civics/traditionData';

export function computeRunModifiers(civ: CivState): RunModifiers {
  let maxHp = BASE_MAX_HP;
  let damageMult = BASE_DAMAGE_MULT;
  let draftChoices = BASE_DRAFT_CHOICES;
  let pickupRadius = BASE_PICKUP_RADIUS;
  let moveSpeedMult = BASE_MOVE_MULT;
  let fireRateMult = BASE_FIRE_MULT;
  let draftRerolls = BASE_DRAFT_REROLLS;
  let startWeaponLevel = BASE_START_WEAPON_LEVEL;
  const weapons = new Set<string>(BASE_WEAPONS);

  for (const techId of civ.researched) {
    const b = TECHS[techId]?.runBonus;
    if (!b) continue;
    maxHp += b.maxHp ?? 0;
    damageMult += b.damageMult ?? 0;
    draftChoices += b.draftChoices ?? 0;
    (b.weapons ?? []).forEach((w) => weapons.add(w));
  }

  for (const placed of civ.buildings) {
    const b = BUILDINGS[placed.id]?.runBonus;
    if (!b) continue;
    maxHp += (b.maxHp ?? 0) * placed.level;
    damageMult += (b.damageMult ?? 0) * placed.level;
    draftChoices += (b.draftChoices ?? 0) * placed.level;
    (b.weapons ?? []).forEach((w) => weapons.add(w));
  }

  // Traditions: each owned node contributes effectPerRank * clamp(rank, 0, maxRank).
  for (const [id, rawRank] of Object.entries(civ.traditions)) {
    const def = TRADITIONS[id];
    if (!def) continue;
    const rank = Math.max(0, Math.min(rawRank, def.maxRank)); // clamp = the cap guarantee
    const e: RunModifierDelta = def.effectPerRank;
    maxHp += (e.maxHp ?? 0) * rank;
    damageMult += (e.damageMult ?? 0) * rank;
    draftChoices += (e.draftChoices ?? 0) * rank;
    pickupRadius += (e.pickupRadius ?? 0) * rank;
    moveSpeedMult += (e.moveSpeedMult ?? 0) * rank;
    fireRateMult += (e.fireRateMult ?? 0) * rank;
    draftRerolls += (e.draftRerolls ?? 0) * rank;
    startWeaponLevel += (e.startWeaponLevel ?? 0) * rank;
  }

  return {
    maxHp, damageMult, draftChoices, weapons: [...weapons],
    pickupRadius, moveSpeedMult, fireRateMult, draftRerolls, startWeaponLevel,
  };
}
```

- [ ] **Step 4: Run to verify PASS**

Run: `npx vitest run tests/modifiers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/run/modifiers.ts tests/modifiers.test.ts
git commit -m "feat(run): computeRunModifiers applies capped tradition deltas + new axes"
```

---

## Task 7: `initialRunStats` reads the new axes from `mods`

**Files:**
- Modify: `src/run/runStats.ts`
- Test: `tests/runStats.test.ts` (add a focused case; file already exists)

- [ ] **Step 1: Add a failing test**

Append to `tests/runStats.test.ts` (inside the existing top-level `describe`, or add a new one) — first confirm the import of `initialRunStats` exists at the top; add it if missing:

```ts
import { initialRunStats } from '../src/run/runStats';
import { RunModifiers } from '../src/game/types';

const FULL_MODS: RunModifiers = {
  maxHp: 120, damageMult: 1.1, draftChoices: 3, weapons: ['club'],
  pickupRadius: 90, moveSpeedMult: 1.15, fireRateMult: 1.2,
  draftRerolls: 2, startWeaponLevel: 3,
};

describe('initialRunStats seeds modifier axes', () => {
  it('reads pickupRadius / moveSpeedMult / fireRateMult from mods', () => {
    const s = initialRunStats(FULL_MODS);
    expect(s.pickupRadius).toBe(90);
    expect(s.moveSpeedMult).toBe(1.15);
    expect(s.fireRateMult).toBe(1.2);
    expect(s.maxHp).toBe(120);
    expect(s.hp).toBe(120);
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `npx vitest run tests/runStats.test.ts`
Expected: FAIL — current `initialRunStats` hardcodes `fireRateMult: 1, moveSpeedMult: 1, pickupRadius: 60`.

- [ ] **Step 3: Update `initialRunStats`**

In `src/run/runStats.ts`, change the returned object to read from `mods`:

```ts
export function initialRunStats(mods: RunModifiers): RunStats {
  return {
    hp: mods.maxHp,
    maxHp: mods.maxHp,
    damageMult: mods.damageMult,
    fireRateMult: mods.fireRateMult,
    moveSpeedMult: mods.moveSpeedMult,
    pickupRadius: mods.pickupRadius,
    level: 1,
    xp: 0,
  };
}
```

- [ ] **Step 4: Run to verify PASS**

Run: `npx vitest run tests/runStats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/run/runStats.ts tests/runStats.test.ts
git commit -m "feat(run): initialRunStats seeds pickup/move/fire axes from modifiers"
```

---

## Task 8: RunScene — fix default-stats literal, seed `startWeaponLevel`, add draft reroll

**Files:**
- Modify: `src/scenes/RunScene.ts`

This task is wiring inside the Phaser scene; it has no direct unit test (the scene is exercised live in Task 11). Type-check is the gate for Steps 1–3; the reroll is verified live.

- [ ] **Step 1: Fix the default-stats field initializer**

`RunScene` line ~29 builds a default `RunStats` from a `RunModifiers` literal that is now missing fields. Update it to include the five new axes:

```ts
  private stats = initialRunStats({
    maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'],
    pickupRadius: 60, moveSpeedMult: 1, fireRateMult: 1,
    draftRerolls: 0, startWeaponLevel: 1,
  });
```

(This is only a placeholder until `init()` overwrites `this.stats` from real `mods`; it must just satisfy the type.)

- [ ] **Step 2: Seed `startWeaponLevel` in `init()`**

In `init(data)`, the line `this.equipped = initialWeapons();` starts every weapon at level 1. Raise the starting weapon(s) to `startWeaponLevel`. Add the `levelWeapon` import if not already present (it is imported on line ~7), then replace that line with:

```ts
    this.equipped = initialWeapons();
    // Heritage tradition: start the run's weapon(s) above level 1.
    const startLvl = this.mods.startWeaponLevel;
    if (startLvl > 1) {
      for (const w of this.equipped) {
        for (let lvl = 1; lvl < startLvl; lvl++) {
          this.equipped = levelWeapon(this.equipped, w.id);
        }
      }
    }
    // Oratory tradition: rerolls available this run.
    this.rerollsLeft = this.mods.draftRerolls;
```

- [ ] **Step 3: Add the `rerollsLeft` field**

Near the other private fields (by `private pendingDrafts`/`private lobs`), add:

```ts
  private rerollsLeft = 0;
```

And in `init()` it is set from `this.mods.draftRerolls` (Step 2). Confirm `pendingDrafts`/`paused` resets already live in `init()`; `rerollsLeft` joins them.

- [ ] **Step 4: Refactor `openDraft` to support reroll**

Replace the existing `openDraft()` method with a version that splits panel rendering into a helper so a reroll can re-roll and re-render in place:

```ts
  private openDraft() {
    if (this.pendingDrafts <= 0) return;
    this.pendingDrafts -= 1;
    this.paused = true;
    this.physics.pause();
    this.renderDraft();
  }

  /** Rolls a fresh set of options and draws the draft panel. Called on open and on reroll. */
  private renderDraft() {
    const picks = rollRunDraft(() => Math.random(), this.mods.draftChoices, {
      equipped: this.equipped,
      ownedPerks: this.ownedPerks,
      pool: this.mods.weapons,
    });
    const { width, height } = this.scale;
    const panel = this.add.container(0, 0).setDepth(20);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    panel.add(bg);
    const queueSuffix = this.pendingDrafts > 0 ? ` (+${this.pendingDrafts} more)` : '';
    const title = this.add.text(width / 2, height / 2 - 120, `Level up — choose one${queueSuffix}`,
      { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
    panel.add(title);

    const closeAndAdvance = () => {
      panel.destroy();
      if (this.pendingDrafts > 0) {
        this.openDraft();
      } else {
        this.paused = false;
        this.physics.resume();
      }
    };

    picks.forEach((opt, i) => {
      const y = height / 2 - 50 + i * 56;
      const card = this.add.rectangle(width / 2, y, 380, 48, 0x238636)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(width / 2, y, this.draftLabel(opt),
        { fontSize: '15px', color: '#fff' }).setOrigin(0.5);
      card.on('pointerdown', () => { this.applyDraftOption(opt); closeAndAdvance(); });
      panel.add(card); panel.add(label);
    });

    // Oratory reroll affordance: re-roll the current options without consuming the level-up.
    if (this.rerollsLeft > 0) {
      const ry = height / 2 - 50 + picks.length * 56 + 8;
      const rerollBtn = this.add.rectangle(width / 2, ry, 380, 40, 0x6e40c9)
        .setInteractive({ useHandCursor: true });
      const rerollLabel = this.add.text(width / 2, ry, `🔄 Reroll (${this.rerollsLeft} left)`,
        { fontSize: '14px', color: '#fff' }).setOrigin(0.5);
      rerollBtn.on('pointerdown', () => {
        this.rerollsLeft -= 1;
        panel.destroy();
        this.renderDraft(); // stay paused, same pending count, fresh options
      });
      panel.add(rerollBtn); panel.add(rerollLabel);
    }
  }
```

Note: `openDraft` no longer draws cards itself — all rendering moved to `renderDraft`. The pending-queue decrement stays in `openDraft` so a reroll (which calls `renderDraft` directly) does NOT consume another queued level-up.

- [ ] **Step 5: Type-check + full test run**

Run: `npx tsc --noEmit && npm test`
Expected: type-check clean; all unit suites green (the scene has no unit test but must compile, and no other suite regressed).

- [ ] **Step 6: Commit**

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(run): seed startWeaponLevel + draft-reroll affordance in RunScene"
```

---

## Task 9: Civ screen — Traditions panel + `onBuyTradition`

**Files:**
- Modify: `src/ui/civScreen.ts`, `src/main.ts`

UI wiring; verified live in Task 11. Type-check + an existing-tests run is the gate here.

- [ ] **Step 1: Add the callback to the interface**

In `src/ui/civScreen.ts`, add to `CivCallbacks`:

```ts
export interface CivCallbacks {
  onResearch: (techId: string) => void;
  onBuild: (buildingId: string, tile: number) => void;
  onUpgrade: (tile: number) => void;
  onMoveBuilding: (fromTile: number, toTile: number) => void;
  onBuyTradition: (traditionId: string) => void;
  onStartRun: () => void;
}
```

- [ ] **Step 2: Add imports**

At the top of `src/ui/civScreen.ts`, add:

```ts
import { TRADITIONS } from '../civics/traditionData';
import { traditionRank, nextRankCost, canBuyTradition } from '../civics/traditions';
import { getAge } from '../tech/tech';
import { AGE_ORDER, AgeId } from '../game/types';
```

(`getAge` may already be imported via the existing `../tech/tech` line — merge rather than duplicate. `costText`/`shortfallText`/`canAfford` already exist in this file.)

- [ ] **Step 3: Render the Traditions panel**

After the camp panel is appended (`cols.appendChild(campPanel);`) and before `wrap.appendChild(cols);`, insert:

```ts
  // Traditions panel — flat, always-visible board (jeff-ui-design: no modal/collapse).
  const tradPanel = document.createElement('div');
  tradPanel.className = 'panel';
  tradPanel.innerHTML = '<h2>Traditions</h2>';
  const tgrid = document.createElement('div');
  tgrid.className = 'bgrid'; // reuse the building-palette grid styling
  const civAgeIdx = AGE_ORDER.indexOf(getAge(civ));
  for (const def of Object.values(TRADITIONS)) {
    const rank = traditionRank(civ, def.id);
    const maxed = rank >= def.maxRank;
    const cost = nextRankCost(civ, def.id); // null when maxed
    const ageLocked = def.requiresAge != null
      && civAgeIdx < AGE_ORDER.indexOf(def.requiresAge);
    const buyable = canBuyTradition(civ, def.id);

    const card = document.createElement('div');
    card.className = 'bcard' + (maxed ? ' done' : buyable ? ' afford' : ' locked');
    const text = document.createElement('div');
    const capLine = `<div class="beff">${def.blurb(Math.max(rank, 1))}</div>`;
    const rankLine = `<div class="bnm">${def.icon} ${def.name} <span class="lvl">${rank}/${def.maxRank}</span></div>`;
    let footer: string;
    if (maxed) {
      footer = '<div class="bcost">MAX</div>';
    } else if (ageLocked) {
      footer = `<div class="bneed">🔒 ${cap(def.requiresAge as AgeId)}</div>`;
    } else if (cost != null) {
      const costStr = costText({ culture: cost });
      footer = buyable
        ? `<div class="bcost">${costStr}</div>`
        : `<div class="bcost">${costStr}</div><div class="bneed">need ${shortfallText(civ.banked, { culture: cost })}</div>`;
    } else {
      footer = '';
    }
    text.innerHTML = rankLine + capLine + footer;
    card.appendChild(text);
    if (buyable) {
      card.onclick = () => cb.onBuyTradition(def.id);
    }
    tgrid.appendChild(card);
  }
  tradPanel.appendChild(tgrid);
  cols.appendChild(tradPanel);
```

Add a small capitalize helper near the top-level `costText` helper in the same file (do not redefine if one already exists):

```ts
function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
```

- [ ] **Step 4: Wire the callback in main.ts**

In `src/main.ts`, add the import and the callback. Add to the imports near `import { build, ... }`:

```ts
import { buyTradition } from './civics/traditions';
```

In `renderCivScreen(civEl, civ, { ... })`, add the callback alongside the others:

```ts
    onBuyTradition: (id) => { civ = buyTradition(civ, id); persist(); showCiv(); },
```

- [ ] **Step 5: Type-check + full tests**

Run: `npx tsc --noEmit && npm test`
Expected: clean type-check; all unit suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/ui/civScreen.ts src/main.ts
git commit -m "feat(ui): Traditions board on the civ screen + buy wiring"
```

---

## Task 10: Full unit-suite + type-check gate

**Files:** none (verification only)

- [ ] **Step 1: Run the whole suite + type-check**

Run: `npx tsc --noEmit && npm test`
Expected: type-check clean; **all** suites green, including `traditions`, `modifiers`, `runStats`, `civState`, `saveLoad`, and every pre-existing suite (no regressions).

- [ ] **Step 2: If anything fails, fix before proceeding**

Do not advance to live verification with a red suite. Re-run the specific failing file with `npx vitest run tests/<file>.test.ts` and resolve.

---

## Task 11: Live verification (Playwright — `verify-canvas-game-playwright`)

**Files:** none (live verification; revert any instrumentation before finishing)

Invoke the `verify-canvas-game-playwright` skill for the mechanics (exposing `window.__game`, trusted canvas clicks, reverting instrumentation).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (note the local URL, typically `http://localhost:5173`).

- [ ] **Step 2: Verify the Traditions board renders + a purchase works**

Navigate to the app. On the civ screen, confirm the **Traditions** panel shows eight cards, each with icon, `0/max`, effect blurb, and a culture cost; Oratory shows `🔒 Classical` and Heritage shows `🔒 Medieval`. Grant culture via the console (`window.__game` / civ state per the skill), reload the civ screen, click **Vigor**, and confirm: the card advances to `1/5`, the culture counter drops by 24, and the next cost shows 38.

- [ ] **Step 3: Verify the bonus reaches the run**

With at least one Vigor rank bought, start an expedition and confirm the HUD start HP reflects the bonus (base 100 + tradition + any tech/building HP). Confirm 0 console errors during civ screen → run transition.

- [ ] **Step 4: (If feasible) verify the reroll affordance**

Force `draftRerolls > 0` (buy enough Oratory after reaching Classical, or temporarily seed the modifier per the skill), trigger a level-up draft in a run, and confirm a `🔄 Reroll (N left)` button appears, re-rolls the options on click, decrements the counter, and does not consume the level-up. Note: if reaching Classical live is too slow, document this as covered by the unit test for `canBuyTradition` age-gating + a seeded-modifier spot check rather than a full play-through.

- [ ] **Step 5: Revert any instrumentation**

Remove any `window.__game` exposure or seeded-modifier hacks added for verification. Re-run `npx tsc --noEmit && npm test` to confirm the tree is clean.

- [ ] **Step 6: Commit (only if instrumentation removal touched tracked files)**

```bash
git add -A
git commit -m "chore: revert verification instrumentation"
```

---

## Task 12: Finish the branch

- [ ] **Step 1: Final gate**

Run: `npx tsc --noEmit && npm test`
Expected: clean + all green.

- [ ] **Step 2: Update the ticket + tracking**

Mark RC-028 acceptance criteria satisfied in `docs/tickets/RC-028-culture-traditions.md` and flip its BACKLOG status per the repo's status-canonicalization flow (the pre-commit hook renders derived surfaces). The design-gate criterion ("Brainstorm + spec ratified before build") is already met by the ratified spec.

- [ ] **Step 3: Invoke `superpowers:finishing-a-development-branch`**

Use the skill to choose merge/PR/cleanup. Implementation lands on a fresh `rc-028-traditions` branch (this plan was authored on `rc-028-traditions-spec`, which carries spec + plan only).

---

## Self-Review

**Spec coverage:**
- Flat always-visible board, 8 nodes / 40 ranks → Tasks 3, 9. ✓
- Culture-only exponential cost (`COST_G=1.6`, `base*G^rank`) → Tasks 3, 4. ✓
- Hard caps (fixed ceiling, anti-runaway) → Task 6 rank-clamp + Task 4 max-rank tests. ✓
- No income/run-duration tradition → none defined in Task 3 (omission is the guarantee). ✓
- Light age-gating (Oratory→Classical, Heritage→Medieval) → Task 3 `requiresAge`, Task 4 gate test, Task 9 lock badge. ✓
- `CivState.traditions` + versioned migration → Tasks 1, 5. ✓
- Five new `RunModifiers` axes applied via `computeRunModifiers` → Tasks 1, 6. ✓
- Run consumption (pickup/move/fire via initialRunStats; startWeaponLevel; draftRerolls) → Tasks 7, 8. ✓
- Module split mirroring tech/camp → Tasks 3, 4. ✓
- Unit tests (cost curve, canBuy incl. age-gate, buy spend, clamp, migration) → Tasks 4, 5, 6. ✓
- Playwright purchase→run effect → Task 11. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. Task 11 Step 4 names a documented fallback (seeded spot-check) rather than leaving the reroll unverified. ✓

**Type consistency:** `nextRankCost`/`nextRankCostBundle`/`traditionRank`/`canBuyTradition`/`buyTradition` names are identical across Tasks 4, 6, 9 and the tests. `RunModifierDelta` field names match between `types.ts` (Task 1), `traditionData.ts` (Task 3), and the `computeRunModifiers` loop (Task 6). `RunModifiers`' five new fields are written consistently in Tasks 1, 6, 7, 8. `traditions` map shape (`Record<string, number>`) consistent across Tasks 1, 4, 5. ✓
