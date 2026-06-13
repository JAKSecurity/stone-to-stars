import { describe, it, expect } from 'vitest';
import { BUILDINGS } from '../src/camp/buildingData';
import {
  isBuildingUnlocked, tileOccupied, canBuild, build, upgradeCost, upgradeBuilding,
  buildableBuildings, firstEmptyTile, moveBuilding, buildingEffectText, buildingCost,
  unlockedTileCount, tileUnlocked, TILE_UNLOCK_ORDER, remapCampTiles,
} from '../src/camp/camp';
import { CAMP_SLOTS_BASE, CAMP_SLOTS_PER_AGE, GRID_SIZE } from '../src/game/config';
import { newCivState } from '../src/state/civState';
import { research } from '../src/tech/tech';

const RICH = { exploration: 99999, science: 99999, industry: 99999, culture: 99999 };

describe('camp', () => {
  it('defines granary, mine, forge, smelter, foundry, deep_mine, classical buildings (academy, market, workshop), medieval buildings (armory, cathedral, keep), renaissance buildings (bank, gunsmith, university), industrial buildings (arsenal, factory, powerplant), modern buildings (airfield, barracks, motor_pool), and space buildings (launch_pad, mission_control)', () => {
    expect(Object.keys(BUILDINGS).sort()).toEqual(
      ['academy', 'airfield', 'armory', 'arsenal', 'bank', 'barracks', 'cathedral', 'deep_mine', 'forge', 'foundry', 'factory', 'granary', 'gunsmith', 'keep', 'launch_pad', 'market', 'mine', 'mission_control', 'motor_pool', 'powerplant', 'smelter', 'university', 'workshop'].sort(),
    );
  });

  it('a building is locked until its tech is researched', () => {
    const civ = { ...newCivState(), banked: { ...RICH } };
    expect(isBuildingUnlocked(civ, 'granary')).toBe(false);
    const after = research(civ, 'pottery');
    expect(isBuildingUnlocked(after, 'granary')).toBe(true);
  });

  it('cannot build a locked building', () => {
    const civ = { ...newCivState(), banked: { ...RICH } };
    expect(canBuild(civ, 'granary', 0)).toBe(false);
  });

  it('builds an unlocked building on an empty tile, paying base cost', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    const beforeIndustry = civ.banked.industry;
    // tile 12 = center tile, rank 0 — always unlocked in stone age
    civ = build(civ, 'granary', 12);
    expect(civ.buildings).toEqual([{ id: 'granary', level: 1, tile: 12 }]);
    expect(civ.banked.industry).toBe(beforeIndustry - (buildingCost('granary', 1).industry ?? 0));
    expect(tileOccupied(civ, 12)).toBe(true);
  });

  it('cannot build on an occupied tile', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 12);
    expect(canBuild(civ, 'granary', 12)).toBe(false);
  });

  it('upgradeCost scales with the next level and upgrade raises level', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 12);
    expect(upgradeCost('granary', 1)).toEqual(buildingCost('granary', 2)); // level-2 cost
    civ = upgradeBuilding(civ, 12);
    expect(civ.buildings.find((b) => b.tile === 12)!.level).toBe(2);
  });

  it('cannot upgrade past maxLevel', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 12);
    civ = upgradeBuilding(civ, 12);
    civ = upgradeBuilding(civ, 12);
    expect(() => upgradeBuilding(civ, 12)).toThrow();
  });

  it('canBuild rejects a building whose id is already placed (one of each)', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    // tile 12 = center (rank 0), tile 7 = orthogonal (rank 1) — both in 6-tile stone-age core
    civ = build(civ, 'granary', 12);
    // granary is unlocked, tile 7 is free, and we can afford it — but it already exists.
    expect(canBuild(civ, 'granary', 7)).toBe(false);
  });

  it('buildableBuildings lists unlocked, not-yet-built defs in declaration order', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    expect(buildableBuildings(civ)).toEqual([]); // nothing unlocked yet
    civ = research(civ, 'mining');  // unlocks mine
    civ = research(civ, 'pottery'); // unlocks granary
    // granary is declared before mine in BUILDINGS, so order is [granary, mine]
    expect(buildableBuildings(civ).map((d) => d.id)).toEqual(['granary', 'mine']);
    civ = build(civ, 'granary', 12); // center tile is always unlocked
    expect(buildableBuildings(civ).map((d) => d.id)).toEqual(['mine']); // built one excluded
  });

  it('firstEmptyTile returns the first free tile in unlock order, or null when full', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    // stone age first empty = center tile (TILE_UNLOCK_ORDER[0] = 12)
    expect(firstEmptyTile(civ)).toBe(TILE_UNLOCK_ORDER[0]);
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', TILE_UNLOCK_ORDER[0]);
    expect(firstEmptyTile(civ)).toBe(TILE_UNLOCK_ORDER[1]);
    // fill every tile -> null
    const full = { ...civ, buildings: Array.from({ length: 25 }, (_, t) => ({ id: 'x', level: 1, tile: t })) };
    expect(firstEmptyTile(full)).toBe(null);
  });

  it('moveBuilding relocates a building to an empty tile, free of cost', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    // tile 12 = center (rank 0), tile 7 = orthogonal neighbor (rank 1)
    civ = build(civ, 'granary', 12);
    const bankBefore = { ...civ.banked };
    civ = moveBuilding(civ, 12, 7);
    expect(civ.buildings).toEqual([{ id: 'granary', level: 1, tile: 7 }]);
    expect(civ.banked).toEqual(bankBefore); // no cost
  });

  it('moveBuilding swaps two buildings when the target tile is occupied', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = research(civ, 'mining');
    // tiles 12 and 7 are the two highest-priority unlocked tiles in stone age
    civ = build(civ, 'granary', 12);
    civ = build(civ, 'mine', 7);
    civ = moveBuilding(civ, 12, 7); // granary <-> mine
    expect(civ.buildings.find((b) => b.tile === 7)!.id).toBe('granary');
    expect(civ.buildings.find((b) => b.tile === 12)!.id).toBe('mine');
  });

  it('moveBuilding is a no-op (same reference) when from === to', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 12);
    expect(moveBuilding(civ, 12, 12)).toBe(civ);
  });

  it('moveBuilding throws when the source tile has no building', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 12);
    expect(() => moveBuilding(civ, 9, 10)).toThrow();
  });

  it('camp slots start at the base count in the Stone age and grow per age (capped at GRID_SIZE)', () => {
    const civ = { ...newCivState(), banked: { ...RICH } };
    expect(unlockedTileCount(civ)).toBe(CAMP_SLOTS_BASE); // stone
    // advance to bronze (mining -> bronze_working gates bronze) -> one age up
    const bronze = research(research(civ, 'mining'), 'bronze_working');
    expect(unlockedTileCount(bronze)).toBe(CAMP_SLOTS_BASE + CAMP_SLOTS_PER_AGE);
    expect(unlockedTileCount(bronze)).toBeLessThanOrEqual(GRID_SIZE);
  });

  it('cannot build on a tile beyond the age-unlocked range', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    // last tile in unlock order that IS unlocked (rank CAMP_SLOTS_BASE-1)
    const lastUnlocked = TILE_UNLOCK_ORDER[CAMP_SLOTS_BASE - 1];
    // first tile in unlock order that is NOT yet unlocked (rank CAMP_SLOTS_BASE)
    const firstLocked = TILE_UNLOCK_ORDER[CAMP_SLOTS_BASE];
    expect(tileUnlocked(civ, lastUnlocked)).toBe(true);
    expect(tileUnlocked(civ, firstLocked)).toBe(false);
    expect(canBuild(civ, 'granary', firstLocked)).toBe(false); // locked tile
  });

  it('firstEmptyTile only returns unlocked tiles', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    // occupy every unlocked Stone-age tile (by unlock order) -> no free unlocked tile remains
    const filled = TILE_UNLOCK_ORDER.slice(0, CAMP_SLOTS_BASE).map((tile) => ({ id: 'x', level: 1, tile }));
    civ = { ...civ, buildings: filled };
    expect(firstEmptyTile(civ)).toBe(null);
  });

  it('buildingEffectText summarizes per-run yield then run bonus (hp / dmg / draft / weapon names)', () => {
    expect(buildingEffectText(BUILDINGS.granary)).toBe('+60🎭/run · +25 HP');
    expect(buildingEffectText(BUILDINGS.mine)).toBe('+80🏭/run · +5% dmg');
    expect(buildingEffectText(BUILDINGS.forge)).toBe('+60🔬/run · +10% dmg · Bronze Spear');
    expect(buildingEffectText(BUILDINGS.academy)).toBe('+120🔬/run · +1 draft · Gladius');
    expect(buildingEffectText(BUILDINGS.gunsmith)).toBe('+220🏭/run · +16% dmg · Blunderbuss · Grenade');
  });
});

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
    // tile 1 (mine) is closer to center than tile 0 (granary), so mine sorts first in unlock order
    expect(out.buildings.map((b) => ({ id: b.id, level: b.level })))
      .toEqual([{ id: 'mine', level: 1 }, { id: 'granary', level: 2 }]);
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
