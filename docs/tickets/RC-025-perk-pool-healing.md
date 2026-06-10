# RC-025: Perk pool expansion + healing pickups
**Status**: Open  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-09

## Summary
Only 5 perks exist, so level-up drafts repeat almost immediately; and the only heal in the game is
Vigor's one-time top-up, so early damage is a slow death spiral. Add ~6–8 data-only perks and a
rare healing pickup.

## Context
From the 2026-06-09 review (items A3, A4).

**Perks** — current pool: Sharpen, Rapid Fire, Swift, Vigor, Magnet (`src/run/draft.ts`).
Candidate additions (all map onto existing or trivially-added `RunStats` fields):
crit chance, projectile speed, armor (flat contact-damage reduction), +XP gain, +gem value,
thorns (contact damage back), cooldown-on-kill, larger projectiles. Pick a set that keeps each
draft offering meaningfully different builds. Note `RunBonus` already declares
`fireRateMult`/`moveSpeedMult`/`pickupRadius` that techs/buildings never use — consider letting
1–2 new techs/buildings tap them for civ↔run synergy.

**Healing** — a rare food/medkit drop (small % on kill, or from resource deposits), restoring a
modest flat amount; mini-boss kill could guarantee one once RC-019 lands. Needs distinct sprite
(art-ratification gate) or reuse of an existing gem shape recolored.

## Acceptance Criteria
- [ ] Perk pool ≥ 11 total; all data-driven in `draft.ts`; each has a one-line description in the card
- [ ] New stat fields wired through `RunStats` and applied in `RunScene`
- [ ] Healing pickup drops rarely, heals on contact, capped at max HP
- [ ] Drafts visibly more varied (no immediate repeats with default 3 choices)
- [ ] Unit tests for each new perk effect + healing logic; Playwright spot-check

## References
- Review session 2026-06-09 (items A3, A4)
- `src/run/draft.ts`, `src/run/runStats.ts`, `src/scenes/RunScene.ts`
