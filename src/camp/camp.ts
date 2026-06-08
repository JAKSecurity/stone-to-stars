import { CivState, Resource, ResourceBundle, BuildingDef } from '../game/types';
import { canAfford, spend } from '../economy/resources';
import { TECHS } from '../tech/techData';
import { BUILDINGS } from './buildingData';
import { GRID_SIZE } from '../game/config';

export function isBuildingUnlocked(civ: CivState, buildingId: string): boolean {
  return civ.researched.some((t) => TECHS[t]?.unlocksBuilding === buildingId);
}

export function tileOccupied(civ: CivState, tile: number): boolean {
  return civ.buildings.some((b) => b.tile === tile);
}

export function canBuild(civ: CivState, buildingId: string, tile: number): boolean {
  const def = BUILDINGS[buildingId];
  if (!def) return false;
  if (!isBuildingUnlocked(civ, buildingId)) return false;
  if (civ.buildings.some((b) => b.id === buildingId)) return false; // one of each
  if (tileOccupied(civ, tile)) return false;
  return canAfford(civ.banked, def.baseCost);
}

export function build(civ: CivState, buildingId: string, tile: number): CivState {
  if (!canBuild(civ, buildingId, tile)) {
    throw new Error(`Cannot build ${buildingId} on tile ${tile}`);
  }
  const def = BUILDINGS[buildingId];
  return {
    ...civ,
    banked: spend(civ.banked, def.baseCost),
    buildings: [...civ.buildings, { id: buildingId, level: 1, tile }],
  };
}

export function upgradeCost(buildingId: string, currentLevel: number): Partial<ResourceBundle> {
  const def = BUILDINGS[buildingId];
  const out: Partial<ResourceBundle> = {};
  for (const r of Object.keys(def.baseCost) as Resource[]) {
    out[r] = (def.baseCost[r] ?? 0) * (currentLevel + 1);
  }
  return out;
}

export function upgradeBuilding(civ: CivState, tile: number): CivState {
  const placed = civ.buildings.find((b) => b.tile === tile);
  if (!placed) throw new Error(`No building on tile ${tile}`);
  const def = BUILDINGS[placed.id];
  if (placed.level >= def.maxLevel) throw new Error(`${placed.id} is at max level`);
  const cost = upgradeCost(placed.id, placed.level);
  if (!canAfford(civ.banked, cost)) throw new Error(`Cannot afford upgrade`);
  return {
    ...civ,
    banked: spend(civ.banked, cost),
    buildings: civ.buildings.map((b) =>
      b.tile === tile ? { ...b, level: b.level + 1 } : b,
    ),
  };
}

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
