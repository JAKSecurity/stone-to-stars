import { CivState, Resource, ResourceBundle, BuildingDef } from '../game/types';
import { canAfford, spend } from '../economy/resources';
import { costMult, ageIndexOf, COST_BASE } from '../game/economy';
import { TECHS } from '../tech/techData';
import { getAge } from '../tech/tech';
import { BUILDINGS } from './buildingData';
import { GRID_SIZE, CAMP_SLOTS_BASE, CAMP_SLOTS_PER_AGE } from '../game/config';

// buildingEffectText lives in buildingData (no tech dependency) but is re-exported here so existing
// callers/tests keep importing it from camp.
export { buildingEffectText } from './buildingData';

// RC-017: a building's flat base cost is derived; G^age (via costMult) and the level multiplier do
// the scaling, so `baseCost` data only supplies the resource types + order (largest = primary).
const BUILDING_BASE = { primary: 12, secondary: 6 };

/** Age-scaled cost of building `id` at `level`: flat base × COST_BASE × G^age × level. */
export function buildingCost(id: string, level: number): Partial<ResourceBundle> {
  const def = BUILDINGS[id];
  const mult = COST_BASE * costMult(ageIndexOf(def.age)) * level;
  // Largest current component = primary. Ties (e.g. foundry industry==science) fall back to key
  // insertion order — deterministic and identical for charge + display; re-keying would swap them.
  const entries = (Object.entries(def.baseCost) as [Resource, number][]).sort((a, b) => b[1] - a[1]);
  const out: Partial<ResourceBundle> = {};
  if (entries[0]) out[entries[0][0]] = Math.round(BUILDING_BASE.primary * mult);
  if (entries[1]) out[entries[1][0]] = Math.round(BUILDING_BASE.secondary * mult);
  return out;
}

export function isBuildingUnlocked(civ: CivState, buildingId: string): boolean {
  return civ.researched.some((t) => TECHS[t]?.unlocksBuilding === buildingId);
}

/** How many camp tiles are usable at the civ's current age: base + per-age, capped at GRID_SIZE. */
export function unlockedTileCount(civ: CivState): number {
  const ageIdx = ageIndexOf(getAge(civ));
  return Math.min(GRID_SIZE, CAMP_SLOTS_BASE + CAMP_SLOTS_PER_AGE * ageIdx);
}

/** Whether tile index `tile` is unlocked at the civ's current age (tiles fill in low-index first). */
export function tileUnlocked(civ: CivState, tile: number): boolean {
  return tile < unlockedTileCount(civ);
}

export function tileOccupied(civ: CivState, tile: number): boolean {
  return civ.buildings.some((b) => b.tile === tile);
}

export function canBuild(civ: CivState, buildingId: string, tile: number): boolean {
  const def = BUILDINGS[buildingId];
  if (!def) return false;
  if (!isBuildingUnlocked(civ, buildingId)) return false;
  if (!tileUnlocked(civ, tile)) return false; // tile not yet unlocked for this age
  if (civ.buildings.some((b) => b.id === buildingId)) return false; // one of each
  if (tileOccupied(civ, tile)) return false;
  return canAfford(civ.banked, buildingCost(buildingId, 1));
}

export function build(civ: CivState, buildingId: string, tile: number): CivState {
  if (!canBuild(civ, buildingId, tile)) {
    throw new Error(`Cannot build ${buildingId} on tile ${tile}`);
  }
  return {
    ...civ,
    banked: spend(civ.banked, buildingCost(buildingId, 1)),
    buildings: [...civ.buildings, { id: buildingId, level: 1, tile }],
  };
}

/** Cost to raise a building from `currentLevel` to the next level (= buildingCost at level+1). */
export function upgradeCost(buildingId: string, currentLevel: number): Partial<ResourceBundle> {
  return buildingCost(buildingId, currentLevel + 1);
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

/** Lowest unlocked tile with no building, or null if every unlocked tile is occupied. */
export function firstEmptyTile(civ: CivState): number | null {
  const unlocked = unlockedTileCount(civ);
  for (let tile = 0; tile < unlocked; tile++) {
    if (!tileOccupied(civ, tile)) return tile;
  }
  return null;
}

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
