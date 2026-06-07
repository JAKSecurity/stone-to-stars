import { SpriteDef } from '../types';
import { PAL } from '../palette';

function gem(id: string, color: string): SpriteDef {
  return {
    id, w: 16, h: 16, shadow: false,
    prims: [
      { kind: 'poly', points: [[8, 1], [15, 8], [8, 15], [1, 8]], color, role: 'gem' },
      { kind: 'poly', points: [[8, 1], [11, 8], [8, 6]], color: '#ffffff', role: 'facet' },
    ],
  };
}

export const GEM_EXPLORATION = gem('gem_exploration', PAL.exploration);
export const GEM_SCIENCE = gem('gem_science', PAL.science);
export const GEM_INDUSTRY = gem('gem_industry', PAL.industry);
export const GEM_CULTURE = gem('gem_culture', PAL.culture);
export const GEMS: SpriteDef[] = [GEM_EXPLORATION, GEM_SCIENCE, GEM_INDUSTRY, GEM_CULTURE];
