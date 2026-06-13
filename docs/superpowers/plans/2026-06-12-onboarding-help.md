# Onboarding Help Implementation Plan

> Executed inline (single cohesive UI feature). Spec: `docs/superpowers/specs/2026-06-12-onboarding-help-design.md`.

**Goal:** First-run "How to Play" help card + a persistent ? reopen button, a README rewrite, and committed landing copy — per the ratified pitch.

**Tech:** TypeScript + DOM, vitest. New `src/ui/helpCard.ts`; `#help` host in `index.html`; styles in `src/style.css`; wired from `src/main.ts`. Mirrors the `mountAudioControls` fixed-mount pattern and the `.pause-panel` CSS language.

---

### Task 1 — Storage helpers (TDD)
**Files:** create `src/ui/helpCard.ts`; create `tests/helpCard.test.ts`.

- [ ] Test (mirror `tests/saveSlots.test.ts` memStorage shim): `shouldAutoShowHelp(s)` is true when `HELP_SEEN_KEY` absent, false after `markHelpSeen(s)`; `markHelpSeen` is idempotent.
- [ ] Run → fail (no module).
- [ ] Implement `HELP_SEEN_KEY = 'rogue-civ-seen-help-v1'`, `shouldAutoShowHelp(storage: Storage = localStorage)`, `markHelpSeen(storage: Storage = localStorage)`.
- [ ] Run → pass.

### Task 2 — Help card render + ? button
**Files:** `src/ui/helpCard.ts`; `index.html` (`<div id="help"></div>` beside `#victory`); `src/style.css`.

- [ ] `renderHelpCard(host, { onClose })` — full-screen dimmed backdrop + centered `.help-panel` (reuse `.pause-panel` language): title "How to Play", the one-liner, the short blurb, a controls list (W A S D · auto-attack · right-click active · Esc pause · walk-near collect · draft on level-up), the loop line, and a `.pause-primary` "Got it — play" button. Button → `markHelpSeen()` + `onClose()`. Backdrop host hidden by emptying it on close.
- [ ] `mountHelpButton(onOpen)` — idempotent fixed button (bottom-left, mirrors audio panel; `id="help-button"`, label "?"), click → `onOpen()`.
- [ ] CSS: `.help-overlay` (fixed, full-screen, grid-center, dim bg, high z-index), `.help-panel` (reuse pause-panel look), `.help-controls` (tight definition list), `#help-button` (round, bottom-left).

### Task 3 — Wire `src/main.ts`
- [ ] Import helpCard API. After boot (post `showCiv()` setup): `mountHelpButton(openHelp)`; if `shouldAutoShowHelp()` → `openHelp()`. `openHelp()` renders into `#help`; `onClose` empties `#help`.
- [ ] Help is presentational only — never blocks the game after dismissal.

### Task 4 — README rewrite + landing copy
**Files:** `README.md`; create `docs/landing-blurb.md`.
- [ ] README: title + one-liner + short blurb; ▶ Play placeholder (jaksecurity.com/rogue-civ) + controls/loop; "What it is" (Stone→Space, survivor core, tech tree + camp, relics/traditions/dungeons/wagers, The Last Stand); keep Develop/Design/Architecture/Art, refreshed (drop Stone→Bronze / 3×3, fix spec pointers); note static build.
- [ ] `docs/landing-blurb.md`: web-formatted pitch + controls for the deploy step.

### Task 5 — Verify + commit
- [ ] `npx tsc --noEmit` + full `npx vitest run` (478+) + `npm run build`.
- [ ] Playwright spot-check: fresh localStorage → card auto-shows; "Got it" dismisses + sets flag; reload → no auto-show; ? reopens. Revert any instrumentation.
- [ ] Commit `feat(onboarding): first-run help card + README rewrite + landing copy`.
