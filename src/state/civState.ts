import { CivState, ResourceBundle, RunResult, RESOURCES } from '../game/types';
import { emptyBundle, addBundles, scaleBundle } from '../economy/resources';
import { incomeMult, YIELD_SCALE } from '../game/economy';
import { BUILDINGS } from '../camp/buildingData';

export function newCivState(): CivState {
  return {
    version: 4,
    banked: emptyBundle(),
    researched: [],
    buildings: [],
    traditions: {},
    runs: 0,
    lifetimeResources: emptyBundle(),
    startWeapon: 'club',
    biomeBests: {},
    kit: ['club'],
    activeItem: undefined,
  };
}

const bundleTotal = (b: ResourceBundle): number => RESOURCES.reduce((s, r) => s + b[r], 0);

/** `biomeId` (from main.ts, which knows the launched expedition) records the per-biome best haul. */
export function applyRunResult(civ: CivState, result: RunResult, biomeId?: string): CivState {
  let banked = addBundles(civ.banked, result.collected);
  // Lifetime tally (RC-023 record strip) accumulates everything earned — in-run pickups + building
  // yields. Lazy-default for pre-existing v3 saves that predate the field.
  let lifetime = addBundles(civ.lifetimeResources ?? emptyBundle(), result.collected);
  for (const placed of civ.buildings) {
    const def = BUILDINGS[placed.id];
    if (!def) continue;
    // RC-017: per-run yields scale by the run's tier (low-tier runs pay low on every channel).
    // YIELD_SCALE makes parking income matter relative to in-run pickups.
    const scaled = scaleBundle(def.yield, incomeMult(result.tier) * YIELD_SCALE);
    for (let i = 0; i < placed.level; i++) {
      banked = addBundles(banked, scaled);
      lifetime = addBundles(lifetime, scaled);
    }
  }
  // RC-027 per-biome best haul (in-run collection only — biome-specific, excludes passive yields).
  const biomeBests = { ...(civ.biomeBests ?? {}) };
  if (biomeId) {
    const haul = bundleTotal(result.collected);
    if (haul > (biomeBests[biomeId] ?? 0)) biomeBests[biomeId] = haul;
  }
  return { ...civ, banked, lifetimeResources: lifetime, biomeBests, runs: civ.runs + 1 };
}
