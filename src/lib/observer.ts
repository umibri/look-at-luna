import { startOfDayIn } from '@lib/timezone';

/** A point on Earth, in degrees (north and east positive). */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Where the moon is being viewed from. */
export interface Location extends Coordinates {
  /** IANA time zone used for the local day and for displaying times. */
  timeZone: string;
  /** What to call it, e.g. "Portland, Oregon, United States". */
  label: string;
  /**
   * How it was chosen: picked from the city list, from the device's position,
   * or guessed from the browser's time zone (never stored).
   */
  source: 'city' | 'device' | 'timezone';
}

export interface RiseSet {
  /**
   * Null when the moon doesn't rise (or set) on this local day. That happens
   * about once a month: each event comes ~50 minutes later than the day
   * before, so eventually one slips past midnight and skips a date.
   */
  rise: Date | null;
  set: Date | null;
  /** When `rise` (or `set`) is null: the next one after this day ends. */
  nextRise: Date | null;
  nextSet: Date | null;
}

/**
 * Moonrise and moonset on calendar day `day` ("YYYY-MM-DD") at `where`,
 * where the day runs from local midnight to midnight in the location's own
 * time zone, not the browser's.
 *
 * Rise/set needs topocentric positions, parallax and refraction, so this uses
 * astronomy-engine rather than the app's own phase math. It's loaded on
 * demand, so it stays out of the main bundle.
 */
export async function moonRiseSet(day: string, where: Location): Promise<RiseSet> {
  const { Body, Observer, SearchRiseSet } = await import('astronomy-engine');
  const observer = new Observer(where.latitude, where.longitude, 0);
  const [y, m, d] = day.split('-').map(Number);
  const start = startOfDayIn(y, m, d, where.timeZone);
  const end = startOfDayIn(y, m, d + 1, where.timeZone);
  const limitDays = (end.getTime() - start.getTime()) / 86_400_000;

  const find = (direction: 1 | -1, from: Date, days: number) =>
    SearchRiseSet(Body.Moon, observer, direction, from, days)?.date ?? null;

  const rise = find(1, start, limitDays);
  const set = find(-1, start, limitDays);

  // A skipped event always happens within the next day, but near the poles
  // the moon can stay up (or down) for days, so look a little further.
  return {
    rise,
    set,
    nextRise: rise ? null : find(1, end, 3),
    nextSet: set ? null : find(-1, end, 3),
  };
}

/**
 * Round to 0.1° (about 11 km). Plenty for rise/set times (a few seconds'
 * difference) and it keeps a precise position out of storage.
 */
export const coarsen = <T extends Coordinates>(where: T): T => ({
  ...where,
  latitude: Math.round(where.latitude * 10) / 10,
  longitude: Math.round(where.longitude * 10) / 10,
});

export const hemisphereOf = (where: Coordinates): 'north' | 'south' =>
  where.latitude < 0 ? 'south' : 'north';
