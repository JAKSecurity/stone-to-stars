import { describe, it, expect } from 'vitest';
import { TECHS } from '../src/tech/techData';
import { newCivState } from '../src/state/civState';
import { research, getAge } from '../src/tech/tech';
import { RESOURCES } from '../src/game/types';

describe('techData — RC-009 playtest #3 (writing/mining → bronze)', () => {
  it('writing and mining are bronze-age', () => {
    expect(TECHS.mining.age).toBe('bronze');
    expect(TECHS.writing.age).toBe('bronze');
  });

  it('the stone→bronze research chain still resolves (no deadlock)', () => {
    // a civ with plenty of every resource can still reach bronze via mining → bronze_working
    let civ = newCivState();
    civ = { ...civ, banked: Object.fromEntries(RESOURCES.map((r) => [r, 9999])) as any };
    civ = research(civ, 'mining');
    civ = research(civ, 'bronze_working');
    expect(getAge(civ)).toBe('bronze');
  });
});
