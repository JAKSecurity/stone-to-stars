# RC-009: Juice + balance pass
**Status**: Open  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-07
**Capability**: C3 (Content & ages)

## Summary
The deferred P2 juice + balance pass, done **last** once the full Iron content set exists.
Combat juice (hit-flash, floating damage numbers, screen shake, death particles, pickup
glow), gem-collection ergonomics retune, the multi-level-up draft queue fix
(KNOWN_ISSUES #3), an explicit building picker now that the building set is larger (#4),
and a holistic balance pass (enemy HP/damage/fire-rate/spawn ramp + weapon numbers) via
playtesting.

## Acceptance Criteria
- [ ] Combat juice pass (per design spec §3): hit-flash, damage numbers, shake, death particles, pickup glow
- [ ] Gem ergonomics retune; Magnet rebalanced (KNOWN_ISSUES #2)
- [ ] `gainXp` queues `levelsGained` drafts (KNOWN_ISSUES #3)
- [ ] Explicit building picker — flat grid, all options visible (KNOWN_ISSUES #4)
- [ ] Holistic balance pass with playtesting; tests green; Playwright-verified
- [ ] Write the RC-009 implementation plan before building

## Notes (carried from RC-006 review)
- **Bullet `hitSet` allocation (perf, profile first).** `RunScene.hitEnemy` allocates a
  `Set` per bullet to dedupe hits, including for non-piercing bullets that are destroyed on
  first contact. A naive "only allocate when pierce>0" fix is WRONG: a pierce-exhausted
  bullet (pierce decremented to 0) is still alive and must keep consulting the set, or it
  will re-damage an already-hit enemy. Any optimization must preserve "one bullet never
  strikes the same enemy twice, for the bullet's whole life." Likely low-value (the Set is
  cheap next to the per-shot Phaser Image+body+delayedCall churn) — profile before changing.
- **Draft `Upgrade: <weapon>` label shows no level** — add the target level for clarity.

## References
- Spec: `docs/superpowers/specs/2026-06-06-iron-age-slice-design.md` §6
- KNOWN_ISSUES.md #2, #3, #4. Depends on RC-008 (content present). Decomposed from RC-005.
