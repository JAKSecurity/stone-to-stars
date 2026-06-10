// The SFX library and ambient beds, expressed purely as data. Every value here is a
// "feel constant" — expect Jeff to tune frequencies, gains, and envelopes by ear.
// Recipes are consumed by engine.playRecipe; nothing here touches an AudioContext.

import { AmbientBed, Recipe } from './engine';
import { noteToFreq } from './theory';

/** The canonical SFX names. The master API's playSfx is typed against these. */
export type SfxName =
  | 'shoot'
  | 'enemy-hit'
  | 'enemy-death'
  | 'player-hit'
  | 'gem-pickup'
  | 'level-up'
  | 'draft-open'
  | 'draft-select'
  | 'build'
  | 'upgrade'
  | 'research'
  | 'age-up'
  | 'zone-cleared'
  | 'boss-arrival'
  | 'run-start'
  | 'run-end-cleared'
  | 'run-end-death';

// Short envelope helpers to keep the recipe table readable.
const pluck = (release = 0.08) => ({ attack: 0.001, decay: 0.04, sustain: 0.0, release });
const blip = (release = 0.05) => ({ attack: 0.001, decay: 0.02, sustain: 0.2, release });
const pad = (attack: number, release: number) => ({ attack, decay: 0.1, sustain: 0.8, release });

export const SFX: Record<SfxName, Recipe> = {
  // Per-shot tick — deliberately tiny, and throttled so rapid-fire weapons don't buzz.
  shoot: {
    throttleMs: 60,
    layers: [
      { kind: 'osc', wave: 'square', freq: 660, freqEnd: 440, gain: 0.12, gateMs: 30, env: pluck(0.05) },
    ],
  },

  // Enemy takes damage: a short filtered-noise thunk with a low body.
  'enemy-hit': {
    throttleMs: 30,
    layers: [
      { kind: 'noise', gain: 0.18, gateMs: 25, env: pluck(0.05), filter: { type: 'bandpass', freq: 1200, q: 1.2 } },
      { kind: 'osc', wave: 'triangle', freq: 180, freqEnd: 110, gain: 0.16, gateMs: 30, env: pluck(0.06) },
    ],
  },

  // Enemy dies: a downward pop with a noise burst.
  'enemy-death': {
    throttleMs: 25,
    layers: [
      { kind: 'osc', wave: 'sawtooth', freq: 320, freqEnd: 90, gain: 0.18, gateMs: 90, env: pluck(0.1) },
      { kind: 'noise', gain: 0.14, gateMs: 60, env: pluck(0.08), filter: { type: 'lowpass', freq: 2000 } },
    ],
  },

  // Player hurt: dissonant low buzz — should feel bad.
  'player-hit': {
    layers: [
      { kind: 'osc', wave: 'sawtooth', freq: 160, freqEnd: 80, gain: 0.28, gateMs: 140, env: pluck(0.18) },
      { kind: 'osc', wave: 'square', freq: 110, gain: 0.14, gateMs: 120, env: pluck(0.16), detune: 18 },
    ],
  },

  // Gem pickup: bright chime. playSfx can transpose this by gem value (see index.ts).
  'gem-pickup': {
    throttleMs: 20,
    layers: [
      { kind: 'osc', wave: 'sine', freq: noteToFreq(84), gain: 0.16, gateMs: 70, env: pluck(0.12) },
      { kind: 'osc', wave: 'sine', freq: noteToFreq(91), gain: 0.08, gateMs: 60, env: pluck(0.1) },
    ],
  },

  // Level-up sting: a rising perfect-fifth arpeggio feel via two stacked partials.
  'level-up': {
    layers: [
      { kind: 'osc', wave: 'triangle', freq: noteToFreq(72), freqEnd: noteToFreq(79), gain: 0.2, gateMs: 220, env: blip(0.2) },
      { kind: 'osc', wave: 'sine', freq: noteToFreq(76), gain: 0.14, gateMs: 240, env: pad(0.02, 0.25) },
    ],
  },

  // Draft panel opens: soft upward swell.
  'draft-open': {
    layers: [
      { kind: 'osc', wave: 'sine', freq: noteToFreq(67), freqEnd: noteToFreq(74), gain: 0.16, gateMs: 200, env: pad(0.04, 0.2) },
    ],
  },

  // Draft card chosen: crisp confirm.
  'draft-select': {
    layers: [
      { kind: 'osc', wave: 'square', freq: noteToFreq(79), freqEnd: noteToFreq(86), gain: 0.14, gateMs: 60, env: blip(0.08) },
    ],
  },

  // Building placed: a solid woody "thock".
  build: {
    layers: [
      { kind: 'osc', wave: 'triangle', freq: 200, freqEnd: 140, gain: 0.22, gateMs: 90, env: pluck(0.1) },
      { kind: 'noise', gain: 0.1, gateMs: 40, env: pluck(0.05), filter: { type: 'lowpass', freq: 1400 } },
    ],
  },

  // Building upgraded: build, but brighter and a step higher.
  upgrade: {
    layers: [
      { kind: 'osc', wave: 'triangle', freq: 260, freqEnd: 360, gain: 0.2, gateMs: 110, env: blip(0.12) },
      { kind: 'osc', wave: 'sine', freq: noteToFreq(84), gain: 0.1, gateMs: 90, env: pluck(0.12) },
    ],
  },

  // Research complete: a contemplative two-note "ding ding".
  research: {
    layers: [
      { kind: 'osc', wave: 'sine', freq: noteToFreq(81), gain: 0.16, gateMs: 130, env: pluck(0.18) },
      { kind: 'osc', wave: 'sine', freq: noteToFreq(88), gain: 0.12, gateMs: 160, env: pad(0.02, 0.22) },
    ],
  },

  // Age-up fanfare: the biggest, brightest cue — a three-partial major chord swell.
  'age-up': {
    layers: [
      { kind: 'osc', wave: 'sawtooth', freq: noteToFreq(60), gain: 0.16, gateMs: 360, env: pad(0.03, 0.4) },
      { kind: 'osc', wave: 'sawtooth', freq: noteToFreq(64), gain: 0.14, gateMs: 360, env: pad(0.05, 0.4) },
      { kind: 'osc', wave: 'sawtooth', freq: noteToFreq(67), freqEnd: noteToFreq(72), gain: 0.16, gateMs: 380, env: pad(0.07, 0.45) },
    ],
  },

  // Zone cleared: triumphant short rising figure.
  'zone-cleared': {
    layers: [
      { kind: 'osc', wave: 'triangle', freq: noteToFreq(72), freqEnd: noteToFreq(84), gain: 0.2, gateMs: 280, env: pad(0.02, 0.3) },
      { kind: 'osc', wave: 'sine', freq: noteToFreq(79), gain: 0.12, gateMs: 300, env: pad(0.04, 0.32) },
    ],
  },

  // Mini-boss arrival: ominous low brass-ish stab (lands with RC-019).
  'boss-arrival': {
    layers: [
      { kind: 'osc', wave: 'sawtooth', freq: noteToFreq(36), gain: 0.26, gateMs: 420, env: pad(0.04, 0.4), detune: -8 },
      { kind: 'osc', wave: 'sawtooth', freq: noteToFreq(43), gain: 0.18, gateMs: 420, env: pad(0.04, 0.4), detune: 8 },
      { kind: 'noise', gain: 0.08, gateMs: 300, env: pad(0.1, 0.3), filter: { type: 'lowpass', freq: 600 } },
    ],
  },

  // Run begins: a short "go" upward swell.
  'run-start': {
    layers: [
      { kind: 'osc', wave: 'triangle', freq: noteToFreq(60), freqEnd: noteToFreq(67), gain: 0.2, gateMs: 240, env: pad(0.03, 0.25) },
    ],
  },

  // Run cleared (won): bright resolving cadence.
  'run-end-cleared': {
    layers: [
      { kind: 'osc', wave: 'triangle', freq: noteToFreq(72), gain: 0.18, gateMs: 200, env: pad(0.02, 0.3) },
      { kind: 'osc', wave: 'sine', freq: noteToFreq(76), freqEnd: noteToFreq(79), gain: 0.16, gateMs: 320, env: pad(0.03, 0.4) },
    ],
  },

  // Run ended in death: a sombre descending minor figure.
  'run-end-death': {
    layers: [
      { kind: 'osc', wave: 'sawtooth', freq: noteToFreq(57), freqEnd: noteToFreq(45), gain: 0.22, gateMs: 500, env: pad(0.04, 0.6) },
      { kind: 'osc', wave: 'sine', freq: noteToFreq(53), freqEnd: noteToFreq(48), gain: 0.14, gateMs: 520, env: pad(0.06, 0.6) },
    ],
  },
};

/** Ambient bed contexts. 'civ' = the calm planning screen, 'run' = in-expedition. */
export type AmbientContext = 'civ' | 'run';

export const AMBIENT: Record<AmbientContext, AmbientBed> = {
  // Civ screen: a warm, slow, almost-still drone — barely there.
  civ: {
    voices: [
      { wave: 'sine', freq: noteToFreq(36) },          // low C
      { wave: 'sine', freq: noteToFreq(43), detune: 4 }, // G, slightly detuned
      { wave: 'triangle', freq: noteToFreq(48), detune: -3 },
    ],
    gain: 0.05,
    cutoff: 320,
    lfoRate: 0.05,
    lfoDepth: 120,
  },

  // In-run: a touch lower and tenser, with more movement in the cutoff.
  run: {
    voices: [
      { wave: 'sawtooth', freq: noteToFreq(33), detune: -5 },
      { wave: 'sine', freq: noteToFreq(40) },
      { wave: 'triangle', freq: noteToFreq(45), detune: 6 },
    ],
    gain: 0.045,
    cutoff: 260,
    lfoRate: 0.09,
    lfoDepth: 160,
  },
};
