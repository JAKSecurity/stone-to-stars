# RC-028: Culture sink — Traditions meta-progression
**Status**: Delivered  **Priority**: P3  **Type**: Feature
**Created**: 2026-06-09

## Delivery — 2026-06-10
Built behind the ratified design gate (spec `docs/superpowers/specs/2026-06-10-culture-traditions-design.md`)
on branch rc-028-traditions, then reconciled onto current main (rc-015/004/017/021). Ships an
always-visible 8-node / 40-rank Traditions board (culture-only exponential cost COST_G=1.6, hard
per-node caps in `computeRunModifiers`, light age-gating, no income/run-duration tradition), a
`CivState.traditions` map behind a save migration (bumped to **version 3** — pre-v3 saves reset,
matching RC-017's rescale-resets stance), five capped RunModifiers axes, and RunScene seeding of
`startWeaponLevel` + an Oratory draft-reroll. Merge integrated rc-028's draft refactor with rc-017's
two-line cards. Verified: tsc clean, 185 vitest, build clean, Playwright (board renders on merged civ
screen; buy Vigor → rank 0→1, culture 500→476, next cost 38, save persists).

## Summary
Culture is the weakest resource: few techs want it and it has no ongoing sink. Add a "Traditions"
panel — small permanent run modifiers purchased with culture — giving the 4th resource an identity
and every age an overflow spend.

## Context
From the 2026-06-09 review (item D1). The largest new system in the review batch — needs a
brainstorm/spec pass with Jeff before implementation (scope intentionally loose here):
- A flat, always-visible grid of tradition nodes on the civ screen (per `jeff-ui-design`: no
  modal, no tree-collapse), each a modest permanent run bonus (e.g. +start HP, +pickup radius,
  +reroll a draft, +starting weapon level, +run duration?)
- Costs scale with the exponential economy (`G^n` like techs) so it stays a sink at every age
- Distinct from techs: traditions are incremental/repeatable-feeling, techs are unlocks
- Vampire-Survivors "power-up screen" is the genre reference

Open design questions for the spec: node count/shape, caps, whether any traditions are
age-gated, interaction with RC-009 balance.

## Acceptance Criteria
- [ ] Brainstorm + spec ratified by Jeff before build (design gate)
- [ ] Traditions panel on the civ screen, all nodes simultaneously visible with costs + effects inline
- [ ] Culture-only costs, exponential scaling, persisted in save (versioned migration)
- [ ] Effects applied via `computeRunModifiers` alongside tech/building bonuses
- [ ] Unit tests for purchase/effect logic; Playwright verify purchase → run effect

## References
- Review session 2026-06-09 (item D1)
- `src/run/modifiers.ts`, `src/game/economy.ts`, `src/ui/civScreen.ts`
