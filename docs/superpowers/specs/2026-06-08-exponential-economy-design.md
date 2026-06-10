# RC-017 — Exponential Per-Age Progression — Design

**Date:** 2026-06-08  **Capability:** C3 (Content & ages)  **Depends on:** RC-004 (gem tiers)
**Branch:** `rc-017-exponential-economy` (stacked on `rc-004-gem-tiers`; rebases to `main` after RC-004 merges)

## Problem

Progression is linear and reads flat. The per-age cost multiplier *decelerates* (×1.5 → ×1.43 → ×1.2,
even ×1.0 Iron→Classical) and income grows only ~4.5× across 8 ages while cost grows ~15×. The result:
early/easy content stays farmable, late content grinds, and there's no felt "step" between ages.

## Goal (Jeff's vision)

A clear **step up per age the player feels**. Enter a new age → enemies out-stat you, you likely die
partway → but the higher tier's exponential reward makes even a *partial* run worth more than a full
run of the previous tier → a few runs + civ upgrades later, runs become survivable → by the time you've
bought the age out, you're farming it. Right at the border there's an honest call: **farm the easy
lower tier, or risk the harder new one.** Players earn rewards at roughly the **same rate** at the end
of the game as at the start, but cannot just farm early/easy levels for late-game resources.

## Core model

**One constant `G = 1.75`** drives everything, via a symmetric rule:

- **All income scales by the _run's_ tier:** `× G^runTier`
- **All costs scale by the item's _age_:** `× G^ageIndex`

This delivers both goals at once:
- **Constant rate** — advancing age *N→N+1* costs `G^(N+1)` while age-*N* income is `G^N`, so
  runs-per-age ≈ a constant `G` at every age.
- **Anti-farm gate** — affording a `G^7` Modern tech by grinding `G^0` Stone runs takes ~50× more runs
  than doing it at Modern. Exponentially futile.
- **Border decision** — a partial new-age run pays `f·G^(n+1)`; a full old-age run pays `G^n`; the new
  wins when **`f > 1/G`**. At `G=1.75` the break-even survival fraction is **~57%** — "survive a bit
  past half and the push pays off." (Partial runs already bank collected resources on death.)

`G^tier` table (rounded): `t0=1, t1=2, t2=3, t3=5, t4=9, t5=16, t6=29, t7=50`.

---

## Component ① — Exponential economy

### New module `src/game/economy.ts` (pure, unit-tested)

```ts
import { AgeId, AGE_ORDER } from './types';

export const G = 1.75;                                  // single tunable steepness knob
export function incomeMult(runTier: number): number { return G ** runTier; }
export function costMult(ageIndex: number): number { return G ** ageIndex; }
export function gemValueForTier(runTier: number): number { return Math.round(G ** runTier); }
export function ageIndexOf(age: AgeId): number { return AGE_ORDER.indexOf(age); }
```

### Income (× `incomeMult(runTier)`) — `RunScene` + `civState`

The run's tier is `this.expedition.tier` (= the biome's age index, see Component ②).

- **Gem value.** `dropGem` sets `gem.setData('value', gemValueForTier(this.expedition.tier))`;
  `collectGem` banks that value (`this.collected[resource] += value`) instead of `+1`. **One gem per
  kill** carrying a tier-scaled value (the old multi-drop `dropMult` count is removed — value, not
  swarm). RC-004's visual tier (chipped/cut/brilliant) is the at-a-glance value indicator.
- **Faucets.** The exploration tick adds `gemValueForTier(tier)` instead of `+1`. Culture relics are
  already `dropGem('culture')`, so they inherit the gem value automatically.
- **Building yields.** Scaled by the run's tier so low-tier farming pays low on *every* channel (no
  yield loophole). `RunResult` gains `tier`; `applyRunResult` adds
  `scaleBundle(def.yield, incomeMult(result.tier))` per level. New helper `scaleBundle(bundle, factor)`
  in `resources.ts` (rounds each component).

### Cost (× `costMult(ageIndex)`) — `tech` + `camp`, read by logic *and* UI

- **Shared cost helpers** (the single source of truth for displayed and charged cost):
  - `techCost(techId): Partial<ResourceBundle>` = `scaleBundle(TECHS[id].cost, costMult(ageIndexOf(TECHS[id].age)))`.
  - `buildingCost(buildingId, level): Partial<ResourceBundle>` =
    `scaleBundle(BUILDINGS[id].baseCost, costMult(ageIndexOf(def.age)) * level)`.
  - `research()`, `build()`, `upgradeBuilding()` charge via these; `civScreen` displays via these.
- **`BuildingDef` gains `age: AgeId`** (buildings currently have no age; derive-from-unlocking-tech is
  fragile, so add it explicitly — 24 entries, mechanical). Stone: granary/mine; Bronze: forge; Iron:
  smelter/foundry/deep_mine; … Modern: motor_pool/barracks/airfield.
- **Re-author base data to age-relative magnitudes.** Tech/building base costs are stripped of their
  across-age growth (G handles that) and kept *flat across ages*, preserving each item's **resource
  mix** and **within-age relativities** (gating tech > normal tech > cheap tech). Worked example: a
  gating tech's base ≈ 14 of its primary resource regardless of age; `combustion` (Modern, ageIdx 7)
  then charges `round(14 · 1.75^7) ≈ 700`, while `bronze_working` (ageIdx 1) charges `round(14·1.75) ≈
  25`. The exact flat base magnitudes are set by calibration (below), not hand-guessed.

---

## Component ② — Fixed-per-age difficulty

"Stable within an age; the step is at the boundary."

- **Drop the continuous per-tier enemy multiplier.** `tierScaling`'s `hpMult`/`speedMult` are removed —
  enemies use their **fixed per-age `EnemyDef` stats**. The difficulty step lives in each age's enemy
  *set* being tougher than the last (already roughly true in `enemyData`; the exact step magnitude vs
  player-power is playtest-tuned — see Open items).
- **Reward tier = the biome's age.** `Expedition.tier` becomes `ageIndexOf(biome.minAge)`.
  `availableExpeditions` offers each unlocked biome **once**, at its own age tier (not a tier *range*).
  Old biomes stay runnable but pay `G^(lowerAge)` — so you naturally stop farming them, and the border
  choice is "current-age biome (hard, `G^cur`) vs previous-age biome (easy, `G^(cur-1)`)."
- **`ExpeditionScaling` collapses.** `hpMult`/`speedMult`/`dropMult` are gone; `spawnRateMult` is folded
  into the base spawn-rate ramp (flat across tiers). `Expedition` becomes `{ biomeId, tier }`;
  `RunScene` reads enemy stats straight from `EnemyDef` and reward from `incomeMult(tier)`. This removes
  the `this.expedition.scaling.*` reads in `RunScene`.

> **Known content gap (note, not fixed here):** the Bronze biome (`frontier`) reuses Stone enemies
> (beast/scholar), so its difficulty step is soft. Component ③'s next-age seeding softens this (it can
> seed Iron enemies late in Bronze runs); a proper Bronze enemy set is a separate content follow-up.

---

## Component ③ — Within-run escalation (straddling enemies)

Make surviving past halfway a real achievement and blend the age seams.

- **Pure spawn-weighting helper** `spawnTableAt(biome, progress, opts)` → `Record<enemyId, weight>`,
  where `progress = elapsed / RUN_DURATION_MS` ∈ [0,1]. It blends three sources:
  1. **The biome's base table** (`biome.spawnTable`), dominant early.
  2. **Late-weighting toward the biome's own tough enemies** — the higher-`baseHp` members of the
     table (incl. the mini-boss) get weight that ramps up with `progress`.
  3. **Next-age seeds** — a small, `progress`-ramped weight of the *next* age's signature tough
     enemies, so the back of a run previews the coming age and the boundary blends. The next age's
     enemies come from `nextAgeBiome(biome)` (the biome whose `minAge` is the next `AGE_ORDER` entry);
     helper added in `expedition.ts`/`biomeData`.
- `spawnEnemy` calls `pickEnemy(spawnTableAt(biome, progress, …), rng)` instead of the static table.
- The existing spawn-**rate** ramp (`1 + elapsed/60000`) stays — more enemies *and* tougher mix late.
- Pure and unit-tested: at `progress=0` the table ≈ the base table; as `progress→1`, tough-enemy and
  next-age weights rise and at least one next-age enemy id is present. Exact ramp curves are tuning
  constants in `economy.ts`/the helper, documented for playtest.

---

## Cross-cutting

### Saves
Bump `CivState.version` 1→2 and `CURRENT_VERSION` in `saveLoad.ts`. `load()` already returns `null` on
mismatch → `main.ts` falls back to `newCivState()`, so stale saves auto-reset (acceptable in dev; the
cost/value scale changed, so old banked numbers are meaningless). No migration code.

### Calibration (sets absolute magnitudes; G sets the across-age shape)
1. **Measure** kills/run + faucet income at a representative tier via Playwright (drive a real run,
   count `collected` growth) — no guessing.
2. **Set the flat base-cost scale** so age-0 (Stone) research + buildings cost ≈ a **target of ~3–4
   runs** of age-0 income. G then makes every later age cost the same ~3–4 runs *of its own income* by
   construction.
3. **Verify** with the `economy.ts` constant-velocity test + 2 live runs (a fresh-age run is lethal;
   a bought-out-age run is farmable).

### Testing
- **`economy.ts` (pure):** exact `incomeMult`/`costMult`/`gemValueForTier` values; a **constant-velocity
  property test** — `costMult(n+1)/incomeMult(n) === G` for all n (the core invariant).
- **Cost helpers:** `techCost`/`buildingCost` scale + round correctly; level multiplier on buildings.
- **`spawnTableAt`:** base-like at progress 0; tough + next-age weighted at progress 1; pure/no-Phaser.
- **`availableExpeditions`:** each unlocked biome offered once at its age tier; tech-gated biomes honored.
- **`applyRunResult`:** yields scaled by `result.tier`; `scaleBundle` rounding.
- **Saves:** version-mismatch reset.
- **Live (Playwright, `verify-canvas-game-playwright`):** gem value banks scale with tier; displayed
  costs are tier-scaled; a current-age run is hard / previous-age easy; late-run spawns shift tough +
  next-age enemies appear; 0 console errors.

---

## Scope / non-goals

- **Combat number-feel is NOT fully solved here** — this lands the *structure* (fixed-per-age stats,
  reward exponential, within-run ramp). Making the per-age step *land* (you genuinely can't survive a
  fresh age, then out-grow it) is joint enemy-step / player-power tuning done by **playtest feel** (the
  RC-009 pass rides on this structure).
- **No exponential enemy stats** (Jeff's call: economy-only). Enemy `EnemyDef` numbers are re-tuned for
  the *step* feel during the balance pass, not rescaled exponentially here.
- **Bronze's missing unique enemy set** — noted, separate content follow-up.
- **Civ resource-bar per-tier value display** — out of scope (the gem visual tier already signals it).

## Files touched (map)

- **New:** `src/game/economy.ts` (+ tests).
- **Types:** `BuildingDef.age`, `RunResult.tier`, `Expedition` → `{biomeId, tier}` (drop
  `ExpeditionScaling`).
- **Income:** `RunScene` (gem value, faucet, spawn via `spawnTableAt`, drop `scaling.*` reads),
  `civState.applyRunResult` (scaled yields), `resources.scaleBundle`.
- **Cost:** `tech.techCost`+`research`, `camp.buildingCost`+`build`/`upgradeBuilding`, `civScreen`
  display.
- **Difficulty:** `expedition.ts` (`tierScaling` removal, `availableExpeditions`, `nextAgeBiome`),
  `expeditionScreen` (offer-once display).
- **Within-run:** `expedition.spawnTableAt` (or new `src/run/spawnEscalation.ts`).
- **Data re-author:** `techData` (costs), `buildingData` (costs + `age`).
- **Saves:** `saveLoad` + `types.CivState.version`.

## Verification gate

Branch `rc-017-exponential-economy`. Calibrated + tests green + Playwright-verified, then Jeff
playtests the feel (the per-age step is his ratification) before merge.
