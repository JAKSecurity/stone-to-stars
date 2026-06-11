# RC-032: Camp scale & city growth-by-age
**Status**: Open  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-10

## Summary
Playtest feedback (2026-06-10): the base camp reads small and its unlock order (row-by-row from the
upper-left) doesn't feel like a city growing. Make buildings larger and have the city expand outward
from a small central core as the civ advances through ages.

## Context
From the 2026-06-10 playtest notes (#1, #2). Current state (per code map):
- Grid is 5×5 = 25 tiles (`GRID_SIZE = 25`, `src/game/config.ts:7-9`). Tiles unlock sequentially
  **row-major** via `tileUnlocked()` (`src/camp/camp.ts:41-42`, `tile < unlockedTileCount()`):
  `CAMP_SLOTS_BASE = 6` at Stone, `+3` per age (`CAMP_SLOTS_PER_AGE`).
- Building sprites render at 40px in grid cells (`src/ui/civScreen.ts:232`) and 32px in cards
  (`:283`, `:321`) — hard-coded, no scale setting.

## Scope
- **#1 — Buildings 2× size:** double the placed-building sprite size in the grid (40px → ~80px), and
  scale the grid/cards to match so the city reads bigger. May require resizing the `.grid`/`.cell`
  CSS (`src/style.css`) so larger sprites fit.
- **#2 — Center-out growth by age:** start with a small central core (≈4 tiles in the middle) and
  unlock additional tiles in expanding rings outward as ages advance, instead of row-major from the
  upper-left. Replace the `tile < unlockedTileCount()` ordering with a center-distance ordering.

## Open design questions
- The 5×5 grid has a single true-center tile (index 12). "4 blocks in the middle" needs a concrete
  mapping: (a) keep 5×5 and start with the center tile + 3 neighbors, ring-grow outward; (b) move to a
  6×6 grid with a true 2×2 center; or (c) keep counts, just reorder unlocks center-out. Pick one.
- Total tiles vs ages: does the full 5×5 (or 6×6) unlock by the final age? Reconcile `CAMP_SLOTS_BASE`
  / `CAMP_SLOTS_PER_AGE` with the new ring schedule.
- Existing saves place buildings by tile index — confirm a re-ordering doesn't strand a placed
  building on a now-locked tile (migration or clamp).

## Acceptance Criteria
- [ ] Placed buildings render ~2× larger; grid/cards scale so the city reads bigger and stays legible
- [ ] City starts as a small central core and grows outward in rings by age (not row-major)
- [ ] No placed building ends up on a locked tile after the ordering change (save-safe)
- [ ] Unit tests for the tile-unlock ordering (pure); visual check of the camp screen

## References
- 2026-06-10 playtest notes (#1, #2)
- `src/game/config.ts`, `src/camp/camp.ts`, `src/ui/civScreen.ts`, `src/style.css`
