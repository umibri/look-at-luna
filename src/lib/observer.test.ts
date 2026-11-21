import { describe, expect, it } from 'vitest';
import { coarsen, moonRiseSet } from '@lib/observer';

describe('moonRiseSet', () => {
  it('has the full moon rising near sunset and setting near sunrise', async () => {
    // Full moon 2026-03-03 11:38 UTC; at Greenwich the moon rises in the
    // evening and sets in the morning. (Uses UTC hours so the test doesn't
    // depend on the machine's time zone for the assertion.)
    const greenwich = { latitude: 51.48, longitude: 0 };
    const { rise, set } = await moonRiseSet(new Date('2026-03-03T12:00:00Z'), greenwich);

    expect(rise).not.toBeNull();
    expect(set).not.toBeNull();
    expect(rise!.getUTCHours()).toBeGreaterThanOrEqual(16);
    expect(rise!.getUTCHours()).toBeLessThanOrEqual(20);
    expect(set!.getUTCHours()).toBeGreaterThanOrEqual(5);
    expect(set!.getUTCHours()).toBeLessThanOrEqual(9);
  });
});

describe('coarsen', () => {
  it('rounds to a tenth of a degree', () => {
    expect(coarsen({ latitude: 40.71284, longitude: -74.00602 })).toEqual({ latitude: 40.7, longitude: -74 });
  });
});
