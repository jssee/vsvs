/**
 * Spotify URL validation and normalization utilities
 */

import { z } from "zod";

interface SpotifyUrlValidation {
  isValid: boolean;
  trackId?: string;
  error?: string;
}

// Base62 Spotify track ID (exactly 22 chars)
const TrackIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9]{22}$/u, "Invalid Spotify track ID format");

// Extract track id from various Spotify URL formats
function extractTrackIdFromString(input: string): string | null {
  // Format 1: https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh
  const webMatch = input.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (webMatch) return webMatch[1];

  // Format 2: https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh?si=...
  const webWithParamsMatch = input.match(
    /spotify\.com\/track\/([a-zA-Z0-9]+)\?/,
  );
  if (webWithParamsMatch) return webWithParamsMatch[1];

  // Format 3: spotify:track:4iV5W9uYEdYUVa79Axb7Rh
  const uriMatch = input.match(/spotify:track:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];

  return null;
}

// Zod pipeline that validates a Spotify URL and outputs the track ID
const SpotifyTrackIdFromUrl = z
  .string()
  .trim()
  .min(1, { message: "URL is required" })
  .refine((s) => s.includes("spotify.com") || s.startsWith("spotify:"), {
    message: "Must be a Spotify URL",
  })
  .transform((s) => extractTrackIdFromString(s) ?? "")
  .pipe(TrackIdSchema); // Ensures valid base62 22-char ID

/**
 * Validate if URL is a valid Spotify track URL
 */
export function validateSpotifyUrl(url: string): SpotifyUrlValidation {
  const result = SpotifyTrackIdFromUrl.safeParse(url);

  if (!result.success) {
    // Preserve existing error messages
    const message =
      result.error.issues[0]?.message ?? "Invalid Spotify track URL format";
    // Map Zod messages to legacy ones when applicable
    const normalizedMessage =
      message === "Invalid input"
        ? "Invalid Spotify track URL format"
        : message;
    return { isValid: false, error: normalizedMessage };
  }

  return { isValid: true, trackId: result.data };
}

/**
 * Normalize Spotify URL to consistent format
 */
export function normalizeSpotifyUrl(url: string): string {
  try {
    const trackId = SpotifyTrackIdFromUrl.parse(url);
    return `https://open.spotify.com/track/${trackId}`;
  } catch {
    throw new Error("Cannot normalize invalid Spotify URL");
  }
}

/**
 * Extract track ID from Spotify URL
 */
export function extractSpotifyTrackId(url: string): string | null {
  const result = SpotifyTrackIdFromUrl.safeParse(url);
  return result.success ? result.data : null;
}
