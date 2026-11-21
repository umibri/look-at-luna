/**
 * Tiny localStorage wrapper for per-viewer preferences. Storage can be
 * missing or throw (private windows, blocked site data), so every access is
 * guarded and falls back to the default.
 */
export function load<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    return isValid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not being able to remember a preference is fine.
  }
}
