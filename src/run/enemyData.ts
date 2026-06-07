import { EnemyDef } from '../game/types';

// RC-007 reuses the two existing sprites (beast, scholar). New enemy types + art
// land in RC-008. Values for beast match the pre-RC-007 hardcoded enemy (24 hp,
// 6 contact, 3 xp, ~29x26) so The Wilds plays as before at tier 0.
export const ENEMIES: Record<string, EnemyDef> = {
  beast: {
    id: 'beast', name: 'Beast', sprite: 'beast',
    baseHp: 24, speed: 60, contactDamage: 6, drop: 'industry', xp: 3,
    displaySize: { w: 29, h: 26 },
  },
  scholar: {
    id: 'scholar', name: 'Scholar', sprite: 'scholar',
    baseHp: 18, speed: 70, contactDamage: 5, drop: 'science', xp: 3,
    displaySize: { w: 20, h: 26 },
  },
  cave_dweller: {
    id: 'cave_dweller', name: 'Cave Dweller', sprite: 'cave_dweller',
    baseHp: 30, speed: 80, contactDamage: 7, drop: 'industry', xp: 4,
    displaySize: { w: 26, h: 28 },
  },
  rock_golem: {
    id: 'rock_golem', name: 'Rock Golem', sprite: 'rock_golem',
    baseHp: 90, speed: 35, contactDamage: 14, drop: 'industry', xp: 9,
    displaySize: { w: 38, h: 40 },
  },
  automaton: {
    id: 'automaton', name: 'Automaton', sprite: 'automaton',
    baseHp: 45, speed: 60, contactDamage: 8, drop: 'science', xp: 6,
    displaySize: { w: 30, h: 34 },
  },
  iron_golem: {
    id: 'iron_golem', name: 'Iron Golem', sprite: 'iron_golem',
    baseHp: 200, speed: 30, contactDamage: 20, drop: 'industry', xp: 25,
    displaySize: { w: 48, h: 52 },
  },
};
