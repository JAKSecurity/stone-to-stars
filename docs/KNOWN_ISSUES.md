# Known Issues

Tracked defects and deferred work for Rogue · Civ. The core loop (run → bank →
research → build → advance age → persist) is verified working end-to-end. The items
below are open.

---

## 1. [BUG, high] Auto-attack never damages enemies (bullet↔enemy overlap doesn't fire)

**Status:** Open. Confirmed via live instrumentation. Root cause not yet found.

**Symptom:** In a run, the player's auto-fired bullets never damage or kill enemies.
Enemies only die by colliding with the player (which deals contact damage and drops
*no* gem and grants *no* XP). Consequences:
- The player never levels up, so the in-run perk **draft never appears** in normal play.
- **Industry and Science can't be farmed** (they only drop from bullet-kills), so a run
  realistically yields only Exploration (timer tick) and Culture (relics).

**Evidence (Playwright + `window.__game` instrumentation):**
- Over a full run, every enemy stayed at its spawn HP (sampled `minEnemyHpSeen === 12`
  with enemies set to 12 HP; `sawAnyEnemyBelow12 === false`). No enemy ever took damage.
- Player level stayed `1` (zero kills) every run; banked industry/science always `0`.
- Bullets *are* created with the correct `damage` data (12) and *do* move toward the
  nearest enemy (sampled body velocity ≈ 420 px/s toward a target), with enabled bodies.
- `player↔enemy` overlap **works** (player HP drops as enemies ram it) and `player↔gem`
  overlap **works** (Culture relics are collected). Only `bullet↔enemy` is dead.

**Where to look:** `src/scenes/RunScene.ts` — the `this.physics.add.overlap(this.bullets,
this.enemies, ...)` registration vs. `hitEnemy()`. The working overlaps are *single object
↔ group*; the broken one is *group ↔ group*. Suspects: how bullets get their Arcade body
(`this.add.circle()` → `physics.add.existing()` → `this.bullets.add()`), the group-vs-group
collider, or a body-size/enable issue specific to the bullets group. Needs a focused
Phaser debugging session (enable `arcade.debug: true` to see body outlines and whether
bullet bodies exist where the sprites render).

**Until fixed:** the survivor combat is non-functional as a resource faucet for 2 of 4
resources. This is the top priority before any P2 content/balance work.

---

## 2. [P2] Combat & collection balance / feel

Deferred to the P2 "juice + balance" pass (per the design spec). Tune holistically with
real playtesting once issue #1 is fixed:
- Enemy HP / bullet damage / fire rate / spawn ramp so kills feel good.
- Gem pickup ergonomics. Current behavior (added this slice): gems always drift toward the
  player, accelerating inside `pickupRadius`. Revisit whether base auto-collect is desired
  or whether collection should be more skill/positioning based (and re-tune the Magnet perk
  accordingly).
- Contact-deaths currently yield nothing — decide whether ramming enemies should drop
  partial resources or just be a pure threat.

---

## 3. [Minor] Multi-level-up swallows extra drafts

`RunScene.gainXp()` opens a draft on `level > before` but ignores `levelsGained` from
`addXp()`. If a single XP grant ever crosses two thresholds, only one draft opens. Latent
with current numbers (a kill grants +3 XP; first threshold is 8) but should queue
`levelsGained` drafts once XP sources grow. Pure-logic `addXp` already returns the count.

---

## 4. [Minor] Base-camp build picker is implicit

Clicking an empty camp tile auto-builds the *first* unlocked/affordable/not-yet-built
building (`src/ui/civScreen.ts`), and a "one of each building" rule is enforced only in the
UI (the logic layer would allow duplicates). Fine for the 3-building slice; add an explicit
building picker when the building set grows.
