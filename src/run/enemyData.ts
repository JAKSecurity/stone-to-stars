import { EnemyDef } from '../game/types';

// Stone enemies (also reused by the Bronze biome). Buffed from the original (beast 24/60/6,
// scholar 18/70/5) — the early game was unthreatening: enemies were too slow to reach you and
// too soft to matter. Faster + tankier + harder-hitting so you can actually be swarmed. Tune by feel.
//
// `attack`: ~1/4 of types fire a slow, dodgeable projectile — 'ranged' shoot from afar, 'melee' only
// when you're close. `armor`: heavy units absorb that many hits before HP damage (sniper bypasses it),
// so the tanky mobs always take several shots no matter how strong your weapon. Global bullet cap in
// RunScene keeps ≤10 enemy projectiles on screen at once.
export const ENEMIES: Record<string, EnemyDef> = {
  beast: {
    id: 'beast', name: 'Beast', sprite: 'beast',
    baseHp: 32, speed: 105, contactDamage: 10, drop: 'industry', xp: 3,
    displaySize: { w: 29, h: 26 }, attack: 'melee',
  },
  scholar: {
    id: 'scholar', name: 'Scholar', sprite: 'scholar',
    baseHp: 24, speed: 110, contactDamage: 8, drop: 'science', xp: 3,
    displaySize: { w: 20, h: 26 }, attack: 'ranged',
  },
  cave_dweller: {
    id: 'cave_dweller', name: 'Cave Dweller', sprite: 'cave_dweller',
    baseHp: 30, speed: 80, contactDamage: 7, drop: 'industry', xp: 4,
    displaySize: { w: 26, h: 28 },
  },
  rock_golem: {
    id: 'rock_golem', name: 'Rock Golem', sprite: 'rock_golem',
    baseHp: 90, speed: 35, contactDamage: 14, drop: 'industry', xp: 9,
    displaySize: { w: 38, h: 40 }, armor: 1,
  },
  automaton: {
    id: 'automaton', name: 'Automaton', sprite: 'automaton',
    baseHp: 45, speed: 60, contactDamage: 8, drop: 'science', xp: 6,
    displaySize: { w: 30, h: 34 }, armor: 1,
  },
  iron_golem: {
    id: 'iron_golem', name: 'Iron Golem', sprite: 'iron_golem',
    baseHp: 200, speed: 30, contactDamage: 20, drop: 'industry', xp: 25,
    displaySize: { w: 48, h: 52 }, armor: 2,
  },
  harpy: { id: 'harpy', name: 'Harpy', sprite: 'harpy',
    baseHp: 40, speed: 115, contactDamage: 9, drop: 'culture', xp: 5, displaySize: { w: 34, h: 30 }, attack: 'ranged' },
  hoplite: { id: 'hoplite', name: 'Hoplite', sprite: 'hoplite',
    baseHp: 110, speed: 55, contactDamage: 14, drop: 'industry', xp: 9, displaySize: { w: 30, h: 40 }, armor: 1, attack: 'melee' },
  centaur: { id: 'centaur', name: 'Centaur', sprite: 'centaur',
    baseHp: 75, speed: 95, contactDamage: 12, drop: 'industry', xp: 7, displaySize: { w: 42, h: 40 }, attack: 'melee' },
  cyclops: { id: 'cyclops', name: 'Cyclops', sprite: 'cyclops',
    baseHp: 260, speed: 35, contactDamage: 22, drop: 'industry', xp: 28, displaySize: { w: 50, h: 56 }, armor: 2 },
  skeleton: { id: 'skeleton', name: 'Skeleton', sprite: 'skeleton',
    baseHp: 35, speed: 90, contactDamage: 8, drop: 'industry', xp: 4, displaySize: { w: 26, h: 34 }, attack: 'melee' },
  knight: { id: 'knight', name: 'Knight', sprite: 'knight',
    baseHp: 130, speed: 50, contactDamage: 16, drop: 'industry', xp: 11, displaySize: { w: 30, h: 40 }, armor: 1 },
  gargoyle: { id: 'gargoyle', name: 'Gargoyle', sprite: 'gargoyle',
    baseHp: 70, speed: 105, contactDamage: 12, drop: 'culture', xp: 7, displaySize: { w: 38, h: 32 }, attack: 'ranged' },
  dragon: { id: 'dragon', name: 'Dragon', sprite: 'dragon',
    baseHp: 320, speed: 45, contactDamage: 26, drop: 'industry', xp: 34, displaySize: { w: 58, h: 48 }, armor: 1, attack: 'ranged' },
  musketeer: { id: 'musketeer', name: 'Musketeer', sprite: 'musketeer',
    baseHp: 60, speed: 80, contactDamage: 13, drop: 'science', xp: 7, displaySize: { w: 28, h: 38 }, attack: 'ranged' },
  pikeman: { id: 'pikeman', name: 'Pikeman', sprite: 'pikeman',
    baseHp: 150, speed: 55, contactDamage: 18, drop: 'industry', xp: 12, displaySize: { w: 30, h: 42 }, armor: 1 },
  grenadier: { id: 'grenadier', name: 'Grenadier', sprite: 'grenadier',
    baseHp: 85, speed: 100, contactDamage: 15, drop: 'industry', xp: 9, displaySize: { w: 30, h: 38 }, attack: 'ranged' },
  dreadnought: { id: 'dreadnought', name: 'Dreadnought', sprite: 'dreadnought',
    baseHp: 380, speed: 40, contactDamage: 30, drop: 'industry', xp: 40, displaySize: { w: 56, h: 54 }, armor: 2 },
  riveter: { id: 'riveter', name: 'Riveter', sprite: 'riveter',
    baseHp: 50, speed: 95, contactDamage: 12, drop: 'industry', xp: 6, displaySize: { w: 26, h: 30 }, attack: 'melee' },
  steam_tank: { id: 'steam_tank', name: 'Steam Tank', sprite: 'steam_tank',
    baseHp: 200, speed: 45, contactDamage: 22, drop: 'industry', xp: 16, displaySize: { w: 44, h: 36 }, armor: 2 },
  drone: { id: 'drone', name: 'Drone', sprite: 'drone',
    baseHp: 80, speed: 120, contactDamage: 14, drop: 'science', xp: 9, displaySize: { w: 32, h: 26 }, attack: 'ranged' },
  mecha: { id: 'mecha', name: 'Mecha', sprite: 'mecha',
    baseHp: 460, speed: 38, contactDamage: 34, drop: 'industry', xp: 48, displaySize: { w: 60, h: 60 }, armor: 2 },
  rifleman: { id: 'rifleman', name: 'Rifleman', sprite: 'rifleman',
    baseHp: 65, speed: 100, contactDamage: 15, drop: 'industry', xp: 7, displaySize: { w: 26, h: 36 }, attack: 'ranged' },
  halftrack: { id: 'halftrack', name: 'Halftrack', sprite: 'halftrack',
    baseHp: 240, speed: 50, contactDamage: 26, drop: 'industry', xp: 18, displaySize: { w: 48, h: 34 }, armor: 2 },
  gunship: { id: 'gunship', name: 'Gunship', sprite: 'gunship',
    baseHp: 95, speed: 130, contactDamage: 16, drop: 'science', xp: 10, displaySize: { w: 40, h: 28 }, attack: 'ranged' },
  juggernaut: { id: 'juggernaut', name: 'Juggernaut', sprite: 'juggernaut',
    baseHp: 540, speed: 36, contactDamage: 38, drop: 'industry', xp: 55, displaySize: { w: 62, h: 62 }, armor: 3 },
};
