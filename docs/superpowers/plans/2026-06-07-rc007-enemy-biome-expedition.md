# RC-007 — Enemy + Biome + Expedition Systems Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift enemies out of `RunScene`'s hardcoding into data, and add a biome + expedition system — the player picks an expedition (biome × difficulty tier) each run, difficulty scales with age, and biomes bias which resources a run faucets.

**Architecture:** New pure modules `src/run/enemyData.ts` (the `EnemyDef` catalog), `src/run/biomeData.ts` (the `BiomeDef` catalog with per-biome spawn tables + resource bias), and `src/run/expedition.ts` (pure: derive the available biome×tier expeditions from civ state, compute tier scaling, and weighted-pick an enemy). `RunScene` consumes them — `spawnEnemy` reads the active expedition's spawn table + scaling instead of a hardcoded beast/scholar. A new DOM surface `src/ui/expeditionScreen.ts` (flat grid of all available expeditions, per Jeff's UI principle) sits between the civ screen and the run. Mirrors the existing pure-logic-vs-presentation split.

**Tech Stack:** TypeScript + Vite + Phaser 3 (run) + HTML/CSS DOM (civ + expedition screens) + Vitest (unit tests) + Playwright (live verification).

**Spec:** `docs/superpowers/specs/2026-06-06-iron-age-slice-design.md` §3b, §3c, §5. **This plan is RC-007 only** — the second of four C3 tickets (RC-006 ✅ → **RC-007** → RC-008 Iron content → RC-009 juice/balance). It builds on the merged RC-006 weapon system.

**Scope (explicit, to avoid blocking on art):** RC-007 ships **3 base biomes using only the existing `beast` and `scholar` sprites**, differentiated by spawn-table weighting and biome resource-bias. **No new enemy art.** New enemy *types and sprites* (sentinel, raider, cave dweller, rock golem, Iron Golem) and the Deep Caverns biome land in **RC-008** via the `src/art` pipeline. Adding `'iron'` to `AGE_ORDER` is plumbing only — no tech gates Iron until RC-008, so `getAge` never returns `'iron'` yet and no Iron-tier expeditions appear until then.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/game/types.ts` | Add `'iron'` to `AgeId`/`AGE_ORDER`; add `EnemyDef`, `BiomeDef`, `ExpeditionScaling`, `Expedition` | Modify |
| `src/run/enemyData.ts` | `EnemyDef` catalog (beast, scholar) | Create |
| `src/run/biomeData.ts` | `BiomeDef` catalog (wilds, ruins, frontier) | Create |
| `src/run/expedition.ts` | Pure: `tierScaling`, `availableExpeditions`, `pickEnemy` | Create |
| `src/scenes/RunScene.ts` | Data-driven spawn from expedition; per-enemy stats; tier scaling; biome-biased sourcing | Modify |
| `src/ui/expeditionScreen.ts` | DOM flat-grid expedition picker | Create |
| `src/main.ts` | Run flow: civ → expedition pick → run | Modify |
| `index.html` | Add `#expedition` surface | Modify |
| `src/style.css` | Expedition screen styles | Modify |
| `tests/enemyData.test.ts`, `tests/biomeData.test.ts`, `tests/expedition.test.ts` | Unit tests | Create |

Unchanged: weapon system (`weaponData.ts`/`weapons.ts`), `modifiers.ts`, tech/camp/economy.

---

## Task 1: Types — `iron` age + enemy/biome/expedition interfaces

**Files:**
- Modify: `src/game/types.ts`
- Test: `tests/expedition.test.ts` (created here for the AGE_ORDER assertion; expanded in Tasks 4–6)

- [ ] **Step 1: Write the failing test**

Create `tests/expedition.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { AGE_ORDER } from '../src/game/types';

describe('age order', () => {
  it('runs stone → bronze → iron', () => {
    expect(AGE_ORDER).toEqual(['stone', 'bronze', 'iron']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- expedition`
Expected: FAIL — `AGE_ORDER` does not include `'iron'`.

- [ ] **Step 3: Edit `src/game/types.ts`**

Change the `AgeId` type and `AGE_ORDER` (currently `'stone' | 'bronze'`):

```ts
export type AgeId = 'stone' | 'bronze' | 'iron';
/** Ascending order; index = how advanced. */
export const AGE_ORDER: AgeId[] = ['stone', 'bronze', 'iron'];
```

Then add these interfaces after the existing `BuildingDef` interface (they reference `Resource` and `AgeId`, both already defined above in the file):

```ts
export interface EnemyDef {
  id: string;
  sprite: string;             // art registry texture id
  baseHp: number;             // before tier scaling
  speed: number;              // px/s chase speed, before tier scaling
  contactDamage: number;      // hp removed from player on contact
  drop: Resource;             // gem dropped on kill
  xp: number;                 // xp granted on kill
  displaySize: { w: number; h: number };
}

export interface BiomeDef {
  id: string;
  name: string;
  minAge: AgeId;                                    // unlock gate
  resourceBias: Partial<Record<Resource, number>>; // >1 faucets that resource faster
  spawnTable: Record<string, number>;              // enemyId -> spawn weight
  tint: string;                                     // run background color
}

export interface ExpeditionScaling {
  hpMult: number;
  speedMult: number;
  spawnRateMult: number;
  dropMult: number;
}

export interface Expedition {
  biomeId: string;
  tier: number;               // difficulty; equals an AGE_ORDER index
  scaling: ExpeditionScaling;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- expedition`
Expected: PASS (1 test).

- [ ] **Step 5: Verify the whole suite still compiles/passes**

Run: `npm test`
Expected: PASS — all 72 prior tests + 1 new. (Adding `'iron'` to `AgeId` is additive; nothing breaks.)

- [ ] **Step 6: Commit**

```bash
git add src/game/types.ts tests/expedition.test.ts
git commit -m "feat(types): iron age + EnemyDef/BiomeDef/Expedition interfaces"
```

---

## Task 2: Enemy catalog

**Files:**
- Create: `src/run/enemyData.ts`
- Test: `tests/enemyData.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/enemyData.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ENEMIES } from '../src/run/enemyData';
import { RESOURCES } from '../src/game/types';

describe('enemyData', () => {
  it('defines beast and scholar', () => {
    expect(ENEMIES.beast).toBeDefined();
    expect(ENEMIES.scholar).toBeDefined();
  });

  it('each entry key matches its id and uses an existing-art sprite (no new art in RC-007)', () => {
    for (const [key, def] of Object.entries(ENEMIES)) {
      expect(def.id).toBe(key);
      expect(['beast', 'scholar']).toContain(def.sprite);
    }
  });

  it('each entry has positive stats and a valid drop resource', () => {
    for (const def of Object.values(ENEMIES)) {
      expect(def.baseHp).toBeGreaterThan(0);
      expect(def.speed).toBeGreaterThan(0);
      expect(def.contactDamage).toBeGreaterThan(0);
      expect(def.xp).toBeGreaterThan(0);
      expect(RESOURCES).toContain(def.drop);
      expect(def.displaySize.w).toBeGreaterThan(0);
      expect(def.displaySize.h).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- enemyData`
Expected: FAIL — `Cannot find module '../src/run/enemyData'`.

- [ ] **Step 3: Create `src/run/enemyData.ts`**

```ts
import { EnemyDef } from '../game/types';

// RC-007 reuses the two existing sprites (beast, scholar). New enemy types + art
// land in RC-008. Values for beast match the pre-RC-007 hardcoded enemy (24 hp,
// 6 contact, 3 xp, ~29x26) so The Wilds plays as before at tier 0.
export const ENEMIES: Record<string, EnemyDef> = {
  beast: {
    id: 'beast', sprite: 'beast',
    baseHp: 24, speed: 60, contactDamage: 6, drop: 'industry', xp: 3,
    displaySize: { w: 29, h: 26 },
  },
  scholar: {
    id: 'scholar', sprite: 'scholar',
    baseHp: 18, speed: 70, contactDamage: 5, drop: 'science', xp: 3,
    displaySize: { w: 20, h: 26 },
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- enemyData`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/run/enemyData.ts tests/enemyData.test.ts
git commit -m "feat(enemies): EnemyDef catalog (beast, scholar) reusing existing art"
```

---

## Task 3: Biome catalog

**Files:**
- Create: `src/run/biomeData.ts`
- Test: `tests/biomeData.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/biomeData.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BIOMES } from '../src/run/biomeData';
import { ENEMIES } from '../src/run/enemyData';
import { AGE_ORDER, RESOURCES } from '../src/game/types';

describe('biomeData', () => {
  it('defines the three base biomes', () => {
    expect(Object.keys(BIOMES).sort()).toEqual(['frontier', 'ruins', 'wilds']);
  });

  it('every spawn-table entry references a real enemy and a positive weight', () => {
    for (const biome of Object.values(BIOMES)) {
      const entries = Object.entries(biome.spawnTable);
      expect(entries.length).toBeGreaterThan(0);
      for (const [enemyId, weight] of entries) {
        expect(ENEMIES[enemyId]).toBeDefined();
        expect(weight).toBeGreaterThan(0);
      }
    }
  });

  it('every biome has a valid minAge and resource-bias keys', () => {
    for (const [key, biome] of Object.entries(BIOMES)) {
      expect(biome.id).toBe(key);
      expect(AGE_ORDER).toContain(biome.minAge);
      for (const r of Object.keys(biome.resourceBias)) {
        expect(RESOURCES).toContain(r);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- biomeData`
Expected: FAIL — `Cannot find module '../src/run/biomeData'`.

- [ ] **Step 3: Create `src/run/biomeData.ts`**

```ts
import { BiomeDef } from '../game/types';

// 3 base biomes, all using existing enemy sprites (RC-007 is art-free). Industry/
// science come from which enemies the spawn table favors; exploration/culture come
// from resourceBias scaling the in-run explore-tick and relic rates (RunScene).
export const BIOMES: Record<string, BiomeDef> = {
  wilds: {
    id: 'wilds', name: 'The Wilds', minAge: 'stone',
    resourceBias: { industry: 1 },
    spawnTable: { beast: 3, scholar: 1 },
    tint: '#10141f',
  },
  ruins: {
    id: 'ruins', name: 'Ancient Ruins', minAge: 'stone',
    resourceBias: { science: 1 },
    spawnTable: { scholar: 3, beast: 1 },
    tint: '#161b22',
  },
  frontier: {
    id: 'frontier', name: 'Frontier', minAge: 'bronze',
    resourceBias: { exploration: 2, culture: 2 },
    spawnTable: { beast: 1, scholar: 1 },
    tint: '#1a1410',
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- biomeData`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/run/biomeData.ts tests/biomeData.test.ts
git commit -m "feat(biomes): BiomeDef catalog (wilds, ruins, frontier)"
```

---

## Task 4: `tierScaling`

**Files:**
- Create: `src/run/expedition.ts`
- Test: `tests/expedition.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `tests/expedition.test.ts`:

```ts
import { tierScaling } from '../src/run/expedition';

describe('tierScaling', () => {
  it('tier 0 is the baseline (all multipliers 1)', () => {
    expect(tierScaling(0)).toEqual({ hpMult: 1, speedMult: 1, spawnRateMult: 1, dropMult: 1 });
  });

  it('higher tiers scale hp/speed/spawn/drop', () => {
    expect(tierScaling(2)).toEqual({ hpMult: 2, speedMult: 1.2, spawnRateMult: 1.5, dropMult: 2 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- expedition`
Expected: FAIL — `Cannot find module '../src/run/expedition'`.

- [ ] **Step 3: Create `src/run/expedition.ts`**

```ts
import { Expedition, ExpeditionScaling, CivState, AGE_ORDER } from '../game/types';
import { BIOMES } from './biomeData';
import { getAge } from '../tech/tech';

/** Difficulty multipliers for a tier (tier = an AGE_ORDER index; 0 = baseline). */
export function tierScaling(tier: number): ExpeditionScaling {
  return {
    hpMult: 1 + 0.5 * tier,
    speedMult: 1 + 0.1 * tier,
    spawnRateMult: 1 + 0.25 * tier,
    dropMult: 1 + 0.5 * tier,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- expedition`
Expected: PASS (3 tests: age-order + 2 tierScaling).

Note on float math: `tierScaling(2).speedMult` is `1 + 0.1*2 = 1.2` exactly here (0.1*2 = 0.2 is representable closely enough that `toEqual` passes; if a future tier triggers float drift, switch that assertion to `toBeCloseTo`). Tier 2 values are exact.

- [ ] **Step 5: Commit**

```bash
git add src/run/expedition.ts tests/expedition.test.ts
git commit -m "feat(expedition): tierScaling difficulty multipliers"
```

---

## Task 5: `availableExpeditions`

**Files:**
- Modify: `src/run/expedition.ts`
- Test: `tests/expedition.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `tests/expedition.test.ts` (add `availableExpeditions` to the expedition import; add the civ/tech imports):

```ts
import { availableExpeditions } from '../src/run/expedition';
import { newCivState } from '../src/state/civState';
import { research } from '../src/tech/tech';

const RICH = { exploration: 99, science: 99, industry: 99, culture: 99 };

describe('availableExpeditions', () => {
  it('a fresh (stone) civ gets only the stone biomes at tier 0', () => {
    const exps = availableExpeditions(newCivState());
    expect(exps.map((e) => `${e.biomeId}:${e.tier}`).sort())
      .toEqual(['ruins:0', 'wilds:0']);
  });

  it('a bronze civ unlocks frontier and tier-1 versions of the stone biomes', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'mining');
    civ = research(civ, 'bronze_working'); // gatesAge: 'bronze'
    const ids = availableExpeditions(civ).map((e) => `${e.biomeId}:${e.tier}`).sort();
    expect(ids).toEqual(['frontier:1', 'ruins:0', 'ruins:1', 'wilds:0', 'wilds:1']);
  });

  it('each expedition carries the scaling for its tier', () => {
    const wilds0 = availableExpeditions(newCivState()).find((e) => e.biomeId === 'wilds');
    expect(wilds0!.scaling).toEqual({ hpMult: 1, speedMult: 1, spawnRateMult: 1, dropMult: 1 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- expedition`
Expected: FAIL — `availableExpeditions is not a function`.

- [ ] **Step 3: Add `availableExpeditions` to `src/run/expedition.ts`**

```ts
/**
 * Every expedition the player can currently run: each unlocked biome (minAge reached)
 * offered at tiers from its minAge index up to the civ's current age index.
 */
export function availableExpeditions(civ: CivState): Expedition[] {
  const curIdx = AGE_ORDER.indexOf(getAge(civ));
  const out: Expedition[] = [];
  for (const biome of Object.values(BIOMES)) {
    const minIdx = AGE_ORDER.indexOf(biome.minAge);
    if (minIdx > curIdx) continue;
    for (let tier = minIdx; tier <= curIdx; tier++) {
      out.push({ biomeId: biome.id, tier, scaling: tierScaling(tier) });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- expedition`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/run/expedition.ts tests/expedition.test.ts
git commit -m "feat(expedition): availableExpeditions (biome x tier, age-gated)"
```

---

## Task 6: `pickEnemy` (weighted spawn)

**Files:**
- Modify: `src/run/expedition.ts`
- Test: `tests/expedition.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `tests/expedition.test.ts` (add `pickEnemy` to the expedition import):

```ts
import { pickEnemy } from '../src/run/expedition';

describe('pickEnemy', () => {
  // table {beast:3, scholar:1} → total 4; r in [0,3) → beast, [3,4) → scholar
  it('maps the rng across the weighted ranges', () => {
    const table = { beast: 3, scholar: 1 };
    expect(pickEnemy(table, () => 0.0)).toBe('beast');   // r=0   -> beast
    expect(pickEnemy(table, () => 0.74)).toBe('beast');  // r=2.96 -> beast
    expect(pickEnemy(table, () => 0.80)).toBe('scholar'); // r=3.2 -> scholar
  });

  it('always returns a valid key for any rng in [0,1)', () => {
    const table = { beast: 1, scholar: 1 };
    for (const r of [0, 0.49, 0.5, 0.99]) {
      expect(Object.keys(table)).toContain(pickEnemy(table, () => r));
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- expedition`
Expected: FAIL — `pickEnemy is not a function`.

- [ ] **Step 3: Add `pickEnemy` to `src/run/expedition.ts`**

```ts
/** Weighted random pick of an enemy id from a biome spawn table. Pure (rng injected). */
export function pickEnemy(spawnTable: Record<string, number>, rng: () => number): string {
  const entries = Object.entries(spawnTable);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [id, w] of entries) {
    r -= w;
    if (r < 0) return id;
  }
  return entries[entries.length - 1][0]; // float-safe fallback
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- expedition`
Expected: PASS (8 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — 72 prior + 3 enemyData + 3 biomeData + 8 expedition = 86.

- [ ] **Step 6: Commit**

```bash
git add src/run/expedition.ts tests/expedition.test.ts
git commit -m "feat(expedition): weighted pickEnemy from a biome spawn table"
```

---

## Task 7: RunScene — data-driven, scaled spawning

**Files:**
- Modify: `src/scenes/RunScene.ts`

No unit test (Phaser scene). Verified by `npm run build` + Playwright (Task 11).

- [ ] **Step 1: Add imports and the `RunInit` field**

In the import block at the top of `src/scenes/RunScene.ts`, change the `../game/types` import to also bring in `Expedition` and `BiomeDef`, and add three new imports:

```ts
import { RunModifiers, RunResult, Resource, Expedition, BiomeDef } from '../game/types';
```

```ts
import { BIOMES } from '../run/biomeData';
import { ENEMIES } from '../run/enemyData';
import { pickEnemy } from '../run/expedition';
```

Extend the `RunInit` interface (currently `{ modifiers; onComplete }`):

```ts
interface RunInit {
  modifiers: RunModifiers;
  expedition: Expedition;
  onComplete: (result: RunResult) => void;
}
```

- [ ] **Step 2: Add scene fields and initialize them in `init()`**

Add fields near the other private fields:

```ts
private expedition!: Expedition;
private biome!: BiomeDef;
```

In `init()`, add (right after `this.mods = data.modifiers;`):

```ts
this.expedition = data.expedition;
this.biome = BIOMES[data.expedition.biomeId];
```

- [ ] **Step 3: Tint the run background per biome**

In `create()`, after the scene sets up, add:

```ts
this.cameras.main.setBackgroundColor(this.biome.tint);
```

- [ ] **Step 4: Replace `spawnEnemy()` with the data-driven version**

Replace the entire existing `private spawnEnemy() { ... }` method with:

```ts
  private spawnEnemy() {
    const { width, height } = this.scale;
    const edge = Phaser.Math.Between(0, 3);
    const x = edge === 0 ? 0 : edge === 1 ? width : Phaser.Math.Between(0, width);
    const y = edge === 2 ? 0 : edge === 3 ? height : Phaser.Math.Between(0, height);

    const def = ENEMIES[pickEnemy(this.biome.spawnTable, () => Math.random())];
    const sc = this.expedition.scaling;
    const enemy = this.add.image(x, y, def.sprite) as any;
    enemy.setDisplaySize(def.displaySize.w, def.displaySize.h);
    this.physics.add.existing(enemy);
    this.enemies.add(enemy);
    enemy.setData('hp', def.baseHp * sc.hpMult);
    enemy.setData('drop', def.drop);
    enemy.setData('xp', def.xp);
    enemy.setData('speed', def.speed * sc.speedMult);
    enemy.setData('contactDamage', def.contactDamage);
  }
```

- [ ] **Step 5: Use per-enemy speed for chase, and scale the spawn rate**

In `update()`, replace the enemy-movement line:

```ts
    (this.enemies.getChildren() as any[]).forEach((e) => {
      this.physics.moveToObject(e, this.player, 60);
    });
```

with (read each enemy's scaled speed):

```ts
    (this.enemies.getChildren() as any[]).forEach((e) => {
      this.physics.moveToObject(e, this.player, e.getData('speed'));
    });
```

And replace the spawn-cooldown reset line:

```ts
      this.spawnCooldown = Math.max(250, 1100 / ramp);
```

with (faster spawns at higher tiers):

```ts
      this.spawnCooldown = Math.max(250, 1100 / (ramp * this.expedition.scaling.spawnRateMult));
```

- [ ] **Step 6: Use per-enemy contact damage, xp, and tier-scaled drops in `hitEnemy`/`hitPlayer`**

In `hitEnemy`, replace the kill block:

```ts
    const hp = enemy.getData('hp') - damage;
    if (hp <= 0) {
      this.dropGem(enemy.x, enemy.y, enemy.getData('drop'));
      enemy.destroy();
      this.gainXp(3);
    } else {
      enemy.setData('hp', hp);
    }
```

with (drop count scales with tier; xp from the enemy def):

```ts
    const hp = enemy.getData('hp') - damage;
    if (hp <= 0) {
      const drops = Math.max(1, Math.round(this.expedition.scaling.dropMult));
      for (let d = 0; d < drops; d++) {
        const jitter = drops > 1 ? Phaser.Math.Between(-10, 10) : 0;
        this.dropGem(enemy.x + jitter, enemy.y + jitter, enemy.getData('drop'));
      }
      enemy.destroy();
      this.gainXp(enemy.getData('xp'));
    } else {
      enemy.setData('hp', hp);
    }
```

In `hitPlayer`, replace `this.stats.hp -= 6;` with:

```ts
    this.stats.hp -= enemy.getData('contactDamage');
```

- [ ] **Step 7: Build to confirm it compiles**

Run: `npm run build`
Expected: PASS. (Build will fail until `main.ts` passes `expedition` to the scene — that's Task 10. If the only error is "Property 'expedition' is missing" at the `scene.start` call site, that's expected; proceed to Tasks 8–10, then build.)

- [ ] **Step 8: Commit**

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(run): data-driven, tier-scaled enemy spawning from the expedition"
```

---

## Task 8: RunScene — biome-biased resource sourcing

**Files:**
- Modify: `src/scenes/RunScene.ts`

This delivers the spec's Exploration/Culture sourcing fix: a biome's `resourceBias` speeds up the in-run explore-tick and relic drops for the resource it favors.

- [ ] **Step 1: Bias the exploration tick by the biome**

In `update()`, replace the exploration block:

```ts
    this.explorationCooldown -= dt;
    if (this.explorationCooldown <= 0) {
      this.collected.exploration += 1;
      this.explorationCooldown = 4000;
    }
```

with:

```ts
    this.explorationCooldown -= dt;
    if (this.explorationCooldown <= 0) {
      this.collected.exploration += 1;
      this.explorationCooldown = 4000 / (this.biome.resourceBias.exploration ?? 1);
    }
```

- [ ] **Step 2: Bias the culture-relic rate by the biome**

Replace the relic block:

```ts
    this.relicCooldown -= dt;
    if (this.relicCooldown <= 0) {
      const { width, height } = this.scale;
      this.dropGem(Phaser.Math.Between(40, width - 40), Phaser.Math.Between(40, height - 40), 'culture');
      this.relicCooldown = 5000;
    }
```

with:

```ts
    this.relicCooldown -= dt;
    if (this.relicCooldown <= 0) {
      const { width, height } = this.scale;
      this.dropGem(Phaser.Math.Between(40, width - 40), Phaser.Math.Between(40, height - 40), 'culture');
      this.relicCooldown = 5000 / (this.biome.resourceBias.culture ?? 1);
    }
```

- [ ] **Step 3: Build to confirm it compiles**

Run: `npm run build`
Expected: same as Task 7 — clean except the not-yet-wired `scene.start` call (fixed in Task 10).

- [ ] **Step 4: Commit**

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(run): biome resourceBias faucets exploration/culture"
```

---

## Task 9: Expedition pick screen (DOM)

**Files:**
- Create: `src/ui/expeditionScreen.ts`
- Modify: `index.html`, `src/style.css`

Flat grid of all available expeditions, every option visible at once (Jeff's UI principle — no carousel/disclosure). No unit test (DOM); verified live in Task 11.

- [ ] **Step 1: Add the `#expedition` surface to `index.html`**

Change the body's surface divs:

```html
    <div id="civ"></div>
    <div id="expedition"></div>
    <div id="run"></div>
```

- [ ] **Step 2: Add expedition-screen styles to `src/style.css`**

Append:

```css
#expedition { display: none; }
#expedition.active { display: block; }
.exp-wrap { max-width: 920px; margin: 0 auto; padding: 16px; }
.exp-wrap h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8; }
.exp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
.exp-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px; cursor: pointer; text-align: left; color: inherit; }
.exp-card:hover { border-color: #58a6ff; }
.exp-card .name { font-weight: 600; }
.exp-card .meta { font-size: 0.8rem; opacity: 0.8; margin-top: 6px; line-height: 1.5; }
.exp-card .tier { float: right; font-size: 0.75rem; opacity: 0.7; }
.exp-back { margin-top: 16px; padding: 10px 16px; background: #21262d; color: #e6edf3; border: 1px solid #30363d; border-radius: 8px; cursor: pointer; }
```

- [ ] **Step 3: Create `src/ui/expeditionScreen.ts`**

```ts
import { CivState, Expedition, Resource, RESOURCES } from '../game/types';
import { BIOMES } from '../run/biomeData';
import { availableExpeditions } from '../run/expedition';

const ICON: Record<Resource, string> = {
  exploration: '🧭', science: '🔬', industry: '🏭', culture: '🎭',
};

export interface ExpeditionCallbacks {
  onPick: (expedition: Expedition) => void;
  onBack: () => void;
}

function biasText(bias: Partial<Record<Resource, number>>): string {
  return RESOURCES.filter((r) => bias[r]).map((r) => ICON[r]).join(' ') || '—';
}

export function renderExpeditionScreen(root: HTMLElement, civ: CivState, cb: ExpeditionCallbacks): void {
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'exp-wrap';
  wrap.innerHTML = '<h2>Choose an Expedition</h2>';

  const grid = document.createElement('div');
  grid.className = 'exp-grid';
  for (const exp of availableExpeditions(civ)) {
    const biome = BIOMES[exp.biomeId];
    const card = document.createElement('button');
    card.className = 'exp-card';
    const enemies = Object.keys(biome.spawnTable).join(', ');
    card.innerHTML =
      `<span class="tier">Tier ${exp.tier}</span>` +
      `<div class="name">${biome.name}</div>` +
      `<div class="meta">Yields: ${biasText(biome.resourceBias)}<br>` +
      `Foes: ${enemies}<br>` +
      `Threat ×${exp.scaling.hpMult.toFixed(1)} · Reward ×${exp.scaling.dropMult.toFixed(1)}</div>`;
    card.onclick = () => cb.onPick(exp);
    grid.appendChild(card);
  }
  wrap.appendChild(grid);

  const back = document.createElement('button');
  back.className = 'exp-back';
  back.textContent = '← Back to camp';
  back.onclick = () => cb.onBack();
  wrap.appendChild(back);

  root.appendChild(wrap);
}
```

- [ ] **Step 4: Build to confirm it compiles**

Run: `npm run build`
Expected: same not-yet-wired `scene.start` error only (fixed next). The new file itself compiles.

- [ ] **Step 5: Commit**

```bash
git add src/ui/expeditionScreen.ts index.html src/style.css
git commit -m "feat(ui): flat-grid expedition pick screen"
```

---

## Task 10: Wire the run flow (civ → expedition → run)

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Import the expedition screen and grab its element**

In `src/main.ts`, add to the imports:

```ts
import { renderExpeditionScreen } from './ui/expeditionScreen';
import { Expedition } from './game/types';
```

After the existing `const runEl = ...;` line, add:

```ts
const expEl = document.getElementById('expedition')!;
```

- [ ] **Step 2: Replace `startRun()` with the expedition-pick flow**

Replace the existing `startRun()` function:

```ts
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
```

with a two-step flow — first show the picker, then launch the chosen expedition:

```ts
function startRun() {
  // Step 1: choose an expedition.
  civEl.classList.add('hidden');
  expEl.classList.add('active');
  renderExpeditionScreen(expEl, civ, {
    onPick: (expedition: Expedition) => launchExpedition(expedition),
    onBack: () => { expEl.classList.remove('active'); showCiv(); },
  });
}

function launchExpedition(expedition: Expedition) {
  expEl.classList.remove('active');
  runEl.classList.add('active');
  const modifiers: RunModifiers = computeRunModifiers(civ);
  game.scene.stop('run');
  game.scene.start('run', {
    modifiers,
    expedition,
    onComplete: (result: RunResult) => onRunComplete(result),
  });
}
```

- [ ] **Step 3: Ensure the run surface is hidden when returning to civ**

In `showCiv()`, the first lines remove `run` active / unhide civ. Add a line to also clear the expedition surface so none linger. Change the start of `showCiv()`:

```ts
function showCiv() {
  runEl.classList.remove('active');
  expEl.classList.remove('active');
  civEl.classList.remove('hidden');
```

(`expEl` is in scope; this is safe and idempotent.)

- [ ] **Step 4: Build — now fully wired**

Run: `npm run build`
Expected: CLEAN (no TypeScript errors — `scene.start` now passes `expedition`).

- [ ] **Step 5: Full unit suite**

Run: `npm test`
Expected: PASS — 86 tests (72 prior + 14 new across enemyData/biomeData/expedition).

- [ ] **Step 6: Commit**

```bash
git add src/main.ts
git commit -m "feat(run): civ -> expedition pick -> run flow"
```

---

## Task 11: Live verification (Playwright) + close-out

**Files:** none (verification only). Use the `verify-canvas-game-playwright` skill.

Note on environment: Phaser pauses its loop when the page is hidden, and headless rAF may not fire; if `elapsed` won't advance, drive the scene by stepping `s.update(t,16)` + `s.physics.world.update(t,16)` directly (as proven in RC-006 verification). Also expose a hook in `main.ts` only temporarily and revert it.

- [ ] **Step 1: Add a temporary verification hook to `src/main.ts`**

After `function persist()`, add (mark TEMP):

```ts
// TEMP — RC-007 verification hook; remove before commit.
(window as any).__game = game;
(window as any).__civ = () => civ;
(window as any).__setCiv = (c: any) => { civ = c; persist(); showCiv(); };
```

- [ ] **Step 2: Start the dev server and drive it**

Run: `npm run dev` (note the URL). Navigate with Playwright.

- [ ] **Step 3: Verify the expedition pick screen**

From the civ screen, click "Start Expedition", then confirm the `#expedition` surface shows the expected cards:
- Fresh save (stone): exactly 2 cards — The Wilds (Tier 0) and Ancient Ruins (Tier 0). Screenshot for the human.
- Then set a bronze civ via the hook, e.g. `window.__setCiv({ version:1, banked:{exploration:99,science:99,industry:99,culture:99}, researched:['mining','bronze_working'], buildings:[], runs:0 })`, reopen the picker, and confirm 5 cards including Frontier (Tier 1) and tier-1 Wilds/Ruins.

- [ ] **Step 4: Verify a run launches from a pick and spawns the right enemies**

Click a card (e.g. Ancient Ruins). Confirm the run starts and, sampling live state, that `spawnEnemy` produces enemies whose `drop` distribution matches the biome bias (Ruins → mostly `science`), enemies take damage and die (no NaN — `enemyHps` has no `null`), and the background tint matches the biome. Verify The Wilds biases `industry`, and Frontier accrues `exploration`/`culture` faster than a stone biome over the same elapsed time.

- [ ] **Step 5: Verify tier scaling**

Compare a Tier 0 vs a Tier 1 expedition of the same biome (bronze civ): sample spawned enemy `hp` data — tier 1 enemies should have ~1.5× the base HP of tier 0. Confirm the run remains winnable (player still kills enemies).

- [ ] **Step 6: Revert instrumentation and confirm a clean diff**

Remove the TEMP hook from `src/main.ts`. Run `git status` / `git diff` and confirm only intended source remains (and is committed). Remove any dev-server log / screenshot / `.playwright-mcp` artifacts so the tree is clean.

- [ ] **Step 7: Final build + full suite**

Run: `npm run build && npm test`
Expected: build clean; 86 tests pass.

- [ ] **Step 8: Update trackers and close RC-007**

- Mark RC-007 `Delivered` in `docs/BACKLOG.md`.
- Note completion in `MEMORY.md` (enemies/biomes/expeditions data-driven; pick screen live; iron plumbing in; next = RC-008 content). Update the "Next step" to RC-008.
- Commit (the pre-commit hook renders ticket Status + projects.yaml):

```bash
git add docs/BACKLOG.md MEMORY.md docs/tickets/
git commit -m "docs: close RC-007 (enemy/biome/expedition systems)"
```

---

## Self-Review (completed by author)

**Spec coverage:**
- §3b data-driven enemies → Tasks 2, 7 (`enemyData.ts`; `spawnEnemy` reads it). ✓
- §3c `BiomeDef` + `expedition.ts` (available runs + scaling) → Tasks 3, 4, 5, 6. ✓
- §3c age-scaled difficulty → Task 7 (hp/speed/spawn) + tierScaling. ✓
- §3c exploration/culture sourcing fix via `resourceBias` → Task 8. ✓
- §5 expedition pick screen (flat grid) + run-flow change → Tasks 9, 10. ✓
- `iron` plumbing → Task 1. ✓
- 3 base biomes → Task 3. ✓
- *Deliberately deferred to RC-008 (noted in Scope):* new enemy types/sprites, Deep Caverns biome. The systems support them with zero further engine work — RC-008 adds `ENEMIES`/`BIOMES` entries + sprites only.

**Placeholder scan:** No TBD/TODO. Every code step shows complete code; test expected values are computed from the spec'd formulas (e.g., `tierScaling(2).hpMult = 1 + 0.5*2 = 2`; spawn weights {beast:3,scholar:1} → r<3 beast).

**Type consistency:** `EnemyDef`, `BiomeDef`, `ExpeditionScaling`, `Expedition` (Task 1) are used identically in `enemyData.ts`/`biomeData.ts`/`expedition.ts`/`RunScene`/`expeditionScreen`. Signatures: `tierScaling(tier)`, `availableExpeditions(civ)`, `pickEnemy(spawnTable, rng)`, `renderExpeditionScreen(root, civ, {onPick, onBack})`, `RunInit.expedition` — consistent across definition and call sites (RunScene Step 1, main.ts Task 10). `getAge` reused from `tech.ts` (no duplicate age logic).

**Build-order note:** `RunScene` (Tasks 7–8) won't fully build until `main.ts` passes `expedition` (Task 10); the plan flags this at each interim build step so the implementer doesn't mistake it for an error.
