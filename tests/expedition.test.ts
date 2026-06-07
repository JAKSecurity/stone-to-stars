import { describe, it, expect } from 'vitest';
import { AGE_ORDER } from '../src/game/types';

describe('age order', () => {
  it('runs stone → bronze → iron', () => {
    expect(AGE_ORDER).toEqual(['stone', 'bronze', 'iron']);
  });
});
