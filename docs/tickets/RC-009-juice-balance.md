# RC-009: Juice + balance pass
**Status**: In Progress  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-07
**Capability**: C3 (Content & ages)

## Summary
The deferred P2 juice + balance pass, done **last** once the full Iron content set exists.
Combat juice (hit-flash, floating damage numbers, screen shake, death particles, pickup
glow), gem-collection ergonomics retune, the multi-level-up draft queue fix
(KNOWN_ISSUES #3), an explicit building picker now that the building set is larger (#4),
and a holistic balance pass (enemy HP/damage/fire-rate/spawn ramp + weapon numbers) via
playtesting.

## Acceptance Criteria
- [ ] Combat juice pass (per design spec §3): hit-flash, damage numbers, shake, death particles, pickup glow
- [ ] Gem ergonomics retune; Magnet rebalanced (KNOWN_ISSUES #2)
- [ ] `gainXp` queues `levelsGained` drafts (KNOWN_ISSUES #3)
- [x] Explicit building picker — flat grid, all options visible (KNOWN_ISSUES #4)
- [ ] Holistic balance pass with playtesting; tests green; Playwright-verified
- [ ] Write the RC-009 implementation plan before building

## Notes (carried from RC-006 review)
- **Bullet `hitSet` allocation (perf, profile first).** `RunScene.hitEnemy` allocates a
  `Set` per bullet to dedupe hits, including for non-piercing bullets that are destroyed on
  first contact. A naive "only allocate when pierce>0" fix is WRONG: a pierce-exhausted
  bullet (pierce decremented to 0) is still alive and must keep consulting the set, or it
  will re-damage an already-hit enemy. Any optimization must preserve "one bullet never
  strikes the same enemy twice, for the bullet's whole life." Likely low-value (the Set is
  cheap next to the per-shot Phaser Image+body+delayedCall churn) — profile before changing.
- **Draft `Upgrade: <weapon>` label shows no level** — add the target level for clarity.

## Progress
- **Slice 1 — combat juice + draft-queue: SHIPPED 2026-06-07** (commit on rc-009-juice, merged to
  main). All 5 juice effects in `src/scenes/RunScene.ts` (hit-flash on enemy hit; floating damage
  numbers; camera shake on player hit + big-enemy death; radial death particles; gem pulse glow) +
  the **multi-level-up draft-queue fix** (KNOWN_ISSUES #3 — `gainXp` now enqueues one draft per
  level via `pendingDrafts`; `openDraft` drains the queue, shows "(+N more)", resumes only when
  empty). 4 new `runStats` level-counting tests (116 total). Intensities are first-pass and meant
  to be **tuned by feel** (see notes left in the commit: flash 60ms, player shake 0.008, big-death
  shake 0.012, damage-number 450ms/22px, gem pulse 15%).
- **Slice 2 — explicit building picker: SHIPPED 2026-06-08** (branch rc-009-building-picker).
  Replaced the implicit auto-build with an always-visible "Available Buildings" palette (no modal,
  per `jeff-ui-design`): click a card to build on the first free tile, drag a card onto a chosen
  tile, and drag placed buildings to rearrange (move to empty / swap on occupied — both free).
  New pure `camp.ts` helpers (`buildableBuildings`, `firstEmptyTile`, `moveBuilding`,
  `buildingEffectText`) + `canBuild` hardened for one-of-each. Cards show sprite/name/cost + a
  run-bonus line; affordable = green/draggable, unlocked-but-unaffordable = dimmed with a deficit
  "need X" note. Closes KNOWN_ISSUES #4. 15 camp tests (124 total) + build green; Playwright
  live-verified all six interactions (click-place, drag-place, move, swap, locked-inert, upgrade).
- **Remaining slices (next session):**
  1. **Holistic balance pass** across all 8 ages — enemy HP/damage/speed vs `tierScaling`, weapon
     numbers, spawn ramp. Needs **Jeff's playtest feel**; first-pass content numbers are placeholders.
  2. **Gem ergonomics / Magnet retune** (KNOWN_ISSUES #2).
  3. (Optional) tune the slice-1 juice intensities once Jeff has played them.

## Playtest tuning batch — 2026-06-10 (delivered alongside RC-019)
Four concrete playtest tweaks folded into this balance ticket and shipped on the RC-019 branch
(small data/constant changes, each unit-tested where there's logic):
- **#8 — Bigger damage numbers:** floating damage-number font in `RunScene.applyDamageToEnemy`
  (`~:734`, currently `13px`) bumped up for readability.
- **#5 — Powerup −50%:** `sharpen` (+25%→+12.5% damage) and `rapid` (+20%→+10% fire rate) perk
  magnitudes in `src/run/draft.ts` (PERKS) halved.
- **#9 — Tradition costs:** traditions made far more expensive — base cost ×10 and a steeper
  per-rank curve (current `COST_G = 1.6` in `src/civics/traditionData.ts`). Exact curve TBD
  with Jeff ("scale up 5× exponentially").
- **#3 — Tech age move:** `writing` and `mining` moved from Stone → Bronze in
  `src/tech/techData.ts` (verify they don't gate Stone-age progression).
- **#11 — Gatling fire-rate nerf:** the Gatling Gun's base fire rate cut ~50% (raise its
  `cooldownMs` ~2× in `src/run/weaponData.ts:288`) — it over-performs at base.

Note: a separate, bigger balance problem — **science-token starvation** (playtest #12) — is tracked
as its own ticket **RC-033** (needs faucet-vs-sink measurement, not a quick tweak).

## 2026-06-11 playtest notes
- flame_jet reverted trail→spread (3-fireball cone) — trail cannot be a STARTING weapon (standoff enemies unreachable); trail verb lives on flamethrower (industrial) where it's drafted, not forced.

### Playtest balance batch — 2026-06-11 (this commit)
Three constant tweaks from Jeff's live playtest session:

1. **2× dungeon density** — `BASE_ENEMY_COUNT` 26 → 52, `ENEMIES_PER_TIER` 8 → 16 (`src/run/dungeonPopulate.ts`). Dungeon felt thin; per-kill gem values unchanged so doubled per-clear income is intentional for now.
2. **50× boss HP** — `BOSS_HP_MULT` 5 → 50 (`src/run/bossEvent.ts`). Well-upgraded players melted the boss at 5× base; bumped 10× (to 50× effective) to make it a real fight.
3. **Field Medic regen −75%** — `field_medic.effectPerLevel.regenHps` 0.8 → 0.2 and Heartwood fusion `regenHps` 0.7 → 0.2 (`src/run/passiveData.ts`). Passive regen was too powerful a crutch at high stacks; desc strings updated to match.

**Deferred intent (Jeff pre-approved direction, not yet the moment):** when the doubled-density economy runs hot, halve per-kill gem values to rebalance.

## References
- Spec: `docs/superpowers/specs/2026-06-06-iron-age-slice-design.md` §6
- KNOWN_ISSUES.md #2, #3, #4. Depends on RC-008 (content present). Decomposed from RC-005.
- 2026-06-10 playtest notes (#3, #5, #8, #9).
