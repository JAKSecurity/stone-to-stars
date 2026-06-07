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
  // Classical Age biome — cyclops at weight 1 is a rare mini-boss encounter.
  // Proper mini-boss wave timing (announce, scaling, boss-room logic) is deferred to a later ticket.
  colosseum: {
    id: 'colosseum', name: 'Sunken Colosseum', minAge: 'classical',
    resourceBias: { industry: 1, culture: 1 },
    spawnTable: { harpy: 6, hoplite: 3, centaur: 3, cyclops: 1 },
    tint: '#171019',
  },
  // Medieval Age biome — tech-gated behind masonry. Dragon at weight 1 is a rare mini-boss.
  // Proper mini-boss wave timing (boss room, announce, scaling) is deferred to a later ticket.
  cursed_keep: {
    id: 'cursed_keep', name: 'The Cursed Keep', minAge: 'medieval', requiresTech: 'masonry',
    resourceBias: { industry: 1, culture: 1 },
    spawnTable: { skeleton: 6, knight: 3, gargoyle: 3, dragon: 1 },
    tint: '#0a0c10',
  },
};
