# RC-041: Space age content (techs/buildings/weapon/hero)
**Status**: Open  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-12

## Summary
Add the 9th "Space" age — closing C3's "Iron→Space" remit and gating C4's finale:
`AGE_ORDER` gains `'space'`; 4 techs (Rocketry gates the age, Computers, Satellites,
Planetary Defense capstone), 2 buildings (Launch Pad, Mission Control), 1 weapon
(Laser Array), and a `hero_space` sprite.

## Context
Ratified design: `docs/superpowers/specs/2026-06-12-c4-space-age-last-stand-design.md`
(§B1). Planetary Defense's only payoff is unlocking The Last Stand (RC-042). A sweep of
age-keyed maps/switches is required so the 9th age has real entries (hero, music,
biome-by-age fallbacks).

## Acceptance Criteria
- [ ] `'space'` in AgeId/AGE_ORDER; all age-index-derived systems (tech costs, tiers,
      camp slots, gem tiers, enemy damage scaling) behave at index 8
- [ ] 4 techs + 2 buildings + laser_array weapon per spec table, data-driven
- [ ] hero_space sprite appended to HERO_SPRITE_BY_AGE (art ratification at playtest)
- [ ] Unit tests: data invariants, age sweep; full suite green

## References
- Spec: docs/superpowers/specs/2026-06-12-c4-space-age-last-stand-design.md
- C3 (Content & ages) capability
