# RC-007: Enemy + biome + expedition systems
**Status**: Open  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-07
**Capability**: C3 (Content & ages)

## Summary
Second foundation of the Iron slice. Lift enemies out of `RunScene` hardcoding into data
(`enemyData.ts`), and add the **biome + expedition** system: `BiomeDef` (resource bias +
spawn table + age gate), `expedition.ts` (derive available biome×tier runs + age-scaled
difficulty), a flat-grid **expedition pick screen** (new DOM surface), and the `iron` age
plumbing (`AgeId`/`AGE_ORDER`). Ships the three base biomes (Wilds / Ruins / Frontier)
using existing + a couple new enemies, BEFORE any Iron content. Fixes the thin
Exploration/Culture sourcing (KNOWN_ISSUES #2) via biome `resourceBias`.

## Acceptance Criteria
- [ ] `EnemyDef` + `enemyData.ts`; `spawnEnemy()` reads the active expedition's spawn table
- [ ] `BiomeDef` + `biomeData.ts` (3 base biomes); `expedition.ts` (available runs + scaling), unit-tested
- [ ] Expedition pick screen (`src/ui/expeditionScreen.ts`) — flat grid, all options visible (jeff-ui-design)
- [ ] Run flow: Civ → Expedition pick → `RunScene(expedition)`; age/tier scaling applied
- [ ] `iron` added to `AgeId`/`AGE_ORDER`; tests green; build clean; Playwright-verified
- [ ] Write the RC-007 implementation plan (superpowers:writing-plans) before building

## References
- Spec: `docs/superpowers/specs/2026-06-06-iron-age-slice-design.md` §3b, §3c, §5
- Depends on RC-006 (weapon system). Decomposed from RC-005.
