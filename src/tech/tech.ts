import { AgeId, AGE_ORDER, CivState, Resource, ResourceBundle, TechNode } from '../game/types';
import { canAfford, spend } from '../economy/resources';
import { costMult, ageIndexOf, COST_BASE } from '../game/economy';
import { TECHS } from './techData';
import { BUILDINGS, buildingEffectText } from '../camp/buildingData';
import { WEAPONS } from '../run/weaponData';
import { ACTIVES } from '../run/activeData';
import { relicsUnlockedByTech } from '../run/relics';

// RC-017: a tech's flat base cost is derived from its role; G^age (in costMult) provides all the
// across-age growth, so the per-tech `cost` data only supplies the resource types + their order
// (largest = primary). gate > unlock > run-bonus.
type CostRole = { primary: number; secondary: number };
const TECH_BASE: Record<'gate' | 'unlock' | 'bonus', CostRole> = {
  gate: { primary: 14, secondary: 9 },
  unlock: { primary: 11, secondary: 6 },
  bonus: { primary: 9, secondary: 5 },
};

function techRole(def: TechNode): 'gate' | 'unlock' | 'bonus' {
  if (def.gatesAge) return 'gate';
  if (def.unlocksBuilding) return 'unlock';
  return 'bonus';
}

/** The age-scaled cost of a tech: role flat base × COST_BASE × G^ageIndex. Single source of truth. */
export function techCost(techId: string): Partial<ResourceBundle> {
  const def = TECHS[techId];
  const base = TECH_BASE[techRole(def)];
  const mult = COST_BASE * costMult(ageIndexOf(def.age));
  const entries = (Object.entries(def.cost) as [Resource, number][]).sort((a, b) => b[1] - a[1]);
  const out: Partial<ResourceBundle> = {};
  if (entries[0]) out[entries[0][0]] = Math.round(base.primary * mult);
  if (entries[1]) out[entries[1][0]] = Math.round(base.secondary * mult);
  return out;
}

export function isResearched(civ: CivState, techId: string): boolean {
  return civ.researched.includes(techId);
}

export function canResearch(civ: CivState, techId: string): boolean {
  const tech = TECHS[techId];
  if (!tech) return false;
  if (isResearched(civ, techId)) return false;
  if (!tech.requires.every((req) => isResearched(civ, req))) return false;
  return canAfford(civ.banked, techCost(techId));
}

export function research(civ: CivState, techId: string): CivState {
  if (!canResearch(civ, techId)) {
    throw new Error(`Cannot research ${techId}`);
  }
  return {
    ...civ,
    banked: spend(civ.banked, techCost(techId)),
    researched: [...civ.researched, techId],
  };
}

export function getAge(civ: CivState): AgeId {
  let best: AgeId = 'stone';
  for (const techId of civ.researched) {
    const gated = TECHS[techId]?.gatesAge;
    if (gated && AGE_ORDER.indexOf(gated) > AGE_ORDER.indexOf(best)) {
      best = gated;
    }
  }
  return best;
}

export function techUnlocksBuilding(techId: string): string | undefined {
  return TECHS[techId]?.unlocksBuilding;
}

/** Inline summary of what researching a tech grants — age advance, building unlock, run bonus. */
export function techEffectText(techId: string): string {
  const def = TECHS[techId];
  if (!def) return '';
  const parts: string[] = [];
  if (def.gatesAge) parts.push(`Advances to ${def.gatesAge.charAt(0).toUpperCase()}${def.gatesAge.slice(1)} Age`);
  if (def.unlocksBuilding) {
    const b = BUILDINGS[def.unlocksBuilding];
    const eff = b ? buildingEffectText(b) : '';
    parts.push(`Unlocks ${b?.name ?? def.unlocksBuilding}${eff ? ` (${eff})` : ''}`);
  }
  const rb = def.runBonus;
  if (rb) {
    if (rb.maxHp != null) parts.push(`+${rb.maxHp} HP`);
    if (rb.damageMult != null) parts.push(`+${Math.round(rb.damageMult * 100)}% dmg`);
    if (rb.draftChoices != null) parts.push(`+${rb.draftChoices} draft pick`);
    if (rb.weapons) for (const id of rb.weapons) parts.push(`Weapon: ${WEAPONS[id]?.name ?? id}`);
    if (rb.actives) for (const id of rb.actives) parts.push(`Active: ${ACTIVES[id]?.name ?? id}`);
  }
  // RC-025: relics gated by this tech (independent of runBonus).
  for (const r of relicsUnlockedByTech(techId)) parts.push(`Relic: ${r.icon} ${r.name}`);
  return parts.join(' · ');
}

/** Display names of a tech's still-unmet prerequisites (empty if all met). */
export function unmetRequirements(civ: CivState, techId: string): string[] {
  const def = TECHS[techId];
  if (!def) return [];
  return def.requires.filter((r) => !isResearched(civ, r)).map((r) => TECHS[r]?.name ?? r);
}
