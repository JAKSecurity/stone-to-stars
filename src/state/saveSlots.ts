import { CivState } from '../game/types';
import { SAVE_KEY, isCurrentVersion } from './saveLoad';

// RC-036 — manual save/load. Three explicit slots layered over the single implicit autosave
// (saveLoad.ts), plus JSON export/import for off-device backup and the pre-version-bump escape
// hatch RC-017's reset-on-bump stance creates. Same version gate as the autosave load: a
// wrong-version or corrupt slot reads as null and is NOT deleted (the bytes are kept so a future
// build that bumps the version could still recover them, and a player can't lose data by clicking).

export const SLOTS = [1, 2, 3] as const;
export type SlotId = (typeof SLOTS)[number];

/** Stored shape for a slot: the civ plus an ISO timestamp of when it was saved. */
interface StoredSlot { savedAt: string; civ: CivState }

/** Summary a slot card needs without loading the whole civ. */
export interface SlotInfo { savedAt: string; runs: number; version: number }

export function slotKey(slot: SlotId): string {
  return `${SAVE_KEY}-slot-${slot}`;
}

export function saveToSlot(civ: CivState, slot: SlotId, savedAt: string, storage: Storage = localStorage): void {
  const payload: StoredSlot = { savedAt, civ };
  storage.setItem(slotKey(slot), JSON.stringify(payload));
}

/** Returns the civ if the slot holds a current-version save; null if empty, corrupt, or stale. Never mutates storage. */
export function loadSlot(slot: SlotId, storage: Storage = localStorage): CivState | null {
  const raw = storage.getItem(slotKey(slot));
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSlot;
    if (!parsed || typeof parsed !== 'object' || !parsed.civ) return null;
    if (!isCurrentVersion(parsed.civ)) return null; // stale version → unloadable (but retained)
    return parsed.civ;
  } catch {
    return null;
  }
}

export function deleteSlot(slot: SlotId, storage: Storage = localStorage): void {
  storage.removeItem(slotKey(slot));
}

/**
 * Card summary for a slot — savedAt + runs + version — without enforcing the version gate, so the
 * UI can still describe a stale slot it can no longer load. null only when empty or corrupt.
 */
export function slotInfo(slot: SlotId, storage: Storage = localStorage): SlotInfo | null {
  const raw = storage.getItem(slotKey(slot));
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSlot;
    if (!parsed || typeof parsed !== 'object' || !parsed.civ || typeof parsed.civ !== 'object') return null;
    return { savedAt: parsed.savedAt, runs: parsed.civ.runs, version: parsed.civ.version };
  } catch {
    return null;
  }
}

/** slotInfo for all three slots, in order (index 0 = slot 1). */
export function listSlots(storage: Storage = localStorage): (SlotInfo | null)[] {
  return SLOTS.map((s) => slotInfo(s, storage));
}

/** Pretty-printed JSON of the civ for download. Version travels inside CivState.version. */
export function exportSave(civ: CivState): string {
  return JSON.stringify(civ, null, 2);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Parse an exported save back into a CivState. Enforces the same version gate as the autosave load
 * plus a minimal structural check (the fields gameplay code dereferences unconditionally). Any
 * failure → null so a bad paste/file can never crash or corrupt the live game.
 */
export function importSave(json: string): CivState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;
  if (typeof parsed.version !== 'number') return null;
  if (!isPlainObject(parsed.banked)) return null;
  if (!Array.isArray(parsed.researched)) return null;
  if (!Array.isArray(parsed.buildings)) return null;
  if (!isPlainObject(parsed.traditions)) return null;
  const civ = parsed as unknown as CivState;
  if (!isCurrentVersion(civ)) return null;
  return civ;
}
