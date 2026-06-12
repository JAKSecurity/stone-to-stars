# RC-025 Re-scope: Relics (rare passives) + Two-Layer Healing

**Date:** 2026-06-12
**Ticket:** RC-025 (perk pool + healing)
**Status:** Design ratified in re-scope session with Jeff; supersedes the original RC-025 ticket text.

## Why the re-scope

The original RC-025 (written 2026-06-09) targeted a world that RC-031 Forge & Fuse dissolved:

- The 5-perk stacking pool in `draft.ts` was replaced by 8 universal sidegrade passives
  (2 slots, authored fusions). Every universal passive has a positive AND a negative axis.
- Pierce-as-a-perk dissolved into the weapon component model (`WeaponDef`/archetypes).
- Vigor's one-time heal is gone; the only healing left is `field_medic` regen
  (0.2 HP/s per level after the 2026-06-11 −75% playtest nerf) and its `heartwood` fusion.
- `passiveData.ts` already reserves this ticket's territory: "tech/tradition-gated rares
  are RC-025's future home."

## Decisions (ratified 2026-06-12)

1. **Rare shape:** mix — each rare is a *new mechanic* AND *pure upside* (the only
   passives exempt from the sidegrade rule, exempt because civ investment earned it).
   Small pool: 6, each thematically tied to its unlocking tech/tradition.
2. **Acquisition:** dedicated third "relic" slot; rares appear as low-weight draft cards.
3. **Healing:** two layers — a stingy ambient food drop as a floor, plus a healing relic
   that amplifies it.
4. **Gating:** mix, theme-first — five techs across five ages + one tradition rank.
5. **Pickup art:** new procedural sprite in the house style; Jeff ratifies in-game during
   the playtest pass (same flow as RC-026/029 art).
6. **Food numbers:** 2% drop chance on kill, 5 HP heal (Jeff-tuned from the 1.5%/15 draft).
7. **Field-medic cap:** 25% lifetime budget (Jeff-requested further nerf; details §4).

## 1. The relic pool

New data module `src/run/relicData.ts` — mirrors `PassiveDef` (id, name, icon, desc) plus
an `unlock` descriptor (`{ tech: id }` or `{ tradition: id, rank: n }`). All relics are
`maxLevel: 1`, never level, never fuse.

| Relic | Mechanic | Gate |
|---|---|---|
| **Blood Rush** 🩸 | Kills grant +30% fire rate for 3 s (timer refreshes on kill) | `hunting` tech (Stone) |
| **Bramble Mail** 🌵 | Enemies that touch you take 15 contact damage | `bronze_working` tech (Bronze) |
| **Prospector's Eye** 💎 | 10% chance a kill drops a duplicate gem | `currency` tech (Classical) |
| **Second Wind** 🕊️ | Once per run, survive a lethal hit at 30% HP | `masonry` tech / cathedral (Medieval) |
| **Overcharge** ⚡ | Active item regains 1 charge every 60 s | `electricity` tech (Industrial) |
| **Harvest Feast** 🍖 | Food drop chance ×3 (→6%) and food heals double (→10 HP) | `vigor` tradition rank 3 |

- Five relics hang on techs spread across five ages so unlocks keep arriving all game;
  one hangs on a tradition rank so culture also buys draft variety.
- Tech/tradition cards in the civ screen gain an "unlocks relic: <name>" line — no new
  unlock UI surface.
- **Economy watch:** Prospector's Eye interacts with the standing RC-009 lever (halve
  per-kill gem values if the doubled-density economy runs hot). It is opt-in and its
  proc chance is the tuning knob; observe in the same playtest.

## 2. Acquisition — the relic slot

- A third passive slot on the HUD, visually distinct from the two sidegrade slots.
- Relic-only: sidegrades can never fill it; relics can never occupy the 2 sidegrade slots.
- While the relic slot is empty, each unlocked relic is a valid draft option
  (`{ kind: 'newRelic', relicId }`) at roll weight **1** (vs. 2–3 for existing kinds).
- Once a relic is taken, no further relic cards that run — one relic per run.
- Relics are run-scoped like passives (not persistent inventory).

## 3. Healing layer A — ambient food drops

- On every enemy kill: 2% chance (tunable constant) to drop a **food pickup**.
- Heals a flat **5 HP** on contact, capped at max HP. Wasted overheal is fine.
- Magnet-attracted within `pickupRadius`, like gems.
- New procedural sprite (`src/art/sprites/` house style); ratified in-game by Jeff during
  the playtest pass. If rejected, sprite redo only — logic unaffected.
- Mini-boss guaranteed drop (the old ticket's idea) is **out of scope** here; revisit
  only if the 2% floor plays too stingy.

## 4. Healing layer B — field-medic lifetime budget

- `field_medic` (and any `regenHps` source, including the `heartwood` fusion) keeps its
  current rate: 0.2 HP/s per level.
- New rule: regen draws from a single shared **lifetime budget of 25% of max HP per run**.
  Once cumulative regen healing reaches the budget, regen is off for the rest of the run.
- The budget is flat 25% regardless of passive level — levels buy speed, not pool.
- Budget is evaluated against *current* max HP (max HP can change via passives mid-run):
  regen is active while `cumulativeRegenHealed < 0.25 * stats.maxHp`.
- Card text (`desc`) must surface the cap so the draft is honest.
- Net healing identity: field_medic = fast-but-finite trickle; food = unbounded but
  RNG-stingy burst; Harvest Feast = the deliberate sustain build.

## 5. Implementation surfaces

- `src/run/relicData.ts` (new) — relic defs + unlock descriptors.
- `src/run/relics.ts` (new) — unlock resolution (owned techs/tradition ranks → available
  relic ids), slot state, draft-option production.
- `src/run/draft.ts` — `newRelic` option kind, weight 1, gated on empty slot + unlocks.
- `src/game/types.ts` — `RelicDef`, run-state fields (equipped relic, regen budget spent,
  Second Wind consumed, Blood Rush timer, Overcharge timer).
- `src/scenes/RunScene.ts` — mechanic hooks: on-kill (Blood Rush, Prospector's Eye, food
  drop), contact (Bramble Mail), lethal-damage intercept (Second Wind), timers
  (Overcharge), regen budget enforcement at the existing regen tick (~line 801), food
  pickup spawn/collect.
- `src/run/modifiers.ts` / civ layer — surface relic unlocks from techs + traditions.
- `src/ui/civScreen.ts` — "unlocks relic" line on tech/tradition cards.
- `src/art/sprites/` — food sprite; HUD relic slot rendering wherever passive slots draw.

## 6. Testing

- Vitest unit tests per relic mechanic (same pattern as passive tests): Blood Rush timer
  stacking/refresh, Bramble Mail damage, Prospector's Eye proc, Second Wind once-only,
  Overcharge recharge, Harvest Feast multipliers.
- Food drop: proc rate determinism (seeded rng), heal clamp at maxHp, 5 HP amount.
- Regen budget: accumulates across ticks, shuts off at 25%, tracks current maxHp, applies
  to heartwood too.
- Draft: relic cards appear only when unlocked + slot empty; never after a relic is taken;
  weight respected.
- Playwright spot-check per `verify-canvas-game-playwright`: unlocked relic card appears
  in a live draft; food pickup heals on contact.

## Out of scope (YAGNI)

Relic leveling, relic fusions, multiple relic slots, POI/shrine healing, mini-boss
guaranteed food, persistent relic inventory, a dedicated unlock UI screen.
