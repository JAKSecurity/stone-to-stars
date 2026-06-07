# Nightly Age Expansion — Autonomous Build Plan (2026-06-07)

> **Context for any worker (incl. a resumed session):** Jeff is asleep. He explicitly
> directed: *"keep working through the night unattended … continue delivering content on as
> many of the next ages as possible. use your best judgement to review your work, make
> corrections as necessary."* He reviews tomorrow evening. **Do not merge to `main` until Jeff
> ratifies the sprite art** (standing RC-008 gate). All work lands on branch
> `nightly-age-expansion` (stacked off `rc-008-iron-content`). Self-review via build + tests +
> adversarial sub-agent review + live smoke tests. Don't stop to ask; use judgment.

## Goal
Add playable **ages beyond Iron** following the proven RC-008 data+sprite pattern (no engine
rewrites — content is data + shape-data sprites). Each age: a gating tech, 3–4 techs, 3
buildings, 1 biome, 4 enemies, 4 base weapons + their perk-paired evolutions, an age hero,
and sprites. Each is a self-contained vertical slice: build-clean, unit-tested, smoke-tested.

## Engine constraints discovered (audited 2026-06-07 — obey these)
1. **Engine is already general for N ages.** `tierScaling(tier)` is formula-based
   (`hpMult=1+0.5*tier`, `speedMult=1+0.1*tier`, `spawnRateMult=1+0.25*tier`,
   `dropMult=1+0.5*tier`); `getAge` returns the highest `gatesAge` by `AGE_ORDER` index;
   `availableExpeditions` is index-generic. Adding an age = extend `AgeId`+`AGE_ORDER` + add a
   tech with `gatesAge:<age>` + content.
2. **`WeaponDef.behavior` is declarative only.** The run firing code never switches on it; motion
   = `count`/`spread` fan + `speed` + `pierce` (data). So **only `straight`, `pierce`, `cone`
   actually do anything** (`cone` == multi-projectile fan). **Do NOT use `orbit`/`lob`** — no
   engine support (they'd fly straight). Variety comes from count/spread/speed/cooldown/damage/
   pierce/levelScaling. (Backlog: implement orbit/lob motion — see RC-016.)
3. **Camp grid caps buildings.** `GRID_SIZE` (config.ts) cells; each building builds once;
   empty-cell click auto-builds the first unlocked-unbuilt building in catalog order. With ~18
   buildings total we must raise `GRID_SIZE` (→ 20) and widen the CSS grid (→ 5 cols).
4. **Hero-by-age** was hardcoded `getAge(civ)==='iron'?'hero_iron':'hero'`. Generalized to a map
   `HERO_SPRITE_BY_AGE` (age→sprite, fallback `'hero'`); each age adds its entry.
5. Data must stay schema-valid: `EnemyDef.drop` ∈ {exploration,science,industry,culture};
   building/tech `runBonus.weapons` ref real weapon ids; `evolvesTo` refs a real weapon and
   `evolveRequiresPerk` ∈ {sharpen,rapid,swift,vigor,magnet} (guarded by the evolution-integrity
   test). Sprites must pass `validateSpriteDef` (coords within −1..w+1 / −1..h+1; circle r>0;
   rect w,h>0; poly ≥3 pts; line width>0). Build sprites back-to-front; tag prims with `role`;
   pull colors from `PAL`.

## Balance anchors (first-pass only — holistic tuning is RC-009; don't bikeshed)
- Tiers: stone0 bronze1 iron2 **classical3 medieval4 renaissance5 industrial6**. `tierScaling`
  already multiplies enemy HP by 1+0.5·tier, so **keep base-HP growth gentle (~+20–25%/age)**.
- Reference (Iron): base weapon dmg 16–34; evolved ~1.4–1.6×; enemy baseHp 30/45/90, mini-boss
  200. Each new age ≈ **+25–30% weapon dmg** and **+20–25% enemy baseHp** over the prior age's
  analogue; mini-boss weight 1 in the spawn table.
- Every age should add at least one survivability lever (a building/tech `runBonus.maxHp` or
  `damageMult`) so the player keeps pace with tier scaling.

## Branch / git
- All work on `nightly-age-expansion`. **Never** `git checkout main`/merge to main.
- Per-age: clear commits; one ticket file `docs/tickets/RC-0XX-*.md`; BACKLOG rows.
- Sub-agents: only `git add` their own files; never checkout/reset/restore/switch/amend/rebase;
  stay on `nightly-age-expansion`.

## Execution recipe (per age)
1. **Controller** finalizes the age's exact id/name lists + stat anchors + sprite briefs (in this
   doc / dispatch prompts), using the **Classical age as the calibrated template** for the rest.
2. **Implementer A:** age plumbing (`AgeId`+`AGE_ORDER`), palette colors, techs + 3 buildings
   (data + 3 building sprites), hero-map entry stub if needed.
3. **Implementer B:** biome + 4 enemies (data + 4 enemy sprites).
4. **Implementer C:** 4 weapons + their evolutions (data + 4 projectile sprites) + age hero
   (sprite + `HERO_SPRITE_BY_AGE` entry).
5. **Adversarial review** of the age's whole diff (spec + quality + any modified existing test is
   a legitimate expansion, not a weakening) + independent `npm test` / `npm run build`.
6. **Live smoke** (periodic, not necessarily every age): via the running dev server + Playwright,
   research up the ladder, confirm each age label, each new biome appears on the expedition
   screen, launch the newest biome, confirm enemies spawn + age hero renders + **no console
   errors**.
7. Commit closeout; update this doc's Status log.

---

## AGE LADDER

### Foundation (RC-010) — multi-age engine readiness  [do first]
- `GRID_SIZE` 9→20; `src/style.css` `.grid` → `repeat(5,1fr)`.
- `src/main.ts`: replace the iron-only ternary with `HERO_SPRITE_BY_AGE[getAge(civ)] ?? 'hero'`;
  define `HERO_SPRITE_BY_AGE: Partial<Record<AgeId,string>> = { iron:'hero_iron' }` (each age
  appends its entry). Keep it in one obvious place (e.g. top of main.ts or a small `src/art`
  helper).
- BACKLOG: RC-016 — implement `orbit`/`lob` projectile motion (type allows them; engine ignores).
- Tests: hero-map values are registered sprites; AGE_ORDER stays unique & ascending.

### RC-011 — CLASSICAL age (tier 3) — Greco-Roman myth  [CALIBRATION TEMPLATE]
- **Theme/palette:** marble, bronze-gold, laurel, toga, oxblood. Add to PAL e.g. `marble
  '#e8e2d0'`, `marbleDark '#b8b09a'`, `gold '#d9b44a'`, `goldDark '#9c7a25'`, `laurel '#6f8f4e'`,
  `toga '#dcd2bd'`, `oxblood '#7a2e2e'` (reuse existing bronze/brass/metal/skin where apt).
- **Techs (4):**
  - `mathematics` — gatesAge classical; requires `iron_working`; unlocksBuilding `academy`.
  - `currency` — requires mathematics; unlocksBuilding `market`.
  - `engineering` — requires mathematics; unlocksBuilding `workshop`; runBonus weapons `['ballista']`.
  - `philosophy` — requires currency; runBonus weapons `['discus']` (or maxHp/draftChoices).
- **Buildings (3):**
  - `academy` (yield science; runBonus weapons `['gladius']`).
  - `market` (yield exploration or culture; runBonus maxHp).
  - `workshop` (yield industry; runBonus damageMult; weapons via engineering tech).
- **Biome:** `colosseum` "Sunken Colosseum", minAge classical (no requiresTech). tint ~`#171019`.
- **Enemies (4):** `harpy` (fast low-HP flyer), `hoplite` (armored, slow, shield),
  `centaur` (fast charger), `cyclops` (mini-boss, slow, huge, one eye).
- **Weapons (4 base → evolved):**
  - `javelin` (pierce) → `pilum_storm` (swift)
  - `gladius` (straight, fast) → `spatha` (rapid)
  - `ballista` (pierce, slow heavy) → `scorpion` (vigor)
  - `discus` (cone) → `chakram` (sharpen)
  - Projectile sprites: `shot_javelin`, `shot_gladius`, `shot_ballista`, `shot_discus`
    (evolved forms reuse the base sprite).
- **Hero:** `hero_classical` — bronze cuirass, plumed Corinthian helm, round hoplon shield, spear.

### RC-012 — MEDIEVAL age (tier 4) — dark-fantasy chivalry
- **Theme/palette:** cold steel, stone-grey castle, royal blue, crimson heraldry, bone.
- **Gating tech:** `feudalism` (gatesAge medieval; requires a classical tech, e.g. `engineering`).
- **Techs (4):** `feudalism` (→ keep), `chivalry` (→ stable; weapon `lance_charge`),
  `masonry` (→ cathedral; runBonus maxHp), `guilds` (→ economy; weapon `crossbow`).
- **Buildings (3):** `keep` (industry+maxHp), `cathedral` (culture/science + maxHp),
  `armory` (industry; damageMult; weapons).
- **Biome:** `cursed_keep` "The Cursed Keep", minAge medieval, requiresTech `masonry` (tech-gated,
  mirrors caverns). tint very dark.
- **Enemies (4):** `skeleton` (cheap swarm), `knight` (armored, slow, tanky),
  `gargoyle` (fast flyer), `dragon` (mini-boss, huge).
- **Weapons (4→evolved):** `crossbow`(pierce)→`arbalest`, `longsword`(straight)→`greatsword`,
  `halberd`(pierce)→`poleaxe`, `flail`(cone, swung)→`morningstar`. Projectile sprites:
  `shot_bolt`, `shot_slash`, `shot_halberd`, `shot_flail`.
- **Hero:** `hero_medieval` — full plate, great helm, kite shield, longsword.

### RC-013 — RENAISSANCE age (tier 5) — early gunpowder
- **Theme/palette:** blued steel, walnut wood, brass, powder-smoke grey, gunfire orange.
- **Gating tech:** `gunpowder` (gatesAge renaissance; requires a medieval tech, e.g. `guilds`).
- **Techs (4):** `gunpowder` (→ gunsmith; weapon `musket`), `printing_press` (→ university;
  draftChoices), `banking` (→ bank; economy), `astronomy` (weapon `volley_pistols`).
- **Buildings (3):** `gunsmith` (industry; damageMult; weapons), `university` (science;
  draftChoices), `bank` (exploration/culture; maxHp).
- **Biome:** `plague_city` "Plague City", minAge renaissance. tint sickly dark green-grey.
- **Enemies (4):** `musketeer` (ranged-look, medium), `halberdier` (armored, slow),
  `grenadier` (fast, high contact), `dreadnought` (mini-boss, armored colossus).
- **Weapons (4→evolved):** `musket`(straight, high dmg slow)→`rifle`,
  `blunderbuss`(cone, many)→`scattergun`, `volley_pistols`(straight, count)→`revolver_volley`,
  `grenade`(cone, aoe-ish via count)→`cluster_bomb`. Projectile sprites: `shot_musket`,
  `shot_pellet`, `shot_pistol`, `shot_grenade`.
- **Hero:** `hero_renaissance` — buff coat + breastplate, plumed hat, rapier + flintlock.

### RC-014 — INDUSTRIAL age (tier 6) — steam & steel  [STRETCH]
- **Theme/palette:** riveted iron, brass pipes, coal-black, steam-white, electric cyan, furnace
  orange.
- **Gating tech:** `steam_power` (gatesAge industrial; requires a renaissance tech, e.g. `banking`).
- **Techs (4):** `steam_power` (→ factory; weapon `gatling`), `railroad` (→ depot; economy),
  `electricity` (→ powerplant; damageMult; weapon `tesla_coil`*see note), `assembly_line`
  (draftChoices). *Tesla = straight/pierce reskin (no real chain — note it).
- **Buildings (3):** `factory` (industry; damageMult; weapons), `powerplant` (science;
  damageMult), `arsenal` (industry; maxHp; weapons).
- **Biome:** `foundry_wastes` "Foundry Wastes", minAge industrial, requiresTech `electricity`.
  tint coal-black w/ ember.
- **Enemies (4):** `riveter` (small fast bot), `steam_tank` (slow tanky), `drone` (fast flyer),
  `mecha` (mini-boss, towering).
- **Weapons (4→evolved):** `gatling`(straight, very fast)→`minigun`,
  `flamethrower`(cone)→`inferno`, `dynamite`(cone/count)→`tnt_barrel`,
  `tesla_coil`(pierce)→`arc_reactor`. Projectile sprites: `shot_bullet`, `shot_fire`,
  `shot_dynamite`, `shot_spark`.
- **Hero:** `hero_industrial` — riveted armor/coat, goggles, steam-rifle.

---

## Status log
- [x] Foundation analysis complete (engine general; constraints catalogued above).
- [x] RC-010 foundation — GRID_SIZE 9→20, 5-col grid, hero-by-age map (`heroByAge.ts`), tests. `51de270`
- [x] RC-011 Classical — `3620f2a` (A) `f18b55b` (B) `417ee53` (C). Reviewed APPROVED. Live-smoked end-to-end.
- [x] RC-012 Medieval — `e410a0c` (A) `9e53dfb` (B) `de3f55a` (C). Reviewed APPROVED.
- [x] RC-013 Renaissance — `6070d8c` (A) `f4d52ae` (B) `915d0e0` (C). Reviewed APPROVED.
- [x] RC-014 Industrial — `5a82ae6` (A) `0e152aa` (B) `842ddf4` (C). Reviewed APPROVED.
- [x] Consolidated live progression smoke (stone→industrial) — all 8 biomes reachable; Foundry Wastes
      run renders hero_industrial + drones + mecha mini-boss; **0 console errors**. (Earlier: Sunken
      Colosseum run rendered hero_classical + harpies + centaurs, 0 errors.)
- [x] Morning report for Jeff — `docs/NIGHTLY-REPORT-2026-06-07.md`.
- [ ] (Pending Jeff) Art ratification of ALL new sprites (RC-008 iron + RC-011..014). NOT merged to main.
- [ ] (Pending Jeff/merge) Create formal tickets RC-010..016; RC-016 = implement orbit/lob projectile motion.
- [ ] (Later) RC-009 holistic balance pass.

**Final state:** branch `nightly-age-expansion`, 109 Vitest tests green, `npm run build` clean, boots with
0 console errors. 4 new playable ages on top of RC-008 Iron. Decision to stop at 4 (vs a 5th Modern age)
was a quality-over-quantity call — the pipeline is turnkey for more. Nothing merged to main (art gate).

> RC-008 (Iron) status: code complete, 93 tests green, boots clean (smoke-tested). **Art
> ratification still pending Jeff.** Not merged. Its closeout (trackers) folds into the morning
> report along with the new ages.
