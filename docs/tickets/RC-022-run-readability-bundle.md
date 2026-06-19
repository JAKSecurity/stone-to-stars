# RC-022: Run readability bundle (HUD, draft cards, gems, projectiles)
**Status**: Delivered  **Priority**: P2  **Type**: Enhancement
**Created**: 2026-06-09  **Closed**: 2026-06-19

## Resolution
Closed 2026-06-19 as satisfied-via-playtest. The readability upgrades (HUD with XP bar +
loadout, informative draft cards, value-scaled gems, distinct projectiles) shipped over the
content arc; run readability reads as good to Jeff after extensive play through the public
release. Remaining polish, if any surfaces, gets fresh tickets.

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

## Note from RC-031 review (2026-06-11)
- Draft-card tradeoff rows (`tradeoffSegments`, RunScene) have no overflow clamp: a 3-segment
  fused-passive desc can exceed the 460px card width at small canvas sizes. Fold a measure-and-
  shrink (or wrap) into this ticket's draft-card readability scope. Same for long swap stat rows
  (`current -> offered`).

## Update — 2026-06-11 (mechanical remainder delivered)
The mechanical remainder of the bundle is now in (RC-031 had already shipped the loadout line, kit
tints, gold fusion cards, and tradeoff color-coding). Delivered this pass:

- **B3 HUD strip — DELIVERED.** A thin 220×8 XP-progress bar sits under the two HUD lines,
  screen-fixed, fill = progress to the next level. Reuses a new pure `xpProgress(stats)` helper in
  `runStats.ts` (built on the existing `xpForLevel`, no duplicated formula; unit-tested). A per-run
  `kills` counter increments on the damage-death path in `applyDamageToEnemy` (NOT the ceremony
  wipe), resets in `init()`, and shows in the HUD line as `☠ N`. (Weapon-slot icons with level pips
  remain as text — `Club L1 | …` — per the RC-031 loadout line; pictographic slot icons are the one
  subjective-polish item left, see below.)
- **#13 draft overflow — DELIVERED.** Extracted a pure `draftLayout(count, vw, vh)` helper into
  `draft.ts` (unit-tested: 3 opts 1-col, 8 opts 2-col, 10 opts on-screen, tiny viewport shrinks
  pitch, all slots within bounds). `renderDraft` now drives card positions/size from it: single
  column at full pitch → 2 columns when a column would exceed 70% viewport height (and 2 cards fit
  horizontally) → shrink pitch toward a 40px floor otherwise. Title above, reroll always below the
  grid. Verified live on-screen at 5/7/10 options.
- **#3 tradeoff/swap overflow clamp — DELIVERED.** `tradeoffSegments` measures the built row and, if
  it exceeds card width − 24, rebuilds at a proportionally smaller font (9px floor). A new
  `clampTextWidth` does the same for long single-line swap stat rows (`current → offered`).
- **B5 gem value visibility — DELIVERED.** Added pure `gemValueTier` / `gemDisplayScale` to
  `gemTier.ts` (unit-tested). Gem display size scales ×1.0 / ×1.25 / ×1.55 by value tier, and
  top-tier (`major`) gems get a soft additive gem-colored glow circle behind them (alpha ~0.3, gentle
  pulse) — the boss jackpot's big gem is now unmistakable. Glow rides along during the magnet sweep
  and is torn down with its gem.
- **B6 muzzle flash — DELIVERED.** A small additive flash in the weapon's kit tint fires at the
  muzzle when a projectile volley launches (straight/spread/chain/boomerang/homing — orbit/trail/lob
  excluded), alpha-out over ~80ms, self-destroying, throttled to ≥90ms between flashes (spam guard).

Verification: 338 vitest green (326 baseline + 12 new pure tests across runStats/gemTier/draft);
`npm run build` green. Live Playwright pass confirmed the HUD strip (XP bar partial after kills,
`☠` counter), 7- and 10-option drafts fully on-screen (10 splits to 2 columns), a top-tier gem
glowing next to a basic one (value 40 / w43 with glow vs value 3 / w28 no glow), and muzzle flashes
during auto-fire.

## Update — 2026-06-11 (playtest bug fix: gem value tier relative thresholds)
Fixed a regression found during playtest: `gemValueTier` used absolute thresholds (`solid ≥ 4`,
`major ≥ 10`) but gem values scale as `rewardValueForTier(tier)` ≈ INCOME_G^tier × REWARD_MULT.
At tier ≥ 2 the base reward already exceeds 10, so every ordinary drop hit `major` — the entire
map glowed and jackpots no longer stood out.

Fix: `gemValueTier(value, tier)` now computes `base = rewardValueForTier(tier)` and applies
relative thresholds: `minor` (< 2×base), `solid` (< 3×base), `major` (≥ 3×base). `gemDisplayScale`
takes the same `tier` arg. Both RunScene call sites (`dropGem` size and glow check) updated.
Tests rewritten to assert the relative spec and include an explicit regression case — "a normal kill
drop (1×base) is minor at BOTH tier 0 and tier 4". 362 vitest green, build green.

### Remaining on RC-022 (subjective polish only)
- **B3 weapon-slot ICONS:** weapon slots are still rendered as text (`Name Lv`), not pictographic
  icons-with-pips. Functional readability is met; sprite-icon slots are a cosmetic upgrade.
- **B4 weapon SPRITE on draft cards:** cards show title + stat readout + color-coding + gold
  evolutions, but not the weapon's sprite thumbnail. Subjective polish.
- **B6 per-class projectile sprites/trails:** projectiles are tinted per verb (RC-031 kits) and now
  have a muzzle flash, but bespoke per-class sprites / motion trails are an art-polish item.
