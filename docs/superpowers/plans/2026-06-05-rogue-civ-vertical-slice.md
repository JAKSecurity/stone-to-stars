# Rogue · Civ — Vertical Slice (P0 + P1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable vertical slice that proves the full core loop end-to-end — one timed survivor run that drops four resources, a ~6-node tech tree spanning the Stone and Bronze ages, a 3×3 base camp with buildable buildings, and the ratchet where research + building make the next run visibly stronger and carry you from the Stone Age into the Bronze Age.

**Architecture:** A hard split between **pure game logic** (no Phaser, no DOM — built TDD with Vitest) and **presentation** (a Phaser 3 run scene + a DOM civ screen, verified by running). All economy/tech/building/age/draft/save logic is pure and unit-tested; the presentation layers consume tested functions and never own rules. State is one persistent `CivState` (saved to `localStorage`) plus ephemeral per-run state that is discarded after resources are banked.

**Tech Stack:** TypeScript, Vite (dev server + static build), Vitest (unit tests), Phaser 3 (WebGL run scene), plain HTML/CSS DOM for the civ UI. No backend. Builds to static files.

**Testing strategy:** Logic tasks are full TDD (write failing test → see it fail → implement → see it pass → commit). Presentation tasks (DOM civ screen, Phaser scene, wiring) cannot be unit-tested meaningfully; they ship with explicit *run-and-observe* verification checklists instead. Logic modules MUST NOT import Phaser or touch `document`/`localStorage` directly — `localStorage` is injected so save/load stays testable in a Node environment.

**Numbers are concrete but not balanced.** The values below (costs, yields, HP) exist so the slice is complete and testable. Tests assert *logic* (does spending subtract the right amount?), never *balance* (is 25 industry the right price?). Tuning is a later phase.

---

## File Structure

```
package.json                     # scripts + deps
tsconfig.json                    # strict TS, bundler resolution
vite.config.ts                   # Vite + Vitest config (test block)
index.html                       # #civ and #run mount points
src/
  main.ts                        # orchestration: boot, civ ↔ run switch, save  [presentation]
  style.css                      # civ UI styles                                [presentation]
  game/
    types.ts                     # all shared types + RESOURCES constant
    config.ts                    # tunable constants (run length, grid size, base stats)
  economy/
    resources.ts                 # emptyBundle, addBundles, canAfford, spend
  tech/
    techData.ts                  # the 6 tech-node definitions (data)
    tech.ts                      # isResearched, canResearch, research, getAge, techUnlocksBuilding
  camp/
    buildingData.ts              # the 3 building definitions (data)
    camp.ts                      # isBuildingUnlocked, tileOccupied, canBuild, build, upgradeCost, upgradeBuilding
  run/
    modifiers.ts                 # computeRunModifiers (civ → run power)
    runStats.ts                  # initialRunStats, xpForLevel, addXp
    draft.ts                     # PERKS, rollDraft, applyPerk
  state/
    civState.ts                  # newCivState, applyRunResult
    saveLoad.ts                  # serialize, deserialize, save, load (storage injected)
  ui/
    civScreen.ts                 # renders the civ DOM screen                   [presentation]
  scenes/
    RunScene.ts                  # the Phaser survivor run                      [presentation]
tests/
  resources.test.ts
  tech.test.ts
  camp.test.ts
  modifiers.test.ts
  runStats.test.ts
  draft.test.ts
  civState.test.ts
  saveLoad.test.ts
```

**Type vocabulary (defined once in Task 3, used verbatim everywhere):**
`Resource`, `ResourceBundle`, `AgeId`, `TechNode`, `RunBonus`, `BuildingDef`, `PlacedBuilding`, `CivState`, `RunModifiers`, `RunResult`, `Perk`, `PerkEffect`, `RunStats`.

---

## Phase P0 — Skeleton

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/style.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "rogue-civ",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "phaser": "^3.80.1"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"],
    "lib": ["ESNext", "DOM", "DOM.Iterable"]
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths so it works on GitHub Pages project sites
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 4: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Rogue · Civ</title>
  </head>
  <body>
    <div id="civ"></div>
    <div id="run"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `src/style.css`**

```css
* { box-sizing: border-box; }
body { margin: 0; background: #0d1117; color: #e6edf3; font-family: system-ui, sans-serif; }
#run { display: none; }
#run.active { display: block; }
#civ.hidden { display: none; }
```

- [ ] **Step 6: Create `src/main.ts` (placeholder boot)**

```ts
import './style.css';

const civ = document.getElementById('civ')!;
civ.innerHTML = '<h1>Rogue · Civ</h1><p>Skeleton boots.</p>';
```

- [ ] **Step 7: Install and verify the dev server**

Run: `npm install`
Then run: `npm run dev`
Expected: Vite prints a `http://localhost:5173` URL; opening it shows "Rogue · Civ / Skeleton boots." Stop the server (Ctrl+C).

- [ ] **Step 8: Verify the production build**

Run: `npm run build`
Expected: `tsc --noEmit` passes with no errors and Vite writes a `dist/` folder. 

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.ts src/style.css
git commit -m "chore: scaffold Vite + TS + Phaser project skeleton"
```

---

### Task 2: Vitest sanity test

**Files:**
- Create: `tests/sanity.test.ts`

- [ ] **Step 1: Write a sanity test**

```ts
import { describe, it, expect } from 'vitest';

describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 2: Run it to verify the runner works**

Run: `npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 3: Commit**

```bash
git add tests/sanity.test.ts
git commit -m "test: confirm Vitest harness runs"
```

---

## Phase P1a — Core logic (TDD)

### Task 3: Shared types & config

**Files:**
- Create: `src/game/types.ts`
- Create: `src/game/config.ts`
- Test: `tests/resources.test.ts` (the constant assertion lands here in Task 4; this task is types/data only)

- [ ] **Step 1: Create `src/game/types.ts`**

```ts
export type Resource = 'exploration' | 'science' | 'industry' | 'culture';
export const RESOURCES: Resource[] = ['exploration', 'science', 'industry', 'culture'];
export type ResourceBundle = Record<Resource, number>;

export type AgeId = 'stone' | 'bronze';
/** Ascending order; index = how advanced. */
export const AGE_ORDER: AgeId[] = ['stone', 'bronze'];

export interface RunBonus {
  maxHp?: number;       // flat add
  damageMult?: number;  // additive fraction, 0.1 = +10%
  draftChoices?: number;// flat add
  weapons?: string[];   // weapon ids granted
}

export interface TechNode {
  id: string;
  name: string;
  age: AgeId;
  cost: Partial<ResourceBundle>;
  requires: string[];          // prerequisite tech ids
  unlocksBuilding?: string;    // building def id this tech makes buildable
  runBonus?: RunBonus;         // direct run bonus from the tech itself
  gatesAge?: AgeId;            // researching this advances the civ to that age
}

export interface BuildingDef {
  id: string;
  name: string;
  baseCost: Partial<ResourceBundle>; // cost of level 1; level n costs baseCost * n
  yield: Partial<ResourceBundle>;    // resources granted per run, per level
  runBonus: RunBonus;                // run bonus per level (weapons granted once, not per level)
  maxLevel: number;
}

export interface PlacedBuilding {
  id: string;   // building def id
  level: number;
  tile: number; // 0..GRID_SIZE-1
}

export interface CivState {
  version: number;
  banked: ResourceBundle;
  researched: string[];        // tech ids
  buildings: PlacedBuilding[];
  runs: number;
}

export interface RunModifiers {
  maxHp: number;
  damageMult: number;  // total multiplier, e.g., 1.25
  draftChoices: number;
  weapons: string[];
}

export interface RunResult {
  collected: ResourceBundle; // resources gathered during the run
  survivedMs: number;
  died: boolean;
}

export interface PerkEffect {
  damageMult?: number;    // additive fraction
  fireRateMult?: number;  // additive fraction
  moveSpeedMult?: number; // additive fraction
  maxHp?: number;         // flat add (also heals by same amount)
  pickupRadius?: number;  // flat add (pixels)
}

export interface Perk {
  id: string;
  name: string;
  desc: string;
  effect: PerkEffect;
}

export interface RunStats {
  hp: number;
  maxHp: number;
  damageMult: number;
  fireRateMult: number;
  moveSpeedMult: number;
  pickupRadius: number;
  level: number;
  xp: number;
}
```

- [ ] **Step 2: Create `src/game/config.ts`**

```ts
// Run duration. Keep short while developing; 5–10 min is the design target.
export const RUN_DURATION_MS = 5 * 60 * 1000;

// Base camp grid (3x3).
export const GRID_SIZE = 9;

// Base run power before any civ bonuses.
export const BASE_MAX_HP = 100;
export const BASE_DAMAGE_MULT = 1.0;
export const BASE_DRAFT_CHOICES = 3;
export const BASE_WEAPONS: string[] = ['club'];
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). No runtime behavior yet, so no unit test in this task.

- [ ] **Step 4: Commit**

```bash
git add src/game/types.ts src/game/config.ts
git commit -m "feat: shared types and config constants"
```

---

### Task 4: Resource economy

**Files:**
- Create: `src/economy/resources.ts`
- Test: `tests/resources.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { RESOURCES } from '../src/game/types';
import { emptyBundle, addBundles, canAfford, spend } from '../src/economy/resources';

describe('resources', () => {
  it('has exactly four resource types', () => {
    expect(RESOURCES).toEqual(['exploration', 'science', 'industry', 'culture']);
  });

  it('emptyBundle is all zeros', () => {
    expect(emptyBundle()).toEqual({ exploration: 0, science: 0, industry: 0, culture: 0 });
  });

  it('addBundles adds a partial onto a full bundle', () => {
    const base = { exploration: 1, science: 2, industry: 3, culture: 4 };
    expect(addBundles(base, { science: 10, culture: 1 })).toEqual({
      exploration: 1, science: 12, industry: 3, culture: 5,
    });
    // input is not mutated
    expect(base.science).toBe(2);
  });

  it('canAfford is true only when every cost key is covered', () => {
    const banked = { exploration: 0, science: 5, industry: 10, culture: 0 };
    expect(canAfford(banked, { industry: 10, science: 5 })).toBe(true);
    expect(canAfford(banked, { industry: 11 })).toBe(false);
    expect(canAfford(banked, {})).toBe(true);
  });

  it('spend subtracts a partial cost and never mutates input', () => {
    const banked = { exploration: 0, science: 5, industry: 10, culture: 0 };
    expect(spend(banked, { industry: 4, science: 5 })).toEqual({
      exploration: 0, science: 0, industry: 6, culture: 0,
    });
    expect(banked.industry).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- resources`
Expected: FAIL — cannot import from `../src/economy/resources` (module/exports missing).

- [ ] **Step 3: Write the implementation**

```ts
// src/economy/resources.ts
import { Resource, RESOURCES, ResourceBundle } from '../game/types';

export function emptyBundle(): ResourceBundle {
  return { exploration: 0, science: 0, industry: 0, culture: 0 };
}

export function addBundles(base: ResourceBundle, add: Partial<ResourceBundle>): ResourceBundle {
  const out = { ...base };
  for (const r of RESOURCES) {
    out[r] = base[r] + (add[r] ?? 0);
  }
  return out;
}

export function canAfford(banked: ResourceBundle, cost: Partial<ResourceBundle>): boolean {
  return (Object.keys(cost) as Resource[]).every((r) => banked[r] >= (cost[r] ?? 0));
}

export function spend(banked: ResourceBundle, cost: Partial<ResourceBundle>): ResourceBundle {
  const out = { ...banked };
  for (const r of Object.keys(cost) as Resource[]) {
    out[r] = banked[r] - (cost[r] ?? 0);
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- resources`
Expected: PASS — all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/economy/resources.ts tests/resources.test.ts
git commit -m "feat: resource bundle economy (add/afford/spend)"
```

---

### Task 5: Tech data + tech logic

**Files:**
- Create: `src/tech/techData.ts`
- Create: `src/tech/tech.ts`
- Test: `tests/tech.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { TECHS } from '../src/tech/techData';
import { isResearched, canResearch, research, getAge, techUnlocksBuilding } from '../src/tech/tech';
import { newCivState } from '../src/state/civState';

describe('tech', () => {
  it('defines the six slice techs with a mining → bronze_working prereq', () => {
    expect(Object.keys(TECHS).sort()).toEqual(
      ['bronze_working', 'hunting', 'mining', 'mysticism', 'pottery', 'writing'].sort(),
    );
    expect(TECHS.bronze_working.requires).toEqual(['mining']);
    expect(TECHS.bronze_working.gatesAge).toBe('bronze');
  });

  it('a fresh civ has no tech and is in the Stone Age', () => {
    const civ = newCivState();
    expect(isResearched(civ, 'pottery')).toBe(false);
    expect(getAge(civ)).toBe('stone');
  });

  it('cannot research a tech you cannot afford', () => {
    const civ = newCivState();
    expect(canResearch(civ, 'pottery')).toBe(false); // costs industry:10, banked is 0
  });

  it('cannot research a tech whose prerequisites are unmet, even if affordable', () => {
    const civ = { ...newCivState(), banked: { exploration: 0, science: 99, industry: 99, culture: 99 } };
    expect(canResearch(civ, 'bronze_working')).toBe(false); // needs mining first
  });

  it('research subtracts cost, records the tech, and is idempotent-guarded', () => {
    const civ = { ...newCivState(), banked: { exploration: 0, science: 0, industry: 10, culture: 0 } };
    const after = research(civ, 'pottery');
    expect(after.researched).toContain('pottery');
    expect(after.banked.industry).toBe(0);
    expect(() => research(after, 'pottery')).toThrow(); // already researched
  });

  it('researching the gate tech advances the age', () => {
    let civ = { ...newCivState(), banked: { exploration: 0, science: 99, industry: 99, culture: 99 } };
    civ = research(civ, 'mining');
    expect(getAge(civ)).toBe('stone');
    civ = research(civ, 'bronze_working');
    expect(getAge(civ)).toBe('bronze');
  });

  it('techUnlocksBuilding maps tech → building id', () => {
    expect(techUnlocksBuilding('pottery')).toBe('granary');
    expect(techUnlocksBuilding('hunting')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tech`
Expected: FAIL — `../src/tech/techData` and `../src/tech/tech` do not exist yet.

- [ ] **Step 3: Write the tech data**

```ts
// src/tech/techData.ts
import { TechNode } from '../game/types';

export const TECHS: Record<string, TechNode> = {
  pottery: {
    id: 'pottery', name: 'Pottery', age: 'stone',
    cost: { industry: 10 }, requires: [], unlocksBuilding: 'granary',
  },
  hunting: {
    id: 'hunting', name: 'Hunting', age: 'stone',
    cost: { industry: 8 }, requires: [], runBonus: { damageMult: 0.10 },
  },
  mysticism: {
    id: 'mysticism', name: 'Mysticism', age: 'stone',
    cost: { culture: 10 }, requires: [], runBonus: { maxHp: 15 },
  },
  mining: {
    id: 'mining', name: 'Mining', age: 'stone',
    cost: { industry: 15, science: 5 }, requires: [], unlocksBuilding: 'mine',
  },
  writing: {
    id: 'writing', name: 'Writing', age: 'stone',
    cost: { science: 12 }, requires: [], runBonus: { draftChoices: 1 },
  },
  bronze_working: {
    id: 'bronze_working', name: 'Bronze Working', age: 'bronze',
    cost: { industry: 25, science: 20 }, requires: ['mining'],
    unlocksBuilding: 'forge', gatesAge: 'bronze',
  },
};
```

- [ ] **Step 4: Write the tech logic**

```ts
// src/tech/tech.ts
import { AgeId, AGE_ORDER, CivState } from '../game/types';
import { canAfford, spend } from '../economy/resources';
import { TECHS } from './techData';

export function isResearched(civ: CivState, techId: string): boolean {
  return civ.researched.includes(techId);
}

export function canResearch(civ: CivState, techId: string): boolean {
  const tech = TECHS[techId];
  if (!tech) return false;
  if (isResearched(civ, techId)) return false;
  if (!tech.requires.every((req) => isResearched(civ, req))) return false;
  return canAfford(civ.banked, tech.cost);
}

export function research(civ: CivState, techId: string): CivState {
  if (!canResearch(civ, techId)) {
    throw new Error(`Cannot research ${techId}`);
  }
  const tech = TECHS[techId];
  return {
    ...civ,
    banked: spend(civ.banked, tech.cost),
    researched: [...civ.researched, techId],
  };
}

export function getAge(civ: CivState): AgeId {
  let best: AgeId = 'stone';
  for (const techId of civ.researched) {
    const gated = TECHS[techId]?.gatesAge;
    if (gated && AGE_ORDER.indexOf(gated) > AGE_ORDER.indexOf(best)) {
      best = gated;
    }
  }
  return best;
}

export function techUnlocksBuilding(techId: string): string | undefined {
  return TECHS[techId]?.unlocksBuilding;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tech`
Expected: PASS — all 7 tests pass. (Depends on `newCivState` from Task 9; if running tasks out of order, implement Task 9 Step 3 first.)

- [ ] **Step 6: Commit**

```bash
git add src/tech/techData.ts src/tech/tech.ts tests/tech.test.ts
git commit -m "feat: tech tree data + research/age logic"
```

---

### Task 6: Building data + camp logic

**Files:**
- Create: `src/camp/buildingData.ts`
- Create: `src/camp/camp.ts`
- Test: `tests/camp.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { BUILDINGS } from '../src/camp/buildingData';
import { isBuildingUnlocked, tileOccupied, canBuild, build, upgradeCost, upgradeBuilding } from '../src/camp/camp';
import { newCivState } from '../src/state/civState';
import { research } from '../src/tech/tech';

const RICH = { exploration: 99, science: 99, industry: 99, culture: 99 };

describe('camp', () => {
  it('defines granary, mine, forge', () => {
    expect(Object.keys(BUILDINGS).sort()).toEqual(['forge', 'granary', 'mine']);
  });

  it('a building is locked until its tech is researched', () => {
    const civ = { ...newCivState(), banked: { ...RICH } };
    expect(isBuildingUnlocked(civ, 'granary')).toBe(false);
    const after = research(civ, 'pottery');
    expect(isBuildingUnlocked(after, 'granary')).toBe(true);
  });

  it('cannot build a locked building', () => {
    const civ = { ...newCivState(), banked: { ...RICH } };
    expect(canBuild(civ, 'granary', 0)).toBe(false);
  });

  it('builds an unlocked building on an empty tile, paying base cost', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');           // unlock granary
    const beforeIndustry = civ.banked.industry;
    civ = build(civ, 'granary', 4);            // granary baseCost industry:10
    expect(civ.buildings).toEqual([{ id: 'granary', level: 1, tile: 4 }]);
    expect(civ.banked.industry).toBe(beforeIndustry - 10);
    expect(tileOccupied(civ, 4)).toBe(true);
  });

  it('cannot build on an occupied tile', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 4);
    expect(canBuild(civ, 'granary', 4)).toBe(false);
  });

  it('upgradeCost scales with the next level and upgrade raises level', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 4);            // level 1
    expect(upgradeCost('granary', 1)).toEqual({ industry: 20 }); // baseCost * 2
    civ = upgradeBuilding(civ, 4);             // -> level 2
    expect(civ.buildings.find((b) => b.tile === 4)!.level).toBe(2);
  });

  it('cannot upgrade past maxLevel', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 4);
    civ = upgradeBuilding(civ, 4); // 2
    civ = upgradeBuilding(civ, 4); // 3 (maxLevel)
    expect(() => upgradeBuilding(civ, 4)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- camp`
Expected: FAIL — building data/camp modules missing.

- [ ] **Step 3: Write the building data**

```ts
// src/camp/buildingData.ts
import { BuildingDef } from '../game/types';

export const BUILDINGS: Record<string, BuildingDef> = {
  granary: {
    id: 'granary', name: 'Granary',
    baseCost: { industry: 10 },
    yield: { culture: 3 },
    runBonus: { maxHp: 25 },
    maxLevel: 3,
  },
  mine: {
    id: 'mine', name: 'Mine',
    baseCost: { industry: 15, science: 5 },
    yield: { industry: 4 },
    runBonus: { damageMult: 0.05 },
    maxLevel: 3,
  },
  forge: {
    id: 'forge', name: 'Forge',
    baseCost: { industry: 25, science: 15 },
    yield: { science: 3 },
    runBonus: { damageMult: 0.10, weapons: ['bronze_spear'] },
    maxLevel: 3,
  },
};
```

- [ ] **Step 4: Write the camp logic**

```ts
// src/camp/camp.ts
import { CivState, Resource, ResourceBundle } from '../game/types';
import { canAfford, spend } from '../economy/resources';
import { TECHS } from '../tech/techData';
import { BUILDINGS } from './buildingData';

/** A building is unlocked when some researched tech unlocks it. */
export function isBuildingUnlocked(civ: CivState, buildingId: string): boolean {
  return civ.researched.some((t) => TECHS[t]?.unlocksBuilding === buildingId);
}

export function tileOccupied(civ: CivState, tile: number): boolean {
  return civ.buildings.some((b) => b.tile === tile);
}

export function canBuild(civ: CivState, buildingId: string, tile: number): boolean {
  const def = BUILDINGS[buildingId];
  if (!def) return false;
  if (!isBuildingUnlocked(civ, buildingId)) return false;
  if (tileOccupied(civ, tile)) return false;
  return canAfford(civ.banked, def.baseCost);
}

export function build(civ: CivState, buildingId: string, tile: number): CivState {
  if (!canBuild(civ, buildingId, tile)) {
    throw new Error(`Cannot build ${buildingId} on tile ${tile}`);
  }
  const def = BUILDINGS[buildingId];
  return {
    ...civ,
    banked: spend(civ.banked, def.baseCost),
    buildings: [...civ.buildings, { id: buildingId, level: 1, tile }],
  };
}

/** Cost to go from `currentLevel` to `currentLevel + 1`: baseCost * (currentLevel + 1). */
export function upgradeCost(buildingId: string, currentLevel: number): Partial<ResourceBundle> {
  const def = BUILDINGS[buildingId];
  const out: Partial<ResourceBundle> = {};
  for (const r of Object.keys(def.baseCost) as Resource[]) {
    out[r] = (def.baseCost[r] ?? 0) * (currentLevel + 1);
  }
  return out;
}

export function upgradeBuilding(civ: CivState, tile: number): CivState {
  const placed = civ.buildings.find((b) => b.tile === tile);
  if (!placed) throw new Error(`No building on tile ${tile}`);
  const def = BUILDINGS[placed.id];
  if (placed.level >= def.maxLevel) throw new Error(`${placed.id} is at max level`);
  const cost = upgradeCost(placed.id, placed.level);
  if (!canAfford(civ.banked, cost)) throw new Error(`Cannot afford upgrade`);
  return {
    ...civ,
    banked: spend(civ.banked, cost),
    buildings: civ.buildings.map((b) =>
      b.tile === tile ? { ...b, level: b.level + 1 } : b,
    ),
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- camp`
Expected: PASS — all 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/camp/buildingData.ts src/camp/camp.ts tests/camp.test.ts
git commit -m "feat: base-camp building data + place/upgrade logic"
```

---

### Task 7: Run modifiers (civ → run power)

**Files:**
- Create: `src/run/modifiers.ts`
- Test: `tests/modifiers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { computeRunModifiers } from '../src/run/modifiers';
import { newCivState } from '../src/state/civState';
import { research } from '../src/tech/tech';
import { build } from '../src/camp/camp';

const RICH = { exploration: 99, science: 99, industry: 99, culture: 99 };

describe('computeRunModifiers', () => {
  it('a fresh civ yields the base loadout', () => {
    const m = computeRunModifiers(newCivState());
    expect(m).toEqual({ maxHp: 100, damageMult: 1.0, draftChoices: 3, weapons: ['club'] });
  });

  it('tech run-bonuses stack onto the base', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'hunting');   // +0.10 damage
    civ = research(civ, 'mysticism'); // +15 maxHp
    civ = research(civ, 'writing');   // +1 draft choice
    const m = computeRunModifiers(civ);
    expect(m.maxHp).toBe(115);
    expect(m.damageMult).toBeCloseTo(1.10);
    expect(m.draftChoices).toBe(4);
  });

  it('building run-bonuses scale with level and grant weapons once', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 0); // +25 maxHp at level 1
    civ = research(civ, 'mining');
    civ = research(civ, 'bronze_working'); // unlock forge
    civ = build(civ, 'forge', 1);   // +0.10 damage, +bronze_spear
    const m = computeRunModifiers(civ);
    expect(m.maxHp).toBe(125);                 // 100 + 25
    expect(m.damageMult).toBeCloseTo(1.10);    // 1.0 + 0.10 forge
    expect(m.weapons).toEqual(['club', 'bronze_spear']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- modifiers`
Expected: FAIL — `computeRunModifiers` not defined.

- [ ] **Step 3: Write the implementation**

```ts
// src/run/modifiers.ts
import {
  CivState, RunModifiers,
} from '../game/types';
import {
  BASE_MAX_HP, BASE_DAMAGE_MULT, BASE_DRAFT_CHOICES, BASE_WEAPONS,
} from '../game/config';
import { TECHS } from '../tech/techData';
import { BUILDINGS } from '../camp/buildingData';

export function computeRunModifiers(civ: CivState): RunModifiers {
  let maxHp = BASE_MAX_HP;
  let damageMult = BASE_DAMAGE_MULT;
  let draftChoices = BASE_DRAFT_CHOICES;
  const weapons = new Set<string>(BASE_WEAPONS);

  // Tech-level bonuses.
  for (const techId of civ.researched) {
    const b = TECHS[techId]?.runBonus;
    if (!b) continue;
    maxHp += b.maxHp ?? 0;
    damageMult += b.damageMult ?? 0;
    draftChoices += b.draftChoices ?? 0;
    (b.weapons ?? []).forEach((w) => weapons.add(w));
  }

  // Building bonuses (per level; weapons granted once).
  for (const placed of civ.buildings) {
    const b = BUILDINGS[placed.id]?.runBonus;
    if (!b) continue;
    maxHp += (b.maxHp ?? 0) * placed.level;
    damageMult += (b.damageMult ?? 0) * placed.level;
    draftChoices += (b.draftChoices ?? 0) * placed.level;
    (b.weapons ?? []).forEach((w) => weapons.add(w));
  }

  return { maxHp, damageMult, draftChoices, weapons: [...weapons] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- modifiers`
Expected: PASS — all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/run/modifiers.ts tests/modifiers.test.ts
git commit -m "feat: compute run modifiers from civ state"
```

---

### Task 8: In-run stats, leveling, and draft

**Files:**
- Create: `src/run/runStats.ts`
- Create: `src/run/draft.ts`
- Test: `tests/runStats.test.ts`
- Test: `tests/draft.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/runStats.test.ts
import { describe, it, expect } from 'vitest';
import { initialRunStats, xpForLevel, addXp } from '../src/run/runStats';

describe('runStats', () => {
  it('initial stats derive from run modifiers', () => {
    const s = initialRunStats({ maxHp: 120, damageMult: 1.2, draftChoices: 3, weapons: ['club'] });
    expect(s.hp).toBe(120);
    expect(s.maxHp).toBe(120);
    expect(s.damageMult).toBe(1.2);
    expect(s.level).toBe(1);
    expect(s.xp).toBe(0);
    expect(s.fireRateMult).toBe(1);
    expect(s.moveSpeedMult).toBe(1);
  });

  it('xpForLevel rises with level', () => {
    expect(xpForLevel(1)).toBe(8);   // 5 + 3*1
    expect(xpForLevel(2)).toBe(11);  // 5 + 3*2
  });

  it('addXp carries over and can produce multiple level-ups', () => {
    const s = initialRunStats({ maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'] });
    const r = addXp(s, 20); // need 8 (->2), then 11 (->3); 20-8-11=1 left at level 3
    expect(r.stats.level).toBe(3);
    expect(r.stats.xp).toBe(1);
    expect(r.levelsGained).toBe(2);
  });
});
```

```ts
// tests/draft.test.ts
import { describe, it, expect } from 'vitest';
import { PERKS, rollDraft, applyPerk } from '../src/run/draft';
import { initialRunStats } from '../src/run/runStats';

// Deterministic RNG stub: returns the next value from a fixed list, looping.
function stubRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('draft', () => {
  it('rollDraft returns the requested count of distinct perks', () => {
    const picks = rollDraft(stubRng([0, 0, 0]), 3);
    expect(picks).toHaveLength(3);
    const ids = picks.map((p) => p.id);
    expect(new Set(ids).size).toBe(3); // distinct
  });

  it('rollDraft never exceeds the pool size', () => {
    const picks = rollDraft(stubRng([0]), 99);
    expect(picks).toHaveLength(PERKS.length);
  });

  it('applyPerk applies a damage perk multiplicatively-additively and never mutates', () => {
    const s = initialRunStats({ maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'] });
    const perk = { id: 'x', name: 'X', desc: '', effect: { damageMult: 0.25 } };
    const after = applyPerk(s, perk);
    expect(after.damageMult).toBeCloseTo(1.25);
    expect(s.damageMult).toBe(1); // unchanged
  });

  it('a maxHp perk raises both maxHp and heals current hp', () => {
    const s = { ...initialRunStats({ maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'] }), hp: 40 };
    const perk = { id: 'y', name: 'Y', desc: '', effect: { maxHp: 30 } };
    const after = applyPerk(s, perk);
    expect(after.maxHp).toBe(130);
    expect(after.hp).toBe(70);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- runStats draft`
Expected: FAIL — modules not defined.

- [ ] **Step 3: Write `runStats.ts`**

```ts
// src/run/runStats.ts
import { RunModifiers, RunStats } from '../game/types';

export function initialRunStats(mods: RunModifiers): RunStats {
  return {
    hp: mods.maxHp,
    maxHp: mods.maxHp,
    damageMult: mods.damageMult,
    fireRateMult: 1,
    moveSpeedMult: 1,
    pickupRadius: 60,
    level: 1,
    xp: 0,
  };
}

export function xpForLevel(level: number): number {
  return 5 + 3 * level;
}

export function addXp(stats: RunStats, amount: number): { stats: RunStats; levelsGained: number } {
  let { level, xp } = stats;
  xp += amount;
  let levelsGained = 0;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    levelsGained += 1;
  }
  return { stats: { ...stats, level, xp }, levelsGained };
}
```

- [ ] **Step 4: Write `draft.ts`**

```ts
// src/run/draft.ts
import { Perk, RunStats } from '../game/types';

export const PERKS: Perk[] = [
  { id: 'sharpen',   name: 'Sharpen',    desc: '+25% damage',       effect: { damageMult: 0.25 } },
  { id: 'rapid',     name: 'Rapid Fire', desc: '+20% fire rate',    effect: { fireRateMult: 0.20 } },
  { id: 'swift',     name: 'Swift',      desc: '+15% move speed',   effect: { moveSpeedMult: 0.15 } },
  { id: 'vigor',     name: 'Vigor',      desc: '+30 max HP, heal',  effect: { maxHp: 30 } },
  { id: 'magnet',    name: 'Magnet',     desc: '+40 pickup radius', effect: { pickupRadius: 40 } },
];

/** Pick `count` distinct perks using the supplied rng (() => [0,1)). */
export function rollDraft(rng: () => number, count: number): Perk[] {
  const pool = [...PERKS];
  const out: Perk[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length) % pool.length;
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

export function applyPerk(stats: RunStats, perk: Perk): RunStats {
  const e = perk.effect;
  const next: RunStats = { ...stats };
  if (e.damageMult) next.damageMult = stats.damageMult + e.damageMult;
  if (e.fireRateMult) next.fireRateMult = stats.fireRateMult + e.fireRateMult;
  if (e.moveSpeedMult) next.moveSpeedMult = stats.moveSpeedMult + e.moveSpeedMult;
  if (e.pickupRadius) next.pickupRadius = stats.pickupRadius + e.pickupRadius;
  if (e.maxHp) {
    next.maxHp = stats.maxHp + e.maxHp;
    next.hp = stats.hp + e.maxHp;
  }
  return next;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- runStats draft`
Expected: PASS — all tests across both files pass.

- [ ] **Step 6: Commit**

```bash
git add src/run/runStats.ts src/run/draft.ts tests/runStats.test.ts tests/draft.test.ts
git commit -m "feat: in-run stats, leveling, and perk draft logic"
```

---

### Task 9: Civ state + applying a run result

**Files:**
- Create: `src/state/civState.ts`
- Test: `tests/civState.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { newCivState, applyRunResult } from '../src/state/civState';
import { research } from '../src/tech/tech';
import { build } from '../src/camp/camp';

const RICH = { exploration: 99, science: 99, industry: 99, culture: 99 };

describe('civState', () => {
  it('newCivState starts empty in the Stone Age', () => {
    const civ = newCivState();
    expect(civ.researched).toEqual([]);
    expect(civ.buildings).toEqual([]);
    expect(civ.runs).toBe(0);
    expect(civ.banked).toEqual({ exploration: 0, science: 0, industry: 0, culture: 0 });
    expect(civ.version).toBe(1);
  });

  it('applyRunResult banks collected resources and increments runs', () => {
    const civ = newCivState();
    const after = applyRunResult(civ, {
      collected: { exploration: 5, science: 2, industry: 7, culture: 1 },
      survivedMs: 300000, died: false,
    });
    expect(after.banked).toEqual({ exploration: 5, science: 2, industry: 7, culture: 1 });
    expect(after.runs).toBe(1);
  });

  it('applyRunResult also adds per-run building yields times level', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 0); // granary yield culture:3 at level 1
    const before = civ.banked.culture;
    const after = applyRunResult(civ, {
      collected: { exploration: 0, science: 0, industry: 0, culture: 0 },
      survivedMs: 1, died: false,
    });
    expect(after.banked.culture).toBe(before + 3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- civState`
Expected: FAIL — `newCivState` / `applyRunResult` not defined.

- [ ] **Step 3: Write the implementation**

```ts
// src/state/civState.ts
import { CivState, RunResult } from '../game/types';
import { emptyBundle, addBundles } from '../economy/resources';
import { BUILDINGS } from '../camp/buildingData';

export function newCivState(): CivState {
  return {
    version: 1,
    banked: emptyBundle(),
    researched: [],
    buildings: [],
    runs: 0,
  };
}

export function applyRunResult(civ: CivState, result: RunResult): CivState {
  let banked = addBundles(civ.banked, result.collected);
  for (const placed of civ.buildings) {
    const def = BUILDINGS[placed.id];
    if (!def) continue;
    for (let i = 0; i < placed.level; i++) {
      banked = addBundles(banked, def.yield);
    }
  }
  return { ...civ, banked, runs: civ.runs + 1 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- civState`
Expected: PASS — all 3 tests pass. Also re-run the tech/camp/modifiers suites (they import `newCivState`): `npm test` → all green.

- [ ] **Step 5: Commit**

```bash
git add src/state/civState.ts tests/civState.test.ts
git commit -m "feat: civ state factory + applyRunResult (bank + building yields)"
```

---

### Task 10: Save / load

**Files:**
- Create: `src/state/saveLoad.ts`
- Test: `tests/saveLoad.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { serialize, deserialize, save, load, SAVE_KEY } from '../src/state/saveLoad';
import { newCivState, applyRunResult } from '../src/state/civState';

// Minimal in-memory Storage shim (so tests run in Node, no jsdom).
function memStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => { map.delete(k); },
    setItem: (k, v) => { map.set(k, v); },
  } as Storage;
}

describe('saveLoad', () => {
  it('round-trips a civ state through serialize/deserialize', () => {
    const civ = applyRunResult(newCivState(), {
      collected: { exploration: 1, science: 2, industry: 3, culture: 4 },
      survivedMs: 1, died: false,
    });
    expect(deserialize(serialize(civ))).toEqual(civ);
  });

  it('save then load returns an equal state', () => {
    const storage = memStorage();
    const civ = newCivState();
    save(civ, storage);
    expect(load(storage)).toEqual(civ);
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();
  });

  it('load returns null when there is no save', () => {
    expect(load(memStorage())).toBeNull();
  });

  it('load returns null on corrupt JSON instead of throwing', () => {
    const storage = memStorage();
    storage.setItem(SAVE_KEY, '{not json');
    expect(load(storage)).toBeNull();
  });

  it('load returns null on a version mismatch', () => {
    const storage = memStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ ...newCivState(), version: 999 }));
    expect(load(storage)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- saveLoad`
Expected: FAIL — `saveLoad` module missing.

- [ ] **Step 3: Write the implementation**

```ts
// src/state/saveLoad.ts
import { CivState } from '../game/types';

export const SAVE_KEY = 'rogue-civ-save-v1';
const CURRENT_VERSION = 1;

export function serialize(civ: CivState): string {
  return JSON.stringify(civ);
}

export function deserialize(json: string): CivState {
  return JSON.parse(json) as CivState;
}

export function save(civ: CivState, storage: Storage = localStorage): void {
  storage.setItem(SAVE_KEY, serialize(civ));
}

export function load(storage: Storage = localStorage): CivState | null {
  const raw = storage.getItem(SAVE_KEY);
  if (raw === null) return null;
  try {
    const parsed = deserialize(raw);
    if (parsed.version !== CURRENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- saveLoad`
Expected: PASS — all 5 tests pass.

- [ ] **Step 5: Run the whole logic suite**

Run: `npm test`
Expected: PASS — every test across all files is green. This is the full tested core of the game.

- [ ] **Step 6: Commit**

```bash
git add src/state/saveLoad.ts tests/saveLoad.test.ts
git commit -m "feat: localStorage save/load with version + corruption guards"
```

---

## Phase P1b — Presentation + wiring

> These three tasks are presentation. They consume the tested core and are verified by **running and observing**, not by unit tests. Each provides complete code; do not leave anything as a placeholder.

### Task 11: Civ screen (DOM)

**Files:**
- Create: `src/ui/civScreen.ts`
- Modify: `src/style.css` (append civ-screen styles)

This module renders the civ screen and calls back to the orchestrator. It owns *no rules* — it asks the logic layer what is affordable/unlocked and renders accordingly.

- [ ] **Step 1: Append styles to `src/style.css`**

```css
.civ-wrap { max-width: 920px; margin: 0 auto; padding: 16px; }
.resbar { display: flex; gap: 18px; font-size: 1.1rem; padding: 10px 14px; background: #161b22; border-radius: 8px; }
.resbar .age { margin-left: auto; opacity: 0.85; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 16px; }
.panel { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px; }
.panel h2 { margin: 0 0 10px; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8; }
.tech { display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #30363d; border-radius: 6px; margin-bottom: 6px; }
.tech.done { border-color: #3fb950; opacity: 0.7; }
.tech button { cursor: pointer; }
.tech button:disabled { cursor: not-allowed; opacity: 0.4; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.cell { aspect-ratio: 1; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; font-size: 1.4rem; }
.cell .lvl { font-size: 0.7rem; opacity: 0.7; }
.startrun { display: block; width: 100%; margin-top: 16px; padding: 14px; font-size: 1.1rem; background: #238636; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
.cost { font-size: 0.8rem; opacity: 0.75; }
```

- [ ] **Step 2: Write `src/ui/civScreen.ts`**

```ts
import { CivState, Resource, RESOURCES } from '../game/types';
import { TECHS } from '../tech/techData';
import { BUILDINGS } from '../camp/buildingData';
import { canResearch, isResearched, getAge } from '../tech/tech';
import { canBuild, isBuildingUnlocked, tileOccupied, upgradeCost } from '../camp/camp';
import { canAfford } from '../economy/resources';
import { GRID_SIZE } from '../game/config';

const ICON: Record<Resource, string> = {
  exploration: '🧭', science: '🔬', industry: '🏭', culture: '🎭',
};
const BUILD_ICON: Record<string, string> = { granary: '🌾', mine: '⛏️', forge: '🔥' };

export interface CivCallbacks {
  onResearch: (techId: string) => void;
  onBuild: (buildingId: string, tile: number) => void;
  onUpgrade: (tile: number) => void;
  onStartRun: () => void;
}

function costText(cost: Partial<Record<Resource, number>>): string {
  return RESOURCES.filter((r) => cost[r]).map((r) => `${ICON[r]}${cost[r]}`).join(' ') || 'free';
}

export function renderCivScreen(root: HTMLElement, civ: CivState, cb: CivCallbacks): void {
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'civ-wrap';

  // Resource bar + age.
  const bar = document.createElement('div');
  bar.className = 'resbar';
  bar.innerHTML =
    RESOURCES.map((r) => `<span>${ICON[r]} ${civ.banked[r]}</span>`).join('') +
    `<span class="age">Age: <strong>${getAge(civ) === 'bronze' ? 'Bronze' : 'Stone'}</strong></span>`;
  wrap.appendChild(bar);

  const cols = document.createElement('div');
  cols.className = 'cols';

  // Tech panel.
  const techPanel = document.createElement('div');
  techPanel.className = 'panel';
  techPanel.innerHTML = '<h2>Tech Tree</h2>';
  for (const tech of Object.values(TECHS)) {
    const row = document.createElement('div');
    const done = isResearched(civ, tech.id);
    row.className = 'tech' + (done ? ' done' : '');
    const label = document.createElement('div');
    label.innerHTML = `<div>${tech.name}</div><div class="cost">${costText(tech.cost)}</div>`;
    row.appendChild(label);
    if (done) {
      const tag = document.createElement('span');
      tag.textContent = '✓';
      row.appendChild(tag);
    } else {
      const btn = document.createElement('button');
      btn.textContent = 'Research';
      btn.disabled = !canResearch(civ, tech.id);
      btn.onclick = () => cb.onResearch(tech.id);
      row.appendChild(btn);
    }
    techPanel.appendChild(row);
  }
  cols.appendChild(techPanel);

  // Camp panel.
  const campPanel = document.createElement('div');
  campPanel.className = 'panel';
  campPanel.innerHTML = '<h2>Base Camp</h2>';
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (let tile = 0; tile < GRID_SIZE; tile++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const placed = civ.buildings.find((b) => b.tile === tile);
    if (placed) {
      const def = BUILDINGS[placed.id];
      cell.innerHTML = `${BUILD_ICON[placed.id] ?? '🏠'}<span class="lvl">${def.name} L${placed.level}</span>`;
      cell.title =
        placed.level < def.maxLevel
          ? `Upgrade — ${costText(upgradeCost(placed.id, placed.level))}`
          : 'Max level';
      cell.onclick = () => {
        if (placed.level < def.maxLevel && canAfford(civ.banked, upgradeCost(placed.id, placed.level))) {
          cb.onUpgrade(tile);
        }
      };
    } else {
      cell.innerHTML = '<span class="lvl">empty</span>';
      cell.onclick = () => {
        // Offer the first unlocked, affordable, not-yet-built building.
        const choice = Object.values(BUILDINGS).find(
          (def) =>
            isBuildingUnlocked(civ, def.id) &&
            !civ.buildings.some((b) => b.id === def.id) &&
            !tileOccupied(civ, tile) &&
            canBuild(civ, def.id, tile),
        );
        if (choice) cb.onBuild(choice.id, tile);
      };
    }
    grid.appendChild(cell);
  }
  campPanel.appendChild(grid);
  cols.appendChild(campPanel);

  wrap.appendChild(cols);

  const start = document.createElement('button');
  start.className = 'startrun';
  start.textContent = '⚔️  Start Expedition';
  start.onclick = () => cb.onStartRun();
  wrap.appendChild(start);

  root.appendChild(wrap);
}
```

- [ ] **Step 3: Verify by running (temporary harness)**

Temporarily replace `src/main.ts` body with a harness that renders the civ screen against a state with some resources, so you can see and click it:

```ts
import './style.css';
import { renderCivScreen } from './ui/civScreen';
import { newCivState } from './state/civState';
import { research } from './tech/tech';
import { build } from './camp/camp';

let civ = { ...newCivState(), banked: { exploration: 30, science: 30, industry: 60, culture: 30 } };
const root = document.getElementById('civ')!;
function rerender() {
  renderCivScreen(root, civ, {
    onResearch: (id) => { civ = research(civ, id); rerender(); },
    onBuild: (id, tile) => { civ = build(civ, id, tile); rerender(); },
    onUpgrade: (tile) => { /* wired in Task 13 */ },
    onStartRun: () => alert('run starts in Task 13'),
  });
}
rerender();
```

Run: `npm run dev` and open the URL.
**Observe and confirm:**
- The four resource counts and "Age: Stone" show in the bar.
- Research buttons are enabled only for affordable techs (e.g., Pottery, Hunting), disabled for Bronze Working (needs Mining first).
- Researching Pottery, then clicking an empty camp cell, places a Granary (L1) and deducts industry.
- Researching Mining → Bronze Working flips the bar to "Age: Bronze".

This temporary `main.ts` is replaced in Task 13 — do **not** commit it. Revert `main.ts` to the Task 1 placeholder before committing.

- [ ] **Step 4: Commit (module + styles only)**

```bash
git checkout src/main.ts   # discard the temporary harness
git add src/ui/civScreen.ts src/style.css
git commit -m "feat: civ screen DOM (resources, tech tree, base-camp grid)"
```

---

### Task 12: Phaser run scene

**Files:**
- Create: `src/scenes/RunScene.ts`

The survivor run. Uses simple colored shapes (no art assets — the pixel-art pass is P2) and Phaser arcade physics. It receives `RunModifiers` + an `onComplete(result)` callback via its `init` data, tracks resources collected, runs the in-run draft on level-up, and ends at the run timer.

**Resource sourcing in the slice:** red "beasts" drop **industry** gems; blue "scholars" drop **science** gems; green "relics" spawn periodically and are walk-over **culture** pickups; **exploration** accrues +1 every 4 seconds survived. All four resources are therefore obtainable in one run.

- [ ] **Step 1: Write `src/scenes/RunScene.ts`**

```ts
import Phaser from 'phaser';
import { RunModifiers, RunResult, Resource } from '../game/types';
import { RUN_DURATION_MS } from '../game/config';
import { initialRunStats, addXp } from '../run/runStats';
import { rollDraft, applyPerk } from '../run/draft';

const GEM_COLOR: Record<Resource, number> = {
  industry: 0xd9534f, science: 0x58a6ff, culture: 0x3fb950, exploration: 0xe3b341,
};

interface RunInit {
  modifiers: RunModifiers;
  onComplete: (result: RunResult) => void;
}

export class RunScene extends Phaser.Scene {
  private mods!: RunModifiers;
  private onComplete!: (r: RunResult) => void;
  private stats = initialRunStats({ maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'] });

  private player!: Phaser.GameObjects.Arc & { body: Phaser.Physics.Arcade.Body };
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private gems!: Phaser.Physics.Arcade.Group;
  private keys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

  private collected: Record<Resource, number> = { exploration: 0, science: 0, industry: 0, culture: 0 };
  private elapsed = 0;
  private fireCooldown = 0;
  private spawnCooldown = 0;
  private explorationCooldown = 0;
  private paused = false;
  private hud!: Phaser.GameObjects.Text;

  constructor() { super('run'); }

  init(data: RunInit) {
    this.mods = data.modifiers;
    this.onComplete = data.onComplete;
    this.stats = initialRunStats(this.mods);
    this.collected = { exploration: 0, science: 0, industry: 0, culture: 0 };
    this.elapsed = 0; this.fireCooldown = 0; this.spawnCooldown = 0;
    this.explorationCooldown = 0; this.paused = false;
  }

  create() {
    const { width, height } = this.scale;
    this.player = this.add.circle(width / 2, height / 2, 12, 0x5bd1ff) as any;
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.gems = this.physics.add.group();

    this.keys = {
      up: this.input.keyboard!.addKey('W'),
      down: this.input.keyboard!.addKey('S'),
      left: this.input.keyboard!.addKey('A'),
      right: this.input.keyboard!.addKey('D'),
    };

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.hitEnemy(b as any, e as any));
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.hitPlayer(e as any));
    this.physics.add.overlap(this.player, this.gems, (_p, g) => this.collectGem(g as any));

    this.hud = this.add.text(8, 8, '', { fontSize: '14px', color: '#fff' }).setDepth(10);
  }

  update(_t: number, deltaMs: number) {
    if (this.paused) return;
    const dt = deltaMs;
    this.elapsed += dt;

    // Movement.
    const speed = 180 * this.stats.moveSpeedMult;
    const b = this.player.body;
    b.setVelocity(0);
    if (this.keys.left.isDown) b.setVelocityX(-speed);
    if (this.keys.right.isDown) b.setVelocityX(speed);
    if (this.keys.up.isDown) b.setVelocityY(-speed);
    if (this.keys.down.isDown) b.setVelocityY(speed);

    // Auto-fire at nearest enemy.
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      this.fire();
      this.fireCooldown = 500 / this.stats.fireRateMult;
    }

    // Spawn enemies, ramping with time.
    this.spawnCooldown -= dt;
    if (this.spawnCooldown <= 0) {
      this.spawnEnemy();
      const ramp = 1 + this.elapsed / 60000; // faster over time
      this.spawnCooldown = Math.max(250, 1100 / ramp);
    }

    // Exploration trickle.
    this.explorationCooldown -= dt;
    if (this.explorationCooldown <= 0) {
      this.collected.exploration += 1;
      this.explorationCooldown = 4000;
    }

    // Enemies home toward player.
    (this.enemies.getChildren() as any[]).forEach((e) => {
      this.physics.moveToObject(e, this.player, 60);
    });

    // Pickup radius (gems drift to player when close).
    (this.gems.getChildren() as any[]).forEach((g) => {
      const d = Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y);
      if (d < this.stats.pickupRadius) this.physics.moveToObject(g, this.player, 240);
    });

    this.hud.setText(
      `HP ${Math.ceil(this.stats.hp)}/${this.stats.maxHp}  Lv${this.stats.level}  ` +
      `🧭${this.collected.exploration} 🔬${this.collected.science} 🏭${this.collected.industry} 🎭${this.collected.culture}  ` +
      `⏱ ${Math.max(0, Math.ceil((RUN_DURATION_MS - this.elapsed) / 1000))}s`,
    );

    if (this.elapsed >= RUN_DURATION_MS) this.finish(false);
  }

  private fire() {
    const target = this.nearestEnemy();
    const shots = this.mods.weapons.includes('bronze_spear') ? 2 : 1;
    for (let i = 0; i < shots; i++) {
      const bullet = this.add.circle(this.player.x, this.player.y, 4, 0xffffff) as any;
      this.physics.add.existing(bullet);
      this.bullets.add(bullet);
      bullet.setData('damage', 12 * this.stats.damageMult * (i === 1 ? 1.5 : 1));
      if (target) {
        this.physics.moveToObject(bullet, target, 420);
      } else {
        bullet.body.setVelocity(0, -420);
      }
      this.time.delayedCall(1200, () => bullet.destroy());
    }
  }

  private nearestEnemy(): Phaser.GameObjects.Arc | null {
    let best: any = null, bestD = Infinity;
    (this.enemies.getChildren() as any[]).forEach((e) => {
      const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (d < bestD) { bestD = d; best = e; }
    });
    return best;
  }

  private spawnEnemy() {
    const { width, height } = this.scale;
    const edge = Phaser.Math.Between(0, 3);
    const x = edge === 0 ? 0 : edge === 1 ? width : Phaser.Math.Between(0, width);
    const y = edge === 2 ? 0 : edge === 3 ? height : Phaser.Math.Between(0, height);
    const isScholar = Phaser.Math.Between(0, 2) === 0; // ~1/3 scholars
    const enemy = this.add.circle(x, y, 10, isScholar ? 0x58a6ff : 0xd9534f) as any;
    this.physics.add.existing(enemy);
    this.enemies.add(enemy);
    enemy.setData('hp', 24);
    enemy.setData('drop', isScholar ? 'science' : 'industry');
  }

  private hitEnemy(bullet: any, enemy: any) {
    bullet.destroy();
    const hp = enemy.getData('hp') - bullet.getData('damage');
    if (hp <= 0) {
      this.dropGem(enemy.x, enemy.y, enemy.getData('drop'));
      enemy.destroy();
      this.gainXp(3);
    } else {
      enemy.setData('hp', hp);
    }
  }

  private hitPlayer(enemy: any) {
    this.stats.hp -= 6;
    enemy.destroy();
    if (this.stats.hp <= 0) this.finish(true);
  }

  private dropGem(x: number, y: number, resource: Resource) {
    const gem = this.add.rectangle(x, y, 8, 8, GEM_COLOR[resource]) as any;
    this.physics.add.existing(gem);
    this.gems.add(gem);
    gem.setData('resource', resource);
  }

  private collectGem(gem: any) {
    this.collected[gem.getData('resource') as Resource] += 1;
    gem.destroy();
  }

  private gainXp(amount: number) {
    const before = this.stats.level;
    const r = addXp(this.stats, amount);
    this.stats = r.stats;
    if (r.stats.level > before) this.openDraft();
  }

  private openDraft() {
    this.paused = true;
    this.physics.pause();
    const picks = rollDraft(() => Math.random(), this.mods.draftChoices);
    const { width, height } = this.scale;
    const panel = this.add.container(0, 0).setDepth(20);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    panel.add(bg);
    const title = this.add.text(width / 2, height / 2 - 120, 'Level up — choose a perk',
      { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
    panel.add(title);
    picks.forEach((perk, i) => {
      const y = height / 2 - 50 + i * 56;
      const card = this.add.rectangle(width / 2, y, 360, 48, 0x238636).setInteractive({ useHandCursor: true });
      const label = this.add.text(width / 2, y, `${perk.name} — ${perk.desc}`,
        { fontSize: '16px', color: '#fff' }).setOrigin(0.5);
      card.on('pointerdown', () => {
        this.stats = applyPerk(this.stats, perk);
        panel.destroy();
        this.paused = false;
        this.physics.resume();
      });
      panel.add(card); panel.add(label);
    });
  }

  private finish(died: boolean) {
    if (this.paused && died) { /* allow finish even if a draft was open */ }
    this.onComplete({
      collected: { ...this.collected },
      survivedMs: this.elapsed,
      died,
    });
  }
}
```

- [ ] **Step 2: Verify by running (temporary harness)**

Temporarily set `src/main.ts` to launch the scene directly so you can play it:

```ts
import './style.css';
import Phaser from 'phaser';
import { RunScene } from './scenes/RunScene';

document.getElementById('civ')!.style.display = 'none';
document.getElementById('run')!.classList.add('active');

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'run',
  width: 800, height: 600,
  backgroundColor: '#10141f',
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: RunScene,
});
game.scene.start('run', {
  modifiers: { maxHp: 100, damageMult: 1, draftChoices: 3, weapons: ['club'] },
  onComplete: (r: any) => { alert('Run done: ' + JSON.stringify(r.collected)); },
});
```

Run: `npm run dev`.
**Observe and confirm:**
- WASD moves the blue player; the world is bounded.
- White bullets auto-fire at the nearest enemy; red beasts and blue scholars stream in and chase you.
- Killing a beast drops a red (industry) gem; a scholar drops a blue (science) gem; gems are vacuumed in near you and increment the HUD counts; exploration ticks up over time.
- A level-up pauses the game and shows three perk cards; picking one resumes with the perk applied (e.g., Swift visibly speeds you up).
- Touching enemies drains HP; at 0 HP, or when the timer expires, the `onComplete` alert shows the collected resources.

Revert this temporary `main.ts` before committing.

- [ ] **Step 3: Commit (scene only)**

```bash
git checkout src/main.ts   # discard the temporary harness
git add src/scenes/RunScene.ts
git commit -m "feat: Phaser survivor run scene (move, auto-fire, drops, draft)"
```

---

### Task 13: Orchestration — wire the full loop

**Files:**
- Modify: `src/main.ts` (replace the placeholder with the real orchestrator)

This is the payoff task: boot → load (or new) civ → show civ screen → start run with computed modifiers → on run complete, bank result + save + re-show civ screen. The loop is now closed.

- [ ] **Step 1: Replace `src/main.ts`**

```ts
import './style.css';
import Phaser from 'phaser';
import { CivState, RunModifiers, RunResult } from './game/types';
import { newCivState, applyRunResult } from './state/civState';
import { load, save } from './state/saveLoad';
import { research } from './tech/tech';
import { build, upgradeBuilding } from './camp/camp';
import { computeRunModifiers } from './run/modifiers';
import { renderCivScreen } from './ui/civScreen';
import { RunScene } from './scenes/RunScene';

const civEl = document.getElementById('civ')!;
const runEl = document.getElementById('run')!;

let civ: CivState = load() ?? newCivState();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'run',
  width: 800,
  height: 600,
  backgroundColor: '#10141f',
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [RunScene],
  autoStart: false,
});

function showCiv() {
  runEl.classList.remove('active');
  civEl.classList.remove('hidden');
  renderCivScreen(civEl, civ, {
    onResearch: (id) => { civ = research(civ, id); persist(); showCiv(); },
    onBuild: (id, tile) => { civ = build(civ, id, tile); persist(); showCiv(); },
    onUpgrade: (tile) => { civ = upgradeBuilding(civ, tile); persist(); showCiv(); },
    onStartRun: () => startRun(),
  });
}

function startRun() {
  civEl.classList.add('hidden');
  runEl.classList.add('active');
  const modifiers: RunModifiers = computeRunModifiers(civ);
  game.scene.stop('run');
  game.scene.start('run', {
    modifiers,
    onComplete: (result: RunResult) => onRunComplete(result),
  });
}

function onRunComplete(result: RunResult) {
  game.scene.stop('run');
  civ = applyRunResult(civ, result);
  persist();
  showCiv();
}

function persist() {
  save(civ);
}

showCiv();
```

- [ ] **Step 2: Build to catch type errors**

Run: `npm run build`
Expected: `tsc --noEmit` passes; Vite emits `dist/`.

- [ ] **Step 3: Full-loop manual verification**

Run: `npm run dev` and open the URL. Walk the entire loop:
1. **Fresh boot** shows the civ screen, Age: Stone, all resources 0, every Research button disabled (you can't afford anything yet).
2. Click **Start Expedition** → the Phaser run plays. Survive/collect for a bit (or let the timer run — you may shorten `RUN_DURATION_MS` in `config.ts` to ~30s while testing).
3. **Run ends** → back on the civ screen, resource counts have risen by what you collected.
4. Repeat runs until you can **research Hunting/Pottery**; research Pottery, then **click an empty camp cell** to build a Granary. Confirm industry was spent and the cell shows "Granary L1".
5. Start another run — confirm it feels stronger (Granary gives +25 max HP; the run HUD should show max HP 125 if only Granary is built).
6. Bank enough to research **Mining**, then **Bronze Working** → the age flips to **Bronze**, the **Forge** becomes buildable, and building it adds a second projectile (bronze spear) on the next run.
7. **Reload the page** → your civ state (resources, techs, buildings, age) is restored from `localStorage`.

If all seven hold, the vertical slice is proven: the full ratchet works and you crossed from Stone into Bronze.

- [ ] **Step 4: Restore the real run duration**

Ensure `RUN_DURATION_MS` in `src/game/config.ts` is back to its intended value (not the 30s test value) before committing.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/game/config.ts
git commit -m "feat: wire full loop — civ screen, runs, banking, save/load"
```

---

### Task 14: Slice acceptance + tidy

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — every logic test green.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: clean `tsc` + a `dist/` bundle. (This `dist/` is what deploys to GitHub Pages in a later phase.)

- [ ] **Step 3: Write `README.md`**

```markdown
# Rogue · Civ

A free browser game: short pixel-art survivor runs fuel a tech-tree + base-camp
civilization, climbing the ages at your own pace toward a final stand.

This repo is the **vertical slice** (P0 + P1): one survivor run, four resources,
a Stone→Bronze tech tree, a 3×3 base camp, and the full ratchet loop.

## Develop
- `npm install`
- `npm run dev` — play at the printed localhost URL
- `npm test` — run the logic unit tests
- `npm run build` — static build into `dist/`

## Design
See `docs/superpowers/specs/2026-06-05-rogue-civ-design.md` for the full design,
and `docs/superpowers/plans/2026-06-05-rogue-civ-vertical-slice.md` for this slice's plan.

## Architecture
Pure game logic (`src/economy`, `src/tech`, `src/camp`, `src/run`, `src/state`)
is unit-tested and free of Phaser/DOM. Presentation (`src/ui/civScreen.ts` DOM,
`src/scenes/RunScene.ts` Phaser) consumes that tested core. `src/main.ts` wires them.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README for the vertical slice"
```

---

## Self-Review (completed by author)

**Spec coverage** — every spec section maps to tasks:
- §2 core loop → Tasks 9, 13 (applyRunResult + orchestration close the loop).
- §3 the run → Task 12 (timed survival, WASD + auto-fire, in-run draft, four-resource sourcing).
- §4 civilization → Tasks 5 (tech tree), 6 (base camp unified via `unlocksBuilding`), 7 (civ→run bridge), 11 (UI).
- §5 four resources → Tasks 3, 4 (capped at four; combo costs in tech/building data).
- §6 ages → Task 5 (`getAge`, `gatesAge`) advancing Stone→Bronze; difficulty ramp in Task 12 spawn logic. *(Finale + ages beyond Bronze are explicitly P3/P2, out of this slice.)*
- §7 tech/architecture → Tasks 1, 10 (Vite/TS/Phaser, localStorage, pure-logic boundary).
- §8 build order → this plan *is* P0 + P1.

**Out of slice (intentionally):** Iron→Space ages, weapon evolutions, juice/audio pass, the Last Stand finale, endless mode. These are P2–P4 and get their own plans.

**Placeholder scan** — no TBD/TODO; every code step contains complete code; temporary harnesses are clearly marked and explicitly discarded (`git checkout src/main.ts`) before their commits.

**Type consistency** — names used verbatim across tasks: `CivState`, `RunModifiers`, `RunResult`, `RunStats`, `Perk`, `ResourceBundle`; functions `newCivState`, `applyRunResult`, `computeRunModifiers`, `research`, `build`, `upgradeBuilding`, `rollDraft`, `applyPerk`, `addXp`, `save`/`load`. `RunScene` is constructed with `{ modifiers, onComplete }` in both its harness (Task 12) and the orchestrator (Task 13).

**Known cross-task dependency:** Tasks 5–7 import `newCivState` from `src/state/civState.ts` (Task 9). When executing strictly in order, create `src/state/civState.ts` (Task 9 Step 3) before running the Task 5 suite, or run Task 9 ahead of Tasks 5–7. Noted in Task 5 Step 5.
