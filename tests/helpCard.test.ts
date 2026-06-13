import { describe, it, expect } from 'vitest';
import { HELP_SEEN_KEY, shouldAutoShowHelp, markHelpSeen } from '../src/ui/helpCard';

// In-memory Storage shim (mirrors tests/saveSlots.test.ts — runs in Node, no jsdom).
function memStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => { map.delete(k); },
    setItem: (k, v) => { map.set(k, v); },
  } as Storage;
}

describe('helpCard first-run flag', () => {
  it('auto-shows when the seen key is absent', () => {
    const s = memStorage();
    expect(shouldAutoShowHelp(s)).toBe(true);
  });

  it('does not auto-show once marked seen', () => {
    const s = memStorage();
    markHelpSeen(s);
    expect(shouldAutoShowHelp(s)).toBe(false);
    expect(s.getItem(HELP_SEEN_KEY)).not.toBeNull();
  });

  it('markHelpSeen is idempotent', () => {
    const s = memStorage();
    markHelpSeen(s);
    markHelpSeen(s);
    expect(shouldAutoShowHelp(s)).toBe(false);
  });
});
