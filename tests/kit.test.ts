import { describe, it, expect } from 'vitest';
import { validateKit, KIT_SIZE } from '../src/run/kit';

describe('expedition kit', () => {
  const unlocked = ['club', 'bronze_spear', 'gladius', 'javelin', 'flail', 'musket'];
  it('clamps to KIT_SIZE unlocked weapons, preserving order, defaulting from unlocked', () => {
    const k = validateKit(['musket', 'ghost_gun', 'club', 'flail', 'gladius', 'javelin'], unlocked);
    expect(k.kit).toHaveLength(KIT_SIZE);
    expect(k.kit).toEqual(['musket', 'club', 'flail', 'gladius']);
  });
  it('empty/missing kit defaults to the first unlocked weapons', () => {
    expect(validateKit(undefined, unlocked).kit).toEqual(['club', 'bronze_spear', 'gladius', 'javelin']);
  });
  it('a non-empty valid kit stays small — no padding from unlocked', () => {
    expect(validateKit(['club', 'gladius'], unlocked).kit).toEqual(['club', 'gladius']);
  });
  it('startWeapon must be in the kit (else first kit weapon)', () => {
    expect(validateKit(['club', 'gladius'], unlocked, 'musket').startWeapon).toBe('club');
    expect(validateKit(['club', 'gladius'], unlocked, 'gladius').startWeapon).toBe('gladius');
  });
});
