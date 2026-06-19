# Mobile-Friendly Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Stone to Stars playable and pleasant on phones (polished mobile web) through the existing GitHub Pages URL — floating-joystick touch controls, landscape-only handling, tap-to-place city building, responsive menus, and an installable PWA.

**Architecture:** One responsive build gated on a single touch-detection helper. The run gets a Phaser-side `TouchControls` overlay (floating joystick + ⚡/⏸ buttons) feeding the existing movement/active code paths; the DOM menus get responsive CSS and a tap-to-place state machine replacing native drag-and-drop; PWA/fullscreen polish via `vite-plugin-pwa`. Pure logic (detection, joystick math, valid-target tiles) is unit-tested in vitest; overlays are verified on-device/Playwright.

**Tech Stack:** TypeScript, Phaser 3.80, Vite 5, Vitest 1.6 (`environment: 'node'`), `vite-plugin-pwa`.

**Spec:** [docs/superpowers/specs/2026-06-18-mobile-friendly-design.md](../specs/2026-06-18-mobile-friendly-design.md) · **Ticket:** RC-043 (mobile support)

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/platform/device.ts` (new) | `isTouchDevice()` — single source of truth for touch gating |
| `src/scenes/touchMath.ts` (new) | Pure joystick vector + active-aim math (`Vec2`, `joystickVector`, `activeAimPoint`) |
| `src/scenes/touchControls.ts` (new) | `TouchControls` Phaser overlay (floating joystick + ⚡/⏸ buttons) |
| `src/scenes/RunScene.ts` (modify) | Merge joystick into movement; `addPointer(2)`; wire touch buttons; nearest-enemy active path |
| `src/ui/placement.ts` (new) | Pure `validTargetTiles(civ, selection)` for tap-to-place |
| `src/ui/civScreen.ts` (modify) | Replace drag-and-drop with tap-to-place state machine |
| `src/style.css` (modify) | Responsive grids, tap-to-place highlights, rotate gate, tap-target sizing, `touch-action` |
| `index.html` (modify) | Viewport flags, `#rotate` overlay, manifest/apple-touch links |
| `src/main.ts` (modify) | `body.touch` class, orientation pause, fullscreen request |
| `vite.config.ts` (modify) | `vite-plugin-pwa` (manifest + service worker) |
| `pwa-assets.config.ts` (new) + `public/logo.svg` (new) | PWA icon generation source/config |
| `src/ui/helpCard.ts` (modify) | Device-aware controls list |
| `tests/device.test.ts`, `tests/touchMath.test.ts`, `tests/placement.test.ts` (new) | Unit tests for the pure modules |

---

## Task 1: Device detection

**Files:**
- Create: `src/platform/device.ts`
- Test: `tests/device.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/device.test.ts
import { describe, it, expect } from 'vitest';
import { isTouchDevice } from '../src/platform/device';

describe('isTouchDevice', () => {
  it('true when the device reports a coarse pointer', () => {
    const win = { matchMedia: (q: string) => ({ matches: q === '(pointer: coarse)' }) };
    expect(isTouchDevice(win)).toBe(true);
  });

  it('true when navigator reports touch points', () => {
    const win = { matchMedia: () => ({ matches: false }), navigator: { maxTouchPoints: 5 } };
    expect(isTouchDevice(win)).toBe(true);
  });

  it('true when ontouchstart is present', () => {
    const win = { matchMedia: () => ({ matches: false }), ontouchstart: null };
    expect(isTouchDevice(win)).toBe(true);
  });

  it('false on a plain mouse/keyboard device', () => {
    const win = { matchMedia: () => ({ matches: false }), navigator: { maxTouchPoints: 0 } };
    expect(isTouchDevice(win)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/device.test.ts`
Expected: FAIL — cannot find module `../src/platform/device`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/platform/device.ts
// Single source of truth for "this is a touch-first device". Injectable for testing.
interface WinLike {
  matchMedia?: (q: string) => { matches: boolean };
  navigator?: { maxTouchPoints?: number };
  ontouchstart?: unknown;
}

export function isTouchDevice(win: WinLike = globalThis as unknown as WinLike): boolean {
  if (win.matchMedia?.('(pointer: coarse)')?.matches) return true;
  if ((win.navigator?.maxTouchPoints ?? 0) > 0) return true;
  return 'ontouchstart' in win;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/device.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/platform/device.ts tests/device.test.ts
git commit -m "feat(RC-043): touch-device detection helper"
```

---

## Task 2: Joystick + active-aim math (pure)

**Files:**
- Create: `src/scenes/touchMath.ts`
- Test: `tests/touchMath.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/touchMath.test.ts
import { describe, it, expect } from 'vitest';
import { joystickVector, activeAimPoint } from '../src/scenes/touchMath';

describe('joystickVector', () => {
  it('points right at half magnitude when dragged right by half the radius', () => {
    const v = joystickVector({ x: 0, y: 0 }, { x: 30, y: 0 }, 60);
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(0);
    expect(v.magnitude).toBeCloseTo(0.5);
  });

  it('clamps magnitude to 1 beyond the max radius', () => {
    const v = joystickVector({ x: 0, y: 0 }, { x: 600, y: 0 }, 60);
    expect(v.magnitude).toBe(1);
  });

  it('returns a zero vector inside the deadzone', () => {
    const v = joystickVector({ x: 0, y: 0 }, { x: 2, y: 0 }, 60);
    expect(v).toEqual({ x: 0, y: 0, magnitude: 0 });
  });
});

describe('activeAimPoint', () => {
  it('returns the target position when an enemy exists', () => {
    expect(activeAimPoint(100, 100, { x: 250, y: 80 }, { x: 0, y: -1 })).toEqual({ x: 250, y: 80 });
  });

  it('fires along the last move direction when no enemy', () => {
    const p = activeAimPoint(100, 100, null, { x: 1, y: 0 }, 200);
    expect(p.x).toBeCloseTo(300);
    expect(p.y).toBeCloseTo(100);
  });

  it('fires straight up when no enemy and no movement', () => {
    const p = activeAimPoint(100, 100, null, { x: 0, y: 0 }, 200);
    expect(p).toEqual({ x: 100, y: -100 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/touchMath.test.ts`
Expected: FAIL — cannot find module `../src/scenes/touchMath`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/scenes/touchMath.ts
export interface Vec2 { x: number; y: number; }

/** Direction + clamped magnitude from a joystick origin to the current touch point.
 *  x/y are a unit direction (0 when below the deadzone); magnitude is 0..1. */
export function joystickVector(
  origin: Vec2, current: Vec2, maxRadius: number, deadzone = 0.12,
): { x: number; y: number; magnitude: number } {
  const dx = current.x - origin.x;
  const dy = current.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return { x: 0, y: 0, magnitude: 0 };
  const magnitude = Math.min(dist / maxRadius, 1);
  if (magnitude < deadzone) return { x: 0, y: 0, magnitude: 0 };
  return { x: dx / dist, y: dy / dist, magnitude };
}

/** Where the touch ⚡ active should aim: the nearest enemy if any, else along the last
 *  movement direction, else straight up. Returns a WORLD point. */
export function activeAimPoint(
  px: number, py: number, target: Vec2 | null, lastDir: Vec2, reach = 200,
): Vec2 {
  if (target) return { x: target.x, y: target.y };
  const len = Math.hypot(lastDir.x, lastDir.y);
  if (len > 0) return { x: px + (lastDir.x / len) * reach, y: py + (lastDir.y / len) * reach };
  return { x: px, y: py - reach };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/touchMath.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/touchMath.ts tests/touchMath.test.ts
git commit -m "feat(RC-043): pure joystick + active-aim math"
```

---

## Task 3: TouchControls overlay

No unit test — this is Phaser rendering/input, verified on-device in Task 10. It is built entirely on the Task 2 math.

**Files:**
- Create: `src/scenes/touchControls.ts`

- [ ] **Step 1: Write the overlay class**

```typescript
// src/scenes/touchControls.ts
import Phaser from 'phaser';
import { joystickVector, Vec2 } from './touchMath';

export interface TouchControlsCallbacks {
  onActive: () => void;
  onPause: () => void;
}

/** On-screen touch controls pinned to the camera: a floating joystick in the left ~45%
 *  of the screen and two right-thumb buttons (⚡ active, ⏸ pause). Movement is read each
 *  frame via moveVector(). Created only on touch devices (see isTouchDevice). */
export class TouchControls {
  private readonly maxRadius = 60;
  private joyPointerId: number | null = null;
  private origin: Vec2 = { x: 0, y: 0 };
  private vec = { x: 0, y: 0, magnitude: 0 };

  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private activeBtn: Phaser.GameObjects.Container;
  private pauseBtn: Phaser.GameObjects.Container;

  constructor(private scene: Phaser.Scene, private cbs: TouchControlsCallbacks) {
    const D = 1000; // above all in-run HUD (HUD uses depth 10)

    this.base = scene.add.circle(0, 0, this.maxRadius, 0x6cf, 0.10)
      .setStrokeStyle(2, 0x66ccff, 0.5).setScrollFactor(0).setDepth(D).setVisible(false);
    this.thumb = scene.add.circle(0, 0, 22, 0x66ccff, 0.9)
      .setScrollFactor(0).setDepth(D).setVisible(false);

    this.activeBtn = this.makeButton('⚡', () => this.cbs.onActive(), 0x3fb950, D);
    this.pauseBtn = this.makeButton('⏸', () => this.cbs.onPause(), 0x5a6472, D);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.scale.on('resize', this.layout, this);
    this.layout();
  }

  private makeButton(label: string, cb: () => void, ring: number, depth: number): Phaser.GameObjects.Container {
    const r = 34;
    const circle = this.scene.add.circle(0, 0, r, 0x21262d, 0.85).setStrokeStyle(2, ring, 0.8);
    const text = this.scene.add.text(0, 0, label, { fontSize: '26px', color: '#ffffff' }).setOrigin(0.5);
    const c = this.scene.add.container(0, 0, [circle, text]).setScrollFactor(0).setDepth(depth);
    c.setSize(r * 2, r * 2);
    c.setInteractive(new Phaser.Geom.Circle(0, 0, r), Phaser.Geom.Circle.Contains);
    c.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      cb();
    });
    return c;
  }

  /** Position the joystick zone hint is implicit (left 45%); lay out the right-thumb buttons. */
  private layout(): void {
    const w = this.scene.scale.width, h = this.scene.scale.height;
    this.activeBtn.setPosition(w - 56, h - 56);
    this.pauseBtn.setPosition(w - 132, h - 52);
  }

  private inJoystickZone(p: Phaser.Input.Pointer): boolean {
    return p.x <= this.scene.scale.width * 0.45;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.joyPointerId !== null || !this.inJoystickZone(p)) return;
    this.joyPointerId = p.id;
    this.origin = { x: p.x, y: p.y };
    this.base.setPosition(p.x, p.y).setVisible(true);
    this.thumb.setPosition(p.x, p.y).setVisible(true);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.joyPointerId) return;
    this.vec = joystickVector(this.origin, { x: p.x, y: p.y }, this.maxRadius);
    this.thumb.setPosition(
      this.origin.x + this.vec.x * this.vec.magnitude * this.maxRadius,
      this.origin.y + this.vec.y * this.vec.magnitude * this.maxRadius,
    );
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.joyPointerId) return;
    this.joyPointerId = null;
    this.vec = { x: 0, y: 0, magnitude: 0 };
    this.base.setVisible(false);
    this.thumb.setVisible(false);
  }

  /** Movement vector for RunScene.update — components in [-1, 1] (analog). */
  moveVector(): Vec2 {
    return { x: this.vec.x * this.vec.magnitude, y: this.vec.y * this.vec.magnitude };
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.scale.off('resize', this.layout, this);
    this.base.destroy(); this.thumb.destroy();
    this.activeBtn.destroy(); this.pauseBtn.destroy();
  }
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). The class is unused until Task 4 — that is fine.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/touchControls.ts
git commit -m "feat(RC-043): TouchControls overlay (floating joystick + action buttons)"
```

---

## Task 4: Wire TouchControls into RunScene

**Files:**
- Modify: `src/scenes/RunScene.ts` (imports; field declarations; `create()` near lines 351-379; `update()` movement at lines 738-744; new `useActiveAtNearest()` method)

- [ ] **Step 1: Add imports**

Near the other `./` imports at the top of `src/scenes/RunScene.ts`, add:

```typescript
import { isTouchDevice } from '../platform/device';
import { TouchControls } from './touchControls';
import { activeAimPoint, Vec2 } from './touchMath';
```

- [ ] **Step 2: Add fields**

In the `RunScene` class field declarations (alongside `private keys` etc.), add:

```typescript
  private touch?: TouchControls;
  private lastMoveDir: Vec2 = { x: 0, y: -1 };
```

- [ ] **Step 3: Create the controls and enable multi-touch in `create()`**

Immediately after the existing `this.input.mouse?.disableContextMenu();` / pointer wiring block (around line 363-368), add:

```typescript
    // RC-043: enable a 2nd touch pointer so the joystick and a button can be held together
    // (Phaser tracks one touch pointer by default), then mount the touch overlay on touch devices.
    this.input.addPointer(2);
    if (isTouchDevice()) {
      this.touch = new TouchControls(this, {
        onActive: () => this.useActiveAtNearest(),
        onPause: () => this.togglePauseMenu(),
      });
    }
```

In the existing `this.events.once('shutdown', …)` cleanup (around line 376-379), add as the first line inside the handler:

```typescript
      this.touch?.destroy(); this.touch = undefined;
```

- [ ] **Step 4: Merge the joystick into movement in `update()`**

Replace the current movement block (lines 738-744):

```typescript
    const speed = 180 * RUN_SCALE * this.stats.moveSpeedMult;
    const b = this.player.body;
    b.setVelocity(0);
    if (this.keys.left.isDown) b.setVelocityX(-speed);
    if (this.keys.right.isDown) b.setVelocityX(speed);
    if (this.keys.up.isDown) b.setVelocityY(-speed);
    if (this.keys.down.isDown) b.setVelocityY(speed);
```

with:

```typescript
    const speed = 180 * RUN_SCALE * this.stats.moveSpeedMult;
    const b = this.player.body;
    b.setVelocity(0);
    const tv = this.touch?.moveVector();
    if (tv && (tv.x !== 0 || tv.y !== 0)) {
      // Touch: analog joystick (components already in [-1, 1]).
      b.setVelocity(tv.x * speed, tv.y * speed);
      this.lastMoveDir = { x: tv.x, y: tv.y };
    } else {
      // Desktop: unchanged WASD behavior.
      if (this.keys.left.isDown) b.setVelocityX(-speed);
      if (this.keys.right.isDown) b.setVelocityX(speed);
      if (this.keys.up.isDown) b.setVelocityY(-speed);
      if (this.keys.down.isDown) b.setVelocityY(speed);
      if (b.velocity.x !== 0 || b.velocity.y !== 0) {
        this.lastMoveDir = { x: Math.sign(b.velocity.x), y: Math.sign(b.velocity.y) };
      }
    }
```

- [ ] **Step 5: Add the nearest-enemy active method**

Directly below the existing `private useActive(x: number, y: number) { … }` method (ends ~line 1173), add:

```typescript
  /** RC-043: the touch ⚡ button — fire the active at the nearest enemy (no cursor on touch),
   *  falling back to the last movement direction, then straight up. */
  private useActiveAtNearest(): void {
    const t = this.nearestEnemy() as { x: number; y: number } | null;
    const aim = activeAimPoint(this.player.x, this.player.y, t ? { x: t.x, y: t.y } : null, this.lastMoveDir);
    this.useActive(aim.x, aim.y);
  }
```

- [ ] **Step 6: Verify build + existing tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc PASS; all existing tests still green (no behavior change off-touch).

- [ ] **Step 7: Commit**

```bash
git add src/scenes/RunScene.ts
git commit -m "feat(RC-043): drive movement + active from touch controls; enable multi-touch"
```

---

## Task 5: Valid-target tiles (pure)

**Files:**
- Create: `src/ui/placement.ts`
- Test: `tests/placement.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/placement.test.ts
import { describe, it, expect } from 'vitest';
import { validTargetTiles } from '../src/ui/placement';
import { newCivState } from '../src/state/civState';
import { research } from '../src/tech/tech';
import { build, unlockedTileCount } from '../src/camp/camp';

const RICH = { exploration: 99999, science: 99999, industry: 99999, culture: 99999 };

describe('validTargetTiles', () => {
  it('a new building can target any unlocked empty tile, excluding occupied ones', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 12); // tile 12 = always-unlocked center
    const targets = validTargetTiles(civ, { kind: 'new', id: 'granary' });
    expect(targets.has(12)).toBe(false);
    expect(targets.size).toBe(unlockedTileCount(civ) - 1);
  });

  it('a move excludes the source tile and all occupied tiles', () => {
    let civ = { ...newCivState(), banked: { ...RICH } };
    civ = research(civ, 'pottery');
    civ = build(civ, 'granary', 12);
    const targets = validTargetTiles(civ, { kind: 'move', from: 12 });
    expect(targets.has(12)).toBe(false);
    expect(targets.size).toBe(unlockedTileCount(civ) - 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/placement.test.ts`
Expected: FAIL — cannot find module `../src/ui/placement`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/ui/placement.ts
import { CivState } from '../game/types';
import { tileUnlocked, tileOccupied } from '../camp/camp';
import { GRID_SIZE } from '../game/config';

export type Selection =
  | { kind: 'new'; id: string }
  | { kind: 'move'; from: number };

/** Tiles a currently-armed selection may legally target: unlocked, empty, and (for a
 *  move) not the source tile. Pure — drives the tap-to-place highlight + commit. */
export function validTargetTiles(civ: CivState, sel: Selection): Set<number> {
  const out = new Set<number>();
  for (let tile = 0; tile < GRID_SIZE; tile++) {
    if (!tileUnlocked(civ, tile)) continue;
    if (tileOccupied(civ, tile)) continue;
    if (sel.kind === 'move' && sel.from === tile) continue;
    out.add(tile);
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/placement.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/placement.ts tests/placement.test.ts
git commit -m "feat(RC-043): pure valid-target-tiles for tap-to-place"
```

---

## Task 6: Tap-to-place in the city screen

Replaces native drag-and-drop with a tap-to-arm → tap-to-place state machine. Upgrades stay on the "Your Buildings" list (unchanged), so a placed grid-cell tap is free to mean "move this".

**Files:**
- Modify: `src/ui/civScreen.ts` (remove `didDrag` at line 95; rework the camp grid loop ~lines 212-269; rework the palette card handlers ~lines 341-350; update the two empty-state copy strings; add an import)

- [ ] **Step 1: Add the import**

With the other imports at the top of `src/ui/civScreen.ts`, add:

```typescript
import { validTargetTiles, Selection } from './placement';
```

- [ ] **Step 2: Replace the `didDrag` declaration with tap-to-place state**

Replace line 95 (`let didDrag = false;`) with:

```typescript
  // RC-043: tap-to-place state (replaces native drag-and-drop). `armed` is the building/move
  // currently picked; `cells` maps tile → its grid element so we can repaint highlights without
  // a full civ re-render. State resets naturally on the next renderCivScreen (after a build/move).
  let armed: Selection | null = null;
  let armedEl: HTMLElement | null = null;
  const cells = new Map<number, HTMLElement>();

  function refreshHighlights() {
    const targets = armed ? validTargetTiles(civ, armed) : new Set<number>();
    for (const [tile, el] of cells) el.classList.toggle('place-target', targets.has(tile));
  }
  function setArmed(next: Selection | null, el: HTMLElement | null) {
    armed = next;
    if (armedEl && armedEl !== el) armedEl.classList.remove('armed');
    armedEl = next ? el : null;
    if (armedEl) armedEl.classList.add('armed'); else el?.classList.remove('armed');
    refreshHighlights();
  }
  function commitTo(tile: number) {
    if (!armed) return;
    if (armed.kind === 'new') cb.onBuild(armed.id, tile);          // → re-render, armed resets
    else if (armed.from !== tile) cb.onMoveBuilding(armed.from, tile);
  }
```

- [ ] **Step 3: Replace the camp grid cell loop**

Replace the loop body that builds each cell (currently lines 212-269, from `for (let tile = 0; …` through the `grid.appendChild(cell);` that closes the loop) with:

```typescript
  for (let tile = 0; tile < GRID_SIZE; tile++) {
    const placed = civ.buildings.find((b) => b.tile === tile);
    const unlocked = tileUnlocked(civ, tile);
    const cell = document.createElement('div');
    cell.className = 'cell';
    cells.set(tile, cell);

    // Locked, empty tiles are faint wilderness — not interactive.
    if (!unlocked && !placed) {
      cell.classList.add('locked-tile');
      cell.innerHTML = '';
      grid.appendChild(cell);
      continue;
    }

    if (placed) {
      const def = BUILDINGS[placed.id];
      cell.innerHTML = '';
      cell.appendChild(spriteCanvas(placed.id, 120));
      const lvl = document.createElement('span');
      lvl.className = 'lvl';
      lvl.textContent = `${def.name} L${placed.level}`;
      cell.appendChild(lvl);
      cell.title = 'Tap to move — upgrade from the list below';
      // Tapping a placed building arms a MOVE from this tile (toggle). Upgrades live in the list.
      cell.onclick = () => {
        if (armed && armed.kind === 'move' && armed.from === tile) setArmed(null, cell);
        else setArmed({ kind: 'move', from: tile }, cell);
      };
    } else {
      cell.innerHTML = '<span class="lvl">empty</span>';
      // Tapping an empty, valid target commits the armed selection here.
      cell.onclick = () => {
        if (armed && validTargetTiles(civ, armed).has(tile)) commitTo(tile);
      };
    }
    grid.appendChild(cell);
  }
```

- [ ] **Step 4: Replace the palette card interaction**

In the available-buildings palette loop, replace the affordable-card block (currently lines 341-350, the `if (affordable) { card.onclick = … card.draggable = true; … dragstart … }`) with:

```typescript
      if (affordable) {
        // Tap to arm placing this building (toggle), then tap a highlighted empty tile.
        card.onclick = () => {
          if (armed && armed.kind === 'new' && armed.id === def.id) setArmed(null, card);
          else setArmed({ kind: 'new', id: def.id }, card);
        };
      }
```

- [ ] **Step 5: Update the two drag-referencing copy strings**

- Line ~283 (placed list empty note): change
  `'No buildings yet — drag one from Available Buildings onto the grid.'`
  to `'No buildings yet — tap one in Available Buildings, then tap a tile.'`
- Line ~278 (placed list header): change `'<h3>Your Buildings — click to upgrade</h3>'`
  to `'<h3>Your Buildings — tap to upgrade</h3>'` (kept; upgrade path unchanged).

- [ ] **Step 6: Verify build + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc PASS (no remaining references to `didDrag`, `dataTransfer`, or `dragstart` in `civScreen.ts` — confirm with `git grep -n "didDrag\|dataTransfer\|dragstart" src/ui/civScreen.ts` returning nothing); all tests green.

- [ ] **Step 7: Commit**

```bash
git add src/ui/civScreen.ts
git commit -m "feat(RC-043): tap-to-place city building (retire drag-and-drop)"
```

---

## Task 7: Responsive CSS, highlights, and the rotate gate

**Files:**
- Modify: `index.html` (viewport meta line 5; add `#rotate` overlay before the script tag)
- Modify: `src/main.ts` (touch body class; orientation pause)
- Modify: `src/style.css` (append the mobile block)

- [ ] **Step 1: Update the viewport meta and add the rotate overlay (`index.html`)**

Replace line 5:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

with:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
```

Add this element just before `<script type="module" src="/src/main.ts"></script>`:

```html
    <div id="rotate">
      <div style="font-size:3rem">↻</div>
      <p>Rotate your device to landscape to play.</p>
    </div>
```

- [ ] **Step 2: Add the touch body class + orientation pause (`src/main.ts`)**

Add to the imports:

```typescript
import { isTouchDevice } from './platform/device';
```

After `let civ: CivState = …` (line 32), add:

```typescript
if (isTouchDevice()) document.body.classList.add('touch');
let pauseMenuOpen = false; // RC-043: track pause state to drive the orientation gate
```

In `launchExpedition`, change the `onPauseMenu` handler (line 134) to keep `pauseMenuOpen` in sync:

```typescript
    onPauseMenu: (open: boolean) => { pauseMenuOpen = open; if (open) renderPauseMenu(); else hidePauseMenu(); },
```

Add this listener after the existing `window.addEventListener('resize', …)` block (lines 47-49):

```typescript
// RC-043: on a touch device, rotating to portrait pauses a live run (the rotate overlay covers it).
function handleOrientation() {
  if (!isTouchDevice()) return;
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  if (portrait && runEl.classList.contains('active') && !pauseMenuOpen) {
    (game.scene.getScene('run') as RunScene).togglePauseMenu();
  }
}
window.addEventListener('orientationchange', handleOrientation);
window.addEventListener('resize', handleOrientation);
```

- [ ] **Step 3: Append the mobile CSS block (`src/style.css`)**

Append to the end of `src/style.css`:

```css
/* ===== RC-043 mobile support ===== */

/* Stop browser pinch/scroll/double-tap-zoom gestures over the live run. */
#run canvas { touch-action: none; }

/* Tap-to-place feedback */
.cell.place-target { border-color: #3fb950; box-shadow: inset 0 0 0 2px #3fb950; cursor: pointer; }
.bcard.armed, .cell.armed { outline: 2px solid #e3b341; outline-offset: -2px; }

/* Rotate-to-landscape gate — only on touch devices, only in portrait. */
#rotate { display: none; }
@media (orientation: portrait) {
  body.touch #rotate {
    display: flex; position: fixed; inset: 0; z-index: 50;
    flex-direction: column; align-items: center; justify-content: center; gap: 14px;
    background: #0d1117; color: #e6edf3; text-align: center; padding: 24px;
  }
}

/* Bigger tap targets on touch */
body.touch button { min-height: 44px; }

/* Collapse the desktop-width grids on narrow viewports. */
@media (max-width: 760px) {
  .grid { grid-template-columns: repeat(5, 1fr); }
  .cell { width: auto; height: auto; }              /* was fixed 120px */
  .exp-grid { grid-template-columns: 1fr; }
  .runend-grid, .victory-grid { grid-template-columns: repeat(2, 1fr); }
  .slotgrid { grid-template-columns: 1fr; }
  .bgrid { grid-template-columns: 1fr; }
  .civ-wrap, .exp-wrap { padding: 12px 14px; }
}
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds; `dist/` produced.

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.ts src/style.css
git commit -m "feat(RC-043): responsive menus, tap-to-place highlights, rotate gate"
```

---

## Task 8: Installable PWA + fullscreen

**Files:**
- Modify: `package.json` (devDeps via install)
- Create: `pwa-assets.config.ts`, `public/logo.svg`
- Modify: `vite.config.ts` (add `VitePWA`)
- Modify: `index.html` (apple-touch-icon link)
- Modify: `src/main.ts` (fullscreen request on run start)

- [ ] **Step 1: Install the plugin + assets generator**

Run:

```bash
npm i -D vite-plugin-pwa @vite-pwa/assets-generator
```

Expected: both added to `devDependencies`.

- [ ] **Step 2: Add the icon source (`public/logo.svg`)**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0d1117"/>
  <path d="M256 64 L448 256 L256 448 L64 256 Z" fill="#3fb950"/>
  <path d="M256 140 L372 256 L256 372 L140 256 Z" fill="#0d1117"/>
  <path d="M256 196 L316 256 L256 316 L196 256 Z" fill="#e3b341"/>
</svg>
```

- [ ] **Step 3: Add the assets config (`pwa-assets.config.ts`)**

```typescript
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/logo.svg'],
});
```

- [ ] **Step 4: Generate the icons**

Run:

```bash
npx pwa-assets-generator
```

Expected: PNG icons (`pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`) written under `public/`.

- [ ] **Step 5: Wire `VitePWA` into `vite.config.ts`**

Replace the file with:

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './', // relative paths so it works on GitHub Pages project sites
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Stone to Stars',
        short_name: 'StoneStars',
        description: 'Lead a civilization from the Stone Age to the stars — one survivor run at a time.',
        theme_color: '#0d1117',
        background_color: '#0d1117',
        display: 'standalone',
        orientation: 'landscape',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**'],
  },
});
```

- [ ] **Step 6: Add the apple-touch-icon link (`index.html`)**

After the existing favicon `<link>` (line 7), add:

```html
    <link rel="apple-touch-icon" href="./apple-touch-icon-180x180.png" />
```

- [ ] **Step 7: Request fullscreen on run start (`src/main.ts`)**

In `launchExpedition`, immediately after `game.scale.resize(window.innerWidth, window.innerHeight);` (line 122), add:

```typescript
  // RC-043: on touch, go fullscreen for the run (gesture-initiated via the expedition pick → allowed).
  if (isTouchDevice() && !document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
```

- [ ] **Step 8: Verify build produces the service worker + manifest**

Run: `npm run build`
Expected: build succeeds; `dist/manifest.webmanifest`, `dist/sw.js`, and the icon PNGs are present.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.ts pwa-assets.config.ts index.html src/main.ts public/
git commit -m "feat(RC-043): installable PWA (manifest + service worker) and run fullscreen"
```

---

## Task 9: Device-aware help card

**Files:**
- Modify: `src/ui/helpCard.ts` (split the controls list; pick by device in `renderHelpCard`)

- [ ] **Step 1: Add the import and a touch controls list**

Add the import at the top of `src/ui/helpCard.ts`:

```typescript
import { isTouchDevice } from '../platform/device';
```

Rename the existing `CONTROLS` constant (line 26) to `CONTROLS_DESKTOP`, and add below it:

```typescript
const CONTROLS_TOUCH: [string, string][] = [
  ['Move', 'left thumb — drag anywhere on the left to steer'],
  ['Attack', 'automatic — your weapons fire on their own'],
  ['Active item', 'tap ⚡ (aims at the nearest enemy; if equipped)'],
  ['Pause', 'tap ⏸'],
  ['Collect', 'walk near gems to vacuum them in'],
  ['Level up', 'tap one card from the draft'],
];
```

- [ ] **Step 2: Select the list by device in `renderHelpCard`**

In `renderHelpCard`, where the controls list is built (line 64, `for (const [term, desc] of CONTROLS)`), change `CONTROLS` to:

```typescript
  for (const [term, desc] of (isTouchDevice() ? CONTROLS_TOUCH : CONTROLS_DESKTOP)) {
```

- [ ] **Step 3: Verify build + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc PASS; the existing `helpCard` storage tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/ui/helpCard.ts
git commit -m "feat(RC-043): show touch controls in How-to-Play on touch devices"
```

---

## Task 10: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Full build + test suite**

Run: `npm run build && npm test`
Expected: build succeeds; all tests pass (the prior ~480 plus the new `device`, `touchMath`, `placement` suites).

- [ ] **Step 2: Desktop regression — confirm nothing changed off-touch**

Run: `npm run dev`, open in a desktop browser. Verify WASD movement, right-click active, ESC pause, and city building placement (now tap-to-place: click a building card, click a tile) all work with a mouse. No touch overlay appears.

- [ ] **Step 3: Touch walkthrough (device emulation)**

Per the `verify-canvas-game-playwright` skill, drive the canvas game with touch emulation (Chrome DevTools device toolbar, or Playwright with `hasTouch: true`, landscape viewport e.g. 844×390):
- Floating joystick: touch-drag in the left half → the player moves; release → stops.
- ⚡ button fires the active at the nearest enemy; ⏸ opens the pause menu.
- Hold the joystick AND tap ⚡ together → both register (multi-touch).
- City screen: tap a building → empty tiles highlight green → tap one → it builds; tap a placed building → tap an empty tile → it moves.
- Rotate to portrait → the "rotate your device" overlay shows and a live run is paused; rotate back → it clears.
- At a ~380px-wide portrait width, confirm no horizontal scrolling on the city/expedition screens.

- [ ] **Step 4: PWA install check**

In Chrome DevTools → Application: Manifest loads with name/icons/landscape; a service worker is registered; the install affordance appears. Installing launches standalone.

- [ ] **Step 5: Mark RC-043 delivered**

Update `docs/BACKLOG.md`: set the RC-043 Active row Status `Open → Delivered`, set the C5 (Mobile Support) capability Status `Planned → Delivered`, and update the ticket file `docs/tickets/RC-043-mobile-friendly-support.md` acceptance checkboxes. Commit (the pre-commit hook re-rolls projects.yaml):

```bash
git add docs/BACKLOG.md docs/tickets/RC-043-mobile-friendly-support.md
git commit -m "docs(RC-043): mark mobile support delivered"
```

- [ ] **Step 6: Finish the branch**

Invoke `superpowers:finishing-a-development-branch` to merge to main / open a PR. Note from project memory: pushing `.github/workflows/*` needs Jeff's terminal (gh credential split) — this branch does **not** touch workflows, so a normal push applies. The existing Pages deploy workflow will build and publish the PWA on merge to main.

---

## Self-review notes

- **Spec coverage:** device detection (T1) · floating joystick + ⚡/⏸ + multi-touch (T2-T4) · nearest-enemy active (T2, T4) · tap-to-place incl. move (T5-T6) · responsive grids + orientation gate (T7) · PWA/fullscreen/viewport/touch-action (T7-T8) · help card (T9) · unit + device testing (T1/T2/T5, T10). All spec sections map to a task.
- **Type consistency:** `Vec2` defined once in `touchMath.ts`, imported by `touchControls.ts` and `RunScene.ts`. `Selection` defined once in `placement.ts`, imported by `civScreen.ts`. `moveVector()`, `useActiveAtNearest()`, `validTargetTiles()`, `isTouchDevice()` names are used identically across tasks.
- **No placeholders:** every code step shows complete code; every command states expected output.
