# RC-032 City Growth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Center-out ring unlock order for the 5×5 camp grid, faint-terrain locked tiles, and an idempotent save remap — per `docs/superpowers/specs/2026-06-12-rc-032-camp-city-growth-design.md`.

**Scope note:** the ticket's sizing item (#1) was already delivered by commit 6cb5759 (cells/sprites at 120px, 3× the ticket's stale 40px claim) — NO sprite/cell size changes in this plan. Card sprites stay 32px.

**Architecture:** all ordering/migration logic is pure in `src/camp/camp.ts` (vitest-covered); `src/ui/civScreen.ts` only swaps its `tile < unlockedCount` check for the order-aware helper and restyles locked cells; `src/main.ts` applies the remap at load.

---

### Task 1: Ring order + remap (pure logic, TDD)

**Files:** Modify `src/camp/camp.ts`; test `tests/camp.test.ts` (append).

- [ ] **Step 1 — failing tests** appended to `tests/camp.test.ts` (reuse its existing civ fixture style):

```ts
describe('RC-032 center-out unlock order', () => {
  it('TILE_UNLOCK_ORDER is a permutation of 0..24 starting at the center', () => {
    expect([...TILE_UNLOCK_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i));
    expect(TILE_UNLOCK_ORDER[0]).toBe(12);
  });

  it('distance from center is non-decreasing along the order; orthogonals precede diagonals', () => {
    const dist = (t: number) => Math.hypot((t % 5) - 2, Math.floor(t / 5) - 2);
    for (let i = 1; i < 25; i++) {
      expect(dist(TILE_UNLOCK_ORDER[i])).toBeGreaterThanOrEqual(dist(TILE_UNLOCK_ORDER[i - 1]) - 1e-9);
    }
    expect(TILE_UNLOCK_ORDER.slice(0, 5).sort((a, b) => a - b)).toEqual([7, 11, 12, 13, 17]);
  });

  it('tileUnlocked honors the order: stone age = 6-tile core', () => {
    const civ = newCivState(); // stone age, 6 slots
    const unlocked = Array.from({ length: 25 }, (_, t) => t).filter((t) => tileUnlocked(civ, t));
    expect(unlocked.sort((a, b) => a - b)).toEqual([...TILE_UNLOCK_ORDER.slice(0, 6)].sort((a, b) => a - b));
    expect(tileUnlocked(civ, 0)).toBe(false); // old row-major first tile is now a locked corner-ward tile
  });

  it('firstEmptyTile fills in unlock order', () => {
    const civ = newCivState();
    expect(firstEmptyTile(civ)).toBe(TILE_UNLOCK_ORDER[0]);
    const built = { ...civ, buildings: [{ id: 'granary', level: 1, tile: TILE_UNLOCK_ORDER[0] }] };
    expect(firstEmptyTile(built)).toBe(TILE_UNLOCK_ORDER[1]);
  });
});

describe('RC-032 remapCampTiles', () => {
  it('remaps a legacy row-major layout into the core, preserving ids/levels', () => {
    const civ = { ...newCivState(), buildings: [
      { id: 'granary', level: 2, tile: 0 }, { id: 'mine', level: 1, tile: 1 },
    ] };
    const out = remapCampTiles(civ);
    expect(out.buildings.map((b) => b.tile)).toEqual([TILE_UNLOCK_ORDER[0], TILE_UNLOCK_ORDER[1]]);
    expect(out.buildings.map((b) => ({ id: b.id, level: b.level })))
      .toEqual([{ id: 'granary', level: 2 }, { id: 'mine', level: 1 }]);
    for (const b of out.buildings) expect(tileUnlocked(out, b.tile)).toBe(true);
  });

  it('is idempotent and a no-op (same reference) on migrated saves', () => {
    const civ = { ...newCivState(), buildings: [
      { id: 'granary', level: 1, tile: TILE_UNLOCK_ORDER[0] }, { id: 'mine', level: 1, tile: TILE_UNLOCK_ORDER[1] },
    ] };
    expect(remapCampTiles(civ)).toBe(civ);
  });

  it('orders legacy buildings by the unlock rank of their current tile', () => {
    // tile 13 (orthogonal, rank<=4) must come before tile 0 (corner, late rank)
    const civ = { ...newCivState(), buildings: [
      { id: 'granary', level: 1, tile: 0 }, { id: 'mine', level: 1, tile: 13 },
    ] };
    const out = remapCampTiles(civ);
    const mine = out.buildings.find((b) => b.id === 'mine')!;
    const granary = out.buildings.find((b) => b.id === 'granary')!;
    expect(TILE_UNLOCK_ORDER.indexOf(mine.tile)).toBeLessThan(TILE_UNLOCK_ORDER.indexOf(granary.tile));
  });
});
```

(Imports: add `TILE_UNLOCK_ORDER, remapCampTiles` to the existing camp imports; `newCivState` from `../src/state/civState`. If granary/mine placement in fixtures trips `canBuild`-style guards — it won't, these construct CivState literals — adjust ids to any two building ids.)

- [ ] **Step 2 — run** `npx vitest run tests/camp.test.ts` → FAIL (no TILE_UNLOCK_ORDER export).

- [ ] **Step 3 — implement in `src/camp/camp.ts`:**

```ts
// RC-032: the camp unlocks center-out — a settlement growing into the wilderness, not a
// spreadsheet filling row-major. Order = Euclidean distance from the center tile (12),
// ties broken by ascending index (deterministic; orthogonals beat diagonals at dist 1 vs √2).
const CENTER = { col: 2, row: 2 };
export const TILE_UNLOCK_ORDER: number[] = Array.from({ length: GRID_SIZE }, (_, t) => t)
  .sort((a, b) => {
    const d = (t: number) => Math.hypot((t % 5) - CENTER.col, Math.floor(t / 5) - CENTER.row);
    return d(a) - d(b) || a - b;
  });
const TILE_RANK: number[] = TILE_UNLOCK_ORDER.reduce((acc, tile, rank) => {
  acc[tile] = rank; return acc;
}, [] as number[]);
```

`tileUnlocked` becomes `TILE_RANK[tile] < unlockedTileCount(civ)`. `firstEmptyTile` iterates `TILE_UNLOCK_ORDER.slice(0, unlocked)` and returns the first unoccupied tile (null otherwise). Add:

```ts
/** RC-032 save migration: re-seat placed buildings onto the first N unlock-order tiles,
 *  ordered by the unlock rank of their current tile. Idempotent: a migrated layout occupies
 *  ranks 0..n−1 already, so every building maps back to its own tile (same reference returned). */
export function remapCampTiles(civ: CivState): CivState {
  const sorted = [...civ.buildings].sort((a, b) => TILE_RANK[a.tile] - TILE_RANK[b.tile]);
  const moved = sorted.some((b, n) => b.tile !== TILE_UNLOCK_ORDER[n]);
  if (!moved) return civ;
  return { ...civ, buildings: sorted.map((b, n) => ({ ...b, tile: TILE_UNLOCK_ORDER[n] })) };
}
```

- [ ] **Step 4 — run** the camp tests → PASS; then `npx tsc --noEmit` + full `npx vitest run`. NOTE: existing camp tests may assume row-major unlocks (e.g. tile 0 unlocked at stone) — update ONLY assertions that encode the old ordering, preserving each test's intent.

- [ ] **Step 5 — commit** `feat(RC-032): center-out tile unlock order + idempotent save remap`

### Task 2: UI — faint-terrain locked tiles + order-aware grid + load remap

**Files:** Modify `src/ui/civScreen.ts` (~lines 204-216), `src/style.css` (~lines 89-90), `src/main.ts` (~line 29).

- [ ] **Step 1 — civScreen:** import `tileUnlocked` (and drop `unlockedTileCount` if now unused here); replace `const unlockedCount = unlockedTileCount(civ);` + `const unlocked = tile < unlockedCount;` with `const unlocked = tileUnlocked(civ, tile);`. In the locked branch, drop the 🔒 glyph: `cell.innerHTML = '';` (faint terrain reads as wilderness, not a padlock spreadsheet).

- [ ] **Step 2 — style.css:** locked tiles become faint terrain:

```css
.cell.locked-tile { background: #0b0f0a; border: none; cursor: default; opacity: 0.35; border-radius: 6px; background-image: radial-gradient(circle at 30% 40%, #16210f 0 12%, transparent 13%), radial-gradient(circle at 70% 65%, #131c0e 0 10%, transparent 11%); }
```

(Keep the `.cell.locked-tile .lvl` rule harmlessly in place or delete it — the span is gone.)

- [ ] **Step 3 — main.ts:** `let civ: CivState = remapCampTiles(load() ?? newCivState());` (import from `../camp/camp` — match the file's existing import paths).

- [ ] **Step 4 — verify:** `npx tsc --noEmit` + full `npx vitest run` green.

- [ ] **Step 5 — commit** `feat(RC-032): faint-terrain locked tiles, order-aware grid, remap on load`

### Task 3: Verification + tracking

- [ ] Playwright visual check (controller): stone-age civ shows a centered 6-tile core, faint fringe; build/drag/swap work; legacy corner save re-centers on load.
- [ ] BACKLOG row RC-032 → Delivered; ticket resolution note (sizing pre-delivered by 6cb5759; this change = growth + remap). Commit.
