import { describe, it, expect } from 'vitest';
import { BUILDINGS } from '../src/camp/buildingData';
import {
  isBuildingUnlocked, tileOccupied, canBuild, build, upgradeCost, upgradeBuilding,
  buildableBuildings, firstEmptyTile,
} from '../src/camp/camp';
import { newCivState } from '../src/state/civState';
import { research } from '../src/tech/tech';

const RICH = { exploration: 99, science: 99, industry: 99, culture: 99 };

describe('camp', () => {
  it('defines granary, mine, forge, smelter, foundry, deep_mine, classical buildings (academy, market, workshop), medieval buildings (armory, cathedral, keep), renaissance buildings (bank, gunsmith, university), industrial buildings (arsenal, factory, powerplant), and modern buildings (airfield, barracks, motor_pool)', () => {
    expect(Object.keys(BUILDINGS).sort()).toEqual(
      ['academy', 'airfield', 'armory', 'arsenal', 'bank', 'barracks', 'cathedral', 'deep_mine', 'forge', 'foundry', 'factory', 'granary', 'gunsmith', 'keep', 'market', 'mine', 'motor_pool', 'powerplant', 'smelter', 'university', 'workshop'].sort(),
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
    civ = build(civ, 'granary', 4);
    expect(civ.buildings).toEqual([{ id: 'granary', level: 1, tile: 4 }]);
    expect(civ.banked.industry).toBe(beforeIndustry - 10);
    expect(tileOccupied(civ, 4)).toBe(true);
  });

  it('cannot build on an occupied tile', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 4);
    expect(canBuild(civ, 'granary', 4)).toBe(false);
  });

  it('upgradeCost scales with the next level and upgrade raises level', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 4);
    expect(upgradeCost('granary', 1)).toEqual({ industry: 20 });
    civ = upgradeBuilding(civ, 4);
    expect(civ.buildings.find((b) => b.tile === 4)!.level).toBe(2);
  });

  it('cannot upgrade past maxLevel', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 4);
    civ = upgradeBuilding(civ, 4);
    civ = upgradeBuilding(civ, 4);
    expect(() => upgradeBuilding(civ, 4)).toThrow();
  });

  it('canBuild rejects a building whose id is already placed (one of each)', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 0);
    // granary is unlocked, tile 5 is free, and we can afford it — but it already exists.
    expect(canBuild(civ, 'granary', 5)).toBe(false);
  });

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
});
