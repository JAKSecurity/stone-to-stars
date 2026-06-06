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
  38 Vitest unit tests green; `npm run build` clean.
- **Combat bug: FIXED (2026-06-06).** Auto-attack dealt no damage — `RunScene.hitEnemy` read
  `bullet.getData('damage')` AFTER `bullet.destroy()`, so damage was `undefined` and enemy HP
  became `NaN` (un-killable). Fixed by reading damage before destroy + an `active` guard.
  Verified live (enemies die → XP → level-up → perk draft → gems collected). See
  `docs/KNOWN_ISSUES.md`.
- **Art pass: designed + planned, NOT yet built.** Execution handed to a fresh session.
- On `main`; working tree clean. **No git remote configured yet** (local only).

## Architecture
- Pure logic (unit-tested, no Phaser/DOM): `src/economy`, `src/tech`, `src/camp`, `src/run`, `src/state`.
- Presentation: `src/scenes/RunScene.ts` (Phaser run), `src/ui/civScreen.ts` (DOM civ screen),
  `src/main.ts` (orchestration / boot).

## Next step
Execute the **art pass**: `docs/superpowers/plans/2026-06-06-art-pass.md` via
`superpowers:subagent-driven-development`. Start at Task 1; **HARD STOP at the ratification gate
after Task 6** — Jeff signs off on the canonical hero sprite in the running game before the
Phase 2 per-sprite fan-out. Pipeline = shape-data + render-pass (flat now, shaded as a one-line
`STYLE` toggle in `src/art/palette.ts` later).

## Key docs
- Design specs: `docs/superpowers/specs/2026-06-05-rogue-civ-design.md`,
  `docs/superpowers/specs/2026-06-06-art-pass-design.md`
- Plans: `docs/superpowers/plans/2026-06-05-rogue-civ-vertical-slice.md`,
  `docs/superpowers/plans/2026-06-06-art-pass.md`
- Known issues: `docs/KNOWN_ISSUES.md` (combat bug resolved; remaining = P2 balance + 2 minors)
- Build-tip research: `docs/research/2026-06-06-lmao-build-tips.md`
- Hub tracking: `docs/BACKLOG.md` (registered in AI Assistant as slug `rogue-civ`)

## Commands
`npm install` · `npm run dev` · `npm test` · `npm run build`
