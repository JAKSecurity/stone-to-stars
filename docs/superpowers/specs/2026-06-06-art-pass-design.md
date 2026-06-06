# Art Pass — Design Spec

**Date:** 2026-06-06
**Status:** Approved design — ready for implementation planning
**Builds on:** the vertical slice (`2026-06-05-rogue-civ-design.md`) and the technique
distilled in `docs/research/2026-06-06-lmao-build-tips.md` (Claude authors art as
code → rendered to canvas).

---

## 1. Goal

Replace the slice's placeholder primitives (colored Phaser circles/rectangles in the run;
emoji in the civ screen) with cohesive, **Claude-authored art**, using a pipeline where the
**art is data** and the **style is a render pass** — so we ship a clean *flat* look now and
can flip to a *shaded* look globally later, with no per-asset rework.

This is a re-skin of existing content only. It is NOT a content-expansion pass and NOT a
balance pass.

## 2. Scope

**In scope** — art for everything currently placeholder in the slice:
- Run sprites: **hero** unit, **beast** enemy, **scholar** enemy, **projectile** (club shot)
  + **bronze-spear** variant, the **4 resource gems** (exploration / science / industry /
  culture). The **culture relic** reuses the culture-gem def (no separate sprite).
- Civ screen: **granary / mine / forge** buildings, **4 resource icons** (reuse the gem
  defs — DRY).

≈12 distinct sprite definitions.

**Out of scope (later phases):** new units/enemies/buildings/ages (P2 content), the shaded
renderer's bespoke per-hero tuning, skeletal/rigged animation, audio, balance.

## 3. Architecture — shape-data + render pass

### 3.1 Sprite definitions (the "art is data")
Each sprite is a small data module: an ordered list of primitives (back-to-front), each with
a base color and a semantic role. No shading baked in.

```ts
// src/art/types.ts
export type Vec = { x: number; y: number };
export type Prim =
  | { kind: 'circle'; cx: number; cy: number; r: number; color: string; role?: string }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx?: number; color: string; role?: string }
  | { kind: 'poly'; points: Array<[number, number]>; color: string; role?: string }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; width: number; color: string; role?: string };

export interface SpriteDef {
  id: string;
  w: number;            // canvas width  (sprite-local coords)
  h: number;            // canvas height
  prims: Prim[];        // drawn in order
  shadow?: boolean;     // draw a contact shadow ellipse at the base (default true)
}

export type RenderStyle = 'flat' | 'shaded';
```

A global light direction constant lives in `src/art/palette.ts` (e.g. top-left), with a
shared palette of base colors so sprites stay cohesive.

### 3.2 The renderer (the "style is a render pass")
```ts
// src/art/render.ts
export function renderSprite(ctx: CanvasRenderingContext2D, def: SpriteDef, style: RenderStyle): void
```
- `flat`: fill each primitive with its solid `color`. (Optional thin outline — off by default
  for flat.)
- `shaded`: fill each primitive with a **vertical gradient derived from its base color**
  (lighter toward the light, darker away), add an **outline**, a **contact shadow**, and a
  small **highlight** on the light-facing side. Shading is *computed* from base color + the
  global light direction — never hand-authored per sprite.

Pure, testable color helpers back this:
```ts
// src/art/color.ts
export function shade(hex: string, amount: number): string;   // amount in [-1,1]
export function gradientStops(base: string): { light: string; dark: string };
```

### 3.3 Two consumers, one source
- **Phaser run:** `renderSpriteToCanvas(def, style)` draws to an offscreen `HTMLCanvasElement`;
  at boot, a registry step registers each as a Phaser texture (`scene.textures.addCanvas(id, canvas)`).
  `RunScene` then spawns `Image`/`Sprite` by sprite id instead of `this.add.circle(...)`.
- **DOM civ screen:** the same `renderSpriteToCanvas(def, style)` output is placed into a
  small `<canvas>` inside camp tiles and resource-bar icons (replaces emoji in `civScreen.ts`).

Pre-generate all textures/canvases once at boot for performance.

## 4. Animation

Static sprite textures, with motion via **Phaser tweens / transforms** only:
idle bob, hit-flash (tint), spawn/death scale-pop, projectile travel. **No skeletal rigging**
in this pass. The shape-data structure leaves room for part-level transforms later, but we do
not build that now.

## 5. Build approach — calibrate, then parallelize

1. Build the **renderer + color helpers + one canonical sprite (the hero)** + the Phaser
   texture-registry integration + the DOM render path. Wire the hero into the run and confirm
   it renders in the actual game.
2. **Ratification gate:** review the canonical hero's look in the running game; lock the
   style/template.
3. **Fan out:** one sub-agent per remaining sprite, each producing **only a `SpriteDef`**
   (shape-data) following the canonical template + shared palette. They do not touch the
   renderer or integration. (Per `calibrate-then-parallelize`.)
4. Swap all run primitives and civ-screen emoji over to the registered sprites; visual-verify.

## 6. File structure

```
src/art/
  types.ts          # Prim, SpriteDef, RenderStyle
  palette.ts        # shared base colors + global light direction + current RenderStyle
  color.ts          # shade(), gradientStops()  (pure, tested)
  render.ts         # renderSprite(ctx, def, style), renderSpriteToCanvas(def, style)
  registry.ts       # all SpriteDefs by id; registerTextures(scene) for Phaser boot
  sprites/
    hero.ts beast.ts scholar.ts projectile.ts gems.ts buildings.ts   # SpriteDef modules
tests/
  art-color.test.ts     # shade(), gradientStops()
  art-sprites.test.ts   # every registered SpriteDef is well-formed (valid prims, in-bounds)
```
Modified: `src/scenes/RunScene.ts` (use textures), `src/ui/civScreen.ts` (canvas icons/buildings),
`src/main.ts` (boot texture registration).

## 7. Testing

- **Unit (Vitest, pure):** `shade`/`gradientStops` color math; a `validateSpriteDef` invariant
  test over the whole registry (every prim has a color, coords within `0..w/0..h`, non-empty
  polys). These stay Phaser/DOM-free.
- **Visual (Playwright):** screenshot the run and the civ screen; confirm sprites render in
  both halves and nothing regressed (boot clean, loop still works).

## 8. Risks / notes

- **Cohesion:** all sprites pull from the shared palette + canonical template; the fan-out
  agents get the hero as a worked example.
- **Performance:** textures/canvases generated once at boot, not per frame.
- **DRY:** resource icons reuse the gem `SpriteDef`s; the culture relic reuses the
  culture-gem def.
- **Flat→shaded:** flipping `RenderStyle` in `palette.ts` re-skins everything; the shaded
  renderer is built so this is a one-line switch (bespoke hero tuning deferred).

## 9. Decisions log

| Decision | Choice |
|---|---|
| Technique | Claude-authored art as **shape-data**, rendered to canvas (LMAO technique) |
| Style now / later | **Flat** now; **shaded** as a global render-pass toggle later |
| Scope | Re-skin existing slice, **both halves**; no new content |
| Animation | Static textures + Phaser tween motion; **no rigging** in v1 |
| Source of truth | One `SpriteDef` per sprite → rendered to **both** Phaser textures and DOM canvas |
| Resource icons | **Reuse** the gem `SpriteDef`s (DRY) |
| Build method | Calibrate canonical hero + renderer → ratify → fan out sub-agents (shape-data only) |
| Testing | Unit-test color math + sprite-def validity; visual-verify via Playwright |
