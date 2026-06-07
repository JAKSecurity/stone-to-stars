import { WeaponDef, Perk } from '../game/types';
import { WEAPONS } from './weaponData';
import { PERKS } from './draft';

export const MAX_WEAPON_SLOTS = 4;

export interface EquippedWeapon {
  id: string;
  level: number;
}

/** Every run starts with the base club; civ unlocks are drafted in (see draftOptions). */
export function initialWeapons(): EquippedWeapon[] {
  return [{ id: 'club', level: 1 }];
}

/** Append a new weapon at level 1; no-op if already equipped or slots are full. */
export function addWeapon(equipped: EquippedWeapon[], id: string): EquippedWeapon[] {
  if (equipped.some((w) => w.id === id)) return equipped;
  if (equipped.length >= MAX_WEAPON_SLOTS) return equipped;
  return [...equipped, { id, level: 1 }];
}

/** Raise one equipped weapon by a level, capped at its def's maxLevel. Pure. */
export function levelWeapon(equipped: EquippedWeapon[], id: string): EquippedWeapon[] {
  return equipped.map((w) =>
    w.id === id ? { ...w, level: Math.min(w.level + 1, WEAPONS[id].maxLevel) } : w,
  );
}

/**
 * The evolved weapon id, if `weapon` is at its max level AND `ownedPerks` includes its
 * required perk; otherwise null. `defs` is injectable so tests use a fixture catalog.
 */
export function evolutionFor(
  weapon: EquippedWeapon,
  ownedPerks: string[],
  defs: Record<string, WeaponDef> = WEAPONS,
): string | null {
  const def = defs[weapon.id];
  if (!def?.evolvesTo || !def.evolveRequiresPerk) return null;
  if (weapon.level < def.maxLevel) return null;
  if (!ownedPerks.includes(def.evolveRequiresPerk)) return null;
  return def.evolvesTo;
}

/** Replace `fromId` with its evolved form `toId`, reset to level 1. Pure. */
export function applyEvolve(
  equipped: EquippedWeapon[], fromId: string, toId: string,
): EquippedWeapon[] {
  return equipped.map((w) => (w.id === fromId ? { id: toId, level: 1 } : w));
}

export interface WeaponShot {
  sprite: string;
  damage: number;
  count: number;
  spread: number;
  speed: number;
  cooldownMs: number;
  behavior: WeaponDef['behavior'];
  pierce: number;
}

/** Resolve a weapon def at a given level into concrete per-volley firing numbers. Pure. */
export function weaponShot(def: WeaponDef, level: number, damageMult: number): WeaponShot {
  const steps = level - 1;
  const s = def.levelScaling;
  return {
    sprite: def.projectileSprite,
    damage: (def.damage + (s.damage ?? 0) * steps) * damageMult,
    count: def.count + (s.count ?? 0) * steps,
    spread: def.spread,
    speed: def.speed,
    cooldownMs: Math.max(120, def.cooldownMs + (s.cooldownMs ?? 0) * steps),
    behavior: def.behavior,
    pierce: def.pierce ?? 0,
  };
}

export type DraftOption =
  | { kind: 'perk'; perk: Perk }
  | { kind: 'newWeapon'; weaponId: string }
  | { kind: 'levelWeapon'; weaponId: string }
  | { kind: 'evolve'; fromId: string; toId: string };

export interface DraftContext {
  equipped: EquippedWeapon[];
  ownedPerks: string[];
  pool: string[]; // civ-unlocked weapon ids (RunModifiers.weapons)
}

/** All currently-valid draft options, in priority order (evolutions first). */
export function draftOptions(ctx: DraftContext): DraftOption[] {
  const opts: DraftOption[] = [];

  for (const w of ctx.equipped) {
    const to = evolutionFor(w, ctx.ownedPerks);
    if (to) opts.push({ kind: 'evolve', fromId: w.id, toId: to });
  }
  if (ctx.equipped.length < MAX_WEAPON_SLOTS) {
    for (const id of ctx.pool) {
      if (!ctx.equipped.some((w) => w.id === id)) opts.push({ kind: 'newWeapon', weaponId: id });
    }
  }
  for (const w of ctx.equipped) {
    const def = WEAPONS[w.id];
    if (def && w.level < def.maxLevel) opts.push({ kind: 'levelWeapon', weaponId: w.id });
  }
  for (const p of PERKS) opts.push({ kind: 'perk', perk: p });

  return opts;
}

/** Pick `count` distinct options at random (no replacement) — same shape as draft.rollDraft. */
export function rollRunDraft(rng: () => number, count: number, ctx: DraftContext): DraftOption[] {
  const pool = draftOptions(ctx);
  const out: DraftOption[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length) % pool.length;
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}
