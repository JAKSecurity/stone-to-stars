# RC-043: Mobile-friendly support

**Status**: Delivered  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-18  **Delivered**: 2026-06-18
**Capability**: C5 (Mobile Support)

## Verification

Verified pre-merge: `npm run build` clean (PWA manifest + service worker + icons
emitted); 493/493 vitest green (new device / touchMath / placement suites);
per-task spec + code-quality review plus a final holistic review ("ready to
merge", desktop path unchanged off-touch); production-build boot smoke test via
Playwright (zero console errors, service worker registers, viewport/`touch-action`/
icons correct, `body.touch` absent on desktop). Shipped to the live GitHub Pages
site for on-device confirmation (joystick movement, ⚡/⏸ in a live run, tap-to-place
visual, rotate gate, PWA install) — the remaining checks are device-only.

## Summary

Make the game playable and pleasant on phones, delivered through the existing
GitHub Pages web URL. Target tier: polished mobile web (no app-store packaging).

## Context

The expedition combat is auto-aim, so the player only controls movement — which
makes a touch port tractable. Brainstorm ratified four core decisions:

- **Polished mobile web** — same URL, no native packaging.
- **Landscape-only** — portrait shows a "rotate your device" prompt.
- **Floating joystick** (left thumb) + ⚡ active / ⏸ pause buttons (right thumb).
- **Tap-to-place** city building — drag-and-drop retired on desktop and touch.

Full design: [docs/superpowers/specs/2026-06-18-mobile-friendly-design.md](../superpowers/specs/2026-06-18-mobile-friendly-design.md)

## Acceptance Criteria

- [x] Touch device detection gates all touch-only behavior; desktop unchanged. *(unit-tested + boot smoke)*
- [x] New pure logic unit-tested (device / joystick math / valid-target tiles). *(493 vitest green)*
- [x] Installable as a PWA — manifest + service worker + icons emitted in the build. *(install verified on device — live)*
- [x] Code complete + reviewed: floating joystick movement, ⚡ nearest-enemy active, ⏸ pause, multi-touch `addPointer(2)`, tap-to-place (place + move), responsive grids, portrait rotate gate, `touch-action`/viewport, device-aware help. *(holistic review: ready to merge)*
- [ ] **Live (device) confirmation:** joystick moves the player + ⚡/⏸ in a run; tap-to-place visual highlight + placement; portrait gate pauses a run; PWA install standalone; no horizontal overflow at ~380px; performance OK in a busy late-game wave.

## References

- Spec: docs/superpowers/specs/2026-06-18-mobile-friendly-design.md
- Plan: docs/superpowers/plans/2026-06-18-mobile-friendly-support.md
