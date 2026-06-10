# RC-019: Mini-boss arrival events
**Status**: Open  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-09

## Summary
Every biome already designates an apex enemy (cyclops, dragon, mecha, juggernaut…), but it spawns
silently as a rare weight-1 mob. Make it an announced event that gives every run a climax: timed
arrival, name banner, HP bar, jackpot reward on kill.

## Context
From the 2026-06-09 review (item A2). `biomeData.ts` comments already note "proper mini-boss wave
timing (announce, scaling, boss room) deferred" on all 7 biomes — this is that ticket. Proposed shape:
- Remove the apex enemy from the regular spawn table; spawn it once at a fixed point in the run
  (~70% elapsed), with an edge-of-screen warning indicator and a name banner ("⚔ Cyclops approaches")
- On-screen HP bar while it lives (top-center or above the sprite)
- Guaranteed jackpot on kill: large gem burst (and a healing pickup once RC-025 lands)
- Optional escalation hook: killing it quickly could up the late-run spawn intensity bonus

Pairs naturally with RC-018 (archetypes could give bosses a special move) but does not depend on it.

**Sequencing:** after rc-017 merges (spawn timing and escalation live there).

## Acceptance Criteria
- [ ] Apex enemy spawns once per run as an announced event, not as a random rare mob
- [ ] Arrival warning + name banner + boss HP bar implemented
- [ ] Kill grants a visibly distinct jackpot reward
- [ ] Surviving without killing it is viable (it persists; no enrage requirement)
- [ ] Spawn-table data updated so the apex no longer trickles in randomly
- [ ] Unit tests for event timing logic; Playwright live-verify the full sequence

## References
- Review session 2026-06-09 (item A2)
- `src/run/biomeData.ts` (deferred-mini-boss comments), `src/run/spawnEscalation.ts`, `src/scenes/RunScene.ts`
