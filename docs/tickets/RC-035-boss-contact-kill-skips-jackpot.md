# RC-035: Boss contact-kill skips the jackpot (climax can be no-sold)
**Status**: Open  **Priority**: P3  **Type**: Bug
**Created**: 2026-06-11

## Summary
`hitPlayer` destroys ANY enemy on player contact (RC-019-era kamikaze behavior),
including the placed mini-boss. The boss jackpot only drops inside
`applyDamageToEnemy`, so a player who tanks one contact hit from the boss clears
the dungeon (RC-034 win = all enemies dead) while losing the entire jackpot —
and if the boss was still asleep, its arrival banner/HP bar never even appear.
No crash (all reads are guarded), but the climax encounter can be skipped for
the cost of one hit of contact damage.

## Context
Found during RC-034 Task 6 code review (see `src/scenes/RunScene.ts` `hitPlayer`
vs `applyDamageToEnemy` boss branch). Pre-existing quirk that got materially
worse once the boss became mandatory for the win condition.

## Acceptance Criteria
- [ ] Boss survives player contact (exempt `isBoss` from `hitPlayer` destruction, dealing contact damage both ways), OR boss contact routes through `applyDamageToEnemy` so the jackpot/HP-bar/banner flow is preserved
- [ ] Decide and apply the same rule for sleeping non-boss mobs walked into by the player (current: destroyed + damage — probably fine, confirm in playtest)
- [ ] Vitest green; quick playthrough confirms boss fight cannot be skipped by tanking

## References
- RC-034 (dungeon expeditions) Task 6 quality review
- RC-019 (mini-boss events) — origin of the kamikaze contact behavior

## Resolution (2026-06-11)

`hitPlayer` in `src/scenes/RunScene.ts` was patched to check `isBoss` before destroying the enemy. When the player contacts the boss, the boss now deals its `contactDamage` to the player but is **not destroyed**; `wakeEnemy` is called so a sleeping boss triggers its arrival banner and HP bar naturally via the existing `onBossAggro` flow. A per-boss re-hit cooldown of 800 ms (`bossNextContactMs` stored on the enemy via Phaser data) prevents per-frame drain — contact ticks damage at most once per 800 ms. Non-boss enemies keep their original kamikaze destruction. Verified live via Playwright: player HP drops on contact, boss survives (12 jackpot gems on proper kill, boss HP bar appears on contact with a sleeping boss), and cooldown throttle is active. 288 Vitest tests green, build clean.
