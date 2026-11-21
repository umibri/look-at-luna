import { describe, expect, it } from 'vitest';
import { coarsen, hemisphereOf, moonRiseSet, type Location } from '@lib/observer';

const greenwich: Location = {
  latitude: 51.48,
  longitude: 0,
  timeZone: 'Europe/London',
  label: 'Greenwich',
  source: 'city',
};

describe('moonRiseSet', () => {
  it('has the full moon rising near sunset and setting near sunrise', async () => {
    // Full moon 2026-03-03 11:38 UTC; London is on GMT (UTC+0) in March.
    const { rise, set } = await moonRiseSet('2026-03-03', greenwich);

    expect(rise!.toISOString()).toMatch(/^2026-03-03T1[6-9]/);
    expect(set!.toISOString()).toMatch(/^2026-03-03T0[5-8]/);
  });

  it("uses the location's own calendar day, not the machine's", async () => {
    // Tokyo is UTC+9: its 2026-03-03 runs from 2026-03-02T15:00Z to 2026-03-03T15:00Z.
    const tokyo: Location = { latitude: 35.69, longitude: 139.69, timeZone: 'Asia/Tokyo', label: 'Tokyo', source: 'city' };
    const { rise, set } = await moonRiseSet('2026-03-03', tokyo);
    for (const t of [rise, set]) {
      expect(t).not.toBeNull();
      expect(t!.getTime()).toBeGreaterThanOrEqual(Date.parse('2026-03-02T15:00:00Z'));
      expect(t!.getTime()).toBeLessThan(Date.parse('2026-03-03T15:00:00Z'));
    }
  });
});

describe('coarsen', () => {
  it('rounds to a tenth of a degree and keeps other fields', () => {
    const rounded = coarsen({ ...greenwich, latitude: 40.71284, longitude: -74.00602 });
    expect(rounded).toEqual({ ...greenwich, latitude: 40.7, longitude: -74 });
  });
});

describe('hemisphereOf', () => {
  it('splits at the equator', () => {
    expect(hemisphereOf({ latitude: -33.9, longitude: 151.2 })).toBe('south');
    expect(hemisphereOf({ latitude: 0, longitude: 0 })).toBe('north');
  });
});
