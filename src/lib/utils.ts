const MS_PER_DAY = 86_400_000;
/** Julian Date of the Unix epoch, 1970-01-01T00:00:00Z. */
const JD_UNIX_EPOCH = 2_440_587.5;

/**
 * Julian Date for an instant. `Date#getTime()` is already UTC milliseconds,
 * so no timezone correction is needed, and the time of day is kept.
 */
export const toJulianDate = (date: Date): number =>
  date.getTime() / MS_PER_DAY + JD_UNIX_EPOCH;

/** Local noon on a `YYYY-MM-DD` date (the value of an `<input type="date">`). */
export const parseLocalDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  return new Date(y, m - 1, d, 12);
};
