// Public audio API for Rogue·Civ. The rest of the game talks ONLY to this module:
//
//   import { playSfx, startAmbient, stopAmbient, setMuted, mountAudioControls,
//            unlockAudioOnFirstGesture } from './audio';
//
//   playSfx('shoot');                     // one-shot SFX
//   playSfx('gem-pickup', { semitones: 5 }); // pitch a chime up by gem value
//   startAmbient('run');                  // swap the looping bed
//   setMuted(true);                       // persisted to localStorage
//   setVolume(0.5);                       // master volume 0..1, persisted
//   mountAudioControls();                 // fixed panel: mute button + volume slider
//
// Everything is lazy and autoplay-safe: no sound is produced (and no AudioContext is
// created) until a user gesture, so importing this in any context is side-effect-free
// apart from reading the persisted mute/volume preferences.

import {
  ensureAudio, isMuted, setMuted as engineSetMuted, toggleMuted,
  getVolume, setVolume as engineSetVolume,
  playRecipe, startAmbientBed, stopAmbient as engineStopAmbient,
} from './engine';
import { SFX, SfxName, AMBIENT, AmbientContext } from './recipes';

export type { SfxName, AmbientContext } from './recipes';
export { isMuted, isAudioReady, getVolume } from './engine';

export interface PlayOpts {
  /** Transpose every tonal layer by this many semitones (e.g. gem value → pitch). */
  semitones?: number;
}

/** Play a named one-shot sound effect. No-op while muted or before the first gesture. */
export function playSfx(name: SfxName, opts: PlayOpts = {}): void {
  const recipe = SFX[name];
  if (!recipe) return;
  playRecipe(name, recipe, opts.semitones ?? 0);
}

// Remember the most recently requested ambient context so we can (re)start it once the
// AudioContext unlocks, or after unmuting.
let desiredAmbient: AmbientContext | null = null;

/** Start (or crossfade to) the looping ambient bed for a screen context. */
export function startAmbient(context: AmbientContext): void {
  desiredAmbient = context;
  startAmbientBed(context, AMBIENT[context]);
}

/** Stop the ambient bed (e.g. on a hard screen teardown). */
export function stopAmbient(): void {
  desiredAmbient = null;
  engineStopAmbient();
}

/** Set mute on/off (persisted). When unmuting, the last ambient bed resumes. */
export function setMuted(next: boolean): void {
  engineSetMuted(next);
  if (!next && desiredAmbient) startAmbient(desiredAmbient);
}

/** Toggle mute and return the new state (persisted). */
export function toggleMute(): boolean {
  const nowMuted = toggleMuted();
  if (!nowMuted && desiredAmbient) startAmbient(desiredAmbient);
  return nowMuted;
}

/** Set the master volume in [0, 1] (persisted). Independent of the mute flag. */
export function setVolume(next: number): void {
  engineSetVolume(next);
}

// ---------------------------------------------------------------------------
// Autoplay unlock — create/resume the AudioContext on the first user gesture and
// start whatever ambient bed was requested before then.
// ---------------------------------------------------------------------------

let unlockBound = false;

/**
 * Arm one-time listeners that unlock audio on the first pointer/key/touch gesture,
 * honoring the browser autoplay policy. Call once at startup; safe to call repeatedly.
 */
export function unlockAudioOnFirstGesture(): void {
  if (unlockBound) return;
  const target = globalThis as unknown as {
    addEventListener?: (t: string, cb: () => void, o?: AddEventListenerOptions) => void;
    removeEventListener?: (t: string, cb: () => void) => void;
  };
  if (!target.addEventListener) return;
  unlockBound = true;
  const events = ['pointerdown', 'keydown', 'touchstart'];
  const onGesture = () => {
    ensureAudio(); // first gesture — create/resume the context now (autoplay-compliant)
    for (const e of events) target.removeEventListener?.(e, onGesture);
    // Start whatever bed was requested before the unlock. startAmbientBed guards against
    // building duplicate nodes, so this is safe even if a bed is already playing.
    if (!isMuted() && desiredAmbient) startAmbient(desiredAmbient);
  };
  for (const e of events) target.addEventListener?.(e, onGesture, { once: false });
}

// ---------------------------------------------------------------------------
// Audio controls UI — a tiny, self-contained, fixed-position panel with a mute toggle
// and a volume slider. The module owns its own DOM so it stands alone; call
// mountAudioControls() once from the app entry point.
// ---------------------------------------------------------------------------

const SPEAKER = '🔊';
const MUTED = '🔇';
/** When unmuting (or nudging the slider up) from silence, jump to this volume. */
const RESUME_VOLUME = 0.7;

/**
 * Append a small fixed audio-controls panel (mute button + volume slider) to `parent`
 * (default document.body). Idempotent. Returns the panel element (or null with no DOM).
 */
export function mountAudioControls(parent?: HTMLElement): HTMLElement | null {
  const doc = (globalThis as { document?: Document }).document;
  if (!doc) return null;
  const host = parent ?? doc.body;
  const existing = doc.getElementById('audio-controls');
  if (existing) return existing as HTMLElement;

  const panel = doc.createElement('div');
  panel.id = 'audio-controls';
  Object.assign(panel.style, {
    position: 'fixed',
    right: '12px',
    bottom: '12px',
    zIndex: '9999',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px 6px 6px',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '10px',
    background: 'rgba(16,20,31,0.85)',
    userSelect: 'none',
  } as Partial<CSSStyleDeclaration>);

  const btn = doc.createElement('button');
  btn.id = 'audio-mute-toggle';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Toggle sound');
  btn.title = 'Toggle sound (saved across sessions)';
  Object.assign(btn.style, {
    width: '34px',
    height: '34px',
    border: '0',
    borderRadius: '7px',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: '18px',
    lineHeight: '1',
    cursor: 'pointer',
  } as Partial<CSSStyleDeclaration>);

  const slider = doc.createElement('input');
  slider.id = 'audio-volume';
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.step = '1';
  slider.setAttribute('aria-label', 'Volume');
  slider.title = 'Volume (saved across sessions)';
  Object.assign(slider.style, {
    width: '96px',
    cursor: 'pointer',
    accentColor: '#6cf',
  } as Partial<CSSStyleDeclaration>);

  const sync = () => {
    const m = isMuted();
    btn.textContent = m ? MUTED : SPEAKER;
    panel.style.opacity = m ? '0.7' : '1';
    slider.value = String(Math.round(getVolume() * 100));
  };
  sync();

  btn.addEventListener('click', () => {
    ensureAudio(); // the click is a user gesture — safe to create the context here
    const nowMuted = toggleMute();
    // Unmuting from a zeroed slider would stay silent — give it an audible level.
    if (!nowMuted && getVolume() === 0) setVolume(RESUME_VOLUME);
    sync();
  });

  const onSlide = () => {
    ensureAudio();
    const v = (slider.valueAsNumber || 0) / 100;
    setVolume(v);
    // The slider doubles as a mute control at its extremes.
    if (v === 0 && !isMuted()) setMuted(true);
    else if (v > 0 && isMuted()) setMuted(false);
    sync();
  };
  slider.addEventListener('input', onSlide);

  panel.appendChild(btn);
  panel.appendChild(slider);
  host.appendChild(panel);
  return panel;
}
