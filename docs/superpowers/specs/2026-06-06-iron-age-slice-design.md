# Rogue · Civ — Iron Age Slice Design Spec

**Date:** 2026-06-06
**Status:** Approved design — ready for implementation planning
**Author:** Jeff Krueger (design) + Claude (facilitation)
**Ticket:** RC-005 · **Capability:** C3 (Content & ages)
**Builds on:** `2026-06-05-rogue-civ-design.md` (vision), `2026-06-06-art-pass-design.md` (sprite pipeline)

---

## 1. What this slice is

The P0/P1 vertical slice (Stone → Bronze) and the art pass are both shipped. This slice
delivers **depth**: a new age (Iron) with its own techs, buildings, biome, enemies, and
weapons — *and*, critically, the **data-driven systems** that make every age after Iron
cheap content rather than engine work.

The key finding that shaped the design: techs and buildings are already clean, data-driven
records (`techData.ts`, `buildingData.ts`), but **weapons and enemies are hardcoded** inside
`RunScene`, and **run difficulty does not scale with age** (enemies are a constant 24 HP and
the spawn ramp is purely time-based). So the ticket's three asks split cleanly:

- *New techs/buildings* → content (already cheap).
- *Weapon evolutions* and *new enemy types* → require lifting weapons and enemies out of
  hardcoding into data first.
- *P2 juice/balance* → the difficulty-scaling work is the spine that keeps the age ladder
  tense, and folds in naturally.

We build the foundations, then ride Iron content on top.

## 2. Anchoring decisions (the design forks)

These five choices, ratified during the brainstorm, define the slice:

| Fork | Choice |
|---|---|
| Slice intent | **Systems + content** — build data-driven foundations, then author Iron on them |
| Weapon model | **Multi-weapon, civ-gated pool** (Vampire-Survivors style) with evolutions |
| Difficulty | **Choose an expedition each run** (not auto-scaled) |
| Expedition shape | **Biomes** — each a themed place with a resource bias + signature enemies |
| Iron's identity | **Going deep: metallurgy** — mining & smelting; Industry+Science lean |

Three embedded sub-decisions: **4 weapon slots**; **civ unlocks define the draft *pool*** (you
start a run with the base club and draft the rest — preserving per-run variance); and the
**biome resource-bias mechanic doubles as the fix for thin Exploration/Culture sourcing**
(today only the timer tick faucets Exploration and relics faucet Culture — see
`KNOWN_ISSUES.md` §2).

---

## 3. Systems architecture (the data-driven foundations)

Three subsystems are lifted out of `RunScene`'s hardcoding into pure, unit-testable data +
logic, mirroring how `economy` / `tech` / `camp` already work. The pure-logic vs.
presentation boundary established in the existing codebase is preserved.

### 3a. Weapons — `src/run/weaponData.ts` + `src/run/weapons.ts`

```ts
interface WeaponDef {
  id: string;
  name: string;
  tier: AgeId;                 // for pool gating / display
  projectileSprite: string;    // art registry id
  cooldownMs: number;
  damage: number;
  count: number;               // projectiles per volley
  spread: number;              // radians, for multi-projectile fan
  speed: number;
  behavior: 'straight' | 'pierce' | 'orbit' | 'cone' | 'lob';
  pierce?: number;             // enemies a projectile passes through
  maxLevel: number;
  levelScaling: {              // per-level deltas
    damage?: number; cooldownMs?: number; count?: number;
  };
  evolvesTo?: string;          // weapon id of the evolved form
  evolveRequiresPerk?: string; // perk id that, owned at max level, triggers evolution
}
```

- The player carries **up to 4 weapon slots**, each auto-firing on its own cooldown.
- `RunScene`'s firing path replaces the hardcoded
  `shots = mods.weapons.includes('bronze_spear') ? 2 : 1` conditional
  (`RunScene.ts:137`) with a generic loop that, each frame, ticks every equipped weapon's
  cooldown and fires per its `WeaponDef`.
- **Civ-gated pool**: tech/building unlocks add weapon ids to the player's *available pool*
  (generalizing today's `RunModifiers.weapons`). You start a run with the base `club`; the
  **in-run draft** then offers, from the unlocked pool: a *new weapon* (if a slot is free), a
  *weapon level-up*, or a *perk*. This is the per-run variance.
- **Evolution**: when a weapon is at `maxLevel` and the player owns its `evolveRequiresPerk`,
  the next relevant level-up offers/auto-applies the evolved form (`evolvesTo`). Each
  evolution pairs with one of the five existing perks, giving perks a second purpose.
- `weapons.ts` holds the pure logic (level-up math, evolution eligibility, slot management) —
  unit-tested with no Phaser dependency.

### 3b. Enemies — `src/run/enemyData.ts`

```ts
interface EnemyDef {
  id: string;
  sprite: string;              // art registry id
  baseHp: number;
  speed: number;
  contactDamage: number;
  drop: Resource;              // resource gem dropped on kill
  xp: number;
  displaySize: { w: number; h: number };
  behavior?: 'chase';          // room to grow (ranged, etc.) later
}
```

- `spawnEnemy()` (`RunScene.ts:165`) stops hardcoding beast/scholar + 24 HP and instead pulls
  an enemy id from the **active expedition's spawn table**, instantiating from its `EnemyDef`
  with the run's scaling multipliers applied.

### 3c. Biomes, expeditions & age-scaling — `src/run/biomeData.ts` + `src/run/expedition.ts`

```ts
interface BiomeDef {
  id: string;
  name: string;
  resourceBias: Partial<Record<Resource, number>>; // drop weighting
  spawnTable: Record<string, number>;              // enemyId -> spawn weight
  minAge: AgeId;                                    // unlock gate
  tint: string;                                     // background/art treatment
}

interface Expedition {           // a concrete pickable run
  biome: string;
  tier: number;                  // difficulty, capped by current age
  scaling: { hpMult: number; speedMult: number; spawnRateMult: number; dropMult: number };
  rewardMult: number;
}
```

- `expedition.ts` (pure) derives the **available expeditions** from civ state: each unlocked
  biome × each difficulty tier up to the player's current age, with scaling params computed
  from the tier. Unit-tested.
- Adding `'iron'` to `AgeId` and `AGE_ORDER` (`types.ts:5`) is what unlocks the Iron tier and
  the Deep Caverns biome.
- The biome's `resourceBias` weights its drops, so **a biome actually faucets its themed
  resource** — this is where Exploration and Culture get real sourcing.

**Net effect:** after this, a new age = a handful of data entries + sprites, no engine work.

---

## 4. Iron content

All data + sprites; no engine work once §3 lands. Sprites use the existing `src/art/`
shape-data pipeline (add defs + registry entries, as the art pass established).

### 4.1 Biomes (the expedition roster)

| Biome | Unlock | Resource lean | Enemies | Notes |
|---|---|---|---|---|
| The Wilds | Stone (start) | Industry | beast | today's default run |
| Ancient Ruins | Stone | Science | scholar + **sentinel** (new) | |
| Frontier | Bronze | Exploration + Culture | **raider** (new) | fixes thin explo/culture faucet |
| **Deep Caverns** | **Iron** | Industry + Science | **cave dweller, rock golem, automaton** + **Iron Golem** (mini-boss) | the metallurgy biome |

### 4.2 Iron techs (age `iron`, chained behind `bronze_working`)

| Tech | Cost lean | Unlocks |
|---|---|---|
| **Iron Working** | Industry + Science | **gates Iron age**, Smelter building, iron weapons into pool |
| **Deep Mining** | Industry | Deep Mine building, **unlocks Deep Caverns biome** |
| **Smelting** | Industry + Science | Foundry building, Flame Jet weapon |
| **Mechanics** | Science | Sawblade weapon (automation flavor) |

### 4.3 Iron buildings

| Building | Yield | Run bonus |
|---|---|---|
| **Smelter** | industry | unlocks `iron_pick` / +damage |
| **Foundry** | science | unlocks `war_hammer` / +damage |
| **Deep Mine** | industry (big) | +damage |

### 4.4 Weapons & evolutions

Metallurgy-flavored (not just swords). Each evolution pairs with one of the five existing
perks (`sharpen`, `rapid`, `swift`, `vigor`, `magnet`).

| Weapon | Source | Behavior | Evolution (+ perk) |
|---|---|---|---|
| Club | base | melee arc | — |
| Bronze Spear | Forge (today) | 2× straight | + Swift → **Iron Lance** (multi-pierce) |
| Iron Pick | Smelter | thrown, pierce | + Magnet → **Ricochet Pick** |
| War Hammer | Foundry | slow AoE cleave | + Vigor → **War Maul** (knockback) |
| Sawblade | Mechanics | orbiting blade | + Rapid Fire → **Buzzsaw** |
| Flame Jet | Smelting | short cone | + Sharpen → **Forgefire** (burn DoT) |

### 4.5 Enemies (`enemyData.ts` entries)

| Enemy | Role | Drop | Biome |
|---|---|---|---|
| Cave Dweller | fast fodder | industry | Caverns |
| Rock Golem | slow tank, heavy contact | industry (big) | Caverns |
| Automaton | medium | science | Caverns |
| Iron Golem | mini-boss | both | Caverns (high tier) |
| Sentinel | medium | science | Ruins |
| Raider | medium | culture / exploration | Frontier |

---

## 5. Expedition pick screen + run flow

New DOM surface `src/ui/expeditionScreen.ts`. The flow gains one step:

```
Civ screen → [Start Run] → Expedition pick → RunScene(expedition) → summary → bank → Civ screen
```

- A **flat grid of expedition cards, all visible at once** (per Jeff's UI principle — no
  carousel, no progressive disclosure). Each card: biome name, resource-bias icons,
  difficulty tier, a one-line enemy preview, and the reward multiplier. *(The `jeff-ui-design`
  skill is invoked when this screen is built, not at spec time.)*
- Available expeditions come from `expedition.ts`.
- `RunScene.init(data)` receives the chosen `Expedition` and uses it for the spawn table +
  scaling. `computeRunModifiers` (civ power) is unchanged — the expedition supplies the
  *threat* side of "power creeps on both sides."

---

## 6. Juice + balance (the P2 fold-in)

- **Difficulty scaling** — delivered by §3c; resolves the core of `KNOWN_ISSUES.md` §2 (no
  more trivial constant-HP enemies as the civ power-creeps).
- **Combat juice** (design spec §3) — hit-flash, floating damage numbers, screen shake on
  hits/deaths, death particles, glow on pickups.
- **Gem ergonomics** (#2) — revisit auto-collect vs. positioning; retune Magnet against it.
- **Multi-level-up draft queue** (#3) — now load-bearing (more XP sources); fix `gainXp` to
  queue `levelsGained` drafts instead of dropping extras.
- **Explicit building picker** (#4) — now load-bearing (3 → 6 buildings); replace the implicit
  "build first affordable" with a real picker (flat grid).
- **Holistic balance** — tune enemy HP/damage/fire-rate/spawn ramp + weapon numbers with
  playtesting, done *last*, once the full content set exists.

---

## 7. Decomposition into C3 tickets

The spec is the whole vision; the plan ships it as four sequenced, independently-shippable
tickets under C3:

| Ticket | Scope | Ships independently because… |
|---|---|---|
| **RC-006** Data-driven weapons | §3a: weapons → data, multi-weapon firing loop, draft offers weapons/levels/perks, evolution mechanic | pure refactor — club + spear keep working, no new content |
| **RC-007** Enemy + biome + expedition systems | §3b/§3c + pick screen + age/tier scaling + 3 base biomes + `iron` plumbing | systems land with existing enemies before Iron content |
| **RC-008** Iron content | §4: Iron techs/buildings, Deep Caverns, Iron enemies/weapons/evolutions, sprites — **folds in RC-003** (hero shows Iron gear) | pure content on finished systems |
| **RC-009** Juice + balance | §6: juice, gem feel, #3, #4, holistic balance | tuning needs the full content set present |

RC-004 (Diablo-II multi-tier gems) stays a separate, later art ticket — out of scope here.

## 8. Testing strategy

- **Pure logic** — `weapons.ts`, `enemyData.ts`, `biomeData.ts`, `expedition.ts`, and the
  scaling math get Vitest unit tests, matching the existing `economy` / `tech` / `camp`
  boundary (50 tests green today).
- **Presentation / integration** — the firing loop, expedition pick screen, and juice get
  Playwright verification via the `verify-canvas-game-playwright` skill (expose state to
  `window`, drive input, assert live behavior, revert instrumentation before commit).

## 9. Scope & risk notes

- **This is deliberately large** — the maximal option was chosen on every fork. The four-ticket
  decomposition is the mitigation: RC-006 and RC-007 are foundations that ship value (a real
  weapon system, an expedition screen) even before any Iron content exists.
- **Minimum that proves the whole vision**: foundations + The Wilds/Deep Caverns biomes +
  Iron Working/Deep Mining + 2–3 new weapons. Frontier, the Ruins sentinel, Flame Jet, and the
  full evolution set can slip to follow-on work without invalidating the design.
- **Run feel remains load-bearing** (design spec §9 risk) — the balance pass (RC-009) is where
  the expanded roster is made to *feel* good, and it comes last for that reason.
- **Two-surface coupling** — the expedition screen is a third DOM surface alongside the civ
  screen; it must hand a clean `Expedition` descriptor to `RunScene` and nothing more.

## 10. Resolved decisions (log)

| Decision | Choice |
|---|---|
| Slice intent | Systems + content (build foundations, then author Iron) |
| Weapon model | Multi-weapon, civ-gated pool (VS-style) + perk-paired evolutions |
| Weapon slots | 4 |
| Civ ↔ weapons | Civ unlocks define the draft *pool*; start with club, draft the rest |
| Difficulty | Player picks an expedition each run |
| Expedition shape | Biomes (place + resource bias + signature enemies) |
| Iron identity | Metallurgy — deep mining & smelting; Industry+Science lean |
| Resource sourcing | Biome `resourceBias` faucets the themed resource (fixes thin explo/culture) |
| Build order | RC-006 weapons → RC-007 systems → RC-008 Iron content → RC-009 juice/balance |
| RC-003 (hero by age) | Folded into RC-008 |
| RC-004 (gems) | Out of scope — separate later ticket |
