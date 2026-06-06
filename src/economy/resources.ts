import { Resource, RESOURCES, ResourceBundle } from '../game/types';

export function emptyBundle(): ResourceBundle {
  return { exploration: 0, science: 0, industry: 0, culture: 0 };
}

export function addBundles(base: ResourceBundle, add: Partial<ResourceBundle>): ResourceBundle {
  const out = { ...base };
  for (const r of RESOURCES) {
    out[r] = base[r] + (add[r] ?? 0);
  }
  return out;
}

export function canAfford(banked: ResourceBundle, cost: Partial<ResourceBundle>): boolean {
  return (Object.keys(cost) as Resource[]).every((r) => banked[r] >= (cost[r] ?? 0));
}

export function spend(banked: ResourceBundle, cost: Partial<ResourceBundle>): ResourceBundle {
  const out = { ...banked };
  for (const r of Object.keys(cost) as Resource[]) {
    out[r] = banked[r] - (cost[r] ?? 0);
  }
  return out;
}
