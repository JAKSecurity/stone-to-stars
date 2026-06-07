# RC-006: Data-driven weapon system
**Status**: Delivered  **Priority**: P1  **Type**: Feature
**Created**: 2026-06-07  **Resolved**: 2026-06-07
**Capability**: C3 (Content & ages)

## Resolution (2026-06-07)
Built via subagent-driven-development from
`docs/superpowers/plans/2026-06-06-rc006-data-driven-weapons.md`. `WeaponDef` catalog +
pure `weapons.ts` (slots/level/evolve/firing-params/blended-draft) with 22 new unit tests
(72 total green); `RunScene` rewired to per-weapon-cooldown firing + a blended level-up
draft. Two-stage reviews (spec + quality) per unit + a final holistic review, all passed.
Playwright-verified live: two weapons firing simultaneously (shot_club + shot_bronze,
distinct damages), weapon level-up raises damage (club 12→16), blended draft renders and a
trusted click applies + resumes + tracks ownedPerks, no NaN, all four resources farmed.
Evolution mechanism present but dormant (no `evolvesTo` content until RC-008). Deferred
follow-ups captured: retire unused `rollDraft` (RC-007); evolution catalog-integrity test +
`evolvesTo` content (RC-008); bullet `hitSet` perf + draft level label (RC-009).

## Summary
First foundation of the Iron slice. Replace `RunScene`'s hardcoded single-weapon firing
with a data-driven, multi-weapon system: a `WeaponDef` catalog, up to **4 equipped slots**
each firing on its own cooldown, a **civ-gated draftable pool** (start a run with the base
club, draft the rest), weapon **level-ups**, and a **perk-paired evolution mechanism**. No
content regression — club + bronze spear still work. Evolution *content* lands in RC-008;
this ticket ships the mechanism and unit-tests it with a fixture.

## Acceptance Criteria
- [x] `WeaponDef` type + catalog (club, bronze_spear) — `src/run/weaponData.ts`
- [x] Pure weapon logic — `src/run/weapons.ts` (slots/level/evolve/firing-params/draft-options), unit-tested
- [x] `RunScene` fires each equipped weapon on its own cooldown (data-driven), with pierce
- [x] Level-up draft offers a blend of new-weapon / weapon-level / perk / evolve options
- [x] All unit tests green (72); `npm run build` clean; live-verified via Playwright (no NaN-HP regression)

## References
- Plan: `docs/superpowers/plans/2026-06-06-rc006-data-driven-weapons.md`
- Spec: `docs/superpowers/specs/2026-06-06-iron-age-slice-design.md` §3a
- Decomposed from RC-005.
