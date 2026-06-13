import { AgeId } from './types';
import { BIOMES } from '../run/biomeData';
import { TECHS } from '../tech/techData';
import { BUILDINGS } from '../camp/buildingData';
import { WEAPONS } from '../run/weaponData';

export interface AgeUnlocks {
  biomes: string[];   // biome names gated to this age (minAge)
  weapons: string[];  // weapon names tiered to this age
  techs: string[];    // tech names belonging to this age
  buildings: string[];// building names belonging to this age
}

/**
 * What the game data introduces AT `age`: biomes gated to it, weapons tiered to it, and the
 * techs/buildings that belong to it. Pure + data-derived (no hand-written strings) — drives the
 * RC-024 age-up celebration's "what just unlocked" list.
 */
export function ageUnlocks(age: AgeId): AgeUnlocks {
  return {
    // RC-042: finale biomes are tech-gated surprises — the age-up celebration must not
    // pre-announce The Last Stand.
    biomes: Object.values(BIOMES).filter((b) => b.minAge === age && !b.finale).map((b) => b.name),
    weapons: Object.values(WEAPONS).filter((w) => w.tier === age).map((w) => w.name),
    techs: Object.values(TECHS).filter((t) => t.age === age).map((t) => t.name),
    buildings: Object.values(BUILDINGS).filter((b) => b.age === age).map((b) => b.name),
  };
}
