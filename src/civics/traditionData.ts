import { TraditionDef } from '../game/types';

/** Per-node exponential culture cost multiplier. Just under tech's G=1.75 so the long tail
 *  stays reachable as income creeps up on INCOME_G=1.26 (see RC-028 spec, fork F4). */
export const COST_G = 5.0;

/** Eight nodes / 40 total ranks. Every effect is hard-capped by maxRank — a fully-maxed board
 *  is a fixed power ceiling, not a per-run multiplier, so it cannot create an economy runaway. */
export const TRADITIONS: Record<string, TraditionDef> = {
  vigor: {
    id: 'vigor', name: 'Vigor', icon: '❤️', base: 240, maxRank: 5,
    effectPerRank: { maxHp: 8 },
    blurb: (r) => `+${8 * r} start HP`,
  },
  foraging: {
    id: 'foraging', name: 'Foraging', icon: '🧺', base: 200, maxRank: 5,
    effectPerRank: { pickupRadius: 6 },
    blurb: (r) => `+${6 * r} px pickup radius`,
  },
  drill: {
    id: 'drill', name: 'Drill', icon: '⚙️', base: 280, maxRank: 5,
    effectPerRank: { fireRateMult: 0.04 },
    blurb: (r) => `+${Math.round(4 * r)}% fire rate`,
  },
  logistics: {
    id: 'logistics', name: 'Logistics', icon: '🥾', base: 220, maxRank: 5,
    effectPerRank: { moveSpeedMult: 0.03 },
    blurb: (r) => `+${Math.round(3 * r)}% move speed`,
  },
  tactics: {
    id: 'tactics', name: 'Tactics', icon: '⚔️', base: 300, maxRank: 5,
    effectPerRank: { damageMult: 0.03 },
    blurb: (r) => `+${Math.round(3 * r)}% damage`,
  },
  scholarship: {
    id: 'scholarship', name: 'Scholarship', icon: '📜', base: 400, maxRank: 2,
    effectPerRank: { draftChoices: 1 },
    blurb: (r) => `+${r} draft choice${r === 1 ? '' : 's'}`,
  },
  oratory: {
    id: 'oratory', name: 'Oratory', icon: '🗣️', base: 450, maxRank: 3,
    effectPerRank: { draftRerolls: 1 }, requiresAge: 'classical',
    blurb: (r) => `+${r} draft reroll${r === 1 ? '' : 's'} per run`,
  },
  heritage: {
    id: 'heritage', name: 'Heritage', icon: '🏛️', base: 600, maxRank: 2,
    effectPerRank: { startWeaponLevel: 1 }, requiresAge: 'medieval',
    blurb: (r) => `Start weapon +${r} level${r === 1 ? '' : 's'}`,
  },
};
