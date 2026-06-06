import { AgeId, AGE_ORDER, CivState } from '../game/types';
import { canAfford, spend } from '../economy/resources';
import { TECHS } from './techData';

export function isResearched(civ: CivState, techId: string): boolean {
  return civ.researched.includes(techId);
}

export function canResearch(civ: CivState, techId: string): boolean {
  const tech = TECHS[techId];
  if (!tech) return false;
  if (isResearched(civ, techId)) return false;
  if (!tech.requires.every((req) => isResearched(civ, req))) return false;
  return canAfford(civ.banked, tech.cost);
}

export function research(civ: CivState, techId: string): CivState {
  if (!canResearch(civ, techId)) {
    throw new Error(`Cannot research ${techId}`);
  }
  const tech = TECHS[techId];
  return {
    ...civ,
    banked: spend(civ.banked, tech.cost),
    researched: [...civ.researched, techId],
  };
}

export function getAge(civ: CivState): AgeId {
  let best: AgeId = 'stone';
  for (const techId of civ.researched) {
    const gated = TECHS[techId]?.gatesAge;
    if (gated && AGE_ORDER.indexOf(gated) > AGE_ORDER.indexOf(best)) {
      best = gated;
    }
  }
  return best;
}

export function techUnlocksBuilding(techId: string): string | undefined {
  return TECHS[techId]?.unlocksBuilding;
}
