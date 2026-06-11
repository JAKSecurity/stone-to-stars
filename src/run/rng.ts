// Seeded PRNG (mulberry32) for procedural dungeon generation (RC-034). Deterministic per seed so
// layouts are reproducible in tests and debuggable from a logged seed. Pure — no Phaser.

export type Rng = () => number;

/** mulberry32: tiny, fast, good-enough 32-bit PRNG. Returns values in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] inclusive (mirrors Phaser.Math.Between, but seeded). */
export function rngInt(rng: Rng, min: number, max: number): number {
  if (min > max) return min; // degenerate range: behave like Phaser.Math.Between
  return min + Math.floor(rng() * (max - min + 1));
}

/** Uniform pick from a non-empty array. */
export function rngPick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
