# Building Picker + Drag-and-Drop Camp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the implicit "auto-build the first available building" camp interaction with an always-visible build palette supporting click-to-place, drag-to-place, and drag-to-rearrange (move/swap) placed buildings.

**Architecture:** Pure, unit-tested selectors and mutators in `src/camp/camp.ts` (`buildableBuildings`, `firstEmptyTile`, `moveBuilding`, hardened `canBuild`, `buildingEffectText`); the DOM rendering + native HTML5 drag-and-drop live in `src/ui/civScreen.ts`, which re-renders through the existing callback → `main.showCiv()` path (no transient UI state). `main.ts` gains an `onMoveBuilding` wiring.

**Tech Stack:** TypeScript, Vite, Vitest (logic tests), Phaser (run scene only — camp is plain DOM), Playwright (live UI verification).

**Spec:** `docs/superpowers/specs/2026-06-08-building-picker-design.md`

---

## File map

- `src/camp/camp.ts` — add `buildableBuildings`, `firstEmptyTile`, `moveBuilding`, `buildingEffectText`; harden `canBuild` (one-of-each).
- `tests/camp.test.ts` — add tests for all of the above.
- `src/ui/civScreen.ts` — render the palette, drag-and-drop handlers, drop targets; remove empty-tile auto-build; add `onMoveBuilding` to `CivCallbacks`.
- `src/main.ts` — wire `onMoveBuilding`.
- `src/style.css` — palette grid, affordable/locked card states, drop-target highlight.
- `docs/KNOWN_ISSUES.md` — mark #4 resolved.
- `docs/tickets/RC-009-juice-balance.md` — Progress note.

Run commands (Windows PowerShell): tests `npm test`, single file `npx vitest run tests/camp.test.ts`, build/typecheck `npm run build`, dev server `npm run dev`.

---

## Task 1: `buildableBuildings` + `firstEmptyTile` selectors

**Files:**
- Modify: `src/camp/camp.ts`
- Test: `tests/camp.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the bottom of the `describe('camp', …)` block in `tests/camp.test.ts`, and extend the import on line 3 to include the new functions:

```ts
// line 3 becomes:
import {
  isBuildingUnlocked, tileOccupied, canBuild, build, upgradeCost, upgradeBuilding,
  buildableBuildings, firstEmptyTile,
} from '../src/camp/camp';
```

```ts
  it('buildableBuildings lists unlocked, not-yet-built defs in declaration order', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    expect(buildableBuildings(civ)).toEqual([]); // nothing unlocked yet
    civ = research(civ, 'mining');  // unlocks mine
    civ = research(civ, 'pottery'); // unlocks granary
    // granary is declared before mine in BUILDINGS, so order is [granary, mine]
    expect(buildableBuildings(civ).map((d) => d.id)).toEqual(['granary', 'mine']);
    civ = build(civ, 'granary', 0);
    expect(buildableBuildings(civ).map((d) => d.id)).toEqual(['mine']); // built one excluded
  });

  it('firstEmptyTile returns the lowest free tile, or null when full', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    expect(firstEmptyTile(civ)).toBe(0);
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 0);
    expect(firstEmptyTile(civ)).toBe(1);
    // fill every tile -> null
    const full = { ...civ, buildings: Array.from({ length: 25 }, (_, t) => ({ id: 'x', level: 1, tile: t })) };
    expect(firstEmptyTile(full)).toBe(null);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/camp.test.ts`
Expected: FAIL — `buildableBuildings is not a function` / `firstEmptyTile is not a function`.

- [ ] **Step 3: Implement the selectors**

In `src/camp/camp.ts`, extend the type import and add `GRID_SIZE`, then append the two functions:

```ts
// top of file — extend existing imports
import { CivState, Resource, ResourceBundle, BuildingDef } from '../game/types';
import { GRID_SIZE } from '../game/config';
```

```ts
/** Defs whose unlocking tech is researched and which are not already placed, in declaration order. */
export function buildableBuildings(civ: CivState): BuildingDef[] {
  return Object.values(BUILDINGS).filter(
    (def) => isBuildingUnlocked(civ, def.id) && !civ.buildings.some((b) => b.id === def.id),
  );
}

/** Lowest tile index 0..GRID_SIZE-1 with no building, or null if the grid is full. */
export function firstEmptyTile(civ: CivState): number | null {
  for (let tile = 0; tile < GRID_SIZE; tile++) {
    if (!tileOccupied(civ, tile)) return tile;
  }
  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/camp.test.ts`
Expected: PASS (all camp tests).

- [ ] **Step 5: Commit**

```bash
git add src/camp/camp.ts tests/camp.test.ts
git commit -m "feat(camp): buildableBuildings + firstEmptyTile selectors"
```

---

## Task 2: Harden `canBuild` against duplicates (one-of-each in logic)

**Files:**
- Modify: `src/camp/camp.ts:14-20`
- Test: `tests/camp.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the `describe('camp', …)` block:

```ts
  it('canBuild rejects a building whose id is already placed (one of each)', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 0);
    // granary is unlocked, tile 5 is free, and we can afford it — but it already exists.
    expect(canBuild(civ, 'granary', 5)).toBe(false);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/camp.test.ts -t "one of each"`
Expected: FAIL — `canBuild` currently returns `true` (duplicate allowed).

- [ ] **Step 3: Implement the guard**

In `src/camp/camp.ts`, add the duplicate check to `canBuild` (after the unlock check):

```ts
export function canBuild(civ: CivState, buildingId: string, tile: number): boolean {
  const def = BUILDINGS[buildingId];
  if (!def) return false;
  if (!isBuildingUnlocked(civ, buildingId)) return false;
  if (civ.buildings.some((b) => b.id === buildingId)) return false; // one of each
  if (tileOccupied(civ, tile)) return false;
  return canAfford(civ.banked, def.baseCost);
}
```

- [ ] **Step 4: Run the full camp suite to verify pass + no regressions**

Run: `npx vitest run tests/camp.test.ts`
Expected: PASS (existing build/upgrade tests still green — none build the same id twice).

- [ ] **Step 5: Commit**

```bash
git add src/camp/camp.ts tests/camp.test.ts
git commit -m "fix(camp): canBuild enforces one-of-each in the logic layer (KNOWN_ISSUES #4)"
```

---

## Task 3: `moveBuilding` (rearrange — move to empty / swap on occupied)

**Files:**
- Modify: `src/camp/camp.ts`
- Test: `tests/camp.test.ts`

- [ ] **Step 1: Write the failing tests**

Extend the import on line 3 to add `moveBuilding`, then add:

```ts
  it('moveBuilding relocates a building to an empty tile, free of cost', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 0);
    const bankBefore = { ...civ.banked };
    civ = moveBuilding(civ, 0, 7);
    expect(civ.buildings).toEqual([{ id: 'granary', level: 1, tile: 7 }]);
    expect(civ.banked).toEqual(bankBefore); // no cost
  });

  it('moveBuilding swaps two buildings when the target tile is occupied', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = research(civ, 'mining');
    civ = build(civ, 'granary', 0);
    civ = build(civ, 'mine', 1);
    civ = moveBuilding(civ, 0, 1); // granary <-> mine
    expect(civ.buildings.find((b) => b.tile === 1)!.id).toBe('granary');
    expect(civ.buildings.find((b) => b.tile === 0)!.id).toBe('mine');
  });

  it('moveBuilding is a no-op when from === to and throws when source is empty', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 0);
    expect(moveBuilding(civ, 0, 0)).toBe(civ); // same reference, unchanged
    expect(() => moveBuilding(civ, 9, 10)).toThrow();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/camp.test.ts -t moveBuilding`
Expected: FAIL — `moveBuilding is not a function`.

- [ ] **Step 3: Implement `moveBuilding`**

Append to `src/camp/camp.ts`:

```ts
/**
 * Relocate the building on `from` to `to`. Empty target = move; occupied target = swap the two.
 * No resource cost. Throws if `from` has no building. No-op (same ref) when from === to.
 */
export function moveBuilding(civ: CivState, from: number, to: number): CivState {
  if (from === to) return civ;
  const moving = civ.buildings.find((b) => b.tile === from);
  if (!moving) throw new Error(`No building on tile ${from}`);
  const occupant = civ.buildings.find((b) => b.tile === to);
  return {
    ...civ,
    buildings: civ.buildings.map((b) => {
      if (b === moving) return { ...b, tile: to };
      if (occupant && b === occupant) return { ...b, tile: from };
      return b;
    }),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/camp.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/camp/camp.ts tests/camp.test.ts
git commit -m "feat(camp): moveBuilding rearrange (move to empty / swap on occupied)"
```

---

## Task 4: `buildingEffectText` (run-bonus summary)

**Files:**
- Modify: `src/camp/camp.ts`
- Test: `tests/camp.test.ts`

- [ ] **Step 1: Write the failing tests**

Extend the import on line 3 to add `buildingEffectText`, then add:

```ts
  it('buildingEffectText summarizes the run bonus (hp / dmg / draft / weapon names)', () => {
    expect(buildingEffectText(BUILDINGS.granary)).toBe('+25 HP');
    expect(buildingEffectText(BUILDINGS.mine)).toBe('+5% dmg');
    expect(buildingEffectText(BUILDINGS.forge)).toBe('+10% dmg · Bronze Spear');
    expect(buildingEffectText(BUILDINGS.academy)).toBe('+1 draft · Gladius');
    expect(buildingEffectText(BUILDINGS.gunsmith)).toBe('+16% dmg · Blunderbuss · Grenade');
  });
```

(Values derived from `buildingData.ts` + `weaponData.ts`: granary `maxHp:25`; mine `damageMult:0.05`; forge `damageMult:0.10`+`bronze_spear`; academy `draftChoices:1`+`gladius`; gunsmith `damageMult:0.16`+`blunderbuss`,`grenade`. The `Math.round` in the impl absorbs float error like `0.05*100 = 5.000000000000001`.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/camp.test.ts -t buildingEffectText`
Expected: FAIL — `buildingEffectText is not a function`.

- [ ] **Step 3: Implement `buildingEffectText`**

Add the `WEAPONS` import and the function to `src/camp/camp.ts`:

```ts
// top of file
import { WEAPONS } from '../run/weaponData';
```

```ts
/** Inline card summary of a building's run bonus (maxHp / damageMult / draftChoices / weapons). */
export function buildingEffectText(def: BuildingDef): string {
  const rb = def.runBonus;
  const parts: string[] = [];
  if (rb.maxHp) parts.push(`+${rb.maxHp} HP`);
  if (rb.damageMult) parts.push(`+${Math.round(rb.damageMult * 100)}% dmg`);
  if (rb.draftChoices) parts.push(`+${rb.draftChoices} draft`);
  if (rb.weapons) for (const id of rb.weapons) parts.push(WEAPONS[id]?.name ?? id);
  return parts.join(' · ');
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/camp.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/camp/camp.ts tests/camp.test.ts
git commit -m "feat(camp): buildingEffectText run-bonus summary formatter"
```

---

## Task 5: Render the always-visible build palette (display only)

No DOM unit tests exist for `civScreen` (canvas-backed sprites can't render under jsdom); these UI tasks are verified by `npm run build` (typecheck) per task and a full Playwright pass in Task 9.

**Files:**
- Modify: `src/ui/civScreen.ts`
- Modify: `src/style.css`

- [ ] **Step 1: Update imports and remove the empty-tile auto-build**

`noUnusedLocals` is on, so import only what each task uses. The original camp import (line 5) is
`{ canBuild, isBuildingUnlocked, tileOccupied, upgradeCost }` — all three of `canBuild`,
`isBuildingUnlocked`, `tileOccupied` are used **only** by the empty-tile auto-build deleted in this
task. Change line 5 to:

```ts
import { buildableBuildings, buildingEffectText, upgradeCost } from '../camp/camp';
```

(`firstEmptyTile` is added to this import in Task 6 and `tileOccupied` in Task 7, when each is first
used — adding them earlier would fail `tsc --noEmit`.)

Replace the empty-cell `else` branch (currently civScreen.ts:102-114) so an empty tile is just a labelled cell (placement now happens via the palette / drag — handlers come in Tasks 6-8):

```ts
    } else {
      cell.innerHTML = '<span class="lvl">empty</span>';
    }
```

- [ ] **Step 2: Add a `shortfall` helper and render the palette below the grid**

Add this helper near `costText` (after civScreen.ts:23):

```ts
function shortfallText(banked: Record<Resource, number>, cost: Partial<Record<Resource, number>>): string {
  return RESOURCES.filter((r) => (cost[r] ?? 0) > banked[r]).map((r) => `${ICON[r]}${cost[r]}`).join(' ');
}
```

Immediately after `campPanel.appendChild(grid);` (currently civScreen.ts:117), append the palette:

```ts
  // Available-buildings palette: every unlocked, not-yet-built building, always visible.
  const palette = document.createElement('div');
  palette.className = 'palette';
  palette.innerHTML = '<h3>Available Buildings</h3>';
  const options = buildableBuildings(civ);
  if (options.length === 0) {
    const note = document.createElement('div');
    note.className = 'empty-note';
    note.textContent = 'All available buildings constructed — research more tech.';
    palette.appendChild(note);
  } else {
    const bgrid = document.createElement('div');
    bgrid.className = 'bgrid';
    for (const def of options) {
      const affordable = canAfford(civ.banked, def.baseCost);
      const card = document.createElement('div');
      card.className = 'bcard' + (affordable ? ' afford' : ' locked');
      card.appendChild(spriteCanvas(def.id, 32));
      const text = document.createElement('div');
      const eff = buildingEffectText(def);
      text.innerHTML =
        `<div class="bnm">${def.name}</div>` +
        `<div class="bcost">${costText(def.baseCost)}</div>` +
        (eff ? `<div class="beff">${eff}</div>` : '') +
        (affordable ? '' : `<div class="bneed">need ${shortfallText(civ.banked, def.baseCost)}</div>`);
      card.appendChild(text);
      bgrid.appendChild(card);
    }
    palette.appendChild(bgrid);
  }
  campPanel.appendChild(palette);
```

- [ ] **Step 3: Add palette CSS**

Append to `src/style.css`:

```css
.palette { margin-top: 14px; }
.palette h3 { margin: 0 0 8px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; }
.palette .empty-note { font-size: 0.8rem; opacity: 0.7; }
.bgrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.bcard { display: flex; gap: 8px; align-items: flex-start; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 7px 8px; }
.bcard.afford { border-color: #3fb950; cursor: grab; }
.bcard.afford:hover { background: #11161d; }
.bcard.locked { opacity: 0.45; }
.bcard canvas { flex: none; }
.bcard .bnm { font-weight: 600; font-size: 0.8rem; }
.bcard .bcost { font-size: 0.7rem; opacity: 0.8; margin-top: 1px; }
.bcard .beff { font-size: 0.7rem; color: #3fb950; margin-top: 2px; }
.bcard.locked .beff { color: #6e7681; }
.bcard .bneed { font-size: 0.65rem; color: #d29922; margin-top: 2px; }
.cell.drop-hover { border-color: #58a6ff; box-shadow: inset 0 0 0 2px #58a6ff; }
```

- [ ] **Step 4: Typecheck/build and eyeball**

Run: `npm run build`
Expected: PASS (no TS errors — the Task 5 import contains only symbols used in this task).

Run: `npm run dev`, open the camp. Expected: an "Available Buildings" palette under the grid; affordable buildings have a green border, unaffordable are dimmed with a "need …" note; clicking an empty tile no longer auto-builds.

- [ ] **Step 5: Commit**

```bash
git add src/ui/civScreen.ts src/style.css
git commit -m "feat(camp-ui): always-visible build palette (display); drop auto-build on empty tile"
```

---

## Task 6: Click-to-place from the palette

**Files:**
- Modify: `src/ui/civScreen.ts`

- [ ] **Step 1: Import `firstEmptyTile`, then make affordable cards build on the first free tile**

Extend the camp import (line 5) to add `firstEmptyTile`:

```ts
import { buildableBuildings, firstEmptyTile, buildingEffectText, upgradeCost } from '../camp/camp';
```

Inside the `for (const def of options)` loop in the palette (Task 5), after `card.appendChild(text);`, add:

```ts
      if (affordable) {
        card.onclick = () => {
          const tile = firstEmptyTile(civ);
          if (tile !== null) cb.onBuild(def.id, tile);
        };
      }
```

- [ ] **Step 2: Typecheck/build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Manual check**

Run: `npm run dev`. Click an affordable palette card → the building appears on the first empty tile, resources are debited, and the card leaves the palette (it's now built). Unaffordable cards do nothing on click.

- [ ] **Step 4: Commit**

```bash
git add src/ui/civScreen.ts
git commit -m "feat(camp-ui): click a palette card to build on the first free tile"
```

---

## Task 7: Drag a palette card onto a chosen empty tile

**Files:**
- Modify: `src/ui/civScreen.ts`

- [ ] **Step 1: Make affordable cards draggable**

In the palette loop, inside the `if (affordable) { … }` block from Task 6, add a dragstart that carries a `new` payload:

```ts
        card.draggable = true;
        card.addEventListener('dragstart', (e) => {
          e.dataTransfer?.setData('text/plain', JSON.stringify({ kind: 'new', id: def.id }));
        });
```

- [ ] **Step 2: Import `tileOccupied`, then make every tile cell a drop target**

Extend the camp import (line 5) to add `tileOccupied`:

```ts
import { buildableBuildings, firstEmptyTile, buildingEffectText, tileOccupied, upgradeCost } from '../camp/camp';
```

In the `for (let tile = 0; …)` grid loop, after `const cell = …; cell.className = 'cell';` and before the `placed` branch, attach drop handling to all cells:

```ts
    cell.addEventListener('dragover', (e) => { e.preventDefault(); cell.classList.add('drop-hover'); });
    cell.addEventListener('dragleave', () => cell.classList.remove('drop-hover'));
    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      cell.classList.remove('drop-hover');
      const raw = e.dataTransfer?.getData('text/plain');
      if (!raw) return;
      const payload = JSON.parse(raw) as { kind: string; id?: string; from?: number };
      if (payload.kind === 'new' && payload.id && !tileOccupied(civ, tile)) {
        cb.onBuild(payload.id, tile);
      }
      // 'move' handled in Task 8
    });
```

- [ ] **Step 3: Typecheck/build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Manual check**

Run: `npm run dev`. Drag an affordable card onto a specific empty tile → it builds there (not the first free tile). The tile highlights blue while hovering. Dropping on an occupied tile does nothing.

- [ ] **Step 5: Commit**

```bash
git add src/ui/civScreen.ts
git commit -m "feat(camp-ui): drag a palette card onto a chosen empty tile to build"
```

---

## Task 8: Drag a placed building to rearrange (move / swap)

**Files:**
- Modify: `src/ui/civScreen.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Add the `onMoveBuilding` callback to the interface**

In `src/ui/civScreen.ts`, extend `CivCallbacks` (civScreen.ts:14-19):

```ts
export interface CivCallbacks {
  onResearch: (techId: string) => void;
  onBuild: (buildingId: string, tile: number) => void;
  onUpgrade: (tile: number) => void;
  onMoveBuilding: (fromTile: number, toTile: number) => void;
  onStartRun: () => void;
}
```

- [ ] **Step 2: Make placed cells drag sources, with a click-vs-drag guard**

Add a closure-scoped flag at the top of `renderCivScreen` (just after `root.innerHTML = '';`):

```ts
  let didDrag = false;
```

In the `placed` branch of the grid loop, after the existing `cell.onclick = …` upgrade handler, add drag-source wiring and guard the upgrade click:

```ts
      cell.draggable = true;
      cell.addEventListener('dragstart', (e) => {
        didDrag = true;
        e.dataTransfer?.setData('text/plain', JSON.stringify({ kind: 'move', from: tile }));
      });
      cell.addEventListener('dragend', () => { didDrag = false; });
```

And change the upgrade `onclick` (civScreen.ts:97-101) to bail if a drag just happened:

```ts
      cell.onclick = () => {
        if (didDrag) { didDrag = false; return; }
        if (placed.level < def.maxLevel && canAfford(civ.banked, upgradeCost(placed.id, placed.level))) {
          cb.onUpgrade(tile);
        }
      };
```

- [ ] **Step 3: Handle the `move` payload in the drop target**

In the cell `drop` handler (Task 7), replace the `// 'move' handled in Task 8` comment with:

```ts
      if (payload.kind === 'move' && payload.from !== undefined) {
        cb.onMoveBuilding(payload.from, tile);
      }
```

- [ ] **Step 4: Wire `onMoveBuilding` in main.ts**

In `src/main.ts`, add `moveBuilding` to the camp import (main.ts:8) and a callback in `showCiv` (main.ts:40-45):

```ts
import { build, upgradeBuilding, moveBuilding } from './camp/camp';
```

```ts
    onMoveBuilding: (from, to) => { civ = moveBuilding(civ, from, to); persist(); showCiv(); },
```

- [ ] **Step 5: Typecheck/build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Manual check**

Run: `npm run dev`. Drag a placed building onto an empty tile → it moves there (no cost). Drag it onto another placed building → the two swap tiles. A plain click on a placed building still upgrades it (no accidental move).

- [ ] **Step 7: Commit**

```bash
git add src/ui/civScreen.ts src/main.ts
git commit -m "feat(camp-ui): drag placed buildings to rearrange (move to empty / swap on occupied)"
```

---

## Task 9: Full verification (Vitest + Playwright live)

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite + build**

Run: `npm test`
Expected: PASS — 116 prior tests + the new camp tests (≈125 total), all green.

Run: `npm run build`
Expected: PASS, no TS errors.

- [ ] **Step 2: Playwright live verification (verify-canvas-game skill)**

The camp screen is plain DOM, so drive it directly (no canvas instrumentation). Persisted state lives in `localStorage['rogue-civ-save-v1']`.

Start dev server (`npm run dev`) and with the Playwright MCP:
1. Seed a known state: in the page, `localStorage.setItem('rogue-civ-save-v1', JSON.stringify({version:1, banked:{exploration:99,science:99,industry:99,culture:99}, researched:['pottery','mining'], buildings:[], runs:0}))`, then reload.
2. Assert the palette renders Granary + Mine cards (both affordable / green).
3. **Click-place:** click the Granary card → reload-free, read `JSON.parse(localStorage['rogue-civ-save-v1']).buildings` → expect `[{id:'granary',level:1,tile:0}]`; assert `industry` debited by 10.
4. **Disabled card:** seed a low-bank state where Mine is unlocked but unaffordable; assert its card has class `locked` and a `need …` note, and clicking it does nothing.
5. **Drag paths:** attempt `browser_drag` from a palette card to a specific empty tile (assert build on that tile), and from a placed building to another tile (assert move/swap). Synthetic HTML5 DnD can be unreliable to drive — if the drag events do not fire, record that the drag/move/swap paths were verified manually in the dev server + by the `moveBuilding` / `onBuild` unit tests, and do **not** claim the drag was automated.

- [ ] **Step 3: Commit any test artifacts (if a Playwright spec was added; otherwise skip)**

```bash
git add -A
git commit -m "test(camp-ui): live verification of build palette + drag-and-drop" --allow-empty
```

---

## Task 10: Docs — close KNOWN_ISSUES #4, update ticket

**Files:**
- Modify: `docs/KNOWN_ISSUES.md`
- Modify: `docs/tickets/RC-009-juice-balance.md`

- [ ] **Step 1: Mark KNOWN_ISSUES #4 resolved**

Replace the `## 4. [Minor] Base-camp build picker is implicit` section body with a resolved note:

```markdown
## 4. [RESOLVED 2026-06-08] Base-camp build picker is implicit

Replaced the implicit "auto-build the first available building" empty-tile click with an
always-visible build palette: click a card to build on the first free tile, drag a card onto a
chosen tile, and drag placed buildings to rearrange (move to empty / swap on occupied). The
"one of each" rule is now enforced in `camp.ts canBuild`, not just the UI.
```

- [ ] **Step 2: Add a Progress note to the RC-009 ticket**

Under `## Progress` in `docs/tickets/RC-009-juice-balance.md`, mark slice 2 shipped (add under the "Remaining slices" list or convert item 1):

```markdown
- **Slice 2 — explicit building picker: SHIPPED 2026-06-08** (branch rc-009-building-picker).
  Always-visible "Available Buildings" palette (no modal), click-to-place (first free tile),
  drag-to-place (chosen tile), and drag-to-rearrange placed buildings (move/swap). New pure
  camp.ts helpers (`buildableBuildings`, `firstEmptyTile`, `moveBuilding`, `buildingEffectText`)
  + `canBuild` hardened for one-of-each. Closes KNOWN_ISSUES #4. Tests + build green;
  Playwright-verified.
```

- [ ] **Step 3: Tick the ticket acceptance box**

In the `## Acceptance Criteria` list, change
`- [ ] Explicit building picker — flat grid, all options visible (KNOWN_ISSUES #4)`
to `- [x] …`.

- [ ] **Step 4: Commit**

```bash
git add docs/KNOWN_ISSUES.md docs/tickets/RC-009-juice-balance.md
git commit -m "docs(RC-009): close KNOWN_ISSUES #4 (building picker shipped)"
```

(The pre-commit hook will re-render tracking surfaces since a ticket file changed; let it. If it modifies `projects.yaml` in the AI Assistant repo, commit that there separately per the session-close ceremony.)

---

## Self-review notes (for the executor)

- **Tasks 1-4** are pure-logic TDD with exact expected values derived from `buildingData.ts` / `weaponData.ts` (not copied from runtime output).
- **Tasks 5-8** have no unit tests by design (canvas sprites won't render under jsdom); each is typecheck-gated and the behavior is proven in Task 9.
- **Type consistency:** the DnD payload shape `{ kind: 'new'|'move', id?, from? }` is written identically in the palette dragstart (Task 7: `new`/`id`), placed-cell dragstart (Task 8: `move`/`from`), and the drop parser (Tasks 7-8). `onMoveBuilding(fromTile, toTile)` matches `moveBuilding(civ, from, to)`.
- **`noUnusedLocals`/`noUnusedParameters` are on** and `build` runs `tsc --noEmit` first. The
  civScreen camp import grows per task — `buildableBuildings`/`buildingEffectText` (Task 5),
  `+firstEmptyTile` (Task 6), `+tileOccupied` (Task 7). Don't import a symbol before the task that
  uses it. Existing tests don't exercise civScreen, so logic correctness rides on Tasks 1-4.
