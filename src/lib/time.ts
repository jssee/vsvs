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
