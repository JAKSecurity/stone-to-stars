import { WeaponDef } from '../game/types';

// The weapon catalog. Civ unlocks add weapon ids to a run's draftable pool;
// the player starts every run with only the base club equipped (see weapons.ts).
// Evolution content (evolvesTo / evolveRequiresPerk) is wired in RC-008.
export const WEAPONS: Record<string, WeaponDef> = {
  club: {
    id: 'club', name: 'Club', tier: 'stone',
    projectileSprite: 'shot_club',
    cooldownMs: 500, damage: 12, count: 1, spread: 0, speed: 420,
    behavior: 'straight',
    maxLevel: 5,
    levelScaling: { damage: 4, cooldownMs: -40 },
  },
  bronze_spear: {
    id: 'bronze_spear', name: 'Bronze Spear', tier: 'bronze',
    projectileSprite: 'shot_bronze',
    cooldownMs: 600, damage: 14, count: 2, spread: 0.25, speed: 460,
    behavior: 'pierce', pierce: 1,
    maxLevel: 5,
    levelScaling: { damage: 5, cooldownMs: -40 },
  },
};
