# RC-018 — Enemy Behavior Archetypes (Design)

**Date:** 2026-06-10
**Ticket:** [RC-018](../../tickets/RC-018-enemy-behavior-archetypes.md)
**Status:** Approved — ready for implementation plan

## Problem

All 26 enemies share the identical chase-the-player movement (`physics.moveToObject` for every
enemy at `RunScene.ts:299`). Later ages are stat-reskins of Stone. The 2026-06-09 review (item A1)
flagged distinct movement as the single biggest "ages feel mechanically distinct" lever.

rc-017 already shipped enemy *firing* as a separate `EnemyDef.attack` field (`'ranged' | 'melee'`,
slow dodgeable projectiles, 10-bullet global cap). What remains is the *movement* archetypes. This
spec covers all of them plus ranged standoff positioning, fully closing the ticket.

## Scope

Implement four behaviors beyond the `chase` default:

- **charger** — telegraphs (pause + windup tell), then dashes at high speed
- **splitter** — on death, splits into N weaker existing enemies
- **circler** — orbits/strafes the player instead of beelining
- **standoff** — ranged positioning: stop at a standoff band instead of beelining (closes the
  rc-017 caveat where ranged enemies chase while firing)

`attack` (firing) and `behavior` (movement) are **orthogonal and compose freely** — a `circler`
that is also `attack: 'ranged'` is a strafing shooter; a `standoff` + `ranged` enemy camps and
plinks. Both fields stay.

## Non-goals

- No new art — reuse existing sprites/projectiles. (Any new sprite hits Jeff's ratification gate.)
- No save-version bump — `behavior`/`split` are optional `EnemyDef` fields; data only.
- No re-tuning of existing chase enemies — absent `behavior` ≡ today's chase, byte-for-byte feel.
- Exact feel constants (windup ms, dash multiplier, orbit radius, standoff band) are **tunable
  defaults**; final values are Jeff's by-ear playtest call (RC-009 balance discipline).

## Data model

Two optional fields added to `EnemyDef` (`src/game/types.ts`):

```ts
behavior?: 'chase' | 'charger' | 'splitter' | 'circler' | 'standoff'; // default 'chase'
split?: { into: string; count: number }; // splitter only, e.g. { into: 'cave_dweller', count: 2 }
```

Absent `behavior` ⇒ chase, so every existing `EnemyDef` and every existing test is unchanged until
an archetype is explicitly assigned.

## Pure logic module — `src/run/enemyBehavior.ts`

Mirrors `src/run/projectileMotion.ts`: no Phaser imports, all geometry + feel constants + decision
functions in one place, fully unit-testable. The scene stays a thin renderer that calls these and
applies the returned velocity.

### Constants (tunable)

```
CHARGER_TRIGGER     ~260 px   — player proximity that starts a windup
CHARGER_WINDUP_MS   ~600 ms   — telegraph duration (enemy stopped)
CHARGER_DASH_MULT   ~3.0      — dash speed = base speed × this
CHARGER_DASH_MS     ~420 ms   — dash duration
CHARGER_RECOVER_MS  ~1500 ms  — cooldown before it can wind up again
CIRCLER_RADIUS      ~140 px   — orbit band around the player
CIRCLER_ANGULAR     ~1.6 rad/s
CIRCLER_PULL        — soft radius-correction gain so it spirals to the band then orbits
STANDOFF_MIN        ~170 px   — closer than this ⇒ kite away
STANDOFF_MAX        ~230 px   — farther than this ⇒ advance; between ⇒ hold
```
(All pre-`RUN_SCALE`; the scene applies `RUN_SCALE` the same way it does for `projectileMotion`
constants via `ORBIT_RING` etc.)

### Functions

- **`chargerStep(state, distToPlayer, dt, dirToPlayer)` → `{ phase, vx, vy, state }`**
  A 4-phase state machine per charger:
  `chase` → (dist < `CHARGER_TRIGGER`) `windup` (stop, count down `CHARGER_WINDUP_MS`)
  → `dash` (lock the dash direction at windup-end, move at `speed × CHARGER_DASH_MULT` for
  `CHARGER_DASH_MS`) → `recover` (`CHARGER_RECOVER_MS`, resume chase movement) → `chase`.
  Returns the phase (so RunScene renders the telegraph) and the next state blob.
  The direction is locked at the windup→dash transition so the dash is dodgeable (commits to where
  the player *was*).

- **`circlerVelocity(enemyPos, playerPos, dir, speed)` → `{ vx, vy }`**
  Tangential velocity around the player at `CIRCLER_RADIUS`, plus a radius-correction term so an
  off-band circler spirals in/out to the band then orbits. `dir` (±1) is fixed per-enemy at spawn
  so circlers don't all rotate in lockstep.

- **`standoffVelocity(distToPlayer, dirToPlayer, speed)` → `{ vx, vy }`**
  `dist > STANDOFF_MAX` ⇒ advance toward player; `dist < STANDOFF_MIN` ⇒ kite directly away;
  otherwise hold (`0, 0`). Makes ranged enemies camp at a readable distance.

Per-enemy mutable state (charger phase + timers, circler direction) is stored via Phaser `setData`
and threaded through these pure functions as arguments — the module itself holds no state.

## RunScene wiring

### Movement dispatch (`RunScene.ts:299`)
The single `moveToObject` loop becomes a `switch (e.getData('behavior'))`:
- `chase`/`undefined`: unchanged `moveToObject(e, player, speed)`.
- `charger`/`circler`/`standoff`: call the pure fn, write the returned velocity with
  `e.body.setVelocity(vx, vy)`, and persist any updated state blob.

### Charger telegraph (Phaser-side juice)
During the `windup` phase the enemy is stopped and gets a readable tell — scale-pulse + warning
tint (reusing the existing flash/tween vocabulary) — so the dash is telegraphed before it lands. A
faint streak/tint accompanies the `dash` phase. The pure layer decides *which phase*; the scene
renders the tell. Readability of the windup is an explicit acceptance criterion.

### Splitter (`applyDamageToEnemy`, death branch ~`RunScene.ts:671`)
Extract a `spawnEnemyAt(def, x, y)` helper from `spawnEnemy()` so edge-spawns and split-spawns
share one path (sets hp/drop/xp/speed/armor/attack/behavior/fire stagger + body shrink). On a
splitter's death, before the death particles, spawn `split.count` children of `ENEMIES[split.into]`
at the death position. Children are ordinary enemies with their own behavior (cave_dweller =
chase). Infinite-split guard is structural: the child def has no `split` field.

## Archetype assignment (thematic, no new art)

| Behavior | Enemies | Rationale |
|----------|---------|-----------|
| **charger** | centaur, halftrack | cavalry charge / vehicle ram — both already melee |
| **splitter** | rock_golem → 2× cave_dweller | the ticket's canonical example; both sprites exist |
| **circler** | harpy, drone | flying + ranged ⇒ strafing shooters |
| **standoff** | scholar, musketeer, rifleman, grenadier, gunship, gargoyle, dragon | ground/air ranged shooters now hold distance |
| **chase** | everyone else (tanks, bruisers, melee) | unchanged default |

## Testing

**Vitest — `enemyBehavior.test.ts`:**
- charger: chase→windup trigger at `CHARGER_TRIGGER`; windup holds zero velocity for the full
  duration; dash direction locked at transition and unchanged for `CHARGER_DASH_MS`; dash speed =
  `speed × CHARGER_DASH_MULT`; recover→chase return.
- circler: velocity is tangential (perpendicular to the player vector) at the band; radius-pull
  sign correct when off-band; `dir` flips rotation sense.
- standoff: three-band decision (advance / hold / kite) at boundary distances.
- splitter purity: a helper that resolves `split` into the child spawn list returns the right
  count/target id (the data decision, tested without Phaser).

**Playwright live-verify** (per `verify-canvas-game-playwright`): each archetype visibly behaving —
charger telegraph then dash, rock_golem splitting into two cave_dwellers on death, harpy orbiting,
musketeer standing off and plinking. Instrumentation reverted before commit.

## Acceptance criteria (from ticket)

- [x] `EnemyDef.behavior` field with `chase` default; existing data unchanged in feel
- [x] ≥3 new archetypes implemented and assigned across ages (4: charger/splitter/circler/standoff)
- [x] Ranged projectiles dodgeable (already shipped rc-017; standoff makes the threat positional)
- [x] Charger telegraph readable before the dash lands
- [x] Unit tests for pure motion/decision logic; Playwright live-verify each archetype
- [x] No new art beyond reusing existing sprites

## Files touched

- `src/game/types.ts` — `EnemyDef.behavior` + `split` fields
- `src/run/enemyBehavior.ts` — **new** pure logic module
- `src/run/enemyBehavior.test.ts` — **new** unit tests
- `src/run/enemyData.ts` — archetype assignments
- `src/scenes/RunScene.ts` — movement dispatch, charger telegraph, `spawnEnemyAt` helper, split spawn
