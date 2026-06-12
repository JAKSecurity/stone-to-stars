import { EquippedPassive, WeaponDef } from '../game/types';
import { EquippedWeapon, defOf } from './weapons';
import { WEAPONS } from './weaponData';
import { canFuse } from './fusion';
import { MAX_PASSIVE_SLOTS, passiveDefOf, fusePassives } from './passives';
import { PASSIVES } from './passiveData';
import { RELICS } from './relicData';

// RC-031 draft v2 (spec §4): fusion offers lead; everything else is a weighted sidegrade mix.
// No strictly-weaker offers by construction — the kit is player-chosen and same-age weapons
// are budget sidegrades, so swaps are lateral.

export type DraftOption =
  | { kind: 'fuseWeapons'; early: boolean }
  | { kind: 'fusePassives' }
  | { kind: 'newWeapon'; weaponId: string; replaceId?: string }
  | { kind: 'levelWeapon'; weaponId: string }
  | { kind: 'newPassive'; passiveId: string }
  | { kind: 'levelPassive'; passiveId: string }
  | { kind: 'newRelic'; relicId: string };

export interface DraftContext {
  equipped: EquippedWeapon[];
  passives: EquippedPassive[];
  kitPool: string[];   // Expedition Kit weapon ids (RunModifiers.weapons)
  catalysts: number;   // held fusion catalysts (mini-boss drops)
  defs?: Record<string, WeaponDef>; // injectable for tests
  relicPool?: string[]; // RC-025: relic ids the civ has unlocked (mods.relics)
  relic?: string | null;// RC-025: relic currently held this run (slot is single)
}

const ROLL_WEIGHT: Record<DraftOption['kind'], number> = {
  fuseWeapons: 0, fusePassives: 0, // pinned, never rolled
  levelWeapon: 3, newWeapon: 2, newPassive: 2, levelPassive: 2, newRelic: 1,
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
  // RC-025 relics: offered only while the (single) relic slot is empty.
  if (!ctx.relic) {
    for (const id of ctx.relicPool ?? []) {
      if (RELICS[id]) opts.push({ kind: 'newRelic', relicId: id });
    }
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

// --- RC-022 #13: responsive draft-overlay layout (pure math, unit-tested) ---

/** One card slot's screen position + size. x/y are the card CENTER. */
export interface DraftSlot { x: number; y: number; w: number; h: number; }

export interface DraftLayout {
  columns: 1 | 2;
  cardW: number;
  cardH: number;
  pitch: number;      // vertical center-to-center spacing within a column
  slots: DraftSlot[]; // one per option, in option order (col-major fill: down col 1, then col 2)
  titleY: number;     // y of the "choose one" title
  rerollY: number;    // y for the reroll button (always below the grid, on-screen)
}

// Layout constants — the historical single-column card was 460×54 at a 64px pitch.
const CARD_W = 460;
const FULL_CARD_H = 54;
const FULL_PITCH = 64;
const MIN_PITCH = 40;        // floor when a 1-col layout must shrink to fit a tiny viewport
const GRID_VFRAC = 0.70;     // grid may use up to this fraction of viewport height before going 2-col
const COL_GAP = 32;          // horizontal gap between the two columns
const TITLE_GAP = 28;        // gap between the title and the first row
const REROLL_GAP = 20;       // gap between the last row and the reroll button

/**
 * Compute the draft overlay layout so it never overflows the viewport, at any option count.
 * Strategy:
 *   1. Try a single column at the full 64px pitch.
 *   2. If that column's height exceeds GRID_VFRAC of the viewport AND two columns fit horizontally
 *      (viewport wide enough for 2×card + gap), split into 2 columns (balanced, col-major fill).
 *   3. If still too tall (or 2 columns don't fit horizontally), shrink the pitch toward MIN_PITCH
 *      until the grid fits the available vertical band.
 * All returned slot rects sit fully within [0,viewportW] × [0,viewportH].
 */
export function draftLayout(count: number, viewportW: number, viewportH: number): DraftLayout {
  const cardW = Math.min(CARD_W, viewportW - 24); // never wider than the viewport (tiny canvases)
  const cardH = FULL_CARD_H;

  // Can two columns fit side by side?
  const twoColFits = viewportW >= 2 * cardW + COL_GAP;

  // Decide column count: go 2-col only when 1-col would overflow GRID_VFRAC and 2 columns fit.
  const oneColHeight = count * FULL_PITCH;
  const columns: 1 | 2 = (oneColHeight > viewportH * GRID_VFRAC && twoColFits && count > 1) ? 2 : 1;

  const rowsPerCol = Math.ceil(count / columns);

  // Vertical budget for the grid; pitch shrinks (floored at MIN_PITCH) if rowsPerCol overflow it.
  const vBudget = viewportH * GRID_VFRAC;
  let pitch = FULL_PITCH;
  if (rowsPerCol * FULL_PITCH > vBudget) {
    pitch = Math.max(MIN_PITCH, vBudget / rowsPerCol);
  }

  const gridH = rowsPerCol * pitch;
  // Center the grid vertically, then derive title/reroll from its top/bottom edges.
  const gridTop = (viewportH - gridH) / 2;
  const firstRowCenter = gridTop + pitch / 2;

  const colCenters = columns === 1
    ? [viewportW / 2]
    : [viewportW / 2 - (cardW + COL_GAP) / 2, viewportW / 2 + (cardW + COL_GAP) / 2];

  const slots: DraftSlot[] = [];
  for (let i = 0; i < count; i++) {
    const col = Math.floor(i / rowsPerCol); // col-major: fill column 0 fully, then column 1
    const row = i % rowsPerCol;
    slots.push({
      x: colCenters[Math.min(col, colCenters.length - 1)],
      y: firstRowCenter + row * pitch,
      w: cardW,
      h: Math.min(cardH, pitch - 6), // never taller than the pitch (no overlap when shrunk)
    });
  }

  const titleY = Math.max(16, gridTop - TITLE_GAP);
  const rerollY = Math.min(viewportH - 28, gridTop + gridH + REROLL_GAP);

  return { columns, cardW, cardH: Math.min(cardH, pitch - 6), pitch, slots, titleY, rerollY };
}
