import { SpriteDef } from '../types';
import { PAL } from '../palette';
import { shade } from '../color';

// RC-004 — three cosmetic gem tiers per resource. Cut is the original flat diamond (kept under the
// baseline `gem_<resource>` id so existing references stay valid); Chipped and Brilliant add the
// low and high ends with D2-style faceting via shade() for depth.

// Cut (tier 1) — the original clean diamond. Unchanged look; baseline id.
function gemCut(id: string, color: string): SpriteDef {
  return {
    id, w: 16, h: 16, shadow: false,
    prims: [
      { kind: 'poly', points: [[8, 1], [15, 8], [8, 15], [1, 8]], color, role: 'gem' },
      { kind: 'poly', points: [[8, 1], [11, 8], [8, 6]], color: '#ffffff', role: 'facet' },
    ],
  };
}

// Chipped (tier 0) — a small, rough, asymmetric shard. Duller body, one dark inner facet, a glint.
function gemChipped(id: string, color: string): SpriteDef {
  return {
    id, w: 16, h: 16, shadow: false,
    prims: [
      { kind: 'poly', points: [[7, 4], [12, 7], [10, 13], [5, 12], [4, 7]], color: shade(color, -0.08), role: 'gem' },
      { kind: 'poly', points: [[7, 4], [9, 8], [6, 9]], color: shade(color, -0.35), role: 'facet' },
      { kind: 'poly', points: [[10, 13], [12, 7], [11, 10]], color: shade(color, 0.18), role: 'glint' },
    ],
  };
}

// Brilliant (tier 2) — a larger, multi-facet brilliant cut. Bright table, dark pavilion, sparkle.
function gemBrilliant(id: string, color: string): SpriteDef {
  return {
    id, w: 16, h: 16, shadow: false,
    prims: [
      // octagonal brilliant outline
      { kind: 'poly', points: [[8, 0], [13, 3], [15, 8], [13, 13], [8, 15], [3, 13], [1, 8], [3, 3]], color, role: 'gem' },
      // bright table facet (top half)
      { kind: 'poly', points: [[8, 0], [13, 3], [8, 7], [3, 3]], color: shade(color, 0.45), role: 'table' },
      // dark pavilion (bottom point)
      { kind: 'poly', points: [[3, 13], [8, 7], [13, 13], [8, 15]], color: shade(color, -0.30), role: 'pavilion' },
      // crown side facets for depth
      { kind: 'poly', points: [[1, 8], [3, 3], [8, 7], [3, 13]], color: shade(color, -0.12), role: 'crownL' },
      { kind: 'poly', points: [[15, 8], [13, 3], [8, 7], [13, 13]], color: shade(color, 0.12), role: 'crownR' },
      // sparkle highlight
      { kind: 'circle', cx: 6, cy: 4, r: 1, color: '#ffffff', role: 'sparkle' },
    ],
  };
}

/** The three tiers for one resource: cut keeps `gem_<resource>`, others get a tier suffix. */
function gemSet(resource: string, color: string): SpriteDef[] {
  return [
    gemCut(`gem_${resource}`, color),
    gemChipped(`gem_${resource}_chipped`, color),
    gemBrilliant(`gem_${resource}_brilliant`, color),
  ];
}

export const GEMS: SpriteDef[] = [
  ...gemSet('exploration', PAL.exploration),
  ...gemSet('science', PAL.science),
  ...gemSet('industry', PAL.industry),
  ...gemSet('culture', PAL.culture),
];
