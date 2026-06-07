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
};
