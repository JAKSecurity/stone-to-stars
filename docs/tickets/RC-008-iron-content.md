# RC-008: Iron age content (techs / buildings / biome / enemies / weapons)
**Status**: Open  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-07
**Capability**: C3 (Content & ages)

## Summary
Author the Iron (metallurgy) content on the finished systems — all data + sprites, no
engine work. Iron techs (Iron Working [gates age], Deep Mining, Smelting, Mechanics),
buildings (Smelter, Foundry, Deep Mine), the **Deep Caverns** biome, Iron enemies (cave
dweller, rock golem, automaton, Iron Golem mini-boss), and Iron weapons + their
perk-paired evolutions (Iron Pick, War Hammer, Sawblade, Flame Jet →
Iron Lance / Ricochet Pick / War Maul / Buzzsaw / Forgefire). Sprites via the `src/art`
shape-data pipeline. **Folds in RC-003** (hero sprite reflects the Iron age).

## Acceptance Criteria
- [ ] Iron techs + buildings (data); Deep Caverns biome; Iron enemies (`enemyData`); Iron weapons + evolutions (`weaponData`)
- [ ] Sprites for new enemies/buildings/projectiles via `src/art` shape-data pipeline
- [ ] RC-003 folded in: hero sprite reflects Iron age gear
- [ ] Reachable end-to-end: research Iron Working → cross into Iron → run Deep Caverns; tests green; Playwright-verified
- [ ] Write the RC-008 implementation plan before building

## References
- Spec: `docs/superpowers/specs/2026-06-06-iron-age-slice-design.md` §4
- Depends on RC-007 (systems). Folds in RC-003. Decomposed from RC-005.
