# RC-043: Mobile-friendly support

**Status**: Open  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-18
**Capability**: C5 (Mobile Support)

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

- [ ] Touch device detection gates all touch-only behavior; desktop unchanged.
- [ ] Floating joystick drives movement; ⚡ fires active at nearest enemy; ⏸ pauses.
- [ ] Simultaneous joystick + button works (multi-touch enabled).
- [ ] City building placement works by tap-to-place (place and move) on mouse and touch.
- [ ] Menu screens reflow without horizontal overflow on a ~380px-wide landscape phone.
- [ ] Portrait shows a rotate prompt and pauses any live run.
- [ ] Installable as a PWA, launching standalone in landscape; pinch/double-tap zoom suppressed.
- [ ] New pure logic unit-tested; touch flows verified on a real device / Playwright touch emulation.
- [ ] Performance acceptable on a mid-range phone during a busy late-game wave.

## References

- Spec: docs/superpowers/specs/2026-06-18-mobile-friendly-design.md
- Implementation plan: (to be created — writing-plans)
