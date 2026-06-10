import { AgeId, AGE_ORDER } from './types';

// COST growth per age (the cost ladder). Unchanged from the original exponential-economy design
// (docs/superpowers/specs/2026-06-08-exponential-economy-design.md).
export const G = 1.75;

// INCOME grows on a GENTLER curve than cost so late-game runs don't flood the economy. Tuned so a
// tier-7 (Modern) run's income ≈ 1/10 of the old G^7 while tier-0 (Stone) is unchanged (1×): early
// steady, late tenth, smooth taper between (~½ at iron/classical). This intentionally DECOUPLES
// income from cost — the old "matched curve" invariant is gone on purpose; higher ages now pay
// relatively less per run, which tames the building-yield runaway. Raise toward G if early/mid feels
// under-rewarded. Playtest knob.
export const INCOME_G = 1.26;

// Absolute cost scale (the one cost calibration knob; G sets the across-age shape).
export const COST_BASE = 12;

/** Income multiplier for a run at `runTier` (an AGE_ORDER index) — gentler INCOME_G curve. */
export function incomeMult(runTier: number): number { return INCOME_G ** runTier; }

/** Cost multiplier for an item of age `ageIndex` (an AGE_ORDER index). */
export function costMult(ageIndex: number): number { return G ** ageIndex; }

/** Resource value of one gem/pickup collected in a `runTier` run. */
export function gemValueForTier(runTier: number): number { return Math.round(INCOME_G ** runTier); }

// Flat generosity knob layered on top of gem value — makes runs feel rewarding without disturbing
// the income/cost invariant (gemValueForTier stays = G^tier). Tune by playtest feel.
export const REWARD_MULT = 2.5;

// Building passive yields are multiplied by this so parking income (per-run, per-level) is actually
// worth chasing versus in-run gem pickups. Applied at banking (civState) and display (buildingData).
export const YIELD_SCALE = 20;

/** What the player actually banks per pickup: gem value × the generosity multiplier. */
export function rewardValueForTier(runTier: number): number {
  return Math.round(gemValueForTier(runTier) * REWARD_MULT);
}

/** AGE_ORDER index of an age (0 = stone ... 7 = modern). */
export function ageIndexOf(age: AgeId): number { return AGE_ORDER.indexOf(age); }
