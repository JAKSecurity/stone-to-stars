# RC-019 — Mini-boss arrival events (Design)

**Date:** 2026-06-10
**Ticket:** [RC-019](../../tickets/RC-019-mini-boss-events.md)
**Status:** Approved — ready for implementation plan

## Problem

Every biome already designates an apex enemy (the toughest in its spawn table — cyclops, dragon,
mecha, juggernaut…), but it spawns silently as a rare weight-1 mob. Make it an announced event that
gives every run a climax: timed arrival, name banner + warning, on-screen HP bar, and a guaranteed
jackpot on kill. Folds in playtest note #10 (5× boss HP, upgraded-gem reward).

## Approved decisions

- **De-trickle = option A:** keep the apex in `biome.spawnTable` (so `apexEnemyId`/`biomeDanger`
  threat-rating on the expedition card still work) but exclude it from the live random spawn stream;
  spawn it once as the timed event.
- **Jackpot = gem burst + upgraded gem:** ~10 gems at boosted value plus one visibly upgraded
  (brilliant-tier, large-value) gem. No healing pickup (that stays in RC-025).
- **Boss UI = top-center bar + banner + warning:** fixed top-center HP bar while it lives, a
  "⚔ <Name> approaches" name banner on arrival, an edge-of-screen warning indicator at the entry point.
- **5× HP**, `isBoss` flag (reuses the existing flag the zone-clear ceremony already spares).
- Boss keeps its own RC-018 behavior; **no special boss move this pass** (YAGNI).

## Architecture

Pure logic in a new Phaser-free `src/run/bossEvent.ts` (mirrors `enemyBehavior.ts` /
`projectileMotion.ts`); `RunScene` is the renderer that drives the arrival, HP bar, and jackpot.

### Pure module — `src/run/bossEvent.ts`

Constants (tunable):
```
BOSS_ARRIVAL_PROGRESS = 0.7   // fraction of run elapsed at which the boss arrives
BOSS_TELEGRAPH_MS     = 1200  // delay between the warning/banner and the boss appearing
BOSS_HP_MULT          = 5     // boss spawns with baseHp × this
BOSS_GEM_COUNT        = 10    // gems in the kill burst
BOSS_GEM_VALUE_MULT   = 4     // burst gem value vs a normal kill gem
BOSS_BIG_GEM_VALUE_MULT = 20  // the single 'upgraded' gem's value vs a normal gem
```

Functions:
- **`shouldSpawnBoss(elapsedMs, runDurationMs, alreadySpawned): boolean`** — true once
  `elapsedMs / runDurationMs >= BOSS_ARRIVAL_PROGRESS` and not `alreadySpawned`. Guards divide-by-zero.
- **`bossFreeTable(table, bossId): Record<string, number>`** — returns a copy of `table` without
  `bossId`. Fed to `spawnTableAt` for the random stream so the boss never trickles in and late-game
  escalation targets the next-toughest enemy.
- **`bossJackpotGems(baseValue, tier): Array<{ value: number; tier: GemTier }>`** — returns the drop
  list: `BOSS_GEM_COUNT` gems at `baseValue × BOSS_GEM_VALUE_MULT` of the run's `tier`, plus one
  "upgraded" gem at `baseValue × BOSS_BIG_GEM_VALUE_MULT` and `bumpTier(tier)`.

### Gem tier bump — `src/run/gemTier.ts`

Add **`bumpTier(tier: GemTier): GemTier`** — `chipped→cut→brilliant→brilliant` (clamps at top). Used
so the jackpot's upgraded gem reads one cosmetic tier above the run's normal drops (a late-game run
already at `brilliant` stays `brilliant` but the big value carries the distinction).

### RunScene wiring

State: `bossId: string`, `bossSpawned: boolean`, `bossEnemy: any | null`, plus the HP-bar GameObjects.

1. **Run start (`create`/`init`):** `this.bossId = apexEnemyId(this.biome.spawnTable)`; `bossSpawned = false`.
2. **De-trickle (`spawnEnemy`):** build the live table from `spawnTableAt(...)` over a
   `bossFreeTable(this.biome.spawnTable, this.bossId)`-based biome so the random pick never yields the boss.
   (Pass a biome whose `spawnTable` is the boss-free copy, computed once and cached.)
3. **Arrival (`update`):** when `shouldSpawnBoss(this.elapsed, this.runDurationMs, this.bossSpawned)`,
   set `bossSpawned = true`, `playSfx('boss-arrival')`, show the name banner + edge warning indicator
   at a chosen entry edge, and `this.time.delayedCall(BOSS_TELEGRAPH_MS, () => spawnBoss(edge))`.
4. **`spawnBoss(edge)`:** `const e = this.spawnEnemyAt(ENEMIES[this.bossId], x, y)`; set
   `hp = baseHp × BOSS_HP_MULT`, `maxHp` (data), `isBoss = true`; `this.bossEnemy = e`; create the
   top-center HP bar.
5. **HP bar update (`update`):** while `bossEnemy?.active`, set the fill width from
   `hp / maxHp`; update the name label. Destroy the bar when the boss dies or the run ends.
6. **Jackpot (`applyDamageToEnemy`, death branch):** if `enemy.getData('isBoss')`: call
   `bossJackpotGems(rewardValueForTier(tier), gemTierForExpeditionTier(tier))` and drop each via
   `dropGem` (extended with optional `valueOverride` + `tierOverride`), scattered around the death
   point; destroy the HP bar; clear `bossEnemy`. Audio: the existing `enemy-death` SFX (already fired in
   `applyDamageToEnemy`) plus the per-gem `gem-pickup` chimes as the burst is collected — no new
   kill-specific SFX. Existing death particles/xp still fire.
7. **Persistence:** no enrage; the boss is a normal (huge) enemy that persists. `isBoss` already spares
   it from the zone-clear sweep (`RunScene.ts:372`).

### dropGem extension

`dropGem(x, y, resource, opts?: { valueOverride?: number; tierOverride?: GemTier })` — when provided,
use the override tier sprite and value instead of the run-tier defaults. Keeps all existing callers
unchanged (opts optional).

## Non-goals
- No new art — banner/bar are Phaser text + rects; gems reuse existing tier sprites.
- No healing pickup (RC-025).
- No special boss attack/behavior (boss uses its enemy def's RC-018 behavior).
- No escalation-on-fast-kill hook (the ticket's optional idea — defer).
- No save-format change.

## Testing
- **Vitest — `bossEvent.test.ts`:** `shouldSpawnBoss` threshold + already-spawned + zero-duration
  guard; `bossFreeTable` removes only the boss id and doesn't mutate the input; `bossJackpotGems`
  count/values/tier (burst count = `BOSS_GEM_COUNT`, big gem present at bumped tier + big value).
- **Vitest — `gemTier.test.ts`:** `bumpTier` ladder + clamp.
- **Playwright live-verify** (per `verify-canvas-game-playwright`): drive a run to ≥70%, confirm the
  banner + warning fire, the boss spawns once with 5× HP and the top-center bar tracks its HP, the boss
  no longer appears in the random stream, and killing it drops the gem burst + upgraded gem and removes
  the bar.

## Files touched
- `src/run/bossEvent.ts` — **new** pure module
- `src/run/bossEvent.test.ts` — **new** tests
- `src/run/gemTier.ts` — `bumpTier` helper (+ test)
- `src/scenes/RunScene.ts` — arrival, boss spawn, HP bar, jackpot, de-trickle, `dropGem` opts

---

## Balance tweaks — RC-009 batch (same branch, separate commits)

Small playtest-driven changes shipped alongside RC-019 ([RC-009](../../tickets/RC-009-juice-balance.md)):

- **#8 — bigger damage numbers:** `RunScene.applyDamageToEnemy` floating-number font `13px → ~20px`.
- **#5 — powerups −50%:** `src/run/draft.ts` PERKS — `sharpen` `0.25 → 0.125`, `rapid` `0.20 → 0.10`.
- **#11 — gatling nerf:** `src/run/weaponData.ts` `gatling.cooldownMs` ×~2 (≈ −50% fire rate).
- **#9 — traditions costlier:** `src/civics/traditionData.ts` — every tradition `base × 10` and
  `COST_G 1.6 → 5.0`, so rank N cost = `round(base × 10 × 5^(rank-1))` (very steep, per Jeff).
- **#3 — tech age move:** `src/tech/techData.ts` — `writing` and `mining` `age: 'stone' → 'bronze'`.
  **Constraint:** verify nothing Stone-age requires them and that an opening Stone run still has a
  valid research path (a tech `requires: ['mining']` exists — confirm it's Bronze+ or adjust).

Each tweak gets a focused test where there's logic (perk magnitudes, tradition cost curve); the font
and weapon-number changes are data, verified by build + a Playwright glance.
