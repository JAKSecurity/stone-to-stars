# RC-034: Procedural dungeon expeditions — explore & clear (Diablo-scale)
**Status**: Delivered  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-11

## Summary
Replace the single-screen survival arena with a procedurally generated explorable
map several screens in size. Enemies are placed on the map at generation time
instead of trickle-spawning at screen edges, and the objective changes from
"survive X minutes" to "clear the dungeon." Diablo's *scale*, not its maze
density: mostly open areas, hard perimeter walls so the edge is legible, and a
few procedurally generated chokepoints (a river crossable only at a bridge, a
gate that must be opened).

## Context — feasibility assessment (2026-06-11)

The codebase is better positioned for this than expected. Findings from a full
architecture sweep of `src/scenes/RunScene.ts` and the run subsystems:

**Cheap (Phaser does the heavy lifting):**
- Camera follow + large world is near-free: `physics.world.setBounds()` is
  independent of the viewport; `cameras.main.startFollow(player)` is the whole
  camera change. The boss HP bar already uses `setScrollFactor(0)`, the exact
  pattern the rest of the HUD needs under a scrolling camera.
- The single-screen assumption is shallow — ~4 hardcoded spots in RunScene:
  world bounds (≈line 152), edge-based enemy spawn picks (≈542–544), gem faucet
  positions (≈319/327), end-of-run vacuum radius (≈407).
- Layout-agnostic and fully reusable: biome system (`src/run/biomeData.ts` —
  visual identity + spawn tables slot straight into a generator), spawn
  escalation (`src/run/spawnEscalation.ts`), mini-boss events (RC-019), enemy
  behavior archetypes (RC-018), draft/perk flow, RunResult → civ rewards.
- Performance improves: enemies spread across a large map means fewer active
  on screen than the current late-run 150 ms spawn trickle. Arcade physics with
  static wall colliders scales fine at these counts.

**The two real costs:**
1. **The generator.** The desired shape (open field + perimeter + 1–3 dividing
   features) is the easy end of procgen — no BSP/maze needed. Approach: walled
   perimeter → carve a river/wall band across the space → punch a bridge/gate
   gap → reuse the existing biome obstacle scatter for the rest. Add a seeded
   RNG (current scatter uses unseeded `Phaser.Math.Between`) so layouts are
   reproducible for debugging.
2. **Pathfinding — the one genuine pain point.** Enemies beeline
   (`physics.moveToObject`) and do not avoid obstacles; against a river they
   pile up on the far bank and look broken. Mitigations, cheapest first:
   (a) Diablo-style sleep/aggro radius — placed enemies idle until the player
   is near, so most never need to path across the map; (b) waypoint steering
   toward the nearest bridge/gate when the direct line crosses a barrier;
   full A* is overkill for mostly-open maps.

**Design wins:** clear-the-dungeon fixes the survival-timer pacing problem
(standing still is currently optimal; exploration makes movement the point),
gives the exploration resource thematic teeth, and chokepoints make natural
mini-boss arenas (bridge guardian) for the RC-019 system.

## Proposed slices
1. **Core**: large world + camera follow + HUD scrollFactor pass + placed-at-gen
   enemies with aggro radius + clear-condition (all enemies dead) reusing the
   Zone Cleared ceremony. Keep simple open map with current obstacle scatter.
2. **Generator**: seeded RNG, perimeter walls, river/gate chokepoint features,
   biome-themed barriers; bridge-aware enemy steering.
3. **Polish (optional)**: minimap or edge-of-screen objective hints, fog of
   war, gate-opening interaction, per-biome chokepoint flavor.

## Acceptance Criteria
- [x] Run map is meaningfully larger than one screen (several screens each axis) with camera following the hero
- [x] Hard perimeter walls — player can see and feel the dungeon edge
- [x] Enemies placed at generation time (biome spawn tables), idle until aggro'd; no edge trickle-spawning
- [x] Win condition is clearing the dungeon (timer removed or demoted to a stat); existing ceremony + reward flow preserved
- [x] At least two chokepoint feature types generate (e.g., river+bridge, gate), seeded and reproducible
- [x] Enemies do not visibly pile up against barriers (aggro gating and/or chokepoint steering)
- [x] HUD/draft/boss UI all render correctly under the scrolling camera
- [x] Existing vitest suite green; new generator logic unit-tested (seeded determinism, connectivity: every region reachable)

## Resolution (2026-06-11)
Slices 1+2 delivered (core world/camera/clear-condition + generator with
chokepoints + steering); slice 3 (minimap, fog of war, gate-opening
interaction) remains covered by Proposed Slices above for a future pass.

Implemented via plan `docs/superpowers/plans/2026-06-11-rc-034-dungeon-expeditions.md`
(subagent-driven, two-stage review per task). New pure modules: `src/run/rng.ts`
(seeded mulberry32), `src/run/dungeonGen.ts` (layout + routeAround steering),
`src/run/dungeonPopulate.ts` (depth-escalated enemy roster + faucet-parity gem
deposits). 272 vitest green (26 new tests incl. flood-fill connectivity over
10 seeds). Live Playwright walkthrough verified camera/walls/aggro/chokepoint
routing/draft clicks under scrolled camera/boss aggro/full-clear ceremony/
banking and death path, and caught two real bugs fixed in `320e78b`:
ENEMY_SAFE_RADIUS had to exceed AGGRO_RADIUS (idle player died at spawn), and
Phaser 3.90's Container.setScrollFactor does not stamp children for input
hit-testing (draft cards were unclickable under a scrolled camera).

Follow-up spun off: RC-035 (boss contact-kill skips the jackpot).

## References
- Architecture sweep: this ticket's Context section (RunScene.ts, spawnEscalation.ts, enemyBehavior.ts, biomeData.ts)
- RC-019 mini-boss events (chokepoint guardian hook), RC-021 biome visual identity (themed barriers), RC-026 POI events (natural fit for exploration mode)
