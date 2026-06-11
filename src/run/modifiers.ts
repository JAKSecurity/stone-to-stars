import {
  CivState, RunModifiers, RunModifierDelta,
} from '../game/types';
import {
  BASE_MAX_HP, BASE_DAMAGE_MULT, BASE_DRAFT_CHOICES, BASE_WEAPONS,
  BASE_PICKUP_RADIUS, BASE_MOVE_MULT, BASE_FIRE_MULT,
  BASE_DRAFT_REROLLS, BASE_START_WEAPON_LEVEL, BASE_ACTIVES,
} from '../game/config';
import { TECHS } from '../tech/techData';
import { BUILDINGS } from '../camp/buildingData';
import { TRADITIONS } from '../civics/traditionData';
import { resolveActiveItem } from './actives';

export function computeRunModifiers(civ: CivState): RunModifiers {
  let maxHp = BASE_MAX_HP;
  let damageMult = BASE_DAMAGE_MULT;
  let draftChoices = BASE_DRAFT_CHOICES;
  let pickupRadius = BASE_PICKUP_RADIUS;
  let moveSpeedMult = BASE_MOVE_MULT;
  let fireRateMult = BASE_FIRE_MULT;
  let draftRerolls = BASE_DRAFT_REROLLS;
  let startWeaponLevel = BASE_START_WEAPON_LEVEL;
  const weapons = new Set<string>(BASE_WEAPONS);
  const actives = new Set<string>(BASE_ACTIVES);

  for (const techId of civ.researched) {
    const b = TECHS[techId]?.runBonus;
    if (!b) continue;
    maxHp += b.maxHp ?? 0;
    damageMult += b.damageMult ?? 0;
    draftChoices += b.draftChoices ?? 0;
    (b.weapons ?? []).forEach((w) => weapons.add(w));
    (b.actives ?? []).forEach((a) => actives.add(a));
  }

  for (const placed of civ.buildings) {
    const b = BUILDINGS[placed.id]?.runBonus;
    if (!b) continue;
    maxHp += (b.maxHp ?? 0) * placed.level;
    damageMult += (b.damageMult ?? 0) * placed.level;
    draftChoices += (b.draftChoices ?? 0) * placed.level;
    (b.weapons ?? []).forEach((w) => weapons.add(w));
    (b.actives ?? []).forEach((a) => actives.add(a));
  }

  // Traditions: each owned node contributes effectPerRank * clamp(rank, 0, maxRank).
  for (const [id, rawRank] of Object.entries(civ.traditions)) {
    const def = TRADITIONS[id];
    if (!def) continue;
    const rank = Math.max(0, Math.min(rawRank, def.maxRank)); // clamp = the cap guarantee
    const e: RunModifierDelta = def.effectPerRank;
    maxHp += (e.maxHp ?? 0) * rank;
    damageMult += (e.damageMult ?? 0) * rank;
    draftChoices += (e.draftChoices ?? 0) * rank;
    pickupRadius += (e.pickupRadius ?? 0) * rank;
    moveSpeedMult += (e.moveSpeedMult ?? 0) * rank;
    fireRateMult += (e.fireRateMult ?? 0) * rank;
    draftRerolls += (e.draftRerolls ?? 0) * rank;
    startWeaponLevel += (e.startWeaponLevel ?? 0) * rank;
  }

  // RC-027: start with the player's chosen weapon if they own it, else the base club.
  const startWeapon = civ.startWeapon && weapons.has(civ.startWeapon) ? civ.startWeapon : 'club';

  const activeItem = resolveActiveItem(civ.activeItem, [...actives]);

  return {
    maxHp, damageMult, draftChoices, weapons: [...weapons],
    pickupRadius, moveSpeedMult, fireRateMult, draftRerolls, startWeaponLevel, startWeapon,
    actives: [...actives], activeItem,
  };
}
