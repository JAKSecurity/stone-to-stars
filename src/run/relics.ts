import { RelicDef } from '../game/types';
import {
  RELICS, FOOD_DROP_CHANCE, FOOD_HEAL, FEAST_DROP_MULT, FEAST_HEAL_MULT,
  BLOOD_RUSH_FIRE_BONUS, PROSPECTOR_CHANCE, SECOND_WIND_HP_FRAC, REGEN_BUDGET_FRAC,
} from './relicData';

/** Relic ids the civ has earned: researched gate-tech, or tradition rank >= threshold. */
export function unlockedRelics(researched: string[], traditions: Record<string, number>): string[] {
  return Object.values(RELICS)
    .filter((r) => r.unlock.kind === 'tech'
      ? researched.includes(r.unlock.techId)
      : (traditions[r.unlock.traditionId] ?? 0) >= r.unlock.rank)
    .map((r) => r.id);
}

/** Relics gated by this tech — for the tech card's "Relic: ..." effect line. */
export function relicsUnlockedByTech(techId: string): RelicDef[] {
  return Object.values(RELICS).filter((r) => r.unlock.kind === 'tech' && r.unlock.techId === techId);
}

/** The relic (if any) gated by this tradition — for the tradition card's unlock line. */
export function relicForTradition(traditionId: string): RelicDef | undefined {
  return Object.values(RELICS).find(
    (r) => r.unlock.kind === 'tradition' && r.unlock.traditionId === traditionId,
  );
}

// --- Healing layer A: ambient food drops (spec §3) ---

export function foodDropChance(hasFeast: boolean): number {
  return FOOD_DROP_CHANCE * (hasFeast ? FEAST_DROP_MULT : 1);
}

export function foodHeal(hasFeast: boolean): number {
  return FOOD_HEAL * (hasFeast ? FEAST_HEAL_MULT : 1);
}

export function rollFoodDrop(rng: () => number, hasFeast: boolean): boolean {
  return rng() < foodDropChance(hasFeast);
}

// --- Relic mechanic helpers (pure; RunScene owns the timers/state) ---

export function rollBonusGem(rng: () => number, hasEye: boolean): boolean {
  return hasEye && rng() < PROSPECTOR_CHANCE;
}

/** Additive fireRateMult bonus while Blood Rush is active (now < until). */
export function bloodRushBonus(nowMs: number, untilMs: number): number {
  return nowMs < untilMs ? BLOOD_RUSH_FIRE_BONUS : 0;
}

/** HP the player revives with when Second Wind fires. */
export function secondWindRevive(maxHp: number): number {
  return Math.max(1, Math.round(maxHp * SECOND_WIND_HP_FRAC));
}

// --- Healing layer B: regen lifetime budget (spec §4) ---

export function regenBudget(maxHp: number): number {
  return REGEN_BUDGET_FRAC * maxHp;
}

/**
 * HP to regen this tick: rate x dt, clamped by the remaining lifetime budget (against CURRENT
 * maxHp, so a mid-run maxHp raise re-opens headroom) and by the missing HP. 0 once spent.
 */
export function regenTick(
  rateHps: number, dtMs: number, healedSoFar: number, maxHp: number, hp: number,
): number {
  if (rateHps <= 0 || hp >= maxHp) return 0;
  const budgetLeft = regenBudget(maxHp) - healedSoFar;
  if (budgetLeft <= 0) return 0;
  return Math.min(rateHps * (dtMs / 1000), budgetLeft, maxHp - hp);
}
