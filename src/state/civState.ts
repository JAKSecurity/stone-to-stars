import { CivState, RunResult } from '../game/types';
import { emptyBundle, addBundles } from '../economy/resources';
import { BUILDINGS } from '../camp/buildingData';

export function newCivState(): CivState {
  return {
    version: 1,
    banked: emptyBundle(),
    researched: [],
    buildings: [],
    runs: 0,
  };
}

export function applyRunResult(civ: CivState, result: RunResult): CivState {
  let banked = addBundles(civ.banked, result.collected);
  for (const placed of civ.buildings) {
    const def = BUILDINGS[placed.id];
    if (!def) continue;
    for (let i = 0; i < placed.level; i++) {
      banked = addBundles(banked, def.yield);
    }
  }
  return { ...civ, banked, runs: civ.runs + 1 };
}
