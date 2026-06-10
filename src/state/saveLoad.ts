import { CivState } from '../game/types';

export const SAVE_KEY = 'rogue-civ-save-v1';
const CURRENT_VERSION = 2;

export function serialize(civ: CivState): string {
  return JSON.stringify(civ);
}

export function deserialize(json: string): CivState {
  return JSON.parse(json) as CivState;
}

export function save(civ: CivState, storage: Storage = localStorage): void {
  storage.setItem(SAVE_KEY, serialize(civ));
}

/** Bring a parsed save up to CURRENT_VERSION. Returns null for unknown/future versions. */
function migrate(parsed: any): CivState | null {
  let civ = parsed;
  if (civ.version === 1) {
    civ = { ...civ, version: 2, traditions: {} };
  }
  if (civ.version !== CURRENT_VERSION) return null;
  return civ as CivState;
}

export function load(storage: Storage = localStorage): CivState | null {
  const raw = storage.getItem(SAVE_KEY);
  if (raw === null) return null;
  try {
    return migrate(deserialize(raw));
  } catch {
    return null;
  }
}
