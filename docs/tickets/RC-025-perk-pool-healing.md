# RC-025: Perk pool expansion + healing pickups
**Status**: Delivered  **Priority**: P2  **Type**: Feature
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

**Piercing perk (playtest note #6, 2026-06-10).** Pierce is currently a weapon-only property
(`WeaponDef.pierce`, resolved in `weaponShot`); make it a draftable perk that grants +1 pierce to the
held weapon's shots (stackable, optional cap). New mechanic: `RunStats`/perk-applied pierce bonus must
be added on top of the weapon's base pierce wherever shots are built in `RunScene`. Pairs with RC-031
(single-weapon run) — pierce becomes a build-defining pick for your one weapon.

**Healing** — a rare food/medkit drop (small % on kill, or from resource deposits), restoring a
modest flat amount; mini-boss kill could guarantee one once RC-019 lands. Needs distinct sprite
(art-ratification gate) or reuse of an existing gem shape recolored.

## Acceptance Criteria
- [ ] Perk pool ≥ 11 total; all data-driven in `draft.ts`; each has a one-line description in the card
- [ ] New stat fields wired through `RunStats` and applied in `RunScene`
- [ ] Healing pickup drops rarely, heals on contact, capped at max HP
- [ ] Drafts visibly more varied (no immediate repeats with default 3 choices)
- [ ] Unit tests for each new perk effect + healing logic; Playwright spot-check

## Resolution (2026-06-12)
Re-scoped and delivered as **Relics + two-layer healing** — the original perk-pool framing
predated RC-031 Forge & Fuse (which replaced perks with sidegrade passives and dissolved
pierce into the weapon component model). Ratified spec:
`docs/superpowers/specs/2026-06-12-rc-025-relics-healing-design.md`; plan:
`docs/superpowers/plans/2026-06-12-rc-025-relics-healing.md`.

Shipped:
- **6 relics** (pure-upside mechanics, tech/tradition-gated): Blood Rush (hunting),
  Bramble Mail (bronze_working), Prospector's Eye (currency), Second Wind (masonry),
  Overcharge (electricity), Harvest Feast (vigor tradition rank 3). Dedicated relic-only
  third slot; weight-1 purple draft cards while the slot is empty; one relic per run.
- **Healing layer A**: 2% on-kill food drop, 5 HP heal (Feast: 6%/10 HP); `food_ration`
  sprite ships pending in-game art ratification.
- **Healing layer B**: all regenHps healing draws from a 25%-of-current-maxHp lifetime
  budget per run; field_medic/heartwood card text discloses the cap.
- 21 new vitest cases (431 total green); Playwright walkthrough verified draft cards,
  slot/HUD, food heal, regen cap, and civ-screen unlock lines live.

Economy watch: Prospector's Eye interacts with the standing RC-009 gem-value lever —
observe in the next playtest.

Art: `food_ration` sprite **ratified by Jeff 2026-06-12** (via the art-ratify page).

Playtest watch list (final-review minors, none blocking):
- Overcharge timer accrues/resets while fully charged — a full-charge player loses partial
  refund windows; alternative is holding the timer at cap until a charge is spent (tuning feel)
- Food pickups aren't swept by the Zone-Cleared ceremony vacuum (gems are) — cosmetic asymmetry
- Tradition card still reads "Rank 3: unlocks relic …" after the unlock — could flip to an
  "unlocked" state (cosmetic)

## References
- Review session 2026-06-09 (items A3, A4)
- `src/run/draft.ts`, `src/run/runStats.ts`, `src/scenes/RunScene.ts`
