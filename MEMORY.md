# Rogue · Civ — Memory

## What this is
A free browser game: a Phaser survivor mini-game feeds a tech-tree + base-camp civilization
(Civ I/II flavor), climbing the ages toward a final boss run ("The Last Stand"). Single-player
PvE, free, no monetization; builds to static files for GitHub Pages. Stack: TypeScript + Vite +
Phaser (run scene) + HTML/CSS DOM (civ screen).

## Current state (2026-06-07)
- **Iron + four more ages shipped (2026-06-07):** on top of RC-006/007 foundations,
  **RC-008** (Iron content, folds in **RC-003** hero-by-age) plus a nightly autonomous
  expansion — **RC-010** (N-age engine readiness: bigger camp grid + `heroByAge.ts` map) and
  **RC-011–014** four new playable ages: **Classical → Medieval → Renaissance → Industrial**
  (each = a gating tech + 3 techs, 3 buildings, a biome, 4 enemies incl. a mini-boss, 4 weapons
  + perk-paired evolutions, an age hero, sprites). Built via subagent-driven-development,
  per-age adversarially reviewed, full ladder Playwright-smoke-verified. Jeff ratified the
  sprite art (2026-06-07). **RC-016** then added the **Modern** age (mechanized warfare) + hero
  face/eye fixes (every hero now has a visible face; ratified by Jeff). **112 Vitest tests green;
  `npm run build` clean.** Now 8 ages:
  Stone→Bronze→Iron→Classical→Medieval→Renaissance→Industrial→Modern. Detail:
  `docs/NIGHTLY-REPORT-2026-06-07.md` + `docs/superpowers/plans/2026-06-07-nightly-age-expansion.md`.
- **P0+P1 vertical slice: shipped.** Full loop works end-to-end and is Playwright-verified:
  timed survivor run → bank 4 resources (exploration/science/industry/culture) → research a
  tech tree → build base-camp buildings → cross Stone→Bronze → persists to localStorage.
- **Combat bug: FIXED (2026-06-06).** `RunScene.hitEnemy` read `bullet.getData('damage')`
  AFTER `bullet.destroy()` → `undefined` → `NaN` enemy HP (un-killable). Fixed by reading
  damage before destroy + an `active` guard. See `docs/KNOWN_ISSUES.md`.
- **Art pass: SHIPPED (2026-06-06).** All run/civ placeholders replaced with Claude-authored
  sprites via a **shape-data + render-pass pipeline** (`src/art/`): types/palette, TDD'd
  color/render/registry + `validateSpriteDef`, 12 sprite defs (hero, 4 gems, 2 projectiles,
  beast + scholar, granary/mine/forge), feeding both Phaser textures (run) and DOM canvases
  (civ). Flat style now; one-line `STYLE` flip to `'shaded'` later. Hero ratified by Jeff
  (hair + spear fixes); beast + mine reimagined per Jeff feedback; mine shaft-frame layering
  fixed. Also fixed a player-hitbox regression (body was ~8×10, now ~34×42). Dev sprite
  preview at `/art-preview.html`. **50 Vitest tests green; `npm run build` clean.**
- **On `main`, pushed and in sync** with `github.com/JAKSecurity/rogue-civ` (private).
  Each ticket's feature branch is merged and deleted after its reviews + Playwright verify.

## Architecture
- Pure logic (unit-tested, no Phaser/DOM): `src/economy`, `src/tech`, `src/camp`, `src/run`, `src/state`.
- Presentation: `src/scenes/RunScene.ts` (Phaser run), `src/ui/civScreen.ts` (DOM civ screen),
  `src/main.ts` (orchestration / boot).
- Art: `src/art/` — `SpriteDef` shape-data + `renderSprite`; one `registry` feeds both
  `phaserTextures.ts` (run textures) and `domSprite.ts` (civ canvases). `STYLE` in
  `palette.ts` toggles flat/shaded globally. Pure parts unit-tested; visuals via Playwright.

## Iron slice (C3) — scoped & planned (2026-06-07)
**RC-005 delivered.** Brainstormed with Jeff; five ratified anchors: **systems+content** ·
**multi-weapon civ-gated pool w/ evolutions** (Vampire-Survivors style) · **pick an
expedition each run** · **expeditions are biomes** (place + resource bias + signature
enemies) · **Iron = metallurgy** (deep mining/smelting; Industry+Science lean). Key code
finding driving the plan: techs/buildings are already data-driven, but **weapons & enemies
are hardcoded in `RunScene`** and **difficulty doesn't scale by age** — so foundations come
before content. Spec: `docs/superpowers/specs/2026-06-06-iron-age-slice-design.md`.
Decomposed into four C3 tickets: **RC-006** weapons → **RC-007** enemy/biome/expedition
systems → **RC-008** Iron content (folds in RC-003) → **RC-009** juice + balance.

## RC-006 — data-driven weapons: SHIPPED (2026-06-07)
First Iron-slice foundation done (subagent-driven-development; merged to `main`).
`WeaponDef` catalog (`src/run/weaponData.ts`) + pure `src/run/weapons.ts` (4-slot loadout,
civ-gated draftable pool, level-ups, perk-paired evolution mechanism) with 22 new unit tests
(**72 total green**). `RunScene` now fires each equipped weapon on its own cooldown (replaced
the hardcoded club/spear conditional) and the level-up draft offers a blend of
new-weapon/level/perk/evolve. Playwright-verified live: two weapons firing at once, level-up
raises damage, trusted-click draft applies + tracks ownedPerks, no NaN. Evolution is wired
but dormant until content lands (RC-008). Deferred: retire unused `rollDraft` (RC-007);
evolution catalog-integrity test (RC-008); bullet `hitSet` perf + draft level label (RC-009).

## RC-007 — enemy/biome/expedition systems: SHIPPED (2026-06-07)
Second Iron-slice foundation done (subagent-driven; merged to `main`). Data-driven
`src/run/enemyData.ts` + `biomeData.ts` + pure `expedition.ts` (tierScaling /
availableExpeditions / pickEnemy), 14 new tests (**86 total green**). `RunScene` spawns from
the active expedition's biome with tier-scaled hp/speed/spawn-rate/drops + per-enemy
contact/xp; biome `resourceBias` faucets exploration/culture. New flat-grid **expedition pick
screen** (`src/ui/expeditionScreen.ts`) + civ→pick→run flow; `'iron'` in AGE_ORDER (plumbing,
no tech gates it yet). Playwright-verified (2 cards stone / 5 bronze; Ruins biases science;
tier-1 HP ×1.5; no NaN). **Art-free** — new enemy types/sprites + Deep Caverns are RC-008.
Note for RC-008: add `EnemyDef.name` (pick screen shows raw ids today).

## Next step
**RC-009 — Juice + balance pass** (the deferred P2, now that 8 ages of content exist): combat
juice (hit-flash, damage numbers, shake, death particles, pickup glow), gem ergonomics, the
multi-level-up draft queue fix, an explicit building picker (the building set is now ~18), and a
holistic balance pass across all ages (enemy HP/damage vs `tierScaling`, weapon numbers) via
playtesting. Write its plan first, then build via subagent-driven-development. Also open:
**RC-015** (implement `orbit`/`lob` projectile behaviors — declared in the type but unimplemented
in the run; found during the nightly expansion) and **RC-004** (D2 multi-tier gems — later art).
A 5th+ age (Modern, Atomic, Space → C4 "The Last Stand" finale) is turnkey via the
nightly-age-expansion pattern (would need `GRID_SIZE` 20→24 for more buildings).

## Key docs
- Design specs: `docs/superpowers/specs/2026-06-05-rogue-civ-design.md`,
  `docs/superpowers/specs/2026-06-06-art-pass-design.md`,
  `docs/superpowers/specs/2026-06-06-iron-age-slice-design.md` (Iron slice — current)
- Plans: `docs/superpowers/plans/2026-06-05-rogue-civ-vertical-slice.md`,
  `docs/superpowers/plans/2026-06-06-art-pass.md`,
  `docs/superpowers/plans/2026-06-06-rc006-data-driven-weapons.md` (shipped),
  `docs/superpowers/plans/2026-06-07-rc007-enemy-biome-expedition.md` (shipped),
  `docs/superpowers/plans/2026-06-07-rc008-iron-content.md` (**next to build** — has a Jeff art-ratification gate)
- Known issues: `docs/KNOWN_ISSUES.md` (combat bug resolved; remaining = P2 balance + 2 minors)
- Build-tip research: `docs/research/2026-06-06-lmao-build-tips.md`
- Hub tracking: `docs/BACKLOG.md` (registered in AI Assistant as slug `rogue-civ`)
- Tickets: `docs/tickets/` — RC-005 (Iron slice scope/plan — Delivered), RC-006 (data-driven
  weapons — next), RC-007 (enemy/biome/expedition systems), RC-008 (Iron content; folds in
  RC-003 hero age-evolution), RC-009 (juice + balance); RC-004 (D2 multi-tier gems — later art)
- Art pipeline: `src/art/` + dev preview page `art-preview.html` (`/art-preview.html` in dev)

## Commands
`npm install` · `npm run dev` · `npm test` · `npm run build`
