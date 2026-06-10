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
    visual: { ground: '#1c2a1a', grid: '#3f5e36', speck: '#50703f', obstacles: ['obs_tree', 'obs_rock'] },
  },
  ruins: {
    id: 'ruins', name: 'Ancient Ruins', minAge: 'stone',
    resourceBias: { science: 1 },
    spawnTable: { scholar: 3, beast: 1 },
    tint: '#161b22',
    visual: { ground: '#2a2620', grid: '#5a513f', speck: '#6e6149', obstacles: ['obs_fallen_column', 'obs_rubble'] },
  },
  frontier: {
    id: 'frontier', name: 'Frontier', minAge: 'bronze',
    resourceBias: { exploration: 2, culture: 2 },
    spawnTable: { beast: 1, scholar: 1 },
    tint: '#1a1410',
    visual: { ground: '#2a2614', grid: '#5a5024', speck: '#6e612c', obstacles: ['obs_boulder_moss', 'obs_stump'] },
  },
  // Iron Age biome — tech-gated; iron_golem at weight 1 is a rare tough foe.
  // Proper mini-boss wave timing (boss room, announce, scaling) is deferred to a later ticket.
  caverns: {
    id: 'caverns', name: 'Deep Caverns', minAge: 'iron', requiresTech: 'deep_mining',
    resourceBias: { industry: 1, science: 1 },
    spawnTable: { cave_dweller: 6, automaton: 3, rock_golem: 2, iron_golem: 1 },
    tint: '#0c0a12',
    visual: { ground: '#111524', grid: '#2c3658', speck: '#3a4a72', obstacles: ['obs_stalagmite', 'obs_crystal'] },
  },
  // Classical Age biome — cyclops at weight 1 is a rare mini-boss encounter.
  // Proper mini-boss wave timing (announce, scaling, boss-room logic) is deferred to a later ticket.
  colosseum: {
    id: 'colosseum', name: 'Sunken Colosseum', minAge: 'classical',
    resourceBias: { industry: 1, culture: 1 },
    spawnTable: { harpy: 6, hoplite: 3, centaur: 3, cyclops: 1 },
    tint: '#171019',
    visual: { ground: '#241c28', grid: '#4c4054', speck: '#62526c', obstacles: ['obs_broken_pillar', 'obs_statue_rubble'] },
  },
  // Medieval Age biome — tech-gated behind masonry. Dragon at weight 1 is a rare mini-boss.
  // Proper mini-boss wave timing (boss room, announce, scaling) is deferred to a later ticket.
  cursed_keep: {
    id: 'cursed_keep', name: 'The Cursed Keep', minAge: 'medieval', requiresTech: 'masonry',
    resourceBias: { industry: 1, culture: 1 },
    spawnTable: { skeleton: 6, knight: 3, gargoyle: 3, dragon: 1 },
    tint: '#0a0c10',
    visual: { ground: '#141a20', grid: '#2e3c48', speck: '#3c4c5a', obstacles: ['obs_gravestone', 'obs_wall_rubble'] },
  },
  // Renaissance Age biome — minAge-gated only (intentional variety; no requiresTech).
  // Dreadnought at weight 1 is a rare mini-boss encounter (proper wave mechanics deferred).
  plague_city: {
    id: 'plague_city', name: 'Plague City', minAge: 'renaissance',
    resourceBias: { industry: 1, science: 1 },
    spawnTable: { musketeer: 5, pikeman: 3, grenadier: 3, dreadnought: 1 },
    tint: '#0c1410',
    visual: { ground: '#18211a', grid: '#36482e', speck: '#46583a', obstacles: ['obs_ruined_wall', 'obs_barrel_crate'] },
  },
  // Industrial Age biome — tech-gated behind electricity. Mecha at weight 1 is a rare
  // mini-boss encounter (proper boss-wave mechanics deferred to a later ticket).
  foundry_wastes: {
    id: 'foundry_wastes', name: 'Foundry Wastes', minAge: 'industrial', requiresTech: 'electricity',
    resourceBias: { industry: 1, science: 1 },
    spawnTable: { riveter: 6, drone: 3, steam_tank: 3, mecha: 1 },
    tint: '#0a0806',
    visual: { ground: '#1c1510', grid: '#4e3520', speck: '#74481f', obstacles: ['obs_slag_heap', 'obs_scrap'] },
  },
  // Modern Age biome — tech-gated behind flight. Juggernaut at weight 1 is a rare
  // mini-boss encounter (proper boss-wave mechanics deferred to a later ticket).
  no_mans_land: {
    id: 'no_mans_land', name: "No Man's Land", minAge: 'modern', requiresTech: 'flight',
    resourceBias: { industry: 1, science: 1 },
    spawnTable: { rifleman: 6, gunship: 3, halftrack: 3, juggernaut: 1 },
    tint: '#14130e',
    visual: { ground: '#201d14', grid: '#46402a', speck: '#585032', obstacles: ['obs_sandbags', 'obs_barbed_wire'] },
  },
};
