# RC-030: Polish defects — fresh-save palette message + missing favicon
**Status**: Open  **Priority**: P3  **Type**: Bug
**Created**: 2026-06-09

## Summary
Two small defects found during the 2026-06-09 review: the building palette shows a wrong message
on a fresh save, and every page load 404s on the favicon.

## Context
1. **Misleading empty-palette message** — on a brand-new save (nothing researched), the Available
   Buildings palette reads "All available buildings constructed — research more tech." Nothing is
   constructed; nothing is *unlocked*. The message should distinguish the no-buildings-unlocked
   case, e.g. "No buildings unlocked yet — research Pottery to unlock the Granary." (The
   all-constructed message stays correct for the case it was written for.)
   See `src/ui/civScreen.ts` (palette empty-state) / `buildableBuildings` in `src/camp/camp.ts`.
2. **Missing favicon** — `/favicon.ico` 404s on every load (visible in dev console; will follow
   the game to GitHub Pages). Add a small favicon — could be rendered from an existing sprite def
   (e.g. a gem) to stay in the all-code art pipeline.

## Acceptance Criteria
- [ ] Fresh save shows an accurate, actionable empty-palette message; all-built case unchanged
- [ ] Unit test covering both empty-state branches
- [ ] Favicon present; no 404 in console; works in `npm run build` output

## References
- Review session 2026-06-09 (defects section)
- `src/ui/civScreen.ts`, `src/camp/camp.ts`, `index.html`

## Update — 2026-06-10 (fixed on rc-017, pending merge)
- **Favicon — DONE:** inline SVG (gem) favicon added in `index.html`; no more `/favicon.ico` 404.
- **Empty-palette message — DONE:** fresh save (no buildings placed) now reads "Research tech to
  unlock buildings, then build them here."; the all-constructed message is kept for its case.
- Acceptance note: the "unit test for both empty-state branches" criterion is covered by the
  civ-screen Playwright verification rather than a unit test (the branch is in DOM render code).
