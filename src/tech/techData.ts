import { TechNode } from '../game/types';

export const TECHS: Record<string, TechNode> = {
  pottery: {
    id: 'pottery', name: 'Pottery', age: 'stone',
    cost: { industry: 10 }, requires: [], unlocksBuilding: 'granary',
  },
  hunting: {
    id: 'hunting', name: 'Hunting', age: 'stone',
    cost: { industry: 8 }, requires: [], runBonus: { damageMult: 0.10 },
  },
  mysticism: {
    id: 'mysticism', name: 'Mysticism', age: 'stone',
    cost: { culture: 10 }, requires: [], runBonus: { maxHp: 15 },
  },
  mining: {
    id: 'mining', name: 'Mining', age: 'stone',
    cost: { industry: 15, science: 5 }, requires: [], unlocksBuilding: 'mine',
  },
  writing: {
    id: 'writing', name: 'Writing', age: 'stone',
    cost: { science: 12 }, requires: [], runBonus: { draftChoices: 1 },
  },
  bronze_working: {
    id: 'bronze_working', name: 'Bronze Working', age: 'bronze',
    cost: { industry: 25, science: 20 }, requires: ['mining'],
    unlocksBuilding: 'forge', gatesAge: 'bronze',
  },
};
