import { SpriteDef } from '../types';
import { shade } from '../color';

// RC-025 — the ambient healing pickup (spec §3). Art ratified in-game by Jeff during the
// playtest pass; if rejected, only this file changes.
const MEAT = '#b5651d';

export const FOOD: SpriteDef[] = [{
  id: 'food_ration', w: 16, h: 16, shadow: false,
  prims: [
    // bone: a pale diagonal shaft with a knuckle, poking out lower-right
    { kind: 'poly', points: [[9, 9], [14, 13], [13, 14], [8, 10]], color: '#f1e9dc', role: 'bone' },
    { kind: 'circle', cx: 14, cy: 14, r: 1.5, color: '#ffffff', role: 'knuckle' },
    // roast body + sear highlight + shadowed underside
    { kind: 'circle', cx: 6, cy: 6, r: 5, color: MEAT, role: 'meat' },
    { kind: 'circle', cx: 5, cy: 5, r: 3, color: shade(MEAT, 0.25), role: 'sear' },
    { kind: 'poly', points: [[2, 8], [10, 9], [6, 11]], color: shade(MEAT, -0.25), role: 'under' },
  ],
}];
