# RC-019 Mini-boss Arrival Events — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn each biome's toughest enemy into an announced mini-boss event (timed arrival, warning + banner, top-center HP bar, 5× HP, guaranteed gem-burst jackpot), and ship a batch of playtest balance tweaks on the same branch.

**Architecture:** Pure, Phaser-free logic in a new `src/run/bossEvent.ts` (mirrors `enemyBehavior.ts`/`projectileMotion.ts`) holds arrival timing, the boss-free spawn filter, and the jackpot gem list — all unit-tested. `RunScene` is the renderer: it de-trickles the boss from random spawns, fires the arrival event, spawns the 5×-HP boss, drives a fixed HP bar, and drops the jackpot on death. Part B is independent data tweaks to perks/weapons/traditions/tech.

**Tech Stack:** TypeScript, Phaser 3 (Arcade), Vitest, Playwright. Build = `npm run build`; tests = `npm test`.

**Spec:** [docs/superpowers/specs/2026-06-10-rc-019-mini-boss-events-design.md](../specs/2026-06-10-rc-019-mini-boss-events-design.md)

---

## File Structure

- **Create** `src/run/bossEvent.ts` — pure: `shouldSpawnBoss`, `bossFreeTable`, `bossJackpotGems`, constants.
- **Create** `tests/bossEvent.test.ts`.
- **Modify** `src/run/gemTier.ts` — add `bumpTier`; **Modify** `tests/gemTier.test.ts`.
- **Modify** `src/scenes/RunScene.ts` — de-trickle, `dropGem` opts, arrival event, boss spawn, HP bar, jackpot.
- **Part B (balance):** `src/scenes/RunScene.ts` (damage font), `src/run/draft.ts` (perks), `src/run/weaponData.ts` (gatling), `src/civics/traditionData.ts` (costs), `src/tech/techData.ts` (ages) — each with its test.

---

# Part A — RC-019 mini-boss

## Task 1: `bumpTier` in gemTier.ts

**Files:**
- Modify: `src/run/gemTier.ts`
- Test: `tests/gemTier.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/gemTier.test.ts` (import `bumpTier` in the existing import from `../src/run/gemTier`):

```ts
describe('gemTier — bumpTier', () => {
  it('steps chipped→cut→brilliant and clamps at brilliant', () => {
    expect(bumpTier('chipped')).toBe('cut');
    expect(bumpTier('cut')).toBe('brilliant');
    expect(bumpTier('brilliant')).toBe('brilliant');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/gemTier.test.ts`
Expected: FAIL — `bumpTier` not exported.

- [ ] **Step 3: Implement**

Append to `src/run/gemTier.ts`:

```ts
/** Next cosmetic tier up, clamped at the top — used for the RC-019 boss jackpot's upgraded gem. */
export function bumpTier(tier: GemTier): GemTier {
  if (tier === 'chipped') return 'cut';
  if (tier === 'cut') return 'brilliant';
  return 'brilliant';
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/gemTier.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/run/gemTier.ts tests/gemTier.test.ts
git commit -m "feat(RC-019): bumpTier gem-tier helper"
```

---

## Task 2: `bossEvent.ts` pure module

**Files:**
- Create: `src/run/bossEvent.ts`
- Test: `tests/bossEvent.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/bossEvent.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  shouldSpawnBoss, bossFreeTable, bossJackpotGems,
  BOSS_ARRIVAL_PROGRESS, BOSS_GEM_COUNT, BOSS_GEM_VALUE_MULT, BOSS_BIG_GEM_VALUE_MULT,
} from '../src/run/bossEvent';

describe('bossEvent — shouldSpawnBoss', () => {
  it('fires once the run passes the arrival fraction, and not before', () => {
    const dur = 1000;
    expect(shouldSpawnBoss(dur * (BOSS_ARRIVAL_PROGRESS - 0.01), dur, false)).toBe(false);
    expect(shouldSpawnBoss(dur * BOSS_ARRIVAL_PROGRESS, dur, false)).toBe(true);
    expect(shouldSpawnBoss(dur, dur, false)).toBe(true);
  });
  it('never fires twice (alreadySpawned) or on a zero-length run', () => {
    expect(shouldSpawnBoss(999, 1000, true)).toBe(false);
    expect(shouldSpawnBoss(10, 0, false)).toBe(false);
  });
});

describe('bossEvent — bossFreeTable', () => {
  it('removes only the boss id and does not mutate the input', () => {
    const table = { scholar: 6, hoplite: 3, cyclops: 1 };
    const free = bossFreeTable(table, 'cyclops');
    expect(free).toEqual({ scholar: 6, hoplite: 3 });
    expect(table.cyclops).toBe(1); // input untouched
  });
});

describe('bossEvent — bossJackpotGems', () => {
  it('returns the burst at boosted value plus one upgraded big gem', () => {
    const gems = bossJackpotGems(5, 'cut');
    expect(gems).toHaveLength(BOSS_GEM_COUNT + 1);
    const burst = gems.slice(0, BOSS_GEM_COUNT);
    expect(burst.every((g) => g.value === 5 * BOSS_GEM_VALUE_MULT && g.tier === 'cut')).toBe(true);
    const big = gems[gems.length - 1];
    expect(big.value).toBe(5 * BOSS_BIG_GEM_VALUE_MULT);
    expect(big.tier).toBe('brilliant'); // bumpTier('cut')
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/bossEvent.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/run/bossEvent.ts`:

```ts
// Pure logic for the RC-019 mini-boss arrival event: arrival timing, de-trickling the boss from the
// random spawn stream, and the kill jackpot. No Phaser — RunScene renders; this decides. Feel
// constants live here for the playtest tuner (mirrors src/run/enemyBehavior.ts / projectileMotion.ts).
import { GemTier, bumpTier } from './gemTier';

export const BOSS_ARRIVAL_PROGRESS = 0.7;   // fraction of run elapsed at which the boss arrives
export const BOSS_TELEGRAPH_MS = 1200;      // delay between the warning/banner and the boss appearing
export const BOSS_HP_MULT = 5;              // boss spawns with baseHp × this
export const BOSS_GEM_COUNT = 10;           // gems in the kill burst
export const BOSS_GEM_VALUE_MULT = 4;       // burst gem value vs a normal kill gem
export const BOSS_BIG_GEM_VALUE_MULT = 20;  // the single upgraded gem's value vs a normal gem

/** True once the run has elapsed past the arrival fraction and the boss has not yet been announced. */
export function shouldSpawnBoss(elapsedMs: number, runDurationMs: number, alreadySpawned: boolean): boolean {
  if (alreadySpawned) return false;
  if (runDurationMs <= 0) return false;
  return elapsedMs / runDurationMs >= BOSS_ARRIVAL_PROGRESS;
}

/** A copy of `table` without `bossId` — the random spawn stream draws from this so the boss never
 *  trickles in (and late-game escalation targets the next-toughest enemy). Does not mutate `table`. */
export function bossFreeTable(table: Record<string, number>, bossId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, w] of Object.entries(table)) if (id !== bossId) out[id] = w;
  return out;
}

export interface JackpotGem { value: number; tier: GemTier; }

/** The kill reward: BOSS_GEM_COUNT gems at boosted value, plus one upgraded (bumped-tier, big-value)
 *  gem. `baseValue` is a normal kill gem's value for the run tier; `tier` the run's normal gem tier. */
export function bossJackpotGems(baseValue: number, tier: GemTier): JackpotGem[] {
  const gems: JackpotGem[] = [];
  for (let i = 0; i < BOSS_GEM_COUNT; i++) gems.push({ value: baseValue * BOSS_GEM_VALUE_MULT, tier });
  gems.push({ value: baseValue * BOSS_BIG_GEM_VALUE_MULT, tier: bumpTier(tier) });
  return gems;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/bossEvent.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/run/bossEvent.ts tests/bossEvent.test.ts
git commit -m "feat(RC-019): bossEvent pure module (arrival, de-trickle, jackpot)"
```

---

## Task 3: RunScene — de-trickle + `dropGem` overrides

**Files:**
- Modify: `src/scenes/RunScene.ts` — imports, scene state, `create`, `spawnEnemy` (~`:506-515`), `dropGem` (~`:718-736`).

- [ ] **Step 1: Add imports**

Ensure `RunScene.ts` imports `apexEnemyId` (it lives in `../run/expedition`, alongside the
already-imported `pickEnemy` — **not** in `spawnEscalation`, where `spawnTableAt` comes from; leave the
`spawnTableAt` import untouched), the `BiomeDef` and `GemTier` types, and the bossEvent symbols (used
across Tasks 3-5):

```ts
// add apexEnemyId to the existing pickEnemy import from ../run/expedition:
import { pickEnemy, apexEnemyId } from '../run/expedition';
// (spawnTableAt stays imported from ../run/spawnEscalation — unchanged)
import { GemTier, gemTierForExpeditionTier, gemSpriteId } from '../run/gemTier';
import {
  shouldSpawnBoss, bossFreeTable, bossJackpotGems,
  BOSS_HP_MULT, BOSS_TELEGRAPH_MS,
} from '../run/bossEvent';
```
`gemTierForExpeditionTier`/`gemSpriteId` are already imported from `../run/gemTier` (used by `dropGem`)
— just add `GemTier`. Add `BiomeDef` to the existing `../game/types` import if absent. Match the file's
real existing import lines.

- [ ] **Step 2: Add boss scene state**

Near the other private fields (around the `spawnCooldown`/`finished` block ~`:82-89`), add:

```ts
  private bossId = '';
  private bossSpawned = false;
  private bossEnemy: any = null;
  private trickleBiome!: BiomeDef;          // biome.spawnTable minus the boss (the random-spawn pool)
  private bossHp?: { bg: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text };
```

- [ ] **Step 3: Initialise boss state in `create`**

In `create()`, after `this.biome` is in scope and the player is built, add:

```ts
    // RC-019: the biome's toughest enemy becomes an announced mini-boss — pull it from the random
    // spawn pool (the card threat-rating still reads it from the untouched biome.spawnTable).
    this.bossId = apexEnemyId(this.biome.spawnTable);
    this.bossSpawned = false;
    this.bossEnemy = null;
    this.trickleBiome = { ...this.biome, spawnTable: bossFreeTable(this.biome.spawnTable, this.bossId) };
```

- [ ] **Step 4: Draw random spawns from the boss-free table**

In `spawnEnemy()`, change the table source from `this.biome` to `this.trickleBiome`:

```ts
    const progress = this.elapsed / this.runDurationMs;
    const table = spawnTableAt(this.trickleBiome, progress, BIOMES, ENEMIES);
    const def = ENEMIES[pickEnemy(table, () => Math.random())];
    this.spawnEnemyAt(def, x, y);
```

- [ ] **Step 5: Add value/tier overrides to `dropGem`**

Replace the `dropGem` signature + the tier/value lines so a caller can force a tier and value (used by
the jackpot). Existing callers pass no `opts` and are unchanged:

```ts
  private dropGem(x: number, y: number, resource: Resource, opts?: { valueOverride?: number; tierOverride?: GemTier }) {
    const tier = opts?.tierOverride ?? gemTierForExpeditionTier(this.expedition.tier);
    const gem = this.add.image(x, y, gemSpriteId(resource, tier)) as any;
    gem.setDisplaySize(14 * RUN_SCALE, 14 * RUN_SCALE);
    this.physics.add.existing(gem);
    this.gems.add(gem);
    gem.setData('resource', resource);
    gem.setData('value', opts?.valueOverride ?? rewardValueForTier(this.expedition.tier));
    // --- Juice: pulsing scale yoyo so gems read as collectible ---
    this.tweens.add({
      targets: gem, scaleX: gem.scaleX * 1.15, scaleY: gem.scaleY * 1.15,
      duration: 380, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
    });
  }
```

- [ ] **Step 6: Verify build + suite**

Run: `npm run build`
Expected: PASS.

Run: `npm test`
Expected: PASS (existing suite + bossEvent/gemTier tests; no behavior tests touch this glue yet).

- [ ] **Step 7: Commit**

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(RC-019): de-trickle the boss + dropGem value/tier overrides"
```

---

## Task 4: RunScene — arrival event, boss spawn, HP bar

**Files:**
- Modify: `src/scenes/RunScene.ts` — `update()` (boss arrival check + HP-bar update), new methods `announceBoss`, `spawnBoss`, `createBossHpBar`, `updateBossHpBar`, `destroyBossHpBar`.

- [ ] **Step 1: Fire the arrival check in `update()`**

In `update()`, right after the existing spawn block (`this.spawnCooldown -= dt; … this.spawnEnemy();`)
add the one-shot arrival trigger and the per-frame HP-bar update:

```ts
    // RC-019: announce the mini-boss once the run is ~70% through.
    if (shouldSpawnBoss(this.elapsed, this.runDurationMs, this.bossSpawned)) {
      this.bossSpawned = true;
      this.announceBoss();
    }
    if (this.bossHp) {
      if (this.bossEnemy?.active) this.updateBossHpBar();
      else this.destroyBossHpBar();
    }
```

- [ ] **Step 2: Implement the arrival + spawn + HP-bar methods**

Add these methods (place them next to `spawnEnemyAt`):

```ts
  /** RC-019: warning banner + edge indicator, then the boss arrives after a short telegraph. */
  private announceBoss() {
    const { width, height } = this.scale;
    const edge = Phaser.Math.Between(0, 3);
    const x = edge === 0 ? 0 : edge === 1 ? width : Phaser.Math.Between(0, width);
    const y = edge === 2 ? 0 : edge === 3 ? height : Phaser.Math.Between(0, height);

    playSfx('boss-arrival'); // RC-020 (first wiring of this cue)

    const name = ENEMIES[this.bossId]?.name ?? 'Boss';
    const banner = this.add.text(width / 2, height * 0.22, `⚔ ${name} approaches`, {
      fontSize: '34px', color: '#ffdd55', stroke: '#000', strokeThickness: 5, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(60).setScrollFactor(0);
    this.tweens.add({ targets: banner, alpha: 0, y: banner.y - 20, delay: 1600, duration: 700, onComplete: () => banner.destroy() });

    // Pulsing warning marker at the entry point, cleared when the boss appears.
    const warn = this.add.circle(x, y, 22, 0xff3322, 0.6).setDepth(59);
    this.tweens.add({ targets: warn, scale: 1.8, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });

    this.time.delayedCall(BOSS_TELEGRAPH_MS, () => { warn.destroy(); this.spawnBoss(x, y); });
  }

  /** RC-019: spawn the boss at (x,y) with 5× HP and the isBoss flag, and raise its HP bar. */
  private spawnBoss(x: number, y: number) {
    const def = ENEMIES[this.bossId];
    const e = this.spawnEnemyAt(def, x, y);
    const maxHp = def.baseHp * BOSS_HP_MULT;
    e.setData('hp', maxHp);
    e.setData('maxHp', maxHp);
    e.setData('isBoss', true);
    this.bossEnemy = e;
    this.createBossHpBar();
  }

  private createBossHpBar() {
    const { width } = this.scale;
    const w = Math.min(520, width * 0.6), h = 16, x = (width - w) / 2, y = 18;
    const bg = this.add.rectangle(x, y, w, h, 0x220000, 0.85).setOrigin(0, 0).setDepth(60).setScrollFactor(0).setStrokeStyle(2, 0x000000);
    const fill = this.add.rectangle(x, y, w, h, 0xff3322, 1).setOrigin(0, 0).setDepth(61).setScrollFactor(0);
    const label = this.add.text(width / 2, y + h + 2, ENEMIES[this.bossId]?.name ?? 'Boss', {
      fontSize: '15px', color: '#ffdddd', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(61).setScrollFactor(0);
    this.bossHp = { bg, fill, label };
  }

  private updateBossHpBar() {
    if (!this.bossHp || !this.bossEnemy) return;
    const frac = Math.max(0, Math.min(1, this.bossEnemy.getData('hp') / this.bossEnemy.getData('maxHp')));
    this.bossHp.fill.width = this.bossHp.bg.width * frac;
  }

  private destroyBossHpBar() {
    if (!this.bossHp) return;
    this.bossHp.bg.destroy(); this.bossHp.fill.destroy(); this.bossHp.label.destroy();
    this.bossHp = undefined;
  }
```

- [ ] **Step 3: Tear the bar down at run end**

In `startCeremony()` (the zone-clear sweep) and at the top of `finish()`, add `this.destroyBossHpBar();`
so the bar never outlives the run. (The boss itself is spared by the existing `isBoss` check.)

- [ ] **Step 4: Verify build + suite**

Run: `npm run build`
Expected: PASS.

Run: `npm test`
Expected: PASS (unchanged suite).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(RC-019): boss arrival event + spawn (5x HP) + top-center HP bar"
```

---

## Task 5: RunScene — kill jackpot

**Files:**
- Modify: `src/scenes/RunScene.ts` — `applyDamageToEnemy` death branch (~`:671`, beside the splitter block).

- [ ] **Step 1: Drop the jackpot on boss death**

In `applyDamageToEnemy`, in the death branch after `const ex = enemy.x, ey = enemy.y;` and beside the
RC-018 splitter block (before `enemy.destroy()`), add:

```ts
      // RC-019: a mini-boss kill drops the guaranteed jackpot — a gem burst + one upgraded gem.
      if (enemy.getData('isBoss')) {
        const tier = gemTierForExpeditionTier(this.expedition.tier);
        const base = rewardValueForTier(this.expedition.tier);
        for (const g of bossJackpotGems(base, tier)) {
          const jx = ex + Phaser.Math.Between(-44, 44), jy = ey + Phaser.Math.Between(-44, 44);
          this.dropGem(jx, jy, this.biasedResource(), { valueOverride: g.value, tierOverride: g.tier });
        }
        this.destroyBossHpBar();
        this.bossEnemy = null;
      }
```

- [ ] **Step 2: Verify build + suite**

Run: `npm run build`
Expected: PASS.

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(RC-019): mini-boss kill jackpot (gem burst + upgraded gem)"
```

---

## Task 6: Live-verify RC-019 (Playwright)

**REQUIRED SUB-SKILL:** Use `verify-canvas-game-playwright`. Expose the game to `window` (TEMP), drive
a run, sample live state, revert instrumentation before committing.

- [ ] **Step 1: Build, serve, open a run**

`npm run build`; start the dev server (`npm run dev -- --port 5190 --strictPort`); navigate Playwright
to it and launch a run (via the exposed game: `g.scene.start('run', { modifiers, expedition, … })`).

- [ ] **Step 2: Verify the arrival + de-trickle**

Drive `elapsed` to ≥70% of `runDurationMs` (set `s.elapsed` or shorten `s.runDurationMs`) and step the
loop. Confirm via live sampling: `s.bossSpawned` flips true, the banner/warning appear, after the
telegraph one enemy with `getData('isBoss')===true` and `getData('hp')===baseHp*5` exists, the HP bar
objects (`s.bossHp`) are present, and the boss id never appears among normal `s.enemies` spawned before
arrival (sample `getData('isBoss')`/sprite over a spawn burst).

- [ ] **Step 3: Verify the HP bar tracks + jackpot drops**

Damage the boss (`s.applyDamageToEnemy(s.bossEnemy, N, true)`) and confirm `s.bossHp.fill.width`
shrinks proportionally. Kill it and confirm the gems group gains `BOSS_GEM_COUNT + 1` gems (one with
the big `value` and bumped tier sprite), and `s.bossHp` is destroyed (undefined).

- [ ] **Step 4: Screenshot + revert**

Screenshot the boss + HP bar for the record. Remove all `window`/timer instrumentation; `git diff` to
confirm only intended changes remain.

- [ ] **Step 5: Final verification**

Run: `npm run build && npm test`
Expected: PASS.

---

# Part B — RC-009 balance tweaks (same branch)

## Task 7: #8 — Bigger damage numbers

**Files:** Modify `src/scenes/RunScene.ts` (`applyDamageToEnemy` floating number, ~`:734`).

- [ ] **Step 1: Enlarge the font**

Change the damage-number text style from `fontSize: '13px', … strokeThickness: 2` to:

```ts
      fontSize: '20px', color: '#ffee44', stroke: '#000', strokeThickness: 3,
```

- [ ] **Step 2: Verify + commit**

Run: `npm run build && npm test` → PASS.

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(RC-009): larger floating damage numbers (playtest #8)"
```

## Task 8: #5 — Sharpen & Rapid Fire −50%

**Files:** Modify `src/run/draft.ts` (PERKS); Test: `tests/` (add a perk-magnitude assertion).

- [ ] **Step 1: Write the failing test**

Create `tests/perks.test.ts` (or append to an existing draft test if one asserts PERKS):

```ts
import { describe, it, expect } from 'vitest';
import { PERKS } from '../src/run/draft';

describe('draft PERKS — RC-009 playtest #5', () => {
  it('sharpen and rapid are halved from their originals', () => {
    const sharpen = PERKS.find((p) => p.id === 'sharpen')!;
    const rapid = PERKS.find((p) => p.id === 'rapid')!;
    expect(sharpen.effect.damageMult).toBe(0.125);  // was 0.25
    expect(rapid.effect.fireRateMult).toBe(0.10);   // was 0.20
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/perks.test.ts` → FAIL (still 0.25 / 0.20).

- [ ] **Step 3: Halve the magnitudes + fix descriptions**

In `src/run/draft.ts`, change the two PERKS rows:

```ts
  { id: 'sharpen',   name: 'Sharpen',    desc: '+12.5% damage',     effect: { damageMult: 0.125 } },
  { id: 'rapid',     name: 'Rapid Fire', desc: '+10% fire rate',    effect: { fireRateMult: 0.10 } },
```

- [ ] **Step 4: Run + full suite**

Run: `npx vitest run tests/perks.test.ts` → PASS. Then `npm test` → PASS (fix any other test that asserted the old magnitudes).

- [ ] **Step 5: Commit**

```bash
git add src/run/draft.ts tests/perks.test.ts
git commit -m "feat(RC-009): halve Sharpen/Rapid Fire perks (playtest #5)"
```

## Task 9: #11 — Gatling fire-rate nerf

**Files:** Modify `src/run/weaponData.ts` (`gatling`, ~`:288`); Test: `tests/` (gatling cooldown assertion).

- [ ] **Step 1: Write the failing test**

Append to the weapon-data test (or create `tests/weaponData-balance.test.ts`):

```ts
import { describe, it, expect } from 'vitest';
import { WEAPONS } from '../src/run/weaponData';

describe('weaponData — RC-009 playtest #11', () => {
  it('gatling base cooldown is doubled (~50% slower fire)', () => {
    expect(WEAPONS.gatling.cooldownMs).toBe(360); // was 180
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/weaponData-balance.test.ts` → FAIL (180).

- [ ] **Step 3: Double the cooldown**

In `src/run/weaponData.ts` `gatling`, change `cooldownMs: 180` → `cooldownMs: 360`. Leave
`levelScaling.cooldownMs: -15` and the `minigun` evolution unchanged.

- [ ] **Step 4: Run + suite**

Run: `npx vitest run tests/weaponData-balance.test.ts` → PASS. `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/run/weaponData.ts tests/weaponData-balance.test.ts
git commit -m "feat(RC-009): gatling base fire-rate nerf (playtest #11)"
```

## Task 10: #9 — Traditions far costlier

**Files:** Modify `src/civics/traditionData.ts` (`COST_G` + every `base`); Modify the tradition cost test.

- [ ] **Step 1: Find the existing cost test and rewrite expectations to the new curve**

Grep for the test asserting tradition costs: `grep -rln "nextRankCost\|COST_G\|traditionRank" tests/`. In
that test, the new formula is `cost(rank) = round(base*10 * 5^rank)` (rank 0 = first purchase). Rewrite
each asserted value to the new curve — e.g. for `vigor` (base 24 → 240): rank-0 = `240`, rank-1 =
`round(240*5)=1200`, rank-2 = `round(240*25)=6000`. Derive every expected number from the formula, not
by running the code.

- [ ] **Step 2: Run to verify it fails**

Run: `npm test` → the tradition cost test FAILS against the new expectations (code still uses 1.6 / old base).

- [ ] **Step 3: Apply the new base + curve**

In `src/civics/traditionData.ts`:
- Change `export const COST_G = 1.6;` → `export const COST_G = 5.0;`
- Multiply **every** tradition's `base` by 10 (all 8 nodes). Example: `vigor … base: 24` → `base: 240`.
  Read each current base and ×10; do not change `maxRank`, `effectPerRank`, or `blurb`.

- [ ] **Step 4: Run + suite**

Run: `npm test` → PASS (the rewritten cost test now matches; everything else green).

- [ ] **Step 5: Commit**

```bash
git add src/civics/traditionData.ts tests/<tradition-test-file>.ts
git commit -m "feat(RC-009): traditions 10x base + 5x/rank curve (playtest #9)"
```

## Task 11: #3 — Move Writing + Mining to Bronze

**Files:** Modify `src/tech/techData.ts` (`mining`, `writing` `age`); Test: `tests/` (age + chain).

- [ ] **Step 1: Write the failing test**

Create `tests/techAges.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TECHS } from '../src/tech/techData';
import { newCivState } from '../src/state/civState';
import { research, getAge } from '../src/tech/tech';
import { RESOURCES } from '../src/game/types';

describe('techData — RC-009 playtest #3 (writing/mining → bronze)', () => {
  it('writing and mining are bronze-age', () => {
    expect(TECHS.mining.age).toBe('bronze');
    expect(TECHS.writing.age).toBe('bronze');
  });

  it('the stone→bronze research chain still resolves (no deadlock)', () => {
    // a civ with plenty of every resource can still reach bronze via mining → bronze_working
    let civ = newCivState();
    civ = { ...civ, banked: Object.fromEntries(RESOURCES.map((r) => [r, 9999])) as any };
    civ = research(civ, 'mining');
    civ = research(civ, 'bronze_working');
    expect(getAge(civ)).toBe('bronze');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/techAges.test.ts` → FAIL (ages still `stone`).

- [ ] **Step 3: Move the two techs to bronze**

In `src/tech/techData.ts`, change `mining` and `writing` `age: 'stone'` → `age: 'bronze'`. Leave their
`cost`, `requires`, `unlocksBuilding`, and `runBonus` unchanged. (`bronze_working` still
`requires: ['mining']`; research has no age gate, so this resolves — see spec.)

- [ ] **Step 4: Run + full suite**

Run: `npx vitest run tests/techAges.test.ts` → PASS. Then `npm test` → PASS — **fix any existing test
that asserted `mining`/`writing` under the Stone age** (e.g. an age-grouping or per-age-count test in
`tests/ageUnlocks.test.ts`); update its expectations to reflect the move.

- [ ] **Step 5: Commit**

```bash
git add src/tech/techData.ts tests/techAges.test.ts
git commit -m "feat(RC-009): move Writing + Mining to Bronze age (playtest #3)"
```

---

## Self-Review Notes

- **Spec coverage:** bumpTier (T1), bossEvent module (T2), de-trickle + dropGem opts (T3), arrival +
  5×HP spawn + HP bar (T4), jackpot (T5), live-verify (T6); balance batch #8/#5/#11/#9/#3 (T7–T11). All
  spec sections mapped.
- **Type consistency:** `shouldSpawnBoss`, `bossFreeTable`, `bossJackpotGems`, `JackpotGem`, `bumpTier`,
  `BOSS_HP_MULT`, `BOSS_TELEGRAPH_MS`, `trickleBiome`, `bossEnemy`, `bossHp`, `announceBoss`,
  `spawnBoss`, `createBossHpBar`/`updateBossHpBar`/`destroyBossHpBar` are named identically everywhere.
- **No save bump:** boss state is per-run; `dropGem` opts are optional; `CivState.version` untouched.
- **Test-update tasks (T8–T11)** explicitly update any pre-existing test that asserted an old value, with
  new expectations derived from the spec formula — not copied from code output.
