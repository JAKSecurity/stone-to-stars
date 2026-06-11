import { EquippedPassive, WeaponDef } from '../game/types';
import { EquippedWeapon, defOf } from './weapons';
import { WEAPONS } from './weaponData';
import { canFuse } from './fusion';
import { MAX_PASSIVE_SLOTS, passiveDefOf, fusePassives } from './passives';
import { PASSIVES } from './passiveData';

// RC-031 draft v2 (spec §4): fusion offers lead; everything else is a weighted sidegrade mix.
// No strictly-weaker offers by construction — the kit is player-chosen and same-age weapons
// are budget sidegrades, so swaps are lateral.

export type DraftOption =
  | { kind: 'fuseWeapons'; early: boolean }
  | { kind: 'fusePassives' }
  | { kind: 'newWeapon'; weaponId: string; replaceId?: string }
  | { kind: 'levelWeapon'; weaponId: string }
  | { kind: 'newPassive'; passiveId: string }
  | { kind: 'levelPassive'; passiveId: string };

export interface DraftContext {
  equipped: EquippedWeapon[];
  passives: EquippedPassive[];
  kitPool: string[];   // Expedition Kit weapon ids (RunModifiers.weapons)
  catalysts: number;   // held fusion catalysts (mini-boss drops)
  defs?: Record<string, WeaponDef>; // injectable for tests
}

const ROLL_WEIGHT: Record<DraftOption['kind'], number> = {
  fuseWeapons: 0, fusePassives: 0, // pinned, never rolled
  levelWeapon: 3, newWeapon: 2, newPassive: 2, levelPassive: 2,
};

/** All currently-valid options. Pinned fusion offers (if any) come first, in order. */
export function draftOptions(ctx: DraftContext): DraftOption[] {
  const defs = ctx.defs ?? WEAPONS;
  const opts: DraftOption[] = [];

  // Weapon fusion: both slots held, bases within cap, and (both maxed | catalyst in hand).
  if (ctx.equipped.length === 2) {
    const [a, b] = ctx.equipped.map((w) => defOf(w, defs));
    if (canFuse(a, b)) {
      const bothMaxed = ctx.equipped.every((w) => w.level >= defOf(w, defs).maxLevel);
      if (bothMaxed) opts.push({ kind: 'fuseWeapons', early: false });
      else if (ctx.catalysts > 0) opts.push({ kind: 'fuseWeapons', early: true });
    }
  }
  // Passive fusion (rare by construction: needs both maxed AND an authored pair).
  if (fusePassives(ctx.passives)) opts.push({ kind: 'fusePassives' });

  // New/swap weapons from the kit.
  for (const id of ctx.kitPool) {
    if (ctx.equipped.some((w) => w.id === id)) continue;
    if (!defs[id]) continue;
    if (ctx.equipped.length < 2) opts.push({ kind: 'newWeapon', weaponId: id });
    else for (const held of ctx.equipped) {
      opts.push({ kind: 'newWeapon', weaponId: id, replaceId: held.id });
    }
  }
  // Level-ups.
  for (const w of ctx.equipped) {
    if (w.level < defOf(w, defs).maxLevel) opts.push({ kind: 'levelWeapon', weaponId: w.id });
  }
  // Passives.
  if (ctx.passives.length < MAX_PASSIVE_SLOTS) {
    for (const id of Object.keys(PASSIVES)) {
      if (!ctx.passives.some((p) => p.id === id)) opts.push({ kind: 'newPassive', passiveId: id });
    }
  }
  for (const p of ctx.passives) {
    if (p.level < passiveDefOf(p).maxLevel) opts.push({ kind: 'levelPassive', passiveId: p.id });
  }
  return opts;
}

/** Roll `count` cards: pinned fusion offers always lead; the rest are weight-rolled, no dupes. */
export function rollDraft(rng: () => number, count: number, ctx: DraftContext): DraftOption[] {
  const all = draftOptions(ctx);
  const pinned: DraftOption[] = all.filter((o) => o.kind === 'fuseWeapons' || o.kind === 'fusePassives');
  const pool = all.filter((o) => !pinned.includes(o));
  const out: DraftOption[] = [...pinned].slice(0, count);
  while (out.length < count && pool.length > 0) {
    const total = pool.reduce((s, o) => s + ROLL_WEIGHT[o.kind], 0);
    if (total <= 0) break;
    let r = rng() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= ROLL_WEIGHT[pool[i].kind];
      if (r <= 0) { idx = i; break; }
    }
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}
