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

// A winged bird-woman, fast and predatory. Canvas 34x30.
// Broad spread wings (oxblood/marbleDark feathers) with a small skin/toga torso and head;
// talons below. Wide-wing silhouette reads clearly as a flyer.
export const HARPY: SpriteDef = {
  id: 'harpy',
  w: 34,
  h: 30,
  prims: [
    // left wing — broad sweeping poly, swept back
    { kind: 'poly', points: [[17, 12], [0, 4], [2, 16], [14, 18]], color: PAL.oxblood, role: 'wing' },
    // left wing inner feathers (lighter marbleDark layer)
    { kind: 'poly', points: [[17, 13], [3, 8], [5, 17], [14, 18]], color: PAL.marbleDark, role: 'wing-inner' },
    // right wing — mirror, swept back
    { kind: 'poly', points: [[17, 12], [34, 4], [32, 16], [20, 18]], color: PAL.oxblood, role: 'wing' },
    // right wing inner feathers
    { kind: 'poly', points: [[17, 13], [31, 8], [29, 17], [20, 18]], color: PAL.marbleDark, role: 'wing-inner' },
    // compact torso (toga-colored)
    { kind: 'poly', points: [[13, 14], [21, 14], [22, 22], [12, 22]], color: PAL.toga, role: 'torso' },
    // left talon / foot
    { kind: 'poly', points: [[13, 22], [10, 28], [13, 29], [15, 23]], color: PAL.marbleDark, role: 'talon' },
    { kind: 'poly', points: [[11, 27], [9, 30], [12, 30]], color: PAL.marbleDark, role: 'claw' },
    // right talon / foot
    { kind: 'poly', points: [[21, 22], [24, 28], [21, 29], [19, 23]], color: PAL.marbleDark, role: 'talon' },
    { kind: 'poly', points: [[23, 27], [25, 30], [22, 30]], color: PAL.marbleDark, role: 'claw' },
    // head — small circle, sits on top of torso
    { kind: 'circle', cx: 17, cy: 9, r: 5, color: PAL.skin, role: 'head' },
    // hair (dark, windswept back)
    { kind: 'poly', points: [[13, 6], [17, 3], [22, 6], [20, 4], [17, 3]], color: PAL.hair, role: 'hair' },
    // eyes — narrowed predatory
    { kind: 'circle', cx: 15, cy: 9, r: 1, color: '#1a0a0a', role: 'eye' },
    { kind: 'circle', cx: 19, cy: 9, r: 1, color: '#1a0a0a', role: 'eye' },
  ],
};

// An armored Greek soldier. Canvas 30x40.
// Round hoplon shield (gold rim, oxblood face), crested helm (goldDark base, oxblood crest),
// bronze cuirass, short spear. Upright heavy-armored silhouette.
export const HOPLITE: SpriteDef = {
  id: 'hoplite',
  w: 30,
  h: 40,
  prims: [
    // legs — greaves (goldDark)
    { kind: 'rect', x: 8, y: 28, w: 6, h: 12, rx: 1, color: PAL.goldDark, role: 'leg' },
    { kind: 'rect', x: 16, y: 28, w: 6, h: 12, rx: 1, color: PAL.goldDark, role: 'leg' },
    // hoplon shield — large round, oxblood face with gold rim, held on left side
    { kind: 'circle', cx: 8, cy: 22, r: 9, color: PAL.gold, role: 'shield-rim' },
    { kind: 'circle', cx: 8, cy: 22, r: 7, color: PAL.oxblood, role: 'shield-face' },
    // bronze cuirass (torso)
    { kind: 'poly', points: [[10, 14], [20, 14], [22, 28], [8, 28]], color: PAL.gold, role: 'cuirass' },
    // cuirass belly plate shadow
    { kind: 'poly', points: [[10, 22], [20, 22], [22, 28], [8, 28]], color: PAL.goldDark, role: 'cuirass-lower' },
    // spear — line from right hand upward
    { kind: 'line', x1: 24, y1: 36, x2: 26, y2: 2, width: 2, color: PAL.leather, role: 'spear-shaft' },
    { kind: 'poly', points: [[24, 4], [26, 2], [28, 5], [26, 8]], color: PAL.gold, role: 'spear-tip' },
    // right arm holding spear
    { kind: 'rect', x: 21, y: 18, w: 5, h: 12, rx: 1, color: PAL.gold, role: 'arm' },
    // helmet base — goldDark
    { kind: 'poly', points: [[9, 14], [21, 14], [22, 8], [8, 8]], color: PAL.goldDark, role: 'helm' },
    // helm cheek guards
    { kind: 'rect', x: 8, y: 8, w: 3, h: 8, rx: 1, color: PAL.goldDark, role: 'cheek-guard' },
    { kind: 'rect', x: 19, y: 8, w: 3, h: 8, rx: 1, color: PAL.goldDark, role: 'cheek-guard' },
    // crest — tall oxblood plume rising from top of helm
    { kind: 'poly', points: [[13, 8], [15, 0], [17, 8]], color: PAL.oxblood, role: 'crest' },
    { kind: 'poly', points: [[11, 8], [15, 1], [19, 8]], color: PAL.oxblood, role: 'crest-wide' },
    // face/eyes barely visible in helm slit
    { kind: 'rect', x: 10, y: 10, w: 10, h: 2, rx: 1, color: '#1a0a0a', role: 'visor' },
  ],
};

// A half-horse half-human quadruped. Canvas 42x40.
// Broad horse barrel torso (leather/hair) with four legs; human upper body (skin/toga)
// rising from the front shoulder, right arm raised. Wide quadruped silhouette.
export const CENTAUR: SpriteDef = {
  id: 'centaur',
  w: 42,
  h: 40,
  prims: [
    // rear horse legs (behind body)
    { kind: 'poly', points: [[6, 24], [4, 38], [8, 39], [10, 25]], color: PAL.hair, role: 'leg-rear' },
    { kind: 'poly', points: [[14, 26], [12, 39], [16, 39], [18, 27]], color: PAL.hair, role: 'leg-rear' },
    // horse barrel torso — wide and heavy
    { kind: 'poly', points: [[4, 22], [8, 14], [22, 12], [36, 14], [40, 22], [36, 32], [8, 32]], color: PAL.leather, role: 'horse-body' },
    // horse flank highlight
    { kind: 'poly', points: [[10, 16], [22, 13], [34, 16], [32, 26], [12, 26]], color: PAL.hair, role: 'flank' },
    // front horse legs
    { kind: 'poly', points: [[24, 26], [22, 39], [26, 39], [28, 27]], color: PAL.hair, role: 'leg-front' },
    { kind: 'poly', points: [[32, 24], [30, 38], [34, 38], [36, 25]], color: PAL.hair, role: 'leg-front' },
    // tail flicking behind left
    { kind: 'poly', points: [[5, 22], [0, 18], [2, 28], [7, 27]], color: PAL.hair, role: 'tail' },
    // human torso rising from the front — toga-covered
    { kind: 'poly', points: [[26, 22], [34, 22], [32, 10], [28, 10]], color: PAL.toga, role: 'human-torso' },
    // human left arm raised (holding or gesturing)
    { kind: 'poly', points: [[34, 14], [40, 8], [38, 6], [32, 12]], color: PAL.skin, role: 'arm' },
    { kind: 'circle', cx: 39, cy: 7, r: 2, color: PAL.skin, role: 'hand' },
    // human right arm down
    { kind: 'poly', points: [[26, 14], [22, 20], [24, 22], [28, 16]], color: PAL.skin, role: 'arm' },
    // human head
    { kind: 'circle', cx: 30, cy: 7, r: 6, color: PAL.skin, role: 'head' },
    // hair
    { kind: 'poly', points: [[25, 5], [30, 1], [35, 5], [32, 3]], color: PAL.hair, role: 'hair' },
    // eyes
    { kind: 'circle', cx: 28, cy: 7, r: 1, color: '#1a0a0a', role: 'eye' },
    { kind: 'circle', cx: 32, cy: 7, r: 1, color: '#1a0a0a', role: 'eye' },
  ],
};

// A brutish one-eyed giant mini-boss. Canvas 50x56.
// Huge hunched humanoid, ONE large central eye (white sclera + dark pupil),
// heavy arms, marbleDark loincloth — the biggest, most imposing classical enemy.
export const CYCLOPS: SpriteDef = {
  id: 'cyclops',
  w: 50,
  h: 56,
  prims: [
    // massive pillar legs
    { kind: 'rect', x: 8, y: 38, w: 14, h: 18, rx: 3, color: PAL.skin, role: 'leg' },
    { kind: 'rect', x: 28, y: 38, w: 14, h: 18, rx: 3, color: PAL.skin, role: 'leg' },
    // loincloth / covering
    { kind: 'poly', points: [[8, 38], [42, 38], [40, 46], [10, 46]], color: PAL.marbleDark, role: 'loincloth' },
    // hulking torso — wide and barrel-chested
    { kind: 'poly', points: [[4, 40], [8, 18], [18, 10], [32, 10], [42, 18], [46, 40], [40, 44], [10, 44]], color: PAL.skin, role: 'torso' },
    // chest shadow / muscle definition
    { kind: 'poly', points: [[14, 22], [36, 22], [38, 36], [12, 36]], color: PAL.marbleDark, role: 'chest-shadow' },
    // left heavy arm — dragging low with a club
    { kind: 'poly', points: [[4, 20], [0, 38], [8, 42], [10, 24]], color: PAL.skin, role: 'arm' },
    // club in left hand
    { kind: 'rect', x: 0, y: 36, w: 10, h: 20, rx: 3, color: PAL.leather, role: 'club' },
    { kind: 'rect', x: -1, y: 50, w: 12, h: 6, rx: 3, color: PAL.hair, role: 'club-head' },
    // right arm — raised slightly
    { kind: 'poly', points: [[40, 20], [46, 34], [50, 30], [44, 18]], color: PAL.skin, role: 'arm' },
    { kind: 'circle', cx: 48, cy: 31, r: 4, color: PAL.skin, role: 'fist' },
    // broad head — large and brutish
    { kind: 'poly', points: [[12, 12], [18, 4], [32, 4], [38, 12], [36, 22], [14, 22]], color: PAL.skin, role: 'head' },
    // brow ridge — heavy and prominent
    { kind: 'poly', points: [[12, 14], [38, 14], [36, 18], [14, 18]], color: PAL.marbleDark, role: 'brow' },
    // THE eye — single large central eye (white sclera)
    { kind: 'circle', cx: 25, cy: 12, r: 6, color: '#ffffff', role: 'eye-sclera' },
    // pupil — dark, glaring
    { kind: 'circle', cx: 25, cy: 12, r: 3, color: '#1a0a0a', role: 'eye-pupil' },
    // eye glint
    { kind: 'circle', cx: 27, cy: 10, r: 1, color: '#ffffff', role: 'eye-glint' },
    // mouth — grim downward slash
    { kind: 'poly', points: [[18, 20], [32, 20], [30, 22], [20, 22]], color: PAL.marbleDark, role: 'mouth' },
  ],
};

// A bony undead warrior. Canvas 26x34.
// bone-colored skull and ribcage, thin limbs, a rusty short sword. Cheap, rattling silhouette.
export const SKELETON: SpriteDef = {
  id: 'skeleton',
  w: 26,
  h: 34,
  prims: [
    // thin shin bones — back behind torso
    { kind: 'rect', x: 5, y: 24, w: 3, h: 10, rx: 1, color: PAL.bone, role: 'leg' },
    { kind: 'rect', x: 14, y: 24, w: 3, h: 10, rx: 1, color: PAL.bone, role: 'leg' },
    // pelvic/hip bony plate
    { kind: 'poly', points: [[4, 22], [22, 22], [20, 26], [6, 26]], color: PAL.castleStoneDark, role: 'pelvis' },
    // ribcage — narrow upright rect, slightly lighter than the pelvis
    { kind: 'rect', x: 7, y: 11, w: 12, h: 12, rx: 2, color: PAL.bone, role: 'ribcage' },
    // rib line details across the cage
    { kind: 'line', x1: 7, y1: 14, x2: 19, y2: 14, width: 1, color: PAL.castleStoneDark, role: 'rib' },
    { kind: 'line', x1: 7, y1: 17, x2: 19, y2: 17, width: 1, color: PAL.castleStoneDark, role: 'rib' },
    { kind: 'line', x1: 7, y1: 20, x2: 19, y2: 20, width: 1, color: PAL.castleStoneDark, role: 'rib' },
    // left arm — thin bone reaching down
    { kind: 'rect', x: 3, y: 13, w: 3, h: 9, rx: 1, color: PAL.bone, role: 'arm' },
    // right arm — angled out holding sword
    { kind: 'poly', points: [[19, 13], [23, 11], [24, 15], [20, 17]], color: PAL.bone, role: 'arm' },
    // rusty short sword in right hand (iron-colored, dull)
    { kind: 'line', x1: 22, y1: 10, x2: 26, y2: 2, width: 2, color: PAL.ironDark, role: 'sword' },
    { kind: 'poly', points: [[20, 9], [22, 7], [24, 9], [22, 11]], color: PAL.ironDark, role: 'crossguard' },
    // skull — round, bone colored
    { kind: 'circle', cx: 13, cy: 7, r: 6, color: PAL.bone, role: 'skull' },
    // dark hollow eye sockets — distinctive undead read
    { kind: 'circle', cx: 10, cy: 6, r: 2, color: PAL.castleStoneDark, role: 'eye-socket' },
    { kind: 'circle', cx: 16, cy: 6, r: 2, color: PAL.castleStoneDark, role: 'eye-socket' },
    // nose cavity — small dark triangle
    { kind: 'poly', points: [[12, 8], [14, 8], [13, 10]], color: PAL.castleStoneDark, role: 'nose' },
  ],
};

// A fully armored plate knight. Canvas 30x40.
// steel/steelBlue plate body, great helm with dark visor slit, kite shield with royal/crimson
// heraldry, broadsword. Tanky upright silhouette — heavier than Hoplite.
export const KNIGHT: SpriteDef = {
  id: 'knight',
  w: 30,
  h: 40,
  prims: [
    // armored boots / sabaton (feet)
    { kind: 'rect', x: 6, y: 32, w: 7, h: 8, rx: 1, color: PAL.steelBlue, role: 'leg' },
    { kind: 'rect', x: 17, y: 32, w: 7, h: 8, rx: 1, color: PAL.steelBlue, role: 'leg' },
    // kite shield — large, on the left side, with heraldry
    { kind: 'poly', points: [[0, 16], [10, 14], [10, 28], [5, 32], [0, 28]], color: PAL.steel, role: 'shield' },
    { kind: 'poly', points: [[2, 18], [8, 16], [8, 26], [5, 30], [2, 26]], color: PAL.royal, role: 'shield-face' },
    // crimson cross heraldry on shield
    { kind: 'rect', x: 4, y: 19, w: 2, h: 8, rx: 0, color: PAL.crimson, role: 'heraldry' },
    { kind: 'rect', x: 2, y: 22, w: 6, h: 2, rx: 0, color: PAL.crimson, role: 'heraldry' },
    // plate torso — broad and flat
    { kind: 'poly', points: [[9, 14], [21, 14], [23, 32], [7, 32]], color: PAL.steelBlue, role: 'torso' },
    // chest plate highlight (steel color, slightly lighter)
    { kind: 'poly', points: [[11, 16], [19, 16], [20, 26], [10, 26]], color: PAL.steel, role: 'chest-plate' },
    // right arm holding broadsword
    { kind: 'poly', points: [[21, 16], [26, 14], [27, 20], [22, 22]], color: PAL.steelBlue, role: 'arm' },
    // broadsword — straight line up from right hand
    { kind: 'line', x1: 24, y1: 14, x2: 26, y2: 2, width: 3, color: PAL.steel, role: 'sword' },
    { kind: 'poly', points: [[21, 13], [24, 11], [27, 13], [24, 15]], color: PAL.steelBlue, role: 'crossguard' },
    // great helm — broad flat-topped
    { kind: 'poly', points: [[9, 14], [21, 14], [20, 6], [10, 6]], color: PAL.steelBlue, role: 'helm' },
    // helm top — slightly rounded
    { kind: 'rect', x: 10, y: 2, w: 10, h: 6, rx: 2, color: PAL.steelBlue, role: 'helm-top' },
    // visor slit — narrow dark horizontal gap, ominous
    { kind: 'rect', x: 11, y: 9, w: 8, h: 3, rx: 1, color: '#0d0f12', role: 'visor' },
  ],
};

// A winged stone gargoyle in a crouching perch posture. Canvas 38x32.
// castleStone/castleStoneDark body, broad bat-wings spread wide, horns, glowing eyes.
// Wide horizontal silhouette — clearly a flyer, distinct from Harpy.
export const GARGOYLE: SpriteDef = {
  id: 'gargoyle',
  w: 38,
  h: 32,
  prims: [
    // left wing — broad sweeping stone-colored poly, angled low
    { kind: 'poly', points: [[18, 14], [0, 6], [0, 22], [14, 22]], color: PAL.castleStoneDark, role: 'wing' },
    // left wing inner webbing (lighter stone)
    { kind: 'poly', points: [[18, 15], [2, 10], [2, 20], [14, 22]], color: PAL.castleStone, role: 'wing-inner' },
    // right wing — mirror
    { kind: 'poly', points: [[20, 14], [38, 6], [38, 22], [24, 22]], color: PAL.castleStoneDark, role: 'wing' },
    // right wing inner webbing
    { kind: 'poly', points: [[20, 15], [36, 10], [36, 20], [24, 22]], color: PAL.castleStone, role: 'wing-inner' },
    // squat crouching torso — wide and hunched
    { kind: 'poly', points: [[12, 14], [26, 14], [28, 28], [10, 28]], color: PAL.castleStoneDark, role: 'body' },
    // gargoyle stone texture on body
    { kind: 'poly', points: [[13, 16], [25, 16], [24, 24], [14, 24]], color: PAL.castleStone, role: 'body-detail' },
    // thick clawed feet gripping the ledge
    { kind: 'poly', points: [[10, 26], [14, 31], [16, 31], [14, 26]], color: PAL.castleStoneDark, role: 'claw' },
    { kind: 'poly', points: [[22, 26], [24, 31], [26, 31], [28, 26]], color: PAL.castleStoneDark, role: 'claw' },
    // blocky head — square and heavy with horns
    { kind: 'poly', points: [[13, 8], [25, 8], [26, 16], [12, 16]], color: PAL.castleStoneDark, role: 'head' },
    // two stone horns jutting upward
    { kind: 'poly', points: [[15, 8], [13, 2], [17, 7]], color: PAL.castleStoneDark, role: 'horn' },
    { kind: 'poly', points: [[23, 8], [25, 2], [21, 7]], color: PAL.castleStoneDark, role: 'horn' },
    // glowing eyes — amber, supernatural glow
    { kind: 'circle', cx: 16, cy: 12, r: 2, color: PAL.ember, role: 'eye' },
    { kind: 'circle', cx: 22, cy: 12, r: 2, color: PAL.ember, role: 'eye' },
    { kind: 'circle', cx: 16, cy: 12, r: 1, color: '#ffffff', role: 'eye-glint' },
    { kind: 'circle', cx: 22, cy: 12, r: 1, color: '#ffffff', role: 'eye-glint' },
  ],
};

// The mini-boss: a winged dragon. Canvas 58x48.
// crimson/oxblood barrel body, massive spread wings (polys), serpentine neck + horned head,
// a tail, bone claws/teeth. The biggest, most imposing medieval enemy.
export const DRAGON: SpriteDef = {
  id: 'dragon',
  w: 58,
  h: 48,
  prims: [
    // tail — serpentine sweeping left and down
    { kind: 'poly', points: [[10, 30], [0, 38], [4, 42], [14, 34]], color: PAL.oxblood, role: 'tail' },
    { kind: 'poly', points: [[4, 40], [0, 46], [6, 48], [10, 42]], color: PAL.crimson, role: 'tail-tip' },
    // left wing — broad and massive, sweeping behind and below
    { kind: 'poly', points: [[20, 20], [0, 8], [2, 28], [18, 32]], color: PAL.oxblood, role: 'wing' },
    // left wing membrane (slightly lighter inner panel)
    { kind: 'poly', points: [[20, 21], [4, 12], [5, 26], [18, 32]], color: PAL.crimson, role: 'wing-membrane' },
    // left wing bone spars
    { kind: 'line', x1: 20, y1: 20, x2: 2, y2: 10, width: 2, color: PAL.oxblood, role: 'wing-spar' },
    { kind: 'line', x1: 20, y1: 22, x2: 3, y2: 22, width: 2, color: PAL.oxblood, role: 'wing-spar' },
    // right wing — mirror, sweeping right
    { kind: 'poly', points: [[38, 20], [58, 8], [56, 28], [40, 32]], color: PAL.oxblood, role: 'wing' },
    // right wing membrane
    { kind: 'poly', points: [[38, 21], [54, 12], [53, 26], [40, 32]], color: PAL.crimson, role: 'wing-membrane' },
    // right wing bone spars
    { kind: 'line', x1: 38, y1: 20, x2: 56, y2: 10, width: 2, color: PAL.oxblood, role: 'wing-spar' },
    { kind: 'line', x1: 38, y1: 22, x2: 55, y2: 22, width: 2, color: PAL.oxblood, role: 'wing-spar' },
    // barrel body — large central mass
    { kind: 'poly', points: [[12, 24], [20, 14], [38, 14], [46, 24], [42, 38], [16, 38]], color: PAL.oxblood, role: 'body' },
    // belly scales — lighter crimson ventral stripe
    { kind: 'poly', points: [[18, 26], [38, 26], [36, 36], [22, 36]], color: PAL.crimson, role: 'belly' },
    // bone claws — two pairs on the body flanks
    { kind: 'poly', points: [[14, 36], [10, 44], [14, 46], [16, 38]], color: PAL.bone, role: 'claw' },
    { kind: 'poly', points: [[44, 36], [48, 44], [44, 46], [42, 38]], color: PAL.bone, role: 'claw' },
    { kind: 'poly', points: [[8, 42], [6, 48], [10, 48]], color: PAL.bone, role: 'claw-tip' },
    { kind: 'poly', points: [[50, 42], [52, 48], [48, 48]], color: PAL.bone, role: 'claw-tip' },
    // neck — serpentine rising up and left toward the head
    { kind: 'poly', points: [[22, 14], [28, 6], [36, 8], [38, 14]], color: PAL.oxblood, role: 'neck' },
    // head — elongated wedge, horned
    { kind: 'poly', points: [[22, 4], [38, 2], [42, 10], [36, 12], [20, 10]], color: PAL.oxblood, role: 'head' },
    // two prominent horns atop the head
    { kind: 'poly', points: [[26, 4], [24, -1], [30, 3]], color: PAL.bone, role: 'horn' },
    { kind: 'poly', points: [[34, 2], [36, -1], [32, 2]], color: PAL.bone, role: 'horn' },
    // jaw line with bone teeth
    { kind: 'poly', points: [[22, 10], [42, 10], [40, 12], [20, 12]], color: PAL.crimson, role: 'jaw' },
    { kind: 'poly', points: [[26, 10], [27, 13], [29, 10]], color: PAL.bone, role: 'tooth' },
    { kind: 'poly', points: [[32, 10], [33, 13], [35, 10]], color: PAL.bone, role: 'tooth' },
    // glowing reptilian eye
    { kind: 'circle', cx: 28, cy: 7, r: 3, color: PAL.ember, role: 'eye' },
    { kind: 'circle', cx: 28, cy: 7, r: 1, color: '#ffffff', role: 'eye-glint' },
  ],
};

// A coated Renaissance soldier with a long musket. Canvas 28x38.
// blued/velvet long coat, wide-brim blued hat, skin face; a walnut/blued musket barrel
// extends from the right hand upward — tall thin weapon, upright stance.
export const MUSKETEER: SpriteDef = {
  id: 'musketeer',
  w: 28,
  h: 38,
  prims: [
    // legs — dark trousers
    { kind: 'rect', x: 8, y: 26, w: 5, h: 12, rx: 1, color: PAL.blued, role: 'leg' },
    { kind: 'rect', x: 15, y: 26, w: 5, h: 12, rx: 1, color: PAL.blued, role: 'leg' },
    // boots (walnut, below trouser hem)
    { kind: 'rect', x: 7, y: 33, w: 6, h: 5, rx: 1, color: PAL.walnut, role: 'boot' },
    { kind: 'rect', x: 14, y: 33, w: 6, h: 5, rx: 1, color: PAL.walnut, role: 'boot' },
    // long coat — velvet, trapezoid flaring to hem
    { kind: 'poly', points: [[7, 16], [21, 16], [24, 36], [4, 36]], color: PAL.velvet, role: 'coat' },
    // coat front lapels (blued trim)
    { kind: 'poly', points: [[12, 16], [16, 16], [14, 28], [12, 28]], color: PAL.blued, role: 'lapel' },
    // coat cuffs at the hem edge
    { kind: 'rect', x: 4, y: 32, w: 20, h: 3, rx: 1, color: PAL.blued, role: 'coat-hem' },
    // torso / chest
    { kind: 'rect', x: 9, y: 14, w: 10, h: 14, rx: 2, color: PAL.blued, role: 'torso' },
    // left arm at side
    { kind: 'poly', points: [[7, 16], [4, 28], [7, 29], [10, 17]], color: PAL.blued, role: 'arm' },
    // right arm raised holding musket
    { kind: 'poly', points: [[18, 16], [22, 14], [23, 20], [19, 22]], color: PAL.blued, role: 'arm' },
    // right hand
    { kind: 'circle', cx: 22, cy: 15, r: 2, color: PAL.skin, role: 'hand' },
    // musket — long walnut stock then blued barrel extending upward
    { kind: 'line', x1: 22, y1: 16, x2: 25, y2: 1, width: 3, color: PAL.walnut, role: 'musket-stock' },
    { kind: 'line', x1: 24, y1: 10, x2: 26, y2: 0, width: 2, color: PAL.blued, role: 'musket-barrel' },
    // musket lock mechanism (small rect at mid-barrel)
    { kind: 'rect', x: 22, y: 8, w: 4, h: 3, rx: 0, color: PAL.iron, role: 'lock' },
    // head
    { kind: 'circle', cx: 14, cy: 9, r: 6, color: PAL.skin, role: 'head' },
    // wide-brim hat — blued, flat brim + rounded crown
    { kind: 'rect', x: 6, y: 4, w: 16, h: 3, rx: 1, color: PAL.blued, role: 'hat-brim' },
    { kind: 'rect', x: 9, y: 1, w: 10, h: 5, rx: 2, color: PAL.blued, role: 'hat-crown' },
    // hat band (velvet)
    { kind: 'rect', x: 9, y: 4, w: 10, h: 2, rx: 0, color: PAL.velvet, role: 'hat-band' },
    // eyes
    { kind: 'circle', cx: 12, cy: 9, r: 1, color: '#1a0a0a', role: 'eye' },
    { kind: 'circle', cx: 16, cy: 9, r: 1, color: '#1a0a0a', role: 'eye' },
  ],
};

// A steel-plated pike soldier with a morion helmet. Canvas 30x42.
// steel/blued breastplate + morion (comb-crested helm), holding an extremely long
// pike (line + steel tip). Tallest of the four; tanky upright silhouette.
export const PIKEMAN: SpriteDef = {
  id: 'pikeman',
  w: 30,
  h: 42,
  prims: [
    // armored boots
    { kind: 'rect', x: 7, y: 34, w: 6, h: 8, rx: 1, color: PAL.ironDark, role: 'boot' },
    { kind: 'rect', x: 17, y: 34, w: 6, h: 8, rx: 1, color: PAL.ironDark, role: 'boot' },
    // armored leg plates (steel)
    { kind: 'rect', x: 8, y: 26, w: 5, h: 10, rx: 1, color: PAL.steel, role: 'leg-plate' },
    { kind: 'rect', x: 17, y: 26, w: 5, h: 10, rx: 1, color: PAL.steel, role: 'leg-plate' },
    // knee cops (blued roundels)
    { kind: 'circle', cx: 11, cy: 27, r: 3, color: PAL.blued, role: 'knee' },
    { kind: 'circle', cx: 19, cy: 27, r: 3, color: PAL.blued, role: 'knee' },
    // torso breastplate — broad, riveted steel
    { kind: 'poly', points: [[7, 16], [23, 16], [25, 34], [5, 34]], color: PAL.steel, role: 'torso' },
    // breastplate centre line
    { kind: 'line', x1: 15, y1: 17, x2: 15, y2: 33, width: 1, color: PAL.blued, role: 'centerline' },
    // rivet details
    { kind: 'circle', cx: 10, cy: 20, r: 1, color: PAL.blued, role: 'rivet' },
    { kind: 'circle', cx: 20, cy: 20, r: 1, color: PAL.blued, role: 'rivet' },
    { kind: 'circle', cx: 10, cy: 28, r: 1, color: PAL.blued, role: 'rivet' },
    { kind: 'circle', cx: 20, cy: 28, r: 1, color: PAL.blued, role: 'rivet' },
    // pauldrons (blued shoulder guards)
    { kind: 'poly', points: [[5, 16], [2, 24], [7, 26], [9, 17]], color: PAL.blued, role: 'pauldron' },
    { kind: 'poly', points: [[25, 16], [28, 24], [23, 26], [21, 17]], color: PAL.blued, role: 'pauldron' },
    // right arm — gauntleted, holding pike
    { kind: 'rect', x: 22, y: 18, w: 5, h: 12, rx: 1, color: PAL.steel, role: 'arm' },
    { kind: 'rect', x: 21, y: 28, w: 6, h: 5, rx: 1, color: PAL.blued, role: 'gauntlet' },
    // pike shaft — very long, line from low right up through top
    { kind: 'line', x1: 24, y1: 36, x2: 23, y2: 0, width: 3, color: PAL.walnut, role: 'pike-shaft' },
    // pike steel tip — elongated triangle at top
    { kind: 'poly', points: [[20, 3], [23, 0], [26, 3], [24, 10], [22, 10]], color: PAL.steel, role: 'pike-tip' },
    // morion helmet — bowl base with swept brim and comb crest
    { kind: 'poly', points: [[8, 16], [22, 16], [22, 8], [8, 8]], color: PAL.blued, role: 'helm-bowl' },
    // morion brim — wider than the bowl
    { kind: 'rect', x: 5, y: 14, w: 20, h: 3, rx: 1, color: PAL.steel, role: 'helm-brim' },
    // comb crest running top-to-back
    { kind: 'poly', points: [[12, 8], [15, 3], [18, 8]], color: PAL.steel, role: 'comb' },
    // face (skin strip between brim and cheek guard)
    { kind: 'rect', x: 9, y: 10, w: 12, h: 5, rx: 1, color: PAL.skin, role: 'face' },
    // eyes
    { kind: 'circle', cx: 13, cy: 12, r: 1, color: '#1a0a0a', role: 'eye' },
    { kind: 'circle', cx: 17, cy: 12, r: 1, color: '#1a0a0a', role: 'eye' },
  ],
};

// A fast crimson-coated grenadier with a lit grenade. Canvas 30x38.
// crimson/blued coat + distinctive mitre cap; holding a round ironDark grenade
// with a gunfire spark and smoke puff. Distinct lean silhouette vs. Musketeer.
export const GRENADIER: SpriteDef = {
  id: 'grenadier',
  w: 30,
  h: 38,
  prims: [
    // legs — dark blue-grey trousers
    { kind: 'rect', x: 9, y: 26, w: 5, h: 10, rx: 1, color: PAL.blued, role: 'leg' },
    { kind: 'rect', x: 16, y: 26, w: 5, h: 10, rx: 1, color: PAL.blued, role: 'leg' },
    // black knee-high boots
    { kind: 'rect', x: 8, y: 31, w: 6, h: 7, rx: 1, color: '#1a1a1a', role: 'boot' },
    { kind: 'rect', x: 15, y: 31, w: 6, h: 7, rx: 1, color: '#1a1a1a', role: 'boot' },
    // crimson coat — shorter and tighter than musketeer's velvet coat
    { kind: 'poly', points: [[8, 15], [22, 15], [24, 34], [6, 34]], color: PAL.crimson, role: 'coat' },
    // blued coat facing / front panels
    { kind: 'poly', points: [[13, 15], [17, 15], [16, 26], [14, 26]], color: PAL.blued, role: 'facing' },
    // coat brass buttons (small circles on facing)
    { kind: 'circle', cx: 15, cy: 18, r: 1, color: PAL.gunfire, role: 'button' },
    { kind: 'circle', cx: 15, cy: 21, r: 1, color: PAL.gunfire, role: 'button' },
    { kind: 'circle', cx: 15, cy: 24, r: 1, color: PAL.gunfire, role: 'button' },
    // torso under coat
    { kind: 'rect', x: 10, y: 13, w: 10, h: 14, rx: 2, color: PAL.crimson, role: 'torso' },
    // left arm — down at side
    { kind: 'poly', points: [[8, 16], [5, 27], [8, 28], [11, 17]], color: PAL.crimson, role: 'arm-left' },
    // right arm — raised, holding grenade out
    { kind: 'poly', points: [[19, 14], [24, 9], [26, 13], [21, 18]], color: PAL.crimson, role: 'arm-right' },
    { kind: 'circle', cx: 25, cy: 10, r: 2, color: PAL.skin, role: 'hand' },
    // grenade — dark iron ball
    { kind: 'circle', cx: 26, cy: 7, r: 4, color: PAL.ironDark, role: 'grenade' },
    // grenade highlight
    { kind: 'circle', cx: 24, cy: 5, r: 1, color: PAL.iron, role: 'grenade-glint' },
    // lit fuse / gunfire spark at top of grenade
    { kind: 'poly', points: [[25, 3], [27, 0], [29, 2], [27, 4]], color: PAL.gunfire, role: 'spark' },
    // smoke puff (smoke-colored blobs around fuse)
    { kind: 'circle', cx: 28, cy: 2, r: 2, color: PAL.smoke, role: 'smoke' },
    { kind: 'circle', cx: 26, cy: 0, r: 1, color: PAL.powder, role: 'smoke' },
    // head
    { kind: 'circle', cx: 15, cy: 8, r: 5, color: PAL.skin, role: 'head' },
    // mitre cap — tall front plate tapering to a point, blued with crimson panel
    { kind: 'poly', points: [[11, 6], [14, 0], [16, 0], [19, 6]], color: PAL.blued, role: 'mitre' },
    { kind: 'poly', points: [[12, 6], [14, 1], [16, 1], [18, 6]], color: PAL.crimson, role: 'mitre-panel' },
    // mitre cap base band
    { kind: 'rect', x: 10, y: 5, w: 10, h: 3, rx: 1, color: PAL.blued, role: 'mitre-band' },
    // eyes — alert, forward-facing
    { kind: 'circle', cx: 13, cy: 9, r: 1, color: '#1a0a0a', role: 'eye' },
    { kind: 'circle', cx: 17, cy: 9, r: 1, color: '#1a0a0a', role: 'eye' },
  ],
};

// A hulking ironclad mini-boss in riveted blued/steel plate. Canvas 56x54.
// Massively broad shoulders, heavy pauldrons, a grated visor, and a gunfire-glow
// chest port. The biggest Renaissance enemy — imposing, mechanical, intimidating.
export const DREADNOUGHT: SpriteDef = {
  id: 'dreadnought',
  w: 56,
  h: 54,
  prims: [
    // heavy armored legs — pillar-wide
    { kind: 'rect', x: 8, y: 36, w: 16, h: 18, rx: 2, color: PAL.blued, role: 'leg' },
    { kind: 'rect', x: 32, y: 36, w: 16, h: 18, rx: 2, color: PAL.blued, role: 'leg' },
    // leg plate rivets
    { kind: 'circle', cx: 16, cy: 40, r: 1, color: PAL.steel, role: 'rivet' },
    { kind: 'circle', cx: 40, cy: 40, r: 1, color: PAL.steel, role: 'rivet' },
    // knee cops — large domed roundels
    { kind: 'circle', cx: 16, cy: 37, r: 4, color: PAL.steel, role: 'knee' },
    { kind: 'circle', cx: 40, cy: 37, r: 4, color: PAL.steel, role: 'knee' },
    // massive torso — barrel-wide iron plate body
    { kind: 'poly', points: [[4, 38], [8, 14], [20, 8], [36, 8], [48, 14], [52, 38], [44, 44], [12, 44]], color: PAL.blued, role: 'torso' },
    // chest plate overlay — lighter steel panel
    { kind: 'poly', points: [[12, 16], [44, 16], [46, 36], [32, 40], [24, 40], [10, 36]], color: PAL.steel, role: 'chest-plate' },
    // rivet rows across chest plate
    { kind: 'circle', cx: 18, cy: 20, r: 1, color: PAL.blued, role: 'rivet' },
    { kind: 'circle', cx: 28, cy: 20, r: 1, color: PAL.blued, role: 'rivet' },
    { kind: 'circle', cx: 38, cy: 20, r: 1, color: PAL.blued, role: 'rivet' },
    { kind: 'circle', cx: 16, cy: 30, r: 1, color: PAL.blued, role: 'rivet' },
    { kind: 'circle', cx: 40, cy: 30, r: 1, color: PAL.blued, role: 'rivet' },
    // chest port — the signature: a circular opening with gunfire glow
    { kind: 'circle', cx: 28, cy: 28, r: 6, color: PAL.ironDark, role: 'chest-port' },
    { kind: 'circle', cx: 28, cy: 28, r: 4, color: PAL.gunfire, role: 'port-glow' },
    { kind: 'circle', cx: 28, cy: 28, r: 2, color: '#ffffff', role: 'port-core' },
    // grate bars across the port (ironDark lines)
    { kind: 'line', x1: 22, y1: 28, x2: 34, y2: 28, width: 2, color: PAL.ironDark, role: 'grate' },
    { kind: 'line', x1: 28, y1: 22, x2: 28, y2: 34, width: 2, color: PAL.ironDark, role: 'grate' },
    // massive pauldrons — dominating the shoulders
    { kind: 'poly', points: [[2, 14], [0, 30], [10, 36], [14, 18]], color: PAL.blued, role: 'pauldron' },
    { kind: 'poly', points: [[54, 14], [56, 30], [46, 36], [42, 18]], color: PAL.blued, role: 'pauldron' },
    // pauldron plates (steel overlay on each)
    { kind: 'poly', points: [[4, 16], [2, 28], [8, 32], [12, 20]], color: PAL.steel, role: 'pauldron-plate' },
    { kind: 'poly', points: [[52, 16], [54, 28], [48, 32], [44, 20]], color: PAL.steel, role: 'pauldron-plate' },
    // massive arm gauntlets
    { kind: 'rect', x: 0, y: 28, w: 12, h: 18, rx: 2, color: PAL.blued, role: 'arm' },
    { kind: 'rect', x: 44, y: 28, w: 12, h: 18, rx: 2, color: PAL.blued, role: 'arm' },
    // iron fists — balled, very wide
    { kind: 'rect', x: -1, y: 42, w: 14, h: 12, rx: 3, color: PAL.steel, role: 'fist' },
    { kind: 'rect', x: 43, y: 42, w: 14, h: 12, rx: 3, color: PAL.steel, role: 'fist' },
    // neck — thick cylindrical collar
    { kind: 'rect', x: 22, y: 8, w: 12, h: 8, rx: 2, color: PAL.blued, role: 'neck' },
    // great helm — broad, flat-topped with heavy cheek guards
    { kind: 'poly', points: [[14, 10], [42, 10], [40, 0], [16, 0]], color: PAL.blued, role: 'helm' },
    // helm top reinforcing band (steel)
    { kind: 'rect', x: 16, y: 0, w: 24, h: 3, rx: 1, color: PAL.steel, role: 'helm-top' },
    // cheek guards — heavy flanges
    { kind: 'rect', x: 12, y: 6, w: 5, h: 8, rx: 1, color: PAL.blued, role: 'cheek-guard' },
    { kind: 'rect', x: 39, y: 6, w: 5, h: 8, rx: 1, color: PAL.blued, role: 'cheek-guard' },
    // grated visor — a row of narrow slits
    { kind: 'rect', x: 17, y: 4, w: 22, h: 5, rx: 1, color: PAL.ironDark, role: 'visor' },
    { kind: 'line', x1: 18, y1: 5, x2: 38, y2: 5, width: 1, color: PAL.gunfire, role: 'visor-glow' },
    { kind: 'line', x1: 18, y1: 7, x2: 38, y2: 7, width: 1, color: PAL.gunfire, role: 'visor-glow' },
  ],
};

// A small fast worker-bot. Canvas 26×30.
// Compact castIron/copper body, a single glowing electric eye/lens, stubby riveted legs
// and a clamp arm. Compact robot silhouette, distinct from the taller Automaton.
export const RIVETER: SpriteDef = {
  id: 'riveter',
  w: 26,
  h: 30,
  prims: [
    // stubby left leg
    { kind: 'rect', x: 4, y: 20, w: 5, h: 10, rx: 1, color: PAL.castIron, role: 'leg' },
    // stubby right leg
    { kind: 'rect', x: 14, y: 20, w: 5, h: 10, rx: 1, color: PAL.castIron, role: 'leg' },
    // rivet bolt on each foot
    { kind: 'circle', cx: 6, cy: 29, r: 1, color: PAL.rivet, role: 'bolt' },
    { kind: 'circle', cx: 17, cy: 29, r: 1, color: PAL.rivet, role: 'bolt' },
    // compact boxy torso
    { kind: 'rect', x: 3, y: 8, w: 20, h: 14, rx: 2, color: PAL.castIron, role: 'torso' },
    // copper chest-panel stripe
    { kind: 'rect', x: 5, y: 10, w: 16, h: 4, rx: 1, color: PAL.copper, role: 'chest-panel' },
    // rivet detail on torso corners
    { kind: 'circle', cx: 5, cy: 10, r: 1, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 21, cy: 10, r: 1, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 5, cy: 20, r: 1, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 21, cy: 20, r: 1, color: PAL.rivet, role: 'rivet' },
    // left arm — short and stubby
    { kind: 'rect', x: 0, y: 10, w: 4, h: 8, rx: 1, color: PAL.castIron, role: 'arm' },
    // right arm — clamp arm reaching out
    { kind: 'poly', points: [[23, 10], [26, 12], [25, 18], [22, 17]], color: PAL.castIron, role: 'arm-clamp' },
    // clamp jaw
    { kind: 'poly', points: [[24, 13], [26, 11], [26, 15]], color: PAL.copper, role: 'clamp-jaw' },
    // square head sitting on top of torso
    { kind: 'rect', x: 7, y: 1, w: 12, h: 9, rx: 2, color: PAL.castIron, role: 'head' },
    // single large glowing electric eye/lens
    { kind: 'circle', cx: 13, cy: 5, r: 4, color: PAL.rivet, role: 'eye-housing' },
    { kind: 'circle', cx: 13, cy: 5, r: 3, color: PAL.electric, role: 'eye' },
    { kind: 'circle', cx: 14, cy: 4, r: 1, color: '#ffffff', role: 'eye-glint' },
  ],
};

// A slow armored steam tank. Canvas 44×36.
// Wide castIron/rivet hull on treads, a copper boiler + short smokestack with steam
// puffs, a furnace vent glow, and a stubby cannon. Wide and heavy silhouette.
export const STEAM_TANK: SpriteDef = {
  id: 'steam_tank',
  w: 44,
  h: 36,
  prims: [
    // tread base — wide long rect
    { kind: 'rect', x: 2, y: 24, w: 40, h: 10, rx: 3, color: PAL.rivet, role: 'tread-base' },
    // tread road wheels — 5 circles along the bottom
    { kind: 'circle', cx: 6, cy: 30, r: 4, color: PAL.castIron, role: 'wheel' },
    { kind: 'circle', cx: 16, cy: 30, r: 4, color: PAL.castIron, role: 'wheel' },
    { kind: 'circle', cx: 26, cy: 30, r: 4, color: PAL.castIron, role: 'wheel' },
    { kind: 'circle', cx: 36, cy: 30, r: 4, color: PAL.castIron, role: 'wheel' },
    // wheel hub bolts
    { kind: 'circle', cx: 6, cy: 30, r: 1, color: PAL.rivet, role: 'hub' },
    { kind: 'circle', cx: 16, cy: 30, r: 1, color: PAL.rivet, role: 'hub' },
    { kind: 'circle', cx: 26, cy: 30, r: 1, color: PAL.rivet, role: 'hub' },
    { kind: 'circle', cx: 36, cy: 30, r: 1, color: PAL.rivet, role: 'hub' },
    // main hull — broad trapezoidal iron body
    { kind: 'poly', points: [[4, 24], [6, 8], [38, 8], [40, 24]], color: PAL.castIron, role: 'hull' },
    // hull rivet row across top edge
    { kind: 'circle', cx: 10, cy: 10, r: 1, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 18, cy: 10, r: 1, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 26, cy: 10, r: 1, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 34, cy: 10, r: 1, color: PAL.rivet, role: 'rivet' },
    // copper boiler dome — large rounded top
    { kind: 'circle', cx: 28, cy: 12, r: 8, color: PAL.copper, role: 'boiler' },
    // boiler band straps
    { kind: 'line', x1: 20, y1: 12, x2: 36, y2: 12, width: 2, color: PAL.castIron, role: 'boiler-band' },
    // furnace vent glow — small orange port on the front of the hull
    { kind: 'circle', cx: 8, cy: 16, r: 4, color: PAL.castIron, role: 'vent-housing' },
    { kind: 'circle', cx: 8, cy: 16, r: 3, color: PAL.furnace, role: 'vent-glow' },
    // smokestack rising from boiler
    { kind: 'rect', x: 30, y: 1, w: 6, h: 10, rx: 1, color: PAL.castIron, role: 'smokestack' },
    // steam puff circles from stack top
    { kind: 'circle', cx: 33, cy: 1, r: 3, color: PAL.steam, role: 'steam-puff' },
    { kind: 'circle', cx: 30, cy: 0, r: 2, color: PAL.steam, role: 'steam-puff' },
    // stubby cannon barrel pointing forward-left
    { kind: 'rect', x: 0, y: 14, w: 12, h: 5, rx: 1, color: PAL.castIron, role: 'cannon-barrel' },
    // cannon muzzle ring (copper)
    { kind: 'rect', x: 0, y: 13, w: 4, h: 7, rx: 1, color: PAL.copper, role: 'cannon-muzzle' },
  ],
};

// A fast flyer. Canvas 32×26.
// A castIron/copper ovoid body with electric rotor-arc lines on each side and a
// glowing electric eye. Wide-low flyer silhouette, distinct from winged Harpy/Gargoyle.
export const DRONE: SpriteDef = {
  id: 'drone',
  w: 32,
  h: 26,
  prims: [
    // left rotor arms — extending wide
    { kind: 'line', x1: 16, y1: 13, x2: 2, y2: 8, width: 2, color: PAL.castIron, role: 'rotor-arm' },
    { kind: 'line', x1: 16, y1: 13, x2: 2, y2: 18, width: 2, color: PAL.castIron, role: 'rotor-arm' },
    // right rotor arms — extending wide
    { kind: 'line', x1: 16, y1: 13, x2: 30, y2: 8, width: 2, color: PAL.castIron, role: 'rotor-arm' },
    { kind: 'line', x1: 16, y1: 13, x2: 30, y2: 18, width: 2, color: PAL.castIron, role: 'rotor-arm' },
    // left rotor arc blur — electric arcs suggesting spinning blades
    { kind: 'poly', points: [[0, 7], [4, 5], [5, 10], [1, 12]], color: PAL.electric, role: 'rotor-arc' },
    { kind: 'poly', points: [[0, 15], [4, 13], [5, 19], [1, 20]], color: PAL.electric, role: 'rotor-arc' },
    // right rotor arc blur
    { kind: 'poly', points: [[32, 7], [28, 5], [27, 10], [31, 12]], color: PAL.electric, role: 'rotor-arc' },
    { kind: 'poly', points: [[32, 15], [28, 13], [27, 19], [31, 20]], color: PAL.electric, role: 'rotor-arc' },
    // ovoid body — castIron main hull
    { kind: 'poly', points: [[8, 8], [16, 4], [24, 8], [26, 13], [24, 18], [16, 22], [8, 18], [6, 13]], color: PAL.castIron, role: 'body' },
    // copper belly strip — ventral panel
    { kind: 'poly', points: [[10, 14], [22, 14], [20, 20], [12, 20]], color: PAL.copper, role: 'belly' },
    // single glowing electric eye — front center of body
    { kind: 'circle', cx: 16, cy: 11, r: 4, color: PAL.rivet, role: 'eye-housing' },
    { kind: 'circle', cx: 16, cy: 11, r: 3, color: PAL.electric, role: 'eye' },
    { kind: 'circle', cx: 17, cy: 10, r: 1, color: '#ffffff', role: 'eye-glint' },
  ],
};

// A towering bipedal war-mech mini-boss. Canvas 60×60.
// Heavy castIron/rivet plated torso + legs, a furnace/molten glowing chest core,
// two electric head eyes, big piston arms with copper joints. Biggest enemy in the game.
export const MECHA: SpriteDef = {
  id: 'mecha',
  w: 60,
  h: 60,
  prims: [
    // massive pillar legs — wide and towering
    { kind: 'rect', x: 6, y: 38, w: 18, h: 22, rx: 2, color: PAL.rivet, role: 'leg' },
    { kind: 'rect', x: 36, y: 38, w: 18, h: 22, rx: 2, color: PAL.rivet, role: 'leg' },
    // leg armor plates (castIron overlay)
    { kind: 'rect', x: 8, y: 40, w: 14, h: 14, rx: 1, color: PAL.castIron, role: 'leg-plate' },
    { kind: 'rect', x: 38, y: 40, w: 14, h: 14, rx: 1, color: PAL.castIron, role: 'leg-plate' },
    // knee joint — copper rounded ball
    { kind: 'circle', cx: 15, cy: 40, r: 5, color: PAL.copper, role: 'knee' },
    { kind: 'circle', cx: 45, cy: 40, r: 5, color: PAL.copper, role: 'knee' },
    // leg rivet detail
    { kind: 'circle', cx: 12, cy: 50, r: 1, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 48, cy: 50, r: 1, color: PAL.rivet, role: 'rivet' },
    // hulking main torso — broad and tall
    { kind: 'poly', points: [[6, 40], [10, 14], [20, 8], [40, 8], [50, 14], [54, 40], [46, 46], [14, 46]], color: PAL.castIron, role: 'torso' },
    // chest armor plate — rivet-framed steel panel
    { kind: 'poly', points: [[14, 16], [46, 16], [48, 38], [36, 42], [24, 42], [12, 38]], color: PAL.rivet, role: 'chest-plate' },
    // furnace/molten glowing chest core — central power source
    { kind: 'circle', cx: 30, cy: 28, r: 8, color: PAL.castIron, role: 'core-housing' },
    { kind: 'circle', cx: 30, cy: 28, r: 6, color: PAL.furnace, role: 'core-outer' },
    { kind: 'circle', cx: 30, cy: 28, r: 3, color: PAL.molten, role: 'core-inner' },
    { kind: 'circle', cx: 30, cy: 28, r: 1, color: '#ffffff', role: 'core-glint' },
    // torso rivet rows
    { kind: 'circle', cx: 16, cy: 20, r: 1, color: PAL.copper, role: 'rivet' },
    { kind: 'circle', cx: 44, cy: 20, r: 1, color: PAL.copper, role: 'rivet' },
    { kind: 'circle', cx: 16, cy: 36, r: 1, color: PAL.copper, role: 'rivet' },
    { kind: 'circle', cx: 44, cy: 36, r: 1, color: PAL.copper, role: 'rivet' },
    // massive pauldrons — wide shoulder armor
    { kind: 'poly', points: [[4, 14], [0, 28], [10, 34], [14, 18]], color: PAL.castIron, role: 'pauldron' },
    { kind: 'poly', points: [[56, 14], [60, 28], [50, 34], [46, 18]], color: PAL.castIron, role: 'pauldron' },
    // piston arms — thick and mechanical
    { kind: 'rect', x: 0, y: 26, w: 12, h: 20, rx: 2, color: PAL.castIron, role: 'arm' },
    { kind: 'rect', x: 48, y: 26, w: 12, h: 20, rx: 2, color: PAL.castIron, role: 'arm' },
    // copper piston joints on each arm
    { kind: 'circle', cx: 6, cy: 30, r: 3, color: PAL.copper, role: 'piston-joint' },
    { kind: 'circle', cx: 54, cy: 30, r: 3, color: PAL.copper, role: 'piston-joint' },
    // piston rods (lines running alongside the arms)
    { kind: 'line', x1: 3, y1: 32, x2: 3, y2: 44, width: 2, color: PAL.copper, role: 'piston-rod' },
    { kind: 'line', x1: 57, y1: 32, x2: 57, y2: 44, width: 2, color: PAL.copper, role: 'piston-rod' },
    // massive iron fists
    { kind: 'rect', x: -1, y: 44, w: 14, h: 14, rx: 3, color: PAL.rivet, role: 'fist' },
    { kind: 'rect', x: 47, y: 44, w: 14, h: 14, rx: 3, color: PAL.rivet, role: 'fist' },
    // neck collar — thick cylindrical
    { kind: 'rect', x: 24, y: 8, w: 12, h: 8, rx: 2, color: PAL.castIron, role: 'neck' },
    // helmet — broad flat-topped armored head
    { kind: 'poly', points: [[16, 10], [44, 10], [42, 0], [18, 0]], color: PAL.castIron, role: 'helm' },
    // helm top reinforcing band
    { kind: 'rect', x: 18, y: 0, w: 24, h: 3, rx: 1, color: PAL.rivet, role: 'helm-band' },
    // two electric eyes — glowing side-by-side in visor slit
    { kind: 'rect', x: 16, y: 4, w: 28, h: 5, rx: 1, color: PAL.rivet, role: 'visor' },
    { kind: 'circle', cx: 24, cy: 6, r: 3, color: PAL.electric, role: 'eye' },
    { kind: 'circle', cx: 36, cy: 6, r: 3, color: PAL.electric, role: 'eye' },
    { kind: 'circle', cx: 25, cy: 5, r: 1, color: '#ffffff', role: 'eye-glint' },
    { kind: 'circle', cx: 37, cy: 5, r: 1, color: '#ffffff', role: 'eye-glint' },
  ],
};

export const ENEMIES: SpriteDef[] = [BEAST, SCHOLAR, CAVE_DWELLER, ROCK_GOLEM, AUTOMATON, IRON_GOLEM, HARPY, HOPLITE, CENTAUR, CYCLOPS, SKELETON, KNIGHT, GARGOYLE, DRAGON, MUSKETEER, PIKEMAN, GRENADIER, DREADNOUGHT, RIVETER, STEAM_TANK, DRONE, MECHA];
