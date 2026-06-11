import { SpriteDef } from '../types';
import { PAL } from '../palette';

// RC-026 POI placeholder sprites. These are deliberately minimal gray shapes so the scene wiring
// (Tasks 7/8) has real textures to render and the registry's "every sprite is valid" test stays
// green BEFORE the authored art lands. Task 9 replaces the shape-data in-place (same ids, same
// canvas sizes) once Jeff ratifies the real sprites at the playtest — no system changes needed.

// A gray standing monolith — the relic shrine placeholder.
export const POI_SHRINE: SpriteDef = {
  id: 'poi_shrine',
  w: 48,
  h: 48,
  prims: [
    { kind: 'rect', x: 10, y: 40, w: 28, h: 8, rx: 2, color: PAL.castleStoneDark, role: 'base' },
    { kind: 'rect', x: 16, y: 8, w: 16, h: 34, rx: 3, color: PAL.castleStone, role: 'monolith' },
    { kind: 'rect', x: 26, y: 8, w: 6, h: 34, color: PAL.castleStoneDark, role: 'shade' },
  ],
};

// A low gray slab — the fusion altar placeholder.
export const POI_ALTAR: SpriteDef = {
  id: 'poi_altar',
  w: 48,
  h: 48,
  prims: [
    { kind: 'rect', x: 8, y: 28, w: 32, h: 16, rx: 3, color: PAL.castleStone, role: 'slab' },
    { kind: 'rect', x: 8, y: 38, w: 32, h: 6, color: PAL.castleStoneDark, role: 'shade' },
    { kind: 'rect', x: 14, y: 22, w: 20, h: 8, rx: 2, color: PAL.castleStoneDark, role: 'top' },
  ],
};

// A small gray runner blob — the treasure courier placeholder.
export const POI_COURIER: SpriteDef = {
  id: 'enemy_courier',
  w: 34,
  h: 34,
  prims: [
    { kind: 'circle', cx: 17, cy: 18, r: 11, color: PAL.castleStone, role: 'body' },
    { kind: 'circle', cx: 13, cy: 15, r: 4, color: PAL.castleStoneDark, role: 'head' },
    { kind: 'rect', x: 20, y: 12, w: 10, h: 12, rx: 3, color: PAL.gold, role: 'sack' },
  ],
};

export const POIS_ART: SpriteDef[] = [POI_SHRINE, POI_ALTAR, POI_COURIER];
