# RC-031: Weapon system redesign — meaningful build choices
**Status**: Delivered  **Priority**: P1  **Type**: Feature (design-heavy)
**Created**: 2026-06-10  **Scope expanded**: 2026-06-10

## Summary
The in-run weapon/upgrade loop is currently **stat-scaling on rails** — draft cards add flat
damage/fire-rate, weapons differ mostly by numbers, and rewards are interchangeable. Jeff's direction
(2026-06-10): redesign the weapon system so a run is about **meaningful, risk-bearing build choices**,
not number-go-up. The north-star feeling:

> "With *these* upgrade choices, and my available weapons (pre-determined by my civilization), I
> should go for **X build**."

This is a **design-heavy redesign**, not a rebalance. It needs a real brainstorm pass before any plan.

## Design intent (Jeff, 2026-06-10)
- **Different weapon behaviors**, not stat reskins — each weapon should play differently (the RC-015
  orbit/lob behaviors are a start; the catalog needs more genuinely distinct firing/movement patterns).
- **Power balancing** so weapons are sidegrades/tradeoffs, not a strict ladder where the newest is best.
- **Completely different rewards** — the draft/upgrade rewards themselves get redesigned, not just the
  weapons. Upgrades should carry **risk / tradeoffs** (give something up to gain something), so picks
  are decisions, not auto-accepts.
- **Build identity from the civ** — the weapons available in a run are pre-determined by the player's
  civilization/tech, so the meta-game (what you build between runs) sets up the in-run build space.
- **Inspirations to study:** Slay the Spire (card synergies, risk/reward relics, deck identity),
  Vampire Survivors (weapon evolutions, passive/weapon interplay, build archetypes), and
  **Ball x Pit** (breakout-roguelite — any two balls FUSE into a hybrid inheriting both behaviors;
  emergent synergy from combining simple pieces), and **Megabonk** (Jeff, 2026-06-11: "an excellent
  weapon differentiator" — every weapon has a distinct VERB and screen signature: orbiting rocks,
  fire trail behind your movement, lightning smites, black-hole pull, mines, homing missiles).
  The goal is **emergent synergy + commitment**, not linear stat upgrades — and weapons that READ
  distinctly on screen (visuals/effects are in scope).

## Components folded in (the original narrow scope, now part of the larger redesign)
- **#7 — one weapon at a time** (drop the 1-melee+1-ranged dual-wield) — likely still the right frame
  for build commitment, but revisit as part of the redesign (a single weapon + a deck of
  passives/synergies may be the model).
- **#4 — no weaker-weapon offers** — subsumed: with a real reward redesign, "weaker swap" offers
  shouldn't exist by construction.
- **#6 — piercing as its own powerup** (currently in RC-025) — an example of the kind of behavior-
  changing upgrade this redesign wants; reconcile with RC-025's perk-pool expansion.

## Current state (code map, for the redesign)
- `src/run/weapons.ts` — `MAX_WEAPON_SLOTS = 2`, melee/ranged split (`MELEE_IDS`, `weaponClass`),
  `addWeapon` swaps within class, `draftOptions` offers any unheld pool weapon as a swap +
  `levelWeapon` + `evolve` + perks. `weaponShot` resolves a def+level into firing numbers.
- `src/run/weaponData.ts` — the weapon catalog (`WeaponDef`: damage/count/spread/speed/cooldown,
  `behavior` ∈ straight/pierce/cone/orbit/lob, `levelScaling`, `evolvesTo`/`evolveRequiresPerk`).
- `src/run/draft.ts` — `PERKS` (flat additive: sharpen/rapid/swift/vigor/magnet) + `rollDraft`.
- `src/scenes/RunScene.ts` — fires weapons, applies perks, runs the draft overlay.
- Civ→run wiring: `RunModifiers.weapons` (the run's weapon pool) comes from techs/buildings
  (`computeRunModifiers`), so "civ determines available weapons" already has a hook.

## Open design questions (resolve in brainstorm)
- One weapon + a **deck of passive/synergy upgrades** (StS-like), or a small weapon set with
  evolutions (VS-like)? Or a hybrid?
- What does a **risk-bearing** upgrade look like here (e.g. "double fire rate but −50% range", "huge
  AoE but it can hurt you", "lose a weapon slot for a powerful relic")?
- How do civ choices (techs/traditions/buildings) **pre-shape** the available build space so the
  player can plan a build before the run?
- How do **rewards** change — are gems/XP still the currency, or do upgrades come from events/bosses
  (ties to RC-019 mini-boss jackpot, RC-026 POI events, RC-025 perk pool)?
- Backward-compat: this **resets** the weapon/perk data model — save-version bump to v4,
  **reset on bump** per RC-017 precedent (Jeff, 2026-06-11: no migration; manual save/load
  slots ticketed separately as RC-036).

## Acceptance Criteria (provisional — refine in spec)
- [ ] Weapons play **mechanically distinctly**, not as stat reskins; power is sidegrade-balanced
- [ ] Upgrade choices carry **tradeoffs/risk** and create legible **build archetypes**
- [ ] A run's available weapons/upgrades are shaped by the player's civ, enabling pre-run build intent
- [ ] Rewards redesigned to deliver upgrades meaningfully (draft + events/bosses)
- [ ] Pure logic unit-tested; Playwright live-verify the build loop end-to-end
- [ ] Save-version bump to v4 (reset on bump — no migration)

## References
- 2026-06-10 playtest notes (#4, #7) + 2026-06-10 weapon-redesign direction
- `src/run/weapons.ts`, `src/run/weaponData.ts`, `src/run/draft.ts`, `src/run/modifiers.ts`, `src/scenes/RunScene.ts`
- Related: RC-025 (perk pool — #6 pierce), RC-027 (starting-weapon choice), RC-019 (boss rewards),
  RC-026 (POI events), RC-015 (orbit/lob behaviors as a behavior-diversity precedent)
- Inspirations: Slay the Spire, Vampire Survivors, Ball x Pit (ball-fusion breakout-roguelite),
  Megabonk (weapon visual/verb differentiation)

## Resolution (2026-06-11)
Delivered as the **Forge & Fuse** system, merged to main (a50d2cf). Spec:
`docs/superpowers/specs/2026-06-11-rc-031-weapon-fusion-design.md`; plan (17 tasks, all executed
subagent-driven with two-stage review): `docs/superpowers/plans/2026-06-11-rc031-forge-and-fuse.md`.
Shipped: 10 verb archetypes over a component engine (trajectory/onHit), chain weapon fusion
(2 slots, 3-base cap, mini-boss catalysts, 55 authored hybrid names), tradeoff-only passives
(2 slots + 4 authored rare fusions), Expedition Kit pre-run picker (kit = the run's draft pool),
tech-unlocked right-click actives (net/poison gas/grenade volley), per-archetype VFX kits + hit
juice, save v4 (reset on bump). 288 vitest green; Playwright E2E verified the full
kit -> draft -> fuse -> active -> re-fuse -> clear loop. Folded playtest #4 (no weaker offers,
by construction) and #7 (slot commitment via fusion); #6 pierce dissolved into the component
model (RC-025 scope note). Deferred: damage-number pooling (perf, if profiling warrants),
draft tradeoff-row overflow clamp (noted on RC-022), soft passive tradeoffs balance note (RC-009).
