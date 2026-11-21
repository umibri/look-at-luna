export const MS_PER_DAY = 86_400_000;
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

/** `YYYY-MM-DD` for the local calendar day of `date` (for `<input type="date">` and URLs). */
export const toDateInputValue = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** `date` moved by a number of calendar days, keeping the local time of day. */
export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const isSameLocalDay = (a: Date, b: Date): boolean =>
  toDateInputValue(a) === toDateInputValue(b);
