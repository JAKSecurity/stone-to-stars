// Pure audio-theory helpers — note→frequency conversion and ADSR envelope math.
// Deliberately free of any Web Audio / DOM dependency so it runs under Vitest's
// node environment and stays unit-testable. The synth engine (engine.ts) consumes
// these to schedule real AudioParam ramps; nothing here touches an AudioContext.

/** Equal-temperament: MIDI note number → frequency in Hz (A4 = MIDI 69 = 440 Hz). */
export function noteToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Shift a frequency by a number of equal-tempered semitones (may be fractional). */
export function transpose(freq: number, semitones: number): number {
  return freq * Math.pow(2, semitones / 12);
}

/** Decibels → linear gain. 0 dB → 1, −6 dB → ~0.5, −Inf → 0. */
export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** ADSR envelope. Times are in seconds; `sustain` is a level in [0, 1]. Peak is 1. */
export interface Envelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

/**
 * Envelope level during the pre-release portion (attack → decay → sustain hold),
 * with `t` measured in seconds from note-on. Peaks at 1 when attack completes,
 * then decays to the sustain level.
 */
export function envSustainLevel(env: Envelope, t: number): number {
  if (t <= 0) return 0;
  const { attack, decay, sustain } = env;
  if (t < attack) return t / attack;
  if (t < attack + decay) {
    const k = decay <= 0 ? 1 : (t - attack) / decay;
    return 1 - (1 - sustain) * k;
  }
  return sustain;
}

/**
 * Full ADSR value at time `t` (seconds from note-on) for a note held `gate` seconds.
 * Before the gate it follows attack/decay/sustain; after the gate it ramps linearly
 * from whatever level it had reached down to 0 over the release time. A gate shorter
 * than attack+decay releases from the partial level, never snapping up to a phase it
 * never reached.
 */
export function adsrValueAt(env: Envelope, t: number, gate: number): number {
  if (t <= 0) return 0;
  if (t <= gate) return envSustainLevel(env, t);
  const rel = t - gate;
  if (rel >= env.release) return 0;
  const levelAtGate = envSustainLevel(env, gate);
  const k = env.release <= 0 ? 1 : rel / env.release;
  return levelAtGate * (1 - k);
}

/** Total audible duration (ms) of a note: its gate plus the release tail. */
export function adsrDurationMs(env: Envelope, gateMs: number): number {
  return gateMs + env.release * 1000;
}
