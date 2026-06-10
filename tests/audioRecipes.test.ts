import { describe, it, expect } from 'vitest';
import { SFX, AMBIENT, SfxName, AmbientContext } from '../src/audio/recipes';

// recipes.ts is pure data — it imports only types from engine.ts and never touches an
// AudioContext, so it loads cleanly in Vitest's node environment. These tests guard the
// shape of the library so a malformed recipe can't slip through (gains/gates sane,
// every named SFX present, ambient beds well-formed).

const SFX_NAMES: SfxName[] = [
  'shoot', 'enemy-hit', 'enemy-death', 'player-hit', 'gem-pickup', 'level-up',
  'draft-open', 'draft-select', 'build', 'upgrade', 'research', 'age-up',
  'zone-cleared', 'boss-arrival', 'run-start', 'run-end-cleared', 'run-end-death',
];

describe('recipes — SFX library', () => {
  it('defines a recipe for every named SFX', () => {
    for (const name of SFX_NAMES) {
      expect(SFX[name], `missing recipe: ${name}`).toBeDefined();
    }
    // No extras beyond the named set.
    expect(Object.keys(SFX).sort()).toEqual([...SFX_NAMES].sort());
  });

  it('gives every recipe at least one layer', () => {
    for (const [name, recipe] of Object.entries(SFX)) {
      expect(recipe.layers.length, `${name} has no layers`).toBeGreaterThan(0);
    }
  });

  it('keeps every layer within sane gain/gate bounds', () => {
    for (const [name, recipe] of Object.entries(SFX)) {
      for (const layer of recipe.layers) {
        expect(layer.gain, `${name} gain`).toBeGreaterThan(0);
        expect(layer.gain, `${name} gain`).toBeLessThanOrEqual(1);
        expect(layer.gateMs, `${name} gateMs`).toBeGreaterThan(0);
        expect(layer.env.sustain).toBeGreaterThanOrEqual(0);
        expect(layer.env.sustain).toBeLessThanOrEqual(1);
        if (layer.kind === 'osc') expect(layer.freq).toBeGreaterThan(0);
      }
    }
  });

  it('throttles the high-rate combat SFX so rapid fire cannot spam', () => {
    expect(SFX['shoot'].throttleMs).toBeGreaterThan(0);
    expect(SFX['enemy-hit'].throttleMs).toBeGreaterThan(0);
  });
});

describe('recipes — ambient beds', () => {
  const CONTEXTS: AmbientContext[] = ['civ', 'run'];

  it('defines a bed for each context with low, sane gain', () => {
    for (const ctx of CONTEXTS) {
      const bed = AMBIENT[ctx];
      expect(bed, `missing bed: ${ctx}`).toBeDefined();
      expect(bed.voices.length).toBeGreaterThan(0);
      expect(bed.gain).toBeGreaterThan(0);
      expect(bed.gain, 'ambient should sit low under the SFX').toBeLessThan(0.15);
      expect(bed.cutoff).toBeGreaterThan(0);
      expect(bed.lfoRate).toBeGreaterThan(0);
    }
  });
});
