# RC-028 — Culture Sink: Traditions Meta-Progression — Design

**Date:** 2026-06-10  **Ticket:** [RC-028](../../tickets/RC-028-culture-traditions.md)  **Type:** Feature
**Mode:** Authored solo during a delegated design-gate session. This is a **design gate** — no
production code is written until Jeff ratifies. All magnitudes below are first-pass, meant to be
tuned by playtest exactly like the RC-009 slice-1 juice intensities and the RC-015 feel constants.

## Problem

Culture is the weakest of the four resources. It is faucetted (a passive in-run tick scaled by a
biome's `culture` bias, plus 3–6/level from Cathedral / University / a couple of biome-lean
buildings) but barely sunk — only a handful of techs and two buildings cost any culture, so banked
culture piles up with nothing to spend on. RC-028 gives culture a dedicated, perpetual sink and an
identity: **Traditions** — a flat board of small, permanent, *capped* cross-run bonuses bought with
banked culture. The genre reference is the Vampire-Survivors "PowerUp" screen: a grid of modest
account-level upgrades you chip away at across runs.

Traditions are deliberately distinct from techs and buildings:

| Layer | Cost inputs | Feel | Persistence |
|---|---|---|---|
| **Techs** | mixed (sci/ind/cult) | one-shot *unlocks* (buildings, ages, weapons) | permanent |
| **Buildings** | mixed, level-scaled | placed, level-scaled *yield + run bonus* | permanent |
| **Traditions** | **culture only** | incremental, repeatable-feeling, *capped* run bonus | permanent |

## The hard constraint: no late-game runaway

RC-017 decoupled income from cost on purpose: income grows on a gentle `INCOME_G = 1.26` per-age
curve while purchase costs grow on a steep `G = 1.75` curve, so every successive purchase costs
proportionally more runs than the last. Building yields are ×20, run rewards ×2.5, and run length is
`1 min + 1 min/age`. Traditions must not reintroduce a runaway into that carefully-decoupled curve.
Two design rules guarantee this:

1. **Every tradition bonus is hard-capped by max rank.** The total run-power delta from a
   fully-maxed board is a *fixed constant ceiling* — there is no term that grows with runs or ages.
   This is the structural difference from a per-run multiplier: a maxed board asymptotes, it does
   not compound. The balance pass can treat "all traditions maxed" as one known, bounded power state.

2. **No tradition touches income or run length.** Traditions never grant resources, resource yield,
   pickup of resources, or run duration. They spend culture; they never produce or accelerate any
   faucet. This severs the feedback loop — you cannot grind traditions to grind resources faster to
   grind traditions faster. (See *Open fork F3* — run-duration was explicitly considered and rejected
   for exactly this reason.)

Together these mean traditions add a one-time, bounded "new-game-plus" floor to every run, then stop
mattering — which is the correct shape for a permanent meta-progression layer sitting on top of an
intentionally-grindy decoupled economy.

## Tree shape — a flat, always-visible board (not a tree)

Per `jeff-ui-design` (maximum simultaneous visibility, flat grids over progressive disclosure, no
modal, no collapse): Traditions is **not** a branching prerequisite tree despite the ticket's
"tree" shorthand. It is a flat grid of independent nodes, each rank-upgradeable in place — the same
interaction as upgrading a placed building (click to buy the next rank). Every node is visible at all
times with its cost and current/next effect inline; nothing is hidden behind unlocks. A handful of
nodes carry a visible age-lock badge (fork F2) but remain on the board greyed — you always see the
whole space.

### The eight traditions (first-pass)

Eight nodes, grouped as two thematic rows of four for the grid. Each shows: icon, name, `rank/max`,
the effect *at current rank*, and the **culture** cost of the next rank (or `MAX`).

| # | Tradition | Per-rank effect | Ranks | Cap at max | Maps to `RunModifiers` field |
|---|---|---|---|---|---|
| 1 | **Vigor** | +8 start max HP | 5 | +40 HP | `maxHp` |
| 2 | **Foraging** | +6 px pickup radius | 5 | +30 px | `pickupRadius` *(new)* |
| 3 | **Drill** | +4% fire rate | 5 | +20% | `fireRateMult` *(new)* |
| 4 | **Logistics** | +3% move speed | 5 | +15% | `moveSpeedMult` *(new)* |
| 5 | **Tactics** | +3% damage | 5 | +15% | `damageMult` |
| 6 | **Scholarship** | +1 draft choice | 2 | +2 choices | `draftChoices` |
| 7 | **Oratory** *(age-gated)* | +1 draft reroll | 3 | +3 rerolls | `draftRerolls` *(new)* |
| 8 | **Heritage** *(age-gated)* | starting weapon +1 level | 2 | +2 levels | `startWeaponLevel` *(new)* |

Rationale for the magnitudes:

- **Damage/fire-rate kept small (+15%/+20% caps).** RC-017's ×20 building yields already pour into
  the existing `damageMult` from techs + buildings; traditions are the cherry, not the cake. A small
  capped damage contribution avoids stacking into a one-shot build.
- **Vigor +40 on a 100 base** is a meaningful survivability floor without trivializing enemy offense
  (which RC-009 just sharpened).
- **Scholarship/Oratory/Heritage are the "shape the run" nodes** — more choices, rerolls, a
  head-start weapon. These are the strongest *feel* levers, so they get the fewest ranks (2–3) and
  the two most run-defining (Oratory, Heritage) are age-gated.
- **Foraging/Logistics** are pure quality-of-life — they make a run *smoother*, not *stronger* in a
  way that breaks the curve.

This is **40 total ranks**. At the cost curve below that is a sink lasting well into the late game.

## Cost curve

Culture-only, per-node exponential, tracking the economy's `G` so it stays a sink as income creeps:

```
traditionRankCost(node, nextRank) = round( node.base * COST_G ^ (nextRank - 1) )    // culture only
COST_G = 1.6     // gentler than tech's 1.75: culture is the weakest faucet, so the per-rank
                 // multiplier is eased to keep the long tail reachable rather than asymptotic-forever
```

Per-node `base` (first-pass), chosen so rank 1 is affordable a couple of ages in, not turn 1:

| Tradition | base | Rank costs (culture)        | Node total |
|---|---|---|---|
| Vigor      | 24 | 24, 38, 61, 98, 157         | 378 |
| Foraging   | 20 | 20, 32, 51, 82, 131         | 316 |
| Drill      | 28 | 28, 45, 72, 115, 184        | 444 |
| Logistics  | 22 | 22, 35, 56, 90, 144         | 347 |
| Tactics    | 30 | 30, 48, 77, 123, 197        | 475 |
| Scholarship| 40 | 40, 64                      | 104 |
| Oratory    | 45 | 45, 72, 115                 | 232 |
| Heritage   | 60 | 60, 96                      | 156 |
| **Board**  |    |                             | **≈ 2,452 culture** |

Culture is the weakest faucet, so ~2,450 culture is many tens of runs of overflow — a durable sink
that never fully "closes" before the run economy itself plateaus. `COST_G` and the `base` column are
the **two knobs** for the playtest tuner; everything else falls out of them.

## Age-gating (fork F2 — recommended: light gating of the two run-shaping nodes)

Most nodes are gated by **cost, not age** — early culture income is low, so a Stone-age player
literally cannot afford much, and the flat board stays honest to `jeff-ui-design`. But two nodes are
strong enough early that cost alone is an insufficient gate:

- **Oratory** (draft rerolls) — requires **Classical** age.
- **Heritage** (starting weapon level) — requires **Medieval** age.

A gated node stays visible on the board (greyed, with an `🔒 Medieval` badge) so the whole space is
always legible; the buy button is disabled until the civ reaches that age. This preserves
"always-visible, flat" while preventing a player from buying a head-start weapon before the content
warrants it. The gate reads age via the existing `getAge(civ)` against `AGE_ORDER`.

## Data model

```ts
// game/types.ts — CivState gains one field; bump version + migrate.
interface CivState {
  version: number;                       // bump (e.g. N -> N+1)
  banked: ResourceBundle;
  researched: string[];
  buildings: PlacedBuilding[];
  traditions: Record<string, number>;    // NEW: traditionId -> rank (absent/0 = unowned)
  runs: number;
}

// game/types.ts — RunModifiers gains the new capped axes.
interface RunModifiers {
  maxHp: number;
  damageMult: number;
  draftChoices: number;
  weapons: string[];
  pickupRadius: number;      // NEW (px, base from config)
  moveSpeedMult: number;     // NEW (1.0 base)
  fireRateMult: number;      // NEW (1.0 base)
  draftRerolls: number;      // NEW (0 base)
  startWeaponLevel: number;  // NEW (1 base — weapons start at level 1)
}

// civics/traditionData.ts — registry, mirrors tech/techData.ts & camp/buildingData.ts shape.
interface TraditionDef {
  id: string;
  name: string;
  icon: string;              // dom-sprite / emoji, consistent with civScreen ICON usage
  base: number;             // rank-1 culture cost
  maxRank: number;
  effectPerRank: Partial<RunModifierDelta>;  // applied (rank) times, then clamped by cap
  requiresAge?: AgeId;       // F2 gate; absent = cost-gated only
  blurb: string;             // one-line effect description for the card
}
```

A new `RunModifierDelta` type (the additive-fields subset of `RunModifiers`) lets traditions, and
later anything else, declare their contribution without weapons/draftChoices noise. Per-rank deltas
are summed `rank` times in `computeRunModifiers` and then **clamped to the node's cap** so a future
mis-tune can never exceed the documented ceiling.

### Migration

`traditions` defaults to `{}` for any save below the new `version`. The migration is a single
defaulting step in the existing save-load path (same place tech/building migrations live); add a unit
test asserting an old save loads with `traditions === {}` and no other field disturbed.

## Modules (mirrors the tech/ and camp/ split)

- **`src/civics/traditionData.ts`** — the `TRADITIONS` registry (the eight defs above). Pure data.
- **`src/civics/traditions.ts`** — pure logic, no DOM/Phaser:
  - `nextRankCost(civ, id): number | null` — `null` if maxed.
  - `canBuyTradition(civ, id): boolean` — affordable AND below maxRank AND age-gate satisfied.
  - `buyTradition(civ, id): CivState` — returns a new civ with rank+1 and culture spent (uses the
    existing `spend()` from `economy/resources.ts`); throws/no-ops if `!canBuyTradition`.
  - `traditionRank(civ, id): number`.
- **`src/run/modifiers.ts`** — `computeRunModifiers` gains a third loop (after techs, after
  buildings) summing each owned tradition's per-rank delta × rank, clamped to cap. New base values
  (`BASE_PICKUP_RADIUS`, `BASE_MOVE_MULT = 1`, `BASE_FIRE_MULT = 1`, `BASE_DRAFT_REROLLS = 0`,
  `BASE_START_WEAPON_LEVEL = 1`) live in `game/config.ts` alongside the existing `BASE_*`.

## RunScene / draft consumption

The new modifiers must actually do something in a run. Wiring (RunScene is already the consumer of
`RunModifiers`):

- **`pickupRadius`** — added to the gem/pickup attract radius.
- **`moveSpeedMult`** — multiplies player move speed.
- **`fireRateMult`** — divides weapon cooldowns (or multiplies fire cadence) at run start.
- **`startWeaponLevel`** — the starting weapon(s) begin at this level instead of 1.
- **`draftRerolls`** — the level-up draft UI gains a "Reroll" affordance with `draftRerolls` uses,
  re-rolling the offered choices. (This is the only UI-side addition in-run; `draftChoices` already
  controls how many options appear.)

These reuse the existing `PerkEffect`-style multiplier plumbing where it already exists
(`moveSpeedMult`, `fireRateMult`, `pickupRadius` already appear on `PerkEffect`), so the run loop
likely already multiplies these in for in-run perks — the tradition values just seed the run's
starting modifier instead of being granted mid-run.

## UI — Traditions panel on the civ screen

A third `.panel` in the existing `.cols` row of `civScreen.ts` (Tech Tree | Base Camp | **Traditions**),
or, if three columns crowd the width, a full-width Traditions board below `.cols`. Recommend a
dedicated **2×4 card grid** styled like the building palette (`.bgrid`/`.bcard`), reusing
`costText` / `canAfford` / `shortfallText` and `spriteCanvas`. Each card:

- icon + name + `rank N / max M`
- the effect text at current rank (e.g. "Pickup radius +12 px")
- next-rank cost as `🎭NN` via `costText`, or a `MAX` tag
- a **Buy** button — disabled when unaffordable (show `need 🎭NN` shortfall) or age-locked (show
  `🔒 Medieval`); clicking calls a new `cb.onBuyTradition(id)` callback
- `done`-style visual when maxed (mirrors the tech `✓` / building `Max level` treatment)

No modal, no collapse — the whole board is on-screen with the rest of the civ screen, per
`jeff-ui-design`.

## Interaction with RC-009 balance + RC-017 economy

- **RC-009 (juice + balance pass):** traditions add a flat, capped power layer. The eight caps above
  (+40 HP, +20% fire, +15% move, +15% dmg, +30 px pickup, +2 choices, +3 rerolls, +2 weapon levels)
  are *first-pass* and should be folded into the RC-009 tuning board as a single "fully-maxed
  traditions" power state the enemy-offense curve is checked against. Because the ceiling is fixed,
  this is one bounded check, not an open-ended interaction.
- **RC-017 (decoupled economy):** costs are culture-only on `COST_G = 1.6`, sitting just under the
  tech `G = 1.75`, so as income creeps up on `INCOME_G = 1.26` the board stays a sink. Critically,
  **no tradition feeds income or run length**, so the ×20 yields / ×2.5 rewards / `1+1/age` length
  knobs are untouched and the runaway vector is closed by construction.

## Testing

- **Unit (`traditions.ts`):** `nextRankCost` follows `base * 1.6^(rank-1)` and returns `null` at
  max; `canBuyTradition` false when unaffordable, when maxed, and when age-gate unmet (Oratory before
  Classical, Heritage before Medieval); `buyTradition` increments rank, spends exactly the culture
  cost, leaves other resources untouched, and no-ops past max.
- **Unit (`modifiers.ts`):** `computeRunModifiers` sums tradition deltas × rank on top of
  tech/building bonuses; each axis clamps at its documented cap even if ranks are force-set past max;
  a civ with no traditions yields the unchanged base modifiers (regression guard for existing tech/
  building tests).
- **Unit (migration):** an old-version save loads with `traditions === {}` and all other fields
  intact.
- **Live (Playwright, `verify-canvas-game-playwright`):** on the civ screen, buy a Vigor rank (or
  force-bank culture via `window.__game`); confirm the card advances to `1/5` and culture decremented
  by the cost; start a run and confirm start HP reflects the bonus (and/or that an age-gated card is
  disabled with its lock badge until the age is reached); 0 console errors.

## Open design forks for ratification

These are the genuine judgment calls. Recommendations are baked into the spec above; Jeff to confirm
or redirect:

- **F1 — node count & cap magnitudes.** Recommended: 8 nodes / 40 total ranks with the caps in the
  table. Alternative: a leaner 5-node board (drop Foraging, Logistics, Scholarship) if eight feels
  like too much surface for a first cut.
- **F2 — age-gating.** Recommended: light gating of only Oratory (Classical) and Heritage (Medieval);
  everything else cost-gated. Alternatives: (a) no age-gating at all (pure cost gate, simplest, most
  faithful to "flat board"); (b) tier the whole board across ages.
- **F3 — run-duration tradition.** Recommended: **exclude it.** The ticket floated "+run duration?"
  — it is the cleanest runaway vector (longer run = strictly more banked income = faster traditions),
  so it is deliberately omitted. Flagging in case Jeff wants it as a tiny, hard-capped exception.
- **F4 — `COST_G` value.** Recommended `1.6` (just under tech's 1.75) so the long tail stays
  reachable. Alternative: reuse `1.75` exactly for one economy constant, accepting a steeper,
  more-asymptotic late board.

## Out of scope / non-goals

- No new resource types, no change to the four-resource model or the RC-017 income curve.
- No branching/prerequisite tradition tree — flat board only (`jeff-ui-design`).
- No income, yield, or run-duration traditions (the anti-runaway rule).
- No re-tuning of existing tech/building bonuses — traditions are additive on top.
- Final cap/cost numbers are first-pass; precision tuning is a playtest pass folded into RC-009.

## Verification gate

Branch `rc-028-traditions-spec` (this spec only — **no implementation**). Jeff ratifies or adjusts
the design (resolving forks F1–F4); on ratification the next session writes the implementation plan
(`superpowers:writing-plans`) and builds on a fresh `rc-028-traditions` branch behind the usual
unit + Playwright gate.
