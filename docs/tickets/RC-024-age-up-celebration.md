# RC-024: Age-up celebration moment
**Status**: Open  **Priority**: P2  **Type**: Enhancement
**Created**: 2026-06-09

## Summary
Crossing an age — the game's core fantasy — currently changes a corner label. Add a one-shot
celebration when a gating tech completes: full-width banner with the new age name, the hero's new
look, and everything it unlocked.

## Context
From the 2026-06-09 review (item C4). Shape:
- Triggered when research advances the age (gating tech completes)
- Full-width banner/overlay-free section at the top of the civ screen (per `jeff-ui-design`,
  prefer inline insertion over a modal that covers content): new age name, old→new hero sprite
  side by side, and an inline list of what just unlocked — new biome, new draftable weapons,
  newly researchable techs/buildings
- Dismissible; never blocks interaction; shown once per age (persist a seen-flag or derive from state)
- Smaller "research complete" toast for non-gating techs (one line, auto-fade)
- Age-up fanfare SFX hooks in when RC-020 lands

## Acceptance Criteria
- [ ] Gating-tech completion shows the celebration with age name, hero evolution, and unlock list
- [ ] Rendered inline (no modal covering the civ screen); dismissible; shows once per age
- [ ] Non-gating research completion gets a lightweight toast
- [ ] All unlock info is accurate (derived from data, not hand-written strings)
- [ ] Unit tests for the unlock-diff helper; Playwright verify the Stone→Bronze moment

## References
- Review session 2026-06-09 (item C4)
- `src/tech/tech.ts` (`getAge`/research), `src/ui/civScreen.ts`, `src/game/heroByAge.ts`
