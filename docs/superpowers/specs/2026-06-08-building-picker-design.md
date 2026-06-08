# Building picker + drag-and-drop camp — design

**Date:** 2026-06-08
**Ticket:** RC-009 slice 2 (juice + balance pass) — closes KNOWN_ISSUES #4
**Status:** Design — ratified, ready for implementation plan

## Motivation

The base camp is a 5×5 grid (`GRID_SIZE = 25`). Clicking an empty tile today runs
`Object.values(BUILDINGS).find(...)` in `src/ui/civScreen.ts` and silently auto-builds the
**first** building that is unlocked + not-yet-built + affordable — the player cannot choose
*which* building goes down. That was fine for the 3-building slice; the camp is now ~21
buildings across 8 ages (Stone→Modern), so an explicit picker is needed.

The "one of each building" rule is also enforced **only in the UI** — `camp.ts canBuild`
would allow duplicates (KNOWN_ISSUES #4, second half). This is a latent logic bug to close
alongside the UI work.

## Goals

- The player explicitly chooses which building to place, with every option visible at once.
- The player can place on a **specific** tile (drag) or quickly **anywhere** (click).
- The player can **rearrange** the camp by dragging placed buildings between tiles.
- Logic and UI agree on the "one of each" rule.

## Non-goals (YAGNI)

- Tile position has **no gameplay effect** (no adjacency bonuses) — drag/rearrange is purely
  organizational. We do not add positional mechanics.
- No demolish/sell, no tile categories, no touch-native drag (click-to-place is the touch path).

## UI principles applied (jeff-ui-design)

- **Show everything simultaneously** — an always-visible "Available Buildings" palette, not a
  modal or click-to-reveal picker (modals are an explicit anti-pattern).
- **Inline descriptions** — each card shows cost + effects inline, no hover/tooltip discovery.
- **Density is a feature** — flat grid of all buildable options at once.
- **Selection/affordability instantly distinguishable** — affordable cards get a green border
  (consistent with the existing "done/active" green); unaffordable are dimmed with a shortfall
  note. Drop-target highlight is blue (consistent with `exp-card` hover / selection blue).

## Layout

The **Base Camp** panel becomes two stacked regions:

1. **The 5×5 tile grid** (unchanged structure) — shows placed buildings (sprite + `Name L{n}`)
   and empty tiles.
2. **An always-visible "Available Buildings" palette** below the grid — a flat 2-column grid of
   cards, one per **unlocked-and-unbuilt** building.

The Tech Tree panel is unchanged. Buildings whose unlocking tech is not yet researched do **not**
appear in the palette (the Tech Tree panel is where those live).

## Palette cards

Each card shows, inline:

- the real building **sprite** (`spriteCanvas(id, …)` — same render as the grid, for visual
  consistency),
- **name**,
- **cost** (`costText(def.baseCost)`),
- an **effects line** from `buildingEffectText(def)` summarizing the **run bonus** — `maxHp` /
  `damageMult` / `draftChoices` / granted weapon names (e.g. `+10% dmg · Bronze Spear`, `+25 HP`,
  `+1 draft`). Passive `yield` is **not** shown on the card (matches the ratified mockup; the run
  bonus is the decision-relevant part).

Card states:

- **Affordable** → green border, `cursor: grab`, **clickable** and **draggable**.
- **Unlocked but unaffordable** → dimmed, a `need 🔬40`-style shortfall note, **not** clickable
  or draggable.

**Empty state:** if `buildableBuildings(civ)` is empty, the palette shows a single line —
"All available buildings constructed — research more tech."

## Interactions

### Placement
- **Click** an affordable card → build on `firstEmptyTile(civ)` (fast path; also the touch
  fallback). If the grid is full (`null`), no-op.
- **Drag** an affordable card → drop on an **empty** tile → build there. Drop on an occupied
  tile → no-op (a new building cannot displace an existing one).

### Rearrange (placed buildings)
- A placed tile is **draggable**. Drag → drop on another tile:
  - target **empty** → the building **moves** there (origin tile becomes empty),
  - target **occupied** → the two buildings **swap** tiles.
  - Both are **free** (no resource cost).
- **Click** a placed building still **upgrades** it (if affordable + below `maxLevel`), exactly as
  today. A drag must not also fire the click: the dragstart handler sets a transient `didDrag`
  flag that the click handler checks and clears, so a real drag never mis-fires an upgrade.

## Logic layer (`src/camp/camp.ts`) — pure, unit-tested

- `buildableBuildings(civ: CivState): BuildingDef[]` — defs that are `isBuildingUnlocked` **and**
  not already in `civ.buildings`, in `BUILDINGS` declaration order.
- `firstEmptyTile(civ: CivState): number | null` — lowest tile index `0..GRID_SIZE-1` with no
  placed building, else `null`.
- `moveBuilding(civ: CivState, from: number, to: number): CivState` — relocate the building on
  `from` to `to`. If `from === to`, return `civ` unchanged. If `from` has no building, throw. If
  `to` holds a building, that building moves to `from` (swap). No cost. Resource bank untouched.
- **Harden `canBuild`** — return `false` when a building with the same id already exists in
  `civ.buildings`. (The palette only offers unbuilt ones; this makes the logic layer agree and
  closes the KNOWN_ISSUES #4 latent dup bug.)
- `buildingEffectText(def: BuildingDef): string` — pure formatter for the inline card line,
  summarizing the `runBonus` only (`maxHp`→`+N HP`, `damageMult`→`+P% dmg`, `draftChoices`→
  `+N draft`, `weapons`→display names via `WEAPONS`, joined by ` · `). Icon-free and DOM-free so it
  is unit-testable; lives here, not in the UI module.

## UI layer (`src/ui/civScreen.ts`)

- New `CivCallbacks.onMoveBuilding(fromTile: number, toTile: number)`.
- Render the palette below the grid from `buildableBuildings(civ)`, splitting each into
  affordable (`canAfford(civ.banked, def.baseCost)`) vs not for styling.
- **Drag mechanics** — native HTML5 DnD:
  - palette card `dragstart` → `dataTransfer.setData('text/plain', JSON.stringify({kind:'new', id}))`
  - placed cell `dragstart` → `{kind:'move', from: tile}` (+ set `didDrag`)
  - every tile cell: `dragover` → `preventDefault()` (enables drop) + a drop-target highlight class.
    Note: browsers block reading `dataTransfer` payload during `dragover` (security), so the handler
    cannot know 'new' vs 'move' there — **all** tiles highlight on dragover and validity is enforced
    on `drop`.
  - `drop` → parse payload:
    - `kind:'new'` + empty target → `cb.onBuild(id, tile)`; occupied target → ignore.
    - `kind:'move'` → `cb.onMoveBuilding(from, tile)`.
- No transient picker/selection state is needed — placement and rearrange both flow through the
  existing callback → `main.showCiv()` → full re-render path. (Drag state lives in `dataTransfer`
  + the short-lived `didDrag` flag.)

## Wiring (`src/main.ts`)

`onMoveBuilding: (from, to) => { civ = moveBuilding(civ, from, to); persist(); showCiv(); }`
(alongside the existing `onBuild` / `onUpgrade` / `onResearch`).

## Edge cases

- Grid full on click-to-place → `firstEmptyTile` is `null` → no-op.
- Drag a new card onto an occupied tile → no-op.
- Drag a placed building onto itself (`from === to`) → no-op.
- No buildable buildings → palette empty-state line.
- Unaffordable cards are inert (not clickable/draggable), so `onBuild` is only ever invoked for
  affordable buildings; `canBuild` re-validates affordability + unlock + free-tile + non-duplicate
  defensively.

## Testing

**Vitest (logic):**
- `buildableBuildings` — excludes built and not-yet-unlocked; declaration order.
- `firstEmptyTile` — returns lowest free index; `null` when full.
- `moveBuilding` — move to empty; swap on occupied; `from===to` no-op; missing-source throws; bank
  unchanged in all cases.
- `canBuild` — returns `false` for an already-built id (regression for the dup bug).
- `buildingEffectText` — formats representative `yield`/`runBonus` combinations.

**Playwright live (verify-canvas-game skill):**
- Palette renders exactly `buildableBuildings(civ)`; an unaffordable one is present but disabled.
- Click an affordable card → building appears on the first free tile, resources debited.
- Drag a card onto a chosen empty tile → builds there.
- Drag a placed building onto an empty tile → moves it (no cost); onto an occupied tile → swaps.
- Note: synthetic HTML5 DnD can be unreliable to drive with Playwright. The click-to-place path is
  fully automated; if the drag events will not fire, the drag/move/swap paths are covered by the
  logic tests (`moveBuilding`, `onBuild` route) plus a manual check, and that limitation is logged
  rather than silently claimed as automated.

## Files touched

- `src/camp/camp.ts` — `buildableBuildings`, `firstEmptyTile`, `moveBuilding`, `canBuild` hardening,
  `buildingEffectText`.
- `src/ui/civScreen.ts` — palette render, drag-and-drop handlers, new `onMoveBuilding` callback.
- `src/main.ts` — wire `onMoveBuilding`.
- `src/style.css` — palette grid, card affordable/dimmed states, drop-target highlight.
- Tests under the existing camp test file(s).
- `docs/KNOWN_ISSUES.md` — mark #4 resolved.
