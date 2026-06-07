# Nightly Build Report — 2026-06-07 (for Jeff's evening review)

## TL;DR
While you slept I built **four new playable ages on top of RC-008 Iron** — Classical, Medieval,
Renaissance, Industrial — following the proven RC-008 data+sprite pattern. Everything is on branch
**`nightly-age-expansion`** (stacked off `rc-008-iron-content`). **Nothing is merged to `main`** — the
art-ratification gate still holds: every new sprite (RC-008 Iron *and* the 4 new ages) awaits your
sign-off.

- **109 Vitest tests green**, `npm run build` clean, boots with **0 console errors**.
- Each age was built by sub-agents, **adversarially reviewed (APPROVED)**, and the **full ladder
  stone→industrial was live-smoke-tested** in a real browser (all 8 biomes reachable; final-age run
  renders the new hero + enemies + mini-boss).
- Your only decision tomorrow: **ratify the sprite art (or tell me which to reimagine), then merge.**

## What "an age" includes (each, fully data-driven — no engine rewrites)
A gating tech + 3 more techs · 3 buildings · 1 biome · 4 enemies (incl. a mini-boss) · 4 base weapons
+ their 4 perk-paired evolutions · an age-specific hero · and **all sprites** (shape-data through the
real art pipeline). Plus the age plumbed into `AgeId`/`AGE_ORDER` with a tech that `gatesAge`.

## The new ladder
Stone → Bronze → Iron → **Classical → Medieval → Renaissance → Industrial** (tiers 0–6).

| Age | Gate tech | Biome | Enemies | Base weapons → evolutions | Hero |
|---|---|---|---|---|---|
| **Classical** (Greco-Roman) | Mathematics | Sunken Colosseum | Harpy, Hoplite, Centaur, **Cyclops** | Javelin→Pilum Storm · Gladius→Spatha · Ballista→Scorpion · Discus→Chakram | hero_classical (bronze cuirass, plumed helm, hoplon) |
| **Medieval** (dark-fantasy) | Feudalism | The Cursed Keep *(tech-gated: Masonry)* | Skeleton, Knight, Gargoyle, **Dragon** | Crossbow→Arbalest · Longsword→Greatsword · Halberd→Poleaxe · Flail→Morningstar | hero_medieval (full plate, great helm, kite shield) |
| **Renaissance** (early gunpowder) | Gunpowder | Plague City | Musketeer, Pikeman, Grenadier, **Dreadnought** | Musket→Rifle · Blunderbuss→Scattergun · Volley Pistols→Revolver Volley · Grenade→Cluster Bomb | hero_renaissance (buff coat, plumed hat, rapier+flintlock) |
| **Industrial** (steam & steel) | Steam Power | Foundry Wastes *(tech-gated: Electricity)* | Riveter, Steam Tank, Drone, **Mecha** | Gatling→Minigun · Flamethrower→Inferno · Dynamite→TNT Barrel · Tesla Coil→Arc Reactor | hero_industrial (riveted armor, goggles, steam-rifle) |

Other techs/buildings per age (economy/science/survivability levers): Classical adds Currency/
Engineering/Philosophy + Academy/Market/Workshop; Medieval adds Masonry/Chivalry/Guilds + Keep/
Cathedral/Armory; Renaissance adds Printing Press/Banking/Astronomy + Gunsmith/University/Bank;
Industrial adds Railroad/Electricity/Assembly Line + Factory/Power Plant/Arsenal.

## Engine/foundation changes (RC-010 — the only non-content code)
The engine was already generic for N ages (formula-based difficulty scaling, `getAge` by `AGE_ORDER`
index). I made three small foundation changes so new ages are pure data:
1. **Camp grid** `GRID_SIZE` 9→20 + CSS to 5 columns (room for all 18 buildings; each builds once).
2. **Hero-by-age** generalized from a hardcoded `=== 'iron'` ternary to a DOM-free, unit-tested map
   `src/game/heroByAge.ts` (`heroSpriteFor(age)`), so each age declares its hero in one line.
3. (Tests for both.)

## Verification evidence
- **Unit tests (109, all green):** every sprite validates through the real registry; every weapon
  `evolvesTo`/`evolveRequiresPerk` resolves (evolution-integrity test); every biome spawn id is a real
  enemy; every age's snapshot tests; the hero-by-age map; the tech DAGs. I also refactored a brittle
  hardcoded enemy-sprite allowlist into a registry-existence check (future-proof).
- **Per-age adversarial review (all APPROVED):** spec-exactness, **weapon reachability** (every base
  weapon is granted by some building/tech — no unreachable orphans), no test was *weakened* (only
  legitimately extended), no cross-age id collisions, acyclic tech prereq DAGs.
- **Live browser smoke (Playwright):** drove a real game session up the full tech ladder → Age label
  reached **Industrial**; **all 8 biomes** appeared on the expedition screen (including the three
  tech-gated ones); launched **Sunken Colosseum** (renders hero_classical + harpies + centaurs) and
  **Foundry Wastes** (renders hero_industrial + drones + the **Mecha** mini-boss with glowing furnace
  core) — **0 console errors** throughout. Screenshots attached in chat.

## ⛔ Art ratification — your call (the whole point of the gate)
First-pass sprites are authored for everything; **art is yours to ratify**. See the attached
**`/art-preview.html` full-sheet screenshot** (every registered sprite through the real pipeline) and
the in-game shots. New sprites to review: 6 heroes (incl. iron) · ~16 new enemies · ~16 new projectiles
· 12 new buildings. Tell me **which to keep and which to reimagine** and I'll iterate. My own weakest-
link flags from first pass: iron_golem seams + the foundry (from RC-008), and the projectile sprites are
necessarily minimal at 10–16px. The buildings and the new heroes/enemies read well to me.

## Known issues & notes (all non-blocking)
- **`orbit`/`lob` weapon behaviors are declared in the type but unimplemented** in the run (the firing
  code only does `straight`/`pierce`/`cone` via count/spread/pierce). I deliberately used only the
  supported behaviors. **Proposed RC-016: implement orbit/lob projectile motion** for more weapon
  variety.
- **Balance is first-pass** (anchored ~+25–30%/age over the prior tier; `tierScaling` already ramps
  difficulty). Holistic tuning is the existing **RC-009**.
- Minor cosmetics: hero consts are slightly out of chronological order in `hero.ts`; the Factory sprite
  reuses `PAL.ember`; `printing_press` tech and `university` building both grant +draftChoices (mirrors
  the existing pottery/workshop pattern). None affect correctness.
- **No formal tickets created yet** (avoided the cross-repo BACKLOG pre-commit hook during unattended
  work). Proposed tickets to open at merge: RC-010 (foundation), RC-011..014 (the ages), RC-016
  (orbit/lob). Full traceability is in the per-age commit messages + the plan doc.

## Not done (by design)
- **Not merged to main** (art gate). **RC-008 Iron art is also still pending your ratification.**
- RC-009 balance pass — later.
- A 5th age (Modern) — I stopped at 4 for quality/verification depth; the pipeline is turnkey if you
  want more (would need GRID_SIZE 20→24 for the extra buildings).

## How to review tomorrow
1. `git checkout nightly-age-expansion` · `npm install` (if needed) · `npm run dev`.
2. Open `/art-preview.html` to see all sprites; toggle scale/flat-shaded.
3. In the game, research up the tree (or seed a save) to walk the ages; launch the new biomes.
4. `npm test` (109 green) · `npm run build` (clean).
5. Tell me art verdicts → I iterate → then we merge RC-008 + the 4 ages to main together.

## Commit map (branch `nightly-age-expansion`, off `rc-008-iron-content`)
- `51de270` foundation · Classical `3620f2a`/`f18b55b`/`417ee53` · Medieval `e410a0c`/`9e53dfb`/`de3f55a`
- Renaissance `6070d8c`/`f4d52ae`/`915d0e0` · Industrial `5a82ae6`/`0e152aa`/`842ddf4`
- Plan: `docs/superpowers/plans/2026-06-07-nightly-age-expansion.md` (full design + status log).
