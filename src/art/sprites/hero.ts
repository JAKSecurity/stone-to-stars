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

// Medieval Age variant — plate-armored knight hero. Same 120×150 canvas and pose family.
// Full steel/steelBlue plate (greaves, cuirass, pauldrons, vambraces), great helm with
// dark visor slit, kite shield with royal/crimson heraldry, upright longsword.
// First-pass art; reviewed at the Medieval Phase C gate.
export const HERO_MEDIEVAL: SpriteDef = {
  id: 'hero_medieval',
  w: 120,
  h: 150,
  prims: [
    // legs — full plate greaves over steel cuisses
    { kind: 'rect', x: 49, y: 96, w: 10, h: 34, rx: 4, color: PAL.steel, role: 'leg' },
    { kind: 'rect', x: 62, y: 96, w: 10, h: 34, rx: 4, color: PAL.steel, role: 'leg' },
    { kind: 'rect', x: 49, y: 108, w: 10, h: 22, rx: 2, color: PAL.steelBlue, role: 'greave' },
    { kind: 'rect', x: 62, y: 108, w: 10, h: 22, rx: 2, color: PAL.steelBlue, role: 'greave' },
    // longsword — vertical shaft on right side (same position as HERO spear)
    { kind: 'line', x1: 85, y1: 20, x2: 85, y2: 120, width: 3, color: PAL.steelBlue, role: 'blade' },
    // crossguard — horizontal bar at grip transition
    { kind: 'rect', x: 80, y: 118, w: 10, h: 3, color: PAL.bone, role: 'crossguard' },
    // grip — short bone handle
    { kind: 'rect', x: 83, y: 121, w: 4, h: 9, color: PAL.bone, role: 'grip' },
    // sword tip — triangular steel point at the top
    { kind: 'poly', points: [[85, 8], [81, 20], [89, 20]], color: PAL.steel, role: 'tip' },
    // plate cuirass (trapezoid, heavier than iron)
    { kind: 'poly', points: [[42, 60], [78, 60], [74, 100], [46, 100]], color: PAL.steel, role: 'cuirass' },
    // steelBlue ridges across the breastplate
    { kind: 'rect', x: 44, y: 68, w: 32, h: 4, rx: 1, color: PAL.steelBlue, role: 'ridge' },
    { kind: 'rect', x: 44, y: 79, w: 32, h: 4, rx: 1, color: PAL.steelBlue, role: 'ridge' },
    { kind: 'rect', x: 44, y: 90, w: 32, h: 4, rx: 1, color: PAL.steelBlue, role: 'ridge' },
    // pauldrons — wide plate shoulder guards
    { kind: 'rect', x: 34, y: 56, w: 16, h: 10, rx: 3, color: PAL.steelBlue, role: 'pauldron' },
    { kind: 'rect', x: 70, y: 56, w: 16, h: 10, rx: 3, color: PAL.steelBlue, role: 'pauldron' },
    // gorget (steel collar covering throat)
    { kind: 'rect', x: 43, y: 56, w: 34, h: 7, rx: 3, color: PAL.steel, role: 'gorget' },
    // arms — full plate vambraces + rerebraces (skin covered by plate)
    { kind: 'rect', x: 33, y: 64, w: 9, h: 28, rx: 4, color: PAL.steel, role: 'arm' },
    { kind: 'rect', x: 78, y: 62, w: 9, h: 30, rx: 4, color: PAL.steel, role: 'arm' },
    { kind: 'rect', x: 33, y: 74, w: 9, h: 16, rx: 2, color: PAL.steelBlue, role: 'vambrace' },
    { kind: 'rect', x: 78, y: 72, w: 9, h: 18, rx: 2, color: PAL.steelBlue, role: 'vambrace' },
    // head — skin face, now visible under an OPEN sallet helm (was a faceless great helm)
    { kind: 'circle', cx: 60, cy: 42, r: 16, color: PAL.skin, role: 'head' },
    // eyes
    { kind: 'circle', cx: 54, cy: 41, r: 2, color: PAL.castleStoneDark, role: 'eye' },
    { kind: 'circle', cx: 66, cy: 41, r: 2, color: PAL.castleStoneDark, role: 'eye' },
    // steel sallet bowl over the crown + brow (leaves the face open)
    { kind: 'poly', points: [[44, 36], [44, 24], [48, 18], [60, 16], [72, 18], [76, 24], [76, 36]], color: PAL.steel, role: 'helm' },
    // raised-visor brow ridge
    { kind: 'rect', x: 44, y: 30, w: 32, h: 4, rx: 1, color: PAL.steelBlue, role: 'visorBrow' },
    // cheek guards framing the face
    { kind: 'rect', x: 45, y: 36, w: 5, h: 13, rx: 2, color: PAL.steel, role: 'cheek' },
    { kind: 'rect', x: 70, y: 36, w: 5, h: 13, rx: 2, color: PAL.steel, role: 'cheek' },
    // nasal guard down the center
    { kind: 'rect', x: 58, y: 33, w: 4, h: 11, rx: 1, color: PAL.steelBlue, role: 'nasal' },
    // kite shield — pointed-bottom heater shape at same shield position as HERO
    { kind: 'poly', points: [[22, 72], [48, 72], [48, 90], [35, 100], [22, 90]], color: PAL.royal, role: 'shield' },
    // heraldry cross — crimson cross on the kite shield
    { kind: 'rect', x: 32, y: 73, w: 6, h: 26, color: PAL.crimson, role: 'heraldry' },
    { kind: 'rect', x: 23, y: 81, w: 24, h: 6, color: PAL.crimson, role: 'heraldry' },
    // shield boss — steel center boss
    { kind: 'circle', cx: 35, cy: 84, r: 4, color: PAL.steel, role: 'boss' },
  ],
};

// Renaissance Age variant — musketeer/duelist hero. Same 120×150 canvas and pose family.
// Velvet/walnut buff coat over a blued/steel breastplate, wide-brim blued hat with velvet/gold
// plume, blued boots, and a blued flintlock pistol in the shield arm position + steel rapier.
// First-pass art; reviewed at the Renaissance Phase C gate.
export const HERO_RENAISSANCE: SpriteDef = {
  id: 'hero_renaissance',
  w: 120,
  h: 150,
  prims: [
    // boots — blued leather tall boots
    { kind: 'rect', x: 48, y: 96, w: 11, h: 34, rx: 4, color: PAL.blued, role: 'boot' },
    { kind: 'rect', x: 62, y: 96, w: 11, h: 34, rx: 4, color: PAL.blued, role: 'boot' },
    // boot cuffs — velvet fold at top of boots
    { kind: 'rect', x: 48, y: 96, w: 11, h: 7, rx: 2, color: PAL.velvet, role: 'cuff' },
    { kind: 'rect', x: 62, y: 96, w: 11, h: 7, rx: 2, color: PAL.velvet, role: 'cuff' },
    // rapier — thin steel blade on right side
    { kind: 'line', x1: 85, y1: 16, x2: 85, y2: 118, width: 2, color: PAL.steel, role: 'blade' },
    // rapier crossguard — horizontal bar at grip transition
    { kind: 'rect', x: 80, y: 116, w: 10, h: 3, color: PAL.brass, role: 'crossguard' },
    // rapier grip — blued handle
    { kind: 'rect', x: 83, y: 119, w: 4, h: 8, rx: 1, color: PAL.blued, role: 'grip' },
    // rapier tip — narrow steel point
    { kind: 'poly', points: [[85, 4], [83, 16], [87, 16]], color: PAL.steel, role: 'tip' },
    // buff coat body — velvet/walnut trapezoid
    { kind: 'poly', points: [[42, 60], [78, 60], [74, 100], [46, 100]], color: PAL.velvet, role: 'coat' },
    // blued steel breastplate overlay — slightly inset
    { kind: 'poly', points: [[46, 62], [74, 62], [70, 96], [50, 96]], color: PAL.blued, role: 'breastplate' },
    // breastplate steel edge-lines
    { kind: 'rect', x: 48, y: 70, w: 24, h: 3, rx: 1, color: PAL.steel, role: 'plateRidge' },
    { kind: 'rect', x: 48, y: 80, w: 24, h: 3, rx: 1, color: PAL.steel, role: 'plateRidge' },
    // coat lapels — walnut folded collar either side
    { kind: 'poly', points: [[46, 60], [55, 60], [52, 72], [44, 68]], color: PAL.walnut, role: 'lapel' },
    { kind: 'poly', points: [[74, 60], [65, 60], [68, 72], [76, 68]], color: PAL.walnut, role: 'lapel' },
    // pauldrons — blued epaulettes
    { kind: 'rect', x: 35, y: 58, w: 14, h: 7, rx: 3, color: PAL.blued, role: 'pauldron' },
    { kind: 'rect', x: 71, y: 58, w: 14, h: 7, rx: 3, color: PAL.blued, role: 'pauldron' },
    // gorget — steel collar
    { kind: 'rect', x: 44, y: 57, w: 32, h: 6, rx: 3, color: PAL.steel, role: 'gorget' },
    // arms — skin upper arms, blued vambraces
    { kind: 'rect', x: 33, y: 64, w: 9, h: 28, rx: 4, color: PAL.skin, role: 'arm' },
    { kind: 'rect', x: 78, y: 62, w: 9, h: 30, rx: 4, color: PAL.skin, role: 'arm' },
    { kind: 'rect', x: 33, y: 76, w: 9, h: 14, rx: 2, color: PAL.blued, role: 'vambrace' },
    { kind: 'rect', x: 78, y: 74, w: 9, h: 16, rx: 2, color: PAL.blued, role: 'vambrace' },
    // flintlock pistol — held in shield position (left arm area)
    // barrel — blued rectangle
    { kind: 'rect', x: 18, y: 80, w: 20, h: 4, rx: 1, color: PAL.blued, role: 'barrel' },
    // lock mechanism — small walnut rect behind barrel
    { kind: 'rect', x: 22, y: 78, w: 8, h: 8, rx: 1, color: PAL.walnut, role: 'lock' },
    // hammer/flint — small ironDark poly above lock
    { kind: 'poly', points: [[25, 78], [28, 75], [30, 78], [28, 80]], color: PAL.ironDark, role: 'hammer' },
    // grip — walnut angled handle
    { kind: 'poly', points: [[22, 86], [30, 86], [28, 96], [20, 94]], color: PAL.walnut, role: 'pistolGrip' },
    // head — skin
    { kind: 'circle', cx: 60, cy: 42, r: 16, color: PAL.skin, role: 'head' },
    // hair — visible under hat brim
    { kind: 'poly', points: [[44, 42], [45, 34], [50, 30], [55, 29], [60, 29], [65, 29], [70, 30], [75, 34], [76, 42]], color: PAL.hair, role: 'hair' },
    // wide-brim hat — blued felt, broad brim
    { kind: 'poly', points: [[36, 40], [84, 40], [80, 36], [40, 36]], color: PAL.blued, role: 'brim' },
    // hat crown — blued tall crown
    { kind: 'poly', points: [[44, 36], [46, 20], [60, 18], [74, 20], [76, 36]], color: PAL.blued, role: 'crown' },
    // hat band — velvet band at base of crown
    { kind: 'rect', x: 44, y: 34, w: 32, h: 4, rx: 1, color: PAL.velvet, role: 'hatband' },
    // gold plume — feather poly sweeping up from hat band
    { kind: 'poly', points: [[72, 34], [80, 18], [83, 20], [76, 34], [74, 36]], color: PAL.gold, role: 'plume' },
    { kind: 'poly', points: [[74, 30], [82, 16], [84, 18], [78, 30]], color: PAL.velvet, role: 'plumeDark' },
  ],
};

// Industrial Age variant — steampunk soldier hero. Same 120×150 canvas and pose family.
// Riveted castIron/rivet breastplate over a walnut/coal long coat, copper shoulder/arm
// fittings, steam/copper strap goggles with electric lenses on the head, and a steam-rifle
// (castIron/copper long gun with a line barrel + block body) in place of a spear.
// Distinct from all prior heroes. First-pass art; reviewed at the Industrial Phase C gate.
export const HERO_INDUSTRIAL: SpriteDef = {
  id: 'hero_industrial',
  w: 120,
  h: 150,
  prims: [
    // boots — coal-dark heavy industrial boots
    { kind: 'rect', x: 49, y: 96, w: 10, h: 34, rx: 3, color: PAL.coal, role: 'boot' },
    { kind: 'rect', x: 62, y: 96, w: 10, h: 34, rx: 3, color: PAL.coal, role: 'boot' },
    // boot copper trim bands
    { kind: 'rect', x: 49, y: 96, w: 10, h: 5, rx: 1, color: PAL.copper, role: 'bootTrim' },
    { kind: 'rect', x: 62, y: 96, w: 10, h: 5, rx: 1, color: PAL.copper, role: 'bootTrim' },
    // steam-rifle — long gun held on right side (replacing spear)
    // barrel — long castIron line
    { kind: 'line', x1: 85, y1: 22, x2: 85, y2: 130, width: 5, color: PAL.castIron, role: 'barrel' },
    // copper barrel band fittings
    { kind: 'rect', x: 82, y: 40, w: 6, h: 4, color: PAL.copper, role: 'band' },
    { kind: 'rect', x: 82, y: 70, w: 6, h: 4, color: PAL.copper, role: 'band' },
    { kind: 'rect', x: 82, y: 100, w: 6, h: 4, color: PAL.copper, role: 'band' },
    // rifle body/stock block
    { kind: 'rect', x: 80, y: 112, w: 10, h: 8, rx: 2, color: PAL.walnut, role: 'stock' },
    // muzzle cap
    { kind: 'poly', points: [[82, 22], [88, 22], [87, 16], [83, 16]], color: PAL.copper, role: 'muzzle' },
    // walnut/coal long coat body (trapezoid)
    { kind: 'poly', points: [[42, 60], [78, 60], [74, 100], [46, 100]], color: PAL.walnut, role: 'coat' },
    // coal under-layer visible at coat seam
    { kind: 'poly', points: [[56, 62], [64, 62], [62, 96], [58, 96]], color: PAL.coal, role: 'seam' },
    // castIron riveted breastplate overlay
    { kind: 'poly', points: [[46, 62], [74, 62], [70, 96], [50, 96]], color: PAL.castIron, role: 'breastplate' },
    // rivet accents on breastplate
    { kind: 'circle', cx: 52, cy: 70, r: 2, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 68, cy: 70, r: 2, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 52, cy: 82, r: 2, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 68, cy: 82, r: 2, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 60, cy: 76, r: 2, color: PAL.rivet, role: 'rivet' },
    // copper gorget / collar
    { kind: 'rect', x: 44, y: 57, w: 32, h: 6, rx: 3, color: PAL.copper, role: 'gorget' },
    // copper shoulder fittings / pauldrons
    { kind: 'rect', x: 34, y: 58, w: 14, h: 8, rx: 3, color: PAL.copper, role: 'pauldron' },
    { kind: 'rect', x: 72, y: 58, w: 14, h: 8, rx: 3, color: PAL.copper, role: 'pauldron' },
    // arms — walnut coat sleeves with copper vambraces
    { kind: 'rect', x: 33, y: 64, w: 9, h: 28, rx: 4, color: PAL.walnut, role: 'arm' },
    { kind: 'rect', x: 78, y: 62, w: 9, h: 30, rx: 4, color: PAL.walnut, role: 'arm' },
    { kind: 'rect', x: 33, y: 76, w: 9, h: 14, rx: 2, color: PAL.copper, role: 'vambrace' },
    { kind: 'rect', x: 78, y: 74, w: 9, h: 16, rx: 2, color: PAL.copper, role: 'vambrace' },
    // head — skin
    { kind: 'circle', cx: 60, cy: 42, r: 16, color: PAL.skin, role: 'head' },
    // hair visible below goggle strap
    { kind: 'poly', points: [[44, 42], [45, 34], [50, 30], [55, 29], [60, 29], [65, 29], [70, 30], [75, 34], [76, 42]], color: PAL.hair, role: 'hair' },
    // steam/copper goggle strap band across the forehead
    { kind: 'rect', x: 43, y: 34, w: 34, h: 8, rx: 4, color: PAL.steam, role: 'goggleStrap' },
    // copper strap buckle detail
    { kind: 'rect', x: 43, y: 36, w: 4, h: 4, color: PAL.copper, role: 'buckle' },
    { kind: 'rect', x: 73, y: 36, w: 4, h: 4, color: PAL.copper, role: 'buckle' },
    // electric lens circles (goggles)
    { kind: 'circle', cx: 53, cy: 38, r: 6, color: PAL.copper, role: 'goggleRim' },
    { kind: 'circle', cx: 67, cy: 38, r: 6, color: PAL.copper, role: 'goggleRim' },
    { kind: 'circle', cx: 53, cy: 38, r: 4, color: PAL.electric, role: 'lens' },
    { kind: 'circle', cx: 67, cy: 38, r: 4, color: PAL.electric, role: 'lens' },
    // steam highlight on goggle lenses
    { kind: 'circle', cx: 51, cy: 36, r: 1, color: PAL.steam, role: 'lensGlint' },
    { kind: 'circle', cx: 65, cy: 36, r: 1, color: PAL.steam, role: 'lensGlint' },
    // castIron cap / helm above the goggles
    { kind: 'poly', points: [[44, 36], [45, 26], [50, 20], [60, 18], [70, 20], [75, 26], [76, 36]], color: PAL.castIron, role: 'helm' },
    // rivet row on the helm
    { kind: 'circle', cx: 50, cy: 24, r: 2, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 60, cy: 21, r: 2, color: PAL.rivet, role: 'rivet' },
    { kind: 'circle', cx: 70, cy: 24, r: 2, color: PAL.rivet, role: 'rivet' },
    // steam-pressure gauge on the breastplate (copper circle with electric needle)
    { kind: 'circle', cx: 60, cy: 88, r: 5, color: PAL.steam, role: 'gauge' },
    { kind: 'poly', points: [[60, 85], [62, 89], [58, 89]], color: PAL.electric, role: 'needle' },
  ],
};

// Modern Age variant — infantry soldier hero. Same 120×150 canvas and pose family.
// Olive/khaki fatigues + gunmetal combat helmet, khaki/gunmetal tactical vest over the torso,
// gunmetal boots, and an assault rifle held across the body (replacing the spear).
// Distinct from all prior heroes. First-pass art; reviewed at the Modern Phase C gate.
export const HERO_MODERN: SpriteDef = {
  id: 'hero_modern',
  w: 120,
  h: 150,
  prims: [
    // boots — gunmetal heavy combat boots
    { kind: 'rect', x: 49, y: 96, w: 10, h: 34, rx: 3, color: PAL.gunmetal, role: 'boot' },
    { kind: 'rect', x: 62, y: 96, w: 10, h: 34, rx: 3, color: PAL.gunmetal, role: 'boot' },
    // boot trim — asphalt sole strip at the bottom of each boot
    { kind: 'rect', x: 49, y: 124, w: 10, h: 6, rx: 2, color: PAL.asphalt, role: 'sole' },
    { kind: 'rect', x: 62, y: 124, w: 10, h: 6, rx: 2, color: PAL.asphalt, role: 'sole' },
    // legs — olive fatigue trousers
    { kind: 'rect', x: 49, y: 96, w: 10, h: 30, rx: 4, color: PAL.olive, role: 'leg' },
    { kind: 'rect', x: 62, y: 96, w: 10, h: 30, rx: 4, color: PAL.olive, role: 'leg' },
    // (assault rifle moved below — drawn AFTER the torso/arms so it reads IN FRONT of the body)
    // fatigues torso — olive trapezoid
    { kind: 'poly', points: [[42, 60], [78, 60], [74, 100], [46, 100]], color: PAL.olive, role: 'torso' },
    // tactical vest — khaki/gunmetal overlay on the torso
    { kind: 'poly', points: [[46, 62], [74, 62], [70, 96], [50, 96]], color: PAL.khaki, role: 'vest' },
    // vest MOLLE webbing strips — gunmetal horizontal bands
    { kind: 'rect', x: 48, y: 70, w: 24, h: 3, rx: 1, color: PAL.gunmetal, role: 'webbing' },
    { kind: 'rect', x: 48, y: 79, w: 24, h: 3, rx: 1, color: PAL.gunmetal, role: 'webbing' },
    { kind: 'rect', x: 48, y: 88, w: 24, h: 3, rx: 1, color: PAL.gunmetal, role: 'webbing' },
    // hazard hi-vis patch on left chest of vest
    { kind: 'rect', x: 50, y: 64, w: 8, h: 5, rx: 1, color: PAL.hazard, role: 'patch' },
    // shoulder epaulettes — olive pads
    { kind: 'rect', x: 35, y: 58, w: 14, h: 7, rx: 3, color: PAL.olive, role: 'pauldron' },
    { kind: 'rect', x: 71, y: 58, w: 14, h: 7, rx: 3, color: PAL.olive, role: 'pauldron' },
    // collar — gunmetal gorget strip
    { kind: 'rect', x: 44, y: 57, w: 32, h: 5, rx: 2, color: PAL.gunmetal, role: 'collar' },
    // arms — olive sleeves with gunmetal vambraces
    { kind: 'rect', x: 33, y: 64, w: 9, h: 28, rx: 4, color: PAL.olive, role: 'arm' },
    { kind: 'rect', x: 78, y: 62, w: 9, h: 30, rx: 4, color: PAL.olive, role: 'arm' },
    { kind: 'rect', x: 33, y: 76, w: 9, h: 14, rx: 2, color: PAL.gunmetal, role: 'vambrace' },
    { kind: 'rect', x: 78, y: 74, w: 9, h: 16, rx: 2, color: PAL.gunmetal, role: 'vambrace' },
    // assault rifle — held across the body, drawn IN FRONT of the torso & arms
    { kind: 'poly', points: [[34, 78], [22, 82], [22, 90], [34, 88]], color: PAL.khaki, role: 'stock' },
    { kind: 'line', x1: 64, y1: 81, x2: 96, y2: 81, width: 3, color: PAL.gunmetal, role: 'barrel' },
    { kind: 'rect', x: 60, y: 79, w: 16, h: 5, rx: 1, color: PAL.asphalt, role: 'handguard' },
    // slotted muzzle brake at the barrel tip
    { kind: 'rect', x: 92, y: 78, w: 7, h: 6, rx: 1, color: PAL.gunmetal, role: 'muzzle' },
    { kind: 'rect', x: 94, y: 80, w: 5, h: 2, color: PAL.asphalt, role: 'muzzleSlot' },
    // receiver block across the chest
    { kind: 'rect', x: 34, y: 78, w: 34, h: 8, rx: 2, color: PAL.gunmetal, role: 'rifleBody' },
    { kind: 'rect', x: 44, y: 80, w: 14, h: 3, rx: 1, color: PAL.asphalt, role: 'receiverDetail' },
    // curved magazine + pistol grip below the receiver
    { kind: 'rect', x: 48, y: 86, w: 9, h: 12, rx: 2, color: PAL.khaki, role: 'magazine' },
    { kind: 'poly', points: [[36, 86], [44, 86], [42, 96], [34, 95]], color: PAL.gunmetal, role: 'grip' },
    // head — skin
    { kind: 'circle', cx: 60, cy: 42, r: 16, color: PAL.skin, role: 'head' },
    // eyes — in the skin strip between helmet brim and neck gaiter
    { kind: 'circle', cx: 54, cy: 45, r: 2, color: PAL.asphalt, role: 'eye' },
    { kind: 'circle', cx: 66, cy: 45, r: 2, color: PAL.asphalt, role: 'eye' },
    // balaclava/neck gaiter — gunmetal covering chin and lower face
    { kind: 'rect', x: 48, y: 49, w: 24, h: 8, rx: 3, color: PAL.gunmetal, role: 'gaiter' },
    // combat helmet — gunmetal domed bowl covering the upper head
    { kind: 'poly', points: [[44, 40], [44, 28], [48, 20], [60, 17], [72, 20], [76, 28], [76, 40]], color: PAL.gunmetal, role: 'helm' },
    // helmet pad band — khaki suspension pad band at the helm rim
    { kind: 'rect', x: 44, y: 37, w: 32, h: 4, rx: 2, color: PAL.khaki, role: 'helmetPad' },
    // helmet cover texture — olive netting/cover overlay (slightly inset)
    { kind: 'poly', points: [[46, 38], [46, 29], [50, 22], [60, 19], [70, 22], [74, 29], [74, 38]], color: PAL.olive, role: 'helmetCover' },
    // radio earpiece — small asphalt circle on the side of the helmet
    { kind: 'circle', cx: 45, cy: 35, r: 3, color: PAL.asphalt, role: 'earpiece' },
    // radio light — tiny hazard dot on earpiece
    { kind: 'circle', cx: 45, cy: 35, r: 1, color: PAL.hazard, role: 'radioLight' },
  ],
};

// Classical Age variant — Greek hoplite hero. Same 120×150 canvas and pose family.
// Bronze-gold cuirass, toga tunic, oxblood-plumed Corinthian helm, hoplon shield, spear.
// First-pass art; reviewed at the Classical Phase C gate.
export const HERO_CLASSICAL: SpriteDef = {
  id: 'hero_classical',
  w: 120,
  h: 150,
  prims: [
    // legs — greaved in gold over toga cloth
    { kind: 'rect', x: 49, y: 96, w: 10, h: 34, rx: 4, color: PAL.toga, role: 'leg' },
    { kind: 'rect', x: 62, y: 96, w: 10, h: 34, rx: 4, color: PAL.toga, role: 'leg' },
    { kind: 'rect', x: 49, y: 110, w: 10, h: 20, rx: 2, color: PAL.goldDark, role: 'greave' },
    { kind: 'rect', x: 62, y: 110, w: 10, h: 20, rx: 2, color: PAL.goldDark, role: 'greave' },
    // spear — shaft + marble tip
    { kind: 'line', x1: 85, y1: 18, x2: 85, y2: 134, width: 4, color: PAL.wood, role: 'spear' },
    { kind: 'poly', points: [[85, 6], [79, 22], [91, 22]], color: PAL.marble, role: 'spearTip' },
    // toga tunic beneath the cuirass
    { kind: 'poly', points: [[42, 60], [78, 60], [74, 100], [46, 100]], color: PAL.toga, role: 'tunic' },
    // bronze-gold cuirass (breastplate trapezoid)
    { kind: 'poly', points: [[44, 60], [76, 60], [72, 96], [48, 96]], color: PAL.gold, role: 'cuirass' },
    // cuirass muscle lines
    { kind: 'rect', x: 52, y: 68, w: 16, h: 3, rx: 1, color: PAL.goldDark, role: 'muscleDetail' },
    { kind: 'rect', x: 52, y: 78, w: 16, h: 3, rx: 1, color: PAL.goldDark, role: 'muscleDetail' },
    // pteryges (skirt tabs) — goldDark strips at the hem
    { kind: 'rect', x: 46, y: 90, w: 6, h: 8, rx: 1, color: PAL.goldDark, role: 'pteryx' },
    { kind: 'rect', x: 54, y: 90, w: 6, h: 8, rx: 1, color: PAL.goldDark, role: 'pteryx' },
    { kind: 'rect', x: 62, y: 90, w: 6, h: 8, rx: 1, color: PAL.goldDark, role: 'pteryx' },
    // epaulettes / pauldrons
    { kind: 'rect', x: 36, y: 58, w: 14, h: 7, rx: 3, color: PAL.gold, role: 'pauldron' },
    { kind: 'rect', x: 70, y: 58, w: 14, h: 7, rx: 3, color: PAL.gold, role: 'pauldron' },
    // arms — skin
    { kind: 'rect', x: 33, y: 64, w: 9, h: 28, rx: 4, color: PAL.skin, role: 'arm' },
    { kind: 'rect', x: 78, y: 62, w: 9, h: 30, rx: 4, color: PAL.skin, role: 'arm' },
    // head (skin)
    { kind: 'circle', cx: 60, cy: 42, r: 16, color: PAL.skin, role: 'head' },
    // Corinthian helm — goldDark bowl covering hair + cheekpieces
    { kind: 'poly', points: [[44, 38], [45, 26], [50, 19], [60, 17], [70, 19], [75, 26], [76, 38]], color: PAL.goldDark, role: 'helm' },
    // nasal guard strip
    { kind: 'rect', x: 57, y: 27, w: 6, h: 16, rx: 1, color: PAL.gold, role: 'nasal' },
    // oxblood crest — tall plume poly above the helm
    { kind: 'poly', points: [[55, 17], [60, 2], [65, 17], [62, 19], [58, 19]], color: PAL.oxblood, role: 'crest' },
    // hoplon shield — gold rim, oxblood face, gold boss
    { kind: 'circle', cx: 35, cy: 84, r: 13, color: PAL.gold, role: 'shield' },
    { kind: 'circle', cx: 35, cy: 84, r: 10, color: PAL.oxblood, role: 'shieldFace' },
    { kind: 'circle', cx: 35, cy: 84, r: 4, color: PAL.gold, role: 'boss' },
  ],
};
