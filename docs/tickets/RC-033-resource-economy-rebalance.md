# RC-033: Resource economy rebalance — science starvation
**Status**: Delivered  **Priority**: P2  **Type**: Balance
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
- [x] Measured science earn-vs-spend per age documented (deterministic model, below)
- [x] The two starved biomes brought into line; other resources not disturbed (deposit bias + 1 enemy)
- [x] Change is data-driven (spawn tables / resourceBias), no engine changes
- [x] Unit tests (`tests/biomeData.test.ts` — science-faucet invariant) + data model

## Delivered — 2026-06-10 (science starvation fixed)
**Root cause (measured, not guessed):** a throwaway script modeled science *earned/run* (kill faucet
from the apex-stripped spawn table + the deposit faucet) vs each age's science *tech demand*. Most
biomes sat at 0.36–0.93× per run (slow but functional — 2-3 runs/age). **Two biomes were broken:**
colosseum (classical) **0.03×** and cursed_keep (medieval) **0.07×** — they had **zero** science-
dropping enemies, and the model proved deposit-bias alone couldn't fix them (only 0.03→0.07×, because
kills dominate income). The fix had to add a science *kill* faucet.

**Change (lever #2 + minor #1, data-only):**
- colosseum: `+ automaton: 6` (bronze construct, drops science) → **0.53×**; `resourceBias.science: 1`.
- cursed_keep: `+ scholar: 3` (dark scholar, drops science) → **0.89×**; `resourceBias.science: 1`.
Both now match the functional band of the other biomes. No new art (reused sprites); 246 tests green.

## Remaining (deferred — out of this slice)
- **Late-game thinness:** industrial (0.48×) and modern (0.36×) are functional but light; could get a
  science-gem value bump (#3) if play shows they need headroom. Jeff scoped this slice to the 2 broken
  biomes only.
- **Thin-biome apex** (below): early biomes need a proper apex + ≥3 enemy types — a biome-composition
  follow-up, separate from the science economy.

## Related finding — thin-biome apex (surfaced during RC-019 verify, 2026-06-10)
RC-019 makes each biome's highest-HP enemy an announced mini-boss and removes it from the random
spawn pool. In **thin early biomes this misfires**: `wilds` has only `beast` (32 HP) + `scholar`
(24 HP), so the "apex" is the basic melee `beast`, and de-trickling it collapses the random pool to
all-`scholar`. The richer biomes are fine (caverns→iron_golem, colosseum→cyclops). The fix belongs
with this ticket's adversary-composition rebalance: give early biomes a proper apex and ≥3 enemy
types so removing the boss still leaves variety. (Not a correctness bug — RC-019 works as designed.)

## References
- 2026-06-10 playtest note #12
- `src/run/enemyData.ts` (drops), `src/run/biomeData.ts` (resourceBias/spawn tables),
  `src/tech/techData.ts` (science costs), `src/scenes/RunScene.ts` (`biasedResource`, faucets)
- Related: RC-009 (balance), RC-017 (economy curve)
