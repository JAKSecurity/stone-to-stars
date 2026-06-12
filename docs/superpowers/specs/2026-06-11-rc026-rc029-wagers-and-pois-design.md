# RC-026 + RC-029 — Expedition Wagers & Points of Interest (Design)

**Date:** 2026-06-11
**Tickets:** [RC-026](../../tickets/RC-026-in-run-poi-events.md) (POI events) + [RC-029](../../tickets/RC-029-expedition-mutators.md) (mutators) — one spec, bundled by Jeff's call: both are the run-variety / risk-reward layer, sharing a wager vocabulary and the same Forge & Fuse + dungeon hooks.
**Status:** Approved — ready for implementation plan

## Problem

Post-RC-034, runs are spatial (3×3 dungeons) but every dungeon plays the same: clear enemies,
collect, kill boss. Nothing rewards going somewhere optional (RC-026's gap) and nothing lets the
player wager difficulty for reward (RC-029's gap). Both tickets predate RC-034 dungeons and
RC-031 Forge & Fuse; this design re-grounds them in the current systems.

## Approved decisions (brainstorm, 2026-06-11)

1. **Bundled brainstorm/spec, split delivery** — one spec, one two-phase plan; mutators (Phase A)
   ship before POIs (Phase B), which carry an art gate.
2. **POI launch set: relic shrine, treasure courier, fusion altar.** Cursed cache rejected for launch.
3. **One legible payout identity per POI** — shrine = culture, courier = mixed gems, altar = fusion
   catalyst. No mixed payout tables at launch.
4. **Mutator launch set: Night Raid, Horde, Frail, Ironclad** with Jeff's **half-the-risk rule**:
   the reward bonus ≈ half the risk magnitude.
5. **Mutators stack freely; reward bonuses are ADDITIVE** (all four = ×1.90). Bounded ceiling,
   legible running total on the card.
6. **Mutator selection is ephemeral per launch** — defaults off each run, not persisted. No
   `CivState` change → **no save-version bump** anywhere in this work.

## §1 POI events (RC-026)

**Placement (pure, seeded):** 2 POIs per dungeon, distinct types rolled from the 3. Positioned in
far quadrants (prefer across ≥1 barrier from the start), obstacle-safe-radius clear like enemy
placement. At most one fusion altar per dungeon. Placement is part of dungeon generation
(`dungeonPopulate` era — same seeded `Rng`), so a seed reproduces its POIs.

**Signaling:** each live POI gets an edge-of-screen indicator with its icon when off-screen
(reuse the RC-019 boss-warning indicator pattern); indicator disappears when the POI is consumed
or despawns. POIs are always opt-in: the dungeon is winnable while ignoring all of them.

- **Relic shrine** — walk-over activation. Spawns a wave of tier-appropriate enemies from the
  biome's spawn table (~6 + 2/tier), placed around the shrine, awake and aggroed. Wave enemies
  JOIN the dungeon-clear count — opting in raises the bar; that is the wager. When the wave is
  fully dead, a **culture jackpot** bursts at the shrine (scale relative to the boss jackpot,
  tunable; numbers are RC-009's remit).
- **Treasure courier** — placed with the dungeon, asleep like other enemies. On aggro it **flees**
  (new `flee` movement archetype in `enemyBehavior.ts`, steering away from the player and
  routeAround-aware at barriers) and **despawns ~20s after first aggro**. Killed before despawn →
  large **mixed-gem jackpot**. The courier is EXEMPT from the win condition (its death/despawn is
  never required to clear) and exempt from Horde multiplication. Edge case, ruled intentional:
  the RC-035 contact-kamikaze path means walking into a still-SLEEPING courier kills it on
  contact and pays the jackpot — a stealth catch before it wakes is a legitimate reward.
- **Fusion altar** — walk-over: grants **+1 fusion catalyst** (existing catalyst counter + HUD ⚗️
  semantics) and **wakes every sleeping enemy within ~1.5 screen radii**. Consumed on use.

**Art gate:** shrine structure, altar structure, and courier enemy need NEW sprites. Per the
standing carve-out, Claude authors shape-data candidates and Jeff ratifies before merge (art-pass
flow). The plan must place this gate inside Phase B, before Playwright verification.

## §2 Expedition mutators (RC-029)

**Catalog (data-driven, `mutatorData.ts`):**

| id | name | effect | reward bonus |
|---|---|---|---|
| night_raid | Night Raid | enemy move speed ×1.5 | +25% |
| horde | Horde | placed enemy count ×1.5 (POI waves + courier exempt) | +25% |
| frail | Frail | player max HP ×0.6 | +20% |
| ironclad | Ironclad | all enemies +1 armor | +20% |

**Stacking:** any combination; `rewardMult = 1 + Σ bonuses` (max ×1.90 at launch). The
half-the-risk rule is the calibration principle for any future additions.

**Seams (no new systems):** Horde scales the `enemyPlacements` count input; Night Raid and
Ironclad apply at enemy placement (speed/armor stat adjustments in the placement/spawn path);
Frail scales `RunModifiers.maxHp` BEFORE the run's `baseStats` snapshot so the passive recompute
model stays consistent. `rewardMult` applies to the run's collected haul at `finish()`
(per-resource, rounded), and the end screen shows the multiplier and active mutators.

**UI (jeff-ui-design):** flat toggle chips ON each expedition card (no separate screen), each chip
showing name + effect + bonus; a running `×N.NN` total on the card when any are active. Active
mutator icons echo on the in-run HUD (line 2). Ephemeral: all chips reset to off for each launch.

## §3 Architecture, testing, delivery

**New pure modules (house pattern, Phaser-free):**
- `src/run/poiData.ts` — POIDef catalog (id, name, icon, payout identity, tuning constants).
- `src/run/poi.ts` — placement rolls, shrine wave composition, courier flee vector + despawn
  timing, payout math, win-count exemption helper.
- `src/run/mutatorData.ts` — the 4 MutatorDefs.
- `src/run/mutators.ts` — stack math (`combineMutators(ids) → {effects, rewardMult}`), haul
  application.
- `src/run/enemyBehavior.ts` — add the `flee` archetype (pure steering, like charger/circler).
- RunScene renders: POI structures + edge indicators + activation; expedition screen renders chips.

**Testing:** unit tests for placement determinism (fixed seed → fixed POIs), distinct-type rule,
payout math, stack math + half-the-risk table values, flee vector, courier win-exemption, haul
multiplication rounding. Playwright walkthrough: toggle 2 mutators → verify enemy stats + maxHp →
activate shrine and clear wave → catch courier → altar wake → clear dungeon → end screen shows
mutator multiplier applied.

**Delivery:** one implementation plan, two phases. **Phase A = RC-029 mutators** (pure + UI chips,
no art) ships first and is independently playtestable. **Phase B = RC-026 POIs** (placement,
behaviors, scene wiring, art gate, signaling). Tickets close independently.

## Out of scope

- Cursed cache POI (rejected for launch; candidate for a later per-biome POI expansion).
- Darkness/fog mutator (blocked on RC-034 slice-3 fog of war).
- Mutator persistence / per-biome gating / unlockable mutators.
- Payout kickers beyond each POI's single identity (catalyst/recharge drops from shrine/courier).
- Minimap POI markers (edge indicators only until RC-034 slice 3 exists).

## Acceptance criteria (refine per-ticket at close)

- [ ] 2 distinct POIs per dungeon, seeded-deterministic, opt-in, edge-signaled (RC-026)
- [ ] Shrine wave→culture jackpot; courier flee→despawn/jackpot, win-exempt; altar→catalyst+wake (RC-026)
- [ ] 4 mutators as card chips, additive stacking shown live, effects + haul multiplier applied and echoed (RC-029)
- [ ] Half-the-risk values exactly as tabled; stacking math unit-tested (RC-029)
- [ ] All pure logic unit-tested; Playwright live-verifies both halves; no save bump
- [ ] New sprites (shrine/altar/courier) pass Jeff's art-ratification gate before Phase B merges
