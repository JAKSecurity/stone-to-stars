# RC-026: In-run point-of-interest events
**Status**: Open  **Priority**: P3  **Type**: Feature
**Created**: 2026-06-09

## Summary
Runs are spatially aimless — kiting in circles is optimal. Add 1–2 optional points of interest per
run that reward going somewhere: a relic shrine that trades a burst wave for bonus culture, and a
fleeing treasure courier that drops a jackpot if caught.

## Context
From the 2026-06-09 review (item A5). Builds on rc-017's scattered resource deposits (the first
"reason to move"). Proposed events:
- **Relic shrine** — a marked structure; activating it (walk over / brief channel) spawns a burst
  wave of enemies and pays out a culture jackpot when cleared. Risk/reward positioning decision.
- **Treasure courier** — a rare enemy that flees the player instead of chasing; despawns after a
  while; drops a large mixed-gem jackpot if killed. (Vampire Survivors' treasure-goblin pattern.)

Both should be visible on-screen or signaled at screen edge so the player can choose to engage.
Event types should be data-driven enough that more can be added per-biome later.

**Sequencing:** after rc-017 merges; courier benefits from RC-018's behavior dispatch (flee = an archetype).

## Acceptance Criteria
- [ ] At most 1–2 POI events per run; both event types implemented
- [ ] Events are opt-in (ignoring them is always viable) and signaled when off-screen
- [ ] Shrine wave + payout and courier flee + jackpot work end-to-end
- [ ] Unit tests for event scheduling/payout logic; Playwright live-verify both events

## References
- Review session 2026-06-09 (item A5)
- `src/scenes/RunScene.ts`, `src/run/spawnEscalation.ts`, RC-018 (flee behavior)

## Resolution
**Delivered 2026-06-11** as Phase B of the combined RC-026 + RC-029 build.

### What shipped
Three opt-in dungeon POIs, two rolled per run (distinct, seeded → reproducible), each with one
legible payout identity and an off-screen edge indicator:
- **Relic Shrine** — walk over to summon a tier-scaled guardian wave (`6 + 2×tier`, drawn from the
  biome spawn table, spawned awake + aggroed). Clearing the tracked guardians bursts a culture
  jackpot (6 gems at `rewardValueForTier(tier) × 3`) at the shrine.
- **Treasure Courier** — a sleeping `flee`-archetype enemy that runs from the player on wake;
  despawns 20 s after first aggro WITHOUT credit; pays a big mixed-gem jackpot (10 gems, every
  resource represented) on catch. Win-exempt: the dungeon clears while it still flees. Catching a
  still-sleeping courier (stealth catch) pays the same jackpot.
- **Fusion Altar** — walk over for a free fusion catalyst (`⚗️ +1`); wakes every enemy within
  ~1.5 screen-widths and shakes the camera (the reward is paid for by the surge it triggers).

### Architecture
House pattern — all decidable logic in Phaser-free pure modules: `src/run/poiData.ts` (catalog +
tuning constants), `src/run/poi.ts` (`rollPois`, `shrineWave`, `shrineJackpot`, `courierJackpot`),
and a `fleeVelocity` archetype in `src/run/enemyBehavior.ts`. `src/run/enemyData.ts` adds the
`treasure_courier` EnemyDef. `src/scenes/RunScene.ts` carries placement, edge indicators, shrine/
altar activation, and the full courier lifecycle. No save bump (POIs are part of seeded dungeon
generation, not persisted CivState). Three sprites authored (`poi_shrine`, `poi_altar`,
`enemy_courier`) through the existing art-registry pipeline.

### Spec / plan
- Spec: `docs/superpowers/specs/2026-06-11-rc026-rc029-wagers-and-pois-design.md`
- Plan: `docs/superpowers/plans/2026-06-11-rc026-rc029-wagers-and-pois.md` (Tasks 5–10)

### Design notes (rulings made during build/verification)
- **Ceremony forfeit with a live courier** — clearing the dungeon while the courier flees triggers
  the zone-cleared ceremony (win exemption), and the ceremony's cleanup loop destroys the courier
  cleanly. It drops its single normal `drop` gem, NOT the jackpot — this is the intentional forfeit:
  you do not get the jackpot if you abandon the chase. No orphaned edge indicator (the indicator
  keys off `obj.active`).
- **Splitter in a shrine wave** — when a shrine wave contains splitters (e.g. `rock_golem` in the
  caverns biome), the culture jackpot pays when the TRACKED guardians die, even though their
  splitter children remain. The children are untracked regular enemies, so they still gate the
  dungeon CLEAR (you must kill them to finish), but they do not gate the shrine reward. Verified
  not to read as buggy — the named guardians are what you came for; the children are the dungeon's
  normal population.

### Art-ratification status
Art is authored and integrated, but **pending Jeff's playtest ratification** (per the Task 9 gate).
If a sprite is rejected at playtest only the shape-data changes — no system rework. Gameplay review
shots saved to `docs/superpowers/evidence/rc026-art/` (shrine + jackpot, courier mid-flee with edge
indicator, altar + wake moment).

### Live verification (Playwright, headless, seed-forced)
All 7 plan-walkthrough items + 5 code-review probes verified against the running game with seeded
runs (seed 2 → courier+shrine, seed 7 → altar+shrine): POI placement/determinism/edge indicators,
shrine wave count + culture jackpot, courier flee direction + corner-catchability + despawn + catch
jackpot + stealth catch, altar catalyst + wake sweep, win exemption + ceremony forfeit, Horde count
exemption for POI waves/courier, and the splitter-children ruling. Zero console errors;
instrumentation reverted (`git diff` empty for src); 353 tests + build green.
