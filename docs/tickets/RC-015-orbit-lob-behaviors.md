# RC-015: Implement orbit/lob projectile behaviors
**Status**: Delivered  **Priority**: P3  **Type**: Feature
**Created**: 2026-06-07
**Capability**: C3 (Content & ages)

## Summary
`WeaponDef.behavior` declares five values (`straight | pierce | orbit | cone | lob`), but the run
firing loop in `src/scenes/RunScene.ts` only implements motion for `straight`/`pierce`/`cone`
(`cone` is just a multi-projectile fan via `count`/`spread`; `pierce` decrements a hit counter).
**`orbit` and `lob` produce no special motion** — a weapon declaring them currently flies straight
like everything else. This was found during the nightly age-expansion (RC-010..014); all new weapons
deliberately used only the three supported behaviors to stay engine-free.

Implementing these two behaviors unlocks real mechanical variety for future weapons (and lets some
existing ones be re-themed):
- **orbit** — projectiles circle the player at a radius (a classic Vampire-Survivors "King Bible"
  feel); persistent, no travel-and-despawn.
- **lob** — projectiles arc to a target point and detonate/land (grenade/mortar feel), rather than
  flying in a straight line until the 1200ms despawn.

## Acceptance Criteria
- [ ] `orbit` weapons spawn N orbiting projectiles that track the player and damage on contact
- [ ] `lob` weapons arc toward the aim/target and resolve at the landing point
- [ ] Both honor existing `WeaponDef` fields (count/speed/damage/cooldown/levelScaling) sensibly
- [ ] Unit-testable motion helpers extracted from `RunScene` where practical
- [ ] At least one weapon re-themed or added to use each new behavior; tests green; Playwright-verified

## Notes
- Pure-logic motion (angle/position over time) should live in a testable helper, not buried in the
  Phaser `update()` loop, mirroring how `expedition.ts`/`weapons.ts` keep logic out of the scene.

## References
- Found during the nightly age-expansion: `docs/NIGHTLY-REPORT-2026-06-07.md`,
  `docs/superpowers/plans/2026-06-07-nightly-age-expansion.md` (constraint #2).
- Engine: `src/scenes/RunScene.ts` `fireWeapon`/`update`; type: `src/game/types.ts` `WeaponDef.behavior`.
