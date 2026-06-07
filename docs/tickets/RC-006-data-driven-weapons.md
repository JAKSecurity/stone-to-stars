# RC-006: Data-driven weapon system
**Status**: Open  **Priority**: P1  **Type**: Feature
**Created**: 2026-06-07
**Capability**: C3 (Content & ages)

## Summary
First foundation of the Iron slice. Replace `RunScene`'s hardcoded single-weapon firing
with a data-driven, multi-weapon system: a `WeaponDef` catalog, up to **4 equipped slots**
each firing on its own cooldown, a **civ-gated draftable pool** (start a run with the base
club, draft the rest), weapon **level-ups**, and a **perk-paired evolution mechanism**. No
content regression — club + bronze spear still work. Evolution *content* lands in RC-008;
this ticket ships the mechanism and unit-tests it with a fixture.

## Acceptance Criteria
- [ ] `WeaponDef` type + catalog (club, bronze_spear) — `src/run/weaponData.ts`
- [ ] Pure weapon logic — `src/run/weapons.ts` (slots/level/evolve/firing-params/draft-options), unit-tested
- [ ] `RunScene` fires each equipped weapon on its own cooldown (data-driven), with pierce
- [ ] Level-up draft offers a blend of new-weapon / weapon-level / perk / evolve options
- [ ] All unit tests green; `npm run build` clean; live-verified via Playwright (no NaN-HP regression)

## References
- Plan: `docs/superpowers/plans/2026-06-06-rc006-data-driven-weapons.md`
- Spec: `docs/superpowers/specs/2026-06-06-iron-age-slice-design.md` §3a
- Decomposed from RC-005.
