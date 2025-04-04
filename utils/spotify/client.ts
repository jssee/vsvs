"use server";

import { cookies } from "next/headers";

// Define required types
interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyPlaylist {
  id: string;
  external_urls: {
    spotify: string;
  };
  name: string;
  description: string;
}

/**
 * Get a Spotify API access token using client credentials flow
 */
async function getSpotifyToken(): Promise<string> {
  const clientId = process.env.NEXT_PRIVATE_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.NEXT_PRIVATE_SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify API credentials");
  }

  console.log("Spotify client ID length:", clientId.length);
  console.log("Spotify client secret length:", clientSecret.length);

  try {
    // Base64 encode the client ID and secret
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64",
    );

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Spotify token error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `Failed to get Spotify token: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as SpotifyTokenResponse;
    return data.access_token;
  } catch (error) {
    console.error("Error in getSpotifyToken:", error);
    throw error;
  }
}

/**
 * Create a new Spotify playlist
 * 
 * IMPORTANT SPOTIFY API LIMITATION:
 * According to Spotify's API documentation, creating playlists and adding tracks 
 * requires the use of Authorization Code Flow or Authorization Code with PKCE flow,
 * not the Client Credentials flow we're using. These operations need specific scopes:
 * - playlist-modify-public: For creating public playlists
 * - playlist-modify-private: For creating private playlists
 * 
 * Client Credentials flow cannot access user-specific resources or perform 
 * user-specific actions like playlist creation.
 * 
 * This implementation provides a demonstration of what would be needed for a 
 * full implementation, but for actual production use, you would need to:
 * 1. Implement Authorization Code flow with proper user login
 * 2. Request appropriate scopes when user authenticates
 * 3. Use the user's access token instead of client credentials token
 */
export async function createSpotifyPlaylist(
  name: string,
  description: string,
  trackIds: string[],
): Promise<SpotifyPlaylist> {
  try {
    // For demonstration purposes only - real implementation would require user authorization
    if (
      process.env.NODE_ENV === "production" &&
      process.env.NEXT_PRIVATE_SPOTIFY_CLIENT_ID &&
      process.env.NEXT_PRIVATE_SPOTIFY_CLIENT_SECRET &&
      false // Always use demo mode since client credentials can't create playlists
    ) {
      const token = await getSpotifyToken();

      // NOTE: This code would work if using Authorization Code flow with proper scopes
      // but will not work with Client Credentials flow which lacks user context
      // The following is shown for educational purposes only
      const spotifyUserId =
        process.env.NEXT_PRIVATE_SPOTIFY_USER_ID || "spotify";

      // Create the playlist
      const createResponse = await fetch(
        `https://api.spotify.com/v1/users/${spotifyUserId}/playlists`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            description,
            public: true,
          }),
          cache: "no-store",
        },
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("Failed to create playlist:", {
          status: createResponse.status,
          statusText: createResponse.statusText,
          error: errorText,
        });
        throw new Error(
          `Failed to create playlist: ${createResponse.status} ${errorText}`,
        );
      }

      const playlist = (await createResponse.json()) as SpotifyPlaylist;

      // Clean track IDs (make sure they're just IDs, not full URLs)
      const cleanTrackIds = trackIds.map((id) => {
        if (id.includes("spotify.com/track/")) {
          return id.split("track/")[1].split("?")[0];
        }
        return id;
      });

      // Format track URIs
      const trackUris = cleanTrackIds.map((id) => `spotify:track:${id}`);

      // Add tracks to the playlist
      if (trackUris.length > 0) {
        const addTracksResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uris: trackUris,
            }),
            cache: "no-store",
          },
        );

        if (!addTracksResponse.ok) {
          console.error(
            "Failed to add tracks to playlist:",
            await addTracksResponse.text(),
          );
        }
      }

      return playlist;
    }
    // Fallback: Provide a demo playlist URL for development or when credentials are invalid
    else {
      console.log(
        "Using demo playlist creation - Client Credentials flow cannot create playlists",
      );

      // Clean track IDs
      const cleanTrackIds = trackIds.map((id) => {
        if (id.includes("spotify.com/track/")) {
          return id.split("track/")[1].split("?")[0];
        }
        return id;
      });

      // Create a demo playlist object
      // In a real implementation, this would be returned from the Spotify API
      const demoPlaylistId =
        "demo" + Math.random().toString(36).substring(2, 10);

      // Construct a demo playlist URL with the track IDs
      const trackList = cleanTrackIds.join(",");
      const demoPlaylistUrl = `https://open.spotify.com/demo-playlist/${demoPlaylistId}?tracks=${trackList}`;

      // Return a mock playlist object
      return {
        id: demoPlaylistId,
        name: name,
        description: description,
        external_urls: {
          spotify: demoPlaylistUrl,
        },
      };
    }
  } catch (error) {
    console.error("Error creating Spotify playlist:", error);

    // Fallback to demo playlist if API fails
    const demoPlaylistId = "demo" + Math.random().toString(36).substring(2, 10);
    const trackList = trackIds.join(",");
    const demoPlaylistUrl = `https://open.spotify.com/demo-playlist/${demoPlaylistId}?tracks=${trackList}`;

    console.log("Created fallback demo playlist URL:", demoPlaylistUrl);

    return {
      id: demoPlaylistId,
      name: name,
      description: description,
      external_urls: {
        spotify: demoPlaylistUrl,
      },
    };
  }
}

/**
 * Extract track ID from Spotify URL or track ID string
 */
export async function extractSpotifyTrackId(
  trackIdOrUrl: string,
): Promise<string> {
  if (!trackIdOrUrl) return "";

  // If it's already just an ID
  if (/^[a-zA-Z0-9]{22}$/.test(trackIdOrUrl)) return trackIdOrUrl;

  // Try to extract from URL
  const match = trackIdOrUrl.match(/track\/([a-zA-Z0-9]{22})/);
  return match ? match[1] : trackIdOrUrl;
}

