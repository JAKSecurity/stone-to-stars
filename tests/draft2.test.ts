import { describe, it, expect } from 'vitest';
import { draftOptions, rollDraft, DraftContext, draftLayout } from '../src/run/draft';
import { WEAPONS } from '../src/run/weaponData';
import { fuseWeapons } from '../src/run/fusion';

const ctx = (over: Partial<DraftContext>): DraftContext => ({
  equipped: [{ id: 'club', level: 1 }],
  passives: [],
  kitPool: ['club', 'bronze_spear', 'gladius', 'javelin'],
  catalysts: 0,
  ...over,
});

describe('draft v2', () => {
  it('offers fusion FIRST when both weapons are maxed', () => {
    const c = ctx({ equipped: [{ id: 'club', level: 2 }, { id: 'bronze_spear', level: 2 }] });
    const opts = draftOptions(c);
    expect(opts[0]).toEqual({ kind: 'fuseWeapons', early: false });
  });

  it('offers EARLY fusion when a catalyst is held and weapons are not maxed', () => {
    const c = ctx({
      equipped: [{ id: 'club', level: 1 }, { id: 'bronze_spear', level: 1 }], catalysts: 1,
    });
    expect(draftOptions(c)[0]).toEqual({ kind: 'fuseWeapons', early: true });
  });

  it('no fusion offer with one weapon, or when bases would exceed the cap', () => {
    expect(draftOptions(ctx({})).some((o) => o.kind === 'fuseWeapons')).toBe(false);
    const triple = fuseWeapons(
      { def: fuseWeapons({ def: WEAPONS.club, level: 2 }, { def: WEAPONS.bronze_spear, level: 2 }), level: 1 },
      { def: WEAPONS.sawblade, level: 1 },
    );
    const c = ctx({ equipped: [
      { id: triple.id, level: triple.maxLevel, hybrid: triple },
      { id: 'gladius', level: 3 },
    ]});
    // 3 bases + gladius's 1 = over MAX_BASES → no offer even though both are maxed
    expect(draftOptions(c).some((o) => o.kind === 'fuseWeapons')).toBe(false);
  });

  it('newWeapon offers only kit weapons; swap variants name the replaced weapon', () => {
    const c = ctx({ equipped: [{ id: 'club', level: 1 }, { id: 'bronze_spear', level: 1 }] });
    const news = draftOptions(c).filter((o) => o.kind === 'newWeapon') as any[];
    for (const o of news) {
      expect(c.kitPool).toContain(o.weaponId);
      expect(['club', 'bronze_spear']).toContain(o.replaceId); // both slots full ⇒ swaps only
    }
  });

  it('rollDraft pins an eligible fusion as the first card and never duplicates options', () => {
    const c = ctx({ equipped: [{ id: 'club', level: 2 }, { id: 'bronze_spear', level: 2 }] });
    const picks = rollDraft(() => 0.42, 3, c);
    expect(picks[0].kind).toBe('fuseWeapons');
    expect(new Set(picks.map((p) => JSON.stringify(p))).size).toBe(picks.length);
  });

  it('passive offers respect slots and maxLevel', () => {
    const c = ctx({ passives: [{ id: 'whetstone', level: 3 }, { id: 'oxhide', level: 1 }] });
    const opts = draftOptions(c);
    expect(opts.some((o) => o.kind === 'newPassive')).toBe(false);      // slots full
    expect(opts.some((o) => o.kind === 'levelPassive' && (o as any).passiveId === 'whetstone')).toBe(false); // maxed
    expect(opts.some((o) => o.kind === 'levelPassive' && (o as any).passiveId === 'oxhide')).toBe(true);
  });
});

describe('draftLayout (RC-022 #13 responsive overlay)', () => {
  // A typical desktop canvas.
  const W = 1280, H = 720;

  const allOnScreen = (lay: ReturnType<typeof draftLayout>, vw: number, vh: number) => {
    for (const s of lay.slots) {
      expect(s.x - s.w / 2).toBeGreaterThanOrEqual(0);
      expect(s.x + s.w / 2).toBeLessThanOrEqual(vw);
      expect(s.y - s.h / 2).toBeGreaterThanOrEqual(0);
      expect(s.y + s.h / 2).toBeLessThanOrEqual(vh);
    }
    expect(lay.titleY).toBeGreaterThanOrEqual(0);
    expect(lay.rerollY).toBeLessThanOrEqual(vh);
    // Title above the first row; reroll below the last row.
    expect(lay.titleY).toBeLessThan(lay.slots[0].y);
    expect(lay.rerollY).toBeGreaterThan(lay.slots[lay.slots.length - 1].y);
  };

  it('3 options stay single-column at full pitch', () => {
    const lay = draftLayout(3, W, H);
    expect(lay.columns).toBe(1);
    expect(lay.pitch).toBe(64);
    expect(lay.slots).toHaveLength(3);
    allOnScreen(lay, W, H);
  });

  it('8 options split into 2 columns on a wide viewport', () => {
    const lay = draftLayout(8, W, H);
    expect(lay.columns).toBe(2);
    expect(lay.slots).toHaveLength(8);
    // col-major fill: first 4 in column 0, last 4 in column 1
    expect(lay.slots[0].x).toBeLessThan(lay.slots[4].x);
    expect(lay.slots[0].x).toBe(lay.slots[3].x);
    expect(lay.slots[4].x).toBe(lay.slots[7].x);
    allOnScreen(lay, W, H);
  });

  it('10 options stay on-screen (2 columns, possibly shrunk pitch)', () => {
    const lay = draftLayout(10, W, H);
    expect(lay.slots).toHaveLength(10);
    allOnScreen(lay, W, H);
  });

  it('5 and 7 options both stay fully on-screen', () => {
    allOnScreen(draftLayout(5, W, H), W, H);
    allOnScreen(draftLayout(7, W, H), W, H);
  });

  it('a tiny viewport (too narrow for 2 columns) shrinks the pitch instead', () => {
    const vw = 700, vh = 500; // < 2×(460..676) → single column forced; many cards → shrink
    const lay = draftLayout(9, vw, vh);
    expect(lay.columns).toBe(1);
    expect(lay.pitch).toBeLessThan(64);
    expect(lay.pitch).toBeGreaterThanOrEqual(40);
    allOnScreen(lay, vw, vh);
  });

  it('clamps card width on a narrow viewport so cards never exceed bounds', () => {
    const vw = 420, vh = 700;
    const lay = draftLayout(4, vw, vh);
    expect(lay.cardW).toBeLessThanOrEqual(vw - 24);
    allOnScreen(lay, vw, vh);
  });
});
