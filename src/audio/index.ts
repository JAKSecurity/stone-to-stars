// Public audio API for Rogue·Civ. The rest of the game talks ONLY to this module:
//
//   import { playSfx, startAmbient, stopAmbient, setMuted, mountAudioControls,
//            unlockAudioOnFirstGesture } from './audio';
//
//   playSfx('shoot');                     // one-shot SFX
//   playSfx('gem-pickup', { semitones: 5 }); // pitch a chime up by gem value
//   startAmbient('run');                  // swap the looping bed
//   setMuted(true);                       // persisted to localStorage
//
// Everything is lazy and autoplay-safe: no sound is produced (and no AudioContext is
// created) until a user gesture, so importing this in any context is side-effect-free
// apart from reading the persisted mute preference.

import {
  ensureAudio, isMuted, setMuted as engineSetMuted, toggleMuted,
  playRecipe, startAmbientBed, stopAmbient as engineStopAmbient,
} from './engine';
import { SFX, SfxName, AMBIENT, AmbientContext } from './recipes';

export type { SfxName, AmbientContext } from './recipes';
export { isMuted, isAudioReady } from './engine';

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
// Mute toggle UI — a tiny, self-contained, fixed-position button. The module owns its
// own DOM so it stands alone; call mountAudioControls() once from the app entry point.
// ---------------------------------------------------------------------------

const SPEAKER = '🔊';
const MUTED = '🔇';

/**
 * Append a small fixed mute toggle to `parent` (default document.body). Idempotent.
 * Returns the button element (or null when there's no DOM, e.g. under node).
 */
export function mountAudioControls(parent?: HTMLElement): HTMLButtonElement | null {
  const doc = (globalThis as { document?: Document }).document;
  if (!doc) return null;
  const host = parent ?? doc.body;
  const existing = doc.getElementById('audio-mute-toggle');
  if (existing) return existing as HTMLButtonElement;

  const btn = doc.createElement('button');
  btn.id = 'audio-mute-toggle';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Toggle sound');
  btn.title = 'Toggle sound (saved across sessions)';
  Object.assign(btn.style, {
    position: 'fixed',
    right: '12px',
    bottom: '12px',
    zIndex: '9999',
    width: '40px',
    height: '40px',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '8px',
    background: 'rgba(16,20,31,0.85)',
    color: '#fff',
    fontSize: '18px',
    lineHeight: '1',
    cursor: 'pointer',
    userSelect: 'none',
  } as Partial<CSSStyleDeclaration>);

  const sync = () => {
    const m = isMuted();
    btn.textContent = m ? MUTED : SPEAKER;
    btn.style.opacity = m ? '0.55' : '1';
  };
  sync();

  btn.addEventListener('click', () => {
    ensureAudio();      // the click is a user gesture — safe to create the context here
    toggleMute();
    sync();
  });

  host.appendChild(btn);
  return btn;
}
