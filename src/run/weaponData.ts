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
    evolvesTo: 'iron_lance', evolveRequiresPerk: 'swift',
  },

  // --- Iron Age base weapons ---
  iron_pick: {
    id: 'iron_pick', name: 'Iron Pick', tier: 'iron',
    projectileSprite: 'shot_iron_pick',
    cooldownMs: 550, damage: 18, count: 1, spread: 0, speed: 480,
    behavior: 'pierce', pierce: 2,
    maxLevel: 5,
    levelScaling: { damage: 6, cooldownMs: -40 },
    evolvesTo: 'ricochet_pick', evolveRequiresPerk: 'magnet',
  },
  war_hammer: {
    id: 'war_hammer', name: 'War Hammer', tier: 'iron',
    projectileSprite: 'shot_hammer',
    cooldownMs: 900, damage: 34, count: 1, spread: 0, speed: 360,
    behavior: 'straight',
    maxLevel: 5,
    levelScaling: { damage: 10, cooldownMs: -60 },
    evolvesTo: 'war_maul', evolveRequiresPerk: 'vigor',
  },
  sawblade: {
    id: 'sawblade', name: 'Sawblade', tier: 'iron',
    projectileSprite: 'shot_sawblade',
    cooldownMs: 700, damage: 16, count: 1, spread: 0, speed: 300,
    behavior: 'pierce', pierce: 4,
    maxLevel: 5,
    levelScaling: { damage: 5 },
    evolvesTo: 'buzzsaw', evolveRequiresPerk: 'rapid',
  },
  flame_jet: {
    id: 'flame_jet', name: 'Flame Jet', tier: 'iron',
    projectileSprite: 'shot_flame',
    cooldownMs: 450, damage: 10, count: 3, spread: 0.5, speed: 340,
    behavior: 'cone',
    maxLevel: 5,
    levelScaling: { damage: 4 },
    evolvesTo: 'forgefire', evolveRequiresPerk: 'sharpen',
  },

  // --- Iron Age evolved forms ---
  iron_lance: {
    id: 'iron_lance', name: 'Iron Lance', tier: 'iron',
    projectileSprite: 'shot_bronze',
    cooldownMs: 520, damage: 22, count: 3, spread: 0.2, speed: 520,
    behavior: 'pierce', pierce: 3,
    maxLevel: 5,
    levelScaling: { damage: 7 },
  },
  ricochet_pick: {
    id: 'ricochet_pick', name: 'Ricochet Pick', tier: 'iron',
    projectileSprite: 'shot_iron_pick',
    cooldownMs: 480, damage: 24, count: 2, spread: 0.3, speed: 520,
    behavior: 'pierce', pierce: 4,
    maxLevel: 5,
    levelScaling: { damage: 8 },
  },
  war_maul: {
    id: 'war_maul', name: 'War Maul', tier: 'iron',
    projectileSprite: 'shot_hammer',
    cooldownMs: 820, damage: 52, count: 1, spread: 0, speed: 380,
    behavior: 'straight',
    maxLevel: 5,
    levelScaling: { damage: 14, cooldownMs: -60 },
  },
  buzzsaw: {
    id: 'buzzsaw', name: 'Buzzsaw', tier: 'iron',
    projectileSprite: 'shot_sawblade',
    cooldownMs: 520, damage: 22, count: 2, spread: 0.4, speed: 340,
    behavior: 'pierce', pierce: 6,
    maxLevel: 5,
    levelScaling: { damage: 7 },
  },
  forgefire: {
    id: 'forgefire', name: 'Forgefire', tier: 'iron',
    projectileSprite: 'shot_flame',
    cooldownMs: 380, damage: 16, count: 4, spread: 0.6, speed: 360,
    behavior: 'cone',
    maxLevel: 5,
    levelScaling: { damage: 6 },
  },
};
