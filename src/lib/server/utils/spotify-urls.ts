/**
 * Spotify URL validation and normalization utilities
 */

interface SpotifyUrlValidation {
  isValid: boolean;
  trackId?: string;
  error?: string;
}

/**
 * Validate if URL is a valid Spotify track URL
 */
export function validateSpotifyUrl(url: string): SpotifyUrlValidation {
  if (!url || typeof url !== "string") {
    return { isValid: false, error: "URL is required" };
  }

  const cleanUrl = url.trim();

  // Check if it's a Spotify URL
  if (!cleanUrl.includes("spotify.com") && !cleanUrl.startsWith("spotify:")) {
    return { isValid: false, error: "Must be a Spotify URL" };
  }

  // Extract track ID from different URL formats
  let trackId: string | null = null;

  // Format 1: https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh
  const webMatch = cleanUrl.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (webMatch) {
    trackId = webMatch[1];
  }

  // Format 2: https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh?si=...
  if (!trackId) {
    const webWithParamsMatch = cleanUrl.match(
      /spotify\.com\/track\/([a-zA-Z0-9]+)\?/
    );
    if (webWithParamsMatch) {
      trackId = webWithParamsMatch[1];
    }
  }

  // Format 3: spotify:track:4iV5W9uYEdYUVa79Axb7Rh
  if (!trackId) {
    const uriMatch = cleanUrl.match(/spotify:track:([a-zA-Z0-9]+)/);
    if (uriMatch) {
      trackId = uriMatch[1];
    }
  }

  if (!trackId) {
    return { isValid: false, error: "Invalid Spotify track URL format" };
  }

  // Validate track ID format (Spotify track IDs are 22 characters, base62)
  if (trackId.length !== 22 || !/^[a-zA-Z0-9]+$/.test(trackId)) {
    return { isValid: false, error: "Invalid Spotify track ID format" };
  }

  return { isValid: true, trackId };
}

/**
 * Normalize Spotify URL to consistent format
 */
export function normalizeSpotifyUrl(url: string): string {
  const validation = validateSpotifyUrl(url);

  if (!validation.isValid || !validation.trackId) {
    throw new Error("Cannot normalize invalid Spotify URL");
  }

  // Return clean web URL format
  return `https://open.spotify.com/track/${validation.trackId}`;
}

/**
 * Extract track ID from Spotify URL
 */
export function extractSpotifyTrackId(url: string): string | null {
  const validation = validateSpotifyUrl(url);
  return validation.isValid ? validation.trackId! : null;
}

