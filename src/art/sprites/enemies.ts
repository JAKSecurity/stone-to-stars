import { SpriteDef } from '../types';
import { PAL } from '../palette';

// A low, hunched, angular predator stalking right. Canvas 40x36.
// Dark body mass (beastDark) with a brighter jagged spine (beast); lowered wedge
// head with bared teeth and a single glowing eye. Built from polys for a sharp,
// un-cute silhouette.
export const BEAST: SpriteDef = {
  id: 'beast',
  w: 40,
  h: 36,
  prims: [
    // thin tail flicking off the back-left (behind the body)
    { kind: 'poly', points: [[8, 22], [0, 16], [3, 25]], color: PAL.beastDark, role: 'tail' },
    // angular legs ending in claws (behind the body)
    { kind: 'poly', points: [[10, 25], [7, 34], [11, 34], [14, 25]], color: PAL.beastDark, role: 'leg' },
    { kind: 'poly', points: [[17, 26], [15, 34], [19, 34], [21, 26]], color: PAL.beastDark, role: 'leg' },
    { kind: 'poly', points: [[26, 26], [24, 34], [28, 34], [30, 26]], color: PAL.beastDark, role: 'leg' },
    { kind: 'poly', points: [[32, 25], [31, 34], [35, 34], [36, 25]], color: PAL.beastDark, role: 'leg' },
    // hunched angular torso — high at the shoulders, sloping to the tail
    { kind: 'poly', points: [[5, 24], [10, 15], [21, 13], [30, 11], [38, 18], [36, 27], [10, 27]], color: PAL.beastDark, role: 'body' },
    // jagged spine ridge (brighter, sharp)
    { kind: 'poly', points: [[10, 16], [12, 7], [16, 16]], color: PAL.beast, role: 'spine' },
    { kind: 'poly', points: [[16, 15], [20, 5], [24, 15]], color: PAL.beast, role: 'spine' },
    { kind: 'poly', points: [[24, 14], [28, 6], [32, 13]], color: PAL.beast, role: 'spine' },
    // lowered wedge head / snout jutting forward-right
    { kind: 'poly', points: [[30, 13], [40, 20], [37, 26], [29, 24]], color: PAL.beastDark, role: 'head' },
    // bared teeth along the jawline (white triangles)
    { kind: 'poly', points: [[32, 23], [33, 26], [34, 23]], color: '#ffffff', role: 'tooth' },
    { kind: 'poly', points: [[35, 23], [36, 26], [37, 23]], color: '#ffffff', role: 'tooth' },
    // heavy brow + a narrow glowing slit (predatory, not a round 'cute' eye)
    { kind: 'poly', points: [[30, 15], [37, 16], [36, 18], [31, 17]], color: '#3a0f0d', role: 'brow' },
    { kind: 'poly', points: [[32, 17], [36, 18], [32, 19]], color: '#f0a020', role: 'eye' },
  ],
};

// An upright blue-robed caster figure. Canvas 36x48.
export const SCHOLAR: SpriteDef = {
  id: 'scholar',
  w: 36,
  h: 48,
  prims: [
    // robe — trapezoid, wider at the hem
    { kind: 'poly', points: [[13, 18], [23, 18], [29, 45], [7, 45]], color: PAL.scholar, role: 'robe' },
    // robe hem trim
    { kind: 'rect', x: 7, y: 42, w: 22, h: 4, rx: 2, color: PAL.trim, role: 'hem' },
    // sleeve / arm hint along the side toward the held scroll
    { kind: 'rect', x: 22, y: 24, w: 5, h: 14, rx: 2, color: PAL.scholarDark, role: 'sleeve' },
    // hand
    { kind: 'circle', cx: 25, cy: 38, r: 2, color: PAL.skin, role: 'hand' },
    // head
    { kind: 'circle', cx: 18, cy: 13, r: 7, color: PAL.skin, role: 'head' },
    // hood / cap over the top of the head (caster read)
    { kind: 'poly', points: [[9, 14], [10, 6], [18, 2], [26, 6], [27, 14], [18, 9]], color: PAL.scholarDark, role: 'hood' },
    // eyes peering out from under the hood
    { kind: 'circle', cx: 15, cy: 14, r: 1, color: '#222222', role: 'eye' },
    { kind: 'circle', cx: 21, cy: 14, r: 1, color: '#222222', role: 'eye' },
    // scroll / book held at the side
    { kind: 'rect', x: 26, y: 34, w: 4, h: 9, rx: 1, color: PAL.trim, role: 'scroll' },
  ],
};

// A small hunched scavenger lurking in cave shadows. Canvas 26x28.
// Low silhouette with a bent posture; caveStone body, glowing yellow eye.
export const CAVE_DWELLER: SpriteDef = {
  id: 'cave_dweller',
  w: 26,
  h: 28,
  prims: [
    // bent back legs
    { kind: 'poly', points: [[4, 20], [2, 27], [6, 27], [8, 20]], color: PAL.caveStoneDark, role: 'leg' },
    { kind: 'poly', points: [[14, 20], [12, 27], [16, 27], [18, 20]], color: PAL.caveStoneDark, role: 'leg' },
    // hunched torso — wide and low
    { kind: 'poly', points: [[2, 18], [6, 10], [14, 8], [22, 11], [24, 19], [18, 22], [4, 22]], color: PAL.caveStoneDark, role: 'body' },
    // humped back ridge
    { kind: 'poly', points: [[6, 11], [13, 5], [20, 10]], color: PAL.caveStone, role: 'hump' },
    // short claw arm reaching forward
    { kind: 'poly', points: [[20, 13], [26, 17], [24, 20], [18, 17]], color: PAL.caveStoneDark, role: 'arm' },
    // blunt head low on the front
    { kind: 'poly', points: [[18, 12], [25, 15], [24, 21], [17, 19]], color: PAL.caveStone, role: 'head' },
    // glowing eye — single point of light
    { kind: 'circle', cx: 22, cy: 16, r: 2, color: PAL.ember, role: 'eye' },
    { kind: 'circle', cx: 22, cy: 16, r: 1, color: '#ffffff', role: 'eye-glint' },
  ],
};

// A bulky boulder-bodied elemental. Canvas 38x40.
// Squat and heavy; caveStone mass with rock-colored chunk details.
export const ROCK_GOLEM: SpriteDef = {
  id: 'rock_golem',
  w: 38,
  h: 40,
  prims: [
    // thick stubby legs
    { kind: 'rect', x: 4, y: 28, w: 10, h: 12, rx: 2, color: PAL.caveStoneDark, role: 'leg' },
    { kind: 'rect', x: 22, y: 28, w: 10, h: 12, rx: 2, color: PAL.caveStoneDark, role: 'leg' },
    // massive boulder body
    { kind: 'poly', points: [[2, 30], [4, 12], [12, 4], [26, 4], [34, 12], [36, 30], [30, 36], [8, 36]], color: PAL.caveStoneDark, role: 'body' },
    // rock chunk details — lighter slabs across the body
    { kind: 'poly', points: [[8, 16], [18, 12], [28, 16], [26, 22], [10, 22]], color: PAL.caveStone, role: 'rock-slab' },
    { kind: 'poly', points: [[6, 24], [14, 20], [14, 28], [6, 30]], color: PAL.rock, role: 'rock-chunk' },
    { kind: 'poly', points: [[24, 20], [32, 24], [30, 30], [22, 28]], color: PAL.rock, role: 'rock-chunk' },
    // wide stubby arms
    { kind: 'poly', points: [[2, 14], [0, 24], [6, 26], [8, 16]], color: PAL.caveStoneDark, role: 'arm' },
    { kind: 'poly', points: [[36, 14], [38, 24], [32, 26], [30, 16]], color: PAL.caveStoneDark, role: 'arm' },
    // blunt boulder head
    { kind: 'poly', points: [[10, 6], [19, 2], [28, 6], [30, 14], [19, 16], [8, 14]], color: PAL.caveStone, role: 'head' },
    // dark sunken eye sockets
    { kind: 'circle', cx: 14, cy: 10, r: 2, color: PAL.caveStoneDark, role: 'eye' },
    { kind: 'circle', cx: 24, cy: 10, r: 2, color: PAL.caveStoneDark, role: 'eye' },
  ],
};

// An upright brass-plated construct with a glowing rune core. Canvas 30x34.
// Mechanical and angular; brass/brassDark plates, luminous teal rune at center.
export const AUTOMATON: SpriteDef = {
  id: 'automaton',
  w: 30,
  h: 34,
  prims: [
    // leg struts
    { kind: 'rect', x: 7, y: 24, w: 6, h: 10, rx: 1, color: PAL.brassDark, role: 'leg' },
    { kind: 'rect', x: 17, y: 24, w: 6, h: 10, rx: 1, color: PAL.brassDark, role: 'leg' },
    // torso — upright trapezoidal chassis
    { kind: 'poly', points: [[5, 26], [7, 12], [23, 12], [25, 26], [22, 30], [8, 30]], color: PAL.brassDark, role: 'torso' },
    // front chest plate (lighter brass)
    { kind: 'poly', points: [[9, 14], [21, 14], [22, 24], [8, 24]], color: PAL.brass, role: 'chest-plate' },
    // glowing rune core at center chest
    { kind: 'circle', cx: 15, cy: 20, r: 4, color: PAL.rune, role: 'rune-core' },
    { kind: 'circle', cx: 15, cy: 20, r: 2, color: '#ffffff', role: 'rune-glint' },
    // arm assemblies
    { kind: 'rect', x: 1, y: 13, w: 6, h: 12, rx: 1, color: PAL.brassDark, role: 'arm' },
    { kind: 'rect', x: 23, y: 13, w: 6, h: 12, rx: 1, color: PAL.brassDark, role: 'arm' },
    // claw / hand ends
    { kind: 'poly', points: [[1, 25], [0, 30], [4, 32], [7, 28]], color: PAL.brass, role: 'claw' },
    { kind: 'poly', points: [[29, 25], [30, 30], [26, 32], [23, 28]], color: PAL.brass, role: 'claw' },
    // box-shaped head
    { kind: 'rect', x: 7, y: 2, w: 16, h: 12, rx: 2, color: PAL.brass, role: 'head' },
    // visor slit
    { kind: 'rect', x: 9, y: 6, w: 12, h: 3, rx: 1, color: PAL.brassDark, role: 'visor' },
    // visor glow
    { kind: 'rect', x: 10, y: 7, w: 10, h: 1, rx: 0, color: PAL.rune, role: 'visor-glow' },
  ],
};

// An imposing iron colossus with molten seams — the iron biome's heavy hitter.
// Canvas 48x52. Massive body, iron plates, glowing molten cracks.
export const IRON_GOLEM: SpriteDef = {
  id: 'iron_golem',
  w: 48,
  h: 52,
  prims: [
    // massive pillar legs
    { kind: 'rect', x: 6, y: 34, w: 14, h: 18, rx: 2, color: PAL.ironDark, role: 'leg' },
    { kind: 'rect', x: 28, y: 34, w: 14, h: 18, rx: 2, color: PAL.ironDark, role: 'leg' },
    // molten seam on legs
    { kind: 'line', x1: 13, y1: 36, x2: 13, y2: 50, width: 2, color: PAL.molten, role: 'seam' },
    { kind: 'line', x1: 35, y1: 36, x2: 35, y2: 50, width: 2, color: PAL.molten, role: 'seam' },
    // hulking main body
    { kind: 'poly', points: [[4, 36], [6, 12], [14, 4], [34, 4], [42, 12], [44, 36], [38, 42], [10, 42]], color: PAL.ironDark, role: 'body' },
    // iron chest plate overlay
    { kind: 'poly', points: [[10, 14], [38, 14], [40, 34], [30, 38], [18, 38], [8, 34]], color: PAL.iron, role: 'chest-plate' },
    // molten seams across chest
    { kind: 'line', x1: 10, y1: 22, x2: 38, y2: 22, width: 2, color: PAL.molten, role: 'seam' },
    { kind: 'line', x1: 18, y1: 30, x2: 30, y2: 30, width: 2, color: PAL.molten, role: 'seam' },
    { kind: 'line', x1: 24, y1: 14, x2: 24, y2: 38, width: 2, color: PAL.molten, role: 'seam' },
    // heavy pauldron shoulders
    { kind: 'poly', points: [[2, 14], [0, 26], [8, 30], [10, 16]], color: PAL.ironDark, role: 'pauldron' },
    { kind: 'poly', points: [[46, 14], [48, 26], [40, 30], [38, 16]], color: PAL.ironDark, role: 'pauldron' },
    // arm slabs
    { kind: 'rect', x: 0, y: 26, w: 10, h: 16, rx: 2, color: PAL.ironDark, role: 'arm' },
    { kind: 'rect', x: 38, y: 26, w: 10, h: 16, rx: 2, color: PAL.ironDark, role: 'arm' },
    // massive fists
    { kind: 'rect', x: 0, y: 40, w: 12, h: 10, rx: 3, color: PAL.iron, role: 'fist' },
    { kind: 'rect', x: 36, y: 40, w: 12, h: 10, rx: 3, color: PAL.iron, role: 'fist' },
    // helmet — broad and flat-topped
    { kind: 'poly', points: [[12, 6], [18, 0], [30, 0], [36, 6], [38, 14], [10, 14]], color: PAL.iron, role: 'helmet' },
    // visor slot with ember glow
    { kind: 'rect', x: 14, y: 8, w: 20, h: 4, rx: 1, color: PAL.ironDark, role: 'visor' },
    { kind: 'rect', x: 15, y: 9, w: 18, h: 2, rx: 0, color: PAL.ember, role: 'visor-glow' },
  ],
};

export const ENEMIES: SpriteDef[] = [BEAST, SCHOLAR, CAVE_DWELLER, ROCK_GOLEM, AUTOMATON, IRON_GOLEM];
