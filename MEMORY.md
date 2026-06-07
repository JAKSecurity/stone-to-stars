# Rogue · Civ — Memory

## What this is
A free browser game: a Phaser survivor mini-game feeds a tech-tree + base-camp civilization
(Civ I/II flavor), climbing the ages toward a final boss run ("The Last Stand"). Single-player
PvE, free, no monetization; builds to static files for GitHub Pages. Stack: TypeScript + Vite +
Phaser (run scene) + HTML/CSS DOM (civ screen).

## Current state (2026-06-06)
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
  Single branch — the art-pass / art-fixes branches were merged and deleted.

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

## Next step
**RC-006 — data-driven weapon system** (the first foundation). A build-ready, TDD,
bite-sized plan exists: `docs/superpowers/plans/2026-06-06-rc006-data-driven-weapons.md`.
Execute it via `superpowers:subagent-driven-development` (8 tasks: WeaponDef catalog →
pure `weapons.ts` logic → RunScene multi-weapon firing + blended draft → Playwright verify).
After RC-006, write the RC-007 plan, then build, etc. RC-004 (D2 gems) stays a separate
later art ticket.

## Key docs
- Design specs: `docs/superpowers/specs/2026-06-05-rogue-civ-design.md`,
  `docs/superpowers/specs/2026-06-06-art-pass-design.md`,
  `docs/superpowers/specs/2026-06-06-iron-age-slice-design.md` (Iron slice — current)
- Plans: `docs/superpowers/plans/2026-06-05-rogue-civ-vertical-slice.md`,
  `docs/superpowers/plans/2026-06-06-art-pass.md`,
  `docs/superpowers/plans/2026-06-06-rc006-data-driven-weapons.md` (next to build)
- Known issues: `docs/KNOWN_ISSUES.md` (combat bug resolved; remaining = P2 balance + 2 minors)
- Build-tip research: `docs/research/2026-06-06-lmao-build-tips.md`
- Hub tracking: `docs/BACKLOG.md` (registered in AI Assistant as slug `rogue-civ`)
- Tickets: `docs/tickets/` — RC-005 (Iron slice scope/plan — Delivered), RC-006 (data-driven
  weapons — next), RC-007 (enemy/biome/expedition systems), RC-008 (Iron content; folds in
  RC-003 hero age-evolution), RC-009 (juice + balance); RC-004 (D2 multi-tier gems — later art)
- Art pipeline: `src/art/` + dev preview page `art-preview.html` (`/art-preview.html` in dev)

## Commands
`npm install` · `npm run dev` · `npm test` · `npm run build`
