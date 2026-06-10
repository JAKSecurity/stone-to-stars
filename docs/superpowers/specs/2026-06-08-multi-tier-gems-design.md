# RC-004 — Multi-Tier Gems (Draft) — Design

**Date:** 2026-06-08  **Ticket:** [RC-004](../../tickets/RC-004-multi-tier-gems.md)  **Capability:** C3
**Mode:** Authored solo during an unattended session. This is the **draft** Jeff asked for: author the
tiered gem art + a generator + tests + wire a low-risk cosmetic hook, then present the tier-semantics
decision for ratification. New sprites mean this sits behind the **art-ratification gate** — branch
only, not merged.

## Problem

The art pass ships one flat 4-point diamond per resource (`gem_<resource>`). RC-004 asks for (a)
richer Diablo II–style faceting and (b) a small **quality progression** (2–3 tiers, not D2's five).
Two questions had to be settled before art: what a tier *means*, and how many tiers earn their keep.

## Decision: 3 cosmetic tiers, selected by age (recommended; Jeff ratifies)

**Tiers (3):** `Chipped → Cut → Brilliant`. The middle tier `Cut` **is the current gem unchanged**, so
the existing look is preserved and only the low/high ends are added.

**Semantics: purely cosmetic, keyed to the run's age tier.** A gem's tier is chosen from
`Expedition.tier` (which already equals an `AGE_ORDER` index, 0–7 — no new state):

| Expedition tier | Ages | Gem tier |
|---|---|---|
| 0–2 | Stone / Bronze / Iron | **Chipped** |
| 3–5 | Classical / Medieval / Renaissance | **Cut** |
| 6–7 | Industrial / Modern | **Brilliant** |

**Why cosmetic, not a gameplay value multiplier.** A value/score hook entangles directly with the
RC-009 holistic economy balance (which is gated on Jeff's playtest), so baking a balance change into
an unattended art draft would be the wrong call. Cosmetic-by-age is pure polish, fully reversible,
adds zero balance surface, and still showcases the faceting progression as the player advances. If
Jeff wants a gameplay hook, the generator + tier plumbing built here are exactly what a value tier
would also need — this is a clean substrate for either choice.

**Alternatives considered:**
- *Value tiers* (higher tier = more resources) — deferred: balance entanglement, see above.
- *Run-quality tiers* (tier scales with kills/survival) — more interesting but needs feel tuning and a
  HUD signal; out of scope for a draft.
- *5 tiers (full D2)* — rejected by the ticket's own "2–3, not five" guidance.

## Art — `src/art/sprites/gems.ts`

Three generators, all 16×16, all pulling the resource color from `PAL` and using `shade()` for facet
depth (consistent with the pipeline). Coverage/cut-complexity grows with tier:

- **Chipped** — a small, rough, asymmetric shard: a 5-point irregular poly in a slightly darkened
  body color (`shade(c,-0.08)`) with one dark inner facet (`shade(c,-0.35)`) and a tiny chip notch.
  Reads as a rough, low-value fragment.
- **Cut** — the existing diamond, unchanged: 4-point body + one white facet. The baseline.
- **Brilliant** — a larger brilliant cut filling more of the canvas: an 8-point outline, a bright
  table facet (`shade(c,+0.45)`), crown facets in the base color, a dark pavilion (`shade(c,-0.30)`),
  and a small white sparkle. Most saturated/faceted; reads as a clean, high-value gem.

**Ids & backward compatibility.** The Cut tier keeps the existing id `gem_<resource>` (so every
current reference — `RunScene.dropGem`, civ resource icons — keeps working untouched). The two new
tiers add `gem_<resource>_chipped` and `gem_<resource>_brilliant`. Net: 8 new sprite ids, 4 existing
ids unchanged. A `gemSet(resource, color)` helper returns the trio; `GEMS` exports all 12 (4×3) and is
picked up by the registry's existing `...GEMS` spread.

## Tier-selection helper — `src/run/gemTier.ts` (pure)

```ts
export type GemTier = 'chipped' | 'cut' | 'brilliant';
export function gemTierForExpeditionTier(tier: number): GemTier;  // 0–2→chipped, 3–5→cut, 6+→brilliant
export function gemSpriteId(resource: Resource, tier: GemTier): string;
  // cut → `gem_${resource}` (baseline id); chipped/brilliant → `gem_${resource}_${tier}`
```

Kept out of the scene and out of the art module so both can stay focused and the mapping is unit
tested directly.

## Wiring (low-risk, reversible)

- **Run drop:** `RunScene.dropGem(x, y, resource)` resolves the sprite via
  `gemSpriteId(resource, gemTierForExpeditionTier(this.expedition.tier))` instead of the hard-coded
  `'gem_' + resource`. The gem still carries `resource` in its data, so collection/banking are
  unchanged — only the sprite differs. This is the single behavioral edit and it is purely visual.
- **Civ resource-bar icons:** left on the `Cut` baseline (`gem_<resource>`) for the draft. Showing the
  civ's current-age bracket on the resource bar is a nice follow-up but adds surface area; noted for
  the morning, not done here.

## Testing

- **Validity:** every generated def (4 resources × 3 tiers) passes `validateSpriteDef` (mirrors
  `art-sprites.test.ts` conventions); ids are well-formed and unique; the existing `gem_<resource>`
  ids still resolve to the Cut tier.
- **Mapping:** `gemTierForExpeditionTier` brackets every tier 0–7 correctly (boundaries 2/3 and 5/6);
  `gemSpriteId` returns the baseline id for `cut` and the suffixed id otherwise.
- **Visual:** render all 12 through `art-preview.html` and screenshot the gem block to confirm the
  three-tier progression reads at a glance (chipped < cut < brilliant in size/facet/saturation).

## Out of scope / non-goals

- No gameplay value/score change (cosmetic only) — that decision is Jeff's to make at review.
- No civ resource-bar tiering (follow-up).
- No change to drop *rate*, banking, or the economy.

## Verification gate

Branch `rc-004-gem-tiers`, not merged (new sprites → art-ratification gate). Morning review = ratify
the gem art **and** the cosmetic-by-age semantics (or redirect to a gameplay hook); then merge or
iterate.
