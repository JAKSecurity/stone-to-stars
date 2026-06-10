# RC-023: Civ screen information density
**Status**: Open  **Priority**: P2  **Type**: Enhancement
**Created**: 2026-06-09

## Summary
The civ screen hides the most decision-relevant information: tech rows show name + cost but not
what a tech does; building cards omit yields; the runs counter is saved but shown nowhere. Surface
everything inline and organize the tech list by age.

## Context
From the 2026-06-09 review (items C1, C2, C3, C5). Per `jeff-ui-design` (inline descriptions,
density is a feature):

1. **Tech effect lines (C1)** — each row gets an inline effect summary: what it unlocks
   ("Unlocks Forge"), grants ("+10% dmg", "Bronze Spear", "+1 draft"), and gates
   ("Gates Bronze Age"). Gate techs visually distinct. Also distinguish *missing prerequisite*
   (show the prereq name) from *can't afford* (show the shortfall) — both currently render as the
   same disabled button.
2. **Age-grouped tech grid (C2)** — reorganize the flat 30-row list into an age-per-column grid
   (or age-sectioned rows), everything still visible with zero interaction; prerequisites implied
   by position. Must scale to a future Space Age column.
3. **Building yields on cards (C3)** — palette cards show the run bonus only; the per-run resource
   yield is half a building's value and is invisible everywhere. Show both:
   "4🏭/run · +10% dmg · War Hammer". Same for placed-building upgrade affordances.
4. **Civilization record strip (C5)** — `runs` is persisted but never displayed. Add a small stats
   row: expeditions completed, total resources earned (needs a lifetime tally added to save),
   current age as "Age N of 8".

## Acceptance Criteria
- [ ] Every tech row shows effects + unlocks + age-gate inline; gate techs visually distinct
- [ ] Blocked-by-prereq vs can't-afford are distinguishable at a glance
- [ ] Tech list grouped by age, all techs still simultaneously visible (no tabs/collapse)
- [ ] Building cards and placed tiles show yield + run bonus together
- [ ] Record strip shows runs / lifetime resources / age progress (save schema addition if needed)
- [ ] Unit tests for new pure formatters; Playwright visual verify

## References
- Review session 2026-06-09 (items C1, C2, C3, C5)
- `src/ui/civScreen.ts`, `src/tech/techData.ts`, `src/camp/camp.ts` (`buildingEffectText`), `src/state/`

## Update — 2026-06-10 (substantially delivered on rc-017, pending merge)
- **C1 tech effect lines — DONE:** every tech row now shows inline effects incl. unlocked-building
  summary ("Pottery — Unlocks Granary (+60🎭/run · +25 HP)"), run bonuses, and "Advances to X Age";
  missing-prereq ("Requires Mining") is distinguished from can't-afford ("need 18 more").
- **C3 building yields — DONE:** palette cards and the new "Your Buildings" upgrade list show
  per-run yield + run bonus together; cost shown inline with shortfall.
- **C5 record strip — PARTIAL:** current age is shown in the resource bar; **remaining** = runs
  counter, lifetime-resources tally (save-schema addition), and "Age N of 8" framing.
- **C2 age-grouped tech grid — REMAINING:** the list is still flat; group by age (column/section).

Net remaining: **C2** (age-grouped grid) + **C5** (runs / lifetime / N-of-8).
