# Rogue · Civ — Design Spec

**Date:** 2026-06-05
**Status:** Approved design — ready for implementation planning
**Author:** Jeff Krueger (design) + Claude (facilitation)

---

## 1. Vision

A free, single-player browser game that fuses two loops:

- A **roguelike survivor mini-game** (the action) — short, juicy, self-contained battles.
- A **mini-civilization builder** (the strategy) — a tech tree and a growing base camp.

The mini-game exists to feed the civilization. You harvest resources in battle, spend
them researching technology and constructing your settlement, and each upgrade makes the
next battle stronger. You climb a ladder of ages **at your own pace** — there are no rival
AI civilizations and no direct competition. Progress slowly and you simply spend longer in
the Stone Age. The arc ends with a climactic final battle.

**Reference points:** Ball X Pit (run → base-camp meta loop), Vampire Survivors / Megabonk
(the survivor mini-game), Slay the Spire / Balatro (roguelike run structure), Civilization
I/II (the tech tree, ages, and "spaceship" endgame).

**Design center of gravity:** the civilization is where the design love goes (Jeff knows 4X
well); the mini-game's job is to be genuinely fun on its own *and* to visibly gain power from
civ unlocks. The feel we are chasing is C ("two halves that matter") delivered through an
A-shaped structure (civ is the star, mini-game is the engine).

---

## 2. Core loop

```
Survivor run (5–10 min)  →  4 resources  →  Research tech  →  Build the camp
        ▲                                                            │
        │                                                            ▼
   New Age + stronger roster  ◄────────  Civ is bigger, next run hits harder
```

1. Play a timed survivor run; harvest the four resources.
2. Bank resources at the base camp.
3. Spend them on the tech tree; researching a tech unlocks a building.
4. Place/upgrade the building in the base camp — the town visibly grows, granting a passive
   yield and a combat bonus.
5. Your unit roster, starting kit, and stats improve; key techs cross you into the next Age.
6. Repeat. Reach the Space Age to trigger the finale.

---

## 3. The run (survivor mini-game)

**Engine:** Phaser 3 (WebGL), rendered to a canvas scene.

- **Structure:** timed survival. A fixed clock (target **5–8 minutes**, shorter in early
  ages and scaling up), escalating enemy waves, capped by a mini-boss.
- **Controls:** 8-direction movement (WASD / arrows). Weapons **auto-fire**; the player
  positions and dodges.
- **In-run draft = roguelike variance.** The player levels up during a run and drafts
  weapons/perks from a randomized choice. **These selections reset every run** — they are the
  per-run variance, not persistent progression.
- **Differentiated resource sourcing** (the steering mechanic):
  - **Industry** — drops from beasts / combat enemies.
  - **Science** — recovered from ancient ruins / scholar enemies.
  - **Exploration** — earned by clearing fog-of-war / covering ground.
  - **Culture** — found at villages / relics.
  The player can bias a run toward whichever resource their next tech needs.
- **Run end:** the clock expires (or the player dies). A summary banks the run's resources.

**Art:** pixel art with a deliberate "juice" pass — particles, screen shake, hit-flash,
floating damage numbers, glowing pickups. WebGL is required because bullet-heaven puts
hundreds of sprites on screen at once.

---

## 4. The civilization (strategy layer)

**UI:** HTML/CSS DOM screens (not canvas) — tech tree, base-camp grid, resource readout.

### 4.1 Tech tree
- Civ I/II flavor: a branching web of nodes.
- Spend resources to light up nodes. Each node unlocks one or more of: a **building**, a
  **unit** (added to the run roster), or a **bonus** (stat / passive).
- **Key nodes gate the next Age.**
- Node costs are **combinations of the four resources** (e.g., Bronze Working = Industry +
  Science), which is what makes resource steering meaningful.

### 4.2 Base camp (unified with the tree)
- Researching a tech **unlocks a building**; the player then **places/upgrades** it on the
  camp grid.
- Each building provides a **passive yield** (slow trickle of a resource) *and* a **run
  bonus** (e.g., +starting damage, +max HP, an extra draft pick).
- The settlement **grows visibly** from a few huts to a town — this is the primary emotional
  payoff of the meta layer.
- "Research → unlock → place → feel it next run" is the through-line. The tree is *what's
  possible*; the camp is *what you've built*.

### 4.3 Civ → run bridge
The civilization determines what the player brings *into* a run:
- the **unit roster / draft pool**,
- the **starting kit** and base stats,
- **passive bonuses** from buildings.

Example: research *Bronze Working* + build a *Forge* → "Bronze Spearman" enters the roster
and starting damage rises — felt on the very next run.

---

## 5. The four resources

**Exploration · Science · Industry · Culture.** Exactly four — capped deliberately to avoid
spreadsheet feel. Produced by runs (per §3), consumed by tech nodes and buildings (per §4).
In-run sourcing must be visually legible so the player can steer.

---

## 6. Ages and the finale

- **Finite ladder, ~6–7 ages:** Stone → Bronze → Iron → Classical → Medieval → Industrial →
  Space.
- Each Age is gated by a key tech. Advancing an Age **escalates run difficulty *and* grants
  stronger units/biomes** — power creeps on both sides so runs stay tense rather than trivial.
- **The Last Stand (finale):** reaching the Space Age triggers a special survivor run —
  **space invaders descend and the player's whole civilization is the army**. Winning it wins
  the game, ending on a victory screen with the player's stats (elapsed time, runs taken, tech
  path). A Mars-evacuation narrative is the wrapper; the *battle* is the substance.
- **Crucially, the finale reuses the survivor engine** — it is a specially-tuned, scaled-up
  encounter with a boss, not a new game mode.
- "Racing yourself": replay value is reaching the top faster, via a different tech branch, or
  on a harder difficulty. An endless/prestige mode is an explicit post-ship option, not part
  of the core arc.

---

## 7. Technology & architecture

- **Run engine:** Phaser 3 (WebGL, Canvas fallback).
- **Civ UI:** plain HTML/CSS DOM, shown/hidden as a state switch against the Phaser canvas.
- **Language/build:** TypeScript + Vite.
- **Persistence:** `localStorage` (single save; civ state persists, run state is ephemeral).
- **Distribution:** builds to static files → **free hosting on GitHub Pages**. Offline,
  single-player, no backend, no monetization.
- **State boundary (the key separation):**
  - *Persistent civ state* — researched techs, built/upgraded buildings, current Age,
    banked resources, unlocked roster, run/time stats.
  - *Ephemeral run state* — in-run level, drafted weapons/perks, current HP, wave timer.
    Discarded at run end after resources are banked.

---

## 8. Build order (vertical slice first)

The game is large; we ship by proving the loop before pouring in content.

- **P0 · Skeleton.** Vite + TS + Phaser scaffold. A run-scene (Phaser) ↔ civ-screen (DOM)
  state switch. `localStorage` save/load. Builds and deploys as static files.
- **P1 · The Loop — vertical slice (make-or-break).** *One* playable timed survivor run that
  drops all four resources, with an in-run level-up draft → a small (~6-node) tech tree
  spanning the Stone and Bronze ages → a 3×3 base camp with 2–3 buildable buildings → the full
  ratchet works and the player crosses from Stone into the Bronze Age. **This must prove the
  loop is fun before any content is built.**
- **P2 · Depth.** Remaining ages, more enemy/biome variety, more tech nodes and buildings,
  in-run weapon evolutions, a juice + audio pass.
- **P3 · Finale.** The Last Stand boss run and victory screen.
- **P4 · Ship.** Balance, art cohesion, audio, deploy. Optional endless/prestige mode.

**MVP = P0 + P1.** The implementation plan should target the vertical slice first.

---

## 9. Risks

- **Run feel is load-bearing.** If the 5-minute survivor loop is not fun on its own, the civ
  layer cannot rescue it. P1 must demonstrate fun before content work begins.
- **Four-resource bookkeeping** risks feeling spreadsheet-y. Mitigation: hard-cap at four;
  keep in-run sourcing visually obvious; keep tech costs readable.
- **Tech-tree content is the long pole** — every node is authored content. The finite age
  ladder caps this scope; P1 deliberately ships only ~6 nodes.
- **Two-surface coupling** (tree ↔ camp) must interlock cleanly; the unified model is more
  design care than two parallel systems, but yields the soul we want.

---

## 10. Resolved decisions (log)

| Decision | Choice |
|---|---|
| Where the game's heart is | Civ is the star; mini-game is its engine (A-structure, C-feel) |
| Mini-game genre | Survivor / bullet-heaven |
| Civ structure | Tech tree (Civ I/II flavor) |
| Base camp | Included; **unified** with the tree (research → unlock → place) |
| Economy | **Four resources** (Exploration / Science / Industry / Culture), combo costs |
| Run structure | Timed survival; in-run draft = variance; civ = persistent power |
| Endgame | Finite ladder (~6–7 ages) ending in **The Last Stand** boss run |
| Tech stack | Phaser 3 (run) + HTML/CSS DOM (civ UI), TypeScript + Vite, localStorage |
| Hosting | Static files, free on GitHub Pages |
| Art direction | Pixel art + heavy juice |
| First build target | P0 skeleton + P1 vertical slice (Stone → Bronze) |
