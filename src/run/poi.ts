import { Resource, RESOURCES } from '../game/types';
import { Rng } from './rng';
import {
  PoiId, SHRINE_WAVE_BASE, SHRINE_WAVE_PER_TIER, SHRINE_JACKPOT_GEMS, SHRINE_GEM_VALUE_MULT,
  COURIER_JACKPOT_GEMS, COURIER_GEM_VALUE_MULT,
} from './poiData';
import { rewardValueForTier } from '../game/economy';

export interface PoiPlacement { id: PoiId; x: number; y: number; }

/** Roll the dungeon's 2 DISTINCT POI types (spec §1). Seeded → reproducible. */
export function rollPois(rng: Rng): PoiId[] {
  const all: PoiId[] = ['shrine', 'courier', 'altar'];
  const first = all[Math.floor(rng() * all.length) % all.length];
  const rest = all.filter((p) => p !== first);
  const second = rest[Math.floor(rng() * rest.length) % rest.length];
  return [first, second];
}

/** Weighted draw of `SHRINE_WAVE_BASE + PER_TIER×tier` enemy ids from a biome spawn table. */
export function shrineWave(rng: Rng, table: Record<string, number>, tier: number): string[] {
  const entries = Object.entries(table);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  const out: string[] = [];
  const n = SHRINE_WAVE_BASE + SHRINE_WAVE_PER_TIER * tier;
  for (let i = 0; i < n; i++) {
    let r = rng() * total;
    let pick = entries[0][0];
    for (const [id, w] of entries) { r -= w; if (r <= 0) { pick = id; break; } }
    out.push(pick);
  }
  return out;
}

export interface JackpotGem { resource: Resource; value: number; }

/** Shrine payout: a culture burst (its single legible identity, spec §1). */
export function shrineJackpot(tier: number): JackpotGem[] {
  const v = rewardValueForTier(tier) * SHRINE_GEM_VALUE_MULT;
  return Array.from({ length: SHRINE_JACKPOT_GEMS }, () => ({ resource: 'culture' as Resource, value: v }));
}

/** Courier payout: a big MIXED jackpot — every resource represented, remainder random. */
export function courierJackpot(rng: Rng, tier: number): JackpotGem[] {
  const v = rewardValueForTier(tier) * COURIER_GEM_VALUE_MULT;
  const out: JackpotGem[] = RESOURCES.map((r) => ({ resource: r, value: v }));
  while (out.length < COURIER_JACKPOT_GEMS) {
    out.push({ resource: RESOURCES[Math.floor(rng() * RESOURCES.length) % RESOURCES.length], value: v });
  }
  return out;
}
