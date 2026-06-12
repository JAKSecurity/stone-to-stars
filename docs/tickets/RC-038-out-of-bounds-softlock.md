# RC-038: Entities escape the playable field — out-of-bounds mob soft-locks the clear
**Status**: Delivered  **Priority**: P1  **Type**: Bug
**Created**: 2026-06-11

## Summary
2026-06-11 evening playtest (Jeff): the last remaining enemy ended up stuck OUTSIDE the playable
field (off the bottom edge, unreachable), making the dungeon unwinnable — with the RC-034 timer
gone, a stuck "1 left" means the run can never end (no clear possible, nothing left to kill the
player). The haul is unrecoverable (refresh abandons the run). Jeff also reported being briefly
"bounced" past the border when hit at the wall — the player side of the same containment seam.

## Suspected escape paths (all post-RC-034/RC-031/RC-022 interactions)
- RC-022 micro-knockback mutates enemy x/y directly (4px per hit) — repeated hits can walk a mob
  through the perimeter/barrier band; arcade separation can then resolve it to the OUTSIDE.
- Splitter children spawn at jitter offsets around the parent's death point — a wall-adjacent
  death can place children inside/beyond the wall band.
- Shrine wave spawns on a 140–260px ring around the shrine — a wall-adjacent shrine can ring
  outside the field (RC-026).
- Wall-collision separation on the player when hit at the border (the "bounce").

## Fix direction
1. A pure `clampToPlayable(x, y, worldW, worldH, margin)` helper (margin = WALL_THICKNESS + body
   radius) applied at EVERY spawn site (placed roster, splitter children, shrine wave, courier,
   boss) — nothing ever spawns outside.
2. A periodic containment sweep in update() clamping any strayed enemy (and the player) back
   inside the playable bounds — covers knockback/tunneling drift regardless of cause.
3. The sweep IS the soft-lock failsafe: a strayed last enemy gets pulled back in and becomes
   killable. No special-case win-condition tolerance needed.

## Acceptance Criteria
- [ ] No spawn site can place an entity outside the playable field (unit-test the clamp; audit call sites)
- [ ] An enemy forced out of bounds is swept back inside within ~1s and is killable
- [ ] Player cannot be displaced outside the field by hits at the border
- [ ] Live-verified in the dungeon incl. a forced out-of-bounds enemy

## References
- `src/scenes/RunScene.ts` (knockback, spawn sites, wall colliders), `src/run/dungeonGen.ts`
  (WALL_THICKNESS, layout), RC-026 shrine wave, RC-022 knockback
- 2026-06-11 evening playtest (Jeff) — soft-locked run with "1 left" off the bottom edge

## Resolution
Delivered 2026-06-11. Added a pure `clampToPlayable(x, y, worldW, worldH, margin)` helper to
`src/run/dungeonGen.ts` (clamps each axis independently into `[margin, world − margin]`), unit-tested
in `tests/dungeonGen.test.ts` (in-bounds untouched, each edge clamps, off-corner snaps to the nearest
corner, boundary inclusive). It is applied at the single spawn choke point `spawnEnemyAt` — through
which the placed roster, boss, splitter children, shrine wave, and courier all flow — and in
`dropGem`, so no entity or gem can come to rest in the wall band (margin = WALL_THICKNESS + 24). A
~1s containment sweep in `update()` (throttled via `lastSweepMs`) hard-resets any strayed enemy back
inside with `body.reset(cx, cy)` — this is the soft-lock failsafe: a strayed last enemy re-enters and
becomes killable. The player is clamped every frame (cheap single check, `body.reset` only when
actually out of bounds) to fix the border-bounce displacement. Live-verified via Playwright: an enemy
forced to `y = worldH + 200` (3866 vs world 3666) was swept back inside within ~1s and resumed
chasing (killable); the player shoved to `x = −100` clamped to x 72 the next frame, and to `y = −200`
clamped to y 72. Unit suite green at 360 tests (7 new clamp tests); `npm run build` clean.
