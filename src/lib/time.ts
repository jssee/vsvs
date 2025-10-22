/**
 * Formats a duration in milliseconds to a human-readable string.
 * Examples: "2h 30m", "1d 5h 20m", "45m", "0m"
 *
 * @param milliseconds - The duration in milliseconds
 * @returns A human-readable duration string
 */
export function formatDuration(milliseconds: number): string {
  // Handle negative or zero values
  if (milliseconds <= 0) {
    return "0m";
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (remainingHours > 0) {
    parts.push(`${remainingHours}h`);
  }
  if (remainingMinutes > 0 || parts.length === 0) {
    parts.push(`${remainingMinutes}m`);
  }

  return parts.join(" ");
}

/**
 * Convert a HTML datetime-local value and a timezone offset to UTC epoch ms.
 *
 * - `local` should be in the form `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss`.
 * - `tzOffsetMinutes` is the value from `Date#getTimezoneOffset()` for the user's locale
 *   at the time the local datetime was chosen. It represents minutes to add to local time
 *   to obtain UTC.
 *
 * Returns NaN for invalid input.
 */
export function parseLocalDateTimeToUtcMs(
  local: string,
  tzOffsetMinutes: number,
): number {
  const match = local.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match || !Number.isFinite(tzOffsetMinutes)) return NaN;
  const [_, y, m, d, hh, mm, ss] = match;

  const utcNaive = Date.UTC(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(hh),
    Number(mm),
    ss ? Number(ss) : 0,
  );
  return utcNaive + tzOffsetMinutes * 60_000;
}
