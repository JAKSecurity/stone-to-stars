# RC-015 — Orbit & Lob Projectile Behaviors — Design

**Date:** 2026-06-08  **Ticket:** [RC-015](../../tickets/RC-015-orbit-lob-behaviors.md)  **Capability:** C3
**Mode:** Authored solo during an unattended session (Jeff delegated judgement; reviews in the morning).
The feel constants below are first-pass and meant to be tuned by playtest, exactly like the RC-009
slice-1 juice intensities.

## Problem

`WeaponDef.behavior` declares `straight | pierce | orbit | cone | lob`, but the run firing loop in
`src/scenes/RunScene.ts` only implements `straight`/`pierce`/`cone`. A weapon declaring `orbit` or
`lob` currently flies straight like everything else. This ticket implements the two missing motions
and re-themes existing weapons onto them, with the motion math extracted into a pure, unit-tested
helper (mirroring how `expedition.ts`/`weapons.ts` keep logic out of the scene).

## Behaviors

### Orbit — a persistent ring (Vampire-Survivors "King Bible" feel)
N projectiles circle the player at a fixed radius, rotating continuously, damaging on contact. They
are **persistent**, not travel-and-despawn. On each cooldown the weapon **refreshes** its ring
(re-reads current level's damage/count) by replacing its existing orbiters — it does not stack new
rings on top of old ones.

- **Seamless refresh:** an orbiter's angle is computed from the **global run clock** (`this.elapsed`),
  not from a per-orbiter spawn time. So when a ring is replaced, the fresh orbiters appear at exactly
  the phase the old ones were at — no visible stutter or phase reset.
- **Re-hit cadence:** because an orbiter never despawns on contact, it must avoid deleting the same
  enemy every physics step. Each orbiter keeps a per-enemy "next eligible hit time" map and re-hits a
  given enemy at most every `ORBIT_HIT_INTERVAL_MS`.
- **Honored `WeaponDef` fields:** `count` = number of orbiters; `damage` (+`levelScaling.damage`) =
  damage per contact tick; `cooldownMs` = refresh interval (cheap; just re-tags the ring at the
  current level). `speed`/`spread`/`pierce` are unused by orbit (documented).

### Lob — an arc to a target that detonates (grenade/mortar feel)
Each projectile arcs from the player to a target point and detonates on landing, dealing area damage
at the landing point. It does **not** damage mid-air (it arcs *over* enemies), so a lob projectile is
purely visual during flight and resolves with a manual radius query at the end — it is **not** in the
bullet↔enemy overlap group.

- **Target:** the nearest enemy's position frozen at fire time; with `count > 1` the landing points
  scatter around that aim using the same fan formula as `cone` (so a 2-grenade volley lands a small
  cluster). With no enemies on screen, it lobs to a default point a fixed distance ahead.
- **Arc:** ground position is a straight lerp from player to target; the sprite is lifted by a
  parabola peaking at the midpoint (`lobArcHeight`) and scaled up slightly at apex so it reads as
  rising and falling. Flight time derives from `distance / speed`, clamped to a sane window.
- **Detonation:** on landing, every enemy within `LOB_BLAST_RADIUS` takes `damage`; an expanding
  shock-ring + ember particles + a short camera shake sell the blast.
- **Honored `WeaponDef` fields:** `count` = projectiles per volley; `damage` (+`levelScaling`) = blast
  damage per projectile; `cooldownMs` = throw interval; `speed` = arc travel speed (→ flight time);
  `spread` = landing scatter. `pierce` is unused (documented).

## Pure motion helper — `src/run/projectileMotion.ts`

All math lives here, fully unit-testable, with the feel constants exported in one place so the
playtest tuner has a single knob board. No Phaser imports.

```ts
export const ORBIT_RADIUS = 90;            // px from player center
export const ORBIT_ANGULAR_SPEED = 3.0;    // rad/s (~one revolution / 2.1s)
export const ORBIT_HIT_INTERVAL_MS = 320;  // per-enemy re-hit cooldown for a persistent orbiter
export const LOB_PEAK_HEIGHT = 70;         // px apex of the visual arc
export const LOB_BLAST_RADIUS = 64;        // px AoE at the landing point
export const LOB_MIN_FLIGHT_MS = 350;
export const LOB_MAX_FLIGHT_MS = 1100;

export interface XY { x: number; y: number; }

orbitAngle(index, count, elapsedMs, angularSpeed = ORBIT_ANGULAR_SPEED): number
  // (index/count)*2π + (elapsedMs/1000)*angularSpeed
orbitPosition(cx, cy, radius, angle): XY
lobFlightMs(distance, speed, min, max): number   // clamp((distance/speed)*1000, min, max)
lobProgress(elapsedMs, flightMs): number         // clamp(elapsedMs/flightMs, 0, 1)
lobGroundPosition(start: XY, target: XY, t): XY   // component lerp
lobArcHeight(t, peak = LOB_PEAK_HEIGHT): number   // peak * 4t(1-t)
withinRadius(ax, ay, bx, by, r): boolean          // squared-distance compare
```

## RunScene integration

1. **Shared damage path (refactor).** Extract the damage→flash→floating-number→death(drops/xp/
   particles/shake) block out of `hitEnemy` into `applyDamageToEnemy(enemy, damage)`. All three
   sources — straight/pierce/cone bullet hits, orbit contact, and lob detonation — funnel through it.
   This is the kind of in-place improvement the work calls for, not unrelated refactoring.

2. **Fire dispatch.** The per-weapon loop passes the weapon id: `this.fireWeapon(shot, w.id)`.
   `fireWeapon` branches: `orbit → summonOrbit(shot, id)`, `lob → fireLob(shot)`, else the existing
   straight/cone/pierce path (unchanged).

3. **`summonOrbit(shot, weaponId)`.** Destroy any existing orbit bullets tagged with this `weaponId`,
   then spawn `shot.count` images into `this.bullets` with data `{ behavior:'orbit', damage,
   index, count, weaponKey:weaponId, hitTimes:new Map() }` and no velocity. Position is set in
   `update()`.

4. **`fireLob(shot)`.** Compute aim target; for each `i` of `count`, scatter the target by the cone
   fan, create a **non-physics** image, and push `{ img, start, target, elapsed:0,
   flightMs:lobFlightMs(dist,shot.speed), damage:shot.damage }` to a `this.lobs` array.

5. **`update()` additions** (after existing bullet/enemy/gem handling, before the HUD; skipped while
   paused so rings/lobs freeze with everything else):
   - **Orbiters:** for each `this.bullets` child with `behavior==='orbit'`, set
     `body.reset(orbitPosition(player, ORBIT_RADIUS, orbitAngle(index, count, this.elapsed)))`.
   - **Lobs:** advance `elapsed += dt`; `t = lobProgress`; place the sprite at
     `ground.x, ground.y - lobArcHeight(t)` with a small apex scale; at `t >= 1` call
     `detonate(ground, damage)`, destroy the sprite, and drop it from `this.lobs`.

6. **Orbit contact in `hitEnemy`.** Branch at the top: if `behavior==='orbit'`, consult the orbiter's
   `hitTimes` map — if `this.elapsed >= next`, set `next = this.elapsed + ORBIT_HIT_INTERVAL_MS` and
   call `applyDamageToEnemy`; never destroy the orbiter. The existing hitSet/pierce/destroy path runs
   only for non-orbit bullets.

7. **`detonate(x, y, damage)`.** Spawn an expanding shock-ring tween + ember particles + a short
   `cameras.main.shake`, then `applyDamageToEnemy` every enemy within `LOB_BLAST_RADIUS`.

8. **State reset.** `init()` adds `this.lobs = []` (orbiters live in `this.bullets`, already rebuilt
   in `create()`).

## Re-themed weapons (no new art — all sprites already exist)

| Weapon | Age | Old → New behavior | Sprite (unchanged) |
|---|---|---|---|
| `flail` | Medieval | cone → **orbit** | `shot_flail` |
| `morningstar` (flail's evolution) | Medieval | cone → **orbit** | `shot_flail` |
| `grenade` | Renaissance | cone → **lob** | `shot_grenade` |
| `cluster_bomb` (grenade's evolution) | Renaissance | cone → **lob** | `shot_grenade` |

Re-theming **both base and evolved form** keeps a weapon line's feel consistent through evolution.
The spiked flail-ball orbiting and the arcing grenade are the canonical fantasies for these motions.
Plenty of `straight`/`pierce`/`cone` examples remain across the catalog, so behavior variety is
preserved. Other natural candidates (Chakram, Mortar, Buzzsaw, TNT Barrel) are left for Jeff to opt
into during the RC-009 balance pass now that the engine supports them.

## Testing

- **Unit (pure helpers):** `orbitAngle` phase + wrap; `orbitPosition` on-circle (radius invariant,
  cardinal angles); `lobFlightMs` clamps both ends and handles `speed<=0`; `lobProgress` clamps to
  [0,1] incl. `flightMs<=0`; `lobGroundPosition` endpoints + midpoint; `lobArcHeight` zero at
  t∈{0,1}, peak at t=0.5; `withinRadius` inside/edge/outside.
- **Integrity:** existing `weaponData`/`weapons` suites stay green (behavior-agnostic). Add a check
  that the re-themed weapons carry their new `behavior`.
- **Live (Playwright, `verify-canvas-game-playwright`):** force-equip a flail and a grenade via
  `window.__game`; confirm the orbit ring tracks the player and damages enemies it sweeps, and that
  the grenade arcs and detonates with AoE; 0 console errors.

## Out of scope / non-goals

- No `WeaponDef` schema change — orbit/lob reuse existing fields; per-weapon radius/arc overrides are
  a later option if the balance pass wants them.
- No new sprites (deliberately — keeps RC-015 off the art-ratification gate; it is mergeable on its
  own once Jeff has felt it).
- Balance tuning of the re-themed weapons is RC-009, not here.

## Verification gate

Branch `rc-015-orbit-lob`, not merged. Morning review = ratify the feel (tune constants if needed),
then merge.
