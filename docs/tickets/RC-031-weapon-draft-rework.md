# RC-031: In-run weapon & draft rework (single weapon)
**Status**: Open  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-10

## Summary
Playtest feedback (2026-06-10): the dual-weapon loadout and weapon-swap drafting dilute build
identity. Move to a single-weapon run with a draft that never offers a *weaker* weapon than the one
you hold, so leveling/evolving your chosen weapon is always the meaningful choice.

## Context
From the 2026-06-10 playtest notes (#7, #4). Current state (per code map):
- `MAX_WEAPON_SLOTS = 2` (`src/run/weapons.ts:9`) with a 1-melee + 1-ranged split (`MELEE_IDS`,
  `addWeapon` swap logic ~`:40-44`). `initialWeapons()` returns one weapon (default club).
- The level-up draft (`src/run/draft.ts`, `rollRunDraft`/`draftOptions`) offers `newWeapon`,
  `levelWeapon`, and `evolve` options. A `newWeapon` of an occupied class swaps the existing weapon.
- There are **no negative/downgrade perks** — note #4 refers to the draft offering a *new/weaker
  weapon* that replaces your leveled one. With a single slot, that swap is a strict downgrade.

## Scope
- **#7 — One weapon at a time:** drop to a single weapon slot (`MAX_WEAPON_SLOTS = 1`), remove the
  melee/ranged split. The run starts with the chosen starting weapon and keeps it (level/evolve only).
- **#4 — No weaker-weapon offers:** the draft must never offer a weapon that is lower-tier/weaker than
  the currently held weapon. Define "weaker" concretely (e.g. tier index < held weapon's tier, or a
  computed power score). Keep evolutions and level-ups of the held weapon.

## Open design questions
- Does the draft still offer *side-grade* swaps (a different same-or-higher-tier weapon), or only
  level/evolve the one you have? If swaps are allowed, swapping a leveled weapon for a fresh L1 one is
  itself a downgrade — likely they should be disallowed or carry over levels.
- What's the "weaker" comparator — `AGE_ORDER` tier of the weapon's `tier` field, or a power score
  from damage×count/cooldown?
- Interaction with RC-027 starting-weapon choice and the evolve path (`evolvesTo`/`evolveRequiresPerk`).

## Acceptance Criteria
- [ ] Single weapon slot; no melee/ranged dual-wield; run keeps its starting/evolved weapon
- [ ] Draft never offers a weapon weaker than the one currently held
- [ ] Evolutions and level-ups of the held weapon still offered
- [ ] Unit tests for the draft-filtering logic (pure); Playwright live-verify the draft never shows a downgrade

## References
- 2026-06-10 playtest notes (#4, #7)
- `src/run/weapons.ts`, `src/run/draft.ts`, `src/scenes/RunScene.ts` (equipped loadout)
- Related: RC-025 (perk pool — #6 pierce perk lands there), RC-027 (starting-weapon choice)
