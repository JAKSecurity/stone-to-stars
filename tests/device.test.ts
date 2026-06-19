import { describe, it, expect } from 'vitest';
import { isTouchDevice } from '../src/platform/device';

describe('isTouchDevice', () => {
  it('true when the device reports a coarse pointer', () => {
    const win = { matchMedia: (q: string) => ({ matches: q === '(pointer: coarse)' }) };
    expect(isTouchDevice(win)).toBe(true);
  });

  it('true when navigator reports touch points', () => {
    const win = { matchMedia: () => ({ matches: false }), navigator: { maxTouchPoints: 5 } };
    expect(isTouchDevice(win)).toBe(true);
  });

  it('true when ontouchstart is present', () => {
    const win = { matchMedia: () => ({ matches: false }), ontouchstart: null };
    expect(isTouchDevice(win)).toBe(true);
  });

  it('false on a plain mouse/keyboard device', () => {
    const win = { matchMedia: () => ({ matches: false }), navigator: { maxTouchPoints: 0 } };
    expect(isTouchDevice(win)).toBe(false);
  });

  it('falls through safely when matchMedia returns null (exercises the ?.matches guard)', () => {
    const win = { matchMedia: () => null as unknown as { matches: boolean }, navigator: { maxTouchPoints: 0 } };
    expect(isTouchDevice(win)).toBe(false);
  });
});
