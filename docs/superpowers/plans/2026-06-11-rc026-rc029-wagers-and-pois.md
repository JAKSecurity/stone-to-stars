# RC-026 + RC-029 Expedition Wagers & POIs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the run-variety/risk-reward layer: 4 stackable pre-run mutators with additive reward bonuses (Phase A, RC-029), and 3 opt-in dungeon POIs — relic shrine, treasure courier, fusion altar (Phase B, RC-026).

**Architecture:** House pattern — all decidable logic in new pure Phaser-free modules (`src/run/mutatorData.ts`, `mutators.ts`, `poiData.ts`, `poi.ts`, plus a `flee` archetype in `enemyBehavior.ts`), with RunScene rendering and the expedition screen carrying flat toggle chips. No save bump (mutator selection is ephemeral). Phase B contains a HARD ART GATE: new sprites (shrine/altar/courier) must be ratified by Jeff before the phase merges.

**Tech Stack:** TypeScript, Phaser 3 (Arcade), Vitest, Playwright MCP. Build = `npm run build`; tests = `npm test`. Baseline: 338 tests green.

**Spec:** [docs/superpowers/specs/2026-06-11-rc026-rc029-wagers-and-pois-design.md](../specs/2026-06-11-rc026-rc029-wagers-and-pois-design.md)

**Branch note:** work continues on the worktree branch `claude/wonderful-wiles-fbbf4c`. Merge to main happens only at Jeff's playtest gate (do NOT merge mid-plan).

---

## Phase map

- **Phase A — Mutators (Tasks 1–4, RC-029):** pure stack math → run wiring → card chips → live verify. Independently playtestable; no art.
- **Phase B — POIs (Tasks 5–10, RC-026):** flee archetype → pure POI modules → scene wiring (shrine/altar) → courier → ART GATE → live verify + ticket resolutions.

## File structure

- **Create** `src/run/mutatorData.ts` — the 4 MutatorDefs (half-the-risk values).
- **Create** `src/run/mutators.ts` — `combineMutators`, `applyHaulMult`.
- **Create** `src/run/poiData.ts` — POIDef catalog + tuning constants.
- **Create** `src/run/poi.ts` — POI rolls/placement, shrine wave composition, jackpot tables, courier timing.
- **Modify** `src/run/enemyBehavior.ts` — `fleeVelocity` (pure steering).
- **Modify** `src/game/types.ts` — `EnemyDef.behavior` union gains `'flee'`; `RunResult` gains optional `mutators`/`rewardMult`.
- **Modify** `src/run/enemyData.ts` — `treasure_courier` EnemyDef.
- **Modify** `src/scenes/RunScene.ts` — RunInit.mutators, mutator application, haul mult, HUD echo; POI placement/structures/indicators/activation; courier lifecycle; win-count exemption.
- **Modify** `src/ui/expeditionScreen.ts` + `src/main.ts` + `src/style.css` — mutator chips on cards, `onPick(expedition, mutators)` signature.
- **Modify** `src/ui/runEndScreen.ts` — mutator line on the summary.
- **Create (art gate)** sprite shape-data for `poi_shrine`, `poi_altar`, `enemy_courier` in `src/art/sprites/` following the existing registry pipeline.
- **Tests:** new `tests/mutators.test.ts`, `tests/poi.test.ts`; additions to `tests/enemyBehavior.test.ts`, `tests/enemyData.test.ts`.

## Shared contracts (defined in Tasks 1/6 — do not drift)

```ts
// mutatorData.ts
export interface MutatorDef {
  id: string; name: string; icon: string; desc: string;
  rewardBonus: number;          // additive fraction (0.25 = +25%) — half-the-risk rule
  effects: {
    enemySpeedMult?: number;    // night_raid 1.5
    enemyCountMult?: number;    // horde 1.5 — PLACED roster only (POI waves + courier exempt)
    maxHpMult?: number;         // frail 0.6
    enemyArmorAdd?: number;     // ironclad 1
  };
}
// mutators.ts
export interface MutatorEffects {
  enemySpeedMult: number; enemyCountMult: number; maxHpMult: number; enemyArmorAdd: number;
}
export function combineMutators(ids: string[]): { effects: MutatorEffects; rewardMult: number };
export function applyHaulMult(collected: ResourceBundle, rewardMult: number): ResourceBundle;
// poi.ts
export interface PoiPlacement { id: PoiId; x: number; y: number; }
export type PoiId = 'shrine' | 'courier' | 'altar';
```

---

## Task 1: Mutator catalog + stack math (pure)

**Files:**
- Create: `src/run/mutatorData.ts`, `src/run/mutators.ts`
- Test: `tests/mutators.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/mutators.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MUTATORS } from '../src/run/mutatorData';
import { combineMutators, applyHaulMult } from '../src/run/mutators';

describe('mutators', () => {
  it('catalog: exactly the 4 launch mutators with half-the-risk values', () => {
    expect(Object.keys(MUTATORS).sort()).toEqual(['frail', 'horde', 'ironclad', 'night_raid']);
    expect(MUTATORS.night_raid.effects.enemySpeedMult).toBe(1.5);
    expect(MUTATORS.night_raid.rewardBonus).toBe(0.25);
    expect(MUTATORS.horde.effects.enemyCountMult).toBe(1.5);
    expect(MUTATORS.horde.rewardBonus).toBe(0.25);
    expect(MUTATORS.frail.effects.maxHpMult).toBe(0.6);
    expect(MUTATORS.frail.rewardBonus).toBe(0.2);
    expect(MUTATORS.ironclad.effects.enemyArmorAdd).toBe(1);
    expect(MUTATORS.ironclad.rewardBonus).toBe(0.2);
  });

  it('combineMutators: identity for none, additive rewardMult for all', () => {
    const none = combineMutators([]);
    expect(none.effects).toEqual({ enemySpeedMult: 1, enemyCountMult: 1, maxHpMult: 1, enemyArmorAdd: 0 });
    expect(none.rewardMult).toBe(1);
    const all = combineMutators(['night_raid', 'horde', 'frail', 'ironclad']);
    expect(all.rewardMult).toBeCloseTo(1.9);
    expect(all.effects.enemySpeedMult).toBe(1.5);
    expect(all.effects.enemyCountMult).toBe(1.5);
    expect(all.effects.maxHpMult).toBe(0.6);
    expect(all.effects.enemyArmorAdd).toBe(1);
  });

  it('combineMutators ignores unknown ids and duplicates', () => {
    const r = combineMutators(['frail', 'frail', 'ghost']);
    expect(r.rewardMult).toBeCloseTo(1.2); // frail counted once, ghost ignored
    expect(r.effects.maxHpMult).toBe(0.6);
  });

  it('applyHaulMult multiplies per resource and rounds', () => {
    const out = applyHaulMult({ exploration: 10, science: 3, industry: 0, culture: 7 }, 1.25);
    expect(out).toEqual({ exploration: 13, science: 4, industry: 0, culture: 9 });
  });

  it('applyHaulMult at ×1 is the identity', () => {
    const c = { exploration: 5, science: 5, industry: 5, culture: 5 };
    expect(applyHaulMult(c, 1)).toEqual(c);
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `npm test -- mutators` → modules not found.

- [ ] **Step 3: Implement `src/run/mutatorData.ts`**

```ts
// RC-029 expedition mutators (spec §2): pre-run wagers. Calibration principle (Jeff,
// 2026-06-11): the reward bonus is HALF the risk magnitude. Bonuses stack ADDITIVELY.
export interface MutatorDef {
  id: string;
  name: string;
  icon: string;
  desc: string;                 // effect + bonus, shown on the card chip
  rewardBonus: number;          // additive fraction (0.25 = +25%)
  effects: {
    enemySpeedMult?: number;    // applied at enemy placement (placed roster + waves + children)
    enemyCountMult?: number;    // applied to the PLACED roster count only (POI waves/courier exempt)
    maxHpMult?: number;         // applied to RunModifiers-derived maxHp BEFORE the baseStats snapshot
    enemyArmorAdd?: number;     // applied at enemy placement
  };
}

export const MUTATORS: Record<string, MutatorDef> = {
  night_raid: { id: 'night_raid', name: 'Night Raid', icon: '🌙',
    desc: 'Enemies +50% speed · reward +25%', rewardBonus: 0.25,
    effects: { enemySpeedMult: 1.5 } },
  horde:      { id: 'horde', name: 'Horde', icon: '👥',
    desc: '+50% enemies · reward +25%', rewardBonus: 0.25,
    effects: { enemyCountMult: 1.5 } },
  frail:      { id: 'frail', name: 'Frail', icon: '💔',
    desc: 'Your max HP −40% · reward +20%', rewardBonus: 0.2,
    effects: { maxHpMult: 0.6 } },
  ironclad:   { id: 'ironclad', name: 'Ironclad', icon: '🛡️',
    desc: 'Enemies +1 armor · reward +20%', rewardBonus: 0.2,
    effects: { enemyArmorAdd: 1 } },
};
```

- [ ] **Step 4: Implement `src/run/mutators.ts`**

```ts
import { ResourceBundle, RESOURCES } from '../game/types';
import { MUTATORS } from './mutatorData';

export interface MutatorEffects {
  enemySpeedMult: number;
  enemyCountMult: number;
  maxHpMult: number;
  enemyArmorAdd: number;
}

/** Combine selected mutators: multiplicative effects compose, reward bonuses ADD (spec §2).
 *  Unknown ids and duplicates are ignored — the UI is the only writer, but stay defensive. */
export function combineMutators(ids: string[]): { effects: MutatorEffects; rewardMult: number } {
  const effects: MutatorEffects = { enemySpeedMult: 1, enemyCountMult: 1, maxHpMult: 1, enemyArmorAdd: 0 };
  let bonus = 0;
  for (const id of [...new Set(ids)]) {
    const def = MUTATORS[id];
    if (!def) continue;
    bonus += def.rewardBonus;
    const e = def.effects;
    effects.enemySpeedMult *= e.enemySpeedMult ?? 1;
    effects.enemyCountMult *= e.enemyCountMult ?? 1;
    effects.maxHpMult *= e.maxHpMult ?? 1;
    effects.enemyArmorAdd += e.enemyArmorAdd ?? 0;
  }
  return { effects, rewardMult: 1 + bonus };
}

/** The wager payout: scale the run's collected haul per-resource, rounding each. Pure. */
export function applyHaulMult(collected: ResourceBundle, rewardMult: number): ResourceBundle {
  const out = { ...collected };
  for (const r of RESOURCES) out[r] = Math.round(collected[r] * rewardMult);
  return out;
}
```

- [ ] **Step 5: Run to verify PASS** — `npm test -- mutators` → 5 tests; then full `npm test && npm run build` (343 expected).

- [ ] **Step 6: Commit**

```bash
git add src/run/mutatorData.ts src/run/mutators.ts tests/mutators.test.ts
git commit -m "feat(RC-029): mutator catalog + stack math - half-the-risk, additive bonuses"
```

---

## Task 2: Run wiring — effects, haul multiplier, HUD + end-screen echo

**Files:**
- Modify: `src/scenes/RunScene.ts`, `src/game/types.ts`, `src/ui/runEndScreen.ts`

- [ ] **Step 1: Types**

In `src/game/types.ts` `RunResult`, after `tier`, add:

```ts
  mutators?: string[];   // RC-029: active mutator ids this run (empty/absent = none)
  rewardMult?: number;   // RC-029: the additive-stack multiplier applied to `collected`
```

- [ ] **Step 2: RunScene — accept and apply**

Find the `RunInit` interface/type used by `init(data: RunInit)` (top of RunScene.ts) and add `mutators?: string[];`.

In `init()` after `this.stats = initialRunStats(this.mods);`:

```ts
    // RC-029: ephemeral per-launch mutators. Frail applies to maxHp HERE, before create()'s
    // baseStats snapshot, so the passive recompute model treats it as part of the run's base.
    this.mutatorIds = data.mutators ?? [];
    this.mutFx = combineMutators(this.mutatorIds);
    if (this.mutFx.effects.maxHpMult !== 1) {
      this.stats.maxHp = Math.max(1, Math.round(this.stats.maxHp * this.mutFx.effects.maxHpMult));
      this.stats.hp = this.stats.maxHp;
    }
```

with fields `private mutatorIds: string[] = [];` and `private mutFx = combineMutators([]);` (the field initializer makes restarts safe; init() reassigns both).

**Horde:** in `create()` where `enemyPlacements(...)` is called, scale the count input by `this.mutFx.effects.enemyCountMult` — read the call site: the count comes from `BASE_ENEMY_COUNT + ENEMIES_PER_TIER * tier` (or is computed inside `enemyPlacements` — check `dungeonPopulate.ts:59`; if the count is computed inside, add an optional `countMult = 1` parameter to `enemyPlacements` and pass it — keep the pure function's default behavior unchanged).

**Night Raid / Ironclad:** in `spawnEnemyAt`, where `speed` and `armor` data are set:

```ts
    enemy.setData('speed', def.speed * RUN_SCALE * this.mutFx.effects.enemySpeedMult);
    enemy.setData('armor', (def.armor ?? 0) + this.mutFx.effects.enemyArmorAdd);
```

(Adapt to the existing lines — multiply/add onto whatever is currently set. This intentionally also covers shrine-wave enemies and splitter children in Phase B; only the COUNT exemption applies to POIs, per spec.)

**Haul:** in `finish(died)` where `pendingComplete` is assembled:

```ts
    this.pendingComplete = {
      collected: applyHaulMult({ ...this.collected }, this.mutFx.rewardMult),
      survivedMs: this.elapsed,
      died,
      tier: this.expedition.tier,
      mutators: [...this.mutatorIds],
      rewardMult: this.mutFx.rewardMult,
    };
```

**HUD echo:** in `loadoutHudLine()`, append a segment when active:

```ts
    const mutStr = this.mutatorIds.length
      ? this.mutatorIds.map((id) => MUTATORS[id]?.icon ?? '?').join('') + `×${this.mutFx.rewardMult.toFixed(2)}`
      : '';
```

and include `mutStr` in the joined segments (same filter-empty pattern as the others). Imports: `combineMutators, applyHaulMult` from `../run/mutators`, `MUTATORS` from `../run/mutatorData`.

- [ ] **Step 3: End screen**

In `src/ui/runEndScreen.ts` (`renderRunEndScreen`), after the total row, render when present:

```ts
  if (result.mutators?.length && result.rewardMult && result.rewardMult > 1) {
    const names = result.mutators.map((id) => MUTATORS[id]?.name ?? id).join(', ');
    const div = document.createElement('div');
    div.className = 'mutline';
    div.textContent = `Wagers honored: ${names} — haul ×${result.rewardMult.toFixed(2)}`;
    root.querySelector('.runend')!.appendChild(div);
  }
```

(Adapt the container selector to the file's actual structure — read it first; keep the existing layout.) Add a small `.mutline` style in `src/style.css` consistent with the summary block. Import `MUTATORS`.

- [ ] **Step 4: Verify**

`npm test && npm run build` green (343 — no new unit tests this task; pure math is covered by Task 1, scene wiring is covered by Task 4's live verify). Quick dev sanity: a run with no mutators behaves identically (HUD has no mutator segment, end screen has no wager line).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(RC-029): run wiring - mutator effects, haul multiplier, HUD + end-screen echo"
```

---

## Task 3: Expedition card mutator chips

**Files:**
- Modify: `src/ui/expeditionScreen.ts`, `src/main.ts`, `src/style.css`

- [ ] **Step 1: Chips on each expedition card**

Read `expeditionScreen.ts`'s expedition-card render block (the cards built for each available expedition, `onPick` wired at `src/main.ts:103`). Add to EACH card, under the existing stats:

- A flat chip row: one toggle chip per `Object.values(MUTATORS)` — label `${icon} ${name}`, `title` attr = `desc`. Clicking toggles membership in that CARD's selection set (per-card `Set<string>`, plain closure state; resets every render — ephemeral by design, spec §2).
- A live total badge on the card, visible only when the set is non-empty: `×${(1 + Σ bonus).toFixed(2)}` (compute via `combineMutators([...sel]).rewardMult`).
- Chip selected state = a `.mut-on` class (green border, consistent with `.kit-pick` styling).
- The card's launch action calls `onPick(expedition, [...sel])`.

Change the callback type: `onPick: (expedition: Expedition, mutators: string[]) => void;`

- [ ] **Step 2: main.ts pass-through**

`src/main.ts:103` becomes:

```ts
    onPick: (expedition: Expedition, mutators: string[]) => launchExpedition(expedition, mutators),
```

and `launchExpedition(expedition: Expedition, mutators: string[])` passes `mutators` in the `game.scene.start('run', { ... })` payload.

- [ ] **Step 3: CSS**

Add `.mutchips`, `.mutchip`, `.mutchip.mut-on`, `.muttotal` to `src/style.css`, matching the `.kit-card`/chip look (small, dense, flat — jeff-ui-design).

- [ ] **Step 4: Verify + commit**

`npm test && npm run build` green. Dev check: toggle two chips → total shows ×1.50 (night_raid+horde) — wait, ×1.50 is correct for +25%+25%; launch → HUD shows 🌙👥×1.50; die or clear → end screen shows the wager line; relaunch → chips reset to off.

```bash
git add -A
git commit -m "feat(RC-029): mutator toggle chips on expedition cards"
```

---

## Task 4: Phase A live verification (Playwright)

**Files:** none committed (instrumentation reverted)

**REQUIRED SUB-SKILL:** `verify-canvas-game-playwright`. Fresh dev server on a clean port (5300+), curl a changed module to confirm freshness.

- [ ] **Step 1: Walkthrough**

1. Expedition screen: chips visible on every card; toggle Night Raid + Frail on one card → total badge `×1.45`.
2. Launch. Sample scene state: `mutatorIds = ['night_raid','frail']`; `stats.maxHp` = round(civ maxHp × 0.6); a placed enemy's `speed` data = def.speed × RUN_SCALE × 1.5.
3. HUD line shows `🌙💔×1.45`.
4. Clear or die; end screen shows "Wagers honored: Night Raid, Frail — haul ×1.45" and the displayed resource totals equal `round(collected × 1.45)` per resource (sample `collected` pre-finish to compare).
5. Relaunch: chips default off; an unmutated run has identical-to-before behavior.
6. Separately verify Horde (placed enemy count ×1.5 — count `enemies.getChildren()` at create) and Ironclad (enemy `armor` data +1).

- [ ] **Step 2: Report + revert hooks**

Zero console errors; revert any `window` hooks; `git status` clean. No commit (or commit only real fixes found, each with a descriptive message).

---

## Task 5: `flee` movement archetype (pure)

**Files:**
- Modify: `src/run/enemyBehavior.ts`, `src/game/types.ts`
- Test: extend `tests/enemyBehavior.test.ts`

- [ ] **Step 1: Types** — in `src/game/types.ts`, extend the `EnemyDef.behavior` union with `'flee'` (comment: `// 'flee' runs away from the player (RC-026 treasure courier)`).

- [ ] **Step 2: Failing tests** (append to `tests/enemyBehavior.test.ts`):

```ts
import { fleeVelocity } from '../src/run/enemyBehavior';

describe('enemyBehavior — flee (RC-026 courier)', () => {
  it('runs directly away from the player at full speed', () => {
    const v = fleeVelocity(0, 0, 100, 0, 80); // player at origin, enemy at +x
    expect(v.vx).toBeCloseTo(80);
    expect(v.vy).toBeCloseTo(0);
  });
  it('normalizes diagonals (speed preserved)', () => {
    const v = fleeVelocity(0, 0, 30, 40, 100);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(100);
    expect(v.vx).toBeCloseTo(60);
    expect(v.vy).toBeCloseTo(80);
  });
  it('degenerate overlap (zero distance) still moves (any direction, full speed)', () => {
    const v = fleeVelocity(50, 50, 50, 50, 90);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(90);
  });
});
```

Run: `npm test -- enemyBehavior` → FAIL (fleeVelocity not exported).

- [ ] **Step 3: Implement** (append to `src/run/enemyBehavior.ts`):

```ts
// ---- Flee (RC-026 treasure courier): run directly away from the player. The scene applies
// routeAround on top (same as chase) so the courier slides along barriers instead of pinning. ----

/** Velocity pointing AWAY from (px,py) for an enemy at (ex,ey), magnitude `speed`.
 *  Zero-distance degenerate case picks +x so the courier never freezes under the player. */
export function fleeVelocity(
  px: number, py: number, ex: number, ey: number, speed: number,
): BehaviorVel {
  const dx = ex - px, dy = ey - py;
  const d = Math.hypot(dx, dy);
  if (d === 0) return { vx: speed, vy: 0 };
  return { vx: (dx / d) * speed, vy: (dy / d) * speed };
}
```

- [ ] **Step 4: PASS + full suite** — `npm test && npm run build` (346 expected).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(RC-026): flee movement archetype (pure)"`

---

## Task 6: POI catalog + placement/wave/jackpot math (pure)

**Files:**
- Create: `src/run/poiData.ts`, `src/run/poi.ts`
- Test: `tests/poi.test.ts`

- [ ] **Step 1: Failing tests** — create `tests/poi.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { POIS, SHRINE_WAVE_BASE, SHRINE_WAVE_PER_TIER, COURIER_DESPAWN_MS, ALTAR_WAKE_SCREENS } from '../src/run/poiData';
import { rollPois, shrineWave, shrineJackpot, courierJackpot } from '../src/run/poi';
import { mulberry32 } from '../src/run/rng';

describe('poi', () => {
  it('catalog defines the 3 launch POIs', () => {
    expect(Object.keys(POIS).sort()).toEqual(['altar', 'courier', 'shrine']);
    for (const p of Object.values(POIS)) { expect(p.icon).toBeTruthy(); expect(p.sprite).toBeTruthy(); }
  });

  it('rollPois: 2 DISTINCT types, deterministic for a seed', () => {
    const a = rollPois(mulberry32(42));
    const b = rollPois(mulberry32(42));
    expect(a).toEqual(b);
    expect(a).toHaveLength(2);
    expect(new Set(a).size).toBe(2);
  });

  it('rollPois covers all pairs across seeds', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 200; s++) seen.add(rollPois(mulberry32(s)).sort().join('+'));
    expect(seen.size).toBe(3); // C(3,2) pairs
  });

  it('shrineWave: tier-scaled count drawn from the biome spawn table', () => {
    const table = { wolf: 3, bear: 1 };
    const wave = shrineWave(mulberry32(7), table, 2);
    expect(wave).toHaveLength(SHRINE_WAVE_BASE + SHRINE_WAVE_PER_TIER * 2);
    for (const id of wave) expect(['wolf', 'bear']).toContain(id);
    expect(shrineWave(mulberry32(7), table, 2)).toEqual(wave); // seeded-deterministic
  });

  it('jackpots scale with tier and pay the right identity', () => {
    const s0 = shrineJackpot(0), s4 = shrineJackpot(4);
    expect(s0.length).toBeGreaterThan(0);
    expect(s4.reduce((t, g) => t + g.value, 0)).toBeGreaterThan(s0.reduce((t, g) => t + g.value, 0));
    const c = courierJackpot(mulberry32(3), 2);
    const resources = new Set(c.map((g) => g.resource));
    expect(resources.size).toBeGreaterThan(1); // mixed gems
    expect(COURIER_DESPAWN_MS).toBeGreaterThan(0);
    expect(ALTAR_WAKE_SCREENS).toBeGreaterThan(0);
  });
});
```

Run → FAIL (modules missing).

- [ ] **Step 2: Implement `src/run/poiData.ts`**

```ts
// RC-026 POI catalog (spec §1): one legible payout identity each. Placement is part of dungeon
// generation (same seeded Rng), so a seed reproduces its POIs.
export type PoiId = 'shrine' | 'courier' | 'altar';

export interface PoiDef {
  id: PoiId;
  name: string;
  icon: string;     // edge-indicator + HUD glyph
  sprite: string;   // art-registry texture id (art authored in Task 9; Jeff ratifies at playtest)
  blurb: string;    // one-line tooltip / log line
}

export const POIS: Record<PoiId, PoiDef> = {
  shrine:  { id: 'shrine', name: 'Relic Shrine', icon: '⛩️', sprite: 'poi_shrine',
    blurb: 'Awaken it: survive the guardians, claim a culture hoard' },
  courier: { id: 'courier', name: 'Treasure Courier', icon: '💰', sprite: 'enemy_courier',
    blurb: 'It runs. Catch it before it escapes.' },
  altar:   { id: 'altar', name: 'Fusion Altar', icon: '⚗️', sprite: 'poi_altar',
    blurb: 'A free fusion catalyst — but everything nearby wakes' },
};

// Tuning constants (feel values are RC-009's remit; structure is fixed here).
export const SHRINE_WAVE_BASE = 6;        // wave size at tier 0 ...
export const SHRINE_WAVE_PER_TIER = 2;    // ... plus this per age tier
export const SHRINE_JACKPOT_GEMS = 6;     // culture gems in the payout burst
export const SHRINE_GEM_VALUE_MULT = 3;   // per-gem value vs a normal kill gem of the tier
export const COURIER_DESPAWN_MS = 20_000; // flee window after first aggro
export const COURIER_JACKPOT_GEMS = 10;   // mixed gems on catch
export const COURIER_GEM_VALUE_MULT = 3;
export const COURIER_SPEED_MULT = 1.15;   // vs the player's base speed — catchable with routing
export const ALTAR_WAKE_SCREENS = 1.5;    // wake radius in screen-widths
```

- [ ] **Step 3: Implement `src/run/poi.ts`**

```ts
import { Resource, RESOURCES } from '../game/types';
import { Rng } from './rng';
import {
  PoiId, SHRINE_WAVE_BASE, SHRINE_WAVE_PER_TIER, SHRINE_JACKPOT_GEMS, SHRINE_GEM_VALUE_MULT,
  COURIER_JACKPOT_GEMS, COURIER_GEM_VALUE_MULT,
} from './poiData';
import { rewardValueForTier } from '../game/economy';

export interface PoiPlacement { id: PoiId; x: number; y: number; }

/** Roll the dungeon's 2 DISTINCT POI types (spec §1). Seeded → reproducible. */
export function rollPois(rng: Rng): PoiId[] {
  const all: PoiId[] = ['shrine', 'courier', 'altar'];
  const first = all[Math.floor(rng() * all.length) % all.length];
  const rest = all.filter((p) => p !== first);
  const second = rest[Math.floor(rng() * rest.length) % rest.length];
  return [first, second];
}

/** Weighted draw of `SHRINE_WAVE_BASE + PER_TIER×tier` enemy ids from a biome spawn table. */
export function shrineWave(rng: Rng, table: Record<string, number>, tier: number): string[] {
  const entries = Object.entries(table);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  const out: string[] = [];
  const n = SHRINE_WAVE_BASE + SHRINE_WAVE_PER_TIER * tier;
  for (let i = 0; i < n; i++) {
    let r = rng() * total;
    let pick = entries[0][0];
    for (const [id, w] of entries) { r -= w; if (r <= 0) { pick = id; break; } }
    out.push(pick);
  }
  return out;
}

export interface JackpotGem { resource: Resource; value: number; }

/** Shrine payout: a culture burst (its single legible identity, spec §1). */
export function shrineJackpot(tier: number): JackpotGem[] {
  const v = rewardValueForTier(tier) * SHRINE_GEM_VALUE_MULT;
  return Array.from({ length: SHRINE_JACKPOT_GEMS }, () => ({ resource: 'culture' as Resource, value: v }));
}

/** Courier payout: a big MIXED jackpot — every resource represented, remainder random. */
export function courierJackpot(rng: Rng, tier: number): JackpotGem[] {
  const v = rewardValueForTier(tier) * COURIER_GEM_VALUE_MULT;
  const out: JackpotGem[] = RESOURCES.map((r) => ({ resource: r, value: v }));
  while (out.length < COURIER_JACKPOT_GEMS) {
    out.push({ resource: RESOURCES[Math.floor(rng() * RESOURCES.length) % RESOURCES.length], value: v });
  }
  return out;
}
```

(Verify `rewardValueForTier` lives in `src/game/economy.ts` — it's the per-kill gem value scaler used by the run scene; if its actual home differs, import from there and note it.)

- [ ] **Step 4: PASS + full suite** — `npm test && npm run build` (351 expected).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(RC-026): POI catalog, rolls, wave + jackpot math (pure)"`

---

## Task 7: Scene wiring — placement, structures, edge indicators, shrine + altar

**Files:**
- Modify: `src/scenes/RunScene.ts`

- [ ] **Step 1: Placement at create()**

After enemy/gem placement in `create()` (the RC-034 block), add POI placement: roll types with the SAME seeded rng used by the dungeon (find the `mulberry32(seed)` instance), then position each in a far quadrant — reuse the placement-helper pattern in `dungeonPopulate.ts` (open point, ≥ a safe radius from start, ≥ START distance like the boss; if a suitable helper is exported, use it; otherwise sample candidate points with the rng against `layout` walls/barriers like `enemyPlacements` does). Store `private pois: Array<{ def: PoiDef; x: number; y: number; obj: any; consumed: boolean }> = []` (reset in `init()`).

For shrine/altar: `this.add.image(x, y, def.sprite)` physics-less structure, depth ~8. The courier placement is Task 8 (it's an enemy, not a structure).

- [ ] **Step 2: Edge indicators**

`updatePoiIndicators()` called each `update()`: for each live (not consumed) POI, if its world position is off-camera, show a screen-fixed icon text (`def.icon`, scrollFactor 0, depth 58) clamped to the nearest screen edge along the direction to the POI (same geometry as the RC-019 warning marker, but persistent); hide/destroy when on-camera, consumed, or (courier) despawned. Keep one indicator object per POI, reused.

- [ ] **Step 3: Shrine activation**

In `update()`, for an unconsumed shrine: if `withinRadius(player.x, player.y, poi.x, poi.y, 60 * RUN_SCALE)` → consume: tint the structure dark, then:

```ts
    const wave = shrineWave(this.dungeonRng, this.biome.spawnTable, this.expedition.tier);
    this.shrineWaveIds = new Set<string>();
    for (const id of wave) {
      const ang = Math.random() * Math.PI * 2;
      const r = (140 + Math.random() * 120) * RUN_SCALE;
      const e = this.spawnEnemyAt(ENEMIES[id], poi.x + Math.cos(ang) * r, poi.y + Math.sin(ang) * r);
      this.wakeEnemy(e);                      // awake + aggroed — the wager
      this.shrineWaveIds.add(e.getData('uid'));
    }
    this.shrinePending = { x: poi.x, y: poi.y };
    playSfx('boss-arrival');
```

(`this.dungeonRng` — keep a reference to the seeded rng from create(); shrine wave composition stays deterministic per seed, spawn jitter may use Math.random — composition is the testable part.) In `applyDamageToEnemy`'s death branch, if the dead enemy's uid is in `shrineWaveIds`, remove it; when the set empties and `shrinePending` is set, burst the jackpot:

```ts
    for (const g of shrineJackpot(this.expedition.tier)) {
      const ang = Math.random() * Math.PI * 2, rr = 30 + Math.random() * 60;
      this.dropGem(this.shrinePending.x + Math.cos(ang) * rr, this.shrinePending.y + Math.sin(ang) * rr, g.resource, g.value);
    }
    this.shrinePending = null;
    playSfx('gem-pickup', { semitones: 12 });
```

(Check `dropGem`'s actual signature — if it takes (x, y, resource) and derives value, add an optional value override the way the boss jackpot does it; read the bossJackpotGems drop loop and mirror it.)

- [ ] **Step 4: Altar activation**

Same walk-over pattern: consume → `this.catalysts += 1` + catalyst pickup sfx (`playSfx('gem-pickup', { semitones: 12 })`) + wake sweep:

```ts
    const wakeR = this.scale.width * ALTAR_WAKE_SCREENS;
    (this.enemies.getChildren() as any[]).forEach((e) => {
      if (e.active && withinRadius(poi.x, poi.y, e.x, e.y, wakeR)) this.wakeEnemy(e);
    });
    this.cameras.main.shake(140, 0.006);
```

- [ ] **Step 5: Verify + commit**

`npm test && npm run build` green. Dev sanity: structures appear, indicators point at them off-screen, shrine wave spawns awake and pays culture on clear, altar wakes the area and increments ⚗️.

```bash
git add -A
git commit -m "feat(RC-026): POI placement, edge indicators, shrine + altar in-scene"
```

---

## Task 8: Treasure courier — entity, flee, despawn, jackpot, win exemption

**Files:**
- Modify: `src/run/enemyData.ts`, `src/scenes/RunScene.ts`
- Test: extend `tests/enemyData.test.ts`

- [ ] **Step 1: EnemyDef (test-first)** — add to `tests/enemyData.test.ts`:

```ts
it('treasure courier: flee behavior, no attack, modest HP', () => {
  const c = ENEMIES.treasure_courier;
  expect(c.behavior).toBe('flee');
  expect(c.attack).toBeUndefined();
  expect(c.baseHp).toBeGreaterThan(0);
});
```

Then in `src/run/enemyData.ts` add (sprite is the Task 9 art id):

```ts
  treasure_courier: {
    id: 'treasure_courier', name: 'Treasure Courier', sprite: 'enemy_courier',
    baseHp: 40, speed: 95, contactDamage: 0, drop: 'culture', xp: 5,
    displaySize: { w: 34, h: 34 },
    behavior: 'flee', // RC-026: runs from the player; jackpot on catch (poi.ts pays, not `drop`)
  },
```

- [ ] **Step 2: Placement + lifecycle in RunScene**

When the POI roll includes `courier`: place via `spawnEnemyAt(ENEMIES.treasure_courier, x, y)` at the rolled POI position, then `e.setData('poiCourier', true)`. Courier speed: after spawn, `e.setData('speed', this.playerBaseSpeed * COURIER_SPEED_MULT)` where playerBaseSpeed = the scene's hero speed constant × RUN_SCALE (read the movement code in update() — `180 * RUN_SCALE * moveSpeedMult`; use 180 × RUN_SCALE × COURIER_SPEED_MULT so mutators/passives on the PLAYER keep the chase fair).

**Flee dispatch:** in `updateEnemyMovement`'s behavior branch, add `case 'flee'`: `fleeVelocity(player.x, player.y, e.x, e.y, speed)` then the same routeAround treatment as chase.

**Despawn:** when the courier first wakes (the wake/aggro path — same hook RC-035 uses), set `e.setData('despawnAt', this.elapsed + COURIER_DESPAWN_MS)`. In `update()`, a live courier past `despawnAt` fades out (`alpha tween 300ms`) and is destroyed WITHOUT jackpot or kill credit; its edge indicator dies with it.

**Jackpot:** in `applyDamageToEnemy`'s death branch, if `getData('poiCourier')` → drop `courierJackpot(this.dungeonRng, this.expedition.tier)` gems around the death point (same burst pattern as the shrine), `playSfx('gem-pickup', { semitones: 12 })`. (The RC-035 sleeping-contact-kill path also routes here if the courier dies by contact — that's the ruled-intentional stealth catch... but NOTE: `hitPlayer` non-boss contact destroys via `e.destroy()` WITHOUT the damage path. Add a courier branch in `hitPlayer` BEFORE the generic destroy: if `getData('poiCourier')`, pay the jackpot then destroy. ContactDamage 0 means the player takes nothing.)

**Win exemption:** find the dungeon-clear check (`countActive(true) === 0` pattern, ~line 497) and exempt couriers:

```ts
    const remaining = (this.enemies.getChildren() as any[])
      .filter((e) => e.active && !e.getData('poiCourier')).length;
    if (remaining === 0 && ...) this.startCeremony();
```

Also exempt the courier from Horde count (it isn't part of `enemyPlacements` — placed by POI code, so this is automatic; confirm and note).

- [ ] **Step 3: Verify + commit**

`npm test && npm run build` (352 expected). Dev sanity: courier visible+asleep, flees on approach, despawns after 20s aggro, pays a mixed burst when caught, dungeon clears with courier alive.

```bash
git add -A
git commit -m "feat(RC-026): treasure courier - flee, despawn window, jackpot, win exemption"
```

---

## Task 9: POI art — authored sprites, integrated (Jeff ratifies at the evening playtest)

**Files:**
- Create/Modify: `src/art/sprites/` shape-data for `poi_shrine`, `poi_altar`, `enemy_courier` + registry wiring
- Test: follow the existing art data-integrity test pattern (look at `tests/` for sprite/registry tests — e.g. `gemArt.test.ts` — and add equivalent coverage)

**Gate note (Jeff, 2026-06-11): art is authored AND integrated now; ratification happens at the evening playtest before the branch merges to main.** If Jeff rejects a sprite at playtest, only shape-data changes — no system rework.

- [ ] **Step 1: Study the pipeline** — read `src/art/types.ts`, `src/art/registry.ts`, and one existing sprite file (`src/art/sprites/obstacles.ts` for structures, `src/art/sprites/enemies.ts` for the courier). New sprites are shape-data entries rendered through the existing pass pipeline — follow the exact authoring format.

- [ ] **Step 2: Author three sprites** (flat style, matching the current art pass):
- `poi_shrine` — a small stone shrine: stepped base, pillar pair, warm relic glow accent (culture-gold #e0b341-family from the palette).
- `poi_altar` — a low fusion altar: anvil-like slab, two inward arcs suggesting fusion, ⚗️-green accent matching the catalyst token color.
- `enemy_courier` — a small hunched runner with a bulging treasure sack (gold accents); silhouette must read as "loot on legs" at 34px.
Register all three; ensure the registry/data tests cover them (every sprite id referenced by `POIS`/`ENEMIES` exists in the registry — add that assertion to the art or data test file).

- [ ] **Step 3: Render check** — dev server, place all three on-screen (temporary scene or just run until a dungeon rolls them), screenshot each at gameplay zoom for the playtest review notes. Revert any temp placement code.

- [ ] **Step 4: Verify + commit**

`npm test && npm run build` green.

```bash
git add -A
git commit -m "art(RC-026): shrine, altar, courier sprites - pending Jeff's playtest ratification"
```

---

## Task 10: Phase B live verification + ticket resolutions

**Files:** ticket updates only (instrumentation reverted)

**REQUIRED SUB-SKILL:** `verify-canvas-game-playwright`. Clean port; remember the headless-clock and HMR-staleness gotchas.

- [ ] **Step 1: Walkthrough**

Seeded run (find a seed that rolls shrine+courier; then another with altar — sample `rollPois` outputs across seeds via the module in node if needed):
1. Two POIs placed, distinct, in far quadrants; edge indicators visible and tracking while off-screen.
2. Shrine: walk over → wave spawns awake (count = 6 + 2×tier), indicators gone, wave enemies count toward the clear; kill the wave → culture gems burst at the shrine (values per `shrineJackpot`).
3. Courier: approaches flee correctly (velocity away, slides along barriers); despawn at +20s aggro removes it without credit; on a fresh run, catch it → mixed-gem burst; contact-kill a SLEEPING courier → jackpot (stealth-catch ruling).
4. Altar: walk over → ⚗️ +1 on HUD, sleepers within ~1.5 screens wake (sample `slowUntil`-style data — check `asleep` flags), camera shake.
5. Win exemption: clear all non-courier enemies while the courier lives → ceremony starts.
6. Mutator interplay: Horde ON → placed count scales but the shrine wave stays 6+2×tier and the courier is single.
7. Zero console errors; screenshots: shrine + wave, courier mid-flee with edge indicator, altar + wake moment (these double as Jeff's art-review pack — save paths in the report).

- [ ] **Step 2: Ticket resolutions**

Append `## Resolution` sections to `docs/tickets/RC-026-in-run-poi-events.md` and `docs/tickets/RC-029-expedition-mutators.md` (what shipped, where the spec/plan live, the art-ratification-at-playtest note for RC-026). Flip both BACKLOG rows to Delivered. Commit:

```bash
git add -A
git commit -m "docs(RC-026/RC-029): mark delivered - wagers + POIs (art pending playtest ratification)"
```

---

## Acceptance traceability (spec → tasks)

| Spec requirement | Tasks |
|---|---|
| 4 mutators, half-the-risk values, additive stacking | 1 (table test asserts exact values) |
| Card chips, ephemeral, running total | 3 |
| Effects via existing seams; haul mult + echoes | 2, 4 |
| 2 distinct seeded POIs, opt-in, edge-signaled | 6, 7 |
| Shrine wave→culture; courier flee/despawn/jackpot/win-exempt; altar catalyst+wake | 5, 6, 7, 8 |
| Sleeping-courier stealth catch pays | 8 (hitPlayer branch) |
| No save bump | all (no CivState/saveLoad changes anywhere) |
| Art authored + integrated, ratified at playtest | 9, 10 |

## Executor notes

- RunScene line numbers move — anchor by symbol (`spawnEnemyAt`, `updateEnemyMovement`, `applyDamageToEnemy`, `hitPlayer`, `loadoutHudLine`, the clear check).
- If a step's API guess mismatches reality (e.g. `dropGem` signature, rng variable name, wake-hook name), adapt minimally and report the deviation; do NOT redesign contracts.
- All gem/wave/jackpot NUMBERS are provisional (RC-009 owns feel); structure and identities are fixed.
