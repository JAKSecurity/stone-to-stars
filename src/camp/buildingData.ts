import { BuildingDef } from '../game/types';

export const BUILDINGS: Record<string, BuildingDef> = {
  granary: {
    id: 'granary', name: 'Granary',
    baseCost: { industry: 10 },
    yield: { culture: 3 },
    runBonus: { maxHp: 25 },
    maxLevel: 3,
  },
  mine: {
    id: 'mine', name: 'Mine',
    baseCost: { industry: 15, science: 5 },
    yield: { industry: 4 },
    runBonus: { damageMult: 0.05 },
    maxLevel: 3,
  },
  forge: {
    id: 'forge', name: 'Forge',
    baseCost: { industry: 25, science: 15 },
    yield: { science: 3 },
    runBonus: { damageMult: 0.10, weapons: ['bronze_spear'] },
    maxLevel: 3,
  },
  smelter: {
    id: 'smelter', name: 'Smelter',
    baseCost: { industry: 40, science: 20 },
    yield: { industry: 5 },
    runBonus: { damageMult: 0.10, weapons: ['iron_pick'] },
    maxLevel: 3,
  },
  foundry: {
    id: 'foundry', name: 'Foundry',
    baseCost: { industry: 35, science: 35 },
    yield: { science: 5 },
    runBonus: { damageMult: 0.10, weapons: ['war_hammer'] },
    maxLevel: 3,
  },
  deep_mine: {
    id: 'deep_mine', name: 'Deep Mine',
    baseCost: { industry: 50, science: 15 },
    yield: { industry: 8 },
    runBonus: { damageMult: 0.08 },
    maxLevel: 3,
  },
};
