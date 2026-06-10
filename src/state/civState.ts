import { CivState, RunResult } from '../game/types';
import { emptyBundle, addBundles, scaleBundle } from '../economy/resources';
import { incomeMult, YIELD_SCALE } from '../game/economy';
import { BUILDINGS } from '../camp/buildingData';

export function newCivState(): CivState {
  return {
    version: 3,
    banked: emptyBundle(),
    researched: [],
    buildings: [],
    traditions: {},
    runs: 0,
  };
}

export function applyRunResult(civ: CivState, result: RunResult): CivState {
  let banked = addBundles(civ.banked, result.collected);
  for (const placed of civ.buildings) {
    const def = BUILDINGS[placed.id];
    if (!def) continue;
    // RC-017: per-run yields scale by the run's tier (low-tier runs pay low on every channel).
    // YIELD_SCALE makes parking income matter relative to in-run pickups.
    const scaled = scaleBundle(def.yield, incomeMult(result.tier) * YIELD_SCALE);
    for (let i = 0; i < placed.level; i++) {
      banked = addBundles(banked, scaled);
    }
  }
  return { ...civ, banked, runs: civ.runs + 1 };
}
