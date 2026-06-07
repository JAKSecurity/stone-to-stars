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

// SMELTER — hut with a squat stone furnace and molten/ember glow at the mouth
export const SMELTER: SpriteDef = {
  id: 'smelter',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // no standard door — replaced by the furnace mouth below
    // furnace body: squat brick block sitting in the doorway
    { kind: 'rect', x: 36, y: 60, w: 24, h: 30, rx: 3, color: PAL.caveStone, role: 'furnace' },
    // furnace mouth: glowing opening (molten glow, then ember core)
    { kind: 'rect', x: 42, y: 72, w: 12, h: 14, rx: 4, color: PAL.molten, role: 'furnaceMouth' },
    { kind: 'rect', x: 45, y: 76, w: 6, h: 8, rx: 3, color: PAL.ember, role: 'furnaceCore' },
    // short squat chimney on top of the furnace, poking through the roof
    { kind: 'rect', x: 44, y: 42, w: 8, h: 20, rx: 2, color: PAL.caveStoneDark, role: 'chimney' },
    { kind: 'rect', x: 42, y: 40, w: 12, h: 5, rx: 2, color: PAL.caveStoneDark, role: 'chimneyCap' },
    // heat shimmer: small flame wisps out of the chimney top
    { kind: 'poly', points: [[48, 28], [43, 40], [53, 40]], color: PAL.molten, role: 'flame' },
    { kind: 'poly', points: [[48, 33], [45, 40], [51, 40]], color: PAL.ember, role: 'flameCore' },
    // metal ingot leaning against the furnace side — reads as output product
    { kind: 'rect', x: 22, y: 76, w: 10, h: 6, rx: 2, color: PAL.iron, role: 'ingot' },
    { kind: 'rect', x: 20, y: 80, w: 14, h: 5, rx: 2, color: PAL.ironDark, role: 'ingot' },
  ],
};

// FOUNDRY — hut with a metal anvil and casting-mold motif
export const FOUNDRY: SpriteDef = {
  id: 'foundry',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(),
    // anvil body (steel — heavier than the forge's rock)
    { kind: 'rect', x: 58, y: 74, w: 22, h: 8, rx: 2, color: PAL.steel, role: 'anvilTop' },
    { kind: 'rect', x: 63, y: 82, w: 12, h: 6, rx: 2, color: PAL.metal, role: 'anvilWaist' },
    { kind: 'rect', x: 60, y: 86, w: 18, h: 4, rx: 2, color: PAL.metal, role: 'anvilBase' },
    // casting mold to the LEFT — a flat rectangular tray with a poured shape inside
    { kind: 'rect', x: 16, y: 80, w: 18, h: 10, rx: 2, color: PAL.caveStoneDark, role: 'mold' },
    { kind: 'rect', x: 19, y: 83, w: 12, h: 5, rx: 1, color: PAL.brass, role: 'casting' },
    // hammer lying on the anvil face
    { kind: 'rect', x: 60, y: 71, w: 16, h: 4, rx: 1, color: PAL.wood, role: 'handle' },
    { kind: 'rect', x: 74, y: 69, w: 6, h: 7, rx: 1, color: PAL.ironDark, role: 'hammerHead' },
    // small rune-mark on the wall — visual differentiator from forge
    { kind: 'circle', cx: 34, cy: 62, r: 4, color: PAL.rune, role: 'rune' },
    { kind: 'poly', points: [[30, 62], [34, 55], [38, 62]], color: PAL.trim, role: 'runeTri' },
  ],
};

// DEEP_MINE — like mine but a wider/darker shaft and iron ore in the pile and cart
export const DEEP_MINE: SpriteDef = {
  id: 'deep_mine',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // wall + roof only — deeper shaft replaces the door
    // wider, darker shaft (iron-dark, deeper feel than the standard mine)
    { kind: 'rect', x: 34, y: 60, w: 28, h: 31, rx: 8, color: '#100e0c', role: 'shaft' },
    // timber frame: posts and lintel (same role names as MINE for consistency)
    { kind: 'rect', x: 30, y: 58, w: 5, h: 33, color: PAL.wood, role: 'post' },
    { kind: 'rect', x: 61, y: 58, w: 5, h: 33, color: PAL.wood, role: 'post' },
    { kind: 'rect', x: 28, y: 55, w: 40, h: 6, rx: 1, color: PAL.wood, role: 'lintel' },
    // second support beam inside the shaft — signals greater depth
    { kind: 'rect', x: 34, y: 70, w: 28, h: 4, rx: 1, color: PAL.wood, role: 'supportBeam' },
    // iron ore pile to the LEFT (iron color vs rock color in MINE)
    { kind: 'circle', cx: 17, cy: 87, r: 4, color: PAL.iron, role: 'ore' },
    { kind: 'circle', cx: 24, cy: 88, r: 5, color: PAL.ironDark, role: 'ore' },
    { kind: 'circle', cx: 20, cy: 91, r: 5, color: PAL.iron, role: 'ore' },
    // minecart with iron ore (cart body, iron ore inside, rim, wheels)
    { kind: 'poly', points: [[68, 79], [88, 79], [85, 90], [71, 90]], color: PAL.door, role: 'cart' },
    { kind: 'circle', cx: 74, cy: 78, r: 4, color: PAL.iron, role: 'cartOre' },
    { kind: 'circle', cx: 82, cy: 77, r: 4, color: PAL.ironDark, role: 'cartOre' },
    { kind: 'rect', x: 67, y: 79, w: 22, h: 4, rx: 1, color: '#4a3526', role: 'cartRim' },
    { kind: 'circle', cx: 73, cy: 91, r: 3, color: '#2b2b2b', role: 'wheel' },
    { kind: 'circle', cx: 83, cy: 91, r: 3, color: '#2b2b2b', role: 'wheel' },
  ],
};

// ACADEMY — classical temple/portico: marble columns across the front, triangular pediment above
export const ACADEMY: SpriteDef = {
  id: 'academy',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // no standard door — replaced by the portico columns
    // pediment (triangular gable) in marble, above the roof apex — classical portico read
    { kind: 'poly', points: [[20, 50], [76, 50], [48, 30]], color: PAL.marble, role: 'pediment' },
    { kind: 'poly', points: [[22, 50], [74, 50], [48, 33]], color: PAL.marbleDark, role: 'pedimentInner' },
    // entablature (horizontal beam running across the column tops)
    { kind: 'rect', x: 18, y: 48, w: 60, h: 6, rx: 1, color: PAL.marbleDark, role: 'entablature' },
    // three marble columns evenly spaced across the façade
    { kind: 'rect', x: 24, y: 54, w: 8, h: 36, rx: 2, color: PAL.marble, role: 'column' },
    { kind: 'rect', x: 44, y: 54, w: 8, h: 36, rx: 2, color: PAL.marble, role: 'column' },
    { kind: 'rect', x: 64, y: 54, w: 8, h: 36, rx: 2, color: PAL.marble, role: 'column' },
    // column capitals (flared tops — Doric cap)
    { kind: 'rect', x: 21, y: 51, w: 14, h: 4, rx: 1, color: PAL.marbleDark, role: 'capital' },
    { kind: 'rect', x: 41, y: 51, w: 14, h: 4, rx: 1, color: PAL.marbleDark, role: 'capital' },
    { kind: 'rect', x: 61, y: 51, w: 14, h: 4, rx: 1, color: PAL.marbleDark, role: 'capital' },
    // stylobate (stepped base platform)
    { kind: 'rect', x: 14, y: 88, w: 68, h: 6, rx: 2, color: PAL.marble, role: 'stylobate' },
    { kind: 'rect', x: 16, y: 84, w: 64, h: 6, rx: 1, color: PAL.marbleDark, role: 'stylobateStep' },
    // scroll (papyrus roll) leaning against the left column — scholarly identifier
    { kind: 'rect', x: 10, y: 68, w: 6, h: 18, rx: 3, color: PAL.toga, role: 'scroll' },
    { kind: 'rect', x: 8, y: 67, w: 10, h: 4, rx: 2, color: PAL.marbleDark, role: 'scrollEnd' },
    { kind: 'rect', x: 8, y: 82, w: 10, h: 4, rx: 2, color: PAL.marbleDark, role: 'scrollEnd' },
    // laurel wreath circle above the central column — cultural/scholarly marker
    { kind: 'circle', cx: 48, cy: 42, r: 5, color: PAL.laurel, role: 'wreath' },
    { kind: 'circle', cx: 48, cy: 42, r: 3, color: PAL.marbleDark, role: 'wreathInner' },
  ],
};

// MARKET — hut with oxblood/toga striped awning, amphora, and gold coin piles
export const MARKET: SpriteDef = {
  id: 'market',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // no standard door — stall fills the front
    // awning frame: two posts supporting the canopy
    { kind: 'rect', x: 20, y: 52, w: 4, h: 38, color: PAL.wood, role: 'awningPost' },
    { kind: 'rect', x: 72, y: 52, w: 4, h: 38, color: PAL.wood, role: 'awningPost' },
    // striped awning canopy (alternating oxblood and toga stripes)
    { kind: 'rect', x: 18, y: 52, w: 60, h: 10, rx: 2, color: PAL.oxblood, role: 'awning' },
    { kind: 'rect', x: 18, y: 56, w: 60, h: 3, color: PAL.toga, role: 'awningStripe' },
    { kind: 'rect', x: 18, y: 60, w: 60, h: 3, color: PAL.oxblood, role: 'awningStripe' },
    // market stall counter (wide plank)
    { kind: 'rect', x: 20, y: 68, w: 56, h: 6, rx: 2, color: PAL.wood, role: 'counter' },
    { kind: 'rect', x: 20, y: 73, w: 56, h: 3, rx: 1, color: PAL.door, role: 'counterEdge' },
    // amphora (storage jar): belly, neck, mouth
    { kind: 'poly', points: [[34, 76], [30, 88], [42, 88], [38, 76]], color: PAL.marbleDark, role: 'amphora' },
    { kind: 'rect', x: 33, y: 72, w: 8, h: 6, rx: 2, color: PAL.marble, role: 'amphoraNeck' },
    { kind: 'rect', x: 32, y: 70, w: 10, h: 4, rx: 3, color: PAL.marbleDark, role: 'amphoraMouth' },
    // amphora handles (two small arcs rendered as short rects)
    { kind: 'rect', x: 27, y: 76, w: 5, h: 6, rx: 3, color: PAL.marbleDark, role: 'handle' },
    { kind: 'rect', x: 42, y: 76, w: 5, h: 6, rx: 3, color: PAL.marbleDark, role: 'handle' },
    // coin pile on the counter (3 overlapping gold circles = trade goods)
    { kind: 'circle', cx: 62, cy: 65, r: 5, color: PAL.gold, role: 'coin' },
    { kind: 'circle', cx: 70, cy: 64, r: 5, color: PAL.goldDark, role: 'coin' },
    { kind: 'circle', cx: 66, cy: 62, r: 4, color: PAL.gold, role: 'coin' },
    // gold coin markings
    { kind: 'circle', cx: 62, cy: 65, r: 2, color: PAL.goldDark, role: 'coinMark' },
    { kind: 'circle', cx: 70, cy: 64, r: 2, color: PAL.gold, role: 'coinMark' },
  ],
};

// WORKSHOP — hut with an artisan bench, chisel, and hammer for a crafting read
export const WORKSHOP: SpriteDef = {
  id: 'workshop',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // no standard door — bench fills the front
    // workbench top
    { kind: 'rect', x: 18, y: 70, w: 60, h: 8, rx: 2, color: PAL.marbleDark, role: 'bench' },
    // bench legs
    { kind: 'rect', x: 20, y: 78, w: 5, h: 12, color: PAL.wood, role: 'leg' },
    { kind: 'rect', x: 71, y: 78, w: 5, h: 12, color: PAL.wood, role: 'leg' },
    // bench shelf below the top
    { kind: 'rect', x: 22, y: 82, w: 52, h: 4, rx: 1, color: PAL.wood, role: 'shelf' },
    // chisel on the bench (tall thin blade + square butt)
    { kind: 'rect', x: 28, y: 58, w: 4, h: 14, rx: 1, color: PAL.brass, role: 'chiselBlade' },
    { kind: 'rect', x: 26, y: 54, w: 8, h: 6, rx: 2, color: PAL.gold, role: 'chiselButt' },
    // hammer on the bench: handle + head
    { kind: 'rect', x: 48, y: 56, w: 4, h: 16, rx: 1, color: PAL.wood, role: 'hammerHandle' },
    { kind: 'rect', x: 44, y: 52, w: 12, h: 7, rx: 2, color: PAL.gold, role: 'hammerHead' },
    { kind: 'rect', x: 44, y: 58, w: 12, h: 3, rx: 1, color: PAL.goldDark, role: 'hammerFace' },
    // stone block being worked — reads as the artisan's project
    { kind: 'rect', x: 62, y: 56, w: 18, h: 14, rx: 3, color: PAL.marble, role: 'stoneBlock' },
    { kind: 'rect', x: 64, y: 58, w: 10, h: 6, rx: 2, color: PAL.marbleDark, role: 'chiselMark' },
    // wood shavings / marble chips beside the block
    { kind: 'rect', x: 62, y: 68, w: 18, h: 4, rx: 2, color: PAL.toga, role: 'chips' },
    // tool rack on the wall — two pegs
    { kind: 'rect', x: 28, y: 60, w: 2, h: 8, rx: 1, color: PAL.brassDark, role: 'peg' },
    { kind: 'rect', x: 36, y: 60, w: 2, h: 8, rx: 1, color: PAL.brassDark, role: 'peg' },
  ],
};

export const BUILDINGS: SpriteDef[] = [GRANARY, MINE, FORGE, SMELTER, FOUNDRY, DEEP_MINE, ACADEMY, MARKET, WORKSHOP];
