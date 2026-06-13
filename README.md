# Stone to Stars

**Lead a civilization from the Stone Age to the stars — one desperate survivor run at a time.**

Stone to Stars fuses a survivor-style **auto-battler** with an empire-building **tech tree**. Each
expedition drops you into the wilds: dodge the swarm with **WASD** while your weapons fire on
their own, and haul back the gems you collect. Spend that haul on technology and buildings that
carry your people through the ages — Stone, Bronze, Iron… all the way to **Space** — making every
future run deadlier in your favor. Death is never the end: whatever your civilization banks, it
keeps. Climb high enough and you'll face **The Last Stand** — a final wave of alien invaders and
their mothership, with your whole civilization on the line.

> **▶ Play:** _coming soon on itch.io_

## Controls
- **Move** — W A S D
- **Attack** — automatic; your weapons fire on their own
- **Active item** — right-click (aims at the cursor; only if you've equipped one)
- **Pause** — Esc
- **Collect** — walk near gems to vacuum them in
- **Level up** — choose one card from the draft

**The loop:** Run → gather → research & grow your camp → return stronger → climb the ages → win The Last Stand.

## What it is
A complete browser roguelite, built in TypeScript with a test-first, spec-driven workflow and
intensive AI pair-programming:
- **Nine ages**, Stone → Space, each with its own techs, buildings, enemies, biome, and hero look.
- **A survivor-run core** — timed combat expeditions that drop four resources
  (exploration / science / industry / culture).
- **A tech tree + base camp** that ratchet your civilization forward; the camp grows outward from a
  central core as you advance.
- **Build variety** — a Forge & Fuse weapon system, sidegrade passives with rare relics, culture
  traditions, dungeon expeditions, and risk/reward wagers.
- **The Last Stand** — a space-invaders-style finale: alien formation waves and a multi-phase
  mothership, with a victory screen and a persistent win.

## Develop
- `npm install`
- `npm run dev` — play at the printed localhost URL
- `npm test` — run the logic unit tests (477+ vitest cases)
- `npm run build` — static build into `dist/` (no backend; hostable anywhere)

With the dev server running you can also open `/art-preview.html` (every sprite, flat/shaded) and
`/art-ratify.html` (the latest art batch).

## Design
Full design history lives in `docs/superpowers/specs/` and `docs/superpowers/plans/`; the original
design is `docs/superpowers/specs/2026-06-05-rogue-civ-design.md`. Backlog and ticket history are in
`docs/BACKLOG.md` and `docs/tickets/`.

## Architecture
Pure game logic (`src/economy`, `src/tech`, `src/camp`, `src/run`, `src/state`) is unit-tested and
free of Phaser/DOM. Presentation (`src/ui/*.ts` DOM screens, `src/scenes/RunScene.ts` Phaser)
consumes that tested core. `src/main.ts` wires them together.

### Art (`src/art/`)
All sprites are **shape data**: each `SpriteDef` is a list of primitives (circle/rect/poly/line)
pulling colors from a shared `palette.ts`. `render.ts` paints a def onto a 2D canvas, and one source
feeds both consumers — Phaser textures for the run (`phaserTextures.ts`) and DOM `<canvas>` icons for
the civ screen (`domSprite.ts`). The look is **flat** today; flipping `STYLE` in `palette.ts` to
`'shaded'` re-skins everything globally. `validateSpriteDef` (unit-tested) guards every registered
sprite.
