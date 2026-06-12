# RC-042: The Last Stand finale (invasion run + victory)
**Status**: Open  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-12

## Summary
The C4 endgame: once Planetary Defense (RC-041) is researched, a dramatic expedition
card launches a fixed-arena finale — alien invaders in marching/dropping formation
waves (space-invaders homage), capped by a screen-wide multi-phase mothership boss.
Victory shows a dedicated victory screen, sets a persistent `lastStandWon` save flag,
and the sandbox continues (replayable). Defeat uses the normal death/banking flow.

## Context
Ratified design: `docs/superpowers/specs/2026-06-12-c4-space-age-last-stand-design.md`
(§B2). New pure module `src/run/invasion.ts` (wave data + formation step math), new
invader enemy defs + sprites (ratification at playtest), mothership phases on the
RC-040 attack-profile arsenal. No mutators/wagers on the finale card.

## Acceptance Criteria
- [ ] Finale card appears on the expedition screen only when Planetary Defense is researched
- [ ] 5 formation waves march/drop/reverse; clearing all members advances waves
- [ ] Mothership boss with 3 HP-third phases; defeat = normal banking; victory = fanfare,
      victory screen (run + lifetime stats), `lastStandWon` persisted, sandbox continues
- [ ] Invader defs never appear in regular expedition spawn pools
- [ ] Unit tests (wave data, formation math, phase thresholds, applyRunResult flag) +
      Playwright walkthrough of unlock → waves → victory and the defeat path

## References
- Spec: docs/superpowers/specs/2026-06-12-c4-space-age-last-stand-design.md
- Depends on: RC-041 (space age content)
