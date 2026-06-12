# RC-039: ESC pause menu — abandon run, save/load, volume
**Status**: Delivered  **Priority**: P2  **Type**: Feature
**Created**: 2026-06-11

## Summary
Jeff (2026-06-11 evening playtest): "we need a way to abandon a run (resume to city screen). Press
escape to pause the run while bringing up a settings screen — with an option to save/load, abandon
run and resume to city, change volume, etc." Today a run only ends in victory or death; there is no
pause and no exit.

## Design (ruled during the playtest session)
- **ESC toggles pause**: physics + run loop halt (same mechanism as the draft overlay's pause), a
  DOM overlay renders over the canvas (house DOM-UI pattern; easier than Phaser widgets for
  sliders/buttons). ESC or Resume closes it.
- **Abandon run → city**: banks the partial haul EXACTLY like death does (death already keeps
  `collected` with the mutator multiplier; abandon is voluntary death without the corpse). Routes
  through the normal finish/onComplete flow so banking, best-haul tracking, and the end screen all
  behave; end screen copy may read "expedition abandoned" later (polish).
- **Save / Load**: Save-to-slot saves the CIV state (runs never persist — saving mid-run equals the
  pre-run save; harmless and predictable). Load = confirm dialog → abandon-forfeit the current run
  (no banking — you're rewinding) → adopt slot → city screen. Reuses RC-036's saveSlots module.
- **Volume**: slider bound to the existing audio engine volume (same value the persistent
  bottom-right widget drives).
- Mutator-paused HUD state, draft overlay, and fusion banners must not fight the pause overlay
  (pause is a no-op while a draft is open — the draft already pauses; ESC closes nothing there v1).

## Acceptance Criteria
- [ ] ESC pauses/resumes; overlay shows Resume / Save slots / Load / Abandon / volume slider
- [ ] Abandon banks the haul like death and returns to the city screen cleanly (scene stopped, music switched)
- [ ] Load from pause confirms, discards the run, adopts the slot
- [ ] Volume slider live-adjusts and persists like the existing widget
- [ ] Unit tests for any new pure logic; live verify pause/abandon/load/volume

## References
- `src/scenes/RunScene.ts` (pause pattern in the draft overlay, finish()), `src/main.ts` (run lifecycle),
  `src/state/saveSlots.ts` (RC-036), `src/audio/` (volume), 2026-06-11 playtest

## Resolution (2026-06-11)
Delivered. ESC toggles a DOM pause overlay over the live run; all acceptance criteria met.

**Implementation**
- `RunScene.ts` — new `pauseMenuOpen` state (distinct from `paused` so ESC only closes a pause it
  opened, never a draft) + `onPauseMenu(open)` callback in `RunInit`. ESC registered as a
  `keydown-ESC` listener with a shutdown cleanup mirroring the right-click pointer handler. Reuses the
  draft overlay's exact pause mechanics (`paused = true; physics.pause()` / `physics.resume()`).
  Public methods: `closePauseMenu()` (Resume), `abandonRun()` (→ `finish(true)`, banks the haul like
  death via the deferred `pendingComplete` drain), `discardRun()` (stops the scene WITHOUT
  `onComplete` — used by Load-from-pause so the run is rewound, not banked). `togglePauseMenu()`
  no-ops while a draft is open, during the ceremony, or after finish.
- `main.ts` — `#pausemenu` DOM overlay (`renderPauseMenu`/`hidePauseMenu`), wired via the scene's
  `onPauseMenu`. Resume → `closePauseMenu()`; Abandon → confirm → `abandonRun()`; Save/Load reuse the
  civ screen's exported `slotCard` (Save persists the pre-run civ; Load discards the run then adopts
  the slot via the existing `showCiv()` path). Save-vs-Load distinguished by civ identity.
- `audio/index.ts` — extracted `bindVolumeSlider(slider, onChange?)` shared by the bottom-right widget
  and the pause slider, so both drive the same persisted engine volume.
- `civScreen.ts` — `slotCard` exported (was module-private) for reuse; no markup duplication.
- `style.css` — `#pausemenu` flat centered panel (jeff-ui-design); `index.html` — `#pausemenu` div.

**Verification** — `npm test` (360 green) + `npm run build` green. Live Playwright (own page, Jeff
undisturbed): ESC freezes enemies + shows overlay; Resume + ESC-again both unfreeze; Save writes slot
1 (card updates, Load enables); volume slider persists to `rogueciv:volume` and shares the widget's
value; Abandon banks collected×mult (🧭5🔬3🏭2🎭1 = 11) to the end screen → city; Load discards the
run (collected 99s NOT banked) and adopts the slot → city; ESC during a draft is a no-op. No new pure
logic warranted unit tests (UI/scene wiring); verified live per the ticket.
