import { WeaponDef } from '../game/types';
import { MAX_LEVEL_BY_AGE } from './archetypes';

// RC-031 catalog v2: every weapon is one of the 10 verb archetypes; same-age weapons are
// sidegrades (different shapes of one DPS budget — see the band test). Evolved forms are gone:
// fusion (fusion.ts) replaced evolution. All ids here are granted by techs/buildings.
const ml = MAX_LEVEL_BY_AGE;

export const WEAPONS: Record<string, WeaponDef> = {
  // --- Stone / Bronze (maxLevel 2 — first fusion comes fast) ---
  club:         { id: 'club', name: 'Club', tier: 'stone', projectileSprite: 'shot_club',
    archetype: 'bolt', cooldownMs: 500, damage: 12, count: 1, spread: 0, speed: 420,
    maxLevel: ml.stone, levelScaling: { damage: 6, cooldownMs: -60 } },
  bronze_spear: { id: 'bronze_spear', name: 'Bronze Spear', tier: 'bronze', projectileSprite: 'shot_bronze',
    archetype: 'piercer', onHit: { pierce: 1 }, cooldownMs: 600, damage: 14, count: 2, spread: 0.25, speed: 460,
    maxLevel: ml.bronze, levelScaling: { damage: 7 } },

  // --- Iron (maxLevel 3) ---
  iron_pick:    { id: 'iron_pick', name: 'Iron Pick', tier: 'iron', projectileSprite: 'shot_iron_pick',
    archetype: 'piercer', onHit: { pierce: 2 }, cooldownMs: 550, damage: 18, count: 1, spread: 0, speed: 480,
    maxLevel: ml.iron, levelScaling: { damage: 6, cooldownMs: -40 } },
  war_hammer:   { id: 'war_hammer', name: 'War Hammer', tier: 'iron', projectileSprite: 'shot_hammer',
    archetype: 'bolt', cooldownMs: 900, damage: 34, count: 1, spread: 0, speed: 360,
    maxLevel: ml.iron, levelScaling: { damage: 10, cooldownMs: -60 } },
  sawblade:     { id: 'sawblade', name: 'Sawblade', tier: 'iron', projectileSprite: 'shot_sawblade',
    archetype: 'boomerang', onHit: { pierce: 5 }, cooldownMs: 700, damage: 16, count: 1, spread: 0, speed: 300,
    maxLevel: ml.iron, levelScaling: { damage: 5 } },
  flame_jet:    { id: 'flame_jet', name: 'Flame Jet', tier: 'iron', projectileSprite: 'shot_flame',
    archetype: 'trail', cooldownMs: 450, damage: 9, count: 1, spread: 0, speed: 0,
    maxLevel: ml.iron, levelScaling: { damage: 4 } },

  // --- Classical (maxLevel 3) ---
  javelin:      { id: 'javelin', name: 'Javelin', tier: 'classical', projectileSprite: 'shot_javelin',
    archetype: 'piercer', onHit: { pierce: 2 }, cooldownMs: 560, damage: 24, count: 1, spread: 0, speed: 500,
    maxLevel: ml.classical, levelScaling: { damage: 7, cooldownMs: -40 } },
  gladius:      { id: 'gladius', name: 'Gladius', tier: 'classical', projectileSprite: 'shot_gladius',
    archetype: 'bolt', cooldownMs: 380, damage: 20, count: 1, spread: 0, speed: 460,
    maxLevel: ml.classical, levelScaling: { damage: 6, cooldownMs: -30 } },
  ballista:     { id: 'ballista', name: 'Ballista', tier: 'classical', projectileSprite: 'shot_ballista',
    archetype: 'piercer', onHit: { pierce: 3 }, cooldownMs: 1000, damage: 46, count: 1, spread: 0, speed: 540,
    maxLevel: ml.classical, levelScaling: { damage: 14, cooldownMs: -70 } },
  discus:       { id: 'discus', name: 'Discus', tier: 'classical', projectileSprite: 'shot_discus',
    archetype: 'boomerang', onHit: { pierce: 4 }, cooldownMs: 520, damage: 20, count: 1, spread: 0, speed: 380,
    maxLevel: ml.classical, levelScaling: { damage: 6 } },

  // --- Medieval (maxLevel 4) ---
  crossbow:     { id: 'crossbow', name: 'Crossbow', tier: 'medieval', projectileSprite: 'shot_bolt',
    archetype: 'bolt', cooldownMs: 650, damage: 30, count: 1, spread: 0, speed: 560,
    maxLevel: ml.medieval, levelScaling: { damage: 9, cooldownMs: -40 } },
  longsword:    { id: 'longsword', name: 'Longsword', tier: 'medieval', projectileSprite: 'shot_slash',
    archetype: 'spread', cooldownMs: 420, damage: 18, count: 3, spread: 0.45, speed: 470,
    maxLevel: ml.medieval, levelScaling: { damage: 6 } },
  halberd:      { id: 'halberd', name: 'Halberd', tier: 'medieval', projectileSprite: 'shot_halberd',
    archetype: 'piercer', onHit: { pierce: 3 }, cooldownMs: 820, damage: 44, count: 1, spread: 0, speed: 420,
    maxLevel: ml.medieval, levelScaling: { damage: 13, cooldownMs: -50 } },
  flail:        { id: 'flail', name: 'Flail', tier: 'medieval', projectileSprite: 'shot_flail',
    archetype: 'orbiter', cooldownMs: 560, damage: 18, count: 3, spread: 0.5, speed: 360,
    maxLevel: ml.medieval, levelScaling: { damage: 6, count: 1 } },

  // --- Renaissance (maxLevel 4) ---
  musket:       { id: 'musket', name: 'Musket', tier: 'renaissance', projectileSprite: 'shot_musket',
    archetype: 'bolt', cooldownMs: 900, damage: 58, count: 1, spread: 0, speed: 640,
    maxLevel: ml.renaissance, levelScaling: { damage: 16, cooldownMs: -60 } },
  blunderbuss:  { id: 'blunderbuss', name: 'Blunderbuss', tier: 'renaissance', projectileSprite: 'shot_pellet',
    archetype: 'spread', cooldownMs: 750, damage: 14, count: 5, spread: 0.7, speed: 420,
    maxLevel: ml.renaissance, levelScaling: { damage: 5, count: 1 } },
  volley_pistols:{ id: 'volley_pistols', name: 'Volley Pistols', tier: 'renaissance', projectileSprite: 'shot_pistol',
    archetype: 'chain', onHit: { chain: 2 }, cooldownMs: 520, damage: 24, count: 1, spread: 0, speed: 560,
    maxLevel: ml.renaissance, levelScaling: { damage: 8, cooldownMs: -30 } },
  grenade:      { id: 'grenade', name: 'Grenade', tier: 'renaissance', projectileSprite: 'shot_grenade',
    archetype: 'lobber', onHit: { explode: 64 }, cooldownMs: 1000, damage: 40, count: 2, spread: 0.4, speed: 300,
    maxLevel: ml.renaissance, levelScaling: { damage: 12 } },

  // --- Industrial (maxLevel 5) ---
  gatling:      { id: 'gatling', name: 'Gatling Gun', tier: 'industrial', projectileSprite: 'shot_bullet',
    archetype: 'bolt', cooldownMs: 360, damage: 16, count: 1, spread: 0, speed: 700,
    maxLevel: ml.industrial, levelScaling: { damage: 5, cooldownMs: -15 } },
  flamethrower: { id: 'flamethrower', name: 'Flamethrower', tier: 'industrial', projectileSprite: 'shot_fire',
    archetype: 'trail', cooldownMs: 260, damage: 8, count: 1, spread: 0, speed: 0,
    maxLevel: ml.industrial, levelScaling: { damage: 3 } },
  dynamite:     { id: 'dynamite', name: 'Dynamite', tier: 'industrial', projectileSprite: 'shot_dynamite',
    archetype: 'zone', onHit: { explode: 48, zoneMs: 2500 }, cooldownMs: 1100, damage: 30, count: 2, spread: 0.5, speed: 300,
    maxLevel: ml.industrial, levelScaling: { damage: 9 } },
  tesla_coil:   { id: 'tesla_coil', name: 'Tesla Coil', tier: 'industrial', projectileSprite: 'shot_spark',
    archetype: 'chain', onHit: { chain: 3 }, cooldownMs: 600, damage: 34, count: 1, spread: 0, speed: 620,
    maxLevel: ml.industrial, levelScaling: { damage: 11, cooldownMs: -40 } },

  // --- Modern (maxLevel 5) ---
  assault_rifle:{ id: 'assault_rifle', name: 'Assault Rifle', tier: 'modern', projectileSprite: 'shot_round',
    archetype: 'bolt', cooldownMs: 200, damage: 22, count: 1, spread: 0, speed: 760,
    maxLevel: ml.modern, levelScaling: { damage: 6, cooldownMs: -15 } },
  rpg:          { id: 'rpg', name: 'RPG', tier: 'modern', projectileSprite: 'shot_rocket',
    archetype: 'homing', onHit: { explode: 64 }, cooldownMs: 1100, damage: 72, count: 1, spread: 0, speed: 360,
    maxLevel: ml.modern, levelScaling: { damage: 22 } },
  mortar:       { id: 'mortar', name: 'Mortar', tier: 'modern', projectileSprite: 'shot_shell',
    archetype: 'lobber', onHit: { explode: 80 }, cooldownMs: 950, damage: 54, count: 2, spread: 0.6, speed: 300,
    maxLevel: ml.modern, levelScaling: { damage: 16 } },
  sniper:       { id: 'sniper', name: 'Sniper Rifle', tier: 'modern', projectileSprite: 'shot_tracer',
    archetype: 'piercer', onHit: { pierce: 3, ignoreArmor: true }, cooldownMs: 1000, damage: 90, count: 1, spread: 0, speed: 900,
    maxLevel: ml.modern, levelScaling: { damage: 26, cooldownMs: -60 } },
};
