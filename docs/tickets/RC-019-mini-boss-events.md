# RC-019: Mini-boss arrival events
**Status**: Delivered  **Priority**: P2  **Type**: Feature
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
- [x] Apex enemy spawns once per run as an announced event, not as a random rare mob
- [x] Arrival warning + name banner + boss HP bar implemented
- [x] Kill grants a visibly distinct jackpot reward (gem burst + upgraded bumped-tier gem at 20× value)
- [x] Surviving without killing it is viable (it persists; `isBoss` spared by the zone-clear ceremony)
- [x] Spawn-table data effectively updated — boss removed from the random stream (de-trickle, option A)
- [x] Unit tests for event timing logic (`bossEvent.ts`); Playwright live-verified the full sequence

## Update — 2026-06-10 (playtest notes folded in, #10)
Two playtest requirements fold directly into this ticket's HP-bar + jackpot scope:
- **5× mini-boss HP:** the apex enemy spawns with ~5× its `baseHp` when it arrives as the announced
  event (it's a climax, not a regular mob). Apply the multiplier at boss-spawn time, not in
  `enemyData.ts` (the same id still appears — or no longer — in regular tables per the de-trickle
  criterion).
- **Upgraded-gem reward:** the guaranteed kill jackpot drops a *visibly upgraded* gem — a higher gem
  tier than the run's normal drops and/or a large-value gem (gem tiers are currently cosmetic via
  `gemTierForExpeditionTier`; the jackpot should bump the tier/value so the reward reads as special).
  Reconcile with RC-004 gem tiers and `dropGem` value logic.

## References
- Review session 2026-06-09 (item A2); 2026-06-10 playtest note #10
- `src/run/biomeData.ts` (deferred-mini-boss comments), `src/run/spawnEscalation.ts`, `src/scenes/RunScene.ts`
- `src/run/gemTier.ts`, `src/run/expedition.ts` (`apexEnemyId`), RC-004 (gem tiers)
