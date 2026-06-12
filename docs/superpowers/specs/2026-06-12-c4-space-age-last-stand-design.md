# C4: Space Age + The Last Stand Finale

**Date:** 2026-06-12
**Capability:** C4 (The Last Stand finale) — also closes C3's "Iron→Space ages" remit.
**Status:** Design ratified with Jeff 2026-06-12. Two work items, built in order:
**B1 Space age content**, then **B2 The Last Stand finale**.

## Decisions (ratified)

1. **Gating:** a mini 9th "Space" age (4 techs); the capstone tech **Planetary Defense**
   unlocks the finale.
2. **Finale shape:** fixed arena, alien invaders descending in formation waves
   (space-invaders homage: rows march laterally, drop a rank at the edge), escalating to
   a screen-wide multi-phase **mothership** boss.
3. **Stakes/aftermath:** defeat = normal death flow (partial haul banks, retry whenever).
   Victory = celebratory victory screen (run + civ lifetime stats), persistent
   `lastStandWon` save flag, sandbox continues, finale replayable.
4. **Entry point:** a distinct dramatic card on the existing expedition screen
   (no mutators/wagers; normal kit rules).

---

## B1 — Space age content

### Age

- `AgeId` union and `AGE_ORDER` gain `'space'` (9th, after `modern`). Everything keyed
  by age index follows automatically: tech cost curve, expedition tiers, camp slot
  schedule (already capped at 25), gem tiers, enemy damage tier scaling.
- Sweep required: grep age-keyed `Partial<Record<AgeId, …>>` maps and exhaustive
  age switches for gaps the fallbacks don't cover (biome-by-age, music/ambient
  selection, expedition screen labels). Fallback behavior (e.g. hero falls back to
  base) must be replaced with real space entries where the pattern provides them.

### Techs (4, in `src/tech/techData.ts`)

| Tech | Cost (≈, follows curve past modern's 90–110) | Requires | Grants |
|---|---|---|---|
| **Rocketry** | industry 130, science 90 | combustion | `gatesAge: 'space'`, unlocks building `launch_pad` |
| **Computers** | science 120, industry 60 | radio | runBonus `draftChoices +1`, unlocks building `mission_control` |
| **Satellites** | science 110, exploration 60 | rocketry | runBonus weapons: `['laser_array']` |
| **Planetary Defense** | industry 150, science 140 | computers + satellites | **unlocks The Last Stand** (no other bonus — the finale IS the payoff) |

- Requirements pull from both Modern branches (combustion line + radio line) so the
  whole Modern tier stays relevant.

### Buildings (2, in `src/camp/buildingData.ts`, age `'space'`, maxLevel 3)

- **Launch Pad** — baseCost {industry:130, science:60}, yield {industry:18},
  runBonus { damageMult: 0.20 }.
- **Mission Control** — baseCost {science:110, industry:70}, yield {science:15},
  runBonus { maxHp: 60 }.

### Weapon (1, in `src/run/weaponData.ts`)

- **Laser Array** (`laser_array`) — space-age ranged weapon on an existing archetype
  (beam/bolt family per the Forge & Fuse component model; budget-balanced as a
  same-age sidegrade like other age weapons). Distinct projectile sprite (thin beam
  bolt, cyan).

### Art (procedural house style; in-game ratification by Jeff at the playtest)

- `hero_space` (space-suit hero) appended to `HERO_SPRITE_BY_AGE`.
- Building sprites `launch_pad`, `mission_control`.
- Projectile sprite for `laser_array`.

### Civ screen

- Space age section appears in the tech tree via the existing age grouping — no new UI.

---

## B2 — The Last Stand finale

### Unlock + entry

- `lastStandUnlocked(civ)`: `planetary_defense` researched.
- Expedition screen gains a **THE LAST STAND** card when unlocked — visually distinct
  (alarm-red styling), pinned above biome cards. No mutators/wagers apply. Kit/active
  selection works exactly like a normal expedition. Card subtitle shows victory status
  ("Repel the invasion" / "VICTORY ACHIEVED — replay").

### The run

- A special expedition flag (`finale: true` on the run init payload) — NOT a biome.
  Fixed arena: flat dark "last city" ground, walls on all sides (reuses dungeon wall
  containment from RC-038), no resource deposits, no POIs, no dungeon content.
- **Formation waves** (new module `src/run/invasion.ts`, pure + data-driven):
  - `WAVES`: authored list (5 waves). Each wave defines a grid of invaders
    (cols × rows, enemy ids per row), march speed, drop distance, and fire cadence.
  - Invaders use new space enemy defs (`src/run/enemyData.ts`: e.g. `invader_drone`,
    `invader_soldier`, `invader_elite`) with RC-040 attack profiles (beam/mortar
    re-skinned as plasma). New procedural sprites (classic invader silhouettes,
    ratification at playtest). Biome enemy lists are authored explicitly, so invader
    defs never leak into regular expedition spawn pools.
  - Formation movement: the BLOCK marches laterally; on reaching an arena edge it
    drops toward the player's half and reverses — implemented as a per-wave formation
    controller in RunScene driving member positions (members stay physics bodies so
    existing weapons/collisions work). Killing all members advances to the next wave
    (short fanfare beat between waves).
  - Invaders drop gems normally (the finale still pays — sandbox economy continues);
    XP/level drafts work normally (relics included).
- **Mothership** (wave 6): screen-wide boss at the arena top. Multi-phase by HP
  thirds: phase 1 plasma volleys (mortar profile), phase 2 sweeping beam (beam
  profile) + drone spawns (`invader_drone`), phase 3 enrage (faster everything).
  Big HP pool tier-scaled like RC-019/RC-009 bosses ×(finale multiplier). Boss HP bar
  reuses the existing boss bar.
- **Defeat:** standard `finish(true)` death flow — partial haul banks, run-end screen,
  retry whenever.

### Victory

- Killing the mothership triggers the victory sequence instead of the normal zone-clear
  ceremony: gem vacuum + a distinct victory fanfare, then `finish(false)` with a
  `finaleVictory: true` marker on the RunResult.
- `CivState.lastStandWon?: boolean` (additive optional field — no save version bump)
  set on first victory via `applyRunResult`.
- **Victory screen:** a dedicated DOM screen (pattern of `runEndScreen`) — "THE LAST
  STAND — VICTORY", run stats (waves, kills, time, haul) + civ lifetime stats (ages
  reached, total runs, lifetime resources). One button: "Continue" → civ screen
  (sandbox continues). Replays that win again show the same screen.
- Civ screen shows a small persistent victory laurel once `lastStandWon` (e.g. in the
  header strip).

### Testing

- Unit: space-age data invariants (tech ids/requires/gates, building/weapon refs
  resolve), `lastStandUnlocked`, invasion wave data (every enemy id exists; wave
  grids well-formed), formation step math (march/edge-drop/reverse as a pure
  function), mothership phase thresholds, `applyRunResult` sets `lastStandWon` only
  on `finaleVictory`.
- Playwright: unlock flow (research capstone → card appears), launch finale, formation
  marches and drops, mothership phases, victory screen renders with stats, save flag
  persists, replay possible. Defeat path banks haul.

### Out of scope (YAGNI)

New Game+, credits sequence, new resources, space biomes for regular expeditions,
difficulty selection for the finale, leaderboards, multiple endings.
