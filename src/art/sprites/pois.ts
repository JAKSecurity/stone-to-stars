import { SpriteDef } from '../types';
import { PAL } from '../palette';

// RC-026 POI sprites (Task 9). Flat-style shape-data authored to the house standard
// (see obstacles.ts / enemies.ts): layered back-to-front, footprint near the canvas
// bottom so the auto contact-shadow reads as ground contact, accent glows via bright
// palette colors with white glints. Canvas sizes are FIXED (48×48 structures, 34×34
// courier) so the scene wiring + registry tests stay stable. Jeff ratifies at the
// evening playtest; rejection means tweaking these prims only, no system rework.

// ── Relic Shrine (poi_shrine, 48×48) ──────────────────────────────────────────
// A small stone shrine: a stepped plinth, a twin-pillar frame, and a warm
// culture-gold relic floating between the pillars with an ember halo. The gold glow
// is the single legible "treasure here" read; everything else is cool castle stone.
export const POI_SHRINE: SpriteDef = {
  id: 'poi_shrine',
  w: 48,
  h: 48,
  prims: [
    // stepped base — three receding tiers, widest at the ground
    { kind: 'rect', x: 6, y: 42, w: 36, h: 6, rx: 2, color: PAL.castleStoneDark, role: 'base-step' },
    { kind: 'rect', x: 10, y: 37, w: 28, h: 6, rx: 2, color: PAL.castleStone, role: 'base-step' },
    { kind: 'rect', x: 14, y: 33, w: 20, h: 5, rx: 1, color: PAL.castleStoneDark, role: 'base-top' },
    // twin pillars rising from the plinth
    { kind: 'rect', x: 13, y: 12, w: 7, h: 22, rx: 2, color: PAL.castleStone, role: 'pillar' },
    { kind: 'rect', x: 17, y: 12, w: 3, h: 22, color: PAL.castleStoneDark, role: 'pillar-shade' },
    { kind: 'rect', x: 28, y: 12, w: 7, h: 22, rx: 2, color: PAL.castleStone, role: 'pillar' },
    { kind: 'rect', x: 32, y: 12, w: 3, h: 22, color: PAL.castleStoneDark, role: 'pillar-shade' },
    // pillar caps
    { kind: 'rect', x: 11, y: 9, w: 11, h: 5, rx: 1, color: PAL.bone, role: 'cap' },
    { kind: 'rect', x: 26, y: 9, w: 11, h: 5, rx: 1, color: PAL.bone, role: 'cap' },
    // lintel beam spanning the pillars (frames the relic)
    { kind: 'rect', x: 11, y: 7, w: 26, h: 4, rx: 1, color: PAL.castleStoneDark, role: 'lintel' },
    // ── the relic glow: ember halo → gold gem → bright core glint ──
    { kind: 'circle', cx: 24, cy: 24, r: 8, color: PAL.ember, role: 'relic-halo' },
    { kind: 'poly', points: [[24, 15], [31, 24], [24, 33], [17, 24]], color: PAL.gold, role: 'relic' },
    { kind: 'poly', points: [[24, 17], [28, 24], [24, 31], [20, 24]], color: PAL.goldDark, role: 'relic-facet' },
    { kind: 'circle', cx: 22, cy: 21, r: 2, color: '#fff4cf', role: 'relic-glint' },
  ],
};

// ── Fusion Altar (poi_altar, 48×48) ───────────────────────────────────────────
// A low altar: a heavy slab on a stepped base, with two inward-curving stone arms
// reaching toward a green catalyst orb at the centre — the two arms read as "two
// things merging." The green glow matches the ⚗️ catalyst-token vibe.
export const POI_ALTAR: SpriteDef = {
  id: 'poi_altar',
  w: 48,
  h: 48,
  prims: [
    // base plinth
    { kind: 'rect', x: 6, y: 40, w: 36, h: 8, rx: 2, color: PAL.castleStoneDark, role: 'base' },
    { kind: 'rect', x: 10, y: 36, w: 28, h: 6, rx: 1, color: PAL.castleStone, role: 'base-top' },
    // heavy anvil-like slab
    { kind: 'rect', x: 9, y: 26, w: 30, h: 11, rx: 3, color: PAL.castleStone, role: 'slab' },
    { kind: 'rect', x: 9, y: 32, w: 30, h: 5, color: PAL.castleStoneDark, role: 'slab-shade' },
    // two inward-curving arms (left + mirrored right) cradling the orb — the "merge"
    { kind: 'poly', points: [[10, 26], [8, 14], [14, 12], [16, 22], [18, 26]], color: PAL.castleStoneDark, role: 'arm' },
    { kind: 'poly', points: [[11, 24], [10, 16], [14, 15], [15, 23]], color: PAL.castleStone, role: 'arm-lit' },
    { kind: 'poly', points: [[38, 26], [40, 14], [34, 12], [32, 22], [30, 26]], color: PAL.castleStoneDark, role: 'arm' },
    { kind: 'poly', points: [[37, 24], [38, 16], [34, 15], [33, 23]], color: PAL.castleStone, role: 'arm-lit' },
    // ── catalyst glow: green halo → orb → teal-bright core ──
    { kind: 'circle', cx: 24, cy: 20, r: 8, color: PAL.radio, role: 'catalyst-halo' },
    { kind: 'circle', cx: 24, cy: 20, r: 5, color: PAL.moss, role: 'catalyst' },
    { kind: 'circle', cx: 24, cy: 20, r: 2, color: '#d8ffe0', role: 'catalyst-core' },
    // a couple of rising spark motes (the chemistry-reaction read)
    { kind: 'circle', cx: 19, cy: 13, r: 1, color: PAL.radio, role: 'mote' },
    { kind: 'circle', cx: 29, cy: 11, r: 1, color: PAL.radio, role: 'mote' },
  ],
};

// ── Treasure Courier (enemy_courier, 34×34) ───────────────────────────────────
// A small hunched runner mid-stride with an over-the-shoulder loot sack that's bigger
// than its body — the silhouette must read "loot on legs." The bulging gold sack with
// a coin glint dominates; little legs are caught mid-stride so it reads as fleeing.
export const POI_COURIER: SpriteDef = {
  id: 'enemy_courier',
  w: 34,
  h: 34,
  prims: [
    // little legs caught mid-stride (one forward, one trailing) — behind the body
    { kind: 'poly', points: [[11, 24], [7, 32], [11, 32], [14, 24]], color: PAL.leather, role: 'leg-back' },
    { kind: 'poly', points: [[16, 25], [18, 32], [22, 32], [20, 25]], color: PAL.tunic, role: 'leg-front' },
    // hunched little body, leaning forward under the load
    { kind: 'poly', points: [[8, 24], [10, 14], [18, 12], [22, 16], [21, 25], [10, 26]], color: PAL.tunic, role: 'body' },
    // tucked head, low and forward (hood/cowl)
    { kind: 'circle', cx: 9, cy: 15, r: 4, color: PAL.leather, role: 'head' },
    { kind: 'circle', cx: 8, cy: 15, r: 1, color: PAL.ember, role: 'eye' },
    // arm gripping the sack strap over the shoulder
    { kind: 'poly', points: [[16, 16], [22, 11], [24, 14], [19, 19]], color: PAL.tunic, role: 'arm' },
    // ── the bulging loot sack (bigger than the runner) — the dominant silhouette ──
    { kind: 'circle', cx: 25, cy: 16, r: 9, color: PAL.goldDark, role: 'sack' },
    { kind: 'circle', cx: 25, cy: 17, r: 7, color: PAL.gold, role: 'sack-lit' },
    // cinched neck of the sack at the strap
    { kind: 'poly', points: [[18, 9], [24, 7], [25, 11], [19, 13]], color: PAL.leather, role: 'sack-neck' },
    // coins / loot glinting out the top
    { kind: 'circle', cx: 26, cy: 11, r: 2, color: PAL.ember, role: 'coin' },
    { kind: 'circle', cx: 30, cy: 13, r: 1, color: PAL.ember, role: 'coin' },
    { kind: 'circle', cx: 24, cy: 14, r: 1, color: '#fff4cf', role: 'glint' },
  ],
};

export const POIS_ART: SpriteDef[] = [POI_SHRINE, POI_ALTAR, POI_COURIER];
