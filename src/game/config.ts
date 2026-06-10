// Run length grows with the expedition's age: 1 min in the Stone-age starting area, +1 min per age
// (so a Modern run is 8 min). Short early runs keep the loop snappy; later ages earn their length.
export function runDurationForTier(tier: number): number { return (tier + 1) * 60_000; }

// Base camp grid (5x5 = the hard ceiling). Usable slots are gated by age (see camp.ts): the camp
// starts small and each age unlocks more, so the field fills in as the civ advances.
export const GRID_SIZE = 25;
export const CAMP_SLOTS_BASE = 6;     // usable tiles in the Stone age
export const CAMP_SLOTS_PER_AGE = 3;  // additional tiles unlocked per age advanced (capped at GRID_SIZE)

// Base run power before any civ bonuses.
export const BASE_MAX_HP = 100;
export const BASE_DAMAGE_MULT = 1.0;
export const BASE_DRAFT_CHOICES = 3;
export const BASE_WEAPONS: string[] = ['club'];
