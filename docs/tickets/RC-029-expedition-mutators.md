# RC-029: Expedition mutators (risk/reward modifiers)
**Status**: Open  **Priority**: P3  **Type**: Feature
**Created**: 2026-06-09

## Summary
Optional risk toggles on expedition cards for replay variety — e.g. "Night raid: enemies +50%
speed, reward ×1.5" — chosen before a run starts.

## Context
From the 2026-06-09 review (item D2), explicitly deferred until after the rc-017 balance feel
lands (mutators multiply on top of the per-age difficulty step, so the base must be stable first).
Shape:
- A small data-driven mutator catalog (enemy speed/HP/spawn-rate up, player HP down, darkness?,
  no-magnet…), each with a reward multiplier
- Surfaced as visible toggles on each expedition card (per `jeff-ui-design`: not a separate
  config screen); chosen mutators echoed in the run HUD and the end screen
- Start with 3–5 mutators; per-biome or per-age gating optional later

**Sequencing:** post-RC-017 merge + balance ratification. Pairs well with RC-027's card upgrade.

## Acceptance Criteria
- [ ] Mutator catalog data-driven; 3–5 mutators at launch
- [ ] Toggleable per-expedition on the picker; effects + reward multiplier shown inline
- [ ] Mutator effects applied in-run; reward multiplier applied to the haul; echoed on end screen
- [ ] Unit tests for stacking math; Playwright verify a mutated run end-to-end

## References
- Review session 2026-06-09 (item D2)
- `src/ui/expeditionScreen.ts`, `src/run/expedition.ts`, `src/game/economy.ts`
