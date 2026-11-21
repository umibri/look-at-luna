/** Time-zone helpers built on Intl (no tz database shipped with the app). */

/** The browser's IANA time zone, e.g. "America/New_York" (null if unknown). */
export function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds (east positive). */
export function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * The instant when the calendar day `year-month-day` begins in `timeZone`.
 * Two passes, so a DST change near midnight still lands on the right hour.
 */
export function startOfDayIn(year: number, month: number, day: number, timeZone: string): Date {
  const wall = Date.UTC(year, month - 1, day);
  let t = wall - timeZoneOffsetMs(new Date(wall), timeZone);
  t = wall - timeZoneOffsetMs(new Date(t), timeZone);
  return new Date(t);
}

/** "3:12 PM" in the given time zone. */
export function formatTimeIn(instant: Date, timeZone: string): string {
  return instant.toLocaleTimeString(undefined, { timeZone, hour: 'numeric', minute: '2-digit' });
}

/** "Thu 12:24 AM" in the given time zone. */
export function formatDayTimeIn(instant: Date, timeZone: string): string {
  return instant.toLocaleString(undefined, { timeZone, weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

/** Short zone name for an instant, e.g. "JST" or "GMT+9". */
export function zoneAbbreviation(instant: Date, timeZone: string): string {
  return (
    new Intl.DateTimeFormat(undefined, { timeZone, timeZoneName: 'short' })
      .formatToParts(instant)
      .find((p) => p.type === 'timeZoneName')?.value ?? timeZone
  );
}
