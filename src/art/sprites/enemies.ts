import { SpriteDef } from '../types';
import { PAL } from '../palette';

// A low, four-legged hostile beast facing right. Canvas 40x36.
// Head + muzzle + fang on the right; spiky back ridge; tail trailing left.
export const BEAST: SpriteDef = {
  id: 'beast',
  w: 40,
  h: 36,
  prims: [
    // tail trailing off the back-left (behind the body)
    { kind: 'poly', points: [[8, 17], [1, 13], [6, 24]], color: PAL.beast, role: 'tail' },
    // legs (behind the body)
    { kind: 'rect', x: 9, y: 25, w: 5, h: 8, rx: 2, color: PAL.beastDark, role: 'leg' },
    { kind: 'rect', x: 15, y: 26, w: 5, h: 7, rx: 2, color: PAL.beastDark, role: 'leg' },
    { kind: 'rect', x: 24, y: 25, w: 5, h: 8, rx: 2, color: PAL.beastDark, role: 'leg' },
    { kind: 'rect', x: 30, y: 26, w: 5, h: 7, rx: 2, color: PAL.beastDark, role: 'leg' },
    // low torso
    { kind: 'rect', x: 6, y: 14, w: 27, h: 13, rx: 7, color: PAL.beast, role: 'body' },
    // spiky back ridge along the spine
    { kind: 'poly', points: [[9, 15], [12, 8], [15, 15]], color: PAL.beastDark, role: 'ridge' },
    { kind: 'poly', points: [[15, 15], [18, 7], [21, 15]], color: PAL.beastDark, role: 'ridge' },
    { kind: 'poly', points: [[21, 15], [24, 9], [27, 15]], color: PAL.beastDark, role: 'ridge' },
    // head
    { kind: 'circle', cx: 30, cy: 17, r: 8, color: PAL.beast, role: 'head' },
    // pointed ear
    { kind: 'poly', points: [[26, 12], [28, 3], [33, 11]], color: PAL.beastDark, role: 'ear' },
    // muzzle jutting forward
    { kind: 'poly', points: [[36, 14], [40, 18], [38, 23], [33, 22]], color: PAL.beast, role: 'muzzle' },
    // nose
    { kind: 'circle', cx: 38, cy: 18, r: 2, color: PAL.beastDark, role: 'nose' },
    // bared fang
    { kind: 'poly', points: [[34, 22], [37, 22], [36, 26]], color: '#ffffff', role: 'fang' },
    // angry eye
    { kind: 'circle', cx: 31, cy: 15, r: 2, color: '#ffffff', role: 'eyeWhite' },
    { kind: 'circle', cx: 32, cy: 15, r: 1, color: '#222222', role: 'pupil' },
  ],
};

// An upright blue-robed caster figure. Canvas 36x48.
export const SCHOLAR: SpriteDef = {
  id: 'scholar',
  w: 36,
  h: 48,
  prims: [
    // robe — trapezoid, wider at the hem
    { kind: 'poly', points: [[13, 18], [23, 18], [29, 45], [7, 45]], color: PAL.scholar, role: 'robe' },
    // robe hem trim
    { kind: 'rect', x: 7, y: 42, w: 22, h: 4, rx: 2, color: PAL.trim, role: 'hem' },
    // sleeve / arm hint along the side toward the held scroll
    { kind: 'rect', x: 22, y: 24, w: 5, h: 14, rx: 2, color: PAL.scholarDark, role: 'sleeve' },
    // hand
    { kind: 'circle', cx: 25, cy: 38, r: 2, color: PAL.skin, role: 'hand' },
    // head
    { kind: 'circle', cx: 18, cy: 13, r: 7, color: PAL.skin, role: 'head' },
    // hood / cap over the top of the head (caster read)
    { kind: 'poly', points: [[9, 14], [10, 6], [18, 2], [26, 6], [27, 14], [18, 9]], color: PAL.scholarDark, role: 'hood' },
    // eyes peering out from under the hood
    { kind: 'circle', cx: 15, cy: 14, r: 1, color: '#222222', role: 'eye' },
    { kind: 'circle', cx: 21, cy: 14, r: 1, color: '#222222', role: 'eye' },
    // scroll / book held at the side
    { kind: 'rect', x: 26, y: 34, w: 4, h: 9, rx: 1, color: PAL.trim, role: 'scroll' },
  ],
};

export const ENEMIES: SpriteDef[] = [BEAST, SCHOLAR];
