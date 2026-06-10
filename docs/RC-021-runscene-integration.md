# RC-021 — RunScene integration (apply AFTER rc-017 merges)

This branch ships **data + sprites + preview only**. It deliberately does **not** touch
`src/scenes/RunScene.ts`, because the unmerged `rc-017-exponential-economy` branch rewrites
that scene's `drawBackground` / `scatterObstacles` (including the obstacle collision-body
change). Wiring RunScene here would guarantee a merge conflict.

Once `rc-017` is on `main`, apply the two small edits below. Both are **visual-only** — the
obstacle collision body is unchanged, satisfying the acceptance criterion "obstacles keep
identical collision behavior."

## What this branch added

- `BiomeVisual` on `BiomeDef` (optional, additive): `{ ground, grid, speck, obstacles[] }`
  — see [src/game/types.ts](src/game/types.ts).
- Populated `visual` for all **9** biomes in [src/run/biomeData.ts](src/run/biomeData.ts).
  (The ticket said "8 biomes"; Modern's `no_mans_land` was added after the ticket was
  written, so there are 9.)
- 18 themed obstacle sprites (2 per biome) in
  [src/art/sprites/obstacles.ts](src/art/sprites/obstacles.ts), registered in
  [src/art/registry.ts](src/art/registry.ts) — so `registerTextures()` already turns each
  into a Phaser texture keyed by its sprite id at boot.

## Edit 1 — `drawBackground`: ground + grid + speck from the palette

rc-017's current body hardcodes the ground (via `setBackgroundColor(this.biome.tint)` in
`create`) and uses white grid/specks. Swap to the biome palette, falling back to `tint`/white
when `visual` is absent:

```ts
private drawBackground(width: number, height: number) {
  const v = this.biome.visual;
  // (in create(), replace setBackgroundColor(this.biome.tint) with:)
  //   this.cameras.main.setBackgroundColor(v?.ground ?? this.biome.tint);
  const gridColor = v ? Phaser.Display.Color.HexStringToColor(v.grid).color : 0xffffff;
  const speckColor = v ? Phaser.Display.Color.HexStringToColor(v.speck).color : 0xffffff;

  const grid = this.add.graphics().setDepth(-10);
  grid.lineStyle(1, gridColor, v ? 0.16 : 0.05);   // hued tints read at higher alpha than white
  const step = 96;
  for (let x = 0; x <= width; x += step) grid.lineBetween(x, 0, x, height);
  for (let y = 0; y <= height; y += step) grid.lineBetween(0, y, width, y);

  const specks = Math.min(600, Math.round((width * height) / 9000));
  for (let i = 0; i < specks; i++) {
    this.add.circle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height),
      Phaser.Math.Between(1, 2), speckColor, v ? 0.4 : 0.06).setDepth(-9);
  }
}
```

## Edit 2 — `scatterObstacles`: themed sprite instead of the dark ellipse

Keep the placement loop and the **inset circle collision body exactly as rc-017 has it**.
Only the *visible* object changes — from `this.add.ellipse(...)` to `this.add.image(...)`
using a sprite id picked from the biome's set. Add the physics body to the image the same way:

```ts
private scatterObstacles(width: number, height: number) {
  const v = this.biome.visual;
  const set = v?.obstacles ?? [];
  const count = Math.round((width * height) / 90000) + 4;
  const cx = width / 2, cy = height / 2;
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, tries = 0;
    do {
      x = Phaser.Math.Between(70, width - 70);
      y = Phaser.Math.Between(70, height - 70);
      tries++;
    } while (Phaser.Math.Distance.Between(x, y, cx, cy) < 200 && tries < 25);
    const r = Phaser.Math.Between(26, 46);

    let obj: Phaser.GameObjects.GameObject & { body: Phaser.Physics.Arcade.Body };
    if (set.length) {
      const id = set[Phaser.Math.Between(0, set.length - 1)];
      const img = this.add.image(x, y, id).setDepth(-1);
      img.setDisplaySize(r * 2, r * 2);   // match the old ellipse footprint
      obj = img as any;
    } else {
      const rock = this.add.ellipse(x, y, r * 2, r * 1.6, 0x000000, 0.4).setDepth(-1);
      rock.setStrokeStyle(2, 0xffffff, 0.08);
      obj = rock as any;
    }
    this.physics.add.existing(obj, true);
    // UNCHANGED collision body — inset circle inside the footprint (rc-017's fix):
    const cr = r * 0.8;
    (obj.body as unknown as Phaser.Physics.Arcade.StaticBody).setCircle(cr, r - cr, r - cr);
    this.obstacles.add(obj);
  }
}
```

> Note on the circle offset: rc-017 centred the body for an ellipse whose height (`r*1.6`)
> differs from its width (`r*2`), giving offsets `(r - cr, 0.8*r - cr)`. The obstacle sprites
> are square (`r*2 × r*2`), so the body should be centred symmetrically — `(r - cr, r - cr)`.
> This keeps the collider concentric with the visible prop; collision *behavior* (an inset
> circle of radius `cr = 0.8r`) is identical.

## Verification after wiring

- `npx tsc --noEmit && npx vitest run && npx vite build`
- Playwright: start a run in each biome and screenshot — confirm all 9 read distinctly and
  obstacles still block movement (push the hero into one; it should stop).
