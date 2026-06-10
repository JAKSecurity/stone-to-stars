# RC-018: Enemy behavior archetypes
**Status**: In Progress  **Priority**: P2  **Type**: Feature
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
- [x] `EnemyDef.behavior` field with `chase` default; existing data unchanged in feel
- [x] At least 3 new archetypes implemented and assigned to thematically apt enemies across ages (4: charger, splitter, circler, standoff)
- [x] Ranged enemy projectiles are dodgeable (visible, slow enough to react) — shipped rc-017; standoff now makes the threat positional
- [x] Charger telegraph is readable before the dash lands (amber tint + scale-pulse during windup)
- [x] Unit tests for pure motion/decision logic; Playwright live-verify each archetype
- [x] No new art required beyond reusing existing sprites/projectiles (or flag for ratification if added)

## References
- Review session 2026-06-09 (item A1)
- `src/run/enemyData.ts`, `src/scenes/RunScene.ts` (enemy update), `src/run/spawnEscalation.ts`

## Update — 2026-06-10 (partial delivery on rc-017, pending merge)
rc-017 shipped enemy *firing* behavior as a separate `EnemyDef.attack` field (`'ranged' | 'melee'`),
with slow dodgeable projectiles and a 10-bullet global cap. So:
- **DONE:** the `ranged` archetype's firing + "ranged projectiles are dodgeable" acceptance criterion;
  also a short-range `melee` projectile attacker (bonus) and enemy `armor`.
- **CAVEAT:** rc-017's ranged enemies still *chase* while firing — they do not yet stand off at
  distance. Movement is still all-chase.
- **REMAINING:** the movement archetypes — **charger** (telegraph + dash), **splitter** (death-split),
  **circler** (orbit) — plus optional standoff positioning for ranged. Reconcile with the proposed
  `behavior` field: `attack` (firing) and `behavior` (movement) are complementary, keep both.

## Update — 2026-06-10 (Delivered)
All four movement archetypes shipped via the pure `src/run/enemyBehavior.ts` module (mirrors
`projectileMotion.ts`) + a `behavior` dispatch in `RunScene.updateEnemyMovement`. `attack` (firing)
and `behavior` (movement) are kept orthogonal and compose (e.g. circler+ranged = strafing shooter).
Assignments: charger = centaur/halftrack; splitter = rock_golem → 2× cave_dweller; circler =
harpy/drone; standoff = scholar/musketeer/rifleman/grenadier/gunship/gargoyle/dragon. 12 unit tests
on the pure logic + 4 enemyData integrity tests; all 4 archetypes Playwright live-verified through the
real run loop (charger phase/dash-lock, circler orbit convergence, standoff 3-band, splitter
death-spawn). No new art; no save bump (optional `EnemyDef` fields). Spec + plan in
`docs/superpowers/{specs,plans}/2026-06-10-rc-018-*`.
