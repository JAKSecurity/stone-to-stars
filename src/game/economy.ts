import { AgeId, AGE_ORDER } from './types';

// Single steepness knob for the whole economy. Income scales by the RUN's tier; cost scales by the
// item's AGE. Same base on both sides => constant progression velocity + an anti-farm gate (see
// docs/superpowers/specs/2026-06-08-exponential-economy-design.md).
export const G = 1.75;

// Absolute cost scale (the one calibration knob; G sets the across-age shape). Tuned in Task A8.
export const COST_BASE = 1;

/** Income multiplier for a run at `runTier` (an AGE_ORDER index). */
export function incomeMult(runTier: number): number { return G ** runTier; }

/** Cost multiplier for an item of age `ageIndex` (an AGE_ORDER index). */
export function costMult(ageIndex: number): number { return G ** ageIndex; }

/** Resource value of one gem/pickup collected in a `runTier` run. */
export function gemValueForTier(runTier: number): number { return Math.round(G ** runTier); }

/** AGE_ORDER index of an age (0 = stone ... 7 = modern). */
export function ageIndexOf(age: AgeId): number { return AGE_ORDER.indexOf(age); }
