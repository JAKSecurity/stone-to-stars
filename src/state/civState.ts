import { CivState, RunResult } from '../game/types';
import { emptyBundle, addBundles, scaleBundle } from '../economy/resources';
import { incomeMult } from '../game/economy';
import { BUILDINGS } from '../camp/buildingData';

export function newCivState(): CivState {
  return {
    version: 2,
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
    // RC-017: per-run yields scale by the run's tier (low-tier runs pay low on every channel).
    const scaled = scaleBundle(def.yield, incomeMult(result.tier));
    for (let i = 0; i < placed.level; i++) {
      banked = addBundles(banked, scaled);
    }
  }
  return { ...civ, banked, runs: civ.runs + 1 };
}
