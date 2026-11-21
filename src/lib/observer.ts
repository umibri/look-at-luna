/** A place on Earth, in degrees (north and east positive). */
export interface Location {
  latitude: number;
  longitude: number;
}

export interface RiseSet {
  /** Null when the moon doesn't rise (or set) on this local day. */
  rise: Date | null;
  set: Date | null;
}

/**
 * Moonrise and moonset on the local calendar day containing `date`.
 *
 * Rise/set needs topocentric positions, parallax and refraction, so this uses
 * astronomy-engine rather than the app's own phase math. It's loaded on
 * demand: the code only downloads once someone shares a location.
 */
export async function moonRiseSet(date: Date, where: Location): Promise<RiseSet> {
  const { Body, Observer, SearchRiseSet } = await import('astronomy-engine');
  const observer = new Observer(where.latitude, where.longitude, 0);
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const find = (direction: 1 | -1) =>
    SearchRiseSet(Body.Moon, observer, direction, dayStart, 1)?.date ?? null;

  return { rise: find(1), set: find(-1) };
}

/**
 * Round to 0.1° (about 11 km). Plenty for rise/set times (a few seconds'
 * difference) and it keeps a precise location out of storage.
 */
export const coarsen = ({ latitude, longitude }: Location): Location => ({
  latitude: Math.round(latitude * 10) / 10,
  longitude: Math.round(longitude * 10) / 10,
});
