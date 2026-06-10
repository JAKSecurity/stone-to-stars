import { describe, it, expect } from 'vitest';
import { getVolume, setVolume, isMuted, setMuted } from '../src/audio/engine';

// engine.ts only touches an AudioContext lazily (inside ensureAudio/playRecipe), so it
// imports cleanly under Vitest's node environment. These tests cover the parts that work
// without a context: volume clamping/state and the mute flag. (Under node there's no
// localStorage, so the persisted defaults fall back to the in-memory values.)

describe('engine — volume', () => {
  it('defaults to a sane mid level when no preference is stored', () => {
    expect(getVolume()).toBeGreaterThan(0);
    expect(getVolume()).toBeLessThanOrEqual(1);
  });

  it('clamps set values into [0, 1]', () => {
    setVolume(0.42);
    expect(getVolume()).toBeCloseTo(0.42);
    setVolume(1.5);
    expect(getVolume()).toBe(1);
    setVolume(-3);
    expect(getVolume()).toBe(0);
  });

  it('keeps volume independent of the mute flag', () => {
    setVolume(0.6);
    setMuted(true);
    expect(getVolume()).toBeCloseTo(0.6); // muting must not zero the stored volume
    expect(isMuted()).toBe(true);
    setMuted(false);
    expect(getVolume()).toBeCloseTo(0.6);
    expect(isMuted()).toBe(false);
  });
});
