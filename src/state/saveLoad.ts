import { CivState } from '../game/types';

export const SAVE_KEY = 'rogue-civ-save-v1';
// v2 = RC-017 economy rescale; v3 = RC-028 traditions map. Both make older saves incompatible
// (old-scale banked resources / missing traditions), so any pre-v3 save resets — load → null —
// rather than migrate. This matches RC-017's "rescale resets saves" stance.
const CURRENT_VERSION = 3;

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
    if (parsed.version !== CURRENT_VERSION) return null; // stale/unknown version → reset
    return parsed;
  } catch {
    return null;
  }
}
