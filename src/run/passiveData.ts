import { PassiveDef } from '../game/types';

// RC-031 passive pool (spec §1/§4): stat-tradeoff sidegrades only — the ONLY risk vocabulary
// in the game. Universal pool now; tech/tradition-gated rares are RC-025's future home.
export const PASSIVES: Record<string, PassiveDef> = {
  whetstone:        { id: 'whetstone', name: 'Whetstone', icon: '🗡️', maxLevel: 3,
    effectPerLevel: { damageMult: 0.10, fireRateMult: -0.05 },
    desc: '+10% damage, −5% fire rate' },
  rapid_levers:     { id: 'rapid_levers', name: 'Rapid Levers', icon: '⚙️', maxLevel: 3,
    effectPerLevel: { fireRateMult: 0.10, damageMult: -0.06 },
    desc: '+10% fire rate, −6% damage' },
  winged_boots:     { id: 'winged_boots', name: 'Winged Boots', icon: '👢', maxLevel: 3,
    effectPerLevel: { moveSpeedMult: 0.10, pickupRadius: -12 },
    desc: '+10% move speed, −12 pickup radius' },
  oxhide:           { id: 'oxhide', name: 'Oxhide', icon: '🛡️', maxLevel: 3,
    effectPerLevel: { maxHp: 30, moveSpeedMult: -0.05 },
    desc: '+30 max HP, −5% move speed' },
  lodestone:        { id: 'lodestone', name: 'Lodestone', icon: '🧲', maxLevel: 3,
    effectPerLevel: { pickupRadius: 35, fireRateMult: -0.04 },
    desc: '+35 pickup radius, −4% fire rate' },
  field_medic:      { id: 'field_medic', name: 'Field Medic', icon: '🩹', maxLevel: 3,
    effectPerLevel: { regenHps: 0.8, damageMult: -0.06 },
    desc: '+0.8 HP/s regen, −6% damage' },
  scholars_kit:     { id: 'scholars_kit', name: "Scholar's Kit", icon: '📜', maxLevel: 3,
    effectPerLevel: { xpMult: 0.12, moveSpeedMult: -0.04 },
    desc: '+12% XP, −4% move speed' },
  powder_bandolier: { id: 'powder_bandolier', name: 'Powder Bandolier', icon: '🎒', maxLevel: 2,
    effectPerLevel: { activeCharges: 1, maxHp: -12 },
    desc: '+1 active charge, −12 max HP' },
};

// Rare authored passive fusions (spec §2): only these pairs fuse. Key = sorted 'a+b'.
export const PASSIVE_FUSIONS: Record<string, PassiveDef> = {
  'rapid_levers+whetstone': { id: 'war_drums', name: 'War Drums', icon: '🥁', maxLevel: 3,
    effectPerLevel: { damageMult: 0.08, fireRateMult: 0.08, maxHp: -10 },
    desc: '+8% damage, +8% fire rate, −10 max HP' },
  'lodestone+winged_boots': { id: 'falconers_glove', name: "Falconer's Glove", icon: '🦅', maxLevel: 3,
    effectPerLevel: { moveSpeedMult: 0.08, pickupRadius: 25, damageMult: -0.05 },
    desc: '+8% move, +25 pickup, −5% damage' },
  'field_medic+oxhide':     { id: 'heartwood', name: 'Heartwood', icon: '🌳', maxLevel: 3,
    effectPerLevel: { maxHp: 25, regenHps: 0.7, fireRateMult: -0.06 },
    desc: '+25 max HP, +0.7 HP/s, −6% fire rate' },
  'powder_bandolier+scholars_kit': { id: 'engineers_manual', name: "Engineer's Manual", icon: '📘', maxLevel: 2,
    effectPerLevel: { activeCharges: 1, xpMult: 0.08, moveSpeedMult: -0.06 },
    desc: '+1 charge, +8% XP, −6% move' },
};
