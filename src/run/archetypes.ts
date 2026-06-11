import { AgeId, ArchetypeId, OnHit, Trajectory, WeaponDef } from '../game/types';

// The 10 verbs (spec §2). Each preset = the trajectory the verb rides + its default on-hit.
// Catalog weapons store only `archetype` (+ optional onHit override); hybrids store explicit
// trajectory/onHit/bases because fusion unions them (see fusion.ts).
export const ARCHETYPE_IDS: ArchetypeId[] = [
  'bolt', 'piercer', 'spread', 'orbiter', 'lobber',
  'trail', 'zone', 'chain', 'boomerang', 'homing',
];

export interface ArchetypePreset {
  trajectory: Trajectory;
  onHit: OnHit;          // defaults — a weapon's own onHit field overrides per-key
  label: string;         // one-word verb for draft cards / squint test
}

export const ARCHETYPES: Record<ArchetypeId, ArchetypePreset> = {
  bolt:      { trajectory: 'straight',  onHit: {},                            label: 'bolt' },
  piercer:   { trajectory: 'straight',  onHit: { pierce: 2 },                 label: 'piercing' },
  spread:    { trajectory: 'straight',  onHit: {},                            label: 'spread' },
  orbiter:   { trajectory: 'orbit',     onHit: {},                            label: 'orbiting' },
  lobber:    { trajectory: 'lob',       onHit: { explode: 64 },               label: 'explosive' },
  trail:     { trajectory: 'trail',     onHit: {},                            label: 'trailing' },
  zone:      { trajectory: 'lob',       onHit: { explode: 40, zoneMs: 2500 }, label: 'zoning' },
  chain:     { trajectory: 'straight',  onHit: { chain: 2 },                  label: 'chaining' },
  boomerang: { trajectory: 'boomerang', onHit: { pierce: 4 },                 label: 'returning' },
  homing:    { trajectory: 'homing',    onHit: {},                            label: 'homing' },
};

// Spec §4 — age-scaled level depth: early weapons fuse fast (2 levels), late ones go deep.
export const MAX_LEVEL_BY_AGE: Record<AgeId, number> = {
  stone: 2, bronze: 2, iron: 3, classical: 3,
  medieval: 4, renaissance: 4, industrial: 5, modern: 5,
};

export interface WeaponShape {
  trajectory: Trajectory;
  onHit: OnHit;
  bases: ArchetypeId[];
}

/** A weapon's resolved firing shape: hybrid fields win; base weapons fall back to their
 *  archetype preset. Explicit def.onHit keys override preset defaults key-by-key. */
export function resolveShape(def: WeaponDef): WeaponShape {
  const preset = ARCHETYPES[def.archetype ?? 'bolt'];
  return {
    trajectory: def.trajectory ?? preset.trajectory,
    onHit: { ...preset.onHit, ...(def.onHit ?? {}) },
    bases: def.bases ?? [def.archetype ?? 'bolt'],
  };
}
