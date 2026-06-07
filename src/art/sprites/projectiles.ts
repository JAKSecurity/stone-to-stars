import { SpriteDef } from '../types';
import { PAL } from '../palette';

export const SHOT_CLUB: SpriteDef = {
  id: 'shot_club', w: 10, h: 10, shadow: false,
  prims: [{ kind: 'circle', cx: 5, cy: 5, r: 4, color: PAL.trim, role: 'shot' }],
};

export const SHOT_BRONZE: SpriteDef = {
  id: 'shot_bronze', w: 14, h: 14, shadow: false,
  prims: [{ kind: 'poly', points: [[7, 1], [10, 9], [7, 13], [4, 9]], color: '#cd7f32', role: 'spearhead' }],
};

// Iron Age projectile sprites

export const SHOT_IRON_PICK: SpriteDef = {
  id: 'shot_iron_pick', w: 14, h: 12, shadow: false,
  prims: [
    { kind: 'poly', points: [[1, 5], [10, 1], [13, 6], [10, 11], [1, 7]], color: PAL.iron, role: 'body' },
    { kind: 'poly', points: [[10, 1], [13, 6], [10, 11]], color: PAL.ironDark, role: 'tip' },
  ],
};

export const SHOT_HAMMER: SpriteDef = {
  id: 'shot_hammer', w: 14, h: 14, shadow: false,
  prims: [
    { kind: 'rect', x: 2, y: 3, w: 10, h: 8, color: PAL.steel, role: 'head' },
    { kind: 'rect', x: 6, y: 11, w: 2, h: 3, color: PAL.ironDark, role: 'handle' },
  ],
};

export const SHOT_SAWBLADE: SpriteDef = {
  id: 'shot_sawblade', w: 16, h: 16, shadow: false,
  prims: [
    { kind: 'circle', cx: 8, cy: 8, r: 5, color: PAL.iron, role: 'disc' },
    // jagged teeth around the disc
    { kind: 'poly', points: [[8, 1], [10, 4], [11, 1], [13, 5], [15, 3], [13, 7], [15, 9], [12, 10], [13, 13], [10, 12], [8, 15], [6, 12], [3, 13], [4, 10], [1, 9], [3, 7], [1, 3], [5, 5], [5, 1]], color: PAL.ironDark, role: 'teeth' },
  ],
};

export const SHOT_FLAME: SpriteDef = {
  id: 'shot_flame', w: 12, h: 16, shadow: false,
  prims: [
    { kind: 'poly', points: [[6, 1], [10, 6], [11, 11], [8, 15], [4, 15], [1, 11], [2, 6]], color: PAL.molten, role: 'flame' },
    { kind: 'poly', points: [[6, 5], [8, 9], [7, 13], [5, 13], [4, 9]], color: PAL.ember, role: 'core' },
  ],
};

// Classical Age projectile sprites

export const SHOT_JAVELIN: SpriteDef = {
  id: 'shot_javelin', w: 14, h: 14, shadow: false,
  prims: [
    // shaft — narrow diagonal poly running top-left to bottom-right
    { kind: 'poly', points: [[2, 12], [4, 12], [12, 2], [10, 2]], color: PAL.goldDark, role: 'shaft' },
    // tip — small marble diamond at the top-right end
    { kind: 'poly', points: [[10, 1], [13, 4], [11, 5], [9, 3]], color: PAL.marble, role: 'tip' },
  ],
};

export const SHOT_GLADIUS: SpriteDef = {
  id: 'shot_gladius', w: 14, h: 14, shadow: false,
  prims: [
    // blade — short marble stabbing blade
    { kind: 'poly', points: [[5, 1], [9, 1], [9, 9], [7, 13], [5, 9]], color: PAL.marble, role: 'blade' },
    // hilt nub — goldDark crossguard
    { kind: 'rect', x: 3, y: 9, w: 8, h: 3, rx: 1, color: PAL.goldDark, role: 'hilt' },
  ],
};

export const SHOT_BALLISTA: SpriteDef = {
  id: 'shot_ballista', w: 16, h: 12, shadow: false,
  prims: [
    // bolt body — elongated leather-colored shaft
    { kind: 'poly', points: [[1, 4], [12, 4], [12, 8], [1, 8]], color: PAL.leather, role: 'bolt' },
    // head — gold triangular point
    { kind: 'poly', points: [[12, 2], [15, 6], [12, 10]], color: PAL.gold, role: 'head' },
    // flights — goldDark fin at the tail
    { kind: 'poly', points: [[1, 4], [4, 2], [4, 4]], color: PAL.goldDark, role: 'flight' },
    { kind: 'poly', points: [[1, 8], [4, 10], [4, 8]], color: PAL.goldDark, role: 'flight' },
  ],
};

export const SHOT_DISCUS: SpriteDef = {
  id: 'shot_discus', w: 14, h: 14, shadow: false,
  prims: [
    // outer disc — gold
    { kind: 'circle', cx: 7, cy: 7, r: 6, color: PAL.gold, role: 'disc' },
    // inner ring — goldDark for depth
    { kind: 'circle', cx: 7, cy: 7, r: 3, color: PAL.goldDark, role: 'ring' },
  ],
};

export const PROJECTILES: SpriteDef[] = [
  SHOT_CLUB,
  SHOT_BRONZE,
  SHOT_IRON_PICK,
  SHOT_HAMMER,
  SHOT_SAWBLADE,
  SHOT_FLAME,
  SHOT_JAVELIN,
  SHOT_GLADIUS,
  SHOT_BALLISTA,
  SHOT_DISCUS,
];
