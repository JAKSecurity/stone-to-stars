# RC-007: Enemy + biome + expedition systems
**Status**: Delivered  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-07  **Resolved**: 2026-06-07
**Capability**: C3 (Content & ages)

## Resolution (2026-06-07)
Built via subagent-driven-development from
`docs/superpowers/plans/2026-06-07-rc007-enemy-biome-expedition.md` (merged to `main`).
Data-driven `enemyData.ts` + `biomeData.ts` + pure `expedition.ts` (tierScaling /
availableExpeditions / pickEnemy) with 14 new unit tests (**86 total green**); `RunScene`
spawns from the active expedition's biome with tier-scaled hp/speed/spawn-rate/drops and
per-enemy contact/xp; biome `resourceBias` faucets exploration/culture. New flat-grid
expedition pick screen + civ→pick→run flow; `'iron'` added to AGE_ORDER (plumbing). Two-stage
reviews per unit + final review, all passed. **Playwright-verified live:** stone civ → 2
expedition cards, bronze civ → 5 (incl. Frontier T1); Ruins T0 spawns ~77% science (drop
distribution 34:10), per-enemy speeds 60/70, no NaN; Wilds T1 scales hp 18/24→27/36 and
speed →66/77; biome tint applied. Found + fixed a scene-restart-race crash guard in
`update()` during verification. **Art-free** (existing sprites) — new enemy types/sprites +
Deep Caverns deferred to RC-008.

## Summary
Second foundation of the Iron slice. Lift enemies out of `RunScene` hardcoding into data
(`enemyData.ts`), and add the **biome + expedition** system: `BiomeDef` (resource bias +
spawn table + age gate), `expedition.ts` (derive available biome×tier runs + age-scaled
difficulty), a flat-grid **expedition pick screen** (new DOM surface), and the `iron` age
plumbing (`AgeId`/`AGE_ORDER`). Ships the three base biomes (Wilds / Ruins / Frontier)
using existing + a couple new enemies, BEFORE any Iron content. Fixes the thin
Exploration/Culture sourcing (KNOWN_ISSUES #2) via biome `resourceBias`.

## Acceptance Criteria
- [x] `EnemyDef` + `enemyData.ts`; `spawnEnemy()` reads the active expedition's spawn table
- [x] `BiomeDef` + `biomeData.ts` (3 base biomes); `expedition.ts` (available runs + scaling), unit-tested
- [x] Expedition pick screen (`src/ui/expeditionScreen.ts`) — flat grid, all options visible (jeff-ui-design)
- [x] Run flow: Civ → Expedition pick → `RunScene(expedition)`; age/tier scaling applied
- [x] `iron` added to `AgeId`/`AGE_ORDER`; tests green (86); build clean; Playwright-verified
- [x] Write the RC-007 implementation plan (superpowers:writing-plans) before building

## References
- Spec: `docs/superpowers/specs/2026-06-06-iron-age-slice-design.md` §3b, §3c, §5
- Depends on RC-006 (weapon system). Decomposed from RC-005.
