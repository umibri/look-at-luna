import { describe, expect, it } from 'vitest';
import { Libration } from 'astronomy-engine';
import { getLibration } from '@lib/libration';
import { toJulianDate } from '@lib/utils';

describe('getLibration', () => {
  it('matches astronomy-engine within 0.2°, 1950-2050', () => {
    let worst = 0;
    for (let t = Date.UTC(1950, 0, 1); t < Date.UTC(2050, 0, 1); t += 1.37 * 86_400_000) {
      const date = new Date(t);
      const ours = getLibration(toJulianDate(date));
      const ref = Libration(date);
      worst = Math.max(worst, Math.abs(ours.longitude - ref.elon), Math.abs(ours.latitude - ref.elat));
    }
    expect(worst).toBeLessThan(0.2);
  });

  it('stays within the physical limits of optical libration', () => {
    for (let t = Date.UTC(2020, 0, 1); t < Date.UTC(2030, 0, 1); t += 86_400_000) {
      const { longitude, latitude } = getLibration(toJulianDate(new Date(t)));
      expect(Math.abs(longitude)).toBeLessThan(8.3);
      expect(Math.abs(latitude)).toBeLessThan(7);
    }
  });
});
