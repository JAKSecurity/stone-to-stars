import {
  CivState, RunModifiers,
} from '../game/types';
import {
  BASE_MAX_HP, BASE_DAMAGE_MULT, BASE_DRAFT_CHOICES, BASE_WEAPONS,
} from '../game/config';
import { TECHS } from '../tech/techData';
import { BUILDINGS } from '../camp/buildingData';

export function computeRunModifiers(civ: CivState): RunModifiers {
  let maxHp = BASE_MAX_HP;
  let damageMult = BASE_DAMAGE_MULT;
  let draftChoices = BASE_DRAFT_CHOICES;
  const weapons = new Set<string>(BASE_WEAPONS);

  for (const techId of civ.researched) {
    const b = TECHS[techId]?.runBonus;
    if (!b) continue;
    maxHp += b.maxHp ?? 0;
    damageMult += b.damageMult ?? 0;
    draftChoices += b.draftChoices ?? 0;
    (b.weapons ?? []).forEach((w) => weapons.add(w));
  }

  for (const placed of civ.buildings) {
    const b = BUILDINGS[placed.id]?.runBonus;
    if (!b) continue;
    maxHp += (b.maxHp ?? 0) * placed.level;
    damageMult += (b.damageMult ?? 0) * placed.level;
    draftChoices += (b.draftChoices ?? 0) * placed.level;
    (b.weapons ?? []).forEach((w) => weapons.add(w));
  }

  return { maxHp, damageMult, draftChoices, weapons: [...weapons] };
}
