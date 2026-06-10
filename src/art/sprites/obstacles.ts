import { SpriteDef } from '../types';
import { PAL } from '../palette';

// RC-021 — themed obstacle props, two per biome, that replace the generic dark ellipses
// scattered as collidable terrain in a run. All authored on a 64×64 canvas with the prop's
// footprint sitting near the bottom so the contact-shadow ellipse reads as ground contact.
// Collision is unchanged (RunScene keeps the inset circle body); these are visual only.

// ── The Wilds (stone) — woodland: a pine and a granite boulder ────────────────
export const OBS_TREE: SpriteDef = {
  id: 'obs_tree',
  w: 64,
  h: 64,
  prims: [
    { kind: 'rect', x: 29, y: 44, w: 6, h: 16, rx: 2, color: PAL.bark, role: 'trunk' },
    { kind: 'rect', x: 31, y: 44, w: 3, h: 16, color: PAL.barkDark, role: 'trunkShade' },
    { kind: 'poly', points: [[14, 48], [50, 48], [32, 30]], color: PAL.foliageDark, role: 'foliage' },
    { kind: 'poly', points: [[17, 38], [47, 38], [32, 22]], color: PAL.foliage, role: 'foliage' },
    { kind: 'poly', points: [[20, 28], [44, 28], [32, 13]], color: PAL.foliage, role: 'foliageTop' },
    { kind: 'poly', points: [[27, 26], [37, 26], [32, 16]], color: PAL.foliageDark, role: 'foliageHi' },
  ],
};

export const OBS_ROCK: SpriteDef = {
  id: 'obs_rock',
  w: 64,
  h: 64,
  prims: [
    { kind: 'poly', points: [[12, 58], [16, 42], [28, 34], [44, 38], [52, 50], [50, 58]], color: PAL.rock, role: 'body' },
    { kind: 'poly', points: [[28, 34], [44, 38], [52, 50], [40, 48]], color: PAL.rockDark, role: 'shade' },
    { kind: 'circle', cx: 26, cy: 44, r: 6, color: PAL.rockLite, role: 'highlight' },
    { kind: 'line', x1: 30, y1: 40, x2: 36, y2: 56, width: 2, color: PAL.rockDark, role: 'crack' },
  ],
};

// ── Ancient Ruins (stone) — a toppled fluted column and a rubble pile ──────────
export const OBS_FALLEN_COLUMN: SpriteDef = {
  id: 'obs_fallen_column',
  w: 64,
  h: 64,
  prims: [
    { kind: 'rect', x: 8, y: 42, w: 42, h: 16, rx: 7, color: PAL.marble, role: 'shaft' },
    { kind: 'line', x1: 18, y1: 43, x2: 18, y2: 57, width: 1.5, color: PAL.marbleDark, role: 'flute' },
    { kind: 'line', x1: 28, y1: 43, x2: 28, y2: 57, width: 1.5, color: PAL.marbleDark, role: 'flute' },
    { kind: 'line', x1: 38, y1: 43, x2: 38, y2: 57, width: 1.5, color: PAL.marbleDark, role: 'flute' },
    { kind: 'rect', x: 46, y: 38, w: 12, h: 24, rx: 2, color: PAL.marbleDark, role: 'capital' },
    { kind: 'rect', x: 44, y: 38, w: 16, h: 5, rx: 1, color: PAL.marble, role: 'capitalLip' },
  ],
};

export const OBS_RUBBLE: SpriteDef = {
  id: 'obs_rubble',
  w: 64,
  h: 64,
  prims: [
    { kind: 'rect', x: 12, y: 48, w: 20, h: 12, rx: 2, color: PAL.marbleDark, role: 'block' },
    { kind: 'rect', x: 34, y: 44, w: 16, h: 16, rx: 2, color: PAL.marble, role: 'block' },
    { kind: 'rect', x: 24, y: 38, w: 14, h: 12, rx: 2, color: PAL.castleStone, role: 'block' },
    { kind: 'rect', x: 26, y: 40, w: 6, h: 4, rx: 1, color: PAL.castleStoneDark, role: 'chip' },
    { kind: 'rect', x: 40, y: 48, w: 6, h: 4, rx: 1, color: PAL.marbleDark, role: 'chip' },
  ],
};

// ── Frontier (bronze) — a mossy boulder and a ringed tree stump ────────────────
export const OBS_BOULDER_MOSS: SpriteDef = {
  id: 'obs_boulder_moss',
  w: 64,
  h: 64,
  prims: [
    { kind: 'poly', points: [[12, 58], [16, 40], [30, 33], [46, 38], [52, 52], [50, 58]], color: PAL.rock, role: 'body' },
    { kind: 'poly', points: [[30, 33], [46, 38], [52, 52], [42, 50]], color: PAL.rockDark, role: 'shade' },
    { kind: 'circle', cx: 26, cy: 41, r: 7, color: PAL.moss, role: 'moss' },
    { kind: 'circle', cx: 38, cy: 38, r: 4, color: PAL.moss, role: 'moss' },
    { kind: 'circle', cx: 18, cy: 50, r: 4, color: PAL.foliageDark, role: 'moss' },
  ],
};

export const OBS_STUMP: SpriteDef = {
  id: 'obs_stump',
  w: 64,
  h: 64,
  prims: [
    { kind: 'rect', x: 22, y: 42, w: 22, h: 18, rx: 4, color: PAL.bark, role: 'trunk' },
    { kind: 'rect', x: 36, y: 42, w: 8, h: 18, color: PAL.barkDark, role: 'trunkShade' },
    { kind: 'circle', cx: 33, cy: 42, r: 12, color: PAL.ringWood, role: 'top' },
    { kind: 'circle', cx: 33, cy: 42, r: 7, color: PAL.bark, role: 'ring' },
    { kind: 'circle', cx: 33, cy: 42, r: 3, color: PAL.ringWood, role: 'ringCore' },
    { kind: 'poly', points: [[20, 60], [24, 54], [28, 60]], color: PAL.barkDark, role: 'root' },
    { kind: 'poly', points: [[40, 60], [44, 54], [48, 60]], color: PAL.barkDark, role: 'root' },
  ],
};

// ── Deep Caverns (iron) — stalagmites and a glowing crystal cluster ────────────
export const OBS_STALAGMITE: SpriteDef = {
  id: 'obs_stalagmite',
  w: 64,
  h: 64,
  prims: [
    { kind: 'poly', points: [[20, 60], [30, 14], [40, 60]], color: PAL.caveStone, role: 'spike' },
    { kind: 'poly', points: [[30, 14], [40, 60], [33, 60]], color: PAL.caveStoneDark, role: 'shade' },
    { kind: 'poly', points: [[42, 60], [49, 34], [56, 60]], color: PAL.caveStone, role: 'spike2' },
    { kind: 'poly', points: [[49, 34], [56, 60], [50, 60]], color: PAL.caveStoneDark, role: 'shade2' },
  ],
};

export const OBS_CRYSTAL: SpriteDef = {
  id: 'obs_crystal',
  w: 64,
  h: 64,
  prims: [
    { kind: 'poly', points: [[24, 58], [20, 32], [30, 22], [34, 40]], color: PAL.crystalDeep, role: 'crystal' },
    { kind: 'poly', points: [[24, 58], [27, 34], [34, 40], [30, 58]], color: PAL.crystal, role: 'crystalLit' },
    { kind: 'poly', points: [[34, 58], [40, 30], [46, 44], [44, 58]], color: PAL.crystal, role: 'crystal2' },
    { kind: 'poly', points: [[40, 30], [46, 44], [42, 42]], color: PAL.crystalLite, role: 'facet' },
    { kind: 'line', x1: 28, y1: 30, x2: 26, y2: 50, width: 1.5, color: PAL.crystalLite, role: 'glint' },
  ],
};

// ── Sunken Colosseum (classical) — a snapped column and fallen statuary ────────
export const OBS_BROKEN_PILLAR: SpriteDef = {
  id: 'obs_broken_pillar',
  w: 64,
  h: 64,
  prims: [
    { kind: 'rect', x: 18, y: 54, w: 28, h: 8, rx: 1, color: PAL.marbleDark, role: 'plinth' },
    { kind: 'rect', x: 22, y: 22, w: 20, h: 34, rx: 2, color: PAL.marble, role: 'shaft' },
    { kind: 'poly', points: [[22, 24], [28, 16], [33, 24], [38, 17], [42, 24]], color: PAL.marble, role: 'break' },
    { kind: 'line', x1: 27, y1: 26, x2: 27, y2: 54, width: 1.5, color: PAL.marbleDark, role: 'flute' },
    { kind: 'line', x1: 32, y1: 22, x2: 32, y2: 54, width: 1.5, color: PAL.marbleDark, role: 'flute' },
    { kind: 'line', x1: 37, y1: 26, x2: 37, y2: 54, width: 1.5, color: PAL.marbleDark, role: 'flute' },
  ],
};

export const OBS_STATUE_RUBBLE: SpriteDef = {
  id: 'obs_statue_rubble',
  w: 64,
  h: 64,
  prims: [
    { kind: 'rect', x: 14, y: 44, w: 22, h: 16, rx: 2, color: PAL.marble, role: 'capital' },
    { kind: 'circle', cx: 19, cy: 46, r: 4, color: PAL.marbleDark, role: 'volute' },
    { kind: 'circle', cx: 31, cy: 46, r: 4, color: PAL.marbleDark, role: 'volute' },
    { kind: 'rect', x: 36, y: 46, w: 16, h: 14, rx: 6, color: PAL.marbleDark, role: 'drum' },
    { kind: 'rect', x: 38, y: 48, w: 12, h: 4, rx: 2, color: PAL.marble, role: 'drumLip' },
    { kind: 'circle', cx: 25, cy: 40, r: 3, color: PAL.laurel, role: 'moss' },
  ],
};

// ── The Cursed Keep (medieval) — a gravestone and a crenellated wall chunk ─────
export const OBS_GRAVESTONE: SpriteDef = {
  id: 'obs_gravestone',
  w: 64,
  h: 64,
  prims: [
    { kind: 'poly', points: [[12, 60], [50, 60], [46, 54], [16, 54]], color: PAL.earthDark, role: 'mound' },
    { kind: 'rect', x: 22, y: 28, w: 20, h: 30, rx: 2, color: PAL.castleStone, role: 'stone' },
    { kind: 'circle', cx: 32, cy: 28, r: 10, color: PAL.castleStone, role: 'arch' },
    { kind: 'rect', x: 37, y: 24, w: 5, h: 32, color: PAL.castleStoneDark, role: 'shade' },
    { kind: 'rect', x: 30, y: 30, w: 4, h: 16, rx: 1, color: PAL.castleStoneDark, role: 'crossV' },
    { kind: 'rect', x: 26, y: 34, w: 12, h: 4, rx: 1, color: PAL.castleStoneDark, role: 'crossH' },
  ],
};

export const OBS_WALL_RUBBLE: SpriteDef = {
  id: 'obs_wall_rubble',
  w: 64,
  h: 64,
  prims: [
    { kind: 'rect', x: 16, y: 32, w: 32, h: 28, rx: 1, color: PAL.castleStone, role: 'wall' },
    { kind: 'rect', x: 38, y: 34, w: 10, h: 26, color: PAL.castleStoneDark, role: 'shade' },
    { kind: 'rect', x: 16, y: 26, w: 9, h: 8, rx: 1, color: PAL.castleStone, role: 'merlon' },
    { kind: 'rect', x: 31, y: 26, w: 9, h: 8, rx: 1, color: PAL.castleStone, role: 'merlon' },
    { kind: 'rect', x: 28, y: 40, w: 5, h: 14, rx: 2, color: '#1a1612', role: 'arrowSlit' },
    { kind: 'poly', points: [[44, 32], [48, 32], [48, 42]], color: PAL.earthDark, role: 'break' },
  ],
};

// ── Plague City (renaissance) — a ruined plaster wall and a boarded barrel ─────
export const OBS_RUINED_WALL: SpriteDef = {
  id: 'obs_ruined_wall',
  w: 64,
  h: 64,
  prims: [
    { kind: 'rect', x: 16, y: 24, w: 30, h: 36, rx: 1, color: PAL.powder, role: 'plaster' },
    { kind: 'poly', points: [[16, 24], [22, 18], [28, 24], [36, 19], [46, 24]], color: PAL.powder, role: 'brokenTop' },
    { kind: 'rect', x: 38, y: 26, w: 8, h: 34, color: PAL.smoke, role: 'shade' },
    { kind: 'rect', x: 22, y: 34, w: 12, h: 12, rx: 1, color: '#161b14', role: 'window' },
    { kind: 'rect', x: 16, y: 50, w: 8, h: 6, rx: 1, color: PAL.brick, role: 'brick' },
    { kind: 'rect', x: 16, y: 44, w: 6, h: 5, rx: 1, color: PAL.brick, role: 'brick' },
  ],
};

export const OBS_BARREL_CRATE: SpriteDef = {
  id: 'obs_barrel_crate',
  w: 64,
  h: 64,
  prims: [
    { kind: 'rect', x: 14, y: 40, w: 22, h: 20, rx: 1, color: PAL.walnut, role: 'crate' },
    { kind: 'line', x1: 14, y1: 50, x2: 36, y2: 50, width: 1.5, color: PAL.barkDark, role: 'plank' },
    { kind: 'line', x1: 25, y1: 40, x2: 25, y2: 60, width: 1.5, color: PAL.barkDark, role: 'plank' },
    { kind: 'rect', x: 38, y: 42, w: 14, h: 18, rx: 5, color: PAL.walnut, role: 'barrel' },
    { kind: 'rect', x: 37, y: 45, w: 16, h: 3, rx: 1, color: PAL.blued, role: 'hoop' },
    { kind: 'rect', x: 37, y: 54, w: 16, h: 3, rx: 1, color: PAL.blued, role: 'hoop' },
  ],
};

// ── Foundry Wastes (industrial) — a glowing slag heap and scrap wreckage ───────
export const OBS_SLAG_HEAP: SpriteDef = {
  id: 'obs_slag_heap',
  w: 64,
  h: 64,
  prims: [
    { kind: 'poly', points: [[8, 60], [18, 42], [32, 34], [48, 44], [56, 60]], color: PAL.slag, role: 'heap' },
    { kind: 'poly', points: [[32, 34], [48, 44], [56, 60], [40, 54]], color: PAL.coal, role: 'shade' },
    { kind: 'line', x1: 24, y1: 50, x2: 30, y2: 40, width: 2, color: PAL.furnace, role: 'glow' },
    { kind: 'line', x1: 36, y1: 52, x2: 42, y2: 44, width: 2, color: PAL.ember, role: 'glow' },
    { kind: 'circle', cx: 28, cy: 56, r: 3, color: PAL.furnace, role: 'ember' },
    { kind: 'circle', cx: 44, cy: 56, r: 2, color: PAL.ember, role: 'ember' },
  ],
};

export const OBS_SCRAP: SpriteDef = {
  id: 'obs_scrap',
  w: 64,
  h: 64,
  prims: [
    { kind: 'circle', cx: 24, cy: 44, r: 13, color: PAL.castIron, role: 'gear' },
    { kind: 'rect', x: 22, y: 29, w: 4, h: 5, color: PAL.rivet, role: 'tooth' },
    { kind: 'rect', x: 22, y: 54, w: 4, h: 5, color: PAL.rivet, role: 'tooth' },
    { kind: 'rect', x: 9, y: 42, w: 5, h: 4, color: PAL.rivet, role: 'tooth' },
    { kind: 'rect', x: 34, y: 42, w: 5, h: 4, color: PAL.rivet, role: 'tooth' },
    { kind: 'circle', cx: 24, cy: 44, r: 5, color: PAL.coal, role: 'hub' },
    { kind: 'rect', x: 36, y: 48, w: 20, h: 8, rx: 4, color: PAL.rivet, role: 'pipe' },
    { kind: 'rect', x: 50, y: 46, w: 6, h: 12, rx: 1, color: PAL.copper, role: 'flange' },
  ],
};

// ── No Man's Land (modern) — stacked sandbags and a barbed-wire frame ──────────
export const OBS_SANDBAGS: SpriteDef = {
  id: 'obs_sandbags',
  w: 64,
  h: 64,
  prims: [
    { kind: 'rect', x: 12, y: 52, w: 16, h: 9, rx: 4, color: PAL.khaki, role: 'bag' },
    { kind: 'rect', x: 28, y: 52, w: 16, h: 9, rx: 4, color: PAL.olive, role: 'bag' },
    { kind: 'rect', x: 44, y: 52, w: 14, h: 9, rx: 4, color: PAL.khaki, role: 'bag' },
    { kind: 'rect', x: 20, y: 44, w: 16, h: 9, rx: 4, color: PAL.olive, role: 'bag' },
    { kind: 'rect', x: 36, y: 44, w: 16, h: 9, rx: 4, color: PAL.khaki, role: 'bag' },
    { kind: 'rect', x: 28, y: 36, w: 16, h: 9, rx: 4, color: PAL.olive, role: 'bag' },
  ],
};

export const OBS_BARBED_WIRE: SpriteDef = {
  id: 'obs_barbed_wire',
  w: 64,
  h: 64,
  prims: [
    { kind: 'line', x1: 14, y1: 58, x2: 40, y2: 30, width: 4, color: PAL.bark, role: 'post' },
    { kind: 'line', x1: 40, y1: 58, x2: 14, y2: 30, width: 4, color: PAL.barkDark, role: 'post' },
    { kind: 'line', x1: 46, y1: 56, x2: 56, y2: 38, width: 4, color: PAL.bark, role: 'post2' },
    { kind: 'line', x1: 8, y1: 40, x2: 58, y2: 34, width: 2, color: PAL.wire, role: 'wire' },
    { kind: 'line', x1: 10, y1: 48, x2: 56, y2: 44, width: 2, color: PAL.wire, role: 'wire' },
    { kind: 'circle', cx: 22, cy: 39, r: 2, color: PAL.wire, role: 'barb' },
    { kind: 'circle', cx: 36, cy: 37, r: 2, color: PAL.wire, role: 'barb' },
    { kind: 'circle', cx: 48, cy: 36, r: 2, color: PAL.wire, role: 'barb' },
  ],
};

export const OBSTACLES: SpriteDef[] = [
  OBS_TREE, OBS_ROCK,
  OBS_FALLEN_COLUMN, OBS_RUBBLE,
  OBS_BOULDER_MOSS, OBS_STUMP,
  OBS_STALAGMITE, OBS_CRYSTAL,
  OBS_BROKEN_PILLAR, OBS_STATUE_RUBBLE,
  OBS_GRAVESTONE, OBS_WALL_RUBBLE,
  OBS_RUINED_WALL, OBS_BARREL_CRATE,
  OBS_SLAG_HEAP, OBS_SCRAP,
  OBS_SANDBAGS, OBS_BARBED_WIRE,
];
