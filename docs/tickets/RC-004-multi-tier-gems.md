# RC-004: Multi-tier gems (Diablo II–inspired faceting + quality progression)
**Status**: Open  **Priority**: P3  **Type**: Enhancement
**Created**: 2026-06-06
**Capability**: C3 (Content & ages)

## Summary
The art pass ships one flat diamond per resource (`gem_exploration/science/industry/culture`).
Diablo II's gems are a strong reference for richer gem art and an optional **quality
progression**. Explore (a) nicer D2-style faceting for the gem sprites and (b) more than one
gem tier (a small progression, not "tons of levels").

## Context / reference
Diablo II gems = **7 types × 5 qualities** (35 variants): qualities are
**Chipped → Flawed → Normal → Flawless → Perfect**, each a cleaner, larger, more-saturated
faceted cut (rough shard → full brilliant gem). Our four resources map naturally to gem
colors (exploration≈topaz/gold, science≈sapphire/blue, industry≈ruby/red, culture≈emerald/green).

This composes well with the existing pipeline: a gem `SpriteDef` is just primitives, so a tier
is a richer poly fan (more facets) + a deeper color via `shade()`. A helper like
`gem(color, tier)` could generate the set. Ids would extend to e.g. `gem_<resource>_<tier>`.

Design questions to settle first (own brainstorm):
- What does a tier *mean*? (e.g. bigger gems from longer/cleaner runs, or purely cosmetic
  rarity, or a tier per age.) Gameplay hook vs pure polish.
- How many tiers actually earn their keep — likely 2–3, not D2's 5.
- Does the run drop higher-tier gems under some condition, and does the civ-screen resource
  bar show a tier?

Out of scope of the art pass; this is a depth/polish follow-up.

## Acceptance Criteria
- [ ] Decide tier semantics (cosmetic vs gameplay) and tier count
- [ ] Author tiered gem `SpriteDef`s with D2-style faceting (reuse `shade()` for depth)
- [ ] Wire tier selection into the run drop + civ resource icons if gameplay-linked
- [ ] Validity test + visual verification per art-pass conventions

## References
- Diablo II gems (qualities/types): https://diablo-archive.fandom.com/wiki/Gems_(Diablo_II) ; https://www.wowhead.com/diablo-2/guide/gem-properties-types-qualities-upgrading
- Current gems: `src/art/sprites/gems.ts`
- Pipeline: `src/art/` (shape-data + render-pass), `docs/superpowers/specs/2026-06-06-art-pass-design.md`
- Related future-art ticket: RC-003 (hero age-evolution)
