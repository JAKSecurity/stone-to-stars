# RC-022: Run readability bundle (HUD, draft cards, gems, projectiles)
**Status**: Open  **Priority**: P2  **Type**: Enhancement
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
