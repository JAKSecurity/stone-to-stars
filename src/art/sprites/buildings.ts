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

// KEEP — fortified castle keep: thick castle-stone walls, crenellated battlements, arrow slit, royal banner
export const KEEP: SpriteDef = {
  id: 'keep',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // wall + roof base — no standard door; keep façade replaces it
    // main keep tower body (castle stone, taller and heavier than the base hut wall)
    { kind: 'rect', x: 26, y: 28, w: 44, h: 62, rx: 2, color: PAL.castleStone, role: 'tower' },
    // darker shadow on the right face for depth
    { kind: 'rect', x: 52, y: 30, w: 18, h: 58, rx: 1, color: PAL.castleStoneDark, role: 'towerShadow' },
    // battlements (merlons) across the top — 5 alternating rects
    { kind: 'rect', x: 26, y: 22, w: 8, h: 10, rx: 1, color: PAL.castleStone, role: 'merlon' },
    { kind: 'rect', x: 38, y: 22, w: 8, h: 10, rx: 1, color: PAL.castleStone, role: 'merlon' },
    { kind: 'rect', x: 50, y: 22, w: 8, h: 10, rx: 1, color: PAL.castleStone, role: 'merlon' },
    { kind: 'rect', x: 62, y: 22, w: 8, h: 10, rx: 1, color: PAL.castleStone, role: 'merlon' },
    // battlement parapet / wall-walk (horizontal band linking merlons)
    { kind: 'rect', x: 26, y: 30, w: 44, h: 5, rx: 1, color: PAL.castleStoneDark, role: 'parapet' },
    // arrow slit (narrow vertical opening in the tower face)
    { kind: 'rect', x: 45, y: 42, w: 6, h: 18, rx: 2, color: '#1a1612', role: 'arrowSlit' },
    // iron-banded gatehouse arch at the base (portcullis opening)
    { kind: 'rect', x: 38, y: 66, w: 20, h: 24, rx: 4, color: '#1a1612', role: 'gatehouse' },
    { kind: 'rect', x: 38, y: 66, w: 20, h: 8, rx: 2, color: PAL.castleStoneDark, role: 'portcullisBar' },
    { kind: 'rect', x: 38, y: 76, w: 20, h: 4, rx: 1, color: PAL.castleStoneDark, role: 'portcullisBar' },
    // royal banner (flag pole + blue pennant with crimson stripe — heraldry read)
    { kind: 'rect', x: 68, y: 16, w: 2, h: 22, color: PAL.castleStoneDark, role: 'flagPole' },
    { kind: 'poly', points: [[70, 16], [82, 21], [70, 26]], color: PAL.royal, role: 'banner' },
    { kind: 'rect', x: 70, y: 20, w: 12, h: 3, color: PAL.crimson, role: 'bannerStripe' },
  ],
};

// CATHEDRAL — gothic church: pointed spire, rose window, lancet door arch
export const CATHEDRAL: SpriteDef = {
  id: 'cathedral',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // wall + hut body — nave forms the lower structure
    // nave side walls extended upward to give height (castle stone — sacred masonry)
    { kind: 'rect', x: 22, y: 42, w: 52, h: 48, rx: 2, color: PAL.castleStone, role: 'nave' },
    // darker side shadow on the nave
    { kind: 'rect', x: 58, y: 44, w: 16, h: 44, rx: 1, color: PAL.castleStoneDark, role: 'naveShadow' },
    // gothic spire: tall pointed poly soaring above the nave
    { kind: 'poly', points: [[48, 4], [36, 36], [60, 36]], color: PAL.castleStone, role: 'spire' },
    // spire shadow stripe
    { kind: 'poly', points: [[48, 4], [52, 36], [60, 36]], color: PAL.castleStoneDark, role: 'spireShadow' },
    // rose window (large decorative circle — royal blue with bone tracery ring)
    { kind: 'circle', cx: 48, cy: 54, r: 11, color: PAL.royal, role: 'roseWindow' },
    { kind: 'circle', cx: 48, cy: 54, r: 8, color: PAL.bone, role: 'roseTracery' },
    { kind: 'circle', cx: 48, cy: 54, r: 5, color: PAL.royal, role: 'roseCenter' },
    { kind: 'circle', cx: 48, cy: 54, r: 2, color: PAL.bone, role: 'roseCenterDot' },
    // lancet (pointed-arch) doorway
    { kind: 'poly', points: [[41, 90], [41, 72], [48, 65], [55, 72], [55, 90]], color: '#1a1612', role: 'lancetDoor' },
    // stone buttress piers flanking the door (reads as flying buttresses)
    { kind: 'rect', x: 22, y: 68, w: 8, h: 22, rx: 1, color: PAL.castleStoneDark, role: 'buttress' },
    { kind: 'rect', x: 66, y: 68, w: 8, h: 22, rx: 1, color: PAL.castleStoneDark, role: 'buttress' },
  ],
};

// ARMORY — medieval smithy/armory: weapon rack with crossed swords, heraldic shield, anvil
export const ARMORY: SpriteDef = {
  id: 'armory',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // wall + roof base — armoury fills the front
    // armory façade wall (steel blue — cold metal workshop feel, distinct from forge/foundry)
    { kind: 'rect', x: 24, y: 52, w: 48, h: 38, rx: 2, color: PAL.steelBlue, role: 'facadeOverlay' },
    // weapon rack: horizontal bar across the upper wall
    { kind: 'rect', x: 22, y: 58, w: 52, h: 4, rx: 2, color: PAL.castleStoneDark, role: 'rackBar' },
    // crossed swords (left pair) — two overlapping narrow polys in steel
    { kind: 'poly', points: [[30, 52], [28, 74], [32, 74]], color: PAL.steel, role: 'sword' },
    { kind: 'poly', points: [[28, 52], [34, 74], [30, 52], [34, 52]], color: PAL.metal, role: 'swordEdge' },
    { kind: 'poly', points: [[38, 52], [36, 74], [40, 74]], color: PAL.steel, role: 'sword' },
    { kind: 'poly', points: [[36, 52], [42, 74], [38, 52], [42, 52]], color: PAL.metal, role: 'swordEdge' },
    // heraldic shield (center) — royal blue with crimson chevron
    { kind: 'poly', points: [[44, 60], [56, 60], [56, 72], [50, 78], [44, 72]], color: PAL.royal, role: 'shield' },
    { kind: 'poly', points: [[44, 60], [56, 60], [50, 69]], color: PAL.crimson, role: 'chevron' },
    // halberd pole (right side — diagonal polearm hanging from the rack)
    { kind: 'rect', x: 62, y: 54, w: 4, h: 30, rx: 1, color: PAL.wood, role: 'halfPole' },
    { kind: 'poly', points: [[64, 50], [60, 58], [68, 58]], color: PAL.steelBlue, role: 'halberdHead' },
    // anvil (lower right — medieval steel anvil, distinct from foundry's casting setup)
    { kind: 'rect', x: 64, y: 78, w: 18, h: 6, rx: 2, color: PAL.steelBlue, role: 'anvilTop' },
    { kind: 'rect', x: 68, y: 84, w: 10, h: 5, rx: 2, color: PAL.castleStoneDark, role: 'anvilWaist' },
    { kind: 'rect', x: 65, y: 88, w: 16, h: 4, rx: 2, color: PAL.castleStoneDark, role: 'anvilBase' },
    // crimson heraldry banner strip along the top (martial livery)
    { kind: 'rect', x: 24, y: 52, w: 48, h: 4, rx: 1, color: PAL.crimson, role: 'livery' },
  ],
};

// GUNSMITH — a gunsmith's shop: hutBase + blued/walnut musket on wall, powder barrel, muzzle puff
export const GUNSMITH: SpriteDef = {
  id: 'gunsmith',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // no standard door — the shop front replaces it
    // shop-front board across the lower wall (walnut plank)
    { kind: 'rect', x: 22, y: 68, w: 52, h: 4, rx: 2, color: PAL.walnut, role: 'shopBoard' },
    // musket mounted on the wall (barrel: long blued rect; stock: shorter walnut rect)
    { kind: 'rect', x: 26, y: 56, w: 36, h: 5, rx: 1, color: PAL.blued, role: 'barrel' },
    { kind: 'rect', x: 30, y: 59, w: 22, h: 7, rx: 2, color: PAL.walnut, role: 'stock' },
    // lock mechanism (small blued square at midpoint of barrel/stock join)
    { kind: 'rect', x: 46, y: 57, w: 7, h: 6, rx: 1, color: PAL.blued, role: 'lock' },
    // muzzle flash at the barrel tip — read as displayed/test-fired
    { kind: 'poly', points: [[62, 54], [68, 58], [62, 62]], color: PAL.gunfire, role: 'muzzleFlash' },
    { kind: 'circle', cx: 64, cy: 58, r: 3, color: PAL.smoke, role: 'smokeCloud' },
    // powder barrel (walnut cask body, blued iron hoops)
    { kind: 'rect', x: 14, y: 72, w: 14, h: 18, rx: 4, color: PAL.walnut, role: 'barrel' },
    { kind: 'rect', x: 12, y: 74, w: 18, h: 3, rx: 1, color: PAL.blued, role: 'hoop' },
    { kind: 'rect', x: 12, y: 83, w: 18, h: 3, rx: 1, color: PAL.blued, role: 'hoop' },
    // barrel lid
    { kind: 'rect', x: 14, y: 70, w: 14, h: 4, rx: 3, color: PAL.walnut, role: 'lid' },
    // mount bracket holding the gun to the wall
    { kind: 'rect', x: 31, y: 55, w: 4, h: 11, rx: 1, color: PAL.blued, role: 'mount' },
    { kind: 'rect', x: 51, y: 55, w: 4, h: 11, rx: 1, color: PAL.blued, role: 'mount' },
  ],
};

// UNIVERSITY — a scholarly hall: hutBase + domed cupola, arched windows, velvet pennant
export const UNIVERSITY: SpriteDef = {
  id: 'university',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // no standard door — academic façade replaces it
    // tall hall body (smoke-colored stone — distinct from marble academy)
    { kind: 'rect', x: 20, y: 44, w: 56, h: 46, rx: 2, color: PAL.smoke, role: 'hallBody' },
    // side shadow on the hall
    { kind: 'rect', x: 58, y: 46, w: 18, h: 42, rx: 1, color: PAL.powder, role: 'hallShadow' },
    // dome cupola atop the hall (circle = dome form, distinct from spire/pediment)
    { kind: 'circle', cx: 48, cy: 34, r: 16, color: PAL.powder, role: 'dome' },
    { kind: 'circle', cx: 48, cy: 34, r: 12, color: PAL.smoke, role: 'domeInner' },
    // drum under the dome (short cylinder connecting dome to hall)
    { kind: 'rect', x: 34, y: 42, w: 28, h: 6, rx: 2, color: PAL.powder, role: 'drum' },
    // dome lantern (small circle at the very top of the dome)
    { kind: 'circle', cx: 48, cy: 20, r: 4, color: PAL.smoke, role: 'lantern' },
    { kind: 'circle', cx: 48, cy: 20, r: 2, color: PAL.velvet, role: 'lanternCap' },
    // tall arched windows (two flanking the central arch doorway)
    { kind: 'poly', points: [[28, 64], [28, 76], [34, 82], [40, 76], [40, 64]], color: '#1a1612', role: 'arch' },
    { kind: 'poly', points: [[56, 64], [56, 76], [62, 82], [68, 76], [68, 64]], color: '#1a1612', role: 'arch' },
    // lancet entry archway at the center
    { kind: 'poly', points: [[42, 90], [42, 74], [48, 68], [54, 74], [54, 90]], color: '#1a1612', role: 'door' },
    // velvet pennant on a short flagpole above the dome
    { kind: 'rect', x: 47, y: 10, w: 2, h: 12, color: PAL.powder, role: 'flagPole' },
    { kind: 'poly', points: [[49, 10], [62, 14], [49, 18]], color: PAL.velvet, role: 'pennant' },
  ],
};

// BANK — a counting-house: hutBase + columned smoke façade with pediment, gold coin stacks, velvet bags
export const BANK: SpriteDef = {
  id: 'bank',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // no standard door — columned bank façade replaces it
    // solid bank facade body (smoke — heavier than market's open stall, cooler than classical marble)
    { kind: 'rect', x: 18, y: 48, w: 60, h: 42, rx: 2, color: PAL.smoke, role: 'facade' },
    // pediment (triangular gable) above — solid not open like the academy, reads as bank not temple
    { kind: 'poly', points: [[16, 48], [80, 48], [48, 30]], color: PAL.powder, role: 'pediment' },
    // entablature bar across column tops
    { kind: 'rect', x: 16, y: 46, w: 64, h: 5, rx: 1, color: PAL.powder, role: 'entablature' },
    // four smoke/powder columns (bank has 4 vs academy's 3 — more imposing financial institution)
    { kind: 'rect', x: 22, y: 52, w: 6, h: 34, rx: 2, color: PAL.smoke, role: 'column' },
    { kind: 'rect', x: 36, y: 52, w: 6, h: 34, rx: 2, color: PAL.smoke, role: 'column' },
    { kind: 'rect', x: 54, y: 52, w: 6, h: 34, rx: 2, color: PAL.smoke, role: 'column' },
    { kind: 'rect', x: 68, y: 52, w: 6, h: 34, rx: 2, color: PAL.smoke, role: 'column' },
    // column capitals
    { kind: 'rect', x: 19, y: 49, w: 12, h: 4, rx: 1, color: PAL.powder, role: 'capital' },
    { kind: 'rect', x: 33, y: 49, w: 12, h: 4, rx: 1, color: PAL.powder, role: 'capital' },
    { kind: 'rect', x: 51, y: 49, w: 12, h: 4, rx: 1, color: PAL.powder, role: 'capital' },
    { kind: 'rect', x: 65, y: 49, w: 12, h: 4, rx: 1, color: PAL.powder, role: 'capital' },
    // heavy iron bank door (blued — secure, not open like a market)
    { kind: 'rect', x: 41, y: 68, w: 14, h: 22, rx: 2, color: PAL.blued, role: 'bankDoor' },
    { kind: 'circle', cx: 52, cy: 79, r: 2, color: PAL.gold, role: 'doorKnob' },
    // gold coin stacks by the door (wealth read — distinct from market's loose pile)
    { kind: 'rect', x: 12, y: 80, w: 8, h: 4, rx: 2, color: PAL.gold, role: 'coinStack' },
    { kind: 'rect', x: 11, y: 76, w: 10, h: 5, rx: 2, color: PAL.gold, role: 'coinStack' },
    { kind: 'rect', x: 12, y: 72, w: 8, h: 5, rx: 2, color: PAL.gold, role: 'coinStack' },
    { kind: 'circle', cx: 16, cy: 74, r: 3, color: PAL.goldDark, role: 'coinFace' },
    // velvet money bag by the right column
    { kind: 'circle', cx: 78, cy: 80, r: 8, color: PAL.velvet, role: 'moneybag' },
    { kind: 'rect', x: 74, y: 72, w: 8, h: 6, rx: 3, color: PAL.velvet, role: 'bagNeck' },
    { kind: 'rect', x: 75, y: 70, w: 6, h: 4, rx: 2, color: PAL.walnut, role: 'bagTie' },
  ],
};

// FACTORY — industrial plant: hutBase(false) + tall riveted smokestack with steam/coal smoke puffs,
// riveted castIron wall plating, furnace glow at a vent. Distinct from iron-age foundry/smelter.
export const FACTORY: SpriteDef = {
  id: 'factory',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // no standard door — factory front replaces it
    // castIron wall plating overlay — heavy riveted industrial cladding
    { kind: 'rect', x: 24, y: 52, w: 48, h: 38, rx: 2, color: PAL.castIron, role: 'wallPlating' },
    // rivet rows across the plating (three horizontal bands of dark dots, rendered as thin rects)
    { kind: 'rect', x: 24, y: 56, w: 48, h: 3, rx: 1, color: PAL.rivet, role: 'rivetBand' },
    { kind: 'rect', x: 24, y: 66, w: 48, h: 3, rx: 1, color: PAL.rivet, role: 'rivetBand' },
    { kind: 'rect', x: 24, y: 76, w: 48, h: 3, rx: 1, color: PAL.rivet, role: 'rivetBand' },
    // rivet dot accents at corners of the plating
    { kind: 'circle', cx: 28, cy: 57, r: 2, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 68, cy: 57, r: 2, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 28, cy: 77, r: 2, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 68, cy: 77, r: 2, color: PAL.rivet, role: 'rivet' },
    // tall smokestack rising from the right side of the roof — main industrial read
    { kind: 'rect', x: 60, y: 8, w: 12, h: 46, rx: 2, color: PAL.castIron, role: 'smokestack' },
    // rivet bands on the smokestack
    { kind: 'rect', x: 58, y: 20, w: 16, h: 3, rx: 1, color: PAL.rivet, role: 'stackRivet' },
    { kind: 'rect', x: 58, y: 36, w: 16, h: 3, rx: 1, color: PAL.rivet, role: 'stackRivet' },
    // smokestack cap (flared top)
    { kind: 'rect', x: 57, y: 6, w: 18, h: 5, rx: 2, color: PAL.rivet, role: 'stackCap' },
    // steam/coal smoke puffs bilging from the stack top
    { kind: 'circle', cx: 66, cy: 3, r: 4, color: PAL.steam, role: 'smoke' },
    { kind: 'circle', cx: 72, cy: 1, r: 3, color: PAL.coal, role: 'smoke' },
    { kind: 'circle', cx: 60, cy: 2, r: 3, color: PAL.steam, role: 'smoke' },
    // furnace vent on the lower left of the plating — glowing furnace opening
    { kind: 'rect', x: 28, y: 80, w: 16, h: 9, rx: 3, color: PAL.coal, role: 'vent' },
    { kind: 'rect', x: 30, y: 82, w: 12, h: 6, rx: 2, color: PAL.furnace, role: 'furnaceGlow' },
    { kind: 'rect', x: 33, y: 84, w: 6, h: 3, rx: 1, color: PAL.ember, role: 'furnaceCore' },
  ],
};

// POWERPLANT — a power station: hutBase(false) + copper coils/pipes + electric arc/spark (cyan zigzag) + castIron tank.
export const POWERPLANT: SpriteDef = {
  id: 'powerplant',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // no standard door — power station front replaces it
    // castIron main body / generator hall (darker, heavier than the hut base)
    { kind: 'rect', x: 20, y: 44, w: 56, h: 46, rx: 2, color: PAL.castIron, role: 'hallBody' },
    // rivet band across the hall top
    { kind: 'rect', x: 20, y: 48, w: 56, h: 3, rx: 1, color: PAL.rivet, role: 'rivetBand' },
    // large copper boiler tank (dome-topped cylinder on the left)
    { kind: 'rect', x: 22, y: 56, w: 20, h: 28, rx: 3, color: PAL.copper, role: 'boilerBody' },
    { kind: 'circle', cx: 32, cy: 56, r: 10, color: PAL.copper, role: 'boilerDome' },
    // copper pipe running from the boiler across to the right
    { kind: 'rect', x: 42, y: 60, w: 30, h: 6, rx: 3, color: PAL.copper, role: 'pipe' },
    // pipe elbow joint (small circle at the junction)
    { kind: 'circle', cx: 44, cy: 63, r: 4, color: PAL.copper, role: 'pipeJoint' },
    // steam release valve on the boiler (small circle on top)
    { kind: 'circle', cx: 32, cy: 46, r: 3, color: PAL.steam, role: 'valve' },
    { kind: 'rect', x: 30, y: 43, w: 4, h: 5, rx: 1, color: PAL.copper, role: 'valveStem' },
    // electric arc / spark — cyan zigzag poly (distinctive electric read)
    { kind: 'poly', points: [[62, 48], [56, 58], [62, 56], [56, 68]], color: PAL.electric, role: 'arc' },
    { kind: 'poly', points: [[68, 46], [62, 56], [68, 54], [62, 66]], color: PAL.electric, role: 'arc' },
    // insulator discs flanking the arc (small castIron circles — reads as electrical insulator stack)
    { kind: 'circle', cx: 58, cy: 70, r: 4, color: PAL.castIron, role: 'insulator' },
    { kind: 'circle', cx: 68, cy: 70, r: 4, color: PAL.castIron, role: 'insulator' },
    { kind: 'circle', cx: 58, cy: 70, r: 2, color: PAL.rivet, role: 'insulatorCore' },
    { kind: 'circle', cx: 68, cy: 70, r: 2, color: PAL.rivet, role: 'insulatorCore' },
    // control panel / switch box on the lower right (riveted castIron plate with electric indicator)
    { kind: 'rect', x: 54, y: 74, w: 18, h: 14, rx: 2, color: PAL.rivet, role: 'controlPanel' },
    { kind: 'circle', cx: 60, cy: 81, r: 3, color: PAL.electric, role: 'indicator' },
    { kind: 'circle', cx: 68, cy: 81, r: 3, color: PAL.steam, role: 'indicator' },
  ],
};

// ARSENAL — a munitions depot: hutBase() + stacked furnace/castIron shells/barrels + copper/steam crate, riveted door.
// Distinct from medieval armory (industrial shells/barrels vs medieval blades/shields).
export const ARSENAL: SpriteDef = {
  id: 'arsenal',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(), // keep the standard door — it gets a riveted overlay
    // riveted castIron door overlay (militarised, industrial look over the standard door)
    { kind: 'rect', x: 41, y: 65, w: 14, h: 25, rx: 1, color: PAL.castIron, role: 'ironDoor' },
    { kind: 'rect', x: 41, y: 70, w: 14, h: 3, rx: 1, color: PAL.rivet, role: 'doorRivet' },
    { kind: 'rect', x: 41, y: 79, w: 14, h: 3, rx: 1, color: PAL.rivet, role: 'doorRivet' },
    { kind: 'circle', cx: 52, cy: 80, r: 2, color: PAL.copper, role: 'doorKnob' },
    // stacked artillery shells against the left wall (furnace orange + castIron base — military read)
    { kind: 'poly', points: [[14, 90], [22, 90], [20, 72], [16, 72]], color: PAL.castIron, role: 'shell' },
    { kind: 'poly', points: [[16, 72], [20, 72], [18, 64]], color: PAL.furnace, role: 'shellNose' },
    { kind: 'poly', points: [[22, 90], [30, 90], [28, 72], [24, 72]], color: PAL.castIron, role: 'shell' },
    { kind: 'poly', points: [[24, 72], [28, 72], [26, 64]], color: PAL.furnace, role: 'shellNose' },
    // a third shell leaning: wider base reads as heavy ordnance
    { kind: 'poly', points: [[14, 90], [30, 90], [28, 84], [16, 84]], color: PAL.rivet, role: 'shellBase' },
    // copper/steam packing crate to the right — stamped military crate look
    { kind: 'rect', x: 64, y: 68, w: 20, h: 18, rx: 2, color: PAL.copper, role: 'crate' },
    { kind: 'rect', x: 64, y: 72, w: 20, h: 3, rx: 1, color: PAL.castIron, role: 'crateStripe' },
    { kind: 'rect', x: 64, y: 79, w: 20, h: 3, rx: 1, color: PAL.castIron, role: 'crateStripe' },
    // steam pressure gauge on the crate lid (small circle — industrial detail)
    { kind: 'circle', cx: 74, cy: 68, r: 4, color: PAL.steam, role: 'gauge' },
    { kind: 'circle', cx: 74, cy: 68, r: 2, color: PAL.castIron, role: 'gaugeNeedle' },
    // powder barrel beside the crate (coal dark body, copper hoop bands)
    { kind: 'rect', x: 66, y: 82, w: 14, h: 9, rx: 4, color: PAL.coal, role: 'powderBarrel' },
    { kind: 'rect', x: 64, y: 83, w: 18, h: 3, rx: 1, color: PAL.copper, role: 'barrelHoop' },
    { kind: 'rect', x: 64, y: 88, w: 18, h: 2, rx: 1, color: PAL.copper, role: 'barrelHoop' },
  ],
};

// MOTOR_POOL — a vehicle depot: hutBase(false) + wide gunmetal garage door + olive jeep silhouette + hazard-striped trim
export const MOTOR_POOL: SpriteDef = {
  id: 'motor_pool',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // wall + roof — no standard door; garage facade replaces it
    // gunmetal wall cladding over the base (mechanized industrial feel, olive trim)
    { kind: 'rect', x: 24, y: 52, w: 48, h: 38, rx: 2, color: PAL.gunmetal, role: 'garageFacade' },
    // olive trim band at the top of the facade (military livery)
    { kind: 'rect', x: 24, y: 52, w: 48, h: 5, rx: 1, color: PAL.olive, role: 'liveryBand' },
    // wide garage door — two panels, hazard-yellow frame, dark opening
    { kind: 'rect', x: 28, y: 60, w: 40, h: 30, rx: 2, color: PAL.asphalt, role: 'garageDoorOpening' },
    { kind: 'rect', x: 28, y: 60, w: 40, h: 4, rx: 1, color: PAL.hazard, role: 'doorHeader' },
    { kind: 'rect', x: 28, y: 60, w: 4, h: 30, color: PAL.hazard, role: 'doorJamb' },
    { kind: 'rect', x: 64, y: 60, w: 4, h: 30, color: PAL.hazard, role: 'doorJamb' },
    // jeep silhouette inside garage: olive body rect, gunmetal windshield, dark wheels
    { kind: 'rect', x: 34, y: 72, w: 28, h: 12, rx: 3, color: PAL.olive, role: 'jeepBody' },
    { kind: 'rect', x: 38, y: 68, w: 18, h: 6, rx: 2, color: PAL.gunmetal, role: 'jeepCabin' },
    { kind: 'circle', cx: 39, cy: 85, r: 4, color: PAL.asphalt, role: 'wheel' },
    { kind: 'circle', cx: 57, cy: 85, r: 4, color: PAL.asphalt, role: 'wheel' },
    { kind: 'circle', cx: 39, cy: 85, r: 2, color: PAL.gunmetal, role: 'hubcap' },
    { kind: 'circle', cx: 57, cy: 85, r: 2, color: PAL.gunmetal, role: 'hubcap' },
    // fuel drum to the left side — olive barrel with gunmetal bands
    { kind: 'rect', x: 14, y: 70, w: 10, h: 18, rx: 3, color: PAL.olive, role: 'fuelDrum' },
    { kind: 'rect', x: 12, y: 73, w: 14, h: 3, rx: 1, color: PAL.gunmetal, role: 'drumBand' },
    { kind: 'rect', x: 12, y: 81, w: 14, h: 3, rx: 1, color: PAL.gunmetal, role: 'drumBand' },
    // hazard stripe on the drum lid
    { kind: 'rect', x: 14, y: 68, w: 10, h: 4, rx: 2, color: PAL.hazard, role: 'drumLid' },
  ],
};

// BARRACKS — a military barracks: hutBase() + olive/khaki walls, flag pole with flag, sandbag bunker by door
export const BARRACKS: SpriteDef = {
  id: 'barracks',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(), // standard door — barracks has an entrance
    // olive wall cladding (military exterior over the standard hut wall)
    { kind: 'rect', x: 24, y: 52, w: 48, h: 38, rx: 2, color: PAL.olive, role: 'barracksFacade' },
    // khaki horizontal siding stripes (wall planks / clapboard siding)
    { kind: 'rect', x: 24, y: 56, w: 48, h: 3, rx: 1, color: PAL.khaki, role: 'siding' },
    { kind: 'rect', x: 24, y: 64, w: 48, h: 3, rx: 1, color: PAL.khaki, role: 'siding' },
    { kind: 'rect', x: 24, y: 72, w: 48, h: 3, rx: 1, color: PAL.khaki, role: 'siding' },
    // door overlay (gunmetal military door over the standard one)
    { kind: 'rect', x: 42, y: 66, w: 12, h: 24, rx: 2, color: PAL.gunmetal, role: 'militaryDoor' },
    { kind: 'rect', x: 50, y: 74, w: 2, h: 8, rx: 1, color: PAL.khaki, role: 'doorHandle' },
    // flag pole (right side of building, tall thin pole)
    { kind: 'rect', x: 70, y: 26, w: 2, h: 38, color: PAL.gunmetal, role: 'flagPole' },
    // flag: radio green with khaki stripe — military colors
    { kind: 'poly', points: [[72, 26], [86, 31], [72, 36]], color: PAL.radio, role: 'flag' },
    { kind: 'rect', x: 72, y: 30, w: 14, h: 3, color: PAL.khaki, role: 'flagStripe' },
    // sandbag bunker flanking the door (left side — khaki rounded rects stacked)
    { kind: 'rect', x: 25, y: 78, w: 14, h: 7, rx: 4, color: PAL.khaki, role: 'sandbag' },
    { kind: 'rect', x: 27, y: 72, w: 12, h: 7, rx: 4, color: PAL.khaki, role: 'sandbag' },
    { kind: 'rect', x: 26, y: 75, w: 14, h: 4, rx: 3, color: PAL.olive, role: 'sandbagDark' },
    // window slit (narrow horizontal slit above the door — bunk room window)
    { kind: 'rect', x: 30, y: 58, w: 8, h: 4, rx: 1, color: PAL.asphalt, role: 'windowSlit' },
    { kind: 'rect', x: 58, y: 58, w: 8, h: 4, rx: 1, color: PAL.asphalt, role: 'windowSlit' },
  ],
};

// AIRFIELD — an airbase: hutBase(false) + gunmetal control tower with radio windows + olive plane + hazard runway strip
export const AIRFIELD: SpriteDef = {
  id: 'airfield',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // no standard door — airfield facade replaces it
    // asphalt apron / tarmac strip across the base (distinct ground-level element)
    { kind: 'rect', x: 14, y: 82, w: 68, h: 8, rx: 2, color: PAL.asphalt, role: 'tarmac' },
    // hazard runway centerline stripe
    { kind: 'rect', x: 30, y: 84, w: 36, h: 3, rx: 1, color: PAL.hazard, role: 'runwayStripe' },
    // control tower body: gunmetal tall rect rising above the hut roof
    { kind: 'rect', x: 38, y: 22, w: 20, h: 60, rx: 2, color: PAL.gunmetal, role: 'towerBody' },
    // tower top cabin (slightly wider, radio-green windows)
    { kind: 'rect', x: 34, y: 36, w: 28, h: 18, rx: 2, color: PAL.asphalt, role: 'towerCabin' },
    // radio-green windows on the cabin (four small rects — observation glass)
    { kind: 'rect', x: 36, y: 39, w: 6, h: 10, rx: 1, color: PAL.radio, role: 'window' },
    { kind: 'rect', x: 44, y: 39, w: 6, h: 10, rx: 1, color: PAL.radio, role: 'window' },
    { kind: 'rect', x: 52, y: 39, w: 6, h: 10, rx: 1, color: PAL.radio, role: 'window' },
    // antenna on top of the tower (thin gunmetal stick + radio-green tip)
    { kind: 'rect', x: 47, y: 12, w: 2, h: 12, color: PAL.gunmetal, role: 'antenna' },
    { kind: 'circle', cx: 48, cy: 11, r: 2, color: PAL.radio, role: 'antennaTip' },
    // small olive plane on the tarmac (fuselage + wings + tail)
    { kind: 'rect', x: 16, y: 72, w: 22, h: 5, rx: 2, color: PAL.olive, role: 'fuselage' },
    { kind: 'poly', points: [[16, 72], [10, 68], [16, 70]], color: PAL.olive, role: 'wing' },
    { kind: 'poly', points: [[34, 72], [42, 68], [34, 70]], color: PAL.olive, role: 'wing' },
    { kind: 'poly', points: [[36, 72], [38, 66], [34, 72]], color: PAL.gunmetal, role: 'tail' },
    // propeller disc at the nose (hazard yellow — spinning read)
    { kind: 'circle', cx: 16, cy: 74, r: 3, color: PAL.hazard, role: 'propeller' },
    { kind: 'circle', cx: 16, cy: 74, r: 1, color: PAL.gunmetal, role: 'propHub' },
    // rivet / panel line on the fuselage
    { kind: 'rect', x: 68, y: 60, w: 12, h: 18, rx: 2, color: PAL.olive, role: 'hangar' },
    { kind: 'rect', x: 68, y: 60, w: 12, h: 4, rx: 1, color: PAL.gunmetal, role: 'hangarRoof' },
  ],
};

// LAUNCH_PAD — RC-041: a rocket on its pad: hutBase(false) + concrete apron, gantry tower
// with cross-braces, white rocket with crimson nose cone + fins, hazard pad striping.
export const LAUNCH_PAD: SpriteDef = {
  id: 'launch_pad',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // service building shell — the pad structures replace the door
    // gunmetal cladding over the hut wall (service bunker)
    { kind: 'rect', x: 24, y: 52, w: 48, h: 38, rx: 2, color: PAL.gunmetal, role: 'bunkerFacade' },
    // concrete launch apron across the base
    { kind: 'rect', x: 10, y: 84, w: 76, h: 8, rx: 2, color: PAL.asphalt, role: 'apron' },
    // hazard striping on the apron edge
    { kind: 'rect', x: 14, y: 86, w: 28, h: 3, rx: 1, color: PAL.hazard, role: 'padStripe' },
    { kind: 'rect', x: 54, y: 86, w: 28, h: 3, rx: 1, color: PAL.hazard, role: 'padStripe' },
    // gantry tower — tall gunmetal mast on the left with cross-braces
    { kind: 'rect', x: 26, y: 14, w: 6, h: 72, rx: 1, color: PAL.gunmetal, role: 'gantryMast' },
    { kind: 'rect', x: 32, y: 24, w: 16, h: 3, rx: 1, color: PAL.suitShade, role: 'gantryArm' },
    { kind: 'rect', x: 32, y: 42, w: 16, h: 3, rx: 1, color: PAL.suitShade, role: 'gantryArm' },
    { kind: 'rect', x: 32, y: 60, w: 16, h: 3, rx: 1, color: PAL.suitShade, role: 'gantryArm' },
    // warning beacon at the gantry top
    { kind: 'circle', cx: 29, cy: 12, r: 3, color: PAL.crimson, role: 'beacon' },
    // rocket — white body standing center-right of the gantry
    { kind: 'rect', x: 48, y: 26, w: 16, h: 52, rx: 6, color: PAL.suit, role: 'rocketBody' },
    // crimson nose cone
    { kind: 'poly', points: [[48, 30], [56, 8], [64, 30]], color: PAL.crimson, role: 'noseCone' },
    // porthole window — visor cyan
    { kind: 'circle', cx: 56, cy: 38, r: 4, color: PAL.visor, role: 'porthole' },
    // body seam bands
    { kind: 'rect', x: 48, y: 50, w: 16, h: 3, rx: 1, color: PAL.suitShade, role: 'seam' },
    { kind: 'rect', x: 48, y: 64, w: 16, h: 3, rx: 1, color: PAL.suitShade, role: 'seam' },
    // crimson tail fins flaring at the base
    { kind: 'poly', points: [[48, 62], [40, 84], [48, 80]], color: PAL.crimson, role: 'fin' },
    { kind: 'poly', points: [[64, 62], [72, 84], [64, 80]], color: PAL.crimson, role: 'fin' },
    // engine bell — gunmetal nozzle under the body
    { kind: 'poly', points: [[51, 78], [61, 78], [64, 86], [48, 86]], color: PAL.gunmetal, role: 'engineBell' },
    // ember glow at the nozzle mouth (pre-launch test fire)
    { kind: 'rect', x: 51, y: 84, w: 10, h: 3, rx: 1, color: PAL.ember, role: 'nozzleGlow' },
  ],
};

// MISSION_CONTROL — RC-041: a tracking station: hutBase(false) + gunmetal facade, radar dish
// on the roof, cyan console-screen window row, comms antenna with hazard light.
export const MISSION_CONTROL: SpriteDef = {
  id: 'mission_control',
  w: 96,
  h: 96,
  prims: [
    ...hutBase(false), // control building — console facade replaces the door
    // gunmetal facade over the hut wall
    { kind: 'rect', x: 24, y: 52, w: 48, h: 38, rx: 2, color: PAL.gunmetal, role: 'facade' },
    // suit-white trim band along the facade top
    { kind: 'rect', x: 24, y: 52, w: 48, h: 5, rx: 1, color: PAL.suit, role: 'trimBand' },
    // console screen row — three visor-cyan windows (mission screens)
    { kind: 'rect', x: 28, y: 62, w: 11, h: 9, rx: 1, color: PAL.visor, role: 'screen' },
    { kind: 'rect', x: 42, y: 62, w: 11, h: 9, rx: 1, color: PAL.visor, role: 'screen' },
    { kind: 'rect', x: 56, y: 62, w: 11, h: 9, rx: 1, color: PAL.visor, role: 'screen' },
    // laser-bright trace line on the middle screen (telemetry plot)
    { kind: 'rect', x: 43, y: 66, w: 9, h: 2, rx: 1, color: PAL.laser, role: 'telemetry' },
    // entry door — asphalt slab with suitShade frame
    { kind: 'rect', x: 42, y: 76, w: 12, h: 14, rx: 2, color: PAL.asphalt, role: 'door' },
    { kind: 'rect', x: 42, y: 76, w: 12, h: 3, rx: 1, color: PAL.suitShade, role: 'doorFrame' },
    // radar dish on the roof — suit-white bowl on a gunmetal strut, cyan feed horn
    { kind: 'rect', x: 56, y: 30, w: 4, h: 16, color: PAL.gunmetal, role: 'dishStrut' },
    { kind: 'circle', cx: 58, cy: 24, r: 11, color: PAL.suit, role: 'dish' },
    { kind: 'circle', cx: 58, cy: 24, r: 7, color: PAL.suitShade, role: 'dishInner' },
    { kind: 'line', x1: 58, y1: 24, x2: 66, y2: 14, width: 2, color: PAL.gunmetal, role: 'feedArm' },
    { kind: 'circle', cx: 66, cy: 14, r: 2, color: PAL.visor, role: 'feedHorn' },
    // comms antenna on the left roof slope
    { kind: 'rect', x: 33, y: 30, w: 2, h: 16, color: PAL.gunmetal, role: 'antenna' },
    { kind: 'circle', cx: 34, cy: 29, r: 2, color: PAL.hazard, role: 'antennaLight' },
  ],
};

export const BUILDINGS: SpriteDef[] = [GRANARY, MINE, FORGE, SMELTER, FOUNDRY, DEEP_MINE, ACADEMY, MARKET, WORKSHOP, KEEP, CATHEDRAL, ARMORY, GUNSMITH, UNIVERSITY, BANK, FACTORY, POWERPLANT, ARSENAL, MOTOR_POOL, BARRACKS, AIRFIELD, LAUNCH_PAD, MISSION_CONTROL];
