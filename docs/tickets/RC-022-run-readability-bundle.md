# RC-022: Run readability bundle (HUD, draft cards, gems, projectiles)
**Status**: In Progress  **Priority**: P2  **Type**: Enhancement
**Created**: 2026-06-09

## Summary
Four small readability upgrades to the run scene, bundled: a real HUD (XP bar, weapon loadout,
kills), informative draft cards, gem visuals that scale with value, and distinct projectiles.

## Context
From the 2026-06-09 review (items B3, B4, B5, B6). Per `jeff-ui-design`: all run state visible at
once, no hidden information.

1. **HUD upgrade (B3)** — currently one line of text. Add: an XP progress bar (the single most
   important missing feedback — you can't see how close the next draft is), the 4 weapon slots as
   icons with level pips, and a kill counter. Keep it one dense top strip.
2. **Draft card upgrade (B4)** — cards are plain green rectangles. Add the weapon sprite, a
   one-line stat readout (damage / cooldown / behavior), what changes on a level-up option, and
   color-coding by option type; evolutions visually special (gold).
3. **Gem value readability (B5)** — with rc-017 gem values span 1→50 but all gems render alike.
   Scale gem size and add a glow tier by value so a jackpot looks like one. (Builds on rc-004's
   cosmetic tier shapes.)
4. **Projectile distinctness (B6)** — projectiles are faint specks. Bigger sprites, per-weapon-class
   color/trail, and a small muzzle flash, so the auto-fire you watch all run is watchable.

**Sequencing:** after rc-015 + rc-004 + rc-017 merge (touches weapons, gems, RunScene throughout).

## Acceptance Criteria
- [ ] XP progress bar, weapon-slot icons with levels, and kill count visible during runs
- [ ] Draft cards show sprite + stats + option type; evolution options visually distinct
- [ ] Gem render scales with value; high-value gems obvious at a glance
- [ ] Each weapon behavior class visually distinguishable in flight
- [ ] Unit tests for any new pure helpers (e.g. value→tier mapping); Playwright visual verify

## References
- Review session 2026-06-09 (items B3–B6)
- `src/scenes/RunScene.ts` (HUD, draft overlay, gems, projectiles), `src/run/weaponData.ts`, `src/art/`

## Update — 2026-06-10 (partial delivery on rc-017, pending merge)
- **B4 draft cards — PARTIAL:** rc-017 made cards two-line (bold title + a stat/effect description
  via `weaponStatText` / `weaponLevelGainText`, incl. what a level-up changes). Remaining: weapon
  **sprite** on the card, **color-coding by option type**, and **gold** evolution cards.
- **B5 gem value — PARTIAL:** value scaling shipped (`rewardValueForTier`). Remaining: visual
  **size/glow tier** so a jackpot looks like one.
- **B6 projectiles — PARTIAL:** *enemy* projectiles are now distinct (red/orange circles). Remaining:
  *player* projectile polish (bigger, per-class color/trail, muzzle flash).
- **B3 HUD — REMAINING in full:** XP progress bar, weapon-slot icons w/ level pips, kill counter.

## Update — 2026-06-10 (playtest note #13: draft overflow)
The level-up draft overlay overflows the bottom of the screen when `draftChoices` is high — a
culture/Writing/building-maximized build stacks `BASE_DRAFT_CHOICES + buildings + tradition ranks +
Writing(+1)` into more cards than fit. Fix the draft overlay layout so it never runs off-screen:
cap the visible option count (extra choices convert to rerolls), or make the overlay a responsive
scroll/grid that scales to the viewport. Lives in `RunScene` draft rendering. (RC-031's single-weapon
change reduces weapon options, partially mitigating but not fixing the root layout issue.)
