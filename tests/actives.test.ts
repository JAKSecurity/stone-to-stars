import { describe, it, expect } from 'vitest';
import { ACTIVES } from '../src/run/activeData';
import { resolveActiveItem } from '../src/run/actives';

describe('actives', () => {
  it('defines the three age-flavored actives', () => {
    expect(ACTIVES.net.effect.kind).toBe('slow');
    expect(ACTIVES.poison_gas.effect.kind).toBe('dot');
    expect(ACTIVES.grenade_volley.effect.kind).toBe('burst');
  });
  it('resolveActiveItem: chosen item must be unlocked, else first unlocked, else undefined', () => {
    expect(resolveActiveItem('poison_gas', ['net', 'poison_gas'])).toBe('poison_gas');
    expect(resolveActiveItem('grenade_volley', ['net'])).toBe('net');
    expect(resolveActiveItem(undefined, [])).toBeUndefined();
  });
});
