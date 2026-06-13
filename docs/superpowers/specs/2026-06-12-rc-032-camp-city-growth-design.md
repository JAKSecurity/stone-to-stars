# RC-032: Camp Scale & City Growth-by-Age

**Date:** 2026-06-12
**Ticket:** RC-032 (camp scale & city growth)
**Status:** Design ratified with Jeff 2026-06-12.

## Decisions (ratified)

1. **Grid shape:** keep 5×5 (25 tiles); unlock order becomes center-out rings.
2. **Sizing:** 2× building sprites AND an age-grown footprint — locked tiles render as
   faint terrain so the city visibly expands outward.
3. **Save migration:** remap placed buildings by unlock order on load (no version bump).

## 1. Center-out tile unlock order

- New pure export in `src/camp/camp.ts`: `TILE_UNLOCK_ORDER: number[]` — all 25 tile
  indices, sorted by Euclidean distance from the center tile (index 12, grid (2,2)),
  with a deterministic tiebreak (ascending tile index). Euclidean distance puts the 4
  orthogonal neighbors (dist 1) before diagonals (√2), so the Stone-age 6 slots =
  center + 4 orthogonals + 1 diagonal — a tight core.
- `tileUnlocked(civ, tile)` becomes: `TILE_UNLOCK_ORDER.indexOf(tile) < unlockedTileCount(civ)`.
  (Precompute an index→rank lookup; no per-call indexOf.)
- `unlockedTileCount` / `CAMP_SLOTS_BASE` (6) / `CAMP_SLOTS_PER_AGE` (3) are unchanged —
  the schedule still reaches all 25 by Modern. (A future 9th age changes nothing: the
  count caps at GRID_SIZE.)
- `firstEmptyTile` returns the first empty tile **in unlock order** (so auto-placement
  fills the core first).

## 2. Visual scale + age-grown footprint

- Placed building sprites in grid cells: 40px → **80px** (`src/ui/civScreen.ts`).
  Build-card / upgrade-card sprites: 32px → 48px (cards must not balloon the panel).
- `.grid` / `.cell` CSS (`src/style.css`): cells sized to fit 80px sprites (~84px), grid
  gap tuned so the full 5×5 stays legible inside the camp panel without scrolling.
  Keep the 3-column civ-screen layout intact (jeff-ui-design: maximum simultaneous
  visibility — nothing may become hidden behind a scroll or accordion).
- **Locked tiles = faint terrain:** locked cells render with no border and a very
  low-opacity terrain tint (not the current hard "locked" look), so the unlocked core
  reads as a settlement surrounded by wilderness. As ages advance, rings "clear" into
  normal buildable cells. Unlocked-but-empty cells keep a visible (buildable) affordance.
- The age-up celebration already re-renders the civ screen; no extra animation work
  (ring reveal animation is YAGNI).

## 3. Save migration — remap by unlock order

- New pure function in `src/camp/camp.ts`:
  `remapCampTiles(civ: CivState): CivState` — sort placed buildings by the **unlock
  rank of their current tile** (every tile has a well-defined rank in
  `TILE_UNLOCK_ORDER`), then assign the nth building to `TILE_UNLOCK_ORDER[n]`.
  Returns the same reference when no building moves (cheap no-op for already-migrated
  saves).
- Applied once at load in `src/main.ts` (`load() ?? newCivState()` → wrap with
  `remapCampTiles`). Idempotent by construction: a migrated layout occupies ranks
  0..n−1, so sorting by rank assigns every building back to its own tile. (Sorting by
  the legacy ascending-tile-index order instead would NOT be idempotent — unlock-order
  tiles aren't index-ascending, so a second pass would shuffle the core.)
- Invariant guaranteed: after remap, every placed building sits on an unlocked tile
  (placement count never exceeds `unlockedTileCount`, because builds were gated on
  unlocked tiles under the old ordering and the count formula is unchanged).
- No save version bump.

## 4. Testing

- Unit (vitest, `tests/camp.test.ts` or a new `tests/campGrowth.test.ts`):
  - `TILE_UNLOCK_ORDER` contains 0..24 exactly once; rank 0 is tile 12; distance from
    center is non-decreasing along the order; first 5 = center + orthogonals.
  - `tileUnlocked` honors the order at several age points (stone 6-tile core, +3/age).
  - `firstEmptyTile` returns unlock-order-first.
  - `remapCampTiles`: corner-clustered legacy layout remaps into the core; idempotent;
    building ids/levels preserved; result tiles all unlocked.
- Playwright visual check: camp shows a centered core at Stone; locked fringe is faint;
  80px sprites legible; build/move/swap still work.

## Out of scope (YAGNI)

6×6/7×7 grids, ring-reveal animations, decorative props on locked tiles, per-age
terrain art variants, responsive cell sizing.
