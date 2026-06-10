# RC-018: Enemy behavior archetypes
**Status**: Open  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-09

## Summary
All 26 enemies use the identical chase-the-player movement; later ages are stat-reskins of Stone.
Add a data-driven `behavior` field to `EnemyDef` with 3–4 archetypes and assign them where
thematically apt, so ages feel mechanically distinct and positioning starts to matter.

## Context
From the 2026-06-09 game-improvement review (item A1) — identified as the single biggest
"ages feel distinct" lever. Proposed archetypes:
- **ranged** — stops at standoff distance and fires a slow, dodgeable projectile
  (scholar, musketeer, gunship)
- **charger** — telegraphs (pause + windup tell), then dashes at high speed (centaur, halftrack)
- **splitter** — on death, splits into 2 weaker spawns (rock golem → cave dwellers)
- **circler** — strafes/orbits the player instead of beelining (harpy, drone)

Default remains `chase`. Implementation is per-enemy data + a behavior dispatch in `RunScene`'s
enemy update; keep motion math pure/unit-testable (pattern: `src/run/projectileMotion.ts` from RC-015).

**Sequencing:** build after rc-017 merges — touches `RunScene` enemy update and `enemyData.ts`,
both heavily modified on that branch.

## Acceptance Criteria
- [ ] `EnemyDef.behavior` field with `chase` default; existing data unchanged in feel
- [ ] At least 3 new archetypes implemented and assigned to thematically apt enemies across ages
- [ ] Ranged enemy projectiles are dodgeable (visible, slow enough to react)
- [ ] Charger telegraph is readable before the dash lands
- [ ] Unit tests for pure motion/decision logic; Playwright live-verify each archetype
- [ ] No new art required beyond reusing existing sprites/projectiles (or flag for ratification if added)

## References
- Review session 2026-06-09 (item A1)
- `src/run/enemyData.ts`, `src/scenes/RunScene.ts` (enemy update), `src/run/spawnEscalation.ts`
