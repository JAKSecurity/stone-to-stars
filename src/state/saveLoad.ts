import { CivState } from '../game/types';

export const SAVE_KEY = 'rogue-civ-save-v1';
const CURRENT_VERSION = 2; // RC-017 rescaled the economy; stale v1 saves reset (load → null)

export function serialize(civ: CivState): string {
  return JSON.stringify(civ);
}

export function deserialize(json: string): CivState {
  return JSON.parse(json) as CivState;
}

export function save(civ: CivState, storage: Storage = localStorage): void {
  storage.setItem(SAVE_KEY, serialize(civ));
}

export function load(storage: Storage = localStorage): CivState | null {
  const raw = storage.getItem(SAVE_KEY);
  if (raw === null) return null;
  try {
    const parsed = deserialize(raw);
    if (parsed.version !== CURRENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}
