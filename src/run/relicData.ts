import { RelicDef } from '../game/types';

// RC-025 relic pool (spec §1): 6 pure-upside mechanic relics, each gated by the tech/tradition
// that thematically earns it. Tuning knobs live here as named constants so tests and RunScene
// share one source of truth.

export const BLOOD_RUSH_FIRE_BONUS = 0.30;   // additive fireRateMult while active
export const BLOOD_RUSH_DURATION_MS = 3000;  // refreshes on every kill
export const BRAMBLE_DAMAGE = 15;            // contact damage dealt back to a surviving toucher
export const PROSPECTOR_CHANCE = 0.10;       // chance a kill drops a duplicate gem
export const SECOND_WIND_HP_FRAC = 0.30;     // revive fraction of maxHp (once per run)
export const OVERCHARGE_PERIOD_MS = 60_000;  // refund 1 spent active charge per period

// Healing layer A (spec §3) + Harvest Feast multipliers (spec §1).
export const FOOD_DROP_CHANCE = 0.02;  // per kill
export const FOOD_HEAL = 5;           // flat HP, capped at maxHp
export const FEAST_DROP_MULT = 3;     // harvest_feast: chance ×3 (→6%)
export const FEAST_HEAL_MULT = 2;     // harvest_feast: heal ×2 (→10)

// Healing layer B (spec §4): all regenHps healing draws from one lifetime budget per run.
export const REGEN_BUDGET_FRAC = 0.25; // of CURRENT maxHp

export const RELICS: Record<string, RelicDef> = {
  blood_rush: {
    id: 'blood_rush', name: 'Blood Rush', icon: '🩸',
    desc: 'Kills grant +30% fire rate for 3s',
    unlock: { kind: 'tech', techId: 'hunting' },
  },
  bramble_mail: {
    id: 'bramble_mail', name: 'Bramble Mail', icon: '🌵',
    desc: 'Enemies that touch you take 15 damage',
    unlock: { kind: 'tech', techId: 'bronze_working' },
  },
  prospectors_eye: {
    id: 'prospectors_eye', name: "Prospector's Eye", icon: '💎',
    desc: '10% chance a kill drops a duplicate gem',
    unlock: { kind: 'tech', techId: 'currency' },
  },
  second_wind: {
    id: 'second_wind', name: 'Second Wind', icon: '🕊️',
    desc: 'Once per run, survive a lethal hit at 30% HP',
    unlock: { kind: 'tech', techId: 'masonry' },
  },
  overcharge: {
    id: 'overcharge', name: 'Overcharge', icon: '⚡',
    desc: 'Active item regains 1 charge every 60s',
    unlock: { kind: 'tech', techId: 'electricity' },
  },
  harvest_feast: {
    id: 'harvest_feast', name: 'Harvest Feast', icon: '🍖',
    desc: 'Food drops ×3 and food heals double',
    unlock: { kind: 'tradition', traditionId: 'vigor', rank: 3 },
  },
};
