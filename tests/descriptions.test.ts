import { describe, it, expect } from 'vitest';
import { weaponStatText, weaponLevelGainText } from '../src/run/weapons';
import { WEAPONS } from '../src/run/weaponData';
import { techEffectText } from '../src/tech/tech';

describe('weapon draft descriptions', () => {
  it('weaponStatText summarizes the base firing profile', () => {
    // club: 12 dmg, 1 shot, bolt archetype, 500ms -> 2.0/s
    expect(weaponStatText(WEAPONS.club)).toBe('12 dmg · 1 shot · bolt · 2.0/s');
    // bronze_spear: 14 dmg, 2 shots, pierce 1
    expect(weaponStatText(WEAPONS.bronze_spear)).toContain('2 shots');
    expect(weaponStatText(WEAPONS.bronze_spear)).toContain('pierce 1');
  });

  it('weaponLevelGainText describes one level-up', () => {
    // club levelScaling: damage +6, cooldownMs -60
    expect(weaponLevelGainText(WEAPONS.club)).toBe('+6 dmg · +60ms faster');
    // sawblade scales damage only (no cooldown delta)
    expect(weaponLevelGainText(WEAPONS.sawblade)).toBe('+5 dmg');
  });
});

describe('tech effect descriptions', () => {
  it('describes what an unlocked building does inline', () => {
    // pottery unlocks granary (+60 culture/run after YIELD_SCALE, +25 HP)
    expect(techEffectText('pottery')).toBe('Unlocks Granary (+60🎭/run · +25 HP)');
  });

  it('describes run bonuses and age advances', () => {
    expect(techEffectText('hunting')).toBe('+10% dmg');
    expect(techEffectText('mysticism')).toBe('+15 HP');
    expect(techEffectText('bronze_working')).toContain('Advances to Bronze Age');
  });
});
