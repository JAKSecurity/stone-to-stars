# Rogue · Civ

A free browser game: short survivor runs fuel a tech-tree + base-camp
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

### Art (`src/art/`)
All sprites are Claude-authored **shape data**: each `SpriteDef` is a list of
primitives (circle/rect/poly/line) pulling colors from a shared `palette.ts`.
`render.ts` paints a def onto a 2D canvas, and one source feeds both consumers —
Phaser textures for the run (`phaserTextures.ts`) and DOM `<canvas>` icons for the
civ screen (`domSprite.ts`). The look is **flat** today; flipping `STYLE` in
`palette.ts` to `'shaded'` re-skins everything globally. `validateSpriteDef`
(unit-tested) guards every registered sprite. With the dev server running, preview
every sprite — and toggle flat/shaded — at `/art-preview.html`.
