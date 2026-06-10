# RC-021: Biome visual identity
**Status**: Delivered  **Priority**: P2  **Type**: Enhancement
**Created**: 2026-06-09

## Summary
In play every biome looks like near-black empty space — the tint barely registers and obstacles are
dark ellipses. Give each of the 8 biomes a distinct ground palette and themed obstacle sprites so
expeditions feel like places (colosseum pillars, cavern stalagmites, trench sandbags…).

## Context
From the 2026-06-09 review (item B1) — the 8 biomes are the most under-expressed art surface in the
game. rc-017 added the procedural background (grid + specks) and collidable boulder ellipses; this
ticket builds on that:
- Per-biome background palette (ground color, grid/speck tints) driven from `BiomeDef`
- Themed obstacle sprites via the existing `src/art` shape-data pipeline, replacing the generic
  dark ellipses (e.g. Wilds: trees/rocks; Deep Caverns: stalagmites; Sunken Colosseum: broken
  pillars; Plague City: ruined walls; Foundry Wastes: slag heaps; No Man's Land: sandbags/wire)
- Optional cheap depth: a subtle vignette or two-tone ground patches

**Art-ratification gate:** new sprites require Jeff's sign-off before merge (house rule).
**Sequencing:** after rc-017 merges (background/obstacle code lives there).

## Acceptance Criteria
- [x] `BiomeDef` carries visual identity data (palette + obstacle sprite set) — `BiomeVisual`
- [x] All 9 biomes visually distinguishable at a glance in Playwright screenshots (9 not 8 — Modern's
      `no_mans_land` was added after the ticket); verified Stone→Iron→Modern render starkly distinct
- [x] Obstacles keep identical collision behavior (visual change only — body code byte-identical)
- [x] Sprite defs validated via `validateSpriteDef`; unit tests for new helpers
- [x] Jeff ratifies the art before merge

## Delivery — 2026-06-10
Art half merged to main (a785bcc): `BiomeVisual` field, all 9 biomes' palettes, 18 obstacle sprites
(`src/art/sprites/obstacles.ts`), preview harness, tests. RunScene integration (this branch):
palette-driven `drawBackground` + sprite-based `scatterObstacles` (collision body unchanged), per
`docs/RC-021-runscene-integration.md`. tsc + 173 vitest + build green; 9-biome Playwright sweep
confirmed distinct visuals with intact collision.

## References
- Review session 2026-06-09 (item B1)
- `src/run/biomeData.ts`, `src/scenes/RunScene.ts` (background/obstacles), `src/art/`
