import { CivState, Resource, ResourceBundle, BuildingDef } from '../game/types';
import { canAfford, spend } from '../economy/resources';
import { TECHS } from '../tech/techData';
import { BUILDINGS } from './buildingData';
import { GRID_SIZE } from '../game/config';
import { WEAPONS } from '../run/weaponData';

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
