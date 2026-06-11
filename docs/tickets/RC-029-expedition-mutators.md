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

## Resolution
**Delivered 2026-06-11** as Phase A of the combined RC-026 + RC-029 build.

### What shipped
Four stackable pre-run mutators, surfaced as flat toggle chips on every expedition card (no
separate config screen, per `jeff-ui-design`). Selection is ephemeral (resets every render). The
calibration principle (Jeff, 2026-06-11): **the reward bonus is HALF the risk magnitude**, and
bonuses stack **additively**.

| Mutator | Effect | Reward bonus |
|---|---|---|
| 🌙 Night Raid | Enemies +50% speed | +25% |
| 👥 Horde | +50% placed enemies | +25% |
| 💔 Frail | Your max HP −40% | +20% |
| 🛡️ Ironclad | Enemies +1 armor | +20% |

A live total badge on the card shows the additive multiplier (`×1.25` etc.); the active mutators
echo on the run HUD (icons + multiplier) and the end screen ("Wagers honored: … — haul ×N"). The
haul multiplier is applied per-resource to the collected bundle on finish.

### Architecture
Pure stack math in `src/run/mutatorData.ts` (the 4 MutatorDefs) and `src/run/mutators.ts`
(`combineMutators`, `applyHaulMult`). RunScene applies effects through existing seams: Frail at
`init()` before the baseStats snapshot; Night Raid / Ironclad at `spawnEnemyAt` (so they also cover
shrine-wave enemies and splitter children); Horde scales only the PLACED roster count
(`enemyPlacements`). No save bump (mutator selection is per-launch, not persisted).

### Spec / plan
- Spec: `docs/superpowers/specs/2026-06-11-rc026-rc029-wagers-and-pois-design.md`
- Plan: `docs/superpowers/plans/2026-06-11-rc026-rc029-wagers-and-pois.md` (Tasks 1–4)

### Design note — POI count exemption
Horde's `enemyCountMult` scales the placed roster only. POI shrine waves stay `6 + 2×tier` and the
courier stays single — verified live (Horde ON, seed 2: placed roster 27 → 40, shrine wave still 6,
courier still 1). Night Raid / Ironclad DO intentionally apply to shrine-wave enemies and splitter
children (they flow through `spawnEnemyAt`); only the COUNT is POI-exempt.

### Live verification
Stacking math covered by `tests/mutators.test.ts`; the run wiring (effects, haul mult, HUD + end-
screen echo, chip toggles) was verified live in Phase A (Task 4) and re-confirmed during Phase B's
Horde-interplay probe. Card chips render with correct labels + `desc` tooltips; total badge tracks
the additive multiplier. Build + 353 tests green.
