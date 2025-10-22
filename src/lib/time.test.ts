import { describe, it, expect } from "vitest";
import { parseLocalDateTimeToUtcMs } from "./time";

describe("parseLocalDateTimeToUtcMs", () => {
  it("parses without seconds at UTC offset 0", () => {
    const ms = parseLocalDateTimeToUtcMs("2025-01-01T12:30", 0);
    expect(ms).toBe(Date.UTC(2025, 0, 1, 12, 30, 0));
  });

  it("parses with seconds at UTC offset 0", () => {
    const ms = parseLocalDateTimeToUtcMs("2025-01-01T12:30:45", 0);
    expect(ms).toBe(Date.UTC(2025, 0, 1, 12, 30, 45));
  });

  it("applies a positive tz offset (e.g., PST 480)", () => {
    const ms = parseLocalDateTimeToUtcMs("2025-01-01T12:00", 480);
    expect(ms).toBe(Date.UTC(2025, 0, 1, 12, 0, 0) + 480 * 60_000);
  });

  it("returns NaN for invalid input", () => {
    const ms = parseLocalDateTimeToUtcMs("invalid", 0);
    expect(Number.isNaN(ms)).toBe(true);
  });
});

