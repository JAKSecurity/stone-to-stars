# RC-003: Hero evolves visually by age (Bronze/Iron gear)
**Status**: Open  **Priority**: P2  **Type**: Enhancement
**Created**: 2026-06-06
**Capability**: C3 (Content & ages)

## Summary
The art pass (C2) ships a single Stone-Age hero sprite. Plan a visual evolution of
the player hero across ages — e.g. bronze spearhead + helmet for the Bronze Age, an
iron sword + breastplate / fuller armor for the Iron Age, and beyond.

## Context
The shape-data + render-pass pipeline built in the art pass is well-suited to this:

- **SpriteDefs are pure data with role-tagged prims** (`'spear'`, `'shield'`, `'body'`,
  `'hair'`, …). So `hero_bronze` / `hero_iron` variants can share the base body and just
  swap the weapon/armor prims rather than redrawing the whole figure. A small helper
  (e.g. `withGear(baseBody, gearPrims)`) could compose variants from a shared base.
- **The run already carries age/tech into gameplay** via `RunModifiers`. `RunScene`
  keys projectile behavior off `mods.weapons.includes('bronze_spear')`. Selecting the
  player texture by current age (`hero_stone` → `hero_bronze` → `hero_iron`) is a small
  extension of that same path — register the variant textures and choose by age in
  `RunScene.create()`.
- **Off-screen too:** the civ-screen base-camp units could mirror the age-appropriate
  hero so evolution reads in both halves of the game.

Deserves its own brainstorm before implementation: how many tiers, what gear distinguishes
each age, whether the civ-screen units mirror the run hero, and whether weapon perks
(already a run concept) should drive the held-weapon sprite independently of age.

## Acceptance Criteria
- [ ] Decide tier set (which ages get a distinct hero look)
- [ ] Author `hero_<age>` SpriteDef variants reusing the base body + role-tagged gear swaps
- [ ] Select the player texture by age in the run (`RunScene`)
- [ ] (Optional) Mirror the age-appropriate hero in the civ-screen base-camp units
- [ ] Validity test + visual verification per the art-pass conventions

## References
- Art pass pipeline: `src/art/` (branch `art-pass`)
- Design spec: `docs/superpowers/specs/2026-06-06-art-pass-design.md`
- Plan: `docs/superpowers/plans/2026-06-06-art-pass.md`
- Capability C3 (Content & ages) in `docs/BACKLOG.md`
