import { BiomeDef } from '../game/types';

// 3 base biomes, all using existing enemy sprites (RC-007 is art-free). Industry/
// science come from which enemies the spawn table favors; exploration/culture come
// from resourceBias scaling the in-run explore-tick and relic rates (RunScene).
export const BIOMES: Record<string, BiomeDef> = {
  wilds: {
    id: 'wilds', name: 'The Wilds', minAge: 'stone',
    resourceBias: { industry: 1 },
    spawnTable: { beast: 3, scholar: 1 },
    tint: '#10141f',
  },
  ruins: {
    id: 'ruins', name: 'Ancient Ruins', minAge: 'stone',
    resourceBias: { science: 1 },
    spawnTable: { scholar: 3, beast: 1 },
    tint: '#161b22',
  },
  frontier: {
    id: 'frontier', name: 'Frontier', minAge: 'bronze',
    resourceBias: { exploration: 2, culture: 2 },
    spawnTable: { beast: 1, scholar: 1 },
    tint: '#1a1410',
  },
  // Iron Age biome — tech-gated; iron_golem at weight 1 is a rare tough foe.
  // Proper mini-boss wave timing (boss room, announce, scaling) is deferred to a later ticket.
  caverns: {
    id: 'caverns', name: 'Deep Caverns', minAge: 'iron', requiresTech: 'deep_mining',
    resourceBias: { industry: 1, science: 1 },
    spawnTable: { cave_dweller: 6, automaton: 3, rock_golem: 2, iron_golem: 1 },
    tint: '#0c0a12',
  },
};
