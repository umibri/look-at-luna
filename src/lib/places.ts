/**
 * Cities for the location picker: about 1,200 of the world's most populous
 * cities plus the largest city in every time zone (GeoNames, CC BY 4.0; see
 * scripts/build-cities.mjs). Loaded on demand so it isn't in the main bundle.
 */

export interface Place {
  name: string;
  /** State, province or similar; may be empty. */
  region: string;
  /** ISO 3166-1 alpha-2 country code. */
  country: string;
  latitude: number;
  longitude: number;
  /** IANA time zone, e.g. "America/New_York". */
  timeZone: string;
  /** Lowercased, accent-free text used for matching. */
  search: string;
}

type Row = [name: string, ascii: string | 0, region: string, country: string, lat: number, lon: number, zone: number];

let cache: Promise<Place[]> | null = null;

/** All places, most populous first. */
export function loadPlaces(): Promise<Place[]> {
  cache ??= import('../data/cities.json').then(({ default: data }) =>
    (data.cities as Row[]).map(([name, ascii, region, country, latitude, longitude, zone]) => ({
      name,
      region,
      country,
      latitude,
      longitude,
      timeZone: data.zones[zone],
      search: normalize(`${ascii || name} ${name}`),
    })),
  );
  return cache;
}

/** Lowercase and strip accents, so "sao" matches "São Paulo". */
export const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

let regionNames: Intl.DisplayNames | null = null;
export function countryName(code: string): string {
  try {
    regionNames ??= new Intl.DisplayNames(undefined, { type: 'region' });
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

/** "Portland, Oregon, United States" / "Tokyo, Japan". */
export function placeLabel(place: Pick<Place, 'name' | 'region' | 'country'>): string {
  const parts = [place.name];
  if (place.region && normalize(place.region) !== normalize(place.name)) parts.push(place.region);
  parts.push(countryName(place.country));
  return parts.join(', ');
}

/**
 * Places matching a query, best first: whole-name matches, then names that
 * start with the query, then any word of the name that does. Ties keep
 * population order, so "san" puts the big San's first.
 */
export function searchPlaces(places: Place[], query: string, limit = 8): Place[] {
  const q = normalize(query);
  if (!q) return [];

  const scored: { place: Place; score: number; rank: number }[] = [];
  places.forEach((place, rank) => {
    const words = place.search.split(/[\s\-']+/);
    let score = -1;
    if (words.join(' ') === q || normalize(place.name) === q) score = 0;
    else if (place.search.startsWith(q)) score = 1;
    else if (words.some((w) => w.startsWith(q)) || place.search.includes(` ${q}`)) score = 2;
    else if (normalize(place.region).startsWith(q) || normalize(countryName(place.country)).startsWith(q)) score = 3;
    if (score >= 0) scored.push({ place, score, rank });
  });

  return scored
    .sort((a, b) => a.score - b.score || a.rank - b.rank)
    .slice(0, limit)
    .map((s) => s.place);
}

/** The most populous listed city in a time zone, if any. */
export function placeForTimeZone(places: Place[], timeZone: string): Place | null {
  return places.find((p) => p.timeZone === timeZone) ?? null;
}

/** Great-circle distance in km. */
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** The listed city closest to a point. */
export function nearestPlace(places: Place[], point: { latitude: number; longitude: number }): Place | null {
  let best: Place | null = null;
  let bestKm = Infinity;
  for (const place of places) {
    const km = distanceKm(point, place);
    if (km < bestKm) {
      bestKm = km;
      best = place;
    }
  }
  return best;
}
