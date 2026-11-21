import { describe, expect, it } from 'vitest';
import { getMoonData } from '@lib/moon';

// Exact Julian Date for a UTC instant. (src/lib/utils.ts#getJD truncates the
// time of day; that bug is fixed in phase 1, so the tests don't depend on it.)
const jd = (iso: string) => new Date(iso).getTime() / 86_400_000 + 2_440_587.5;

describe('getMoonData', () => {
  it('returns values in their expected ranges', () => {
    const m = getMoonData(jd('2026-01-01T00:00:00Z'));
    expect(m.phase).toBeGreaterThanOrEqual(0);
    expect(m.phase).toBeLessThan(1);
    expect(m.illuminated).toBeGreaterThanOrEqual(0);
    expect(m.illuminated).toBeLessThanOrEqual(1);
    expect(m.distance).toBeGreaterThan(356_000);
    expect(m.distance).toBeLessThan(407_000);
  });

  it('is near phase 0 at the 2025-11-20 new moon', () => {
    const m = getMoonData(jd('2025-11-20T06:47:00Z'));
    const fromNew = Math.min(m.phase, 1 - m.phase);
    expect(fromNew).toBeLessThan(0.01);
    expect(m.illuminated).toBeLessThan(0.01);
  });

  it('is near phase 0.5 at the 2025-12-04 full moon', () => {
    const m = getMoonData(jd('2025-12-04T23:14:00Z'));
    expect(Math.abs(m.phase - 0.5)).toBeLessThan(0.01);
    expect(m.illuminated).toBeGreaterThan(0.99);
  });
});
