// RC-026 POI catalog (spec §1): one legible payout identity each. Placement is part of dungeon
// generation (same seeded Rng), so a seed reproduces its POIs.
export type PoiId = 'shrine' | 'courier' | 'altar';

export interface PoiDef {
  id: PoiId;
  name: string;
  icon: string;     // edge-indicator + HUD glyph
  sprite: string;   // art-registry texture id (art authored in Task 9; Jeff ratifies at playtest)
  blurb: string;    // one-line tooltip / log line
}

export const POIS: Record<PoiId, PoiDef> = {
  shrine:  { id: 'shrine', name: 'Relic Shrine', icon: '⛩️', sprite: 'poi_shrine',
    blurb: 'Awaken it: survive the guardians, claim a culture hoard' },
  courier: { id: 'courier', name: 'Treasure Courier', icon: '💰', sprite: 'enemy_courier',
    blurb: 'It runs. Catch it before it escapes.' },
  altar:   { id: 'altar', name: 'Fusion Altar', icon: '⚗️', sprite: 'poi_altar',
    blurb: 'A free fusion catalyst — but everything nearby wakes' },
};

// Tuning constants (feel values are RC-009's remit; structure is fixed here).
export const SHRINE_WAVE_BASE = 6;        // wave size at tier 0 ...
export const SHRINE_WAVE_PER_TIER = 2;    // ... plus this per age tier
export const SHRINE_JACKPOT_GEMS = 6;     // culture gems in the payout burst
export const SHRINE_GEM_VALUE_MULT = 3;   // per-gem value vs a normal kill gem of the tier
export const COURIER_DESPAWN_MS = 20_000; // flee window after first aggro
export const COURIER_JACKPOT_GEMS = 10;   // mixed gems on catch
export const COURIER_GEM_VALUE_MULT = 3;
export const COURIER_SPEED_MULT = 1.15;   // vs the player's base speed — catchable with routing
export const ALTAR_WAKE_SCREENS = 1.5;    // wake radius in screen-widths
