"use node";

import { internalAction, action, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Avoid Node types dependency in TS
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const process: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;

// Internal: Generate Spotify playlist for a session
export const generateSessionPlaylist = internalAction({
  args: { sessionId: v.id("vsSessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const session = await ctx.runQuery(
        internal.spotify.getSessionForPlaylist,
        {
          sessionId: args.sessionId,
        },
      );
      if (!session) return null;

      const accessToken = await getValidSpotifyToken(ctx);
      if (!accessToken) return null;

      const playlistResult = await createSpotifyPlaylist(
        accessToken,
        `${session.battleName} - Session ${session.sessionNumber}`,
        `Music battle playlist for "${session.vibe}" - Created by Vsvs app`,
      );
      if (
        !playlistResult.success ||
        !playlistResult.playlistId ||
        !playlistResult.playlistUrl
      )
        return null;

      const trackUris = session.submissions
        .sort((a, b) => b.starsReceived - a.starsReceived)
        .map((sub) => spotifyUrlToUri(sub.spotifyUrl))
        .filter((uri: string | null): uri is string => !!uri);

      if (trackUris.length > 0) {
        await addTracksToPlaylist(
          accessToken,
          playlistResult.playlistId,
          trackUris,
        );
      }

      await ctx.runMutation(internal.spotify.updateSessionPlaylist, {
        sessionId: args.sessionId,
        playlistUrl: playlistResult.playlistUrl,
        spotifyPlaylistId: playlistResult.playlistId,
      });
    } catch (err) {
      console.error("generateSessionPlaylist error", err);
    }
    return null;
  },
});

// Public action to generate now and return URL immediately
export const generatePlaylistNow = action({
  args: { userId: v.id("profile"), sessionId: v.id("vsSessions") },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    playlistUrl: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(internal.spotify.getSessionForPlaylist, {
      sessionId: args.sessionId,
    });
    if (!session) return { success: false, message: "Session not found" };
    if (session.battleCreatorId !== args.userId) {
      return {
        success: false,
        message: "Only the battle creator can generate the playlist",
      };
    }
    const accessToken = await getValidSpotifyToken(ctx);
    if (!accessToken)
      return { success: false, message: "Spotify token unavailable" };
    const playlistResult = await createSpotifyPlaylist(
      accessToken,
      `${session.battleName} - Session ${session.sessionNumber}`,
      `Music battle playlist for "${session.vibe}" - Created by Vsvs app`,
    );
    if (
      !playlistResult.success ||
      !playlistResult.playlistId ||
      !playlistResult.playlistUrl
    ) {
      return { success: false, message: "Failed to create playlist" };
    }
    const trackUris = session.submissions
      .sort((a, b) => b.starsReceived - a.starsReceived)
      .map((sub) => spotifyUrlToUri(sub.spotifyUrl))
      .filter((uri: string | null): uri is string => !!uri);
    if (trackUris.length > 0) {
      await addTracksToPlaylist(
        accessToken,
        playlistResult.playlistId,
        trackUris,
      );
    }
    await ctx.runMutation(internal.spotify.updateSessionPlaylist, {
      sessionId: args.sessionId,
      playlistUrl: playlistResult.playlistUrl,
      spotifyPlaylistId: playlistResult.playlistId,
    });
    return {
      success: true,
      message: "Playlist created",
      playlistUrl: playlistResult.playlistUrl,
    };
  },
});

// Internal: Fetch track metadata (optional cache)
export const fetchTrackMetadata = internalAction({
  args: { spotifyUrl: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      trackId: v.string(),
      name: v.string(),
      artists: v.array(v.string()),
      album: v.string(),
      imageUrl: v.optional(v.string()),
      previewUrl: v.optional(v.string()),
      durationMs: v.number(),
    }),
  ),
  handler: async (
    ctx,
    args,
  ): Promise<null | {
    trackId: string;
    name: string;
    artists: string[];
    album: string;
    imageUrl?: string;
    previewUrl?: string;
    durationMs: number;
  }> => {
    const trackId = extractTrackId(args.spotifyUrl);
    if (!trackId) return null;
    // Check cache
    const cached = await ctx.runQuery(internal.spotify.getCachedTrack, {
      trackId,
    });
    if (cached) return cached;
    const token = await getValidSpotifyToken(ctx);
    if (!token) return null;
    try {
      const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const t = await res.json();
      const meta = {
        trackId,
        name: t.name,
        artists: (t.artists || []).map((a: { name: string }) => a.name),
        album: t.album?.name ?? "",
        imageUrl: t.album?.images?.[0]?.url,
        previewUrl: t.preview_url ?? undefined,
        durationMs: t.duration_ms ?? 0,
      };
      await ctx.runMutation(internal.spotify.cacheTrack, { ...meta });
      return meta;
    } catch (e) {
      console.error("fetchTrackMetadata error", e);
      return null;
    }
  },
});

// Helpers
async function getValidSpotifyToken(ctx: ActionCtx): Promise<string | null> {
  let auth = await ctx.runQuery(internal.spotify.getSpotifyAuth, {});
  // Fallback: seed from Convex env vars if missing
  if (!auth) {
    const envAccess = process?.env?.SPOTIFY_ACCESS_TOKEN as string | undefined;
    const envRefresh = process?.env?.SPOTIFY_REFRESH_TOKEN as
      | string
      | undefined;
    if (envRefresh) {
      try {
        const refreshed = await refreshSpotifyToken(envRefresh);
        if (
          refreshed?.success &&
          refreshed.accessToken &&
          refreshed.expiresAt
        ) {
          await ctx.runMutation(internal.spotify.storeSpotifyAuth, {
            accessToken: refreshed.accessToken,
            refreshToken: envRefresh,
            expiresAt: refreshed.expiresAt,
          });
          auth = {
            accessToken: refreshed.accessToken,
            refreshToken: envRefresh,
            expiresAt: refreshed.expiresAt,
          };
        }
      } catch (e) {
        console.error("Failed to refresh using env refresh token", e);
      }
    } else if (envAccess) {
      const fallbackExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
      await ctx.runMutation(internal.spotify.storeSpotifyAuth, {
        accessToken: envAccess,
        refreshToken: envRefresh ?? "",
        expiresAt: fallbackExpiry,
      });
      auth = {
        accessToken: envAccess,
        refreshToken: envRefresh ?? "",
        expiresAt: fallbackExpiry,
      };
    }
  }
  if (!auth) return null;
  const now = Date.now();
  const buffer = 5 * 60 * 1000;
  if (auth.expiresAt > now + buffer) return auth.accessToken;
  try {
    const refreshed = await refreshSpotifyToken(auth.refreshToken);
    if (refreshed?.success && refreshed.accessToken && refreshed.expiresAt) {
      await ctx.runMutation(internal.spotify.updateSpotifyAuth, {
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt,
      });
      return refreshed.accessToken;
    }
  } catch (e) {
    console.error("getValidSpotifyToken refresh error", e);
  }
  return null;
}

async function createSpotifyPlaylist(
  accessToken: string,
  name: string,
  description: string,
) {
  try {
    // Create under the authorized account
    const res = await fetch(`https://api.spotify.com/v1/me/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description,
        public: true,
        collaborative: false,
      }),
    });
    if (!res.ok)
      return { success: false, error: `Spotify error ${res.status}` } as const;
    const json = await res.json();
    return {
      success: true,
      playlistId: json.id as string,
      playlistUrl: json.external_urls.spotify as string,
    } as const;
  } catch (e) {
    return { success: false, error: String(e) } as const;
  }
}

async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[],
) {
  try {
    for (let i = 0; i < trackUris.length; i += 100) {
      const chunk = trackUris.slice(i, i + 100);
      const res = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uris: chunk }),
        },
      );
      if (!res.ok) console.warn("Failed to add tracks chunk", res.status);
    }
    return { success: true } as const;
  } catch (e) {
    console.error("addTracksToPlaylist error", e);
    return { success: false } as const;
  }
}

async function refreshSpotifyToken(refreshToken: string) {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Spotify credentials not configured");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json();
  return {
    success: true,
    accessToken: data.access_token as string,
    expiresAt: Date.now() + data.expires_in * 1000,
  } as const;
}

function spotifyUrlToUri(url: string): string | null {
  const m = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (m) return `spotify:track:${m[1]}`;
  if (url.startsWith("spotify:track:")) return url;
  return null;
}

function extractTrackId(url: string): string | null {
  const m = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}
