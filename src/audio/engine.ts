// The Web Audio engine: lazy AudioContext, oscillator/noise voice primitives, a
// master gain with mute, voice-capping/throttling to stop SFX spam, and the ambient
// bed. All AudioContext access is lazy (created on first user gesture) so this module
// is import-safe under node/SSR — nothing here touches an AudioContext at module load.

import { Envelope, transpose } from './theory';

// ---------------------------------------------------------------------------
// Recipe data shapes (the SFX library in recipes.ts is expressed in these).
// ---------------------------------------------------------------------------

/** A single tonal layer: an oscillator with an optional pitch glide and ADSR. */
export interface OscLayer {
  kind: 'osc';
  wave: OscillatorType;
  /** Start frequency in Hz. */
  freq: number;
  /** Optional glide target in Hz (exponential ramp from `freq` over the gate). */
  freqEnd?: number;
  /** Peak linear gain of this layer, pre-master (master/category gains apply on top). */
  gain: number;
  /** How long the note is "held" before release, in ms. */
  gateMs: number;
  env: Envelope;
  /** Fine detune in cents (for fattening / chorus). */
  detune?: number;
}

/** A noise layer: filtered white noise with an ADSR — for hits, whooshes, percussion. */
export interface NoiseLayer {
  kind: 'noise';
  gain: number;
  gateMs: number;
  env: Envelope;
  filter?: { type: BiquadFilterType; freq: number; q?: number };
}

export type Layer = OscLayer | NoiseLayer;

export interface Recipe {
  layers: Layer[];
  /** Minimum ms between successive plays of this named SFX (anti-spam). */
  throttleMs?: number;
}

// ---------------------------------------------------------------------------
// Context + master chain (lazy)
// ---------------------------------------------------------------------------

const MUTE_KEY = 'rogueciv:muted';
const VOLUME_KEY = 'rogueciv:volume';
/** Master ceiling so the synth never clips or startles, at volume = 1. Jeff-tunable. */
const MASTER_CEILING = 0.6;
/** Default user volume (0..1) on a fresh install. */
const DEFAULT_VOLUME = 0.7;
/** Concurrency cap across all SFX voices — extra requests are dropped, not queued. */
const MAX_VOICES = 24;

interface AudioGuts {
  ctx: AudioContext;
  master: GainNode;
}

let guts: AudioGuts | null = null;
let muted = readMutedPref();
let volume = readVolumePref();
let activeVoices = 0;
const lastPlayedAt = new Map<string, number>();

function readMutedPref(): boolean {
  try {
    return globalThis.localStorage?.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function readVolumePref(): number {
  try {
    const raw = globalThis.localStorage?.getItem(VOLUME_KEY);
    if (raw == null) return DEFAULT_VOLUME;
    const v = parseFloat(raw);
    return Number.isFinite(v) ? clampVol(v) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

function clampVol(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Effective master-gain target: the user volume scaled to the ceiling, 0 while muted. */
function masterTarget(): number {
  return muted ? 0 : volume * MASTER_CEILING;
}

function AudioCtor(): typeof AudioContext | undefined {
  const w = globalThis as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

/** True once an AudioContext has been created (i.e. after the first user gesture). */
export function isAudioReady(): boolean {
  return guts !== null;
}

/**
 * Create (or resume) the AudioContext and master chain. MUST be called from a user
 * gesture handler the first time, per browser autoplay policy. Idempotent and safe to
 * call when Web Audio is unavailable (returns null). Re-resumes a suspended context.
 */
export function ensureAudio(): AudioGuts | null {
  if (guts) {
    if (guts.ctx.state === 'suspended') void guts.ctx.resume();
    return guts;
  }
  const Ctor = AudioCtor();
  if (!Ctor) return null;
  let ctx: AudioContext;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  const master = ctx.createGain();
  master.gain.value = masterTarget();
  master.connect(ctx.destination);
  guts = { ctx, master };
  return guts;
}

// ---------------------------------------------------------------------------
// Mute
// ---------------------------------------------------------------------------

export function isMuted(): boolean {
  return muted;
}

/** Ramp the live master gain to the current target (short ramp avoids clicks). */
function applyMasterGain(): void {
  if (!guts) return;
  const now = guts.ctx.currentTime;
  guts.master.gain.cancelScheduledValues(now);
  guts.master.gain.setValueAtTime(guts.master.gain.value, now);
  guts.master.gain.linearRampToValueAtTime(masterTarget(), now + 0.02);
}

export function setMuted(next: boolean): void {
  muted = next;
  try {
    globalThis.localStorage?.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {
    /* storage unavailable (private mode / SSR) — keep the in-memory value */
  }
  applyMasterGain();
  if (next) stopAmbient();
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

/** Current user volume in [0, 1] (independent of mute). */
export function getVolume(): number {
  return volume;
}

/**
 * Set the user volume in [0, 1] (persisted). Does not change the mute flag, but a
 * nonzero volume while muted stays silent until unmuted.
 */
export function setVolume(next: number): void {
  volume = clampVol(next);
  try {
    globalThis.localStorage?.setItem(VOLUME_KEY, String(volume));
  } catch {
    /* storage unavailable — keep the in-memory value */
  }
  applyMasterGain();
}

// ---------------------------------------------------------------------------
// White-noise buffer (cached) + voice primitives
// ---------------------------------------------------------------------------

let noiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = Math.floor(ctx.sampleRate * 1.0); // 1s of white noise, looped as needed
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // Deterministic LCG — avoids Math.random (banned in some toolchains) and keeps the
  // noise bed reproducible. Values in [-1, 1).
  let seed = 0x9e3779b9 >>> 0;
  for (let i = 0; i < len; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = (seed / 0xffffffff) * 2 - 1;
  }
  noiseBuffer = buf;
  return buf;
}

/**
 * Schedule one envelope on a gain node feeding `dest`, starting at `start`. Uses a
 * peak→sustain→release ramp shape mirroring theory.adsrValueAt. Returns when the voice
 * ends (seconds, ctx time) so the caller can stop its source.
 */
function applyEnvelope(
  g: GainNode,
  peak: number,
  env: Envelope,
  gateSec: number,
  start: number,
): number {
  const a = Math.max(0, env.attack);
  const d = Math.max(0, env.decay);
  const sustainLevel = peak * env.sustain;
  const r = Math.max(0.001, env.release);
  const p = g.gain;
  p.cancelScheduledValues(start);
  p.setValueAtTime(0.0001, start);
  // Attack → peak
  if (a > 0) p.linearRampToValueAtTime(peak, start + a);
  else p.setValueAtTime(peak, start);
  // Decay → sustain
  if (d > 0) p.linearRampToValueAtTime(Math.max(sustainLevel, 0.0001), start + a + d);
  // Hold to gate
  const gateEnd = start + Math.max(gateSec, a + d);
  p.setValueAtTime(Math.max(sustainLevel, 0.0001), gateEnd);
  // Release → silence (exponential sounds more natural than linear for decay tails)
  const end = gateEnd + r;
  p.exponentialRampToValueAtTime(0.0001, end);
  return end;
}

function playOscLayer(g: AudioGuts, layer: OscLayer, semitones: number, dest: AudioNode): void {
  const { ctx } = g;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = layer.wave;
  const f0 = transpose(layer.freq, semitones);
  osc.frequency.setValueAtTime(f0, now);
  if (layer.freqEnd !== undefined) {
    const f1 = transpose(layer.freqEnd, semitones);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + layer.gateMs / 1000);
  }
  if (layer.detune) osc.detune.setValueAtTime(layer.detune, now);
  const env = ctx.createGain();
  const end = applyEnvelope(env, layer.gain, layer.env, layer.gateMs / 1000, now);
  osc.connect(env).connect(dest);
  startVoice(osc, now, end);
}

function playNoiseLayer(g: AudioGuts, layer: NoiseLayer, dest: AudioNode): void {
  const { ctx } = g;
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  src.loop = true;
  let node: AudioNode = src;
  if (layer.filter) {
    const filt = ctx.createBiquadFilter();
    filt.type = layer.filter.type;
    filt.frequency.setValueAtTime(layer.filter.freq, now);
    if (layer.filter.q !== undefined) filt.Q.setValueAtTime(layer.filter.q, now);
    src.connect(filt);
    node = filt;
  }
  const env = ctx.createGain();
  const end = applyEnvelope(env, layer.gain, layer.env, layer.gateMs / 1000, now);
  node.connect(env).connect(dest);
  startVoice(src, now, end);
}

function startVoice(src: OscillatorNode | AudioBufferSourceNode, start: number, end: number): void {
  activeVoices++;
  src.onended = () => { activeVoices = Math.max(0, activeVoices - 1); };
  src.start(start);
  src.stop(end + 0.02);
}

// ---------------------------------------------------------------------------
// Public play entry (called by the recipe layer / master API)
// ---------------------------------------------------------------------------

/**
 * Play a recipe by name. Honors mute, the per-name throttle, and the global voice cap.
 * `semitones` transposes every tonal layer (used e.g. to pitch gem chimes by value).
 * `nowMs` lets callers/tests inject a clock; defaults to performance.now().
 */
export function playRecipe(name: string, recipe: Recipe, semitones = 0, nowMs?: number): void {
  if (muted) return;
  const g = ensureAudio();
  if (!g) return;
  const t = nowMs ?? clockMs();
  const throttle = recipe.throttleMs ?? 0;
  if (throttle > 0) {
    const last = lastPlayedAt.get(name) ?? -Infinity;
    if (t - last < throttle) return;
    lastPlayedAt.set(name, t);
  }
  if (activeVoices >= MAX_VOICES) return;
  for (const layer of recipe.layers) {
    if (layer.kind === 'osc') playOscLayer(g, layer, semitones, g.master);
    else playNoiseLayer(g, layer, g.master);
  }
}

function clockMs(): number {
  const p = (globalThis as { performance?: { now(): number } }).performance;
  return p ? p.now() : 0;
}

// ---------------------------------------------------------------------------
// Ambient bed — a low, continuous, loopable drone per context.
// ---------------------------------------------------------------------------

export interface AmbientVoice {
  freq: number;
  wave: OscillatorType;
  detune?: number;
}

export interface AmbientBed {
  /** Drone partials (held continuously, not retriggered). */
  voices: AmbientVoice[];
  /** Overall bed gain (kept low — this sits under everything). */
  gain: number;
  /** Lowpass cutoff (Hz) the slow LFO wobbles around, for a breathing feel. */
  cutoff: number;
  /** LFO rate in Hz (very slow) and cutoff sweep depth in Hz. */
  lfoRate: number;
  lfoDepth: number;
}

interface AmbientNodes {
  nodes: AudioNode[];
  gain: GainNode;
}

let ambient: AmbientNodes | null = null;
let ambientContext: string | null = null;

/**
 * Start (or crossfade to) the ambient bed for a context id. No-op while muted. Does NOT
 * create the AudioContext on its own — if audio hasn't been unlocked by a user gesture
 * yet, it just records the desired context so the unlock handler can start it. This
 * keeps the autoplay policy happy (no context is created before a gesture).
 */
export function startAmbientBed(context: string, bed: AmbientBed): void {
  if (muted) { ambientContext = context; return; }
  if (!isAudioReady()) { ambientContext = context; return; } // wait for the unlock gesture
  const g = ensureAudio();
  if (!g) { ambientContext = context; return; }
  if (ambient && ambientContext === context) return; // already running this bed
  stopAmbient();
  ambientContext = context;
  const { ctx } = g;
  const now = ctx.currentTime;

  const bedGain = ctx.createGain();
  bedGain.gain.setValueAtTime(0.0001, now);
  bedGain.gain.exponentialRampToValueAtTime(Math.max(bed.gain, 0.0001), now + 1.5); // gentle fade-in

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = bed.cutoff;
  filter.Q.value = 0.7;
  filter.connect(bedGain).connect(g.master);

  const nodes: AudioNode[] = [bedGain, filter];

  // Slow LFO breathing the cutoff.
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = bed.lfoRate;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = bed.lfoDepth;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start(now);
  nodes.push(lfo, lfoGain);

  for (const v of bed.voices) {
    const osc = ctx.createOscillator();
    osc.type = v.wave;
    osc.frequency.value = v.freq;
    if (v.detune) osc.detune.value = v.detune;
    osc.connect(filter);
    osc.start(now);
    nodes.push(osc);
  }

  ambient = { nodes, gain: bedGain };
}

/** Fade out and tear down the ambient bed. Safe to call when nothing is playing. */
export function stopAmbient(): void {
  ambientContext = null;
  const a = ambient;
  ambient = null;
  if (!a || !guts) return;
  const { ctx } = guts;
  const now = ctx.currentTime;
  a.gain.gain.cancelScheduledValues(now);
  a.gain.gain.setValueAtTime(Math.max(a.gain.gain.value, 0.0001), now);
  a.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  for (const n of a.nodes) {
    const src = n as OscillatorNode;
    if (typeof src.stop === 'function') {
      try { src.stop(now + 0.65); } catch { /* already stopped */ }
    }
  }
}

/** The ambient context currently requested (may be pending an unlock gesture). */
export function currentAmbientContext(): string | null {
  return ambientContext;
}
