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

// Medieval Age projectile sprites

export const SHOT_BOLT: SpriteDef = {
  id: 'shot_bolt', w: 14, h: 10, shadow: false,
  prims: [
    // shaft — narrow bone/leather poly running left to right
    { kind: 'poly', points: [[1, 4], [11, 4], [11, 6], [1, 6]], color: PAL.bone, role: 'shaft' },
    // steel head — triangular point at the right end
    { kind: 'poly', points: [[11, 2], [13, 5], [11, 8]], color: PAL.steel, role: 'head' },
    // fletching — small leather fin at the tail
    { kind: 'poly', points: [[1, 4], [4, 1], [4, 4]], color: PAL.leather, role: 'fletching' },
    { kind: 'poly', points: [[1, 6], [4, 9], [4, 6]], color: PAL.leather, role: 'fletching' },
  ],
};

export const SHOT_SLASH: SpriteDef = {
  id: 'shot_slash', w: 16, h: 14, shadow: false,
  prims: [
    // sword-slash arc — a steel/steelBlue crescent poly
    { kind: 'poly', points: [[2, 12], [1, 7], [3, 3], [7, 1], [11, 2], [13, 5], [10, 4], [7, 3], [4, 5], [3, 8], [5, 12]], color: PAL.steel, role: 'arc' },
    // inner highlight — steelBlue accent along the inner curve
    { kind: 'poly', points: [[4, 11], [3, 7], [5, 4], [8, 3], [10, 4], [8, 5], [5, 6], [4, 9]], color: PAL.steelBlue, role: 'shine' },
  ],
};

export const SHOT_HALBERD: SpriteDef = {
  id: 'shot_halberd', w: 16, h: 14, shadow: false,
  prims: [
    // leather shaft stub — short vertical bar at the bottom
    { kind: 'rect', x: 7, y: 9, w: 3, h: 5, color: PAL.leather, role: 'shaft' },
    // steel axe blade — large poly sweeping right
    { kind: 'poly', points: [[4, 8], [8, 1], [15, 3], [14, 8], [9, 9]], color: PAL.steel, role: 'blade' },
    // blade edge — dark steel highlight along the top
    { kind: 'poly', points: [[8, 1], [15, 3], [14, 5], [9, 3]], color: PAL.steelBlue, role: 'edge' },
  ],
};

export const SHOT_FLAIL: SpriteDef = {
  id: 'shot_flail', w: 14, h: 14, shadow: false,
  prims: [
    // spiked ball body — ironDark circle
    { kind: 'circle', cx: 7, cy: 7, r: 4, color: PAL.ironDark, role: 'ball' },
    // steel spike triangles radiating outward
    { kind: 'poly', points: [[7, 1], [5, 3], [9, 3]], color: PAL.steel, role: 'spike' },
    { kind: 'poly', points: [[13, 7], [11, 5], [11, 9]], color: PAL.steel, role: 'spike' },
    { kind: 'poly', points: [[7, 13], [5, 11], [9, 11]], color: PAL.steel, role: 'spike' },
    { kind: 'poly', points: [[1, 7], [3, 5], [3, 9]], color: PAL.steel, role: 'spike' },
  ],
};

// Renaissance Age projectile sprites

export const SHOT_MUSKET: SpriteDef = {
  id: 'shot_musket', w: 12, h: 12, shadow: false,
  prims: [
    // lead ball body — ironDark
    { kind: 'circle', cx: 6, cy: 6, r: 5, color: PAL.ironDark, role: 'ball' },
    // smoke/gunfire glint — small highlight circle
    { kind: 'circle', cx: 4, cy: 4, r: 2, color: PAL.smoke, role: 'glint' },
    { kind: 'circle', cx: 3, cy: 3, r: 1, color: PAL.gunfire, role: 'spark' },
  ],
};

export const SHOT_PELLET: SpriteDef = {
  id: 'shot_pellet', w: 10, h: 10, shadow: false,
  prims: [
    // scatter pellet — small powder/ironDark circle
    { kind: 'circle', cx: 5, cy: 5, r: 4, color: PAL.ironDark, role: 'ball' },
    { kind: 'circle', cx: 4, cy: 4, r: 1, color: PAL.powder, role: 'sheen' },
  ],
};

export const SHOT_PISTOL: SpriteDef = {
  id: 'shot_pistol', w: 12, h: 12, shadow: false,
  prims: [
    // pistol ball — ironDark body with brass rim
    { kind: 'circle', cx: 6, cy: 6, r: 5, color: PAL.ironDark, role: 'ball' },
    // brass rim ring — slightly smaller, offset for rim look
    { kind: 'poly', points: [[6, 1], [10, 3], [11, 6], [10, 9], [6, 11], [2, 9], [1, 6], [2, 3]], color: PAL.brass, role: 'rim' },
    { kind: 'circle', cx: 6, cy: 6, r: 3, color: PAL.ironDark, role: 'center' },
  ],
};

export const SHOT_GRENADE: SpriteDef = {
  id: 'shot_grenade', w: 14, h: 14, shadow: false,
  prims: [
    // bomb body — ironDark circle
    { kind: 'circle', cx: 7, cy: 8, r: 5, color: PAL.ironDark, role: 'body' },
    // walnut fuse — short rect at top
    { kind: 'rect', x: 6, y: 1, w: 3, h: 4, rx: 1, color: PAL.walnut, role: 'fuse' },
    // gunfire spark at tip of fuse — small triangle poly
    { kind: 'poly', points: [[6, 1], [8, 1], [7, -1]], color: PAL.gunfire, role: 'spark' },
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
  SHOT_BOLT,
  SHOT_SLASH,
  SHOT_HALBERD,
  SHOT_FLAIL,
  SHOT_MUSKET,
  SHOT_PELLET,
  SHOT_PISTOL,
  SHOT_GRENADE,
];
