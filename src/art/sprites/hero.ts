import { SpriteDef } from '../types';
import { PAL } from '../palette';

export const HERO: SpriteDef = {
  id: 'hero',
  w: 120,
  h: 150,
  prims: [
    // legs
    { kind: 'rect', x: 49, y: 96, w: 10, h: 34, rx: 4, color: PAL.leather, role: 'leg' },
    { kind: 'rect', x: 62, y: 96, w: 10, h: 34, rx: 4, color: PAL.leather, role: 'leg' },
    // spear
    { kind: 'line', x1: 90, y1: 22, x2: 78, y2: 134, width: 4, color: PAL.wood, role: 'spear' },
    { kind: 'poly', points: [[90, 13], [84, 29], [97, 27]], color: PAL.metal, role: 'spearTip' },
    // tunic (trapezoid)
    { kind: 'poly', points: [[42, 60], [78, 60], [74, 100], [46, 100]], color: PAL.tunic, role: 'body' },
    { kind: 'rect', x: 43, y: 57, w: 34, h: 8, rx: 4, color: PAL.trim, role: 'trim' },
    // arms
    { kind: 'rect', x: 33, y: 64, w: 9, h: 28, rx: 4, color: PAL.skin, role: 'arm' },
    { kind: 'rect', x: 78, y: 62, w: 9, h: 30, rx: 4, color: PAL.skin, role: 'arm' },
    // head + hair
    { kind: 'circle', cx: 60, cy: 42, r: 16, color: PAL.skin, role: 'head' },
    { kind: 'poly', points: [[45, 38], [60, 20], [75, 38]], color: PAL.hair, role: 'hair' },
    // shield
    { kind: 'circle', cx: 35, cy: 84, r: 13, color: PAL.shieldRed, role: 'shield' },
    { kind: 'circle', cx: 35, cy: 84, r: 4, color: PAL.trim, role: 'boss' },
  ],
};
