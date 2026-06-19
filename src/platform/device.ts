// Single source of truth for "this is a touch-first device". Injectable for testing.
interface WinLike {
  matchMedia?: (q: string) => { matches: boolean };
  navigator?: { maxTouchPoints?: number };
  ontouchstart?: unknown;
}

export function isTouchDevice(win: WinLike = globalThis as unknown as WinLike): boolean {
  if (win.matchMedia?.('(pointer: coarse)')?.matches) return true;
  if ((win.navigator?.maxTouchPoints ?? 0) > 0) return true;
  return 'ontouchstart' in win;
}
