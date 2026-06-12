// RC-029 expedition mutators (spec §2): pre-run wagers. Calibration principle (Jeff,
// 2026-06-11): the reward bonus is HALF the risk magnitude. Bonuses stack ADDITIVELY.
export interface MutatorDef {
  id: string;
  name: string;
  icon: string;
  desc: string;                 // effect + bonus, shown on the card chip
  rewardBonus: number;          // additive fraction (0.25 = +25%)
  effects: {
    enemySpeedMult?: number;    // applied at enemy placement (placed roster + waves + children)
    enemyCountMult?: number;    // applied to the PLACED roster count only (POI waves/courier exempt)
    maxHpMult?: number;         // applied to RunModifiers-derived maxHp BEFORE the baseStats snapshot
    enemyArmorAdd?: number;     // applied at enemy placement
  };
}

export const MUTATORS: Record<string, MutatorDef> = {
  night_raid: { id: 'night_raid', name: 'Night Raid', icon: '🌙',
    desc: 'Enemies +50% speed · reward +25%', rewardBonus: 0.25,
    effects: { enemySpeedMult: 1.5 } },
  horde:      { id: 'horde', name: 'Horde', icon: '👥',
    desc: '+50% enemies · reward +25%', rewardBonus: 0.25,
    effects: { enemyCountMult: 1.5 } },
  frail:      { id: 'frail', name: 'Frail', icon: '💔',
    desc: 'Your max HP −40% · reward +20%', rewardBonus: 0.2,
    effects: { maxHpMult: 0.6 } },
  ironclad:   { id: 'ironclad', name: 'Ironclad', icon: '🛡️',
    desc: 'Enemies +1 armor · reward +20%', rewardBonus: 0.2,
    effects: { enemyArmorAdd: 1 } },
};
