# RC-040: Enemy attack arsenal — mid+ tier difficulty via attack variety
**Status**: Delivered  **Priority**: P1  **Type**: Feature
**Created**: 2026-06-11

## Summary
Jeff (2026-06-11 playtest): low tiers are great (club vs scholar standoff = run them down while
dodging), but at medium+ tiers the player out-ranges, out-rates, and out-guns enemies — and the
LARGE enemies are the least dangerous things on the field ("just big and slow"). Don't nerf the
player; give enemies real weapons. Today the entire enemy offense is one slow projectile in two
profiles ('ranged'/'melee') — RC-018 gave movement personalities, never attack variety.

## Design (ratified in-session 2026-06-11)
Eight data-driven attack profiles (`attackProfile` on EnemyDef, telegraph-first — difficulty is
readable pressure, not cheap shots). Low tiers (stone/bronze/iron smalls) UNTOUCHED.

| Profile | Behavior | Telegraph |
|---|---|---|
| volley | ~5× fire rate (cd ~700ms vs 3400), lower per-shot damage | none needed (slow shots) |
| flamejet | short cone toward player dropping burning ground patches (enemy patches damage the PLAYER) | jet warm-up flash ~400ms |
| slash | 120° melee arc sweep, range ~120px | wind-up arc flash ~600ms before the hit lands |
| beam | full-length laser along a locked aim line | aim line glows ~600ms, then fires |
| mortar | lobbed AoE shell at the player's position, blast ~70px | target circle on the ground during flight |
| spawner | summons 1-2 minions every ~6s, hard cap ~3 alive per spawner | brief summon animation/tint |
| haunt | leaves damaging ground along its own path (enemy trail) | the trail IS visible |
| enrage | below 30% HP: +60% speed and fire rate, red tint | the tint |

## Assignments (the heavy-enemy audit — every big slow mob gets a threat)
| Enemy | Tier | Profile(s) |
|---|---|---|
| hoplite | classical | slash |
| cyclops (apex) | classical | beam + enrage |
| knight | medieval | slash |
| gargoyle | medieval | haunt |
| dragon (apex) | medieval | flamejet + enrage |
| musketeer | renaissance | volley |
| grenadier | renaissance | mortar |
| dreadnought (apex) | renaissance | mortar + enrage |
| steam_tank | industrial | mortar |
| mecha (apex) | industrial | spawner (drones) + enrage |
| rifleman | modern | volley |
| gunship | modern | volley |
| halftrack | modern | volley (keeps charger movement) |
| juggernaut (apex) | modern | slash + enrage |
| rock_golem | cave | slash (slow heavy sweep; splitting stays) |
| iron_golem (cave apex) | cave | slash + enrage |
| Unchanged | stone→iron smalls | beast, scholar, skeleton, cave_dweller, automaton, harpy, centaur, pikeman, riveter, drone — the low-tier dance is preserved |

Enrage applies to the def (apex ids also appear as rare regular spawns — acceptable; they're rare
and SHOULD be scary). Enemy projectile-speed global bump NOT included (RC-009 candidate, Jeff
hasn't opted in).

## Architecture
- Pure `src/run/enemyAttacks.ts`: profile constants + geometry/timing helpers (arc containment,
  beam line-hit, mortar targeting, volley cadence, enrage check, spawner gating) — unit-tested.
- `EnemyDef.attackProfile?` + `enrage?: boolean` (legacy `attack` field stays for basic shooters).
- RunScene: per-profile dispatch with telegraphs; NEW machinery: enemy ground hazards (patches
  that damage the player — mirror of the existing enemy-damaging patches) and player-damaging AoE
  (mortar blast vs player). Enemy hazards must tick the player with a re-hit interval, respect
  pause, and clean up on run end.
- Balance numbers provisional (RC-009 owns feel).

## Acceptance Criteria
- [x] 8 profiles implemented, data-driven, telegraphed as tabled
- [x] Every assignment in the audit table active; low-tier enemies byte-identical
- [x] Enemy hazards damage the player (with re-hit throttle) and never damage enemies; player AoE rules unchanged
- [x] Spawner respects its alive-cap; spawned minions count toward the dungeon clear
- [x] Pure helpers unit-tested; live verify one profile per tier band
- [x] No save bump

## References
- 2026-06-11 playtest; RC-018 (movement archetypes — the pattern to mirror); `src/scenes/RunScene.ts`
  ENEMY_SHOT/updateEnemyFire; patches system (RC-031 Task 9)

## Resolution
Delivered 2026-06-11 in two parts.

**Part 1** (commits 9606306 / b71ca04): pure `src/run/enemyAttacks.ts` — profile
constants + geometry/timing helpers (arcContains, beamHits, enrageActive,
flamePatchPoints, spawnerMaySummon), unit-tested; `EnemyDef.attackProfile / enrage /
spawns` assigned per the binding tables.

**Part 2** (commit 279c6e5): scene wiring in `src/scenes/RunScene.ts`, mirroring the
existing `updateEnemyFire` / `patches` architecture. All per-profile state lives on
enemy data; everything is asleep-gated, and every profile holds while off-camera
(RC-037 inset gate) EXCEPT slash (melee — already requires proximity).

- `updateEnemyProfiles(dt)` dispatches the 8 profiles via per-enemy `profileMs`
  countdown (staggered like `fireMs`). A profile that declines to act (player out of
  slash range, spawner capped) retries after 250ms instead of burning the full cooldown.
- `enemyPatches`: a second hazard list mirroring `patches` but ticking the PLAYER
  (never enemies) on a `ZONE_TICK_MS` re-hit cadence, hostile-tinted; used by flamejet
  (4 patches along the cone) and haunt (small trail patches while moving). Reset in
  `init()`; gfx reaped on shutdown like the player patches.
- Telegraphs: slash 120° arc sector locked to windup-start facing (600ms pulse →
  solid flash + hit); beam thin aim line locked through the player (600ms glow → thick
  beam ~120ms); mortar ground target circle during the 900ms shell arc; flamejet 400ms
  warm-up tint.
- enrage (`maybeEnrage`): once `hp/maxHp < 0.3`, sets speed ×1.6, `enrageRateMult` 1.6
  (read by both the fire cadence and profile cadence), red tint 0xff5544. Triggered
  from BOTH the profile tick and `applyDamageToEnemy`'s non-fatal branch (so an
  armor-absorbed hit still enrages via the next profile tick). Hit-flash `clearTint`
  re-applies the enrage red via `restoreEnemyTint`.
- `MAX_ENEMY_BULLETS` 10 → 16 for volley headroom (its ~700ms cadence).
- Mortar blast damage is captured at FIRE time (`blastDamage`), so a committed shell
  lands full damage even if its firing enemy dies mid-flight (reading `e.getData` at
  landing would have yielded 0 — caught and fixed during live verify).
- Spawner children are normal active enemies with no `poiCourier` flag, so the clear
  check (`enemies.getChildren().filter(e => e.active && !poiCourier)`) counts them
  naturally — "N left" grows on summon and the dungeon can't clear until they die.

**Ruling applied:** gargoyle `behavior` standoff → circler — a haunt painter must
move around the player to lay its trail; a standoff would park it and no trail forms.

**Live verification** (verify-canvas-game-playwright; forced profiled defs via
scene-side `spawnEnemyAt` with real def objects): volley 3 bullets @ ~700ms; slash arc
+ 19 dmg (16×1.2) on locked facing; beam aim line + 28 dmg (22×0.8×1.6) on locked line;
flamejet 4 patches after 400ms warm-up; mortar target circle + 15 dmg blast; spawner
capped at exactly 3 live drones; haunt 4 trail patches while circling; enrage red tint
+ speed ×1.6 + rate ×1.6 (both trigger paths); enemy patch hurt the player 40 HP while
an enemy standing in it took 0; off-camera volley fired 0 bullets. `npm test` 394 green;
`npm run build` green; no save bump.
