# RC-017 Exponential Per-Age Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make progression exponential per age — income `×G^runTier`, cost `×G^ageIndex` (`G=1.75`) — with fixed-per-age difficulty and a within-run difficulty ramp, so each age is a felt step and early levels can't be farmed for late goals.

**Architecture:** A pure `src/game/economy.ts` holds `G` + the income/cost multipliers. All income (gem value, faucets, building yields) scales by the run's tier; all costs (tech, building) scale by the item's age via shared `techCost`/`buildingCost` helpers read by both logic and UI. The continuous per-tier enemy multiplier is removed (enemies use fixed per-age stats; reward tier = the biome's age), and a pure `spawnTableAt` shifts the spawn mix toward tough + next-age enemies as a run progresses.

**Tech Stack:** TypeScript, Phaser 3 (Arcade), Vitest, Vite.

**Branch:** `rc-017-exponential-economy` (stacked on `rc-004-gem-tiers`). Not merged — Jeff playtests the per-age feel before merge.

**Spec:** `docs/superpowers/specs/2026-06-08-exponential-economy-design.md`

**Execution order:** Phase A (Tasks A1–A8) → Phase B (B1–B2) → Phase C (C1–C2). Each task leaves `npm test` + `npm run build` green. The spec + plan are already committed on the branch.

---

## File structure

- **New:** `src/game/economy.ts` — `G`, `COST_BASE`, `incomeMult`, `costMult`, `gemValueForTier`, `ageIndexOf` (pure).
- **New:** `src/run/spawnEscalation.ts` — `spawnTableAt`, `nextAgeBiomeId` (pure).
- **Edit:** `resources.ts` (`scaleBundle`), `types.ts` (`BuildingDef.age`, `RunResult.tier`, `Expedition`), `techData.ts` + `buildingData.ts` (flat base costs + building `age`), `tech.ts` (`techCost`), `camp.ts` (`buildingCost`), `expedition.ts` (drop scaling, reward=biome age, offer-once), `RunScene.ts` (income + spawn), `civState.ts` (scaled yields), `saveLoad.ts` + `types.CivState.version`, `civScreen.ts` + `expeditionScreen.ts` (display via helpers), `main.ts` (RunResult shape).

---

# PHASE A — Exponential economy

### Task A1: `economy.ts` pure multipliers (TDD)

**Files:** Create `src/game/economy.ts`, `tests/economy.test.ts`

- [ ] **Step 1: Write the failing test** (`tests/economy.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { G, incomeMult, costMult, gemValueForTier, ageIndexOf } from '../src/game/economy';

describe('economy — multipliers', () => {
  it('G is 1.75', () => { expect(G).toBe(1.75); });

  it('income and cost use the SAME base (matched curves — the core invariant)', () => {
    for (let k = 0; k <= 7; k++) expect(incomeMult(k)).toBeCloseTo(costMult(k));
  });

  it('advancing one age costs G× the current age income (constant velocity)', () => {
    for (let n = 0; n <= 6; n++) expect(costMult(n + 1) / incomeMult(n)).toBeCloseTo(G);
  });

  it('gemValueForTier rounds G^tier', () => {
    expect([0,1,2,3,4,5,6,7].map(gemValueForTier)).toEqual([1, 2, 3, 5, 9, 16, 29, 50]);
  });

  it('ageIndexOf maps the age ladder to 0..7', () => {
    expect(ageIndexOf('stone')).toBe(0);
    expect(ageIndexOf('modern')).toBe(7);
  });
});
```

- [ ] **Step 2: Run** `npm test -- economy` → FAIL (module missing).

- [ ] **Step 3: Implement** (`src/game/economy.ts`)

```ts
import { AgeId, AGE_ORDER } from './types';

// Single steepness knob for the whole economy. Income scales by the RUN's tier; cost scales by the
// item's AGE. Same base on both sides ⇒ constant progression velocity + an anti-farm gate (see
// docs/superpowers/specs/2026-06-08-exponential-economy-design.md).
export const G = 1.75;

// Absolute cost scale (the one calibration knob; G sets the across-age shape). Tuned in Task A8.
export const COST_BASE = 1;

/** Income multiplier for a run at `runTier` (an AGE_ORDER index). */
export function incomeMult(runTier: number): number { return G ** runTier; }

/** Cost multiplier for an item of age `ageIndex` (an AGE_ORDER index). */
export function costMult(ageIndex: number): number { return G ** ageIndex; }

/** Resource value of one gem/pickup collected in a `runTier` run. */
export function gemValueForTier(runTier: number): number { return Math.round(G ** runTier); }

/** AGE_ORDER index of an age (0 = stone … 7 = modern). */
export function ageIndexOf(age: AgeId): number { return AGE_ORDER.indexOf(age); }
```

- [ ] **Step 4: Run** `npm test -- economy` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/economy.ts tests/economy.test.ts
git commit -m "feat(RC-017): pure economy multipliers (G=1.75) + invariants"
```

---

### Task A2: `scaleBundle` (TDD)

**Files:** Modify `src/economy/resources.ts`, Test `tests/resources.test.ts`

- [ ] **Step 1: Write the failing test** (append to `tests/resources.test.ts`)

```ts
import { scaleBundle } from '../src/economy/resources';

describe('scaleBundle', () => {
  it('multiplies present components by the factor and rounds', () => {
    expect(scaleBundle({ industry: 10, science: 4 }, 1.75)).toEqual({ industry: 18, science: 7 });
  });
  it('leaves absent components absent', () => {
    expect(scaleBundle({ culture: 10 }, 5)).toEqual({ culture: 50 });
  });
  it('factor 1 is identity (after rounding)', () => {
    expect(scaleBundle({ industry: 8, exploration: 3 }, 1)).toEqual({ industry: 8, exploration: 3 });
  });
});
```

- [ ] **Step 2: Run** `npm test -- resources` → FAIL (scaleBundle missing).

- [ ] **Step 3: Implement** (add to `src/economy/resources.ts`)

```ts
/** Multiply each present component of a (partial) bundle by `factor`, rounding to an integer. */
export function scaleBundle(bundle: Partial<ResourceBundle>, factor: number): Partial<ResourceBundle> {
  const out: Partial<ResourceBundle> = {};
  for (const r of Object.keys(bundle) as Resource[]) {
    out[r] = Math.round((bundle[r] ?? 0) * factor);
  }
  return out;
}
```

- [ ] **Step 4: Run** `npm test -- resources` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/economy/resources.ts tests/resources.test.ts
git commit -m "feat(RC-017): scaleBundle helper for tier/age cost+yield scaling"
```

---

### Task A3: `BuildingDef.age` field

**Files:** Modify `src/game/types.ts`, `src/camp/buildingData.ts`, Test `tests/buildingData.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test** (`tests/buildingData.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { BUILDINGS } from '../src/camp/buildingData';
import { AGE_ORDER } from '../src/game/types';

describe('buildingData ages', () => {
  it('every building declares a valid age', () => {
    for (const def of Object.values(BUILDINGS)) {
      expect(AGE_ORDER, `${def.id} age`).toContain(def.age);
    }
  });
  it('ages match the unlock ladder (spot check)', () => {
    expect(BUILDINGS.granary.age).toBe('stone');
    expect(BUILDINGS.forge.age).toBe('bronze');
    expect(BUILDINGS.smelter.age).toBe('iron');
    expect(BUILDINGS.motor_pool.age).toBe('modern');
  });
});
```

- [ ] **Step 2: Run** `npm test -- buildingData` → FAIL (`age` not on type / undefined).

- [ ] **Step 3a: Add the field to the type** — in `src/game/types.ts`, add `age: AgeId;` to `BuildingDef` (right after `id`):

```ts
export interface BuildingDef {
  id: string;
  age: AgeId;                        // age the building belongs to (drives cost scaling)
  name: string;
  // ...unchanged...
}
```

- [ ] **Step 3b: Add `age` to all 24 buildings** in `src/camp/buildingData.ts`, per this mapping (add `age: '<age>',` to each literal):
  - stone: `granary`, `mine`
  - bronze: `forge`
  - iron: `smelter`, `foundry`, `deep_mine`
  - classical: `academy`, `market`, `workshop`
  - medieval: `keep`, `cathedral`, `armory`
  - renaissance: `gunsmith`, `university`, `bank`
  - industrial: `factory`, `powerplant`, `arsenal`
  - modern: `motor_pool`, `barracks`, `airfield`

- [ ] **Step 4: Run** `npm test -- buildingData` → PASS; `npm run build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/camp/buildingData.ts tests/buildingData.test.ts
git commit -m "feat(RC-017): BuildingDef.age on all 24 buildings"
```

---

### Task A4: cost helpers + flat-base re-author (atomic)

This task is atomic: re-authoring base costs to flat values and applying `costMult` must land together, or charged costs are wrong between commits.

**Files:** Modify `src/tech/tech.ts`, `src/camp/camp.ts`, `src/tech/techData.ts`, `src/camp/buildingData.ts`, `src/ui/civScreen.ts`; Test `tests/techCost.test.ts` (new), extend `tests/camp.test.ts`.

**Re-author rule (apply to every tech `cost` and building `baseCost`):** rewrite each to a **flat, age-relative base** so that `effective = scaleBundle(base, costMult(ageIndex))` gives the intended exponential. Concretely, **keep each item's current resource TYPES and their RATIO, but set the magnitude to the Stone-age scale** (so a gating tech is ~the same base number in every age; `G^age` provides all across-age growth). Target base magnitudes by role (primary resource; split secondaries in the current ratio):
  - **Gating tech** (`gatesAge` set): base primary **14**, secondary **9**.
  - **Building-unlock tech** (`unlocksBuilding`, no gate): base primary **11**, secondary **6**.
  - **Run-bonus-only tech** (no building/gate): base primary **9**, secondary **5**.
  - **Building `baseCost`:** base primary **12**, secondary **6** (the level multiplier and `G^age` do the rest).
  Use the item's existing resources for primary/secondary (primary = the larger current component). Round to integers. Keep Stone-age items at roughly their current values (they're already the flat baseline).

- [ ] **Step 1: Write the failing test** (`tests/techCost.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { techCost } from '../src/tech/tech';
import { TECHS } from '../src/tech/techData';
import { costMult, ageIndexOf, COST_BASE } from '../src/game/economy';

describe('techCost — age-scaled', () => {
  it('stone techs (age 0) charge their flat base × COST_BASE', () => {
    // pottery base is its flat industry value; age 0 ⇒ costMult 1
    const c = techCost('pottery');
    expect(c.industry).toBe(Math.round((TECHS.pottery.cost.industry ?? 0) * COST_BASE));
  });
  it('a Modern tech costs G^7 × its flat base (≈50×)', () => {
    const c = techCost('combustion'); // modern, ageIndex 7
    const base = TECHS.combustion.cost;
    expect(c.industry).toBe(Math.round((base.industry ?? 0) * COST_BASE * costMult(ageIndexOf('modern'))));
  });
  it('a gating tech base is larger than a run-bonus tech of the same age', () => {
    // feudalism (medieval gate) primary > chivalry (medieval run-bonus) primary, pre-scaling
    expect(TECHS.feudalism.cost.industry ?? 0).toBeGreaterThan(TECHS.chivalry.cost.industry ?? 0);
  });
});
```

- [ ] **Step 2: Run** `npm test -- techCost` → FAIL (`techCost` missing).

- [ ] **Step 3a: Add `techCost`** to `src/tech/tech.ts`:

```ts
import { scaleBundle } from '../economy/resources';
import { costMult, ageIndexOf, COST_BASE } from '../game/economy';
// ...
/** The age-scaled cost of a tech (flat base × COST_BASE × G^ageIndex). Single source of truth. */
export function techCost(techId: string): Partial<ResourceBundle> {
  const def = TECHS[techId];
  return scaleBundle(def.cost, COST_BASE * costMult(ageIndexOf(def.age)));
}
```

- [ ] **Step 3b: Route `research()` through it.** In `tech.ts`, wherever `research` checks affordability/spends, replace `def.cost` (or `TECHS[id].cost`) with `techCost(id)`. (Read `tech.ts` first; mirror its existing `canAfford`/`spend` usage.)

- [ ] **Step 3c: Add `buildingCost`** to `src/camp/camp.ts`:

```ts
import { scaleBundle } from '../economy/resources';
import { costMult, ageIndexOf, COST_BASE } from '../game/economy';
// ...
/** Age-scaled cost of building `id` at `level` (flat base × COST_BASE × G^age × level). */
export function buildingCost(id: string, level: number): Partial<ResourceBundle> {
  const def = BUILDINGS[id];
  return scaleBundle(def.baseCost, COST_BASE * costMult(ageIndexOf(def.age)) * level);
}
```

- [ ] **Step 3d: Route `build`/`upgradeBuilding`** in `camp.ts` through `buildingCost(id, level)` (level 1 for build, `currentLevel+1` for upgrade — mirror the existing `baseCost * n` logic it replaces).

- [ ] **Step 3e: Re-author the base data.** Apply the Re-author rule above to every entry in `techData.ts` (`cost`) and `buildingData.ts` (`baseCost`). Stone entries stay ~as-is; later ages get their magnitude flattened to the Stone scale (the helper re-applies `G^age`).

- [ ] **Step 3f: Display through the helpers.** In `civScreen.ts`, replace any direct `tech.cost` / `building.baseCost*level` display reads with `techCost(id)` / `buildingCost(id, level)`.

- [ ] **Step 4: Run** `npm test` → all green (incl. `techCost`, `camp`); `npm run build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/tech/tech.ts src/camp/camp.ts src/tech/techData.ts src/camp/buildingData.ts src/ui/civScreen.ts tests/techCost.test.ts tests/camp.test.ts
git commit -m "feat(RC-017): age-scaled tech/building costs via flat base + costMult"
```

---

### Task A5: in-run income — gem value + faucets (TDD where pure; live for scene)

**Files:** Modify `src/scenes/RunScene.ts`

- [ ] **Step 1: Gem value on drop.** In `dropGem(x, y, resource)`, after resolving the sprite, set the value from the run tier:

```ts
    gem.setData('resource', resource);
    gem.setData('value', gemValueForTier(this.expedition.tier));
```
Add `import { gemValueForTier } from '../game/economy';` at the top.

- [ ] **Step 2: Bank the value on collect.** In `collectGem(gem)`:

```ts
  private collectGem(gem: any) {
    this.collected[gem.getData('resource') as Resource] += gem.getData('value') ?? 1;
    gem.destroy();
  }
```

- [ ] **Step 3: Scale the exploration faucet.** In `update()`, the exploration tick becomes:

```ts
    if (this.explorationCooldown <= 0) {
      this.collected.exploration += gemValueForTier(this.expedition.tier);
      this.explorationCooldown = 4000 / (this.biome.resourceBias.exploration ?? 1);
    }
```
(Culture relics already go through `dropGem`, so they inherit the value automatically.)

- [ ] **Step 4: One gem per kill (drop the multi-drop count).** In `applyDamageToEnemy`, replace the `drops = Math.max(1, Math.round(this.expedition.scaling.dropMult))` loop with a single `dropGem`:

```ts
      const ex = enemy.x, ey = enemy.y;
      this.dropGem(ex, ey, enemy.getData('drop'));
```
(Value, not swarm — `dropMult` is removed entirely in Phase B.)

- [ ] **Step 5: Verify build + tests** → `npm test` green (no scene unit tests changed), `npm run build` clean. Commit:

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(RC-017): in-run income scales by run tier (gem value + faucet)"
```

---

### Task A6: building yields scale by run tier (TDD)

**Files:** Modify `src/game/types.ts` (`RunResult.tier`), `src/state/civState.ts`, `src/scenes/RunScene.ts`, `src/main.ts`; Test `tests/civState.test.ts`

- [ ] **Step 1: Write the failing test** (extend `tests/civState.test.ts`)

```ts
import { applyRunResult } from '../src/state/civState';
// assumes a civ with one level-1 building that yields { industry: 4 }
it('building yields scale by the run tier (RC-017)', () => {
  const civ = { version: 2, banked: { exploration: 0, science: 0, industry: 0, culture: 0 },
    researched: [], buildings: [{ id: 'mine', level: 1, tile: 0 }], runs: 0 };
  const t0 = applyRunResult(civ, { collected: { exploration:0,science:0,industry:0,culture:0 }, survivedMs: 1, died: false, tier: 0 });
  const t4 = applyRunResult(civ, { collected: { exploration:0,science:0,industry:0,culture:0 }, survivedMs: 1, died: false, tier: 4 });
  expect(t0.banked.industry).toBe(4);           // mine yield 4 × incomeMult(0)=1
  expect(t4.banked.industry).toBe(Math.round(4 * (1.75 ** 4))); // × incomeMult(4)
});
```

- [ ] **Step 2: Run** `npm test -- civState` → FAIL (`tier` missing on RunResult / yields unscaled).

- [ ] **Step 3a: Add `tier` to `RunResult`** in `types.ts`:

```ts
export interface RunResult {
  collected: ResourceBundle;
  survivedMs: number;
  died: boolean;
  tier: number;            // run's tier (AGE_ORDER index) — scales building yields
}
```

- [ ] **Step 3b: Scale yields** in `civState.applyRunResult`:

```ts
import { incomeMult } from '../game/economy';
import { addBundles, scaleBundle } from '../economy/resources';
// ...
  for (const placed of civ.buildings) {
    const def = BUILDINGS[placed.id];
    if (!def) continue;
    const scaled = scaleBundle(def.yield, incomeMult(result.tier));
    for (let i = 0; i < placed.level; i++) banked = addBundles(banked, scaled);
  }
```

- [ ] **Step 3c: Pass the tier on finish.** In `RunScene.finish`:

```ts
    this.onComplete({
      collected: { ...this.collected },
      survivedMs: this.elapsed,
      died,
      tier: this.expedition.tier,
    });
```

- [ ] **Step 3d:** `main.ts` `onRunComplete` already receives the result; no signature change needed (it passes `result` to `applyRunResult`). Confirm it compiles.

- [ ] **Step 4: Run** `npm test` → green; `npm run build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/state/civState.ts src/scenes/RunScene.ts tests/civState.test.ts
git commit -m "feat(RC-017): building yields scale by run tier"
```

---

### Task A7: save version bump

**Files:** Modify `src/state/saveLoad.ts`, `src/state/civState.ts`

- [ ] **Step 1:** In `saveLoad.ts` set `const CURRENT_VERSION = 2;`. In `civState.newCivState()` set `version: 2`. (`load()` already returns `null` on mismatch → fresh civ; the cost/value scale changed so stale saves must reset.)

- [ ] **Step 2:** `npm test` → green (the existing saveLoad test asserts round-trip; if it pins version 1, update it to 2); `npm run build` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/state/saveLoad.ts src/state/civState.ts tests/saveLoad.test.ts
git commit -m "feat(RC-017): bump save version to 2 (economy rescale resets stale saves)"
```

---

### Task A8: calibrate absolute magnitudes (measured)

**REQUIRED SUB-SKILL:** `verify-canvas-game-playwright`. Goal: set `COST_BASE` (and nudge the flat base role-magnitudes if needed) so an age costs ~3–4 runs of its own income. G keeps that constant across ages by construction.

- [ ] **Step 1: Measure income/run.** Temporarily expose the game (`window.__game` + a launch helper), drive a full tier-0 run to completion (or temp-shorten `RUN_DURATION_MS`), and record `collected` totals (≈ income/run at tier 0). Repeat at one mid tier to sanity-check `incomeMult`.

- [ ] **Step 2: Set the target.** Sum age-0 (Stone) costs via `techCost`/`buildingCost`. Choose `COST_BASE` so `stoneTotalCost ≈ 3.5 × tier0IncomePerRun`. Adjust the role-magnitude constants in Task A4 only if within-age pacing feels off.

- [ ] **Step 3: Verify constant velocity.** Confirm (model + the `economy.test` invariant) that `costMult(n+1)/incomeMult(n) === G`, so every age is ~3.5 runs of its own income. Spot-check live: a fresh-age run banks far less than that age's gate cost; a few runs clear it.

- [ ] **Step 4: Revert instrumentation**, `npm run build` clean, working tree shows only the `COST_BASE`/magnitude change. Commit:

```bash
git add src/game/economy.ts src/tech/techData.ts src/camp/buildingData.ts
git commit -m "feat(RC-017): calibrate COST_BASE to ~3.5 runs per age"
```

---

# PHASE B — Fixed-per-age difficulty

### Task B1: drop continuous scaling; reward = biome age; offer-once expeditions

**Files:** Modify `src/game/types.ts` (`Expedition`, drop `ExpeditionScaling`), `src/run/expedition.ts`, `src/scenes/RunScene.ts`, `src/ui/expeditionScreen.ts`, `src/main.ts`; Test `tests/expedition.test.ts`

- [ ] **Step 1: Write the failing test** (replace the tier-range expectations in `tests/expedition.test.ts`)

```ts
import { availableExpeditions } from '../src/run/expedition';
import { ageIndexOf } from '../src/game/economy';
import { BIOMES } from '../src/run/biomeData';

it('offers each unlocked biome once, at its own age tier (RC-017)', () => {
  const civ = { version: 2, banked: { exploration:0,science:0,industry:0,culture:0 },
    researched: ['bronze_working'], buildings: [], runs: 0 }; // bronze age
  const exps = availableExpeditions(civ as any);
  // wilds (stone) and frontier (bronze) unlocked; each appears exactly once
  const ids = exps.map(e => e.biomeId);
  expect(ids.filter(b => b === 'wilds')).toHaveLength(1);
  const wilds = exps.find(e => e.biomeId === 'wilds')!;
  expect(wilds.tier).toBe(ageIndexOf(BIOMES.wilds.minAge)); // reward tier = biome age
});
```

- [ ] **Step 2: Run** `npm test -- expedition` → FAIL.

- [ ] **Step 3a: Simplify types** in `types.ts`: delete `ExpeditionScaling`; change `Expedition` to:

```ts
export interface Expedition {
  biomeId: string;
  tier: number;   // = AGE_ORDER index of the biome's age; reward = incomeMult(tier)
}
```

- [ ] **Step 3b: Rewrite `expedition.ts`** — delete `tierScaling`; `availableExpeditions` offers each unlocked biome once at its age tier:

```ts
export function availableExpeditions(civ: CivState): Expedition[] {
  const curIdx = AGE_ORDER.indexOf(getAge(civ));
  const out: Expedition[] = [];
  for (const biome of Object.values(BIOMES)) {
    const minIdx = AGE_ORDER.indexOf(biome.minAge);
    if (minIdx > curIdx) continue;
    if (biome.requiresTech && !isResearched(civ, biome.requiresTech)) continue;
    out.push({ biomeId: biome.id, tier: minIdx });
  }
  return out;
}
```

- [ ] **Step 3c: `RunScene`** — remove all `this.expedition.scaling.*` reads: enemy HP/speed come straight from `EnemyDef` (`spawnEnemy`: `enemy.setData('hp', def.baseHp); enemy.setData('speed', def.speed);`), and the spawn-rate ramp drops the `spawnRateMult` factor: `this.spawnCooldown = Math.max(250, 1100 / ramp);`. (Income still uses `this.expedition.tier`.)

- [ ] **Step 3d: `expeditionScreen.ts`** — render one card per biome (no tier selector); show its age + reward multiplier (`incomeMult(tier)`). Mirror the screen's existing card pattern.

- [ ] **Step 3e: `main.ts`** — `launchExpedition` no longer needs `scaling`; pass `{ biomeId, tier }`. Remove any `tierScaling` import.

- [ ] **Step 4: Run** `npm test` → green; `npm run build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/run/expedition.ts src/scenes/RunScene.ts src/ui/expeditionScreen.ts src/main.ts tests/expedition.test.ts
git commit -m "feat(RC-017): fixed per-age enemy stats; reward = biome age; offer-once expeditions"
```

---

### Task B2: live verify Phase A+B

**REQUIRED SUB-SKILL:** `verify-canvas-game-playwright`.

- [ ] Drive runs at the lowest and a higher age. Confirm: gem-value banking scales by tier (high-tier run banks far more per kill); displayed tech/building costs are age-scaled; a current-age run is materially harder than the previous age's; old biomes are offered (at low reward). 0 console errors. Revert instrumentation; `npm test` + `npm run build` green.

---

# PHASE C — Within-run escalation (straddling enemies)

### Task C1: `spawnTableAt` + `nextAgeBiomeId` (TDD)

**Files:** Create `src/run/spawnEscalation.ts`, `tests/spawnEscalation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { spawnTableAt, nextAgeBiomeId } from '../src/run/spawnEscalation';
import { BIOMES } from '../src/run/biomeData';
import { ENEMIES } from '../src/run/enemyData';

describe('spawnEscalation', () => {
  it('nextAgeBiomeId returns the biome of the next age, or null at the top', () => {
    expect(nextAgeBiomeId(BIOMES.wilds)).toBeTruthy();   // stone → some bronze+ biome
    expect(nextAgeBiomeId(BIOMES.no_mans_land)).toBeNull(); // modern is last
  });
  it('at progress 0 the table is the biome base table', () => {
    expect(spawnTableAt(BIOMES.wilds, 0, BIOMES, ENEMIES)).toEqual(BIOMES.wilds.spawnTable);
  });
  it('at progress 1 it weights the biome\'s tough enemies up and seeds a next-age enemy', () => {
    const late = spawnTableAt(BIOMES.colosseum, 1, BIOMES, ENEMIES); // classical → medieval seeds
    // the highest-baseHp classical enemy (cyclops) gains weight vs its base
    expect(late.cyclops).toBeGreaterThan(BIOMES.colosseum.spawnTable.cyclops ?? 0);
    // at least one enemy id NOT in the base table appears (a next-age seed)
    const baseIds = new Set(Object.keys(BIOMES.colosseum.spawnTable));
    expect(Object.keys(late).some((id) => !baseIds.has(id))).toBe(true);
  });
});
```

- [ ] **Step 2: Run** `npm test -- spawnEscalation` → FAIL.

- [ ] **Step 3: Implement** (`src/run/spawnEscalation.ts`)

```ts
import { BiomeDef, EnemyDef, AGE_ORDER } from '../game/types';

const TOUGH_LATE_BONUS = 4;   // weight added to the toughest base enemy at progress 1
const SEED_LATE_WEIGHT = 2;   // weight of the next-age seed enemy at progress 1

/** The biome representing the age after `biome`'s age, or null if `biome` is the last age. */
export function nextAgeBiomeId(biome: BiomeDef, biomes: Record<string, BiomeDef> = BIOMESREF): string | null {
  const idx = AGE_ORDER.indexOf(biome.minAge);
  const nextAge = AGE_ORDER[idx + 1];
  if (!nextAge) return null;
  const next = Object.values(biomes).find((b) => b.minAge === nextAge);
  return next ? next.id : null;
}

/**
 * Spawn weights for a biome at run `progress` (0..1). At 0 it's the base table; as it rises, the
 * biome's highest-baseHp enemy gains weight and the next age's toughest enemy is seeded in — so the
 * back half of a run is harder and the age boundary blends.
 */
export function spawnTableAt(
  biome: BiomeDef, progress: number,
  biomes: Record<string, BiomeDef>, enemies: Record<string, EnemyDef>,
): Record<string, number> {
  const p = Math.max(0, Math.min(1, progress));
  const table: Record<string, number> = { ...biome.spawnTable };
  if (p === 0) return table;

  // weight up the biome's toughest base enemy
  const baseIds = Object.keys(biome.spawnTable);
  const tough = baseIds.reduce((a, b) => (enemies[b].baseHp > enemies[a].baseHp ? b : a), baseIds[0]);
  table[tough] = (table[tough] ?? 0) + TOUGH_LATE_BONUS * p;

  // seed the next age's toughest enemy
  const nextId = nextAgeBiomeId(biome, biomes);
  if (nextId) {
    const nextTable = biomes[nextId].spawnTable;
    const nextIds = Object.keys(nextTable);
    const seed = nextIds.reduce((a, b) => (enemies[b].baseHp > enemies[a].baseHp ? b : a), nextIds[0]);
    table[seed] = (table[seed] ?? 0) + SEED_LATE_WEIGHT * p;
  }
  return table;
}

// Default biome registry reference (set by the importing module to avoid a cycle).
import { BIOMES as BIOMESREF } from './biomeData';
```

(If the `BIOMESREF` default-arg import causes a cycle warning, drop the default and always pass `BIOMES` explicitly from the call sites — the tests pass it explicitly already.)

- [ ] **Step 4: Run** `npm test -- spawnEscalation` → PASS; `npm run build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/run/spawnEscalation.ts tests/spawnEscalation.test.ts
git commit -m "feat(RC-017): pure within-run spawn escalation (tough + next-age seeds)"
```

---

### Task C2: wire escalation into the run + live verify

**Files:** Modify `src/scenes/RunScene.ts`

- [ ] **Step 1:** In `spawnEnemy`, compute progress and use the escalated table:

```ts
import { spawnTableAt } from '../run/spawnEscalation';
import { BIOMES } from '../run/biomeData';
import { ENEMIES } from '../run/enemyData';
// ...
    const progress = this.elapsed / RUN_DURATION_MS;
    const table = spawnTableAt(this.biome, progress, BIOMES, ENEMIES);
    const def = ENEMIES[pickEnemy(table, () => Math.random())];
```
(Replace the existing `pickEnemy(this.biome.spawnTable, …)` call.)

- [ ] **Step 2:** `npm test` green; `npm run build` clean. Commit:

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(RC-017): run spawns escalate toward tough + next-age enemies late"
```

- [ ] **Step 3: Live verify (`verify-canvas-game-playwright`).** Drive a run; sample the spawn mix early vs late — confirm late-run spawns skew toward the biome's tough enemy and at least one next-age enemy id appears. 0 console errors. Revert instrumentation; full suite + build green.

---

## Self-Review (author checklist)

- **Spec coverage:** ① economy core = A1–A8 (multipliers A1, scaleBundle A2, building age A3, cost helpers+re-author A4, income A5, yields A6, save A7, calibration A8); ② fixed-per-age difficulty = B1; ③ within-run escalation = C1–C2; live verification B2/C2. Save bump A7. Calibration procedure A8. All spec sections map to tasks.
- **Type consistency:** `incomeMult`/`costMult`/`gemValueForTier`/`ageIndexOf`/`COST_BASE`/`G` (A1) used identically in A4/A5/A6/B1; `scaleBundle` (A2) used in A4/A6; `BuildingDef.age` (A3) read by `buildingCost`/`nextAgeBiomeId`; `RunResult.tier` (A6) set in `RunScene.finish` and read in `applyRunResult`; `Expedition.{biomeId,tier}` (B1) matches `availableExpeditions` output and `RunScene`/`main` reads; `spawnTableAt` signature (C1) matches the C2 call site.
- **Placeholder scan:** the cost re-author (A4) is specified as an exact deterministic rule with role-magnitudes + worked test assertions (not a vague "tune costs"); calibration (A8) is a measured procedure. No "TBD"/"handle edge cases" left.
- **Phase independence:** after Phase A the game runs with exponential economy (old combat scaling still present, harmless); B then restructures difficulty; C adds the ramp. Each phase ends green.
