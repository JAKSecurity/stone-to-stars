import { describe, it, expect } from 'vitest';
import { draftOptions, rollDraft, DraftContext } from '../src/run/draft';
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
