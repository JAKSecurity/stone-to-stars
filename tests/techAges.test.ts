import { describe, it, expect } from 'vitest';
import { TECHS } from '../src/tech/techData';
import { newCivState } from '../src/state/civState';
import { research, getAge } from '../src/tech/tech';
import { AGE_ORDER, RESOURCES } from '../src/game/types';
import { BUILDINGS } from '../src/camp/buildingData';
import { WEAPONS } from '../src/run/weaponData';
import { MAX_LEVEL_BY_AGE } from '../src/run/archetypes';

describe('techData — RC-009 playtest #3 (writing/mining → bronze)', () => {
  it('writing and mining are bronze-age', () => {
    expect(TECHS.mining.age).toBe('bronze');
    expect(TECHS.writing.age).toBe('bronze');
  });

  it('the stone→bronze research chain still resolves (no deadlock)', () => {
    // a civ with plenty of every resource can still reach bronze via mining → bronze_working
    let civ = newCivState();
    civ = { ...civ, banked: Object.fromEntries(RESOURCES.map((r) => [r, 9999])) as any };
    civ = research(civ, 'mining');
    civ = research(civ, 'bronze_working');
    expect(getAge(civ)).toBe('bronze');
  });
});

describe('space age — RC-041 data invariants', () => {
  it('AGE_ORDER is 9 ages with space last (after modern)', () => {
    expect(AGE_ORDER).toHaveLength(9);
    expect(AGE_ORDER[8]).toBe('space');
    expect(AGE_ORDER[7]).toBe('modern');
  });

  it('rocketry gates the space age from the combustion line and unlocks the launch pad', () => {
    const t = TECHS.rocketry;
    expect(t.age).toBe('space');
    expect(t.requires).toEqual(['combustion']);
    expect(t.gatesAge).toBe('space');
    expect(t.unlocksBuilding).toBe('launch_pad');
  });

  it('computers comes off the radio line, unlocks mission control, +1 draft choice', () => {
    const t = TECHS.computers;
    expect(t.age).toBe('space');
    expect(t.requires).toEqual(['radio']);
    expect(t.unlocksBuilding).toBe('mission_control');
    expect(t.runBonus?.draftChoices).toBe(1);
  });

  it('satellites requires rocketry and grants the laser array', () => {
    const t = TECHS.satellites;
    expect(t.age).toBe('space');
    expect(t.requires).toEqual(['rocketry']);
    expect(t.runBonus?.weapons).toEqual(['laser_array']);
  });

  it('planetary_defense is the capstone: requires computers + satellites, grants nothing (RC-042 wires the finale)', () => {
    const t = TECHS.planetary_defense;
    expect(t.age).toBe('space');
    expect(t.requires).toEqual(['computers', 'satellites']);
    expect(t.gatesAge).toBeUndefined();
    expect(t.unlocksBuilding).toBeUndefined();
    expect(t.runBonus).toBeUndefined();
  });

  it('every space tech requirement and unlock resolves', () => {
    const spaceTechs = Object.values(TECHS).filter((t) => t.age === 'space');
    expect(spaceTechs.map((t) => t.id).sort())
      .toEqual(['computers', 'planetary_defense', 'rocketry', 'satellites']);
    for (const t of spaceTechs) {
      for (const req of t.requires) expect(TECHS[req], `${t.id} requires ${req}`).toBeDefined();
      if (t.unlocksBuilding) expect(BUILDINGS[t.unlocksBuilding], `${t.id} building`).toBeDefined();
      for (const w of t.runBonus?.weapons ?? []) expect(WEAPONS[w], `${t.id} weapon ${w}`).toBeDefined();
    }
  });

  it('space buildings are age space, maxLevel 3, per the spec table', () => {
    expect(BUILDINGS.launch_pad.age).toBe('space');
    expect(BUILDINGS.launch_pad.maxLevel).toBe(3);
    expect(BUILDINGS.launch_pad.yield).toEqual({ industry: 18 });
    expect(BUILDINGS.launch_pad.runBonus).toEqual({ damageMult: 0.20 });
    expect(BUILDINGS.mission_control.age).toBe('space');
    expect(BUILDINGS.mission_control.maxLevel).toBe(3);
    expect(BUILDINGS.mission_control.yield).toEqual({ science: 15 });
    expect(BUILDINGS.mission_control.runBonus).toEqual({ maxHp: 60 });
  });

  it('laser_array is a space-tier weapon on the age-scaled level curve', () => {
    const w = WEAPONS.laser_array;
    expect(w.tier).toBe('space');
    expect(MAX_LEVEL_BY_AGE.space).toBe(6); // continues 5 (industrial/modern) → 6
    expect(w.maxLevel).toBe(MAX_LEVEL_BY_AGE.space);
  });

  it('the full research chain reaches the space age and the capstone', () => {
    let civ = newCivState();
    civ = { ...civ, banked: Object.fromEntries(RESOURCES.map((r) => [r, 9_999_999])) as any };
    const chain = [
      'mining', 'bronze_working', 'iron_working', 'smelting', 'mathematics', 'engineering',
      'feudalism', 'masonry', 'guilds', 'gunpowder', 'banking', 'steam_power', 'railroad',
      'assembly_line', 'combustion', 'ballistics', 'radio',
      'rocketry', 'computers', 'satellites', 'planetary_defense',
    ];
    for (const id of chain) civ = research(civ, id);
    expect(getAge(civ)).toBe('space');
    expect(civ.researched).toContain('planetary_defense');
  });
});
