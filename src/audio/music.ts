// File-based background music: looping CC0 tracks chosen by game context, routed through
// the engine's master gain (so the volume slider and mute apply to music too). This is
// the primary ambient layer; if a track can't be fetched/decoded, the caller falls back
// to the procedural bed in engine.ts. Loaded lazily — decoding only happens after audio
// is unlocked.
//
// Two axes of selection (the caller passes a `variant` — see index.startAmbient):
//   • civ screen → keyed by AGE  → an "era" track (ages grouped into musical eras)
//   • in-run     → keyed by BIOME → a "mood" track (biomes grouped into mood families)
//
// All tracks are CC0 / public domain — see src/audio/README.md for credits. This module
// is imported ONLY by index.ts (never by tests), so the binary-asset imports stay out of
// the node/Vitest path.

// Era tracks (civ screen, grouped by age).
import eraStone from './assets/era-stone.mp3';
import eraAncient from './assets/era-ancient.mp3';
import eraClassical from './assets/era-classical.ogg';
import eraMedieval from './assets/era-medieval.mp3';
import eraRenaissance from './assets/era-renaissance.mp3';
import eraIndustrial from './assets/era-industrial.ogg';
import eraModern from './assets/era-modern.mp3';
// Mood tracks (in-run, grouped by biome).
import moodWilderness from './assets/mood-wilderness.mp3';
import moodAncientMystery from './assets/mood-ancient-mystery.ogg';
import moodDarkDungeon from './assets/mood-dark-dungeon.ogg';
import moodEpicBattle from './assets/mood-epic-battle.mp3';
import moodGrimWar from './assets/mood-grim-war.ogg';

import { ensureAudio, peekAudio } from './engine';

interface MusicTrack {
  url: string;
  /** Per-track playback gain (these are full mixes; the master gain applies on top). */
  gain: number;
}

// ── Selection tables ───────────────────────────────────────────────────────
// Age → era key (the civ screen). Stone has its own bed; Bronze/Iron share "ancient";
// the rest are 1:1. Adding finer granularity later = split a group + add one ERA_TRACKS entry.
const AGE_ERA: Record<string, string> = {
  stone: 'stone',
  bronze: 'ancient', iron: 'ancient',
  classical: 'classical',
  medieval: 'medieval',
  renaissance: 'renaissance',
  industrial: 'industrial',
  modern: 'modern',
};

// Biome → mood key (in-run). Multiple biomes share a mood family.
const BIOME_MOOD: Record<string, string> = {
  wilds: 'wilderness', frontier: 'wilderness',
  ruins: 'ancient-mystery',
  caverns: 'dark-dungeon', cursed_keep: 'dark-dungeon',
  colosseum: 'epic-battle',
  plague_city: 'grim-war', foundry_wastes: 'grim-war', no_mans_land: 'grim-war',
};

const ERA_TRACKS: Record<string, MusicTrack> = {
  stone: { url: eraStone, gain: 0.72 },     // "Tribal Hangout" — primal/atmospheric
  ancient: { url: eraAncient, gain: 0.7 },  // "Tribal" — bronze/iron
  classical: { url: eraClassical, gain: 0.85 },
  medieval: { url: eraMedieval, gain: 0.58 }, // Market Day masters hot — pulled down to match

  renaissance: { url: eraRenaissance, gain: 0.8 },
  industrial: { url: eraIndustrial, gain: 0.7 },
  modern: { url: eraModern, gain: 0.6 },
};

const MOOD_TRACKS: Record<string, MusicTrack> = {
  wilderness: { url: moodWilderness, gain: 0.6 },
  'ancient-mystery': { url: moodAncientMystery, gain: 0.85 },
  'dark-dungeon': { url: moodDarkDungeon, gain: 0.85 },
  'epic-battle': { url: moodEpicBattle, gain: 0.6 },
  'grim-war': { url: moodGrimWar, gain: 0.6 },
};

// Fallbacks when a variant isn't recognized (e.g. a future age/biome with no track yet).
const DEFAULT_ERA = 'medieval';
const DEFAULT_MOOD = 'ancient-mystery';

const FADE_IN = 1.2;   // seconds
const FADE_OUT = 0.6;  // seconds

// ── Resolution ─────────────────────────────────────────────────────────────

/** Resolve a (context, variant) to a stable track key + track, or null for unknown context. */
export function resolveTrack(context: string, variant?: string): { key: string; track: MusicTrack } | null {
  if (context === 'civ') {
    const era = (variant && AGE_ERA[variant]) || DEFAULT_ERA;
    return { key: `civ:${era}`, track: ERA_TRACKS[era] };
  }
  if (context === 'run') {
    const mood = (variant && BIOME_MOOD[variant]) || DEFAULT_MOOD;
    return { key: `run:${mood}`, track: MOOD_TRACKS[mood] };
  }
  return null;
}

/** Whether a music track is defined for this context. */
export function hasMusic(context: string): boolean {
  return context === 'civ' || context === 'run';
}

// ── Playback ───────────────────────────────────────────────────────────────

const decoded = new Map<string, AudioBuffer>(); // keyed by track URL
let current: { src: AudioBufferSourceNode; gain: GainNode; key: string } | null = null;

/**
 * Start (or keep) the looping track selected by (context, variant), fading it in. Returns
 * true if music is now playing, false if it couldn't (no context yet, unknown context, or
 * a fetch/decode failure) — in which case the caller should use the procedural bed.
 */
export async function playMusic(context: string, variant?: string): Promise<boolean> {
  const resolved = resolveTrack(context, variant);
  if (!resolved) return false;
  const { key, track } = resolved;
  const guts = ensureAudio(); // caller only invokes this post-unlock, so no context is created here
  if (!guts) return false;
  if (current && current.key === key) return true; // already playing this track

  let buffer = decoded.get(track.url);
  if (!buffer) {
    try {
      const res = await fetch(track.url);
      if (!res.ok) return false;
      const bytes = await res.arrayBuffer();
      buffer = await guts.ctx.decodeAudioData(bytes);
      decoded.set(track.url, buffer);
    } catch {
      return false;
    }
  }

  // The context may have been torn down, or the desired track switched, while decoding.
  const live = peekAudio();
  if (!live) return false;
  if (current && current.key === key) return true;
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
  current = { src, gain, key };
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

/** The track key currently playing (e.g. "civ:medieval", "run:dark-dungeon"), or null. */
export function currentMusicKey(): string | null {
  return current?.key ?? null;
}
