// RC-031 active items (spec §1): right-click, 1 charge/run base, tech-unlocked, picked pre-run.
export type ActiveEffect =
  | { kind: 'slow'; radius: number; durationMs: number; pct: number }
  | { kind: 'dot'; radius: number; durationMs: number; dps: number }
  | { kind: 'burst'; radius: number; count: number; damage: number };

export interface ActiveDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  effect: ActiveEffect;
}

export const ACTIVES: Record<string, ActiveDef> = {
  net:            { id: 'net', name: 'Hunting Net', icon: '🕸️',
    desc: 'Slows enemies in an area by 60% for 4s',
    effect: { kind: 'slow', radius: 160, durationMs: 4000, pct: 0.6 } },
  poison_gas:     { id: 'poison_gas', name: 'Poison Gas', icon: '☠️',
    desc: 'Lingering cloud — 14 dmg/s for 8s',
    effect: { kind: 'dot', radius: 140, durationMs: 8000, dps: 14 } },
  grenade_volley: { id: 'grenade_volley', name: 'Grenade Volley', icon: '💣',
    desc: '3 blasts of 50 dmg in an area',
    effect: { kind: 'burst', radius: 70, count: 3, damage: 50 } },
};
