import { ArchetypeId, OnHit, Trajectory, WeaponDef } from '../game/types';
import { resolveShape } from './archetypes';

export const FUSION_PREMIUM = 1.15; // fusing is always net-positive; WHEN is the decision
export const MAX_BASES = 3;         // spec §2 — a 3-base hybrid can no longer fuse

// Spec §2 precedence: the more screen-shaping trajectory wins the hybrid's ride.
export const TRAJECTORY_PRECEDENCE: Record<Trajectory, number> = {
  orbit: 6, trail: 5, lob: 4, boomerang: 3, homing: 2, straight: 1,
};

/** A parent in a fusion: its def + the level it was fused at (early fuses are weaker). */
export interface FusionParent { def: WeaponDef; level: number }

/** Per-volley DPS of `def` at `level` — same leveling math as weaponShot. */
export function leveledDps(def: WeaponDef, level: number): number {
  const steps = level - 1;
  const s = def.levelScaling;
  const damage = def.damage + (s.damage ?? 0) * steps;
  const count = def.count + (s.count ?? 0) * steps;
  const cooldown = Math.max(120, def.cooldownMs + (s.cooldownMs ?? 0) * steps);
  return damage * count * (1000 / cooldown);
}

function unionOnHit(a: OnHit, b: OnHit): OnHit {
  const out: OnHit = {};
  const max = (x?: number, y?: number) => (x === undefined && y === undefined)
    ? undefined : Math.max(x ?? 0, y ?? 0);
  out.pierce = max(a.pierce, b.pierce);
  out.explode = max(a.explode, b.explode);
  out.chain = max(a.chain, b.chain);
  out.zoneMs = max(a.zoneMs, b.zoneMs);
  out.slowPct = max(a.slowPct, b.slowPct);
  if (a.ignoreArmor || b.ignoreArmor) out.ignoreArmor = true;
  // drop undefined keys so {} stays {}
  (Object.keys(out) as (keyof OnHit)[]).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
}

/** True if fusing these two is allowed: a MAX_BASES hybrid can never fuse again (spec §2),
 *  and the union of bases must stay within MAX_BASES. */
export function canFuse(a: WeaponDef, b: WeaponDef): boolean {
  const ba = resolveShape(a).bases, bb = resolveShape(b).bases;
  if (ba.length >= MAX_BASES || bb.length >= MAX_BASES) return false;
  return new Set([...ba, ...bb]).size <= MAX_BASES;
}

/** Stable hybrid weapon id from its base set (order-free). */
export function hybridId(bases: ArchetypeId[]): string {
  return `hybrid:${[...bases].sort().join('+')}`;
}

/**
 * Fuse two equipped weapons into one hybrid WeaponDef (spec §2).
 * - components: union (numeric max, boolean OR); trajectory by precedence
 * - budget: (dpsA + dpsB) × FUSION_PREMIUM, solved for damage at the averaged cooldown
 * - identity: authored name from the base-pair table; body sprite from the trajectory winner
 * - leveling: fresh track, maxLevel = deeper parent + 1, scaling = 12% of base damage/level
 */
export function fuseWeapons(a: FusionParent, b: FusionParent): WeaponDef {
  const sa = resolveShape(a.def), sb = resolveShape(b.def);
  const bases = [...new Set([...sa.bases, ...sb.bases])];
  const trajectory = TRAJECTORY_PRECEDENCE[sa.trajectory] >= TRAJECTORY_PRECEDENCE[sb.trajectory]
    ? sa.trajectory : sb.trajectory;
  const body = TRAJECTORY_PRECEDENCE[sa.trajectory] >= TRAJECTORY_PRECEDENCE[sb.trajectory]
    ? a.def : b.def; // trajectory winner donates body sprite + primary archetype
  const targetDps = (leveledDps(a.def, a.level) + leveledDps(b.def, b.level)) * FUSION_PREMIUM;
  const cooldownMs = Math.max(160, Math.round((a.def.cooldownMs + b.def.cooldownMs) / 2));
  const count = Math.max(1, a.def.count, b.def.count);
  const damage = Math.max(1, Math.ceil(targetDps * (cooldownMs / 1000) / count));
  return {
    id: hybridId(bases),
    name: fusionName(bases),
    tier: a.def.tier, // display only; range factor uses the body parent's age
    projectileSprite: body.projectileSprite,
    archetype: body.archetype ?? 'bolt',
    // Order matters: parent A's bases lead, so an authored 2-way core name survives a third fusion (fusionName).
    bases,
    trajectory,
    onHit: unionOnHit(sa.onHit, sb.onHit),
    cooldownMs,
    damage,
    count,
    spread: Math.max(a.def.spread, b.def.spread),
    speed: Math.max(a.def.speed, b.def.speed),
    maxLevel: Math.max(a.def.maxLevel, b.def.maxLevel) + 1,
    levelScaling: { damage: Math.max(1, Math.round(damage * 0.12)) },
  };
}

// ---- Identity layer (spec §2): authored names per base PAIR, prefix for the third base. ----

const pairKey = (a: ArchetypeId, b: ArchetypeId) => [a, b].sort().join('+');

/** Authored 2-way fusion names, keyed by sorted archetype pair. Same-pair = doubled verb. */
export const FUSION_NAMES: Record<string, string> = {
  'bolt+bolt': 'Twinbolt',            'bolt+piercer': 'Lancer Bolt',
  'bolt+spread': 'Scatterbolt',       'bolt+orbiter': 'Comet Ring',
  'bolt+lobber': 'Cannonade',         'bolt+trail': 'Cinderbolt',
  'bolt+zone': 'Shrapnel Field',      'bolt+chain': 'Stormbolt',
  'bolt+boomerang': 'Skipping Bolt',  'bolt+homing': 'Seeker Bolt',
  'piercer+piercer': 'Twin Lance',    'piercer+spread': 'Pike Wall',
  'orbiter+piercer': 'Lance Carousel','lobber+piercer': 'Bunker Piercer',
  'piercer+trail': 'Dragonlance',     'piercer+zone': 'Stake Field',
  'chain+piercer': 'Arc Lance',       'boomerang+piercer': 'Skewer Return',
  'homing+piercer': 'Javelin Seeker', 'spread+spread': 'Wall of Iron',
  'orbiter+spread': 'Bladestorm',     'lobber+spread': 'Grapeshot Rain',
  'spread+trail': 'Burning Fan',      'spread+zone': 'Flak Carpet',
  'chain+spread': 'Forked Volley',    'boomerang+spread': 'Scythe Fan',
  'homing+spread': 'Swarm Burst',     'orbiter+orbiter': 'Twin Halo',
  'lobber+orbiter': 'Meteor Ring',    'orbiter+trail': 'Fire Wheel',
  'orbiter+zone': 'Ward Circle',      'chain+orbiter': 'Tesla Halo',
  'boomerang+orbiter': 'Gyre Blades', 'homing+orbiter': 'Hunter Moons',
  'lobber+lobber': 'Twin Mortars',    'lobber+trail': 'Napalm Arc',
  'lobber+zone': 'Minefield Barrage', 'chain+lobber': 'Thunderhead',
  'boomerang+lobber': 'Orbital Toss', 'homing+lobber': 'Guided Shells',
  'trail+trail': 'Scorched Earth',    'trail+zone': 'Tar & Torch',
  'chain+trail': 'Live Wire',         'boomerang+trail': 'Comet Sweep',
  'homing+trail': 'Burning Hound',    "zone+zone": "No Man's Land",
  'chain+zone': 'Static Field',       "boomerang+zone": "Sower's Arc",
  'homing+zone': 'Beacon Mines',      'chain+chain': 'Chain Lightning',
  'boomerang+chain': 'Arc Return',    'chain+homing': 'Stalking Spark',
  'boomerang+boomerang': 'Twin Gyre', 'boomerang+homing': 'Faithful Blade',
  'homing+homing': 'Wolfpack',
};

/** Third-base prefix for 3-way hybrids (templated on the 2-way name — spec §2). */
export const THIRD_PREFIX: Record<ArchetypeId, string> = {
  bolt: 'Swift', piercer: 'Impaling', spread: 'Scattering', orbiter: 'Halo',
  lobber: 'Thundering', trail: 'Burning', zone: 'Lingering', chain: 'Storm',
  boomerang: 'Returning', homing: 'Hunting',
};

/** Name a hybrid from its base set: authored pair name (+ prefix for a third base).
 *  Falls back to a generated name so missing table entries never block fusion. */
export function fusionName(bases: ArchetypeId[]): string {
  const sorted = [...bases].sort();
  if (sorted.length === 1) return FUSION_NAMES[pairKey(sorted[0], sorted[0])] ?? `Twin ${sorted[0]}`;
  if (sorted.length === 2) {
    return FUSION_NAMES[pairKey(sorted[0], sorted[1])]
      ?? `${THIRD_PREFIX[sorted[0]]} ${sorted[1]}`; // generated fallback
  }
  // 3-way: the first two bases are the "core" pair (from the parent hybrid); the third is new.
  // Try the first-two pair, then fall back to scanning all pairs for any authored name.
  const corePair = FUSION_NAMES[pairKey(bases[0], bases[1])];
  if (corePair) return `${THIRD_PREFIX[bases[2]]} ${corePair}`;
  // fallback: scan all pairs for any authored name, prefix with remaining base
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const twoName = FUSION_NAMES[pairKey(sorted[i], sorted[j])];
      if (twoName) {
        const third = sorted.find((_, k) => k !== i && k !== j)!;
        return `${THIRD_PREFIX[third]} ${twoName}`;
      }
    }
  }
  // generated fallback: all pairs unknown
  const fallbackTwo = `${THIRD_PREFIX[sorted[0]]} ${sorted[1]}`;
  return `${THIRD_PREFIX[sorted[2]]} ${fallbackTwo}`;
}
