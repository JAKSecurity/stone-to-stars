// File-based background music: looping CC0 tracks routed through the engine's master
// gain (so the volume slider and mute apply to music too). This is the primary ambient
// layer; if a track can't be fetched/decoded, the caller falls back to the procedural
// bed in engine.ts. Loaded lazily — decoding only happens after the audio is unlocked.
//
// Tracks (both CC0 / public domain — see src/audio/README.md credits):
//   civ → "Fantasy: Rising Moon" by RandomMind
//   run → "Ambient Relaxing Loop" by isaiah658
//
// This module is imported ONLY by index.ts (never by tests), so the binary-asset imports
// stay out of the node/Vitest path.

import risingMoonUrl from './assets/fantasy-rising-moon.mp3';
import ambientLoopUrl from './assets/ambient-relaxing-loop.ogg';
import { ensureAudio, peekAudio } from './engine';

interface MusicTrack {
  url: string;
  /** Per-track playback gain (these are full mixes; the master gain applies on top). */
  gain: number;
}

const TRACKS: Record<string, MusicTrack> = {
  civ: { url: risingMoonUrl, gain: 0.8 },
  run: { url: ambientLoopUrl, gain: 0.7 },
};

const FADE_IN = 1.2;   // seconds
const FADE_OUT = 0.6;  // seconds

const decoded = new Map<string, AudioBuffer>();
let current: { src: AudioBufferSourceNode; gain: GainNode; context: string } | null = null;

/** Whether a music track is defined for this context. */
export function hasMusic(context: string): boolean {
  return context in TRACKS;
}

/**
 * Start (or keep) the looping music track for a context, fading it in. Returns true if
 * music is now playing, false if it couldn't (no context yet, unknown track, or a
 * fetch/decode failure) — in which case the caller should use the procedural bed.
 */
export async function playMusic(context: string): Promise<boolean> {
  const track = TRACKS[context];
  if (!track) return false;
  const guts = ensureAudio(); // caller only invokes this post-unlock, so no context is created here
  if (!guts) return false;
  if (current && current.context === context) return true; // already playing this track

  let buffer = decoded.get(context);
  if (!buffer) {
    try {
      const res = await fetch(track.url);
      if (!res.ok) return false;
      const bytes = await res.arrayBuffer();
      buffer = await guts.ctx.decodeAudioData(bytes);
      decoded.set(context, buffer);
    } catch {
      return false;
    }
  }

  // The context may have been torn down or switched while we were decoding.
  const live = peekAudio();
  if (!live) return false;
  if (current && current.context === context) return true;
  stopMusic();

  const src = live.ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const gain = live.ctx.createGain();
  const now = live.ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(track.gain, now + FADE_IN);
  src.connect(gain).connect(live.master);
  src.start(now);
  current = { src, gain, context };
  return true;
}

/** Fade out and stop the current music track. Safe to call when nothing is playing. */
export function stopMusic(): void {
  const c = current;
  current = null;
  if (!c) return;
  const live = peekAudio();
  if (!live) return;
  const now = live.ctx.currentTime;
  c.gain.gain.cancelScheduledValues(now);
  c.gain.gain.setValueAtTime(Math.max(c.gain.gain.value, 0.0001), now);
  c.gain.gain.exponentialRampToValueAtTime(0.0001, now + FADE_OUT);
  try { c.src.stop(now + FADE_OUT + 0.05); } catch { /* already stopped */ }
}

/** The context whose music is currently playing, or null. */
export function currentMusicContext(): string | null {
  return current?.context ?? null;
}
