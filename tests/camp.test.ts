import { describe, it, expect } from 'vitest';
import { BUILDINGS } from '../src/camp/buildingData';
import { isBuildingUnlocked, tileOccupied, canBuild, build, upgradeCost, upgradeBuilding } from '../src/camp/camp';
import { newCivState } from '../src/state/civState';
import { research } from '../src/tech/tech';

const RICH = { exploration: 99, science: 99, industry: 99, culture: 99 };

describe('camp', () => {
  it('defines granary, mine, forge, smelter, foundry, deep_mine', () => {
    expect(Object.keys(BUILDINGS).sort()).toEqual(
      ['deep_mine', 'forge', 'foundry', 'granary', 'mine', 'smelter'],
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
});
