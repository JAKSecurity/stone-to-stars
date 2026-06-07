import { describe, it, expect } from 'vitest';
import { shade, gradientStops } from '../src/art/color';

describe('color', () => {
  it('shade(x, 0) returns the same color (normalized lowercase hex)', () => {
    expect(shade('#808080', 0)).toBe('#808080');
  });
  it('positive amount lightens toward white', () => {
    expect(shade('#000000', 1)).toBe('#ffffff');
    expect(shade('#808080', -0.5)).toBe('#404040');
  });
  it('negative amount darkens toward black', () => {
    expect(shade('#ffffff', -1)).toBe('#000000');
  });
  it('expands 3-digit hex', () => {
    expect(shade('#fff', 0)).toBe('#ffffff');
  });
  it('gradientStops gives a lighter and darker pair', () => {
    const { light, dark } = gradientStops('#808080');
    expect(light).not.toBe(dark);
    expect(light).toBe(shade('#808080', 0.28));
    expect(dark).toBe(shade('#808080', -0.28));
  });
});
