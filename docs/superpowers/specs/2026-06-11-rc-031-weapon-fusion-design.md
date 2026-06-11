# RC-031 — Weapon system redesign: Forge & Fuse (Design)

**Date:** 2026-06-11
**Ticket:** [RC-031](../../tickets/RC-031-weapon-draft-rework.md)
**Status:** Approved — ready for implementation plan

## Problem

The in-run weapon/upgrade loop is stat-scaling on rails: 40+ weapons that are mostly the same five
behaviors with bigger numbers, flat always-good perks that stack forever, and draft picks that are
auto-accepts instead of decisions. North star (Jeff, 2026-06-10):

> "With *these* upgrade choices, and my available weapons (pre-determined by my civilization), I
> should go for **X build**."

Inspirations studied: **Slay the Spire** (deck identity, commitment), **Vampire Survivors**
(weapon/passive interplay), **Ball x Pit** (any two balls fuse into a hybrid inheriting both
behaviors), **Megabonk** (every weapon a distinct verb with a distinct screen signature).

## Approved decisions (brainstorm, 2026-06-10/11)

1. **Build model = fusion spine + tradeoff passives + active item** ("Forge & Fuse").
2. **Chain fusion, 2 weapon slots.** Melee/ranged split removed. Fusing merges both equipped
   weapons into one hybrid that inherits both behaviors and frees a slot; a maxed hybrid can fuse
   again with a third weapon. Hybrids cap at **3 base behaviors**. 2–3 fusions per run expected.
3. **Fusion gate = max-level parents, plus catalysts.** When both equipped weapons are at max
   level the draft offers their fusion. Mini-bosses (RC-019) rarely drop a **fusion catalyst**
   allowing an early fuse at current levels (weaker hybrid now vs. patience).
   **Max levels scale by age:** early tiers ~2–3 levels, later tiers up to 5.
4. **Risk vocabulary = stat tradeoffs only.** Upgrades are +X/−Y sidegrades ("double fire rate,
   −40% range"). No friendly fire, no deferred-cost curses, no slot sacrifice (explicitly rejected).
5. **Active item, right-click, tech-unlocked, picked pre-run.** 1 charge per run by default; some
   upgrades add charges/recharge. Age-flavored: net (slow group) → poison gas zone (DoT) →
   grenade volley. Attacks the "run is 90% passive" problem.
6. **Passives: 2 slots + rare fusion.** Passives are stat-tradeoff sidegrades with levels; when
   both are maxed a rare passive-fusion offer can merge them, freeing a slot. Replaces today's
   unlimited flat-perk stacking.
7. **Civ shapes the pool via a pre-run Expedition Kit.** Player selects up to 4 unlocked weapons
   (one is the start weapon — extends RC-027) + 1 unlocked active. Only kit weapons appear in
   drafts, so the fusion combo space is chosen before the run.
8. **Hybrid engine = systemic composition + authored skin.** Fusion unions behavior components by
   rule (any pair works); each archetype *pair* gets an authored name + sprite. Three-way hybrids
   get a templated prefix on the two-way name.

## §1 Run experience

**Pre-run (Expedition Kit):** at run launch the player assembles a kit from civ unlocks: up to
4 weapons (one flagged as start weapon) and 1 active item. Kit selections persist in `CivState`.

**Loadout:** 2 weapon slots + 2 passive slots + 1 active. XP gems still trigger level-up drafts.

**Fusion arc:** level both weapons to their (age-scaled) caps → draft surfaces the fusion →
both parents consumed, hybrid equipped at level 1 with a fresh (deeper) level track, slot freed →
draft a third kit weapon → repeat. Catalysts from mini-bosses allow fusing before the caps.

**Active item:** fired on right-click (and a touch/gamepad equivalent later). One charge per run;
recharge/extra-charge effects exist as passives and/or tech bonuses. Examples by age flavor:
- *Net* (early): slows a group of enemies in a thrown area for a few seconds.
- *Poison gas* (mid): lingering DoT zone covering a screen corner/region.
- *Grenade volley* (late): burst damage on a clustered group.

## §2 Behavior engine & data model

`WeaponDef.behavior` stops being a 5-value enum and decomposes into **components**:

```
trajectory: straight | lob | orbit | boomerang | trail (player-movement-anchored) | homing
onHit:      none | pierce(n) | explode(radius) | chain(n) | zone(lingerMs) | slow(pct)
volley:     count + spread (cone is just volley shape, not a behavior)
```

Existing behaviors map losslessly: straight→{straight}, pierce→{straight+pierce},
cone→{straight, wide volley}, orbit→{orbit}, lob→{lob+explode}.

**Base archetype vocabulary (~10 verbs, Megabonk-informed), each owning a screen signature:**

| Archetype | Verb | Screen signature | Age flavor examples |
|---|---|---|---|
| Bolt | straight shot | line to target | club throw → musket → rifle |
| Piercer | drill through | long lane | spear → ballista → anti-materiel |
| Spread | cone burst | fan in front | discus → blunderbuss |
| Orbiter | circle the player | ring around player | flail → chakram ring |
| Lobber | arc + explode | blast circles at range | grenade → mortar |
| Trail | damage where you walked | ribbon behind player | torch drag → oil fire |
| Zone/Mine | linger & deny | persistent ground decals | caltrops → mines → artillery zone |
| Chain | hop between enemies | arcs between mobs | sling ricochet → tesla chain |
| Boomerang | out and back | returning sweep | throwing axe → chakram return |
| Homing | seek targets | curving tracers | hunting falcon → guided missile |

The weapon catalog is **rebuilt** around these archetypes: each age offers a themed subset (not
all 10 per age), same-age weapons are sidegrades (see §4). The old `evolvesTo` /
`evolveRequiresPerk` system is **deleted** — fusion replaces evolution. RC-025's
"pierce as its own powerup" dissolves into the component model.

**Fusion rules (pure logic):**
- Hybrid components = union of parents' components.
- Trajectory conflicts resolve by a small precedence table (e.g. orbit > trail > lob > boomerang >
  homing > straight), with authored overrides allowed per pair when the rule result is boring.
- Stats derive from the parents' *leveled* stats against the budget formula (§4) — this is what
  makes catalyst early-fusing a real tradeoff.
- Hybrid max level = deeper of the parents' tracks + 1 (gives every fusion headroom).
- 3-behavior cap: a hybrid carrying 3 base behaviors can no longer fuse.

**Identity layer:** `FusionDef` keyed by *archetype pair* (~25–30 authored entries):
name, hybrid sprite/palette, optional stat/behavior overrides. Example: Piercer × Spread =
"Dragonlance". Three-way hybrids: templated prefix from the third archetype ("Storm Dragonlance").
Unknown/missing pairs fall back to generated names so content gaps never block the engine.

**Passive model:** passives get levels and tradeoff stat effects (`+X primary / −Y secondary`).
Passive fusion mirrors weapon fusion at lower intensity: both maxed → rare draft offer → one
hybrid passive (authored small table), slot freed.

## §3 Civ & meta wiring

- Techs/buildings keep adding weapons to the unlocked pool (`RunModifiers.weapons`), unchanged.
- **New: actives are tech-unlocked** (net via early hunting/trapping tech, poison gas via
  alchemy/medicine tier, grenade volley via gunpowder). Surface in `runBonus` as `actives: [...]`.
- **Expedition Kit screen** is the new pre-run surface (extends the RC-027 start-weapon picker):
  pick kit weapons + active; selections persist in `CivState` (`kit`, `activeItem`).
- **Save v4, reset on bump (Jeff, 2026-06-11).** House precedent holds: `saveLoad.ts` resets on
  version mismatch (RC-017 stance) and this redesign keeps it — the catalog rebuild changes
  weapon ids wholesale, so v3 saves reset rather than migrate. New `CivState` fields (`kit`,
  `activeItem`) ship with sensible defaults for fresh saves (kit = first unlocked weapons,
  club start, no active until tech-unlocked). Related: manual save/load slots are now tracked
  separately as a backlog ticket (see RC-036 — renumbered after RC-034 was taken by the
  dungeon-expeditions work merged 2026-06-11).
- Traditions' civ-level flat run bonuses (`damageMult`, `draftRerolls`, …) stay as-is — the
  *in-run* flat perks are what's replaced. Passive pool starts universal with a hook for
  tech/tradition-unlocked passives later (new home for RC-025's pool expansion).

## §4 Rewards, drafts, balance

**Draft offer composition (replaces `draftOptions`):**
- Fusion offers (weapon or passive) always surface when eligible — they head the list.
- Otherwise a weighted mix: new kit weapon (only when a slot is empty, or as an explicit
  side-by-side swap card showing both stat lines), weapon level-up, passive (new/level-up).
- No strictly-weaker offers by construction (playtest #4): the kit is player-chosen and same-age
  weapons are sidegrades, so swaps are lateral by design.
- Catalysts are not draft cards — they drop from mini-bosses (RC-019 jackpot extension) and sit
  as a held token until the player fuses.

**Sidegrade balance:** every age has a DPS budget; a weapon's budget is spent across damage,
rate, coverage, and utility so same-age weapons are different *shapes* of the same power. Hybrid
budget ≈ sum of parents' spent budget × a small fusion premium (>1.0) — fusing is always worth
it, *when* you fuse is the decision. Age-scaled max levels: stone/bronze 2, iron/classical 3,
medieval/renaissance 4, industrial/modern 5.

## §5 Visual & feel identity (Megabonk pass)

- Every archetype owns a **VFX kit**, not just `projectileSprite`: projectile body + motion
  style, trail particle, impact effect, optional ground decal, hit sound, and a screen-shake
  weight class (dagger-tick vs. hammer-thump).
- **Squint test:** each archetype must be identifiable from silhouette + motion alone, across
  ages. Age reskins share the verb's signature with era-appropriate dressing.
- **Fusion visuals inherit both parents:** hybrid keeps parent A's projectile body/motion and
  parent B's trail/impact palette + on-hit effect — a Dragonlance visibly *is* spear flight with
  flame bursts. Fusion itself gets a celebration beat: flash, brief freeze-frame, name banner.
- **Juice baseline:** impact flashes, damage numbers weighted by hit size, micro-knockback, AoE
  telegraphs for zones/lobs. Rides on RC-022 (readability); RC-022's projectile-readability
  scope is subsumed here, its HUD scope is not.

## Testing

- All new logic stays pure and Phaser-free (`src/run/`): component composition, fusion
  resolution + precedence, budget formula, draft generation, kit validation, catalyst flow,
  v4 reset-on-mismatch behavior — unit-tested (fixture catalogs, fixture saves).
- End-to-end: Playwright canvas walkthrough (verify-canvas-game-playwright) covering
  kit selection → draft → level → fuse → active use → re-fuse → run end.

## Out of scope

- POI events (RC-026) as catalyst/active faucets — hook left open, not built here.
- Touch/gamepad bindings for the active item (keyboard/mouse first).
- Camp/city growth (RC-032), HUD readability beyond projectile identity (RC-022 remainder).

## Acceptance criteria (refines ticket)

- [ ] ~10 base archetypes with mechanically + visually distinct verbs; same-age weapons sidegrades
- [ ] Chain fusion works end-to-end: max parents → fuse → re-fuse, 3-behavior cap, catalysts
- [ ] Drafts offer tradeoff sidegrades only; no strictly-weaker offers; fusion offers lead
- [ ] Expedition Kit pre-run flow shapes the draftable pool; selections persist (save v4, reset on bump)
- [ ] Right-click active item: tech-unlocked, picked pre-run, 1 charge + recharge hooks
- [ ] Passives: 2 slots, tradeoff stats, rare passive fusion
- [ ] Fusion/draft/kit/migration logic pure + unit-tested; Playwright live-verifies the loop
