# Rogue · Civ

A free browser game: short pixel-art survivor runs fuel a tech-tree + base-camp
civilization, climbing the ages at your own pace toward a final stand.

This repo is the **vertical slice** (P0 + P1): one survivor run, four resources,
a Stone→Bronze tech tree, a 3×3 base camp, and the full ratchet loop.

## Develop
- `npm install`
- `npm run dev` — play at the printed localhost URL
- `npm test` — run the logic unit tests
- `npm run build` — static build into `dist/`

## Design
See `docs/superpowers/specs/2026-06-05-rogue-civ-design.md` for the full design,
and `docs/superpowers/plans/2026-06-05-rogue-civ-vertical-slice.md` for this slice's plan.

## Architecture
Pure game logic (`src/economy`, `src/tech`, `src/camp`, `src/run`, `src/state`)
is unit-tested and free of Phaser/DOM. Presentation (`src/ui/civScreen.ts` DOM,
`src/scenes/RunScene.ts` Phaser) consumes that tested core. `src/main.ts` wires them.
