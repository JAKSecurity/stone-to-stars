# RC-026: In-run point-of-interest events
**Status**: Open  **Priority**: P3  **Type**: Feature
**Created**: 2026-06-09

## Summary
Runs are spatially aimless — kiting in circles is optimal. Add 1–2 optional points of interest per
run that reward going somewhere: a relic shrine that trades a burst wave for bonus culture, and a
fleeing treasure courier that drops a jackpot if caught.

## Context
From the 2026-06-09 review (item A5). Builds on rc-017's scattered resource deposits (the first
"reason to move"). Proposed events:
- **Relic shrine** — a marked structure; activating it (walk over / brief channel) spawns a burst
  wave of enemies and pays out a culture jackpot when cleared. Risk/reward positioning decision.
- **Treasure courier** — a rare enemy that flees the player instead of chasing; despawns after a
  while; drops a large mixed-gem jackpot if killed. (Vampire Survivors' treasure-goblin pattern.)

Both should be visible on-screen or signaled at screen edge so the player can choose to engage.
Event types should be data-driven enough that more can be added per-biome later.

**Sequencing:** after rc-017 merges; courier benefits from RC-018's behavior dispatch (flee = an archetype).

## Acceptance Criteria
- [ ] At most 1–2 POI events per run; both event types implemented
- [ ] Events are opt-in (ignoring them is always viable) and signaled when off-screen
- [ ] Shrine wave + payout and courier flee + jackpot work end-to-end
- [ ] Unit tests for event scheduling/payout logic; Playwright live-verify both events

## References
- Review session 2026-06-09 (item A5)
- `src/scenes/RunScene.ts`, `src/run/spawnEscalation.ts`, RC-018 (flee behavior)
