import { ResourceBundle, RESOURCES } from '../game/types';
import { MUTATORS } from './mutatorData';

export interface MutatorEffects {
  enemySpeedMult: number;
  enemyCountMult: number;
  maxHpMult: number;
  enemyArmorAdd: number;
}

/** Combine selected mutators: multiplicative effects compose, reward bonuses ADD (spec §2).
 *  Unknown ids and duplicates are ignored — the UI is the only writer, but stay defensive. */
export function combineMutators(ids: string[]): { effects: MutatorEffects; rewardMult: number } {
  const effects: MutatorEffects = { enemySpeedMult: 1, enemyCountMult: 1, maxHpMult: 1, enemyArmorAdd: 0 };
  let bonus = 0;
  for (const id of [...new Set(ids)]) {
    const def = MUTATORS[id];
    if (!def) continue;
    bonus += def.rewardBonus;
    const e = def.effects;
    effects.enemySpeedMult *= e.enemySpeedMult ?? 1;
    effects.enemyCountMult *= e.enemyCountMult ?? 1;
    effects.maxHpMult *= e.maxHpMult ?? 1;
    effects.enemyArmorAdd += e.enemyArmorAdd ?? 0;
  }
  return { effects, rewardMult: 1 + bonus };
}

/** The wager payout: scale the run's collected haul per-resource, rounding each. Pure. */
export function applyHaulMult(collected: ResourceBundle, rewardMult: number): ResourceBundle {
  const out = { ...collected };
  for (const r of RESOURCES) out[r] = Math.round(collected[r] * rewardMult);
  return out;
}
