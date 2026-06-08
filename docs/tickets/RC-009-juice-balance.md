# RC-009: Juice + balance pass
**Status**: In Progress  **Priority**: P2  **Type**: Feature
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

## Progress
- **Slice 1 — combat juice + draft-queue: SHIPPED 2026-06-07** (commit on rc-009-juice, merged to
  main). All 5 juice effects in `src/scenes/RunScene.ts` (hit-flash on enemy hit; floating damage
  numbers; camera shake on player hit + big-enemy death; radial death particles; gem pulse glow) +
  the **multi-level-up draft-queue fix** (KNOWN_ISSUES #3 — `gainXp` now enqueues one draft per
  level via `pendingDrafts`; `openDraft` drains the queue, shows "(+N more)", resumes only when
  empty). 4 new `runStats` level-counting tests (116 total). Intensities are first-pass and meant
  to be **tuned by feel** (see notes left in the commit: flash 60ms, player shake 0.008, big-death
  shake 0.012, damage-number 450ms/22px, gem pulse 15%).
- **Remaining slices (next session):**
  1. **Explicit building picker** (KNOWN_ISSUES #4) — the camp is now ~21 buildings across 8 ages;
     the empty-cell click currently auto-builds the *first* unlocked-unbuilt building in catalog
     order (can't choose). Replace with a flat-grid picker showing all buildable options
     (use the `jeff-ui-design` skill — max simultaneous visibility, flat grid).
  2. **Holistic balance pass** across all 8 ages — enemy HP/damage/speed vs `tierScaling`, weapon
     numbers, spawn ramp. Needs **Jeff's playtest feel**; first-pass content numbers are placeholders.
  3. **Gem ergonomics / Magnet retune** (KNOWN_ISSUES #2).
  4. (Optional) tune the slice-1 juice intensities once Jeff has played them.

## References
- Spec: `docs/superpowers/specs/2026-06-06-iron-age-slice-design.md` §6
- KNOWN_ISSUES.md #2, #3, #4. Depends on RC-008 (content present). Decomposed from RC-005.
