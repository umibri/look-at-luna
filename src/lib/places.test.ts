import { beforeAll, describe, expect, it } from 'vitest';
import { loadPlaces, nearestPlace, placeForTimeZone, placeLabel, searchPlaces, type Place } from '@lib/places';
import { startOfDayIn, timeZoneOffsetMs } from '@lib/timezone';

let places: Place[];
beforeAll(async () => {
  places = await loadPlaces();
});

describe('city data', () => {
  it('has a city for every time zone it lists and is ordered by population', () => {
    expect(places.length).toBeGreaterThan(1000);
    expect(placeForTimeZone(places, 'America/New_York')?.name).toBe('New York City');
    expect(placeForTimeZone(places, 'Europe/London')?.name).toBe('London');
    expect(placeForTimeZone(places, 'Australia/Sydney')?.name).toBe('Sydney');
    expect(placeForTimeZone(places, 'Not/AZone')).toBeNull();
  });
});

describe('searchPlaces', () => {
  const names = (q: string) => searchPlaces(places, q).map((p) => p.name);

  it('ignores case and accents', () => {
    expect(names('sao paulo')[0]).toBe('São Paulo');
    expect(names('TOKYO')[0]).toBe('Tokyo');
  });

  it('prefers names that start with the query, biggest first', () => {
    const results = names('san');
    expect(results.length).toBeGreaterThan(3);
    expect(results.every((n) => /^san/i.test(n.normalize('NFD')))).toBe(true);
  });

  it('matches later words of a name', () => {
    expect(names('york')).toContain('New York City');
  });

  it('returns nothing for an empty query', () => {
    expect(searchPlaces(places, '   ')).toEqual([]);
  });
});

describe('placeLabel', () => {
  it('adds the region when it differs from the city', () => {
    expect(placeLabel({ name: 'Portland', region: 'Oregon', country: 'US' })).toBe('Portland, Oregon, United States');
    expect(placeLabel({ name: 'Tokyo', region: 'Tokyo', country: 'JP' })).toBe('Tokyo, Japan');
  });
});

describe('nearestPlace', () => {
  it('finds the closest listed city', () => {
    expect(nearestPlace(places, { latitude: 51.48, longitude: 0 })?.name).toBe('London');
  });
});

describe('time zones', () => {
  it('computes offsets, including daylight saving time', () => {
    expect(timeZoneOffsetMs(new Date('2026-01-15T12:00Z'), 'America/New_York')).toBe(-5 * 3_600_000);
    expect(timeZoneOffsetMs(new Date('2026-07-15T12:00Z'), 'America/New_York')).toBe(-4 * 3_600_000);
    expect(timeZoneOffsetMs(new Date('2026-07-15T12:00Z'), 'Asia/Kolkata')).toBe(5.5 * 3_600_000);
  });

  it('finds local midnight in another zone', () => {
    expect(startOfDayIn(2026, 3, 3, 'Asia/Tokyo').toISOString()).toBe('2026-03-02T15:00:00.000Z');
    expect(startOfDayIn(2026, 7, 4, 'America/Los_Angeles').toISOString()).toBe('2026-07-04T07:00:00.000Z');
    // Day after the US spring-forward change (2026-03-08).
    expect(startOfDayIn(2026, 3, 9, 'America/New_York').toISOString()).toBe('2026-03-09T04:00:00.000Z');
  });
});
