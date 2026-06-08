# RC-016: Modern age content (mechanized warfare) + hero face/eye fixes
**Status**: Delivered  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-07
**Capability**: C3 (Content & ages)

## Summary
Eighth age — **Modern** (20th-century mechanized warfare), built on the established data-driven
pattern (no engine rewrites beyond a camp-grid bump). Plumbs `'modern'` into `AgeId`/`AGE_ORDER`,
raises `GRID_SIZE` 20→25 (5×5) for the larger building set, and adds:
- **Techs (4):** Combustion (gates the age), Ballistics, Flight, Radio.
- **Buildings (3):** Motor Pool, Barracks, Airfield.
- **Biome:** No Man's Land (tech-gated by Flight).
- **Enemies (4):** Rifleman, Halftrack, Gunship, **Juggernaut** (mini-boss, 62×62 — largest sprite).
- **Weapons (4 base + 4 evolutions):** Assault Rifle→Battle Rifle, RPG→Missile Barrage,
  Mortar→Artillery, Sniper→Anti-Materiel Rifle.
- **Hero:** hero_modern, plus all sprites via the `src/art` shape-data pipeline.

Also folds in **hero art fixes** (from Jeff's review): gave hero_medieval a visible open-faced
sallet (was a faceless great helm); fixed hero_modern's rifle draw-order (now in front of the body)
+ slotted muzzle brake; added eyes to hero / hero_iron / hero_classical / hero_renaissance.

## Acceptance Criteria
- [x] Modern techs/buildings/biome/enemies/weapons + evolutions (data)
- [x] Sprites for all new content via `src/art`; hero face/eye fixes
- [x] Reachable end-to-end (research → Modern → run No Man's Land); 112 tests green; build clean
- [x] Adversarial review APPROVED (weapon reachability, no id collisions, no test weakening)
- [x] Sprite art ratified by Jeff (2026-06-07)

## References
- Built on the nightly age-expansion pattern: `docs/superpowers/plans/2026-06-07-nightly-age-expansion.md`.
- Engine constraint reused: weapons use only straight/pierce/cone (orbit/lob still unimplemented — RC-015).
