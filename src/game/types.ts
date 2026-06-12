export type Resource = 'exploration' | 'science' | 'industry' | 'culture';
export const RESOURCES: Resource[] = ['exploration', 'science', 'industry', 'culture'];
export type ResourceBundle = Record<Resource, number>;

export type AgeId = 'stone' | 'bronze' | 'iron' | 'classical' | 'medieval' | 'renaissance' | 'industrial' | 'modern' | 'space';
/** Ascending order; index = how advanced. RC-041: space is a mini 9th age (4 techs) capping the tree. */
export const AGE_ORDER: AgeId[] = ['stone', 'bronze', 'iron', 'classical', 'medieval', 'renaissance', 'industrial', 'modern', 'space'];

// RC-031 — Forge & Fuse. A weapon's verb. Archetype presets (src/run/archetypes.ts) give each
// archetype a trajectory + default on-hit; hybrids union their parents' shapes.
export type ArchetypeId =
  | 'bolt' | 'piercer' | 'spread' | 'orbiter' | 'lobber'
  | 'trail' | 'zone' | 'chain' | 'boomerang' | 'homing';
export type Trajectory = 'straight' | 'lob' | 'orbit' | 'boomerang' | 'trail' | 'homing';
export interface OnHit {
  pierce?: number;      // enemies a projectile passes through
  explode?: number;     // blast radius (px) at impact/landing
  chain?: number;       // extra hops to nearby enemies after the first hit
  zoneMs?: number;      // lingering damage-field duration (ms) at the landing point
  slowPct?: number;     // 0..1 move-speed cut applied to hit enemies for SLOW_MS
  ignoreArmor?: boolean;
}

export interface WeaponDef {
  id: string;
  name: string;
  tier: AgeId;                 // for pool gating / display
  projectileSprite: string;    // art registry texture id (e.g. 'shot_club')
  cooldownMs: number;          // base time between volleys
  damage: number;              // base damage per projectile
  count: number;               // projectiles per volley
  spread: number;              // total fan angle (radians) across the volley when count > 1
  speed: number;               // projectile px/s
  maxLevel: number;
  levelScaling: {              // per-level deltas applied (level - 1) times
    damage?: number;
    cooldownMs?: number;
    count?: number;
  };
  // RC-031 — a weapon's verb. The archetype preset (src/run/archetypes.ts) supplies the
  // trajectory + default on-hit; `onHit` overrides per-key. Hybrids (fusion.ts) carry explicit
  // trajectory/onHit/bases because fusion unions their parents' shapes.
  archetype: ArchetypeId;
  onHit?: OnHit;          // overrides/extends the archetype preset's default on-hit
  trajectory?: Trajectory;// only set explicitly on hybrids (base weapons resolve via preset)
  bases?: ArchetypeId[];  // constituent archetypes — hybrids carry 2-3, base weapons 1 (implied)
}

export interface RunBonus {
  maxHp?: number;       // flat add
  damageMult?: number;  // additive fraction, 0.1 = +10%
  draftChoices?: number;// flat add
  weapons?: string[];   // weapon ids granted
  actives?: string[];   // active-item ids granted (RC-031: net / poison_gas / grenade_volley)
}

/** The additive subset of RunModifiers that traditions (and future sources) can contribute. */
export interface RunModifierDelta {
  maxHp?: number;            // flat HP
  damageMult?: number;       // additive fraction (0.03 = +3%)
  draftChoices?: number;     // flat add
  pickupRadius?: number;     // flat px
  moveSpeedMult?: number;    // additive fraction
  fireRateMult?: number;     // additive fraction
  draftRerolls?: number;     // flat add (level-up reroll uses)
  startWeaponLevel?: number; // flat add to the starting weapon level
}

export interface TraditionDef {
  id: string;
  name: string;
  icon: string;                 // emoji shown on the card
  base: number;                 // rank-1 culture cost
  maxRank: number;
  effectPerRank: RunModifierDelta; // applied min(rank,maxRank) times in computeRunModifiers
  requiresAge?: AgeId;          // age gate (absent = cost-gated only)
  blurb: (rank: number) => string; // effect text at a given rank, for the card
}

export interface TechNode {
  id: string;
  name: string;
  age: AgeId;
  cost: Partial<ResourceBundle>;
  requires: string[];          // prerequisite tech ids
  unlocksBuilding?: string;    // building def id this tech makes buildable
  runBonus?: RunBonus;         // direct run bonus from the tech itself
  gatesAge?: AgeId;            // researching this advances the civ to that age
}

export interface BuildingDef {
  id: string;
  age: AgeId;
  name: string;
  baseCost: Partial<ResourceBundle>; // cost of level 1; level n costs baseCost * n
  yield: Partial<ResourceBundle>;    // resources granted per run, per level
  runBonus: RunBonus;                // run bonus per level (weapons granted once, not per level)
  maxLevel: number;
}

export interface EnemyDef {
  id: string;
  name: string;               // player-facing label (pick screen)
  sprite: string;             // art registry texture id
  baseHp: number;             // before tier scaling
  speed: number;              // px/s chase speed, before tier scaling
  contactDamage: number;      // hp removed from player on contact
  drop: Resource;             // gem dropped on kill
  xp: number;                 // xp granted on kill
  displaySize: { w: number; h: number };
  armor?: number;             // hits absorbed before HP damage applies (each hit strips one layer);
                              // onHit.ignoreArmor weapons bypass it. Guarantees multi-hit kills regardless of damage.
  attack?: 'ranged' | 'melee';// fires a slow projectile: 'ranged' = long reach, 'melee' = only up close
  // RC-040 — telegraphed attack profile. When present it REPLACES the basic `attack` (the def drops
  // `attack`); the scene dispatches per-profile machinery (constants + geometry in src/run/enemyAttacks.ts).
  // Low-tier enemies carry none ⇒ basic `attack` (or nothing). Profiles: volley (fast weak shots),
  // flamejet (burning cone patches), slash (melee arc sweep), beam (locked laser line), mortar (lobbed
  // AoE shell), spawner (summons `spawns` minions, capped), haunt (damaging trail along its own path).
  attackProfile?: 'volley' | 'flamejet' | 'slash' | 'beam' | 'mortar' | 'spawner' | 'haunt';
  // RC-040 — below ENRAGE_THRESHOLD HP: +60% speed and fire rate, red tint. Orthogonal to attackProfile.
  enrage?: boolean;
  // RC-040 — 'spawner' profile only: enemy id the spawner summons (e.g. mecha → 'drone').
  spawns?: string;
  // RC-018 — movement archetype, orthogonal to `attack` (firing). Absent ⇒ 'chase' (default).
  // 'charger' telegraphs then dashes; 'circler' orbits/strafes; 'standoff' holds firing distance.
  // 'flee' runs away from the player (RC-026 treasure courier).
  behavior?: 'chase' | 'charger' | 'splitter' | 'circler' | 'standoff' | 'flee';
  // 'splitter' only: on death, spawn `count` children of enemy id `into` (e.g. rock_golem → cave_dwellers).
  split?: { into: string; count: number };
}

export interface BiomeDef {
  id: string;
  name: string;
  minAge: AgeId;                                    // unlock gate
  // Resource lean shown on the pick screen. For exploration/culture the value also
  // scales the in-run passive faucet (>1 = faster tick/relics). Industry/science are
  // faucetted by the spawn table composition, so their value is display-only.
  resourceBias: Partial<Record<Resource, number>>;
  spawnTable: Record<string, number>;              // enemyId -> spawn weight
  requiresTech?: string;                            // biome hidden until this tech is researched
  tint: string;                                     // run background color
  // RC-021 — additive visual identity. Optional so existing data/tests stay undisturbed and the
  // unmerged rc-017 RunScene keeps compiling; once both land, RunScene reads `visual` for the
  // ground palette + themed obstacle sprites and falls back to `tint` + plain ellipses when absent.
  visual?: BiomeVisual;
}

/** RC-021 — per-biome in-run look: a readable hued ground (vs the near-black `tint`), faint
 *  grid/speck tints, and the set of themed obstacle sprite ids scattered as collidable terrain. */
export interface BiomeVisual {
  ground: string;       // background fill — a readable, hued ground color
  grid: string;         // faint grid-line tint
  speck: string;        // scattered dust-speck tint
  obstacles: string[];  // art-registry sprite ids scattered as collidable terrain (visual only)
}

export interface Expedition {
  biomeId: string;
  tier: number;               // = AGE_ORDER index of the biome's age; reward = incomeMult(tier).
                              // Enemy stats are fixed per age (no continuous scaling) — RC-017.
}

export interface PlacedBuilding {
  id: string;   // building def id
  level: number;
  tile: number; // 0..GRID_SIZE-1
}

export interface CivState {
  version: number;
  banked: ResourceBundle;
  researched: string[];        // tech ids
  buildings: PlacedBuilding[];
  traditions: Record<string, number>; // traditionId -> rank (absent/0 = unowned)
  runs: number;
  lifetimeResources?: ResourceBundle; // total ever earned (collected + yields). Optional: pre-existing
                                      // v3 saves lack it and lazy-default to zero (no save-version bump).
  startWeapon?: string;               // RC-027: chosen starting weapon id (default 'club'); persists as the default.
  biomeBests?: Record<string, number>; // RC-027: biomeId -> best single-run total haul. Optional, lazy-defaulted.
  kit?: string[];       // RC-031 Expedition Kit: up to 4 unlocked weapon ids draftable this run
  activeItem?: string;  // RC-031: chosen right-click active id (must be tech-unlocked)
}

export interface RunModifiers {
  maxHp: number;
  damageMult: number;
  draftChoices: number;
  weapons: string[];
  pickupRadius: number;     // px
  moveSpeedMult: number;    // 1.0 = no change
  fireRateMult: number;     // 1.0 = no change
  draftRerolls: number;     // 0 = no rerolls
  startWeaponLevel: number; // 1 = weapons start at level 1
  startWeapon?: string;     // RC-027: weapon id the run begins with (computeRunModifiers always sets it;
                            // optional so callers building bare modifiers default to 'club' via initialWeapons).
  actives: string[];    // tech-unlocked active-item ids
  activeItem?: string;  // the one chosen pre-run (validated against `actives`)
  relics?: string[];    // RC-025: relic ids the civ has unlocked (optional — bare-modifier
                        // callers and old saves default to []; RunScene reads `?? []`)
}

export interface RunResult {
  collected: ResourceBundle; // resources gathered during the run
  survivedMs: number;
  died: boolean;
  tier: number;              // run's tier (AGE_ORDER index) — scales building yields (RC-017)
  mutators?: string[];   // RC-029: active mutator ids this run (empty/absent = none)
  rewardMult?: number;   // RC-029: the additive-stack multiplier applied to `collected`
}

// RC-031 — every passive is a sidegrade: at least one positive and one negative axis.
export interface PassiveEffect {
  damageMult?: number;     // additive fraction per level (may be negative)
  fireRateMult?: number;
  moveSpeedMult?: number;
  maxHp?: number;          // flat per level
  pickupRadius?: number;   // flat px per level
  regenHps?: number;       // HP/s per level
  xpMult?: number;         // additive fraction per level
  activeCharges?: number;  // flat right-click charges per level
}
export interface PassiveDef {
  id: string;
  name: string;
  icon: string;            // emoji for HUD slot + draft card
  maxLevel: number;
  effectPerLevel: PassiveEffect;
  desc: string;            // per-level effect line, signs explicit ("+10% damage, −5% fire rate")
}
export interface EquippedPassive { id: string; level: number; hybrid?: PassiveDef }

// RC-025 — relics: tech/tradition-gated rare passives. Pure-upside new mechanics, the ONLY
// passives exempt from the sidegrade rule (civ investment earned the exception). maxLevel is
// always 1 (no leveling, no fusion); one relic per run in a dedicated third slot.
export type RelicUnlock =
  | { kind: 'tech'; techId: string }
  | { kind: 'tradition'; traditionId: string; rank: number };

export interface RelicDef {
  id: string;
  name: string;
  icon: string;        // emoji for HUD slot + draft card
  desc: string;        // mechanic line for the draft card
  unlock: RelicUnlock;
}

export interface RunStats {
  hp: number;
  maxHp: number;
  damageMult: number;
  fireRateMult: number;
  moveSpeedMult: number;
  pickupRadius: number;
  level: number;
  xp: number;
  regenHps: number;     // RC-031 passives: HP regenerated per second (0 = none)
  xpMult: number;       // RC-031 passives: 1.0 = no change
  activeCharges: number;// RC-031: right-click uses remaining this run
}
