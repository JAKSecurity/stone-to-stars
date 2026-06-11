import { ArchetypeId } from '../game/types';

// Spec §5 — each verb owns a screen signature. `shake`: 0 none, 1 light, 2 heavy.
export interface VfxKit {
  tint: number;                      // trail particle / palette color
  impact: 'flash' | 'ring' | 'sparks';
  shake: 0 | 1 | 2;
}

export const VFX_KITS: Record<ArchetypeId, VfxKit> = {
  bolt:      { tint: 0xffe9a8, impact: 'flash',  shake: 0 },
  piercer:   { tint: 0xc8e4ff, impact: 'sparks', shake: 0 },
  spread:    { tint: 0xffc9a8, impact: 'flash',  shake: 1 },
  orbiter:   { tint: 0xd9b8ff, impact: 'flash',  shake: 0 },
  lobber:    { tint: 0xffaa33, impact: 'ring',   shake: 2 },
  trail:     { tint: 0xff7733, impact: 'flash',  shake: 0 },
  zone:      { tint: 0x99cc33, impact: 'ring',   shake: 1 },
  chain:     { tint: 0x7df9ff, impact: 'sparks', shake: 0 },
  boomerang: { tint: 0xb8ffd0, impact: 'flash',  shake: 0 },
  homing:    { tint: 0xff8da8, impact: 'ring',   shake: 2 },
};

/** Hybrid identity (spec §5): body archetype keeps motion + shake; palette parent donates
 *  tint + impact, so a Dragonlance reads as spear-flight with flame bursts. */
export function kitForHybrid(body: ArchetypeId, palette: ArchetypeId): VfxKit {
  return { tint: VFX_KITS[palette].tint, impact: VFX_KITS[palette].impact, shake: VFX_KITS[body].shake };
}
