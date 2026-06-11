# RC-037: Ranged mobs snipe from off-screen (unlimited fire range post-RC-034)
**Status**: Open  **Priority**: P2  **Type**: Bug
**Created**: 2026-06-11

## Summary
`updateEnemyFire` gates melee shots by range but lets `ranged` attackers fire unconditionally
(`inRange = atk === 'ranged' ? true : ...`, RunScene.ts ~1245). Fine in the pre-RC-034
single-screen arena where every enemy was visible; in the 3×3 scrolled dungeon an awake ranged
mob can shell the player from outside the viewport. Shot reach (4000ms × 70×RUN_SCALE px/s =
~560px) exceeds the half-viewport height (~550px), so vertical off-screen sniping is the common
case. Found by Jeff in the 2026-06-11 evening playtest (red shot entering from below the screen
edge, shooter invisible).

## Fix direction
Gate ranged fire on camera visibility: only fire when the shooter is inside
`cameras.main.worldView` (small inset margin so the mob is genuinely visible), keeping the
existing wake/cap/cadence logic. Melee unchanged. One-conditional fix + a Playwright check
(awake ranged mob just off-camera must hold fire; fires once scrolled into view).

## Acceptance Criteria
- [ ] An awake ranged enemy outside the camera view holds fire; resumes when visible
- [ ] Melee gating, sleep gating, MAX_ENEMY_BULLETS cap unchanged
- [ ] Live-verified in the dungeon (scroll a woken ranged mob off-screen → no incoming shots)

## References
- `src/scenes/RunScene.ts` `updateEnemyFire` / `ENEMY_SHOT`
- RC-018 (enemy attack types), RC-034 (scrolled dungeon — the context change that broke the assumption)
- 2026-06-11 evening playtest (Jeff)
