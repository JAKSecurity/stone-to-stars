import { SpriteDef } from '../types';
import { PAL } from '../palette';

// A low, four-legged hostile beast facing right. Canvas 40x36.
// Front (head + eyes + horn) is on the right side near x=30..38.
export const BEAST: SpriteDef = {
  id: 'beast',
  w: 40,
  h: 36,
  prims: [
    // legs (drawn first so the body overlaps their tops)
    { kind: 'rect', x: 7, y: 22, w: 4, h: 10, rx: 2, color: PAL.beastDark, role: 'leg' },
    { kind: 'rect', x: 13, y: 23, w: 4, h: 9, rx: 2, color: PAL.beastDark, role: 'leg' },
    { kind: 'rect', x: 22, y: 23, w: 4, h: 9, rx: 2, color: PAL.beastDark, role: 'leg' },
    { kind: 'rect', x: 28, y: 22, w: 4, h: 10, rx: 2, color: PAL.beastDark, role: 'leg' },
    // back ridge spikes for ferocity (behind the body so they peek over the top)
    { kind: 'poly', points: [[12, 16], [15, 7], [18, 16]], color: PAL.beastDark, role: 'ridge' },
    { kind: 'poly', points: [[18, 16], [21, 9], [24, 16]], color: PAL.beastDark, role: 'ridge' },
    // low torso
    { kind: 'rect', x: 6, y: 13, w: 26, h: 13, rx: 6, color: PAL.beast, role: 'body' },
    // tail trailing off the back-left
    { kind: 'poly', points: [[6, 16], [2, 12], [7, 20]], color: PAL.beast, role: 'tail' },
    // head at the front (right)
    { kind: 'circle', cx: 32, cy: 18, r: 7, color: PAL.beast, role: 'head' },
    // horn / spike above the snout
    { kind: 'poly', points: [[33, 9], [30, 14], [37, 13]], color: PAL.metal, role: 'horn' },
    // snout
    { kind: 'rect', x: 35, y: 18, w: 4, h: 5, rx: 2, color: PAL.beastDark, role: 'snout' },
    // menacing eyes (whites + dark pupils)
    { kind: 'circle', cx: 31, cy: 16, r: 2, color: '#ffffff', role: 'eyeWhite' },
    { kind: 'circle', cx: 35, cy: 16, r: 2, color: '#ffffff', role: 'eyeWhite' },
    { kind: 'circle', cx: 31, cy: 16, r: 1, color: '#222222', role: 'pupil' },
    { kind: 'circle', cx: 35, cy: 16, r: 1, color: '#222222', role: 'pupil' },
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
