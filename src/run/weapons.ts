import { AgeId, AGE_ORDER, ArchetypeId, OnHit, Trajectory, WeaponDef } from '../game/types';
import { WEAPONS } from './weaponData';
import { resolveShape, ARCHETYPES } from './archetypes';

// RC-031: two GENERIC weapon slots (the melee/ranged split is gone). Fusing both weapons
// (fusion.ts) frees a slot — that's the build arc. Hybrids are runtime defs carried on the
// equipped entry (`hybrid`), never in the WEAPONS catalog.
export const MAX_WEAPON_SLOTS = 2;

export interface EquippedWeapon { id: string; level: number; hybrid?: WeaponDef }

/** The run's starting loadout: the kit's start weapon at level 1. */
export function initialWeapons(startWeapon: string = 'club'): EquippedWeapon[] {
  return [{ id: startWeapon, level: 1 }];
}

/** Resolve an equipped entry to its def: hybrids carry their own; base ids hit the catalog. */
export function defOf(w: EquippedWeapon, defs: Record<string, WeaponDef> = WEAPONS): WeaponDef {
  return w.hybrid ?? defs[w.id];
}

/** Fill an empty slot with `id` at level 1. No-op when full or already held — swaps use swapWeapon. */
export function addWeapon(equipped: EquippedWeapon[], id: string): EquippedWeapon[] {
  if (equipped.length >= MAX_WEAPON_SLOTS) return equipped;
  if (equipped.some((w) => w.id === id)) return equipped;
  return [...equipped, { id, level: 1 }];
}

/** Replace the slot holding `outId` with `inId` at level 1 (explicit swap card). Pure. */
export function swapWeapon(equipped: EquippedWeapon[], outId: string, inId: string): EquippedWeapon[] {
  return equipped.map((w) => (w.id === outId ? { id: inId, level: 1 } : w));
}

/** Raise one equipped weapon a level, capped at its (hybrid-aware) def's maxLevel. Pure. */
export function levelWeapon(
  equipped: EquippedWeapon[], id: string, defs: Record<string, WeaponDef> = WEAPONS,
): EquippedWeapon[] {
  return equipped.map((w) =>
    w.id === id ? { ...w, level: Math.min(w.level + 1, defOf(w, defs).maxLevel) } : w,
  );
}

/** Replace both equipped weapons with the fused hybrid (consumes the parents). Pure. */
export function equipHybrid(hybrid: WeaponDef): EquippedWeapon[] {
  return [{ id: hybrid.id, level: 1, hybrid }];
}

/** One-line firing profile for draft cards: verb + numbers. */
export function weaponStatText(def: WeaponDef): string {
  const shape = resolveShape(def);
  const parts = [
    `${def.damage} dmg`,
    def.count > 1 ? `${def.count} shots` : '1 shot',
    ARCHETYPES[def.archetype ?? 'bolt'].label,
  ];
  if (shape.onHit.pierce) parts.push(`pierce ${shape.onHit.pierce}`);
  if (shape.onHit.chain) parts.push(`chain ${shape.onHit.chain}`);
  if (shape.onHit.explode) parts.push('AoE');
  if (shape.onHit.zoneMs) parts.push('lingers');
  parts.push(`${(1000 / def.cooldownMs).toFixed(1)}/s`);
  return parts.join(' · ');
}

/** What one level-up adds, for the draft card's second line. */
export function weaponLevelGainText(def: WeaponDef): string {
  const s = def.levelScaling;
  const parts: string[] = [];
  if (s.damage) parts.push(`+${s.damage} dmg`);
  if (s.count) parts.push(`+${s.count} shot${s.count > 1 ? 's' : ''}`);
  if (s.cooldownMs) parts.push(s.cooldownMs < 0 ? `+${Math.round(-s.cooldownMs)}ms faster` : `${s.cooldownMs}ms slower`);
  return parts.length ? parts.join(' · ') : 'stronger';
}

const BASE_BULLET_LIFE_MS = 1200;

/** Range factor by age: early 0.25, mid 0.50, end 0.75 (unchanged from RC-009 tuning). */
export function rangeFactorForTier(tier: AgeId): number {
  const i = AGE_ORDER.indexOf(tier);
  if (i <= 2) return 0.25;
  if (i <= 5) return 0.50;
  return 0.75;
}

export interface WeaponShot {
  sprite: string;
  damage: number;
  count: number;
  spread: number;
  speed: number;
  cooldownMs: number;
  trajectory: Trajectory;
  onHit: OnHit;
  lifeMs: number;
  archetype: ArchetypeId;   // RC-031 VFX: the firing verb (body) — drives the kit's shake/motion
  bases: ArchetypeId[];     // RC-031 VFX: constituent archetypes (hybrids carry 2-3); palette pick
}

/** Resolve a def at a level into per-volley firing numbers (v2: trajectory + onHit). Pure. */
export function weaponShot(def: WeaponDef, level: number, damageMult: number): WeaponShot {
  const steps = level - 1;
  const s = def.levelScaling;
  const shape = resolveShape(def);
  return {
    sprite: def.projectileSprite,
    damage: (def.damage + (s.damage ?? 0) * steps) * damageMult,
    count: def.count + (s.count ?? 0) * steps,
    spread: def.spread,
    speed: def.speed,
    cooldownMs: Math.max(120, def.cooldownMs + (s.cooldownMs ?? 0) * steps),
    trajectory: shape.trajectory,
    onHit: shape.onHit,
    lifeMs: Math.round(BASE_BULLET_LIFE_MS * rangeFactorForTier(def.tier)),
    archetype: def.archetype ?? 'bolt',
    bases: shape.bases,
  };
}
