import { SpriteDef } from '../types';
import { PAL } from '../palette';

// A low, hunched, angular predator stalking right. Canvas 40x36.
// Dark body mass (beastDark) with a brighter jagged spine (beast); lowered wedge
// head with bared teeth and a single glowing eye. Built from polys for a sharp,
// un-cute silhouette.
export const BEAST: SpriteDef = {
  id: 'beast',
  w: 40,
  h: 36,
  prims: [
    // thin tail flicking off the back-left (behind the body)
    { kind: 'poly', points: [[8, 22], [0, 16], [3, 25]], color: PAL.beastDark, role: 'tail' },
    // angular legs ending in claws (behind the body)
    { kind: 'poly', points: [[10, 25], [7, 34], [11, 34], [14, 25]], color: PAL.beastDark, role: 'leg' },
    { kind: 'poly', points: [[17, 26], [15, 34], [19, 34], [21, 26]], color: PAL.beastDark, role: 'leg' },
    { kind: 'poly', points: [[26, 26], [24, 34], [28, 34], [30, 26]], color: PAL.beastDark, role: 'leg' },
    { kind: 'poly', points: [[32, 25], [31, 34], [35, 34], [36, 25]], color: PAL.beastDark, role: 'leg' },
    // hunched angular torso — high at the shoulders, sloping to the tail
    { kind: 'poly', points: [[5, 24], [10, 15], [21, 13], [30, 11], [38, 18], [36, 27], [10, 27]], color: PAL.beastDark, role: 'body' },
    // jagged spine ridge (brighter, sharp)
    { kind: 'poly', points: [[10, 16], [12, 7], [16, 16]], color: PAL.beast, role: 'spine' },
    { kind: 'poly', points: [[16, 15], [20, 5], [24, 15]], color: PAL.beast, role: 'spine' },
    { kind: 'poly', points: [[24, 14], [28, 6], [32, 13]], color: PAL.beast, role: 'spine' },
    // lowered wedge head / snout jutting forward-right
    { kind: 'poly', points: [[30, 13], [40, 20], [37, 26], [29, 24]], color: PAL.beastDark, role: 'head' },
    // bared teeth along the jawline (white triangles)
    { kind: 'poly', points: [[32, 23], [33, 26], [34, 23]], color: '#ffffff', role: 'tooth' },
    { kind: 'poly', points: [[35, 23], [36, 26], [37, 23]], color: '#ffffff', role: 'tooth' },
    // heavy brow + a narrow glowing slit (predatory, not a round 'cute' eye)
    { kind: 'poly', points: [[30, 15], [37, 16], [36, 18], [31, 17]], color: '#3a0f0d', role: 'brow' },
    { kind: 'poly', points: [[32, 17], [36, 18], [32, 19]], color: '#f0a020', role: 'eye' },
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
