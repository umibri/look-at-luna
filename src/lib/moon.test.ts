import { describe, expect, it } from 'vitest';
import { Body, Illumination, MoonPhase } from 'astronomy-engine';
import { findPhase, getMoonData, lunarCycle, phaseName, sunDirection } from '@lib/moon';
import { addDays, isSameLocalDay, parseLocalDate, toDateInputValue, toJulianDate } from '@lib/utils';

/** Within 1.5 h of a published time (the algorithm's worst case is ~38 min). */
const near = (actual: Date, iso: string) =>
  expect(Math.abs(actual.getTime() - new Date(iso).getTime())).toBeLessThan(1.5 * 3_600_000);

const at = (iso: string) => getMoonData(toJulianDate(new Date(iso)));

/** Distance between two cycle fractions, wrapping at 1 (0.99 and 0.01 are 0.02 apart). */
const cycleDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d);
};

describe('toJulianDate', () => {
  it('matches the J2000.0 epoch', () => {
    expect(toJulianDate(new Date('2000-01-01T12:00:00Z'))).toBe(2_451_545.0);
  });

  it('keeps the time of day', () => {
    const midnight = toJulianDate(new Date('2025-06-01T00:00:00Z'));
    const sixAm = toJulianDate(new Date('2025-06-01T06:00:00Z'));
    expect(sixAm - midnight).toBeCloseTo(0.25, 10);
  });
});

describe('parseLocalDate', () => {
  it('returns local noon on the given day', () => {
    const d = parseLocalDate('2026-03-03')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 3, 12]);
  });

  it('rejects empty or malformed input', () => {
    expect(parseLocalDate('')).toBeNull();
    expect(parseLocalDate('03/03/2026')).toBeNull();
  });
});

describe('getMoonData at published phases', () => {
  // Times (UTC) of eclipse-season new and full moons, which are widely published.
  // A tolerance of 0.005 of a cycle is about 3.5 hours.
  const newMoons = [
    '2000-01-06T18:14Z',
    '2025-03-29T10:58Z',
    '2025-09-21T19:54Z',
    '2025-11-20T06:47Z',
    '2026-02-17T12:01Z',
    '2026-08-12T17:37Z',
  ];
  const fullMoons = [
    '2025-03-14T06:55Z',
    '2025-09-07T18:09Z',
    '2025-12-04T23:14Z',
    '2026-03-03T11:38Z',
    '2026-08-28T04:18Z',
  ];

  it.each(newMoons)('new moon %s', (iso) => {
    const m = at(iso);
    expect(cycleDistance(m.phase, 0)).toBeLessThan(0.005);
    expect(m.illuminated).toBeLessThan(0.005);
    expect(phaseName(m.phase)).toBe('New Moon');
  });

  it.each(fullMoons)('full moon %s', (iso) => {
    const m = at(iso);
    expect(cycleDistance(m.phase, 0.5)).toBeLessThan(0.005);
    expect(m.illuminated).toBeGreaterThan(0.995);
    expect(phaseName(m.phase)).toBe('Full Moon');
  });
});

describe('getMoonData against astronomy-engine', () => {
  it('stays within 0.5° of elongation and 0.5% illumination, 1950-2050', () => {
    const step = 1.37 * 86_400_000;
    let worstDeg = 0;
    let worstIllum = 0;

    for (let t = Date.UTC(1950, 0, 1); t < Date.UTC(2050, 0, 1); t += step) {
      const date = new Date(t);
      const m = getMoonData(toJulianDate(date));
      worstDeg = Math.max(worstDeg, cycleDistance(m.phase, MoonPhase(date) / 360) * 360);
      worstIllum = Math.max(worstIllum, Math.abs(m.illuminated - Illumination(Body.Moon, date).phase_fraction));
    }

    expect(worstDeg).toBeLessThan(0.5);
    expect(worstIllum).toBeLessThan(0.005);
  });
});

describe('phaseName', () => {
  it('names the centre of each eighth of the cycle', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((k) => phaseName(k / 8))).toEqual([
      'New Moon',
      'Waxing Crescent',
      'First Quarter',
      'Waxing Gibbous',
      'Full Moon',
      'Waning Gibbous',
      'Last Quarter',
      'Waning Crescent',
    ]);
  });

  it('wraps the end of the cycle back to New Moon', () => {
    expect(phaseName(0.99)).toBe('New Moon');
    expect(phaseName(1)).toBe('New Moon');
  });

  it('switches names halfway between centres', () => {
    expect(phaseName(0.0624)).toBe('New Moon');
    expect(phaseName(0.0626)).toBe('Waxing Crescent');
    expect(phaseName(0.5624)).toBe('Full Moon');
    expect(phaseName(0.5626)).toBe('Waning Gibbous');
  });
});

describe('sunDirection', () => {
  const expectVec = (actual: number[], expected: number[]) =>
    actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 10));

  it('puts the sun behind the moon at new and behind the viewer at full', () => {
    expectVec(sunDirection(0), [0, 0, -1]);
    expectVec(sunDirection(0.5), [0, 0, 1]);
  });

  it('lights the right half at first quarter and the left at last quarter', () => {
    expectVec(sunDirection(0.25), [1, 0, 0]);
    expectVec(sunDirection(0.75), [-1, 0, 0]);
  });

  it('is always a unit vector', () => {
    for (let p = 0; p < 1; p += 0.01) {
      expect(Math.hypot(...sunDirection(p))).toBeCloseTo(1, 10);
    }
  });
});

describe('findPhase', () => {
  it('finds the next new and full moon', () => {
    near(findPhase(new Date('2025-11-01T00:00Z'), 0), '2025-11-20T06:47Z');
    near(findPhase(new Date('2026-02-20T00:00Z'), 0.5), '2026-03-03T11:38Z');
  });

  it('finds the previous one when searching backwards', () => {
    near(findPhase(new Date('2026-03-10T00:00Z'), 0.5, -1), '2026-03-03T11:38Z');
    near(findPhase(new Date('2026-03-01T00:00Z'), 0, -1), '2026-02-17T12:01Z');
  });

  it('skips to the following cycle when starting exactly on the target', () => {
    const full = findPhase(new Date('2026-02-20T00:00Z'), 0.5);
    const next = findPhase(full, 0.5);
    const days = (next.getTime() - full.getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(30);
  });

  it('lands exactly on the target phase', () => {
    for (const target of [0, 0.25, 0.5, 0.75]) {
      const t = findPhase(new Date('2026-06-01T00:00Z'), target);
      expect(cycleDistance(getMoonData(toJulianDate(t)).phase, target)).toBeLessThan(1e-6);
    }
  });
});

describe('lunarCycle', () => {
  it('brackets the date between consecutive new moons', () => {
    const date = new Date('2025-12-04T23:14Z');
    const { start, end } = lunarCycle(date);
    near(start, '2025-11-20T06:47Z');
    expect(start.getTime()).toBeLessThan(date.getTime());
    expect(end.getTime()).toBeGreaterThan(date.getTime());
    const days = (end.getTime() - start.getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(29.2);
    expect(days).toBeLessThan(29.9);
  });
});

describe('date helpers', () => {
  it('formats the local day and steps by calendar days', () => {
    const d = new Date(2026, 0, 31, 12);
    expect(toDateInputValue(d)).toBe('2026-01-31');
    expect(toDateInputValue(addDays(d, 1))).toBe('2026-02-01');
    expect(addDays(d, -1).getHours()).toBe(12);
    expect(isSameLocalDay(d, new Date(2026, 0, 31, 23, 59))).toBe(true);
  });
});
