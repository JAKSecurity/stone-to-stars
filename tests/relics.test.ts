import { describe, it, expect } from 'vitest';
import { RELICS } from '../src/run/relicData';
import { TECHS } from '../src/tech/techData';
import { TRADITIONS } from '../src/civics/traditionData';

describe('relic data', () => {
  it('has exactly the 6 spec relics', () => {
    expect(Object.keys(RELICS).sort()).toEqual([
      'blood_rush', 'bramble_mail', 'harvest_feast',
      'overcharge', 'prospectors_eye', 'second_wind',
    ]);
  });

  it('every relic has id-key match, name, icon, and a desc', () => {
    for (const [key, r] of Object.entries(RELICS)) {
      expect(r.id).toBe(key);
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.icon.length).toBeGreaterThan(0);
      expect(r.desc.length).toBeGreaterThan(0);
    }
  });

  it('every tech unlock points at a real tech; tradition unlocks at a real tradition within maxRank', () => {
    for (const r of Object.values(RELICS)) {
      if (r.unlock.kind === 'tech') {
        expect(TECHS[r.unlock.techId], `${r.id} gate`).toBeDefined();
      } else {
        const t = TRADITIONS[r.unlock.traditionId];
        expect(t, `${r.id} gate`).toBeDefined();
        expect(r.unlock.rank).toBeGreaterThan(0);
        expect(r.unlock.rank).toBeLessThanOrEqual(t.maxRank);
      }
    }
  });

  it('gates match the ratified spec table', () => {
    expect(RELICS.blood_rush.unlock).toEqual({ kind: 'tech', techId: 'hunting' });
    expect(RELICS.bramble_mail.unlock).toEqual({ kind: 'tech', techId: 'bronze_working' });
    expect(RELICS.prospectors_eye.unlock).toEqual({ kind: 'tech', techId: 'currency' });
    expect(RELICS.second_wind.unlock).toEqual({ kind: 'tech', techId: 'masonry' });
    expect(RELICS.overcharge.unlock).toEqual({ kind: 'tech', techId: 'electricity' });
    expect(RELICS.harvest_feast.unlock).toEqual({ kind: 'tradition', traditionId: 'vigor', rank: 3 });
  });
});
