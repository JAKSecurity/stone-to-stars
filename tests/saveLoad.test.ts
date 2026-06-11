import { describe, it, expect } from 'vitest';
import { serialize, deserialize, save, load, SAVE_KEY } from '../src/state/saveLoad';
import { newCivState, applyRunResult } from '../src/state/civState';

// Minimal in-memory Storage shim (so tests run in Node, no jsdom).
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

describe('saveLoad', () => {
  it('round-trips a civ state through serialize/deserialize', () => {
    const civ = applyRunResult(newCivState(), {
      collected: { exploration: 1, science: 2, industry: 3, culture: 4 },
      survivedMs: 1, died: false, tier: 0,
    });
    expect(deserialize(serialize(civ))).toEqual(civ);
  });

  it('save then load returns an equal state', () => {
    const storage = memStorage();
    const civ = newCivState();
    save(civ, storage);
    expect(load(storage)).toEqual(civ);
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();
  });

  it('load returns null when there is no save', () => {
    expect(load(memStorage())).toBeNull();
  });

  it('load returns null on corrupt JSON instead of throwing', () => {
    const storage = memStorage();
    storage.setItem(SAVE_KEY, '{not json');
    expect(load(storage)).toBeNull();
  });

  it('load returns null on a version mismatch', () => {
    const storage = memStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ ...newCivState(), version: 999 }));
    expect(load(storage)).toBeNull();
  });

  it('resets pre-v3 saves (RC-017 economy rescale + RC-028 traditions make them incompatible)', () => {
    const storage = memStorage();
    for (const stale of [1, 2]) {
      storage.setItem(SAVE_KEY, JSON.stringify({
        version: stale,
        banked: { exploration: 1, science: 2, industry: 3, culture: 4 },
        researched: ['hunting'], buildings: [], runs: 2,
      }));
      expect(load(storage)).toBeNull();
    }
  });

  it('v3 saves reset on load (reset-on-bump, RC-017 stance)', () => {
    const fake = { getItem: () => JSON.stringify({ ...newCivState(), version: 3 }), setItem: () => {}, removeItem: () => {} } as unknown as Storage;
    expect(load(fake)).toBeNull();
  });
});
