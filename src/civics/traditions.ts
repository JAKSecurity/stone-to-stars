import { CivState, ResourceBundle, AGE_ORDER } from '../game/types';
import { canAfford, spend } from '../economy/resources';
import { getAge } from '../tech/tech';
import { TRADITIONS, COST_G } from './traditionData';

export function traditionRank(civ: CivState, id: string): number {
  return civ.traditions[id] ?? 0;
}

/** Culture cost of the NEXT rank, or null if maxed / unknown id. */
export function nextRankCost(civ: CivState, id: string): number | null {
  const def = TRADITIONS[id];
  if (!def) return null;
  const rank = traditionRank(civ, id);
  if (rank >= def.maxRank) return null;
  return Math.round(def.base * COST_G ** rank);
}

/** The next-rank cost as a culture-only ResourceBundle fragment, or null if maxed. */
export function nextRankCostBundle(civ: CivState, id: string): Partial<ResourceBundle> | null {
  const cost = nextRankCost(civ, id);
  return cost === null ? null : { culture: cost };
}

function ageSatisfied(civ: CivState, id: string): boolean {
  const def = TRADITIONS[id];
  if (!def?.requiresAge) return true;
  return AGE_ORDER.indexOf(getAge(civ)) >= AGE_ORDER.indexOf(def.requiresAge);
}

export function canBuyTradition(civ: CivState, id: string): boolean {
  const bundle = nextRankCostBundle(civ, id); // null => maxed/unknown
  if (!bundle) return false;
  if (!ageSatisfied(civ, id)) return false;
  return canAfford(civ.banked, bundle);
}

/** Buy the next rank. Returns a NEW civ, or the SAME ref unchanged if the purchase is illegal. */
export function buyTradition(civ: CivState, id: string): CivState {
  if (!canBuyTradition(civ, id)) return civ;
  const bundle = nextRankCostBundle(civ, id)!;
  return {
    ...civ,
    banked: spend(civ.banked, bundle),
    traditions: { ...civ.traditions, [id]: traditionRank(civ, id) + 1 },
  };
}
