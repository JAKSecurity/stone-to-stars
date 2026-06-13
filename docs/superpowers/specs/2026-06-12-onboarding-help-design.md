# Player Onboarding — First-Run Help Card + README + Pitch Copy

**Date:** 2026-06-12
**Status:** Design ratified with Jeff 2026-06-12 ("Looks good").
**Context:** Preparing rogue·civ to ship publicly (playable on jaksecurity.com, source on
a public GitHub repo). Today a first-time player lands on the civ screen with zero
explanation that the expedition is a WASD survivor run with auto-firing weapons; the
README still describes the original vertical slice (Stone→Bronze, 3×3 camp), not the
finished Stone→Space game with a finale.

This spec covers **onboarding only**: an in-game first-run help card, a README rewrite,
and the canonical pitch/landing copy. The portfolio card, repo publication (with a
secret-scan gate), and deploy are the *release phase* — tracked separately, out of scope
here.

## Canonical pitch (single source of truth; reused in card, README, landing)

**One-liner:** Lead a civilization from the Stone Age to the stars — one desperate
survivor run at a time.

**Short blurb:**
> Rogue·Civ fuses a survivor-style auto-battler with a Civ-style tech tree. Each
> expedition drops you into the wilds: dodge the swarm with WASD while your weapons fire
> on their own, and haul back the gems you collect. Spend that haul on technology and
> buildings that carry your people through the ages — Stone, Bronze, Iron… all the way to
> Space — making every future run deadlier in your favor. Death is never the end:
> whatever your civilization banks, it keeps. Climb high enough and you'll face The Last
> Stand — a final wave of alien invaders and their mothership, with your whole
> civilization on the line.

**Controls (verified against `src/scenes/RunScene.ts`):**
- Move — W A S D
- Attack — automatic; your weapons fire on their own
- Active item — Right-click (aims at the cursor; only if equipped)
- Pause — Esc
- Collect — walk near gems to vacuum them in
- Level up — choose one card from the draft

**The loop (one line):** Run → gather → research & grow your camp → return stronger →
climb the ages → win The Last Stand.

## 1. In-game first-run help card

**Module:** new `src/ui/helpCard.ts`. **Markup host:** new `<div id="help"></div>` in
`index.html` (follows the `#pausemenu` / `#runend` / `#victory` overlay pattern).

- **`HELP_SEEN_KEY = 'rogue-civ-seen-help-v1'`** plus two tiny pure-ish helpers:
  - `shouldAutoShowHelp(storage = localStorage): boolean` — true when the key is absent.
  - `markHelpSeen(storage = localStorage): void` — sets the key.
- **`renderHelpCard(host: HTMLElement, opts: { onClose: () => void }): void`** — paints a
  flat, single-view overlay (jeff-ui-design: everything visible at once, no wizard/steps):
  title "How to Play", the one-liner, the short blurb, the controls list, the loop line,
  and a primary "Got it — play" button. Dimmed full-screen backdrop; the card is centered.
  Closing calls `markHelpSeen()` + `opts.onClose()`.
- **Persistent reopen affordance:** a small fixed-position **?** button mounted once at
  boot (mirrors `mountAudioControls`'s fixed panel; bottom-left so it never collides with
  the bottom-right audio panel). Clicking it re-renders the help card regardless of the
  seen flag. `mountHelpButton(onOpen: () => void): void`.
- **Wiring (`src/main.ts`):** at boot, mount the ? button; if `shouldAutoShowHelp()`,
  render the card immediately over the civ screen. The card is purely presentational —
  closing it just hides the overlay; it never blocks input to the game underneath after
  dismissal.

Styling lives in `src/style.css` alongside the existing overlay styles (reuse the
`.pause-panel` visual language — dark panel, light ink — so it feels native).

## 2. README rewrite

Replace the stale slice description with the finished game. New structure:
- **Title + one-liner + the short blurb.**
- **▶ Play** link placeholder (jaksecurity.com/rogue-civ — filled at deploy) and a
  controls/loop summary so the repo landing reads as a real product.
- **What it is** — Stone→Space ages, a survivor-run core, a tech tree + base camp,
  relics/traditions/dungeons/wagers, and The Last Stand finale.
- Keep the existing **Develop / Design / Architecture / Art** sections (update the
  Stone→Bronze / 3×3 figures and the spec-path pointers to current).
- Note the build is fully static (`npm run build` → `dist/`) — hostable anywhere.

## 3. JAKSecurity.com landing blurb (copy only)

A short, web-formatted version of the pitch + controls for the page that will wrap the
embedded game. Authored as a small markdown block committed under
`docs/landing-blurb.md` so the deploy step has ready copy. Actual page wiring is deferred
to the release phase (needs how jaksecurity.com is hosted).

## 4. Testing

- **Unit (vitest):** `shouldAutoShowHelp` / `markHelpSeen` against a fake `Storage`
  (absent key → true; after `markHelpSeen` → false). Mirrors the save-slots storage-helper
  test style.
- **Playwright spot-check (controller, at the release walkthrough):** fresh `localStorage`
  → help card auto-shows on first load; "Got it" dismisses and sets the flag; reload →
  card does NOT auto-show; the ? button reopens it.

## Out of scope (YAGNI / later phase)

Multi-step tutorial, interactive coach-marks, gameplay changes, video, localization; and
the entire release phase (portfolio card, repo publication + secret scan, deploy).
