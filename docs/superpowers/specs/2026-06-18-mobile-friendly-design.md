# Mobile-Friendly Support — Design

**Date:** 2026-06-18
**Status:** Approved (brainstorm) — pending implementation plan
**Game:** Stone to Stars (Phaser HTML5 / TypeScript / Vite)

## Goal

Make the game playable and pleasant on phones, delivered through the existing
GitHub Pages web URL. Target tier: **polished mobile web** — responsive menus,
real touch controls, landscape handling, an installable PWA, and a performance
pass on real hardware. No native app-store packaging.

## Why this is tractable

The expedition combat is **auto-aim**: weapons fire automatically at the nearest
enemy (`RunScene.nearestEnemy()`), so the player only ever controls *movement*.
That removes touch-aiming, the hardest part of porting an action game to phones.
The canvas already resizes to the window, the viewport meta tag is present, and
the draft / level-up cards already use pointer events (touch-ready).

## Core decisions (ratified during brainstorm)

| Area | Decision |
|------|----------|
| Ambition | Polished mobile **web** — same GitHub Pages URL, no app store |
| Orientation | **Landscape-only**; portrait shows a "rotate your device" prompt |
| Movement | **Floating joystick** (left thumb); ⚡ active + ⏸ pause buttons (right thumb) |
| City building placement | **Tap-to-place** everywhere — native drag-and-drop retired |
| Platform model | One responsive build; touch behavior gated on device detection |

## Non-goals

- No app-store / native packaging (no Capacitor, no developer accounts).
- No portrait gameplay.
- No separate mobile codebase or build.
- No gameplay/balance retuning for mobile (that is the existing open RC-009 (balance)).
- A "reduce effects" quality toggle is **contingent** — built only if a real
  device shows it is needed, not up front (YAGNI).

## Architecture & components

### 1. Device detection — `src/platform/device.ts` (new)

Single source of truth for "is this a touch device", via
`matchMedia('(pointer: coarse)')` plus touch-event presence. Everything else
(touch overlay, larger tap targets, orientation gate, help-card content) keys off
this. Desktop keeps keyboard + mouse unchanged.

- Pure, unit-testable with a mocked `matchMedia`.

### 2. Run touch controls — `src/scenes/touchControls.ts` (new)

A `TouchControls` class instantiated by `RunScene.create()` only when on touch.
Rendered as Phaser objects pinned to the camera (`setScrollFactor(0)`) so it
lives inside the scene's own input system, not a separate DOM layer.

- **Floating joystick** — pointer-down in the left ~45% of the screen spawns a
  joystick ring under the thumb; drag yields a direction vector clamped to a max
  radius and normalized. Pointer-up resets it to zero.
- **⚡ Active button** (bottom-right) — fires the loadout active item, auto-targeting
  the **nearest enemy** (reusing `nearestEnemy()`), falling back to last-move
  direction when no enemy exists.
- **⏸ Pause button** (bottom-right) — calls the existing `togglePauseMenu()`.

Exposes `moveVector(): {x, y}` and the two button callbacks.

### 3. RunScene changes — `src/scenes/RunScene.ts` (modified)

1. **Movement refactor** — `update()` reads one direction vector that merges
   keyboard *and* joystick, instead of hard-coding the WASD `isDown` branches.
   WASD continues to work on desktop; the joystick feeds the same vector on touch.
2. **Active targeting** — `useActive()` gains a nearest-enemy targeting path for
   the touch button (today it consumes the right-click world point).
3. **Multi-touch** — `this.input.addPointer(2)` so the joystick and a button can
   be held simultaneously. Phaser tracks a single touch pointer by default;
   without this, twin-thumb input drops one of the two touches.

### 4. City tap-to-place — `src/ui/civScreen.ts` (modified) + `placement.ts` helper (new)

Replace `dragstart` / `dragover` / `drop` / `dataTransfer` with a selection state
machine: tap a building (palette card or placed cell) → "armed" → valid target
cells highlight → tap one to place/move → tap the armed item again to cancel. The
pure "which cells are valid targets" computation moves to `placement.ts` for unit
testing. Works identically with a mouse, so it replaces drag-and-drop on desktop
too (one code path).

### 5. Responsive menus + orientation gate — `src/style.css`, `index.html` (modified)

- Media queries collapse the hardcoded desktop grids:
  - City grid: fixed `5 × 120px` (600px) → cells sized to viewport width.
  - Expedition cards `repeat(3, …)`, run-end / victory stats `repeat(4, …)`,
    save slots `repeat(3, …)`, building palette `repeat(2, …)` → fewer columns
    on narrow widths.
  - `.cols` already collapses correctly — left as-is.
- Larger tap targets on coarse-pointer devices.
- **Orientation gate**: a fixed "↻ Rotate to landscape" overlay shown on touch +
  portrait via `@media (orientation: portrait)`; pauses a live run so nothing
  happens behind it.

### 6. PWA / fullscreen / viewport — `index.html`, `public/manifest.webmanifest` (new), build config

- Viewport meta gains `user-scalable=no, viewport-fit=cover`; canvas gets
  `touch-action: none`. Together these kill pinch-zoom, double-tap zoom, and
  accidental page scroll during play.
- `manifest.webmanifest` + icons (via `vite-plugin-pwa`, which also emits a
  service worker) make the game installable to the home screen, launching
  standalone in landscape without browser chrome.
- A fullscreen request fires on run start as a fallback where the manifest's
  display mode isn't honored.

### 7. Help card — `src/ui/helpCard.ts` (modified)

Show touch controls (joystick / ⚡ / ⏸) in "How to Play" when on a touch device;
keep WASD / right-click / ESC on desktop.

## Data flow — movement

```
touch pointer in left zone ──▶ TouchControls: offset → clamp → normalize ──▶ moveVector()
keyboard WASD ───────────────▶ keys.isDown ─────────────────────────────────▶ keyVector()
                                                  │
                       RunScene.update(): merge ──┴──▶ player velocity = dir * speed
```

## Edge cases & error handling

- **Simultaneous joystick + button** — handled by `addPointer(2)`.
- **Joystick pointer lifts or leaves zone** — vector resets to zero.
- **Active button with no enemies** — fire toward last-move direction (no-op-safe).
- **Rotate to portrait mid-run** — orientation gate appears and pauses the run.
- **Browser zoom/scroll gestures** — suppressed via `touch-action` + viewport meta.
- **Pause opened while joystick held** — release/zero the joystick on pause.

## Testing strategy

- **Unit (vitest, added to the existing 480-test suite):** joystick vector math,
  nearest-target selection, valid-cell placement logic, device detection.
- **Device / Playwright:** touch overlay, tap-to-place, orientation gate, and PWA
  install verified on a real phone; Playwright touch emulation drives the joystick
  to confirm the player moves (per the `verify-canvas-game-playwright` approach).

## Suggested tracking

New capability (suggested name: **Mobile Support**) with a backlog ticket opened
before implementation, so it lands in the project's status system rather than
living only in this spec.
