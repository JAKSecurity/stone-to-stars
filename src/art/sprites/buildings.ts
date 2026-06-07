import { Prim, SpriteDef } from '../types';
import { PAL } from '../palette';

// Shared hut base — identical across all three so they read as one settlement.
// Wall body sits with its base at y=90 (just above the bottom) and is centered.
// Painted back-to-front: wall, roof, then door on top.
const hutBase = (): Prim[] => [
  // wall body (lower half of the hut)
  { kind: 'rect', x: 24, y: 52, w: 48, h: 38, rx: 3, color: PAL.wall, role: 'wall' },
  // triangular roof with eaves overhanging the wall
  { kind: 'poly', points: [[18, 52], [78, 52], [48, 24]], color: PAL.roof, role: 'roof' },
  // centered door
  { kind: 'rect', x: 42, y: 66, w: 12, h: 24, rx: 2, color: PAL.door, role: 'door' },
];

export const GRANARY: SpriteDef = {
  id: 'granary',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(),
    // grain sheaves leaning by the door — rounded rects read as wheat bundles
    { kind: 'rect', x: 16, y: 64, w: 8, h: 26, rx: 4, color: PAL.grain, role: 'sheaf' },
    { kind: 'rect', x: 24, y: 70, w: 7, h: 20, rx: 4, color: PAL.grain, role: 'sheaf' },
    { kind: 'rect', x: 72, y: 66, w: 8, h: 24, rx: 4, color: PAL.grain, role: 'sheaf' },
    // wheat-head tufts on top of the sheaves
    { kind: 'poly', points: [[20, 58], [16, 66], [24, 66]], color: PAL.grain, role: 'wheat' },
    { kind: 'poly', points: [[76, 60], [71, 68], [81, 68]], color: PAL.grain, role: 'wheat' },
    // little binding band so the bundle reads as tied
    { kind: 'rect', x: 15, y: 74, w: 10, h: 4, rx: 2, color: PAL.trim, role: 'binding' },
  ],
};

export const MINE: SpriteDef = {
  id: 'mine',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(),
    // crossed pick + hammer mounted across the hut face — wood handles, metal heads.
    { kind: 'line', x1: 38, y1: 80, x2: 58, y2: 56, width: 3, color: PAL.wood, role: 'pickHandle' },
    { kind: 'line', x1: 58, y1: 80, x2: 38, y2: 56, width: 3, color: PAL.wood, role: 'hammerHandle' },
    // pick head: a double-pointed bar across the top of its (right-leaning) handle
    { kind: 'poly', points: [[51, 58], [58, 53], [65, 57], [58, 60]], color: PAL.metal, role: 'pickHead' },
    // hammer head: a solid block at the top of its (left-leaning) handle
    { kind: 'rect', x: 31, y: 52, w: 15, h: 8, rx: 1, color: PAL.metal, role: 'hammerHead' },
    // mound of mined rock/ore in front of the hut
    { kind: 'poly', points: [[58, 90], [88, 90], [82, 76], [70, 70], [62, 78]], color: PAL.rock, role: 'mound' },
    // a couple of chunky ore boulders sitting on the mound
    { kind: 'circle', cx: 70, cy: 80, r: 6, color: PAL.rock, role: 'ore' },
    { kind: 'circle', cx: 80, cy: 84, r: 5, color: PAL.rock, role: 'ore' },
  ],
};

export const FORGE: SpriteDef = {
  id: 'forge',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(),
    // stone chimney rising from the roof
    { kind: 'rect', x: 54, y: 18, w: 12, h: 24, rx: 2, color: PAL.rock, role: 'chimney' },
    // chimney cap so it reads as masonry
    { kind: 'rect', x: 52, y: 16, w: 16, h: 5, rx: 2, color: PAL.rock, role: 'chimneyCap' },
    // flame licking out of the chimney top
    { kind: 'poly', points: [[60, 2], [54, 16], [66, 16]], color: PAL.fire, role: 'flame' },
    { kind: 'poly', points: [[60, 8], [57, 16], [63, 16]], color: PAL.grain, role: 'flameCore' },
  ],
};

export const BUILDINGS: SpriteDef[] = [GRANARY, MINE, FORGE];
