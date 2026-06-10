# Nightly Build Report — 2026-06-08 (for Jeff's morning review)

## TL;DR
While you were away I shipped **two features on two separate branches**, both fully built, tested, and
live-verified — **neither merged to `main`** (your review/ratification gate holds):

1. **RC-015 — orbit & lob projectile behaviors** (branch `rc-015-orbit-lob`). The two
   declared-but-unimplemented `WeaponDef.behavior` motions now work. **No new art** → this one is
   mergeable on its own once you've felt it; the only open item is feel-tuning the constants.
2. **RC-004 — multi-tier gems (DRAFT)** (branch `rc-004-gem-tiers`). A 3-tier cosmetic gem
   progression (chipped → cut → brilliant) with D2-style faceting, selected by age. **New sprites →
   behind the art-ratification gate.** Needs two decisions from you (art + tier semantics).

Both: **build clean**, **0 console errors** live, adversarially reviewed (**APPROVED**), Playwright-
verified by driving the real game loop and sampling live state. Screenshots in chat.

Your decisions in the morning:
- **RC-015:** play it, tune the feel constants if you want, then merge.
- **RC-004:** ratify the gem art (or say which to reimagine) **and** pick the tier semantics
  (recommended: cosmetic-by-age, as built) — then merge or iterate.

---

## RC-015 — Orbit & Lob Behaviors  (branch `rc-015-orbit-lob`, off `main`)

### What was broken
`WeaponDef.behavior` declared `straight | pierce | orbit | cone | lob`, but the run only implemented
the first three+cone. A weapon declaring `orbit`/`lob` flew straight. (Found during the nightly
age-expansion; all new weapons deliberately used only supported behaviors.)

### What it does now
- **Orbit** — a persistent ring of projectiles circles the player, tracking it, damaging on contact.
  The ring refreshes each cooldown (to the current level) **without stacking**; orbiter angle comes
  from the global run clock so a refreshed ring is seamless. Each orbiter re-hits a given enemy at
  most every `ORBIT_HIT_INTERVAL_MS` (it isn't consumed on contact).
- **Lob** — a projectile arcs to a frozen target point and **detonates on landing** with an AoE blast
  (shock-ring + shake), arcing *over* enemies in flight rather than hitting them mid-air.

### Architecture (clean, testable)
- New pure module `src/run/projectileMotion.ts` holds all geometry + the feel constants in one place
  (no Phaser), unit-tested in `tests/projectileMotion.test.ts` (7 cases).
- `RunScene` gained `summonOrbit` / `fireLob` / `detonate`, an orbit branch in `hitEnemy`, and the
  per-frame orbit/lob motion in `update()`. The death/juice block was extracted into a shared
  `applyDamageToEnemy` so bullet hits, orbit contact, and lob detonation all feel identical.

### Re-themed weapons (no new art — sprites already existed)
| Weapon | Age | cone → | Why |
|---|---|---|---|
| `flail` / `morningstar` | Medieval | **orbit** | spiked ball-on-chain = canonical orbit fantasy |
| `grenade` / `cluster_bomb` | Renaissance | **lob** | thrown explosive = canonical lob fantasy |

Base + evolution were both re-themed so a weapon line's feel stays consistent through evolution. All
`straight`/`pierce`/`cone` variety elsewhere is untouched. **More weapons can be re-themed trivially
now** (Chakram, Mortar, Buzzsaw, TNT Barrel are natural fits) — left for you to opt into during the
balance pass.

### Verification evidence
- **133 unit tests green** (124 prior + 7 motion + 2 behavior), `npm run build` clean.
- **Live (Playwright, drove the real loop deterministically; 0 console errors):**
  - *Orbit:* 3 orbiters ride a ring at radius exactly 90px; a pinned durable enemy took 103.5 dmg
    over **5 distinct hits** (cadence working — not a one-frame delete); after teleporting the player,
    all 3 orbiters re-centered at radius 90 → **the ring tracks the player**.
  - *Lob:* a 2-grenade volley arced (apex lift = exactly 70px = `LOB_PEAK_HEIGHT`), both detonated at
    frame ~37 (~592ms, matching the computed `flightMs`), and the array emptied cleanly (no leak); a
    downrange cluster took **92 / 46** damage (overlapping blasts vs single blast) confirming the AoE
    radius query.
- **Adversarial review: APPROVED_WITH_NITS.** One Important finding — the orbit re-hit cadence was
  stored per-orbiter and wiped on every ring refresh, letting an orbiter re-hit sooner than the
  interval. **Fixed** (commit `520f3f0`): the cadence now lives on the *enemy*, keyed by
  `(weapon, orbiter index)`, so it survives the refresh and is freed when the enemy dies (no leak).
  Re-verified live (min hit gap 688ms, well above the 320ms floor).

### Feel constants (first-pass — tune to taste, like the slice-1 juice intensities)
`src/run/projectileMotion.ts`: `ORBIT_RADIUS=90`, `ORBIT_ANGULAR_SPEED=3.0` rad/s (~2.1s/rev),
`ORBIT_HIT_INTERVAL_MS=320`, `LOB_PEAK_HEIGHT=70`, `LOB_BLAST_RADIUS=64`, `LOB_FLIGHT` clamp
`[350,1100]ms`.

### Commit map (branch `rc-015-orbit-lob`)
`a0aba99` spec+plan · `cdce1e2` motion helper+tests · `73e6eaa` shared-damage refactor ·
`f18308c` scene wiring · `2681ffc` weapon re-theme · `520f3f0` cadence fix.

### To review
`git checkout rc-015-orbit-lob` · `npm test` (133) · `npm run dev` → research up to Medieval (flail)
and Renaissance (grenade), or just trust the screenshot + state evidence. Tune constants → merge.

---

## RC-004 — Multi-Tier Gems  (DRAFT, branch `rc-004-gem-tiers`, off `main`)

### What it is
A **draft** (as you asked) of richer gem art + a small quality progression. **3 cosmetic tiers per
resource:** `Chipped → Cut → Brilliant`. **Cut is the existing diamond, unchanged**, kept under the
baseline `gem_<resource>` id — only the low and high ends were added (`_chipped`, `_brilliant`).
D2-style faceting via the shape-data pipeline + `shade()`.

### Two decisions for you to ratify
1. **The art** (this is the art-ratification gate). See the attached art-preview sheet — all 12 gems
   (4 resources × 3 tiers). My read: brilliant looks distinctly premium; chipped reads as "smaller/
   simpler/duller" but is more "small gem" than obviously "rough chip" — tell me if you want it
   rougher, or any tier reimagined.
2. **The tier semantics.** I built the lowest-risk option: **purely cosmetic, keyed to the run's age
   tier** (`Expedition.tier`, which is already an age index — no new state):
   - tiers 0–2 (Stone/Bronze/Iron) → **Chipped**
   - tiers 3–5 (Classical/Medieval/Renaissance) → **Cut** (so mid-game looks exactly as before)
   - tiers 6–7 (Industrial/Modern) → **Brilliant**
   **Why cosmetic, not a value/score hook:** a gameplay-value tier entangles directly with the RC-009
   economy balance (gated on your playtest), so baking a balance change into an unattended draft would
   be the wrong call. Cosmetic-by-age is pure polish, fully reversible, zero balance surface — and the
   generator + plumbing built here are exactly what a value tier would also need, so it's a clean
   substrate if you'd rather go that way. **Your call.**

### What's wired
`RunScene.dropGem` resolves the sprite by tier (`gemTierForExpeditionTier(this.expedition.tier)`).
The gem still carries its `resource`, so collection/banking are **unchanged** — only the sprite
differs. Civ resource-bar icons stay on the Cut baseline (a follow-up could tier those too).

### Verification evidence
- **131 unit tests green** (5 tier-mapping + 2 gem-registration + the registry's validity sweep over
  the 8 new sprites), build clean.
- **Live (Playwright):** in-run drops resolve **real, tier-correct textures** — tier 0 →
  `gem_industry_chipped`, tier 4 → `gem_industry` (cut baseline), tier 6 → `gem_industry_brilliant`,
  all registered (no missing-texture box), `resource` data intact. Art-preview sheet renders all 12
  through the real pipeline. 0 console errors.
- **Adversarial review: APPROVED_WITH_NITS.** No backward-compat breakage (only historical docs
  referenced the dropped named consts; civ icons still use the cut baseline), no economy change,
  correct tier source/boundaries, all poly coords in-bounds.

### Commit map (branch `rc-004-gem-tiers`)
`bad2eda` spec+plan · `b84ad1b` gem-tier helper+tests · `e2506ab` tiered gem art · `9216791` dropGem
wiring.

### To review
`git checkout rc-004-gem-tiers` · `npm run dev` → open `/art-preview.html` (gems are the first cards)
or launch any run to see drops · ratify art + semantics → merge or iterate.

---

## Noted while working (not in scope tonight)
- **`validateSpriteDef` doesn't bounds-check `poly` vertices** (only circle/rect/line) — found during
  the RC-004 review. Every gem coord is in-bounds (verified by hand), so no current defect, but a poly
  with out-of-bounds points would pass the registry validity test silently. Proposed small follow-up:
  add poly-vertex bounds checking to `src/art/registry.ts` so the "every sprite is valid" test
  actually covers polys. Worth a tiny ticket if you agree.
- **Tracker drift (still open):** the multi-level-up draft-queue fix shipped in RC-009 slice 1, but
  `KNOWN_ISSUES.md #3` still lists it open and the RC-009 acceptance checkbox is unchecked. Quick
  reconcile whenever you touch tracking.

## Not done (by design)
- **Neither branch merged** (your gate). RC-015 is art-free and mergeable after a feel-check; RC-004
  awaits your art + semantics ratification.
- RC-009 holistic balance / juice-intensity tuning — still gated on your playtest feel.
- RC-015 feel-tuning and any further weapon re-themes onto orbit/lob — yours to drive.
