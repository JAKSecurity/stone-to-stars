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
    // spear (vertical shaft so the tip lines up squarely with it)
    { kind: 'line', x1: 85, y1: 18, x2: 85, y2: 134, width: 4, color: PAL.wood, role: 'spear' },
    { kind: 'poly', points: [[85, 6], [79, 22], [91, 22]], color: PAL.metal, role: 'spearTip' },
    // tunic (trapezoid)
    { kind: 'poly', points: [[42, 60], [78, 60], [74, 100], [46, 100]], color: PAL.tunic, role: 'body' },
    { kind: 'rect', x: 43, y: 57, w: 34, h: 8, rx: 4, color: PAL.trim, role: 'trim' },
    // arms
    { kind: 'rect', x: 33, y: 64, w: 9, h: 28, rx: 4, color: PAL.skin, role: 'arm' },
    { kind: 'rect', x: 78, y: 62, w: 9, h: 30, rx: 4, color: PAL.skin, role: 'arm' },
    // head + hair
    { kind: 'circle', cx: 60, cy: 42, r: 16, color: PAL.skin, role: 'head' },
    { kind: 'poly', points: [[43, 37], [44, 28], [49, 23], [55, 21], [60, 21], [65, 21], [71, 23], [76, 28], [77, 37]], color: PAL.hair, role: 'hair' },
    // shield
    { kind: 'circle', cx: 35, cy: 84, r: 13, color: PAL.shieldRed, role: 'shield' },
    { kind: 'circle', cx: 35, cy: 84, r: 4, color: PAL.trim, role: 'boss' },
  ],
};

// Iron Age variant — same pose/canvas, iron/steel gear replaces the leather tunic.
// Iron breastplate over the torso, pauldrons at the shoulders, iron helm, iron spear,
// iron-rimmed shield. First-pass art; reviewed at the Phase C gate.
export const HERO_IRON: SpriteDef = {
  id: 'hero_iron',
  w: 120,
  h: 150,
  prims: [
    // legs — greaved iron shin-guards over leather trousers
    { kind: 'rect', x: 49, y: 96, w: 10, h: 34, rx: 4, color: PAL.leather, role: 'leg' },
    { kind: 'rect', x: 62, y: 96, w: 10, h: 34, rx: 4, color: PAL.leather, role: 'leg' },
    { kind: 'rect', x: 49, y: 110, w: 10, h: 20, rx: 2, color: PAL.iron, role: 'greave' },
    { kind: 'rect', x: 62, y: 110, w: 10, h: 20, rx: 2, color: PAL.iron, role: 'greave' },
    // iron spear shaft + elongated iron blade
    { kind: 'line', x1: 85, y1: 18, x2: 85, y2: 134, width: 4, color: PAL.ironDark, role: 'spear' },
    { kind: 'poly', points: [[85, 4], [78, 24], [92, 24]], color: PAL.steel, role: 'spearTip' },
    // iron breastplate (trapezoid, slightly wider and darker than the tunic)
    { kind: 'poly', points: [[42, 60], [78, 60], [74, 100], [46, 100]], color: PAL.iron, role: 'breastplate' },
    // banded horizontal straps across the breastplate
    { kind: 'rect', x: 44, y: 68, w: 32, h: 4, rx: 1, color: PAL.ironDark, role: 'band' },
    { kind: 'rect', x: 44, y: 79, w: 32, h: 4, rx: 1, color: PAL.ironDark, role: 'band' },
    { kind: 'rect', x: 44, y: 90, w: 32, h: 4, rx: 1, color: PAL.ironDark, role: 'band' },
    // pauldrons (shoulder guards)
    { kind: 'rect', x: 36, y: 58, w: 14, h: 8, rx: 3, color: PAL.steel, role: 'pauldron' },
    { kind: 'rect', x: 70, y: 58, w: 14, h: 8, rx: 3, color: PAL.steel, role: 'pauldron' },
    // gorget / collar trim
    { kind: 'rect', x: 43, y: 57, w: 34, h: 6, rx: 3, color: PAL.steel, role: 'gorget' },
    // arms — vambraces (iron forearm guards) over skin upper arms
    { kind: 'rect', x: 33, y: 64, w: 9, h: 28, rx: 4, color: PAL.skin, role: 'arm' },
    { kind: 'rect', x: 78, y: 62, w: 9, h: 30, rx: 4, color: PAL.skin, role: 'arm' },
    { kind: 'rect', x: 33, y: 76, w: 9, h: 14, rx: 2, color: PAL.iron, role: 'vambrace' },
    { kind: 'rect', x: 78, y: 74, w: 9, h: 16, rx: 2, color: PAL.iron, role: 'vambrace' },
    // head + hair
    { kind: 'circle', cx: 60, cy: 42, r: 16, color: PAL.skin, role: 'head' },
    { kind: 'poly', points: [[43, 37], [44, 28], [49, 23], [55, 21], [60, 21], [65, 21], [71, 23], [76, 28], [77, 37]], color: PAL.hair, role: 'hair' },
    // iron helm — nasal helm shape over the hair
    { kind: 'poly', points: [[44, 36], [45, 26], [50, 21], [60, 19], [70, 21], [75, 26], [76, 36]], color: PAL.iron, role: 'helm' },
    { kind: 'rect', x: 57, y: 19, w: 6, h: 18, rx: 1, color: PAL.ironDark, role: 'nasal' },
    // iron-rimmed shield (same position, steel rim, iron boss)
    { kind: 'circle', cx: 35, cy: 84, r: 13, color: PAL.iron, role: 'shield' },
    { kind: 'circle', cx: 35, cy: 84, r: 10, color: PAL.shieldRed, role: 'shieldFace' },
    { kind: 'circle', cx: 35, cy: 84, r: 4, color: PAL.steel, role: 'boss' },
  ],
};
