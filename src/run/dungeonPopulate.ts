// Dungeon population (RC-034): which enemies and gem deposits go where. Pure, registries injected
// (mirrors spawnEscalation.ts) — RunScene materialises these into sprites. The gem counts reproduce
// the retired periodic faucets (4000ms exploration tick, 5000ms culture relic, 2600ms deposit) over
// the age's old run duration, so the RC-033 economy balance carries over and there is no
// camp-forever income now that the timer is gone: the map IS the budget.

import { BiomeDef, EnemyDef, Resource, RESOURCES } from '../game/types';
import { Rng, rngInt } from './rng';
import { DungeonLayout, WALL_THICKNESS, BARRIER_THICKNESS } from './dungeonGen';
import { spawnTableAt } from './spawnEscalation';
import { pickEnemy } from './expedition';
import { runDurationForTier } from '../game/config';

export const BASE_ENEMY_COUNT = 26;   // placed enemies at tier 0 ...
export const ENEMIES_PER_TIER = 8;    // ... plus this many per age tier
export const ENEMY_SAFE_RADIUS = 420; // no enemy placed this close to the start

export interface EnemyPlacement { id: string; x: number; y: number; isBoss?: boolean; }
export interface GemPlacement { x: number; y: number; resource: Resource; }

/** A resource id biased toward the biome's lean (every resource can appear). Pure twin of the old
 *  RunScene.biasedResource — the scene now delegates here. */
export function pickBiasedResource(rng: Rng, bias: Partial<Record<Resource, number>>): Resource {
  const weights = RESOURCES.map((r) => 0.5 + (bias[r] ?? 0));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < RESOURCES.length; i++) {
    roll -= weights[i];
    if (roll < 0) return RESOURCES[i];
  }
  return RESOURCES[RESOURCES.length - 1];
}

/** A random point inside the walls and outside every barrier band (margin-padded). */
function openPoint(rng: Rng, layout: DungeonLayout, margin: number): { x: number; y: number } {
  for (let tries = 0; tries < 60; tries++) {
    const x = rngInt(rng, WALL_THICKNESS + margin, layout.width - WALL_THICKNESS - margin);
    const y = rngInt(rng, WALL_THICKNESS + margin, layout.height - WALL_THICKNESS - margin);
    const inBand = layout.barriers.some((b) =>
      Math.abs((b.axis === 'v' ? x : y) - b.pos) <= BARRIER_THICKNESS / 2 + margin);
    if (!inBand) return { x, y };
  }
  return { x: layout.start.x, y: layout.start.y }; // statistically unreachable fallback
}

/**
 * Place the run's full enemy roster: BASE + PER_TIER x tier mobs drawn from the biome's spawn
 * table, escalated by DEPTH instead of time — the farther from the start, the more the mix shifts
 * toward tough/next-age enemies (distance plays the role elapsed-time used to). The apex mini-boss
 * (RC-019) guards the deepest sampled point. `trickleBiome` is the boss-free table the scene
 * already builds; registries are injected for testability.
 */
export function enemyPlacements(
  rng: Rng, layout: DungeonLayout, tier: number,
  trickleBiome: BiomeDef, bossId: string,
  biomes: Record<string, BiomeDef>, enemies: Record<string, EnemyDef>,
): EnemyPlacement[] {
  const out: EnemyPlacement[] = [];
  const total = BASE_ENEMY_COUNT + ENEMIES_PER_TIER * tier;
  const depthScale = Math.hypot(layout.width, layout.height) * 0.75;
  for (let i = 0; i < total; i++) {
    let x = 0, y = 0;
    for (let tries = 0; tries < 60; tries++) {
      ({ x, y } = openPoint(rng, layout, 60));
      if (Math.hypot(x - layout.start.x, y - layout.start.y) >= ENEMY_SAFE_RADIUS) break;
    }
    const progress = Math.min(1, Math.hypot(x - layout.start.x, y - layout.start.y) / depthScale);
    const table = spawnTableAt(trickleBiome, progress, biomes, enemies);
    out.push({ id: pickEnemy(table, rng), x, y });
  }
  out.push({ ...farthestOpenPoint(rng, layout), id: bossId, isBoss: true });
  return out;
}

/** Best-of-N sample for the point most distant from the start — the boss lair. */
function farthestOpenPoint(rng: Rng, layout: DungeonLayout): { x: number; y: number } {
  let best = { x: layout.width - WALL_THICKNESS - 140, y: layout.height / 2 };
  let bestD = -1;
  for (let i = 0; i < 24; i++) {
    const p = openPoint(rng, layout, 140);
    const d = Math.hypot(p.x - layout.start.x, p.y - layout.start.y);
    if (d > bestD) { bestD = d; best = p; }
  }
  return best;
}

/** Gem deposits scattered at generation, replacing the periodic faucets 1:1 in expected value. */
export function gemPlacements(
  rng: Rng, layout: DungeonLayout, tier: number, biome: BiomeDef,
): GemPlacement[] {
  const d = runDurationForTier(tier);
  const buckets: Array<{ resource: Resource | null; count: number }> = [
    { resource: 'exploration', count: Math.round((d / 4000) * (biome.resourceBias.exploration ?? 1)) },
    { resource: 'culture', count: Math.round((d / 5000) * (biome.resourceBias.culture ?? 1)) },
    { resource: null, count: Math.round(d / 2600) }, // null = biased roll per gem
  ];
  const out: GemPlacement[] = [];
  for (const bucket of buckets) {
    for (let i = 0; i < bucket.count; i++) {
      const { x, y } = openPoint(rng, layout, 40);
      out.push({ x, y, resource: bucket.resource ?? pickBiasedResource(rng, biome.resourceBias) });
    }
  }
  return out;
}
