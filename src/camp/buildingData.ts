import { BuildingDef, Resource, RESOURCES } from '../game/types';
import { WEAPONS } from '../run/weaponData';
import { YIELD_SCALE } from '../game/economy';

const YIELD_ICON: Record<Resource, string> = {
  exploration: '🧭', science: '🔬', industry: '🏭', culture: '🎭',
};

/**
 * One-line summary of what a building does: its passive per-run yield plus its run bonus (HP / damage
 * / draft picks / weapons granted, by name). Lives here — not camp.ts — so tech.ts can describe an
 * unlocked building without importing camp (which imports tech). Yield/bonus both scale by level.
 */
export function buildingEffectText(def: BuildingDef): string {
  const parts: string[] = [];
  for (const r of RESOURCES) if (def.yield[r]) parts.push(`+${(def.yield[r] ?? 0) * YIELD_SCALE}${YIELD_ICON[r]}/run`);
  const rb = def.runBonus;
  if (rb.maxHp != null) parts.push(`+${rb.maxHp} HP`);
  if (rb.damageMult != null) parts.push(`+${Math.round(rb.damageMult * 100)}% dmg`);
  if (rb.draftChoices != null) parts.push(`+${rb.draftChoices} draft`);
  if (rb.weapons) for (const id of rb.weapons) parts.push(WEAPONS[id]?.name ?? id);
  return parts.join(' · ');
}

export const BUILDINGS: Record<string, BuildingDef> = {
  granary: {
    id: 'granary', age: 'stone', name: 'Granary',
    baseCost: { industry: 10 },
    yield: { culture: 3 },
    runBonus: { maxHp: 25 },
    maxLevel: 3,
  },
  mine: {
    id: 'mine', age: 'stone', name: 'Mine',
    baseCost: { industry: 15, science: 5 },
    yield: { industry: 4 },
    runBonus: { damageMult: 0.05 },
    maxLevel: 3,
  },
  forge: {
    id: 'forge', age: 'bronze', name: 'Forge',
    baseCost: { industry: 25, science: 15 },
    yield: { science: 3 },
    runBonus: { damageMult: 0.10, weapons: ['bronze_spear'] },
    maxLevel: 3,
  },
  smelter: {
    id: 'smelter', age: 'iron', name: 'Smelter',
    baseCost: { industry: 40, science: 20 },
    yield: { industry: 5 },
    runBonus: { damageMult: 0.10, weapons: ['iron_pick'] },
    maxLevel: 3,
  },
  foundry: {
    id: 'foundry', age: 'iron', name: 'Foundry',
    baseCost: { industry: 35, science: 35 },
    yield: { science: 5 },
    runBonus: { damageMult: 0.10, weapons: ['war_hammer'] },
    maxLevel: 3,
  },
  deep_mine: {
    id: 'deep_mine', age: 'iron', name: 'Deep Mine',
    baseCost: { industry: 50, science: 15 },
    yield: { industry: 8 },
    runBonus: { damageMult: 0.08 },
    maxLevel: 3,
  },
  academy: {
    id: 'academy', age: 'classical', name: 'Academy',
    baseCost: { science: 40, industry: 20 },
    yield: { science: 6 },
    runBonus: { draftChoices: 1, weapons: ['gladius'] },
    maxLevel: 3,
  },
  market: {
    id: 'market', age: 'classical', name: 'Market',
    baseCost: { industry: 35, exploration: 15 },
    yield: { exploration: 5, culture: 3 },
    runBonus: { maxHp: 30 },
    maxLevel: 3,
  },
  workshop: {
    id: 'workshop', age: 'classical', name: 'Workshop',
    baseCost: { industry: 45, science: 20 },
    yield: { industry: 7 },
    runBonus: { damageMult: 0.12, weapons: ['javelin'] },
    maxLevel: 3,
  },
  keep: { id: 'keep', age: 'medieval', name: 'Keep', baseCost: { industry: 60, science: 25 },
    yield: { industry: 9 }, runBonus: { maxHp: 40, weapons: ['longsword'] }, maxLevel: 3 },
  cathedral: { id: 'cathedral', age: 'medieval', name: 'Cathedral', baseCost: { culture: 40, science: 35 },
    yield: { culture: 6, science: 4 }, runBonus: { maxHp: 35 }, maxLevel: 3 },
  armory: { id: 'armory', age: 'medieval', name: 'Armory', baseCost: { industry: 55, science: 30 },
    yield: { industry: 8 }, runBonus: { damageMult: 0.14, weapons: ['halberd'] }, maxLevel: 3 },
  gunsmith: { id:'gunsmith', age:'renaissance', name:'Gunsmith', baseCost:{industry:70,science:35},
    yield:{industry:11}, runBonus:{ damageMult:0.16, weapons:['blunderbuss','grenade'] }, maxLevel:3 },
  university: { id:'university', age:'renaissance', name:'University', baseCost:{science:60,culture:30},
    yield:{science:9}, runBonus:{ draftChoices:1 }, maxLevel:3 },
  bank: { id:'bank', age:'renaissance', name:'Bank', baseCost:{industry:45,exploration:40},
    yield:{exploration:7,culture:4}, runBonus:{ maxHp:45 }, maxLevel:3 },
  factory: { id:'factory', age:'industrial', name:'Factory', baseCost:{industry:90,science:40},
    yield:{industry:14}, runBonus:{ damageMult:0.18, weapons:['flamethrower'] }, maxLevel:3 },
  powerplant: { id:'powerplant', age:'industrial', name:'Power Plant', baseCost:{science:70,industry:50},
    yield:{science:11}, runBonus:{ damageMult:0.16 }, maxLevel:3 },
  arsenal: { id:'arsenal', age:'industrial', name:'Arsenal', baseCost:{industry:80,science:40},
    yield:{industry:12}, runBonus:{ maxHp:50, weapons:['dynamite'] }, maxLevel:3 },
  motor_pool: { id:'motor_pool', age:'modern', name:'Motor Pool', baseCost:{industry:110,science:50},
    yield:{industry:16}, runBonus:{ damageMult:0.18, weapons:['rpg'] }, maxLevel:3 },
  barracks: { id:'barracks', age:'modern', name:'Barracks', baseCost:{industry:95,science:45},
    yield:{industry:13}, runBonus:{ maxHp:55, weapons:['mortar'] }, maxLevel:3 },
  airfield: { id:'airfield', age:'modern', name:'Airfield', baseCost:{science:90,industry:70},
    yield:{science:13}, runBonus:{ damageMult:0.18 }, maxLevel:3 },
};
