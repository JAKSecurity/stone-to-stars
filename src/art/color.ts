function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

/** amount in [-1,1]: positive lightens toward white, negative darkens toward black. */
export function shade(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  if (amount >= 0) {
    const t = clamp(amount, 0, 1);
    return toHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
  }
  const t = clamp(-amount, 0, 1);
  return toHex(r * (1 - t), g * (1 - t), b * (1 - t));
}

export function gradientStops(base: string): { light: string; dark: string } {
  return { light: shade(base, 0.28), dark: shade(base, -0.28) };
}
