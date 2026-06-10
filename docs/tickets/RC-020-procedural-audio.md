# RC-020: Procedural audio pass (SFX + ambient)
**Status**: Delivered  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-09

## Summary
The game is completely silent. Add procedurally synthesized WebAudio sound effects and a simple
ambient loop — no audio assets needed, consistent with the all-code art pipeline.

## Context
From the 2026-06-09 review (item B2) — judged the single biggest feel upgrade available. Phaser
boots with Web Audio already. Proposed minimum SFX set:
- weapon fire tick (subtle, per-shot; consider throttling at high fire rates)
- enemy hit thunk + enemy death pop
- gem pickup chime (pitch could scale with gem value — ties into RC-022's value readability)
- player hurt
- level-up sting + draft pick confirm
- mini-boss arrival sting (lands with RC-019)
- civ-side: research complete, building placed, age-up fanfare (lands with RC-024)
- one low-key ambient loop per run (could vary per biome later)

Build as a small pure-ish `src/audio/` module (synth recipes as data, one play function), with a
mute toggle persisted to localStorage. Volumes/recipes are feel constants — expect Jeff tuning.

## Acceptance Criteria
- [ ] WebAudio synth module with data-driven sound recipes; no binary audio assets
- [ ] Core run SFX wired (fire, hit, death, gem, hurt, level-up)
- [ ] At least one civ-side SFX (research complete) to prove the cross-screen path
- [ ] Mute toggle visible in the UI, persisted across sessions
- [ ] High fire-rate weapons don't produce audio spam (throttle/voice cap)
- [ ] Playwright smoke: no console errors with audio enabled; mute toggle works

## References
- Review session 2026-06-09 (item B2)

## Delivered — 2026-06-10
Self-contained `src/audio/` module (theory/engine/recipes/index): 17 procedural synth SFX + a
context-selected CC0 music bed (era track per age on the civ screen, mood track per biome in runs),
volume slider + persisted mute, autoplay-safe (AudioContext on first gesture). Reconciled onto main
(only `src/main.ts` conflicted): civ SFX (research/age-up/build/upgrade), ambient by age/biome,
run-start + run-end SFX wired. `audio-test.html` soundboard kept as the permanent test bench.
**Departure from the "no audio assets" line:** ~37 MB of CC0/public-domain tracks were added (user
opted in), with a procedural fallback if a file fails to load.
**Deferred (now unblocked):** in-run *combat* SFX (shoot/hit/death/pickup/level-up/draft/zone-cleared)
wire directly into RunScene/weapons — hook table in `src/audio/README.md` "Pending".
Verified: tsc clean, 219 vitest, vite build clean, Playwright (boots clean, gesture fires SFX, no errors).

## Combat SFX wired — 2026-06-10
The deferred in-run combat SFX are now wired into `src/scenes/RunScene.ts`: shoot, enemy-hit
(incl. armor block), enemy-death, player-hit (contact + projectile), gem-pickup (pitched by gem
value), level-up, draft-open, draft-select, zone-cleared. Only `boss-arrival` remains (lands with
RC-019). Verified: tsc clean, 219 vitest, build clean, Playwright (8s live run exercises every hook,
no console errors). RC-020 acceptance fully met.
