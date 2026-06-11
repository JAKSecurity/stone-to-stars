import { EquippedPassive, PassiveDef, RunStats } from '../game/types';
import { PASSIVES, PASSIVE_FUSIONS } from './passiveData';

export const MAX_PASSIVE_SLOTS = 2;

export function passiveDefOf(p: EquippedPassive): PassiveDef {
  return p.hybrid ?? PASSIVES[p.id];
}

export function addPassive(eq: EquippedPassive[], id: string): EquippedPassive[] {
  if (eq.length >= MAX_PASSIVE_SLOTS || eq.some((p) => p.id === id)) return eq;
  return [...eq, { id, level: 1 }];
}

export function levelPassive(eq: EquippedPassive[], id: string): EquippedPassive[] {
  return eq.map((p) =>
    p.id === id ? { ...p, level: Math.min(p.level + 1, passiveDefOf(p).maxLevel) } : p,
  );
}

/** Both passives maxed + authored pair ⇒ the fused loadout (one hybrid, slot freed); else null. */
export function fusePassives(eq: EquippedPassive[]): EquippedPassive[] | null {
  if (eq.length !== 2) return null;
  if (eq.some((p) => p.level < passiveDefOf(p).maxLevel)) return null;
  const key = [eq[0].id, eq[1].id].sort().join('+');
  const hybrid = PASSIVE_FUSIONS[key];
  if (!hybrid) return null;
  return [{ id: hybrid.id, level: 1, hybrid }];
}

/**
 * RECOMPUTE model (not incremental): passives with negative axes can be swapped/fused away,
 * so stats always rebuild from the run's base (civ modifiers) + current passives.
 * `hpRatio` (0..1) preserves current health through maxHp changes.
 */
export function recomputeStats(
  base: RunStats, eq: EquippedPassive[], hpRatio: number,
): RunStats {
  let { damageMult, fireRateMult, moveSpeedMult, pickupRadius, maxHp, regenHps, xpMult, activeCharges } = base;
  for (const p of eq) {
    const def = passiveDefOf(p), e = def.effectPerLevel, lv = p.level;
    damageMult += (e.damageMult ?? 0) * lv;
    fireRateMult += (e.fireRateMult ?? 0) * lv;
    moveSpeedMult += (e.moveSpeedMult ?? 0) * lv;
    pickupRadius += (e.pickupRadius ?? 0) * lv;
    maxHp += (e.maxHp ?? 0) * lv;
    regenHps += (e.regenHps ?? 0) * lv;
    xpMult += (e.xpMult ?? 0) * lv;
    activeCharges += (e.activeCharges ?? 0) * lv;
  }
  maxHp = Math.max(1, Math.round(maxHp));
  const clamp = (v: number) => Math.max(0.1, v);
  return {
    ...base,
    damageMult: clamp(damageMult), fireRateMult: clamp(fireRateMult),
    moveSpeedMult: clamp(moveSpeedMult), pickupRadius: Math.max(10, pickupRadius),
    maxHp, hp: Math.max(1, Math.round(maxHp * hpRatio)),
    regenHps: Math.max(0, regenHps), xpMult: clamp(xpMult),
    activeCharges: Math.max(0, Math.round(activeCharges)),
  };
}
