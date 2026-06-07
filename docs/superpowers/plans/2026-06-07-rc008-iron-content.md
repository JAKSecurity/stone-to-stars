# RC-008 — Iron Age Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This plan has a HARD RATIFICATION GATE (Phase C).** Sprite art is Jeff's creative call. Do NOT merge or mark RC-008 done until Jeff has reviewed and ratified the new sprites. The agent authors first-pass art, then pauses for Jeff.

**Goal:** Make the Iron age real — author Iron techs, buildings, the Deep Caverns biome, Iron enemies, and Iron weapons with perk-paired evolutions (all data), plus their sprites, so a player can research Iron Working → cross into Iron → run Deep Caverns with evolving iron weapons. Folds in RC-003 (hero shows Iron gear).

**Architecture:** Pure content added to the existing data-driven catalogs (`techData`/`buildingData`/`weaponData`/`enemyData`/`biomeData`) — no engine work, because RC-006/007 made all of these data-driven. New sprites are Claude-authored `SpriteDef` shape-data in `src/art/sprites/` (auto-fed to run textures + civ canvases via the registry). Three small system extensions enable spec features (`EnemyDef.name` for the pick screen, `BiomeDef.requiresTech` to tech-gate Caverns, age-aware hero sprite for RC-003).

**Tech Stack:** TypeScript + Vite + Phaser 3 + DOM + Vitest + Playwright. Art via `src/art` shape-data (`PAL` palette, `validateSpriteDef`, `/art-preview.html`).

**Spec:** `docs/superpowers/specs/2026-06-06-iron-age-slice-design.md` §4. Builds on merged RC-006 (weapons) + RC-007 (enemy/biome/expedition). **This plan is RC-008** (third C3 ticket) and **folds in RC-003** (hero-by-age). Carries forward review notes from RC-006/RC-007 (in this ticket's body).

**Balance note:** all stat/cost numbers here are reasonable first-pass values; holistic tuning is RC-009. Don't bikeshed them during the build.

---

## Phases & the ratification gate

- **Phase A** — system extensions + carryover fixes (mechanical, TDD).
- **Phase B** — Iron content data + first-pass sprites (mechanical data + creative art; Iron becomes playable).
- **Phase C** — **RATIFICATION GATE**: render all new sprites, present to Jeff, iterate until ratified.
- **Phase D** — end-to-end verification + close-out (RC-008 + RC-003 Delivered) + merge.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/game/types.ts` | `EnemyDef.name`; `BiomeDef.requiresTech?`; `RunInit`/hero-age plumbing type | Modify |
| `src/run/enemyData.ts` | add `name` to beast/scholar; add 4 Iron enemies | Modify |
| `src/run/biomeData.ts` | add Deep Caverns biome (`requiresTech`) | Modify |
| `src/run/expedition.ts` | `availableExpeditions` honors `requiresTech` | Modify |
| `src/ui/expeditionScreen.ts` | foe list uses `ENEMIES[id].name` | Modify |
| `src/ui/civScreen.ts` | age label renders all ages | Modify |
| `src/tech/techData.ts` | 4 Iron techs | Modify |
| `src/camp/buildingData.ts` | 3 Iron buildings | Modify |
| `src/run/weaponData.ts` | 4 Iron weapons + 5 evolutions; wire bronze_spear evolution | Modify |
| `src/art/palette.ts` | Iron-theme `PAL` colors | Modify |
| `src/art/sprites/enemies.ts` | 4 Iron enemy `SpriteDef`s | Modify |
| `src/art/sprites/buildings.ts` | 3 Iron building `SpriteDef`s | Modify |
| `src/art/sprites/projectiles.ts` | 4 Iron projectile `SpriteDef`s | Modify |
| `src/art/sprites/hero.ts` | `HERO_IRON` variant | Modify |
| `src/scenes/RunScene.ts` | use age-appropriate hero sprite (RC-003) | Modify |
| `src/main.ts` | pass current age into the run | Modify |
| `tests/*` | catalog-integrity + evolution + requiresTech tests | Modify/Create |

---

## PHASE A — System extensions + carryover fixes

### Task 1: `EnemyDef.name` + pick-screen display

**Files:** `src/game/types.ts`, `src/run/enemyData.ts`, `src/ui/expeditionScreen.ts`, `tests/enemyData.test.ts`

- [ ] **Step 1: Failing test** — append to `tests/enemyData.test.ts`:

```ts
it('every enemy has a non-empty display name', () => {
  for (const def of Object.values(ENEMIES)) {
    expect(typeof def.name).toBe('string');
    expect(def.name.length).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 2: Run it — FAIL** (`name` missing): `npm test -- enemyData`
- [ ] **Step 3: Add `name` to `EnemyDef`** in `src/game/types.ts` (after `id`):

```ts
export interface EnemyDef {
  id: string;
  name: string;               // player-facing label (pick screen)
  sprite: string;
  // …rest unchanged
```

- [ ] **Step 4: Populate names** in `src/run/enemyData.ts` — add `name:'Beast'` to beast and `name:'Scholar'` to scholar.
- [ ] **Step 5: Pick screen uses the name** — in `src/ui/expeditionScreen.ts`, add `import { ENEMIES } from '../run/enemyData';` and change the foe line from `Object.keys(biome.spawnTable).join(', ')` to:

```ts
const enemies = Object.keys(biome.spawnTable).map((id) => ENEMIES[id].name).join(', ');
```

- [ ] **Step 6: Run tests — PASS** (`npm test`) and **build** (`npm run build`).
- [ ] **Step 7: Commit** — `git commit -m "feat(enemies): EnemyDef.name; pick screen shows enemy names"`

### Task 2: Age label renders all ages (civScreen)

**Files:** `src/ui/civScreen.ts`

- [ ] **Step 1: Edit the age span** — replace `src/ui/civScreen.ts:41`:

```ts
ageSpan.innerHTML = `Age: <strong>${getAge(civ) === 'bronze' ? 'Bronze' : 'Stone'}</strong>`;
```

with a capitalize-all-ages version:

```ts
const age = getAge(civ);
ageSpan.innerHTML = `Age: <strong>${age.charAt(0).toUpperCase()}${age.slice(1)}</strong>`;
```

- [ ] **Step 2: Build** (`npm run build`) — clean. (No unit test; civScreen is DOM, verified in Phase D.)
- [ ] **Step 3: Commit** — `git commit -m "fix(ui): age label renders all ages (Stone/Bronze/Iron)"`

### Task 3: `BiomeDef.requiresTech` tech-gates a biome

**Files:** `src/game/types.ts`, `src/run/expedition.ts`, `tests/expedition.test.ts`

- [ ] **Step 1: Failing test** — append to `tests/expedition.test.ts`:

```ts
it('a biome with requiresTech is hidden until that tech is researched', async () => {
  const { BIOMES } = await import('../src/run/biomeData');
  // simulate a tech-gated biome by checking the filter directly via a civ that has the gate
  // (Deep Caverns lands in Phase B; here we assert the filter logic exists and excludes by default)
  const fresh = newCivState();
  const ids = availableExpeditions(fresh).map((e) => e.biomeId);
  // no biome the fresh civ lacks the tech for should appear
  for (const e of availableExpeditions(fresh)) {
    const b = BIOMES[e.biomeId];
    if (b.requiresTech) expect(fresh.researched).toContain(b.requiresTech);
  }
  expect(ids.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run it — FAIL** (`requiresTech` not on type / filter not present): `npm test -- expedition`
- [ ] **Step 3: Add `requiresTech?`** to `BiomeDef` in `src/game/types.ts`:

```ts
  spawnTable: Record<string, number>;
  requiresTech?: string;       // biome hidden until this tech is researched
  tint: string;
```

- [ ] **Step 4: Honor it in `availableExpeditions`** — in `src/run/expedition.ts`, add `import { isResearched } from '../tech/tech';` and inside the biome loop, after the `minIdx > curIdx` guard:

```ts
    if (biome.requiresTech && !isResearched(civ, biome.requiresTech)) continue;
```

- [ ] **Step 5: Run tests — PASS** (`npm test`).
- [ ] **Step 6: Commit** — `git commit -m "feat(expedition): BiomeDef.requiresTech gates a biome by tech"`

### Task 4: Evolution catalog-integrity test (carryover from RC-006)

**Files:** `tests/weaponData.test.ts`

- [ ] **Step 1: Add the test** — append to `tests/weaponData.test.ts`:

```ts
import { PERKS } from '../src/run/draft';

describe('weapon evolution integrity', () => {
  it('every evolvesTo references a real weapon and a real perk', () => {
    for (const def of Object.values(WEAPONS)) {
      if (def.evolvesTo) {
        expect(WEAPONS[def.evolvesTo]).toBeDefined();
        expect(def.evolveRequiresPerk).toBeTruthy();
        expect(PERKS.map((p) => p.id)).toContain(def.evolveRequiresPerk);
      }
    }
  });
});
```

- [ ] **Step 2: Run it — PASS now** (no weapon has `evolvesTo` yet, so the loop is vacuously true). This test becomes load-bearing in Phase B once evolutions are wired: `npm test -- weaponData`
- [ ] **Step 3: Commit** — `git commit -m "test(weapons): evolution catalog-integrity guard"`

---

## PHASE B — Iron content data + first-pass sprites

> Each task adds catalog data **and** first-pass sprites for the ids it introduces, so the build stays clean and the content is renderable+playable at every step. The art is refined at the Phase C ratification gate.

### Task 5: Iron palette colors

**Files:** `src/art/palette.ts`

- [ ] **Step 1: Add Iron-theme colors** to the `PAL` object in `src/art/palette.ts` (before the `shadow` line):

```ts
  // iron age — cold metal, cavern stone, automaton brass, molten fire
  iron: '#9aa3ab', ironDark: '#5a636b', steel: '#c0c8cf',
  caveStone: '#6b6560', caveStoneDark: '#3f3a36',
  brass: '#b9933f', brassDark: '#6f5520', rune: '#5ad1c7',
  molten: '#ff6a2b', ember: '#ffd152',
```

- [ ] **Step 2: Build** (`npm run build`) clean. **Commit** — `git commit -m "feat(art): iron-age palette colors"`

### Task 6: Iron enemies (data + first-pass sprites) + Deep Caverns biome

**Files:** `src/art/sprites/enemies.ts`, `src/run/enemyData.ts`, `src/run/biomeData.ts`, `tests/biomeData.test.ts`

- [ ] **Step 1: First-pass sprites** — in `src/art/sprites/enemies.ts`, author 4 new `SpriteDef`s and add them to the `ENEMIES` array. Brief (author prims from `PAL`; keep silhouettes distinct; `validateSpriteDef` must pass — all points within `[-1, w+1]`/`[-1, h+1]`):
  - `cave_dweller` (~26×28): small hunched scavenger, `caveStone`/`caveStoneDark`, glowing eye.
  - `rock_golem` (~38×40): bulky boulder body, `caveStone` mass with `rock` chunks, slow/heavy read.
  - `automaton` (~30×34): upright brass construct, `brass`/`brassDark` plates, a `rune` core dot.
  - `iron_golem` (~48×52): imposing iron colossus (mini-boss), `iron`/`ironDark`, `molten` seams, large.
- [ ] **Step 2: Validate sprites** — append to `tests/art-sprites.test.ts` an assertion that the 4 ids exist in `SPRITES` and pass `validateSpriteDef` (follow the file's existing pattern). Run `npm test -- art-sprites` → PASS.
- [ ] **Step 3: Enemy data** — add to `ENEMIES` in `src/run/enemyData.ts`:

```ts
  cave_dweller: { id:'cave_dweller', name:'Cave Dweller', sprite:'cave_dweller',
    baseHp:30, speed:80, contactDamage:7, drop:'industry', xp:4, displaySize:{w:26,h:28} },
  rock_golem: { id:'rock_golem', name:'Rock Golem', sprite:'rock_golem',
    baseHp:90, speed:35, contactDamage:14, drop:'industry', xp:9, displaySize:{w:38,h:40} },
  automaton: { id:'automaton', name:'Automaton', sprite:'automaton',
    baseHp:45, speed:60, contactDamage:8, drop:'science', xp:6, displaySize:{w:30,h:34} },
  iron_golem: { id:'iron_golem', name:'Iron Golem', sprite:'iron_golem',
    baseHp:200, speed:30, contactDamage:20, drop:'industry', xp:25, displaySize:{w:48,h:52} },
```

- [ ] **Step 4: Deep Caverns biome** — add to `BIOMES` in `src/run/biomeData.ts`:

```ts
  caverns: { id:'caverns', name:'Deep Caverns', minAge:'iron', requiresTech:'deep_mining',
    resourceBias:{ industry:1, science:1 },
    spawnTable:{ cave_dweller:6, automaton:3, rock_golem:2, iron_golem:1 },
    tint:'#0c0a12' },
```

(Iron Golem at weight 1 = a rare tough foe; proper mini-boss/wave timing is a later C4-finale concern — note it, don't build it here.)

- [ ] **Step 5: Run tests** — `npm test` (biomeData spawn-table integrity test already asserts every spawn id is a real enemy → now covers the Iron enemies). Build clean.
- [ ] **Step 6: Commit** — `git commit -m "feat(content): Iron enemies + Deep Caverns biome (first-pass art)"`

### Task 7: Iron buildings (data + first-pass sprites) + Iron techs

**Files:** `src/art/sprites/buildings.ts`, `src/camp/buildingData.ts`, `src/tech/techData.ts`

- [ ] **Step 1: First-pass sprites** — in `src/art/sprites/buildings.ts`, author 3 new `SpriteDef`s (96×96, reuse `hutBase()` for settlement cohesion) and add to `BUILDINGS`:
  - `smelter` — hut + a squat furnace with `molten`/`ember` glow at the mouth.
  - `foundry` — hut + a `metal`/`steel` anvil and casting-mold motif.
  - `deep_mine` — like `mine` but deeper: a larger dark shaft, `iron` ore in the cart/pile.
- [ ] **Step 2: Validate** — extend the art-sprites test for the 3 building ids; `npm test -- art-sprites` PASS.
- [ ] **Step 3: Building data** — add to `BUILDINGS` in `src/camp/buildingData.ts`:

```ts
  smelter: { id:'smelter', name:'Smelter', baseCost:{industry:40,science:20},
    yield:{industry:5}, runBonus:{ damageMult:0.10, weapons:['iron_pick'] }, maxLevel:3 },
  foundry: { id:'foundry', name:'Foundry', baseCost:{industry:35,science:35},
    yield:{science:5}, runBonus:{ damageMult:0.10, weapons:['war_hammer'] }, maxLevel:3 },
  deep_mine: { id:'deep_mine', name:'Deep Mine', baseCost:{industry:50,science:15},
    yield:{industry:8}, runBonus:{ damageMult:0.08 }, maxLevel:3 },
```

- [ ] **Step 4: Iron techs** — add to `TECHS` in `src/tech/techData.ts`:

```ts
  iron_working: { id:'iron_working', name:'Iron Working', age:'iron',
    cost:{ industry:40, science:30 }, requires:['bronze_working'],
    unlocksBuilding:'smelter', gatesAge:'iron' },
  deep_mining: { id:'deep_mining', name:'Deep Mining', age:'iron',
    cost:{ industry:35 }, requires:['iron_working'], unlocksBuilding:'deep_mine' },
  smelting: { id:'smelting', name:'Smelting', age:'iron',
    cost:{ industry:30, science:30 }, requires:['iron_working'],
    unlocksBuilding:'foundry', runBonus:{ weapons:['flame_jet'] } },
  mechanics: { id:'mechanics', name:'Mechanics', age:'iron',
    cost:{ science:45 }, requires:['smelting'], runBonus:{ weapons:['sawblade'] } },
```

- [ ] **Step 5: Run tests** — `npm test` (modifiers/tech/camp tests still green; building runBonus.weapons feed the pool). Build clean.
- [ ] **Step 6: Commit** — `git commit -m "feat(content): Iron buildings + techs (first-pass art)"`

### Task 8: Iron weapons + evolutions (data + first-pass projectile sprites)

**Files:** `src/art/sprites/projectiles.ts`, `src/run/weaponData.ts`

- [ ] **Step 1: First-pass projectile sprites** — in `src/art/sprites/projectiles.ts`, author 4 new `SpriteDef`s (`shadow:false`, ~12–16px) and add to `PROJECTILES`:
  - `shot_iron_pick` — a small `iron` throwing-pick wedge.
  - `shot_hammer` — a chunky `steel` hammer-head square.
  - `shot_sawblade` — an `iron` toothed disc (circle + jagged poly teeth).
  - `shot_flame` — a `molten`/`ember` flame teardrop.
- [ ] **Step 2: Validate** — extend the art-sprites test for the 4 projectile ids; PASS.
- [ ] **Step 3: Iron weapons + evolutions** — add to `WEAPONS` in `src/run/weaponData.ts`. Base weapons:

```ts
  iron_pick: { id:'iron_pick', name:'Iron Pick', tier:'iron', projectileSprite:'shot_iron_pick',
    cooldownMs:550, damage:18, count:1, spread:0, speed:480, behavior:'pierce', pierce:2,
    maxLevel:5, levelScaling:{ damage:6, cooldownMs:-40 },
    evolvesTo:'ricochet_pick', evolveRequiresPerk:'magnet' },
  war_hammer: { id:'war_hammer', name:'War Hammer', tier:'iron', projectileSprite:'shot_hammer',
    cooldownMs:900, damage:34, count:1, spread:0, speed:360, behavior:'straight',
    maxLevel:5, levelScaling:{ damage:10, cooldownMs:-60 },
    evolvesTo:'war_maul', evolveRequiresPerk:'vigor' },
  sawblade: { id:'sawblade', name:'Sawblade', tier:'iron', projectileSprite:'shot_sawblade',
    cooldownMs:700, damage:16, count:1, spread:0, speed:300, behavior:'pierce', pierce:4,
    maxLevel:5, levelScaling:{ damage:5 },
    evolvesTo:'buzzsaw', evolveRequiresPerk:'rapid' },
  flame_jet: { id:'flame_jet', name:'Flame Jet', tier:'iron', projectileSprite:'shot_flame',
    cooldownMs:450, damage:10, count:3, spread:0.5, speed:340, behavior:'cone',
    maxLevel:5, levelScaling:{ damage:4 },
    evolvesTo:'forgefire', evolveRequiresPerk:'sharpen' },
```

Evolved forms (reuse the base projectile sprite to avoid more art; no further `evolvesTo`):

```ts
  iron_lance: { id:'iron_lance', name:'Iron Lance', tier:'iron', projectileSprite:'shot_bronze',
    cooldownMs:520, damage:22, count:3, spread:0.2, speed:520, behavior:'pierce', pierce:3,
    maxLevel:5, levelScaling:{ damage:7 } },
  ricochet_pick: { id:'ricochet_pick', name:'Ricochet Pick', tier:'iron', projectileSprite:'shot_iron_pick',
    cooldownMs:480, damage:24, count:2, spread:0.3, speed:520, behavior:'pierce', pierce:4,
    maxLevel:5, levelScaling:{ damage:8 } },
  war_maul: { id:'war_maul', name:'War Maul', tier:'iron', projectileSprite:'shot_hammer',
    cooldownMs:820, damage:52, count:1, spread:0, speed:380, behavior:'straight',
    maxLevel:5, levelScaling:{ damage:14, cooldownMs:-60 } },
  buzzsaw: { id:'buzzsaw', name:'Buzzsaw', tier:'iron', projectileSprite:'shot_sawblade',
    cooldownMs:520, damage:22, count:2, spread:0.4, speed:340, behavior:'pierce', pierce:6,
    maxLevel:5, levelScaling:{ damage:7 } },
  forgefire: { id:'forgefire', name:'Forgefire', tier:'iron', projectileSprite:'shot_flame',
    cooldownMs:380, damage:16, count:4, spread:0.6, speed:360, behavior:'cone',
    maxLevel:5, levelScaling:{ damage:6 } },
```

Wire the existing Bronze Spear's evolution (change `bronze_spear` to add):

```ts
    evolvesTo:'iron_lance', evolveRequiresPerk:'swift',
```

- [ ] **Step 4: Run tests** — `npm test`. The evolution-integrity test (Task 4) is now load-bearing: every `evolvesTo` (iron_lance, ricochet_pick, war_maul, buzzsaw, forgefire) must exist and every `evolveRequiresPerk` (magnet/vigor/rapid/sharpen/swift) is a real perk. PASS. Build clean.
- [ ] **Step 5: Commit** — `git commit -m "feat(content): Iron weapons + perk-paired evolutions (first-pass art)"`

### Task 9: Hero shows Iron gear (folds in RC-003)

**Files:** `src/art/sprites/hero.ts`, `src/game/types.ts`, `src/scenes/RunScene.ts`, `src/main.ts`

- [ ] **Step 1: First-pass `HERO_IRON` sprite** — in `src/art/sprites/hero.ts`, author a `HERO_IRON: SpriteDef` (`id:'hero_iron'`, same canvas as `HERO`) — the hero re-skinned with iron gear (`iron`/`steel` armor over the tunic, iron spear/blade). Export it and add to the registry: in `src/art/registry.ts` change the hero import/spread to include it, e.g. `import { HERO, HERO_IRON } from './sprites/hero';` and `[HERO, HERO_IRON, ...GEMS, …]`.
- [ ] **Step 2: Validate** — extend the art-sprites test for `hero_iron`; PASS.
- [ ] **Step 3: Thread the age into the run** — add `heroSprite: string` to `RunInit` in `src/scenes/RunScene.ts`; in `create()` change `this.add.image(width/2, height/2, 'hero')` to `this.add.image(width/2, height/2, this.heroSprite)`; set `this.heroSprite = data.heroSprite` in `init()` (add a field `private heroSprite = 'hero';`).
- [ ] **Step 4: main.ts passes the age-appropriate hero** — add `import { getAge } from './tech/tech';` and in `launchExpedition`, add to the `scene.start('run', {…})` payload: `heroSprite: getAge(civ) === 'iron' ? 'hero_iron' : 'hero',`.
- [ ] **Step 5: Build** clean; `npm test` green.
- [ ] **Step 6: Commit** — `git commit -m "feat(content): hero shows Iron gear by age (RC-003)"`

---

## PHASE C — RATIFICATION GATE (Jeff's art review)

**This is a hard stop. Do not proceed to Phase D or merge without Jeff's sign-off.**

- [ ] **Step 1: Render every new sprite for review.** Start `npm run dev`; with Playwright, screenshot `/art-preview.html` (shows all registered sprites) and capture in-game shots: a Deep Caverns run (enemies + iron hero + an iron weapon firing) and the civ screen (smelter/foundry/deep_mine on the camp grid). Save the images.
- [ ] **Step 2: Present to Jeff.** Send the screenshots with a short note naming each new sprite. Ask explicitly: "Ratify these, or tell me which to reimagine?" (The hero, beast, and mine were all reworked on Jeff's feedback in the art pass — expect iteration.)
- [ ] **Step 3: Iterate.** For each sprite Jeff wants changed, re-author its prims, re-validate, re-screenshot, re-present. Repeat until Jeff ratifies all.
- [ ] **Step 4: Commit ratified art** — `git commit -m "fix(art): RC-008 Iron sprites ratified by Jeff"` (one commit per iteration round is fine).

---

## PHASE D — End-to-end verification + close-out

### Task 10: Live verification (Playwright)

Use `verify-canvas-game-playwright`. Temp-expose `window.__game`/`__setCiv` in `main.ts` (revert after). Apply the RC-006/007 lessons: headless rAF won't tick and level-ups pause the scene → drive via manual `s.update`/`s.physics.world.update` stepping and suppress `gainXp` for observation bursts.

- [ ] **Step 1: Iron progression reachable.** From a bronze civ with resources, research `iron_working` → confirm `getAge` returns `'iron'` and the civ-screen age label shows "Iron". Research `deep_mining` → confirm Deep Caverns appears on the expedition pick screen (and is absent before `deep_mining`).
- [ ] **Step 2: Deep Caverns run.** Launch Caverns; confirm Iron enemies spawn (cave_dweller/automaton/rock_golem, occasional iron_golem) with their `enemyData` HP/drops, no NaN, and the hero renders as `hero_iron`.
- [ ] **Step 3: Iron weapons + evolution.** With a Smelter/Foundry built (iron_pick/war_hammer in the pool) and `mechanics`/`smelting` (sawblade/flame_jet), draft an iron weapon in-run, level it to max, take its evolution perk, and confirm the draft offers the `evolve` option and `applyDraftOption` swaps it to the evolved weapon (e.g. sawblade+rapid → buzzsaw).
- [ ] **Step 4: Revert instrumentation; clean diff; final `npm run build && npm test`** (all green).

### Task 11: Close out RC-008 (+ RC-003)

- [ ] Mark **RC-008** and **RC-003** `Delivered` in `docs/BACKLOG.md`.
- [ ] Update `MEMORY.md` (Iron age fully playable; next = RC-009 juice/balance).
- [ ] Commit (hook renders ticket headers + projects.yaml): `git commit -m "docs: close RC-008 (Iron content) + RC-003 (hero by age)"`.
- [ ] Finish the branch via `superpowers:finishing-a-development-branch` (merge to main).

---

## Self-Review (completed by author)

**Spec coverage (§4):** Iron techs (Task 7) ✓ · Iron buildings (Task 7) ✓ · Deep Caverns biome (Task 6, tech-gated via Task 3) ✓ · Iron enemies + Iron Golem (Task 6) ✓ · Iron weapons + 5 evolutions + bronze_spear evolution (Task 8) ✓ · sprites via pipeline (Tasks 6–9, ratified Phase C) ✓ · RC-003 hero-by-age (Task 9) ✓. Carryovers: EnemyDef.name (Task 1) ✓, civScreen age label (Task 2) ✓, evolution catalog test (Task 4) ✓.

**Placeholder scan:** No TBD/TODO. Mechanical data is fully written out. Sprite *prims* are intentionally briefed not pre-drawn — authoring them is the creative deliverable, gated by Jeff in Phase C (this is by design per the chosen "unified with ratification gate" approach, not a plan gap).

**Type consistency:** `EnemyDef.name`, `BiomeDef.requiresTech`, `RunInit.heroSprite` are defined in Task 1/3/9 and consumed consistently (expeditionScreen, expedition.ts, RunScene/main). Weapon ids referenced by `evolvesTo` (iron_lance/ricochet_pick/war_maul/buzzsaw/forgefire) are all defined in Task 8; `evolveRequiresPerk` values (magnet/vigor/rapid/sharpen/swift) are the five real PERKS. Building `runBonus.weapons` (iron_pick/war_hammer) and tech `runBonus.weapons` (flame_jet/sawblade) all reference weapons defined in Task 8. `gatesAge:'iron'` matches the `'iron'` added to `AGE_ORDER` in RC-007.

**Scope/ratification:** Phase C is a hard gate — RC-008 is NOT done until Jeff ratifies the art. Mini-boss wave mechanics and holistic balance are explicitly out of scope (C4 finale / RC-009).
