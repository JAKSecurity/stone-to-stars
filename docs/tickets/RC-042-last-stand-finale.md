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

## Resolution (2026-06-12)
Delivered per spec §B2 (completes capability C4). Pure logic in `src/run/invasion.ts`
(WAVES, formationStep, mothershipPhase) + invader/mothership enemy defs & sprites; finale
rides the existing expedition pipeline via a `finale` biome flag, with RunScene finale mode
driving formation marching/dropping + the 3-phase mothership on the RC-040 attack arsenal.
No-leak guaranteed by construction + a spawnEscalation patch. Victory → dedicated victory
screen (run + lifetime stats), `lastStandWon` persisted on Continue, sandbox continues,
replayable (card subtitle flips to "VICTORY ACHIEVED — replay").

Built in 2 dispatches + a 6-finding review fix (formation floor cap so rows can't pancake
the wall; victory kills/waves stats; age-up no longer pre-announces the finale; finale
music mood; deduped boss sfx; HUD wave-tag lag). 477 vitest green.

**Playwright walkthrough (verified live):** capstone gates the card (absent→present);
finale launches (finale arena, no spawner/POIs); wave 1 drones march + drop; formation
floor cap holds (plateaus, never reaches the wall); waves advance 1→6; mothership spawns
(70k HP, isBoss, boss bar); victory screen renders rich stats; Continue persists
`lastStandWon`, increments runs, shows the 🏆 laurel; replay subtitle confirmed.

Playtest watch list (review minors, non-blocking): mothership phase-1 cadence (~4.7s single
mortars) and MOTHERSHIP_HP_MULT=2 are tuning constants; the formation has no classic
"reach-the-bottom = lose" condition (kamikaze contact resolves it instead) — by design,
revisit if it feels off in playtest.

## References
- Spec: docs/superpowers/specs/2026-06-12-c4-space-age-last-stand-design.md
- Plan: docs/superpowers/plans/2026-06-12-rc-042-last-stand.md
- Depends on: RC-041 (space age content)
