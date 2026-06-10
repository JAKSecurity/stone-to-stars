# `src/audio/` — Procedural audio (RC-020)

A self-contained, **asset-free** audio layer built on the Web Audio API. Every sound is
synthesized at runtime from oscillators + filtered noise + ADSR envelopes — there are no
`.wav`/`.mp3` files anywhere. The module stands alone; the rest of the game talks to it
only through `src/audio/index.ts`.

## Files

| File | Role | Web Audio? | Unit-tested |
|------|------|:----------:|:-----------:|
| `theory.ts`  | Pure math — `noteToFreq`, `transpose`, ADSR (`adsrValueAt`, `envSustainLevel`), `dbToGain` | no | ✅ `tests/audioTheory.test.ts` |
| `recipes.ts` | The SFX library + ambient beds, expressed purely as data | no | ✅ `tests/audioRecipes.test.ts` |
| `engine.ts`  | Lazy `AudioContext`, oscillator/noise voices, master gain + mute, voice cap, throttle, ambient bed | yes (lazy) | — |
| `index.ts`   | Public API + autoplay unlock + the mute-toggle button | yes (lazy) | — |

`theory.ts` and `recipes.ts` carry **zero** `AudioContext`/DOM dependency, so they run in
Vitest's `node` environment. `engine.ts`/`index.ts` only touch an `AudioContext` lazily
(inside functions, never at module load), so importing them anywhere is side-effect-free
apart from reading the persisted mute flag.

## Public API

```ts
import {
  playSfx, startAmbient, stopAmbient, setMuted, toggleMute, isMuted,
  mountAudioControls, unlockAudioOnFirstGesture,
} from './audio';

playSfx('shoot');                        // one-shot SFX (throttled/voice-capped)
playSfx('gem-pickup', { semitones: 7 }); // pitch a chime up by gem value
startAmbient('civ');                     // looping bed: 'civ' | 'run'
stopAmbient();
setMuted(true);                          // persisted to localStorage('rogueciv:muted')
toggleMute();                            // returns the new muted state
```

### SFX names
`shoot`, `enemy-hit`, `enemy-death`, `player-hit`, `gem-pickup`, `level-up`,
`draft-open`, `draft-select`, `build`, `upgrade`, `research`, `age-up`,
`zone-cleared`, `boss-arrival`, `run-start`, `run-end-cleared`, `run-end-death`.

## Autoplay policy

Browsers forbid creating/resuming an `AudioContext` outside a user gesture. So:

- `unlockAudioOnFirstGesture()` (called once in `main.ts`) arms one-time
  `pointerdown`/`keydown`/`touchstart` listeners that create the context and start the
  pending ambient bed.
- `playSfx` / `startAmbient` are **safe to call before any gesture** — they no-op (and
  record the desired ambient) until the context exists, then the bed starts on unlock.
- The mute-toggle button's own click counts as the unlocking gesture.

## Anti-spam

`playRecipe` enforces a global `MAX_VOICES` cap (extra requests are dropped, not queued)
and a per-name `throttleMs` (e.g. `shoot` = 60 ms), so a high-fire-rate weapon ticking
every frame can't buzz. Tune in `recipes.ts`.

## Mute toggle

`mountAudioControls()` appends a fixed-position 🔊/🔇 button (id `audio-mute-toggle`,
bottom-right, `z-index 9999`) to `document.body`. It owns its own DOM, reflects the
persisted state on load, and is idempotent.

---

## Integration status — wired vs. pending

To avoid merge conflicts with the unmerged balance branch `rc-017-exponential-economy`
(which heavily edits `RunScene.ts`, `civScreen.ts`, `weapons.ts`, `economy.ts`), the
in-run/weapon call-sites are **intentionally left unwired**. Wire them after that branch
merges.

### ✅ Wired now (in `main.ts` — not a conflict file)
| Event | Call |
|-------|------|
| App start | `unlockAudioOnFirstGesture()`, `mountAudioControls()` |
| Enter civ screen | `startAmbient('civ')` |
| Research completes | `playSfx('research')` |
| Building placed | `playSfx('build')` |
| Building upgraded | `playSfx('upgrade')` |
| Expedition launched | `startAmbient('run')`, `playSfx('run-start')` |
| Run ends | `playSfx(result.died ? 'run-end-death' : 'run-end-cleared')` |

This already proves the cross-screen path (civ-side `research` SFX) required by the AC.

### ⏳ Pending — wire post-merge in the hot files

**`src/scenes/RunScene.ts`** — `import { playSfx } from '../audio';`
| Where | Call |
|-------|------|
| On firing a projectile (weapon update / shoot) | `playSfx('shoot')` — already throttled by the recipe |
| On enemy taking damage | `playSfx('enemy-hit')` |
| On enemy death | `playSfx('enemy-death')` |
| On player taking damage | `playSfx('player-hit')` |
| On gem/XP pickup | `playSfx('gem-pickup', { semitones: gemValueToSemitones(value) })` — pitch by value (ties into RC-022) |
| On level-up / draft panel opening | `playSfx('level-up')` then `playSfx('draft-open')` |
| On draft card chosen | `playSfx('draft-select')` |
| On age-up during a run (if applicable) | `playSfx('age-up')` |
| On zone/wave cleared | `playSfx('zone-cleared')` |
| On mini-boss arrival (lands with RC-019) | `playSfx('boss-arrival')` |

Suggested helper for value→pitch (keep chimes musical, ~one octave span):
```ts
const gemValueToSemitones = (v: number) => Math.min(12, Math.floor(Math.log2(Math.max(1, v)) * 2));
```

**`src/ui/civScreen.ts`** — optional polish: `playSfx('age-up')` when the age-up banner
fires. (The functional civ SFX already fire from `main.ts`'s callbacks, so this is
cosmetic and can stay in `main.ts` instead to keep `civScreen.ts` untouched.)
