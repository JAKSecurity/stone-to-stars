import { Prim, SpriteDef } from '../types';
import { PAL } from '../palette';

// Shared hut base — identical across all three so they read as one settlement.
// Wall body sits with its base at y=90 (just above the bottom) and is centered.
// Painted back-to-front: wall, roof, then (optionally) door on top. The mine passes
// door=false and supplies its own shaft entrance instead.
const hutBase = (door = true): Prim[] => {
  const base: Prim[] = [
    // wall body (lower half of the hut)
    { kind: 'rect', x: 24, y: 52, w: 48, h: 38, rx: 3, color: PAL.wall, role: 'wall' },
    // triangular roof with eaves overhanging the wall
    { kind: 'poly', points: [[18, 52], [78, 52], [48, 24]], color: PAL.roof, role: 'roof' },
  ];
  if (door) {
    base.push({ kind: 'rect', x: 42, y: 66, w: 12, h: 24, rx: 2, color: PAL.door, role: 'door' });
  }
  return base;
};

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
    ...hutBase(false), // wall + roof only — the door is replaced by a mine shaft below
    // timber-framed mine shaft: dark opening FIRST (behind), then the frame on top
    // (posts + lintel) so the timber reads as in front of the opening — matters once
    // the 'shaded' style outlines each prim.
    { kind: 'rect', x: 40, y: 62, w: 16, h: 29, rx: 7, color: '#171311', role: 'shaft' },
    { kind: 'rect', x: 37, y: 60, w: 4, h: 31, color: PAL.wood, role: 'post' },
    { kind: 'rect', x: 55, y: 60, w: 4, h: 31, color: PAL.wood, role: 'post' },
    { kind: 'rect', x: 35, y: 57, w: 26, h: 5, rx: 1, color: PAL.wood, role: 'lintel' },
    // ore piled to the LEFT of the shaft mouth (clear of the entrance)
    { kind: 'circle', cx: 27, cy: 88, r: 4, color: PAL.rock, role: 'ore' },
    { kind: 'circle', cx: 34, cy: 89, r: 4, color: PAL.rock, role: 'ore' },
    { kind: 'circle', cx: 30, cy: 91, r: 5, color: PAL.rock, role: 'ore' },
    // a loaded minecart beside the hut: body, ore heaped inside, then a front rim
    // drawn over the ore so it reads as sitting *in* the cart (not on top), then wheels.
    { kind: 'poly', points: [[66, 80], [86, 80], [83, 91], [69, 91]], color: PAL.door, role: 'cart' },
    { kind: 'circle', cx: 72, cy: 79, r: 4, color: PAL.rock, role: 'cartOre' },
    { kind: 'circle', cx: 80, cy: 78, r: 4, color: PAL.rock, role: 'cartOre' },
    { kind: 'rect', x: 65, y: 80, w: 22, h: 4, rx: 1, color: '#4a3526', role: 'cartRim' },
    { kind: 'circle', cx: 71, cy: 92, r: 3, color: '#2b2b2b', role: 'wheel' },
    { kind: 'circle', cx: 81, cy: 92, r: 3, color: '#2b2b2b', role: 'wheel' },
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
