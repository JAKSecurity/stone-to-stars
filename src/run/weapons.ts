import { WeaponDef, Perk, AgeId, AGE_ORDER } from '../game/types';
import { WEAPONS } from './weaponData';
import { PERKS } from './draft';

export type WeaponClass = 'melee' | 'ranged';

// You carry one weapon of each class (one melee, one ranged) — two slots total. Drafting a weapon of
// a class you already hold SWAPS it (see addWeapon); "Upgrade" levels the one you have.
export const MAX_WEAPON_SLOTS = 2;

// Short-range hand weapons (club/blade/spear/hammer/axe/saw/flail). Everything else — guns, bows,
// thrown, cannons, fire jets — is ranged. Evolved forms inherit their base's class.
const MELEE_IDS = new Set([
  'club', 'bronze_spear', 'iron_lance', 'iron_pick', 'ricochet_pick', 'war_hammer', 'war_maul',
  'sawblade', 'buzzsaw', 'gladius', 'spatha', 'longsword', 'greatsword', 'halberd', 'poleaxe',
  'flail', 'morningstar',
]);

/** A weapon's loadout class. Unknown ids default to ranged. */
export function weaponClass(id: string): WeaponClass {
  return MELEE_IDS.has(id) ? 'melee' : 'ranged';
}

export interface EquippedWeapon {
  id: string;
  level: number;
}

/** The run's starting loadout: just the chosen weapon at level 1 (default the base club). The other
 *  class slot is filled by drafting during the run (see draftOptions). RC-027 starting-weapon choice. */
export function initialWeapons(startWeapon: string = 'club'): EquippedWeapon[] {
  return [{ id: startWeapon, level: 1 }];
}

/**
 * Equip `id` at level 1, occupying its class slot — if you already hold a weapon of that class, this
 * REPLACES it (the new pick supersedes the old one). No-op if `id` is already the equipped weapon of
 * its class. Pure.
 */
export function addWeapon(equipped: EquippedWeapon[], id: string): EquippedWeapon[] {
  if (equipped.some((w) => w.id === id)) return equipped;
  const cls = weaponClass(id);
  const others = equipped.filter((w) => weaponClass(w.id) !== cls);
  return [...others, { id, level: 1 }];
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

const BEHAVIOR_WORD: Record<WeaponDef['behavior'], string> = {
  straight: 'single', pierce: 'piercing', cone: 'spread', orbit: 'orbiting', lob: 'lobbed',
};

/** One-line summary of a weapon's base firing profile, for the draft picker ("New weapon" / evolve). */
export function weaponStatText(def: WeaponDef): string {
  const parts = [
    `${def.damage} dmg`,
    def.count > 1 ? `${def.count} shots` : '1 shot',
    BEHAVIOR_WORD[def.behavior],
  ];
  if (def.pierce) parts.push(`pierce ${def.pierce}`);
  parts.push(`${(1000 / def.cooldownMs).toFixed(1)}/s`);
  return parts.join(' · ');
}

/** What one level-up adds to a weapon, for the draft picker's "Upgrade" option. */
export function weaponLevelGainText(def: WeaponDef): string {
  const s = def.levelScaling;
  const parts: string[] = [];
  if (s.damage) parts.push(`+${s.damage} dmg`);
  if (s.count) parts.push(`+${s.count} shot${s.count > 1 ? 's' : ''}`);
  if (s.cooldownMs) parts.push(s.cooldownMs < 0 ? `+${Math.round(-s.cooldownMs)}ms faster` : `${s.cooldownMs}ms slower`);
  return parts.length ? parts.join(' · ') : 'stronger';
}

// A projectile lives this long before despawning; range = speed × life. Cut hard for early weapons
// (their shots felt like they reached across the whole field) and tapered back in for later ages.
const BASE_BULLET_LIFE_MS = 1200;

/** Range factor by the weapon's age: early 0.25 (−75%), mid 0.50 (−50%), end 0.75 (−25%). */
export function rangeFactorForTier(tier: AgeId): number {
  const i = AGE_ORDER.indexOf(tier);
  if (i <= 2) return 0.25; // stone / bronze / iron — early
  if (i <= 5) return 0.50; // classical / medieval / renaissance — mid
  return 0.75;             // industrial / modern — end
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
  lifeMs: number;        // projectile lifetime (range) — shorter for earlier weapons
  ignoresArmor: boolean; // bypass enemy armor (sniper line)
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
    lifeMs: Math.round(BASE_BULLET_LIFE_MS * rangeFactorForTier(def.tier)),
    ignoresArmor: def.pierceArmor ?? false,
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
  // Any pool weapon you don't already hold is offerable: picking it fills its class slot, or SWAPS
  // out your current weapon of that class. (So you're always choosing 1 melee + 1 ranged.)
  for (const id of ctx.pool) {
    if (!ctx.equipped.some((w) => w.id === id)) opts.push({ kind: 'newWeapon', weaponId: id });
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
