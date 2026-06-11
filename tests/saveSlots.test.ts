import { describe, it, expect } from 'vitest';
import {
  saveToSlot, loadSlot, deleteSlot, slotInfo, listSlots, exportSave, importSave, slotKey,
} from '../src/state/saveSlots';
import { SAVE_KEY } from '../src/state/saveLoad';
import { newCivState, applyRunResult } from '../src/state/civState';
import type { CivState } from '../src/game/types';

// Minimal in-memory Storage shim (mirrors tests/saveLoad.test.ts — runs in Node, no jsdom).
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

const ISO = '2026-06-11T12:00:00.000Z';

describe('saveSlots — slot persistence', () => {
  it('round-trips a civ through a slot (saveToSlot → loadSlot)', () => {
    const storage = memStorage();
    const civ = applyRunResult(newCivState(), {
      collected: { exploration: 1, science: 2, industry: 3, culture: 4 },
      survivedMs: 1, died: false, tier: 0,
    });
    saveToSlot(civ, 1, ISO, storage);
    expect(loadSlot(1, storage)).toEqual(civ);
  });

  it('stores under a slot-specific key derived from SAVE_KEY', () => {
    const storage = memStorage();
    saveToSlot(newCivState(), 2, ISO, storage);
    expect(storage.getItem(slotKey(2))).not.toBeNull();
    expect(slotKey(2)).toBe(`${SAVE_KEY}-slot-2`);
    // Did not clobber the autosave key.
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('isolates slots — saving slot 1 leaves slots 2 and 3 untouched', () => {
    const storage = memStorage();
    const a = applyRunResult(newCivState(), {
      collected: { exploration: 5, science: 0, industry: 0, culture: 0 },
      survivedMs: 1, died: false, tier: 0,
    });
    saveToSlot(a, 1, ISO, storage);
    expect(loadSlot(1, storage)).toEqual(a);
    expect(loadSlot(2, storage)).toBeNull();
    expect(loadSlot(3, storage)).toBeNull();
  });

  it('loadSlot returns null when the slot is empty', () => {
    expect(loadSlot(1, memStorage())).toBeNull();
  });

  it('loadSlot returns null on corrupt JSON without deleting the data', () => {
    const storage = memStorage();
    storage.setItem(slotKey(1), '{not json');
    expect(loadSlot(1, storage)).toBeNull();
    expect(storage.getItem(slotKey(1))).toBe('{not json'); // retained
  });

  it('loadSlot returns null on a version mismatch but retains the stored data', () => {
    const storage = memStorage();
    const stale = { savedAt: ISO, civ: { ...newCivState(), version: 999 } };
    storage.setItem(slotKey(1), JSON.stringify(stale));
    expect(loadSlot(1, storage)).toBeNull();
    expect(storage.getItem(slotKey(1))).not.toBeNull(); // not deleted
  });

  it('deleteSlot removes the stored data', () => {
    const storage = memStorage();
    saveToSlot(newCivState(), 1, ISO, storage);
    deleteSlot(1, storage);
    expect(storage.getItem(slotKey(1))).toBeNull();
    expect(loadSlot(1, storage)).toBeNull();
  });
});

describe('saveSlots — slotInfo / listSlots', () => {
  it('summarizes an occupied slot (savedAt, runs, version)', () => {
    const storage = memStorage();
    const civ = applyRunResult(applyRunResult(newCivState(), {
      collected: { exploration: 0, science: 0, industry: 0, culture: 0 },
      survivedMs: 1, died: false, tier: 0,
    }), { collected: { exploration: 0, science: 0, industry: 0, culture: 0 }, survivedMs: 1, died: false, tier: 0 });
    saveToSlot(civ, 1, ISO, storage);
    expect(slotInfo(1, storage)).toEqual({ savedAt: ISO, runs: 2, version: 4 });
  });

  it('slotInfo returns null for an empty slot', () => {
    expect(slotInfo(1, memStorage())).toBeNull();
  });

  it('slotInfo returns null for corrupt JSON', () => {
    const storage = memStorage();
    storage.setItem(slotKey(1), 'garbage');
    expect(slotInfo(1, storage)).toBeNull();
  });

  it('slotInfo summarizes even a wrong-version slot (so the UI can show it, even if unloadable)', () => {
    const storage = memStorage();
    storage.setItem(slotKey(1), JSON.stringify({ savedAt: ISO, civ: { ...newCivState(), version: 2, runs: 7 } }));
    expect(slotInfo(1, storage)).toEqual({ savedAt: ISO, runs: 7, version: 2 });
  });

  it('listSlots reports all three slots in order', () => {
    const storage = memStorage();
    saveToSlot({ ...newCivState(), runs: 3 }, 2, ISO, storage);
    const list = listSlots(storage);
    expect(list).toHaveLength(3);
    expect(list[0]).toBeNull();
    expect(list[1]).toEqual({ savedAt: ISO, runs: 3, version: 4 });
    expect(list[2]).toBeNull();
  });
});

describe('saveSlots — export / import', () => {
  it('export → import round-trips to an equal civ', () => {
    const civ = applyRunResult(newCivState(), {
      collected: { exploration: 1, science: 2, industry: 3, culture: 4 },
      survivedMs: 1, died: false, tier: 0,
    });
    expect(importSave(exportSave(civ))).toEqual(civ);
  });

  it('exportSave produces pretty-printed JSON', () => {
    const json = exportSave(newCivState());
    expect(json).toContain('\n'); // indented, not a single line
    expect(JSON.parse(json).version).toBe(4);
  });

  it('importSave refuses a wrong-version save', () => {
    const json = JSON.stringify({ ...newCivState(), version: 3 });
    expect(importSave(json)).toBeNull();
  });

  it('importSave refuses garbage strings', () => {
    expect(importSave('{not json')).toBeNull();
    expect(importSave('')).toBeNull();
    expect(importSave('42')).toBeNull();
    expect(importSave('null')).toBeNull();
    expect(importSave('"a string"')).toBeNull();
    expect(importSave('[]')).toBeNull();
  });

  it('importSave refuses shapes missing required fields', () => {
    const base = newCivState();
    const drop = (k: keyof typeof base) => {
      const clone: Record<string, unknown> = { ...base };
      delete clone[k as string];
      return JSON.stringify(clone);
    };
    expect(importSave(drop('version'))).toBeNull();
    expect(importSave(drop('banked'))).toBeNull();
    expect(importSave(drop('researched'))).toBeNull();
    expect(importSave(drop('buildings'))).toBeNull();
    expect(importSave(drop('traditions'))).toBeNull();
  });

  it('importSave refuses wrong field types', () => {
    expect(importSave(JSON.stringify({ ...newCivState(), banked: 'nope' }))).toBeNull();
    expect(importSave(JSON.stringify({ ...newCivState(), researched: {} }))).toBeNull();
    expect(importSave(JSON.stringify({ ...newCivState(), buildings: 'x' }))).toBeNull();
    expect(importSave(JSON.stringify({ ...newCivState(), traditions: [] }))).toBeNull();
    expect(importSave(JSON.stringify({ ...newCivState(), version: '4' }))).toBeNull();
  });

  it('importSave accepts a well-formed current-version save', () => {
    const civ = newCivState();
    const imported = importSave(JSON.stringify(civ));
    expect(imported).not.toBeNull();
    expect(imported!.version).toBe(4);
  });

  // RC-036 — content-level validation tests (write first, watch fail, then fix importSave)

  it('importSave rejects banked: {} (missing resource keys)', () => {
    expect(importSave(JSON.stringify({ ...newCivState(), banked: {} }))).toBeNull();
  });

  it('importSave rejects banked with a non-numeric resource value', () => {
    expect(importSave(JSON.stringify({
      ...newCivState(),
      banked: { exploration: 'a', science: 0, industry: 0, culture: 0 },
    }))).toBeNull();
  });

  it('importSave rejects banked with a non-finite resource value (Infinity)', () => {
    // JSON.stringify drops Infinity → null; craft the string manually so the key actually survives.
    const base = JSON.stringify(newCivState());
    const poisoned = base.replace(/"banked":\{[^}]+\}/, '"banked":{"exploration":null,"science":0,"industry":0,"culture":0}');
    expect(importSave(poisoned)).toBeNull();
  });

  it('importSave rejects traditions with a non-numeric rank value', () => {
    expect(importSave(JSON.stringify({
      ...newCivState(),
      traditions: { oratory: 'abc' },
    }))).toBeNull();
  });

  it('importSave rejects traditions with a non-finite rank value', () => {
    // craft JSON with NaN directly (NaN serialises as null in JSON)
    const raw = JSON.stringify(newCivState()).replace('"traditions":{}', '"traditions":{"oratory":null}');
    expect(importSave(raw)).toBeNull();
  });

  it('importSave rejects kit: "notanarray" (string instead of array)', () => {
    expect(importSave(JSON.stringify({ ...newCivState(), kit: 'notanarray' }))).toBeNull();
  });

  it('importSave rejects kit: [42] (array of non-strings)', () => {
    expect(importSave(JSON.stringify({ ...newCivState(), kit: [42] }))).toBeNull();
  });

  it('importSave accepts kit: ["club"] (valid array of strings)', () => {
    expect(importSave(JSON.stringify({ ...newCivState(), kit: ['club'] }))).not.toBeNull();
  });

  it('importSave rejects researched: [42] (non-string element)', () => {
    expect(importSave(JSON.stringify({ ...newCivState(), researched: [42] }))).toBeNull();
  });

  it('importSave rejects buildings: [null] (null element)', () => {
    expect(importSave(JSON.stringify({ ...newCivState(), buildings: [null] }))).toBeNull();
  });

  it('importSave rejects buildings: ["x"] (non-object element)', () => {
    expect(importSave(JSON.stringify({ ...newCivState(), buildings: ['x'] }))).toBeNull();
  });

  it('importSave accepts activeItem: undefined (absent optional field)', () => {
    const civ = { ...newCivState() };
    delete (civ as Record<string, unknown>)['activeItem'];
    expect(importSave(JSON.stringify(civ))).not.toBeNull();
  });

  it('importSave accepts activeItem: "net" (string)', () => {
    expect(importSave(JSON.stringify({ ...newCivState(), activeItem: 'net' }))).not.toBeNull();
  });

  it('importSave rejects activeItem: 42 (non-string, non-undefined)', () => {
    expect(importSave(JSON.stringify({ ...newCivState(), activeItem: 42 }))).toBeNull();
  });

  it('importSave accepts startWeapon: undefined (absent optional field)', () => {
    const civ = { ...newCivState() };
    delete (civ as Record<string, unknown>)['startWeapon'];
    expect(importSave(JSON.stringify(civ))).not.toBeNull();
  });

  it('importSave accepts startWeapon: "spear" (string)', () => {
    expect(importSave(JSON.stringify({ ...newCivState(), startWeapon: 'spear' }))).not.toBeNull();
  });

  it('importSave rejects startWeapon: 0 (non-string, non-undefined)', () => {
    expect(importSave(JSON.stringify({ ...newCivState(), startWeapon: 0 }))).toBeNull();
  });

  it('newCivState() export→import round-trip still passes (no over-tightening)', () => {
    const civ = newCivState();
    const reimported = importSave(exportSave(civ));
    expect(reimported).not.toBeNull();
    expect(reimported).toEqual(civ);
  });

  it('round-trip still passes when optional lazy-defaulted fields are absent (kit, activeItem)', () => {
    const civ = { ...newCivState() } as Record<string, unknown>;
    delete civ['kit'];
    delete civ['activeItem'];
    delete civ['startWeapon'];
    delete civ['biomeBests'];
    delete civ['lifetimeResources'];
    const reimported = importSave(JSON.stringify(civ));
    expect(reimported).not.toBeNull();
    expect((reimported as CivState).version).toBe(4);
  });
});
