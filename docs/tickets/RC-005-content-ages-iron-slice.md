# RC-005: Scope + plan the next age (Iron) content slice
**Status**: Delivered  **Priority**: P1  **Type**: Feature
**Created**: 2026-06-06  **Resolved**: 2026-06-07
**Capability**: C3 (Content & ages)

## Resolution (2026-06-07)
Brainstormed with Jeff (five ratified anchors: systems+content · multi-weapon civ-gated
pool w/ evolutions · pick-an-expedition-per-run · biomes w/ resource bias · Iron =
metallurgy). Wrote the design spec
(`docs/superpowers/specs/2026-06-06-iron-age-slice-design.md`), a build-ready RC-006
implementation plan (`docs/superpowers/plans/2026-06-06-rc006-data-driven-weapons.md`),
and decomposed the slice into C3 tickets **RC-006** (data-driven weapons),
**RC-007** (enemy/biome/expedition systems), **RC-008** (Iron content; folds in RC-003),
**RC-009** (juice + balance). Building proceeds in those tickets; RC-007–009 each get
their own plan when they become active.

## Summary
First concrete step toward C3 (Content & ages). With the P0/P1 slice and the art pass both
shipped, the next thrust is depth: a new age beyond Bronze (Iron) with its own techs,
buildings, enemies, and weapon evolutions — folded together with the deferred P2 juice/balance
pass so the expanded game *feels* good. This ticket covers the **brainstorm + plan**; building
happens in follow-on tickets created from the plan.

## Context
- Current game: Stone→Bronze, 4 resources, ~6 techs, 3 buildings (granary/mine/forge), 2 enemy
  types (beast/scholar), club→bronze_spear weapon. Full loop verified; art pass complete.
- C3 in `docs/BACKLOG.md` is the planned capability: "Iron→Space ages, more
  techs/buildings/enemies, weapon evolutions, juice + balance."
- Design direction (which ages, what content, the progression vision) is **Jeff's creative
  call** — start with `superpowers:brainstorming`, not implementation.
- The art pipeline (`src/art/`) already supports new sprites cheaply (shape-data + render-pass),
  and RC-003 (hero age-evolution) / RC-004 (D2 gems) are queued art enhancements that may ride
  along with the new age content.

## Acceptance Criteria
- [x] Brainstorm the next-age slice with Jeff: scope (Iron only vs further), new
      techs/buildings/enemies, weapon evolutions, and the P2 balance/juice items to fold in
- [x] Write an implementation plan in `docs/superpowers/plans/` (superpowers:writing-plans)
      — RC-006 build-ready; RC-007–009 planned JIT
- [x] Decompose into follow-on BACKLOG tickets under C3 (RC-006..RC-009)
- [ ] (Then build via subagent-driven-development in those tickets) — handled in RC-006+

## References
- Capability C3 in `docs/BACKLOG.md`
- Design spec: `docs/superpowers/specs/2026-06-05-rogue-civ-design.md`
- Deferred balance/feel: `docs/KNOWN_ISSUES.md` (#2 P2, #3 #4 minor)
- Art pipeline: `src/art/` ; queued art tickets RC-003, RC-004
