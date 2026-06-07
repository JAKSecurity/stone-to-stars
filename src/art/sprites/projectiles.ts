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

export const PROJECTILES: SpriteDef[] = [SHOT_CLUB, SHOT_BRONZE];
