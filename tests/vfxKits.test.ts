import { describe, it, expect } from 'vitest';
import { VFX_KITS, kitForHybrid } from '../src/run/vfxKits';
import { ARCHETYPE_IDS } from '../src/run/archetypes';

describe('vfx kits', () => {
  it('every archetype owns a kit', () => {
    for (const id of ARCHETYPE_IDS) expect(VFX_KITS[id]).toBeDefined();
  });
  it('hybrid kit: body archetype keeps motion/shake, palette archetype donates tint/impact', () => {
    const k = kitForHybrid('piercer', 'trail');
    expect(k.shake).toBe(VFX_KITS.piercer.shake);
    expect(k.tint).toBe(VFX_KITS.trail.tint);
    expect(k.impact).toBe(VFX_KITS.trail.impact);
  });
});
