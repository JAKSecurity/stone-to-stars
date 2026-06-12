# RC-025 Relics + Two-Layer Healing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 tech/tradition-gated "relic" rare passives (pure-upside mechanics) drafted into a dedicated third slot, plus a 2%/5HP ambient food-drop healing floor and a 25%-of-maxHp lifetime budget on all `regenHps` healing.

**Architecture:** Pure data + logic live in two new modules (`src/run/relicData.ts`, `src/run/relics.ts`) fully covered by vitest; `RunModifiers` carries the unlocked relic ids from the civ layer (`modifiers.ts`); the draft gains a `newRelic` option kind; all in-scene mechanics (timers, on-kill hooks, lethal intercept, food pickups, regen budget) integrate into `RunScene.ts` via small calls into the pure helpers. Spec: `docs/superpowers/specs/2026-06-12-rc-025-relics-healing-design.md`.

**Tech Stack:** TypeScript, Phaser 3.90, vitest, Playwright (final walkthrough).

**Worktree safety (parallel-subagent-file-edit-safety):** Agents run in a git worktree. Git use is read-only/current-branch only — never `checkout`/`reset`/`restore`. Verify every edit landed via `git status`/`git diff` in the WORKTREE before committing. Tasks 7–10 all touch `src/scenes/RunScene.ts` and MUST run sequentially, never in parallel.

**Test command:** `npx vitest run` (full suite; 406 tests green at baseline). Single file: `npx vitest run tests/relics.test.ts`.

---

### Task 1: Relic types + data module

**Files:**
- Modify: `src/game/types.ts` (after the `PassiveDef`/`EquippedPassive` block, ~line 229)
- Create: `src/run/relicData.ts`
- Test: `tests/relics.test.ts`

- [ ] **Step 1: Write the failing data-invariant tests**

Create `tests/relics.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { RELICS } from '../src/run/relicData';
import { TECHS } from '../src/tech/techData';
import { TRADITIONS } from '../src/civics/traditionData';

describe('relic data', () => {
  it('has exactly the 6 spec relics', () => {
    expect(Object.keys(RELICS).sort()).toEqual([
      'blood_rush', 'bramble_mail', 'harvest_feast',
      'overcharge', 'prospectors_eye', 'second_wind',
    ]);
  });

  it('every relic has id-key match, name, icon, and a desc', () => {
    for (const [key, r] of Object.entries(RELICS)) {
      expect(r.id).toBe(key);
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.icon.length).toBeGreaterThan(0);
      expect(r.desc.length).toBeGreaterThan(0);
    }
  });

  it('every tech unlock points at a real tech; tradition unlocks at a real tradition within maxRank', () => {
    for (const r of Object.values(RELICS)) {
      if (r.unlock.kind === 'tech') {
        expect(TECHS[r.unlock.techId], `${r.id} gate`).toBeDefined();
      } else {
        const t = TRADITIONS[r.unlock.traditionId];
        expect(t, `${r.id} gate`).toBeDefined();
        expect(r.unlock.rank).toBeGreaterThan(0);
        expect(r.unlock.rank).toBeLessThanOrEqual(t.maxRank);
      }
    }
  });

  it('gates match the ratified spec table', () => {
    expect(RELICS.blood_rush.unlock).toEqual({ kind: 'tech', techId: 'hunting' });
    expect(RELICS.bramble_mail.unlock).toEqual({ kind: 'tech', techId: 'bronze_working' });
    expect(RELICS.prospectors_eye.unlock).toEqual({ kind: 'tech', techId: 'currency' });
    expect(RELICS.second_wind.unlock).toEqual({ kind: 'tech', techId: 'masonry' });
    expect(RELICS.overcharge.unlock).toEqual({ kind: 'tech', techId: 'electricity' });
    expect(RELICS.harvest_feast.unlock).toEqual({ kind: 'tradition', traditionId: 'vigor', rank: 3 });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/relics.test.ts`
Expected: FAIL — cannot resolve `../src/run/relicData`.

- [ ] **Step 3: Add types to `src/game/types.ts`**

Insert after the `EquippedPassive` line (~229):

```ts
// RC-025 — relics: tech/tradition-gated rare passives. Pure-upside new mechanics, the ONLY
// passives exempt from the sidegrade rule (civ investment earned the exception). maxLevel is
// always 1 (no leveling, no fusion); one relic per run in a dedicated third slot.
export type RelicUnlock =
  | { kind: 'tech'; techId: string }
  | { kind: 'tradition'; traditionId: string; rank: number };

export interface RelicDef {
  id: string;
  name: string;
  icon: string;        // emoji for HUD slot + draft card
  desc: string;        // mechanic line for the draft card
  unlock: RelicUnlock;
}
```

- [ ] **Step 4: Create `src/run/relicData.ts`**

```ts
import { RelicDef } from '../game/types';

// RC-025 relic pool (spec §1): 6 pure-upside mechanic relics, each gated by the tech/tradition
// that thematically earns it. Tuning knobs live here as named constants so tests and RunScene
// share one source of truth.

export const BLOOD_RUSH_FIRE_BONUS = 0.30;   // additive fireRateMult while active
export const BLOOD_RUSH_DURATION_MS = 3000;  // refreshes on every kill
export const BRAMBLE_DAMAGE = 15;            // contact damage dealt back to a surviving toucher
export const PROSPECTOR_CHANCE = 0.10;       // chance a kill drops a duplicate gem
export const SECOND_WIND_HP_FRAC = 0.30;     // revive fraction of maxHp (once per run)
export const OVERCHARGE_PERIOD_MS = 60_000;  // refund 1 spent active charge per period

// Healing layer A (spec §3) + Harvest Feast multipliers (spec §1).
export const FOOD_DROP_CHANCE = 0.02;  // per kill
export const FOOD_HEAL = 5;           // flat HP, capped at maxHp
export const FEAST_DROP_MULT = 3;     // harvest_feast: chance ×3 (→6%)
export const FEAST_HEAL_MULT = 2;     // harvest_feast: heal ×2 (→10)

// Healing layer B (spec §4): all regenHps healing draws from one lifetime budget per run.
export const REGEN_BUDGET_FRAC = 0.25; // of CURRENT maxHp

export const RELICS: Record<string, RelicDef> = {
  blood_rush: {
    id: 'blood_rush', name: 'Blood Rush', icon: '🩸',
    desc: 'Kills grant +30% fire rate for 3s',
    unlock: { kind: 'tech', techId: 'hunting' },
  },
  bramble_mail: {
    id: 'bramble_mail', name: 'Bramble Mail', icon: '🌵',
    desc: 'Enemies that touch you take 15 damage',
    unlock: { kind: 'tech', techId: 'bronze_working' },
  },
  prospectors_eye: {
    id: 'prospectors_eye', name: "Prospector's Eye", icon: '💎',
    desc: '10% chance a kill drops a duplicate gem',
    unlock: { kind: 'tech', techId: 'currency' },
  },
  second_wind: {
    id: 'second_wind', name: 'Second Wind', icon: '🕊️',
    desc: 'Once per run, survive a lethal hit at 30% HP',
    unlock: { kind: 'tech', techId: 'masonry' },
  },
  overcharge: {
    id: 'overcharge', name: 'Overcharge', icon: '⚡',
    desc: 'Active item regains 1 charge every 60s',
    unlock: { kind: 'tech', techId: 'electricity' },
  },
  harvest_feast: {
    id: 'harvest_feast', name: 'Harvest Feast', icon: '🍖',
    desc: 'Food drops ×3 and food heals double',
    unlock: { kind: 'tradition', traditionId: 'vigor', rank: 3 },
  },
};
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/relics.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/game/types.ts src/run/relicData.ts tests/relics.test.ts
git commit -m "feat(RC-025): relic types + data module (6 gated pure-upside relics)"
```

---

### Task 2: Pure relic logic (`relics.ts`)

**Files:**
- Create: `src/run/relics.ts`
- Test: `tests/relics.test.ts` (append)

- [ ] **Step 1: Append failing tests to `tests/relics.test.ts`**

Add to the imports:

```ts
import {
  unlockedRelics, relicsUnlockedByTech, relicForTradition,
  foodDropChance, foodHeal, rollFoodDrop, rollBonusGem,
  bloodRushBonus, secondWindRevive, regenBudget, regenTick,
} from '../src/run/relics';
import {
  FOOD_DROP_CHANCE, FOOD_HEAL, FEAST_DROP_MULT, FEAST_HEAL_MULT,
  BLOOD_RUSH_FIRE_BONUS, PROSPECTOR_CHANCE,
} from '../src/run/relicData';
```

Append:

```ts
describe('relic unlock resolution', () => {
  it('tech relics unlock when the tech is researched', () => {
    expect(unlockedRelics([], {})).toEqual([]);
    expect(unlockedRelics(['hunting'], {})).toEqual(['blood_rush']);
    expect(unlockedRelics(['hunting', 'currency'], {}).sort())
      .toEqual(['blood_rush', 'prospectors_eye']);
  });

  it('tradition relic unlocks at rank >= threshold', () => {
    expect(unlockedRelics([], { vigor: 2 })).toEqual([]);
    expect(unlockedRelics([], { vigor: 3 })).toEqual(['harvest_feast']);
    expect(unlockedRelics([], { vigor: 5 })).toEqual(['harvest_feast']);
  });

  it('reverse lookups for civ-screen surfacing', () => {
    expect(relicsUnlockedByTech('hunting').map((r) => r.id)).toEqual(['blood_rush']);
    expect(relicsUnlockedByTech('pottery')).toEqual([]);
    expect(relicForTradition('vigor')?.id).toBe('harvest_feast');
    expect(relicForTradition('drill')).toBeUndefined();
  });
});

describe('food drops (healing layer A)', () => {
  it('chance and heal: 2%/5HP base, 6%/10HP with harvest_feast', () => {
    expect(foodDropChance(false)).toBeCloseTo(FOOD_DROP_CHANCE);
    expect(foodDropChance(true)).toBeCloseTo(FOOD_DROP_CHANCE * FEAST_DROP_MULT);
    expect(foodHeal(false)).toBe(FOOD_HEAL);
    expect(foodHeal(true)).toBe(FOOD_HEAL * FEAST_HEAL_MULT);
  });

  it('rollFoodDrop is deterministic against the rng value', () => {
    expect(rollFoodDrop(() => 0.019, false)).toBe(true);
    expect(rollFoodDrop(() => 0.021, false)).toBe(false);
    expect(rollFoodDrop(() => 0.059, true)).toBe(true);
    expect(rollFoodDrop(() => 0.061, true)).toBe(false);
  });
});

describe('relic mechanics helpers', () => {
  it('rollBonusGem only procs with the relic and under the chance', () => {
    expect(rollBonusGem(() => 0.05, true)).toBe(true);
    expect(rollBonusGem(() => PROSPECTOR_CHANCE + 0.01, true)).toBe(false);
    expect(rollBonusGem(() => 0.0, false)).toBe(false);
  });

  it('bloodRushBonus is the flat bonus while now < until, else 0', () => {
    expect(bloodRushBonus(1000, 2000)).toBeCloseTo(BLOOD_RUSH_FIRE_BONUS);
    expect(bloodRushBonus(2000, 2000)).toBe(0);
    expect(bloodRushBonus(0, -Infinity)).toBe(0);
  });

  it('secondWindRevive returns 30% of maxHp, floored at 1', () => {
    expect(secondWindRevive(100)).toBe(30);
    expect(secondWindRevive(1)).toBe(1);
  });
});

describe('regen lifetime budget (healing layer B)', () => {
  it('budget is 25% of maxHp', () => {
    expect(regenBudget(100)).toBe(25);
    expect(regenBudget(200)).toBe(50);
  });

  it('regenTick heals rate*dt while under budget and below maxHp', () => {
    expect(regenTick(0.6, 1000, 0, 100, 50)).toBeCloseTo(0.6);
  });

  it('regenTick clamps to the remaining budget, then shuts off', () => {
    expect(regenTick(0.6, 1000, 24.7, 100, 50)).toBeCloseTo(0.3);
    expect(regenTick(0.6, 1000, 25, 100, 50)).toBe(0);
  });

  it('regenTick never overheals past maxHp and is 0 at full HP or zero rate', () => {
    expect(regenTick(0.6, 1000, 0, 100, 99.8)).toBeCloseTo(0.2);
    expect(regenTick(0.6, 1000, 0, 100, 100)).toBe(0);
    expect(regenTick(0, 1000, 0, 100, 50)).toBe(0);
  });

  it('budget tracks CURRENT maxHp: raising maxHp re-opens a spent budget', () => {
    expect(regenTick(0.6, 1000, 25, 100, 50)).toBe(0);  // spent at 100 maxHp
    expect(regenTick(0.6, 1000, 25, 130, 50)).toBeCloseTo(0.6); // oxhide raised maxHp
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/relics.test.ts`
Expected: FAIL — cannot resolve `../src/run/relics`.

- [ ] **Step 3: Create `src/run/relics.ts`**

```ts
import { RelicDef } from '../game/types';
import {
  RELICS, FOOD_DROP_CHANCE, FOOD_HEAL, FEAST_DROP_MULT, FEAST_HEAL_MULT,
  BLOOD_RUSH_FIRE_BONUS, PROSPECTOR_CHANCE, SECOND_WIND_HP_FRAC, REGEN_BUDGET_FRAC,
} from './relicData';

/** Relic ids the civ has earned: researched gate-tech, or tradition rank ≥ threshold. */
export function unlockedRelics(researched: string[], traditions: Record<string, number>): string[] {
  return Object.values(RELICS)
    .filter((r) => r.unlock.kind === 'tech'
      ? researched.includes(r.unlock.techId)
      : (traditions[r.unlock.traditionId] ?? 0) >= r.unlock.rank)
    .map((r) => r.id);
}

/** Relics gated by this tech — for the tech card's "Relic: …" effect line. */
export function relicsUnlockedByTech(techId: string): RelicDef[] {
  return Object.values(RELICS).filter((r) => r.unlock.kind === 'tech' && r.unlock.techId === techId);
}

/** The relic (if any) gated by this tradition — for the tradition card's unlock line. */
export function relicForTradition(traditionId: string): RelicDef | undefined {
  return Object.values(RELICS).find(
    (r) => r.unlock.kind === 'tradition' && r.unlock.traditionId === traditionId,
  );
}

// --- Healing layer A: ambient food drops (spec §3) ---

export function foodDropChance(hasFeast: boolean): number {
  return FOOD_DROP_CHANCE * (hasFeast ? FEAST_DROP_MULT : 1);
}

export function foodHeal(hasFeast: boolean): number {
  return FOOD_HEAL * (hasFeast ? FEAST_HEAL_MULT : 1);
}

export function rollFoodDrop(rng: () => number, hasFeast: boolean): boolean {
  return rng() < foodDropChance(hasFeast);
}

// --- Relic mechanic helpers (pure; RunScene owns the timers/state) ---

export function rollBonusGem(rng: () => number, hasEye: boolean): boolean {
  return hasEye && rng() < PROSPECTOR_CHANCE;
}

/** Additive fireRateMult bonus while Blood Rush is active (now < until). */
export function bloodRushBonus(nowMs: number, untilMs: number): number {
  return nowMs < untilMs ? BLOOD_RUSH_FIRE_BONUS : 0;
}

/** HP the player revives with when Second Wind fires. */
export function secondWindRevive(maxHp: number): number {
  return Math.max(1, Math.round(maxHp * SECOND_WIND_HP_FRAC));
}

// --- Healing layer B: regen lifetime budget (spec §4) ---

export function regenBudget(maxHp: number): number {
  return REGEN_BUDGET_FRAC * maxHp;
}

/**
 * HP to regen this tick: rate × dt, clamped by the remaining lifetime budget (against CURRENT
 * maxHp, so a mid-run maxHp raise re-opens headroom) and by the missing HP. 0 once spent.
 */
export function regenTick(
  rateHps: number, dtMs: number, healedSoFar: number, maxHp: number, hp: number,
): number {
  if (rateHps <= 0 || hp >= maxHp) return 0;
  const budgetLeft = regenBudget(maxHp) - healedSoFar;
  if (budgetLeft <= 0) return 0;
  return Math.min(rateHps * (dtMs / 1000), budgetLeft, maxHp - hp);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/relics.test.ts`
Expected: PASS (all relic tests).

- [ ] **Step 5: Commit**

```bash
git add src/run/relics.ts tests/relics.test.ts
git commit -m "feat(RC-025): pure relic logic - unlock resolution, food drops, regen budget"
```

---

### Task 3: Civ layer — `RunModifiers.relics`

**Files:**
- Modify: `src/game/types.ts` (`RunModifiers`, ~line 185)
- Modify: `src/run/modifiers.ts` (`computeRunModifiers` return, ~line 85)
- Test: `tests/modifiers.test.ts` (append)

- [ ] **Step 1: Append failing tests to `tests/modifiers.test.ts`**

Open `tests/modifiers.test.ts`, copy its existing pattern for building a `CivState` (it constructs civs for other assertions — reuse the same fixture/helper style). Append:

```ts
describe('RC-025 relic unlocks flow into RunModifiers', () => {
  it('researched gate-techs surface their relics', () => {
    const civ = makeCiv(); // use this file's existing civ fixture/helper
    civ.researched.push('hunting', 'currency');
    const mods = computeRunModifiers(civ);
    expect(mods.relics?.sort()).toEqual(['blood_rush', 'prospectors_eye']);
  });

  it('vigor rank 3 surfaces harvest_feast; rank 2 does not', () => {
    const civ = makeCiv();
    civ.traditions.vigor = 2;
    expect(computeRunModifiers(civ).relics).toEqual([]);
    civ.traditions.vigor = 3;
    expect(computeRunModifiers(civ).relics).toEqual(['harvest_feast']);
  });
});
```

(If the file has no `makeCiv` helper, build the civ the same way its existing tests do — do NOT invent a new fixture shape.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/modifiers.test.ts`
Expected: FAIL — `relics` undefined on the returned modifiers.

- [ ] **Step 3: Add the field to `RunModifiers` in `src/game/types.ts`**

After `activeItem?: string;` (~line 198) add:

```ts
  relics?: string[];    // RC-025: relic ids the civ has unlocked (optional — bare-modifier
                        // callers and old saves default to []; RunScene reads `?? []`)
```

- [ ] **Step 4: Wire `computeRunModifiers` in `src/run/modifiers.ts`**

Add the import:

```ts
import { unlockedRelics } from './relics';
```

In the return object (~line 85), add `relics`:

```ts
  return {
    maxHp, damageMult, draftChoices, weapons: kit,
    pickupRadius, moveSpeedMult, fireRateMult, draftRerolls, startWeaponLevel, startWeapon,
    actives: [...actives], activeItem,
    relics: unlockedRelics([...civ.researched], civ.traditions),
  };
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/modifiers.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/types.ts src/run/modifiers.ts tests/modifiers.test.ts
git commit -m "feat(RC-025): surface unlocked relics through RunModifiers"
```

---

### Task 4: Draft — the `newRelic` option

**Files:**
- Modify: `src/run/draft.ts` (DraftOption, DraftContext, ROLL_WEIGHT, draftOptions)
- Test: `tests/relics.test.ts` (append — keeps the relic surface in one test file)

- [ ] **Step 1: Append failing tests**

Add to `tests/relics.test.ts` imports:

```ts
import { draftOptions, rollDraft, DraftContext } from '../src/run/draft';
```

Append:

```ts
describe('relic draft cards', () => {
  const baseCtx: DraftContext = {
    equipped: [{ id: 'club', level: 1 }], passives: [], kitPool: ['club'], catalysts: 0,
  };

  it('unlocked relics are offered while the relic slot is empty', () => {
    const opts = draftOptions({ ...baseCtx, relicPool: ['blood_rush', 'second_wind'], relic: null });
    const relicOpts = opts.filter((o) => o.kind === 'newRelic');
    expect(relicOpts).toEqual([
      { kind: 'newRelic', relicId: 'blood_rush' },
      { kind: 'newRelic', relicId: 'second_wind' },
    ]);
  });

  it('no relic cards once a relic is held, with an empty pool, or for unknown ids', () => {
    expect(draftOptions({ ...baseCtx, relicPool: ['blood_rush'], relic: 'second_wind' })
      .filter((o) => o.kind === 'newRelic')).toEqual([]);
    expect(draftOptions({ ...baseCtx, relicPool: [], relic: null })
      .filter((o) => o.kind === 'newRelic')).toEqual([]);
    expect(draftOptions({ ...baseCtx, relicPool: ['nonsense'], relic: null })
      .filter((o) => o.kind === 'newRelic')).toEqual([]);
    // omitted fields (old callers) behave like empty pool
    expect(draftOptions(baseCtx).filter((o) => o.kind === 'newRelic')).toEqual([]);
  });

  it('rollDraft can yield a relic card (weight 1, never pinned)', () => {
    // rng pinned high so the low-weight relic option is reachable deterministically:
    // with one relic option in a tiny pool, sweep rng values and assert it appears at least once.
    const ctx = { ...baseCtx, kitPool: [], relicPool: ['blood_rush'], relic: null };
    const kinds = new Set<string>();
    for (let r = 0.05; r < 1; r += 0.1) {
      for (const o of rollDraft(() => r, 3, ctx)) kinds.add(o.kind);
    }
    expect(kinds.has('newRelic')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/relics.test.ts`
Expected: FAIL — type error / no `newRelic` kind.

- [ ] **Step 3: Implement in `src/run/draft.ts`**

Add the import at the top:

```ts
import { RELICS } from './relicData';
```

Extend `DraftOption` (the union, ~line 12):

```ts
  | { kind: 'newRelic'; relicId: string }
```

Extend `DraftContext` (~line 20) with optional fields (old callers keep compiling):

```ts
  relicPool?: string[]; // RC-025: relic ids the civ has unlocked (mods.relics)
  relic?: string | null;// RC-025: relic currently held this run (slot is single)
```

Extend `ROLL_WEIGHT` (~line 28):

```ts
  levelWeapon: 3, newWeapon: 2, newPassive: 2, levelPassive: 2, newRelic: 1,
```

In `draftOptions`, after the passive level-up loop (~line 71), add:

```ts
  // RC-025 relics: offered only while the (single) relic slot is empty.
  if (!ctx.relic) {
    for (const id of ctx.relicPool ?? []) {
      if (RELICS[id]) opts.push({ kind: 'newRelic', relicId: id });
    }
  }
```

- [ ] **Step 4: Run tests — relic file AND the existing draft suite**

Run: `npx vitest run tests/relics.test.ts tests/draft2.test.ts`
Expected: PASS both (optional fields keep old draft tests green).

- [ ] **Step 5: Commit**

```bash
git add src/run/draft.ts tests/relics.test.ts
git commit -m "feat(RC-025): newRelic draft option - weight 1, gated on empty relic slot"
```

---

### Task 5: Field-medic card honesty (desc cap text)

**Files:**
- Modify: `src/run/passiveData.ts` (field_medic + heartwood `desc`)
- Test: `tests/relics.test.ts` (append)

- [ ] **Step 1: Append failing test**

Add to `tests/relics.test.ts` imports: `import { PASSIVES, PASSIVE_FUSIONS } from '../src/run/passiveData';`

```ts
describe('regen cards disclose the 25% lifetime cap (spec §4)', () => {
  it('field_medic and heartwood descs mention the cap', () => {
    expect(PASSIVES.field_medic.desc).toContain('25%');
    expect(PASSIVE_FUSIONS['field_medic+oxhide'].desc).toContain('25%');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/relics.test.ts`
Expected: FAIL on both `toContain('25%')`.

- [ ] **Step 3: Update the two descs in `src/run/passiveData.ts`**

field_medic (~line 23): `desc: '+0.2 HP/s regen (max 25% HP/run), −6% damage'`
heartwood (~line 42): `desc: '+25 max HP, +0.2 HP/s (25% cap), −6% fire rate'`

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/relics.test.ts tests/passives.test.ts tests/descriptions.test.ts`
Expected: PASS (descriptions.test.ts guards card text patterns — if it asserts the old strings, update those assertions to the new strings in the same commit).

- [ ] **Step 5: Commit**

```bash
git add src/run/passiveData.ts tests/relics.test.ts tests/descriptions.test.ts
git commit -m "feat(RC-025): regen cards disclose the 25% lifetime cap"
```

---

### Task 6: Food pickup sprite

**Files:**
- Create: `src/art/sprites/food.ts`
- Modify: `src/art/registry.ts` (spread into SPRITES)
- Test: `tests/relics.test.ts` (append)

- [ ] **Step 1: Append failing test**

Add to `tests/relics.test.ts` imports: `import { SPRITES, validateSpriteDef } from '../src/art/registry';`

```ts
describe('food pickup sprite', () => {
  it('food_ration is registered and valid', () => {
    expect(SPRITES.food_ration).toBeDefined();
    expect(validateSpriteDef(SPRITES.food_ration)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/relics.test.ts`
Expected: FAIL — `SPRITES.food_ration` undefined.

- [ ] **Step 3: Create `src/art/sprites/food.ts`**

A roast-meat ration in the house procedural style (circle/poly prims only — match the prim kinds used in `gems.ts`/`obstacles.ts`; check `src/art/types.ts` for the exact `Prim` fields before authoring):

```ts
import { SpriteDef } from '../types';
import { shade } from '../color';

// RC-025 — the ambient healing pickup (spec §3). Art ratified in-game by Jeff during the
// playtest pass; if rejected, only this file changes.
const MEAT = '#b5651d';

export const FOOD: SpriteDef[] = [{
  id: 'food_ration', w: 16, h: 16, shadow: false,
  prims: [
    // bone: a pale diagonal shaft with a knuckle, poking out lower-right
    { kind: 'poly', points: [[9, 9], [14, 13], [13, 14], [8, 10]], color: '#f1e9dc', role: 'bone' },
    { kind: 'circle', cx: 14, cy: 14, r: 1.5, color: '#ffffff', role: 'knuckle' },
    // roast body + sear highlight + shadowed underside
    { kind: 'circle', cx: 6, cy: 6, r: 5, color: MEAT, role: 'meat' },
    { kind: 'circle', cx: 5, cy: 5, r: 3, color: shade(MEAT, 0.25), role: 'sear' },
    { kind: 'poly', points: [[2, 8], [10, 9], [6, 11]], color: shade(MEAT, -0.25), role: 'under' },
  ],
}];
```

- [ ] **Step 4: Register in `src/art/registry.ts`**

Add `import { FOOD } from './sprites/food';` and add `...FOOD` to the spread list in the `SPRITES` construction (~line 51).

- [ ] **Step 5: Run tests (relics + the art suites that validate all SPRITES)**

Run: `npx vitest run tests/relics.test.ts tests/art-sprites.test.ts tests/art-render.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/art/sprites/food.ts src/art/registry.ts tests/relics.test.ts
git commit -m "feat(RC-025): food_ration pickup sprite (in-game ratification pending)"
```

---

### Task 7: RunScene — relic slot, draft wiring, HUD

**Files:**
- Modify: `src/scenes/RunScene.ts` (sequential with Tasks 8–9 — same file)

No new unit tests (scene code); correctness gates are typecheck + full suite + the Task 10 Playwright pass.

- [ ] **Step 1: Add imports + state fields**

Imports (top of file, next to the existing `../run/passives` import):

```ts
import { RELICS, BLOOD_RUSH_DURATION_MS, BRAMBLE_DAMAGE, OVERCHARGE_PERIOD_MS } from '../run/relicData';
import {
  rollFoodDrop, rollBonusGem, foodHeal, bloodRushBonus, secondWindRevive, regenTick,
} from '../run/relics';
```

State fields (next to `private passives: EquippedPassive[] = [];`, ~line 125):

```ts
  // RC-025 relic slot + mechanic state
  private relic: string | null = null;
  private secondWindUsed = false;
  private bloodRushUntil = -Infinity;
  private overchargeMs = 0;
  private regenHealed = 0;           // lifetime regen spent against the 25% budget
  private foods!: Phaser.Physics.Arcade.Group;
```

In the create()-time reset block where `this.passives = []` is set (~line 227), add:

```ts
    this.relic = null;
    this.secondWindUsed = false;
    this.bloodRushUntil = -Infinity;
    this.overchargeMs = 0;
    this.regenHealed = 0;
```

Add the tiny accessor near the other small private helpers:

```ts
  /** RC-025: does the (single) relic slot hold this relic? */
  private hasRelic(id: string): boolean { return this.relic === id; }
```

- [ ] **Step 2: Foods physics group + overlap**

Find where `this.gems` is created and where its overlap is registered (`this.physics.add.overlap(this.player, this.gems, …)` at ~line 321). Mirror both for foods:

```ts
    this.foods = this.physics.add.group();
    this.physics.add.overlap(this.player, this.foods, (_p, f) => this.collectFood(f as any));
```

- [ ] **Step 3: Draft context, apply, label, description**

`renderDraft` ctx (~line 1989) — add the two fields:

```ts
    const picks = rollDraft(() => Math.random(), this.mods.draftChoices, {
      equipped: this.equipped,
      passives: this.passives,
      kitPool: this.mods.weapons,
      catalysts: this.catalysts,
      relicPool: this.mods.relics ?? [],
      relic: this.relic,
    });
```

`applyDraftOption` (~line 2186) — add the case:

```ts
      case 'newRelic': this.relic = o.relicId; break;
```

`draftLabel` (~line 2095) — add:

```ts
      case 'newRelic': return `${RELICS[o.relicId].icon} RELIC: ${RELICS[o.relicId].name}`;
```

`draftDescription` (~line 2112) — add:

```ts
      case 'newRelic': return RELICS[o.relicId].desc;
```

- [ ] **Step 4: Relic card styling (premium purple, like fusion's gold)**

In `renderDraft`'s card loop (~line 2028), extend the styling branch:

```ts
      const isFusion = opt.kind === 'fuseWeapons' || opt.kind === 'fusePassives';
      const isRelic = opt.kind === 'newRelic';
      const cardColor = isFusion ? 0x8a6d1a : isRelic ? 0x5a2ea6 : 0x238636;
      const labelColor = isFusion ? '#ffd75e' : isRelic ? '#dcc8ff' : '#fff';
```

And for the sub line color (the non-tradeoff `else` branch, ~line 2046):

```ts
        const sub = this.add.text(cx, y + labelDy, this.draftDescription(opt),
          { fontSize: `${subPx}px`, color: isFusion ? '#ffe9a8' : isRelic ? '#e9defc' : '#d2f0d8' }).setOrigin(0.5);
```

- [ ] **Step 5: HUD — the visually-distinct third slot**

In `loadoutHudLine` (~line 824), add a relic string between `passiveStr` and `activeStr`:

```ts
    const relicStr = this.relic ? `〔${RELICS[this.relic].icon}〕` : '';
```

and include it in the join array: `[loadout, passiveStr, relicStr, activeStr, catalystStr, mutStr]`.

- [ ] **Step 6: Typecheck + full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean compile, all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(RC-025): relic slot in RunScene - draft cards, apply, HUD"
```

---

### Task 8: RunScene — the six mechanics + food pickups + regen budget

**Files:**
- Modify: `src/scenes/RunScene.ts` (sequential after Task 7)

- [ ] **Step 1: Regen budget (replace the regen tick, ~line 801)**

Replace:

```ts
    // RC-031 passives: regen HP over time (capped at maxHp).
    if (this.stats.regenHps > 0 && this.stats.hp < this.stats.maxHp) {
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + this.stats.regenHps * (dt / 1000));
    }
```

with:

```ts
    // RC-031 passives regen, now drawing from the RC-025 lifetime budget (25% of CURRENT maxHp).
    const regenned = regenTick(this.stats.regenHps, dt, this.regenHealed, this.stats.maxHp, this.stats.hp);
    if (regenned > 0) {
      this.stats.hp += regenned;
      this.regenHealed += regenned;
    }
```

- [ ] **Step 2: Overcharge (same update block, right after the regen lines)**

```ts
    // RC-025 Overcharge: refund one SPENT active charge per period (never exceeds the recompute max,
    // because consumption is tracked via chargesSpent — see refreshStatsFromPassives).
    if (this.hasRelic('overcharge')) {
      this.overchargeMs += dt;
      if (this.overchargeMs >= OVERCHARGE_PERIOD_MS) {
        this.overchargeMs -= OVERCHARGE_PERIOD_MS;
        if (this.chargesSpent > 0) {
          this.chargesSpent -= 1;
          this.stats.activeCharges += 1;
        }
      }
    }
```

- [ ] **Step 3: Blood Rush — fire-rate read (~line 682)**

Replace:

```ts
        this.weaponCooldowns[w.id] = shot.cooldownMs / this.stats.fireRateMult;
```

with:

```ts
        this.weaponCooldowns[w.id] =
          shot.cooldownMs / (this.stats.fireRateMult + bloodRushBonus(this.elapsed, this.bloodRushUntil));
```

- [ ] **Step 4: On-kill hooks (damage-kill branch in `applyDamageToEnemy`, ~line 1785)**

Right after `this.kills += 1;` add:

```ts
      // RC-025 Blood Rush: every damage-kill (re)starts the fire-rate burst window.
      if (this.hasRelic('blood_rush')) this.bloodRushUntil = this.elapsed + BLOOD_RUSH_DURATION_MS;
```

Right after the existing `this.dropGem(ex, ey, enemy.getData('drop'));` (~line 1804) add:

```ts
      // RC-025 Prospector's Eye: a proc duplicates the kill's gem nearby.
      if (rollBonusGem(() => Math.random(), this.hasRelic('prospectors_eye'))) {
        this.dropGem(ex + Phaser.Math.Between(-18, 18), ey + Phaser.Math.Between(-18, 18), enemy.getData('drop'));
      }
      // RC-025 healing layer A: rare food drop on kill (boosted by Harvest Feast).
      if (rollFoodDrop(() => Math.random(), this.hasRelic('harvest_feast'))) {
        this.dropFood(ex, ey);
      }
```

(Deliberately NOT in the ceremony wipe at ~line 869 — those aren't damage-kills.)

- [ ] **Step 5: Bramble Mail**

Change `damagePlayer`'s signature (~line 1380) to carry an optional attacker and retaliate at the end:

```ts
  private damagePlayer(amount: number, attacker?: any) {
    if (amount <= 0 || this.finished || this.ceremony) return;
    this.stats.hp -= amount;
    playSfx('player-hit');
    this.cameras.main.flash(90, 130, 0, 0);
    this.player.setTintFill(0xff3333);
    this.time.delayedCall(90, () => { if (this.player?.active) this.player.clearTint(); });
    if (this.stats.hp <= 0 && !this.trySecondWind()) this.finish(true);
    // RC-025 Bramble Mail: a surviving melee attacker takes thorn damage (after the death check so
    // a thorn-kill's applyDamageToEnemy never runs on a finished scene's freed groups).
    if (this.hasRelic('bramble_mail') && !this.finished && attacker?.active) {
      this.applyDamageToEnemy(attacker, BRAMBLE_DAMAGE);
    }
  }
```

Then grep `this.damagePlayer(` call sites; at every site where the attacking enemy object is in scope (the slash profile path in `updateEnemyProfiles`/its attack helpers), pass it as the second arg: `this.damagePlayer(dmg, e)`. Leave bullet/patch sites (no attacker) unchanged.

In `hitPlayer` (~line 1902), retaliate against contact attackers that survive (the boss branch — kamikaze enemies destroy themselves anyway):

```ts
    if (this.stats.hp <= 0 && !this.trySecondWind()) this.finish(true);
    // RC-025 Bramble Mail: contact attackers that survive the touch (bosses) take thorn damage.
    if (this.hasRelic('bramble_mail') && !this.finished && enemy?.active) {
      this.applyDamageToEnemy(enemy, BRAMBLE_DAMAGE);
    }
```

- [ ] **Step 6: Second Wind — the lethal intercept**

Add the method near `damagePlayer`:

```ts
  /** RC-025 Second Wind: once per run, a lethal hit leaves the player at 30% maxHp instead.
   *  Returns true when it fired (caller skips finish). */
  private trySecondWind(): boolean {
    if (!this.hasRelic('second_wind') || this.secondWindUsed || this.finished) return false;
    this.secondWindUsed = true;
    this.stats.hp = secondWindRevive(this.stats.maxHp);
    // Unmistakable feedback: white flash + banner, mirroring celebrateFusion's screen-fixed pattern.
    this.cameras.main.flash(420, 255, 255, 255);
    const banner = this.add.text(this.scale.width / 2, this.scale.height * 0.3,
      `🕊️ Second Wind`, { fontSize: '40px', color: '#eef6ff', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 },
    ).setOrigin(0.5).setDepth(60).setScrollFactor(0).setScale(0.3).setAlpha(0);
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
    this.tweens.add({ targets: banner, alpha: 0, delay: 1500, duration: 600, onComplete: () => banner.destroy() });
    return true;
  }
```

Then update ALL THREE lethal sites (grep `finish(true)` — lines ~1387 [done in Step 5], ~1657 bullet hit, ~1902 [done in Step 5]) to the guarded form:

```ts
    if (this.stats.hp <= 0 && !this.trySecondWind()) this.finish(true);
```

After editing, re-grep `if (this.stats.hp <= 0)` to confirm no unguarded lethal site remains (`abandonRun`'s direct `finish(true)` is intentional — leave it).

- [ ] **Step 7: Food drop, magnet, and collect**

Add next to `dropGem` (~line 1905), reusing its clamp constants:

```ts
  /** RC-025: spawn a food pickup (healing layer A), clamped into the playable field like gems. */
  private dropFood(x: number, y: number) {
    const cg = clampToPlayable(x, y, this.layout.width, this.layout.height, WALL_THICKNESS + 24);
    const food = this.add.image(cg.x, cg.y, 'food_ration') as any;
    food.setDisplaySize(16 * RUN_SCALE, 16 * RUN_SCALE);
    food.setDepth(8);
    this.physics.add.existing(food);
    this.foods.add(food);
  }

  private collectFood(food: any) {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + foodHeal(this.hasRelic('harvest_feast')));
    playSfx('gem-pickup', { semitones: 7 }); // distinct upward chime vs. gem pitches
    food.destroy();
  }
```

In `vacuumGems` (~line 841), magnet foods with the same radius rule — append inside the method:

```ts
    // RC-025: food pickups magnet exactly like gems.
    (this.foods.getChildren() as any[]).forEach((f) => {
      const d = Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y);
      if (d < this.stats.pickupRadius * RUN_SCALE) this.physics.moveToObject(f, this.player, speed * RUN_SCALE);
      else f.body.setVelocity(0, 0);
    });
```

- [ ] **Step 8: Typecheck + full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean compile, all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(RC-025): six relic mechanics, food pickups, regen lifetime budget in RunScene"
```

---

### Task 9: Civ-screen surfacing — "unlocks relic" lines

**Files:**
- Modify: `src/tech/tech.ts` (`techEffectText`, ~line 86)
- Modify: `src/ui/civScreen.ts` (tradition card, ~line 369)
- Test: `tests/tech.test.ts` or `tests/descriptions.test.ts` (append, matching where `techEffectText` is already tested — grep first)

- [ ] **Step 1: Write the failing test**

Grep `techEffectText` under `tests/` and append in that file (create the assertion in `tests/tech.test.ts` if untested):

```ts
  it('RC-025: gate techs list their relic in the effect text', () => {
    expect(techEffectText('hunting')).toContain('Relic: 🩸 Blood Rush');
    expect(techEffectText('masonry')).toContain('Relic: 🕊️ Second Wind');
    expect(techEffectText('pottery')).not.toContain('Relic:');
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/tech.test.ts`
Expected: FAIL — no `Relic:` segment.

- [ ] **Step 3: Implement in `src/tech/tech.ts`**

Add the import:

```ts
import { relicsUnlockedByTech } from '../run/relics';
```

In `techEffectText`, after the `rb.actives` line (~line 92), outside the `if (rb)` block:

```ts
  // RC-025: relics gated by this tech (independent of runBonus).
  for (const r of relicsUnlockedByTech(techId)) parts.push(`Relic: ${r.icon} ${r.name}`);
```

- [ ] **Step 4: Tradition card line in `src/ui/civScreen.ts`**

In the tradition card builder (around the `capLine` blurb at ~line 369; the tradition's `def` is in scope), append a relic unlock line to the card HTML:

```ts
import { relicForTradition } from '../run/relics'; // top of file

// next to capLine:
const tradRelic = relicForTradition(def.id);
const relicLine = tradRelic && tradRelic.unlock.kind === 'tradition'
  ? `<div class="beff">Rank ${tradRelic.unlock.rank}: unlocks relic ${tradRelic.icon} ${tradRelic.name}</div>`
  : '';
```

and concatenate `relicLine` into the same innerHTML string that carries `capLine`.

- [ ] **Step 5: Typecheck + full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean compile, all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/tech/tech.ts src/ui/civScreen.ts tests/tech.test.ts
git commit -m "feat(RC-025): civ screen surfaces relic unlocks on tech + tradition cards"
```

---

### Task 10: Verification, walkthrough, tracking

**Files:**
- Modify: `docs/BACKLOG.md` (RC-025 row → Delivered), `docs/tickets/RC-025-perk-pool-healing.md` (resolution note pointing at the spec)

- [ ] **Step 1: Full gates**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: all green (~406 baseline + new relic tests).

- [ ] **Step 2: Playwright walkthrough (verify-canvas-game-playwright + automated-ui-walkthrough skills)**

Drive the real game (dev server) and verify end-to-end, using the 20k-resource test save at `C:\Users\jak36\Downloads\rogue-civ-test-save-20k.json` (import via the civ screen's Save Slots) to afford the gate techs:

1. Research `hunting` → tech card shows "Relic: 🩸 Blood Rush".
2. Start a run, level up until a purple relic card appears; pick it → HUD shows `〔🩸〕`; confirm no further relic cards in later drafts.
3. Sample live state to confirm food drops appear on kills and heal on contact (window-exposed scene state per the skill).
4. Confirm regen stops after healing 25% of maxHp with field_medic equipped.
5. Revert any instrumentation before commit.

- [ ] **Step 3: Update tracking**

In `docs/BACKLOG.md`: RC-025 Active row → `Delivered`; in the ticket file body add a resolution note (date 2026-06-12, link to spec + this plan). The pre-commit hook re-renders ticket headers and projects.yaml — the AI Assistant repo will then carry an uncommitted projects.yaml change; commit it separately.

- [ ] **Step 4: Final commit**

```bash
git add docs/BACKLOG.md docs/tickets/RC-025-perk-pool-healing.md
git commit -m "docs(RC-025): mark delivered - relics + two-layer healing shipped"
```

Art note for the session controller: the `food_ration` sprite ships pending Jeff's in-game ratification (spec decision #5) — flag it for the next playtest.
