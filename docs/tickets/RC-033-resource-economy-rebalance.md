# RC-033: Resource economy rebalance — science starvation
**Status**: Open  **Priority**: P2  **Type**: Balance
**Created**: 2026-06-10

## Summary
Playtest feedback (2026-06-10): the run economy can't supply enough **science** — even a player
actively optimizing for science earns **<50%** of what the tech tree needs. Rebalance the number and
types of adversaries (and/or the resource faucets) universally so each resource — science especially —
is earnable in proportion to what it's spent on.

## Context
From the 2026-06-10 playtest note #12. This is a faucet-vs-sink problem, not a one-line tweak — it
needs measurement before changes:
- **Faucets:** each enemy `drop`s exactly one resource (`EnemyDef.drop`); biome `resourceBias` skews
  the passive exploration/relic faucets and which enemies appear; scattered resource deposits
  (`biasedResource`) also bias by biome. Science-dropping enemies: scholar, automaton, harpy?, drone,
  musketeer, gunship, rifleman (the `drop: 'science'` set in `enemyData.ts`).
- **Sinks:** tech costs (`src/tech/techData.ts`, `cost.science`) per age; building costs.
- The fix likely combines: more science-dropping enemies in science-leaning biomes, a higher
  science faucet, and/or lower science tech costs — calibrated against measured demand.

## Approach (needs analysis first)
1. **Measure:** for a representative optimized run per age, tally science earnable (enemy drops at
   observed kill rates + passive faucet) vs science required to advance the tech tree that age.
   Use a script/data pass (deterministic), not eyeballing.
2. **Rebalance** the lever(s) — spawn-table composition (`drop` mix), `resourceBias`, deposit bias,
   or tech `cost.science` — to bring the earn/spend ratio to a target (≥1.0 when optimizing for it).
3. Re-measure to confirm; spot-check the other three resources didn't regress.

## Open questions
- Target ratio when *optimizing* for science (≥1.0?) vs when *not* optimizing (some deficit is fine).
- Which lever is preferred — more science enemies (changes feel) vs cheaper science techs (changes
  progression pacing)? Likely a blend.

## Acceptance Criteria
- [ ] Measured science earn-vs-spend per age documented (before/after)
- [ ] Optimizing for science yields ≥ ~100% of that age's science need; other resources not starved
- [ ] Change is data-driven (spawn tables / resourceBias / tech costs), no engine changes
- [ ] Unit tests for any new pure calc; Playwright/data spot-check

## References
- 2026-06-10 playtest note #12
- `src/run/enemyData.ts` (drops), `src/run/biomeData.ts` (resourceBias/spawn tables),
  `src/tech/techData.ts` (science costs), `src/scenes/RunScene.ts` (`biasedResource`, faucets)
- Related: RC-009 (balance), RC-017 (economy curve)
