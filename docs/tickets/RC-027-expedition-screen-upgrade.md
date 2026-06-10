# RC-027: Expedition screen upgrade + starting-weapon choice
**Status**: Open  **Priority**: P3  **Type**: Enhancement
**Created**: 2026-06-09

## Summary
The expedition picker is raw text cards in a mostly empty screen. Make it the information-dense
run-planning surface it should be — enemy sprite thumbnails, biome swatch, apex callout, personal
bests — and add a starting-weapon choice so each run begins with build intent.

## Context
From the 2026-06-09 review (items C6, A6). Per `jeff-ui-design`, this is a decision screen and
deserves maximum inline information.

**Richer cards (C6):**
- Enemy sprite thumbnails via the existing DOM-canvas sprite pipeline (`src/art/domSprite.ts`)
  instead of comma-separated raw names; apex enemy called out ("Apex: Cyclops")
- Biome color swatch / mini tile reflecting its visual identity (pairs with RC-021)
- Reward multiplier (exists) + a relative danger cue (e.g. enemy contact/HP tier dots)
- Personal best haul on that biome (needs per-biome stats in the save; pairs with RC-023's record strip)

**Starting-weapon choice (A6):**
- A flat grid of all unlocked weapons on the same screen (no dropdown); pick one to start with
  instead of always Club + building grants; selection persists as the default for the next run
- Shows each weapon's sprite + one-line stats (same formatter as RC-022 draft cards)

## Acceptance Criteria
- [ ] Expedition cards show enemy thumbnails, apex callout, biome swatch, reward, and best haul
- [ ] All unlocked weapons visible simultaneously; one-click starting-weapon selection, persisted
- [ ] Run actually starts with the chosen weapon; civ weapon grants unchanged
- [ ] Save schema addition for per-biome bests is versioned/migrated safely
- [ ] Unit tests for pure helpers; Playwright visual verify

## References
- Review session 2026-06-09 (items C6, A6)
- `src/ui/expeditionScreen.ts`, `src/run/expedition.ts`, `src/run/weapons.ts`, `src/art/domSprite.ts`
