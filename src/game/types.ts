export type Resource = 'exploration' | 'science' | 'industry' | 'culture';
export const RESOURCES: Resource[] = ['exploration', 'science', 'industry', 'culture'];
export type ResourceBundle = Record<Resource, number>;

export type AgeId = 'stone' | 'bronze' | 'iron' | 'classical';
/** Ascending order; index = how advanced. */
export const AGE_ORDER: AgeId[] = ['stone', 'bronze', 'iron', 'classical'];

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
  behavior: 'straight' | 'pierce' | 'orbit' | 'cone' | 'lob';
  pierce?: number;             // distinct enemies a projectile passes through (behavior 'pierce')
  maxLevel: number;
  levelScaling: {              // per-level deltas applied (level - 1) times
    damage?: number;
    cooldownMs?: number;
    count?: number;
  };
  evolvesTo?: string;          // weapon id of the evolved form
  evolveRequiresPerk?: string; // perk id that, owned while this weapon is maxed, enables evolution
}

export interface RunBonus {
  maxHp?: number;       // flat add
  damageMult?: number;  // additive fraction, 0.1 = +10%
  draftChoices?: number;// flat add
  weapons?: string[];   // weapon ids granted
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
}

export interface ExpeditionScaling {
  hpMult: number;
  speedMult: number;
  spawnRateMult: number;
  dropMult: number;
}

export interface Expedition {
  biomeId: string;
  tier: number;               // difficulty; equals an AGE_ORDER index
  scaling: ExpeditionScaling;
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
  runs: number;
}

export interface RunModifiers {
  maxHp: number;
  damageMult: number;  // total multiplier, e.g., 1.25
  draftChoices: number;
  weapons: string[];
}

export interface RunResult {
  collected: ResourceBundle; // resources gathered during the run
  survivedMs: number;
  died: boolean;
}

export interface PerkEffect {
  damageMult?: number;    // additive fraction
  fireRateMult?: number;  // additive fraction
  moveSpeedMult?: number; // additive fraction
  maxHp?: number;         // flat add (also heals by same amount)
  pickupRadius?: number;  // flat add (pixels)
}

export interface Perk {
  id: string;
  name: string;
  desc: string;
  effect: PerkEffect;
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
}
