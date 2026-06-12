# RC-040: Enemy attack arsenal — mid+ tier difficulty via attack variety
**Status**: Open  **Priority**: P1  **Type**: Feature
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
- [ ] 8 profiles implemented, data-driven, telegraphed as tabled
- [ ] Every assignment in the audit table active; low-tier enemies byte-identical
- [ ] Enemy hazards damage the player (with re-hit throttle) and never damage enemies; player AoE rules unchanged
- [ ] Spawner respects its alive-cap; spawned minions count toward the dungeon clear
- [ ] Pure helpers unit-tested; live verify one profile per tier band
- [ ] No save bump

## References
- 2026-06-11 playtest; RC-018 (movement archetypes — the pattern to mirror); `src/scenes/RunScene.ts`
  ENEMY_SHOT/updateEnemyFire; patches system (RC-031 Task 9)
