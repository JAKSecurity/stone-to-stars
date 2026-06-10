import { describe, it, expect } from 'vitest';
import {
  noteToFreq, transpose, dbToGain, clamp01, lerp,
  envSustainLevel, adsrValueAt, adsrDurationMs, Envelope,
} from '../src/audio/theory';

describe('theory — noteToFreq', () => {
  it('anchors A4 at 440 Hz and doubles per octave', () => {
    expect(noteToFreq(69)).toBeCloseTo(440);
    expect(noteToFreq(81)).toBeCloseTo(880);  // +12 semitones
    expect(noteToFreq(57)).toBeCloseTo(220);  // -12 semitones
  });

  it('matches the equal-temperament formula for middle C', () => {
    expect(noteToFreq(60)).toBeCloseTo(261.6256, 3);
  });
});

describe('theory — transpose', () => {
  it('shifts an octave up/down by ±12 semitones', () => {
    expect(transpose(440, 12)).toBeCloseTo(880);
    expect(transpose(440, -12)).toBeCloseTo(220);
    expect(transpose(440, 0)).toBeCloseTo(440);
  });

  it('handles fractional semitones', () => {
    expect(transpose(440, 1)).toBeCloseTo(440 * Math.pow(2, 1 / 12));
  });
});

describe('theory — gain/utility math', () => {
  it('converts dB to linear gain', () => {
    expect(dbToGain(0)).toBeCloseTo(1);
    expect(dbToGain(-6)).toBeCloseTo(0.5012, 3);
    expect(dbToGain(-20)).toBeCloseTo(0.1, 5);
  });

  it('clamps to [0,1]', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1.5)).toBe(1);
  });

  it('lerps endpoints and midpoint', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
  });
});

const ENV: Envelope = { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.4 };

describe('theory — envSustainLevel (attack/decay/sustain)', () => {
  it('rises linearly through the attack to a peak of 1', () => {
    expect(envSustainLevel(ENV, 0)).toBe(0);
    expect(envSustainLevel(ENV, 0.05)).toBeCloseTo(0.5); // halfway up the 0.1s attack
    expect(envSustainLevel(ENV, 0.1)).toBeCloseTo(1);    // attack complete
  });

  it('decays linearly from peak down to the sustain level', () => {
    // midway through the 0.2s decay → halfway from 1 down to 0.5 = 0.75
    expect(envSustainLevel(ENV, 0.2)).toBeCloseTo(0.75);
    expect(envSustainLevel(ENV, 0.3)).toBeCloseTo(0.5); // decay complete
  });

  it('holds at the sustain level after decay', () => {
    expect(envSustainLevel(ENV, 1.0)).toBeCloseTo(0.5);
  });

  it('treats a zero-length attack as instantaneous', () => {
    const instant: Envelope = { attack: 0, decay: 0, sustain: 0.5, release: 0.1 };
    expect(envSustainLevel(instant, 0.001)).toBeCloseTo(0.5);
  });
});

describe('theory — adsrValueAt (full envelope with release)', () => {
  const gate = 1.0; // hold 1s

  it('follows attack/decay/sustain before the gate closes', () => {
    expect(adsrValueAt(ENV, 0.1, gate)).toBeCloseTo(1);
    expect(adsrValueAt(ENV, 0.5, gate)).toBeCloseTo(0.5);
  });

  it('ramps from the sustain level to zero across the release', () => {
    // release is 0.4s, starting from sustain 0.5
    expect(adsrValueAt(ENV, gate, gate)).toBeCloseTo(0.5);       // gate edge
    expect(adsrValueAt(ENV, gate + 0.2, gate)).toBeCloseTo(0.25); // halfway down
    expect(adsrValueAt(ENV, gate + 0.4, gate)).toBeCloseTo(0);   // release done
  });

  it('is zero before note-on and after the release tail', () => {
    expect(adsrValueAt(ENV, -1, gate)).toBe(0);
    expect(adsrValueAt(ENV, gate + 1, gate)).toBe(0);
  });

  it('releases from a partial level when the gate is shorter than attack+decay', () => {
    // gate at 0.05s = halfway up the attack → level 0.5; never reaches the peak.
    const shortGate = 0.05;
    expect(adsrValueAt(ENV, shortGate, shortGate)).toBeCloseTo(0.5);
    expect(adsrValueAt(ENV, shortGate + 0.2, shortGate)).toBeCloseTo(0.25); // half of 0.5
  });
});

describe('theory — adsrDurationMs', () => {
  it('is the gate plus the release tail in ms', () => {
    expect(adsrDurationMs(ENV, 100)).toBeCloseTo(100 + 400);
  });
});
