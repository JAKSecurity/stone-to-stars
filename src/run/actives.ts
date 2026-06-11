import { ACTIVES } from './activeData';

export const BASE_ACTIVE_CHARGES = 1;

/** The run's active item: the chosen one if unlocked, else the first unlocked, else none. */
export function resolveActiveItem(chosen: string | undefined, unlocked: string[]): string | undefined {
  if (chosen && unlocked.includes(chosen) && ACTIVES[chosen]) return chosen;
  return unlocked.find((id) => ACTIVES[id]);
}
