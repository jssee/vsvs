import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Public mutation to manually trigger playlist generation (creator-only)
export const requestGenerateSessionPlaylist = mutation({
  args: { userId: v.id("user"), sessionId: v.id("vsSessions") },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return { success: false, message: "Session not found" };
    const battle = await ctx.db.get(session.battleId);
    if (!battle) return { success: false, message: "Battle not found" };
    if (battle.creatorId !== args.userId) {
      return {
        success: false,
        message: "Only the battle creator can generate the playlist",
      };
    }
    await ctx.scheduler.runAfter(
      0,
      internal.spotify_actions.generateSessionPlaylist,
      {
        sessionId: args.sessionId,
      },
    );
    return { success: true, message: "Playlist generation triggered" };
  },
});

// Internal: Query minimal session data
export const getSessionForPlaylist = internalQuery({
  args: { sessionId: v.id("vsSessions") },
  returns: v.union(
    v.null(),
    v.object({
      sessionNumber: v.number(),
      vibe: v.string(),
      battleName: v.string(),
      battleCreatorId: v.id("user"),
      submissions: v.array(
        v.object({
          spotifyUrl: v.string(),
          starsReceived: v.number(),
          username: v.string(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    const battle = await ctx.db.get(session.battleId);
    if (!battle) return null;
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    const withUsers = await Promise.all(
      submissions.map(async (s) => {
        const u = await ctx.db.get(s.userId);
        return {
          spotifyUrl: s.spotifyUrl,
          starsReceived: s.starsReceived,
          username: u?.username || "Unknown User",
        };
      }),
    );
    return {
      sessionNumber: session.sessionNumber,
      vibe: session.vibe,
      battleName: battle.name,
      battleCreatorId: battle.creatorId,
      submissions: withUsers,
    };
  },
});

// Internal: Patch session with playlist data
export const updateSessionPlaylist = internalMutation({
  args: {
    sessionId: v.id("vsSessions"),
    playlistUrl: v.string(),
    spotifyPlaylistId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      playlistUrl: args.playlistUrl,
      spotifyPlaylistId: args.spotifyPlaylistId,
    });
    return null;
  },
});

// Internal: Get stored app tokens
export const getSpotifyAuth = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      accessToken: v.string(),
      refreshToken: v.string(),
      expiresAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const auth = await ctx.db.query("spotifyAuth").first();
    if (!auth) return null;
    return {
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      expiresAt: auth.expiresAt,
    };
  },
});

// Internal: Store tokens initially
export const storeSpotifyAuth = internalMutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("spotifyAuth").first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("spotifyAuth", args);
    }
    return null;
  },
});

// Internal: Update access token
export const updateSpotifyAuth = internalMutation({
  args: { accessToken: v.string(), expiresAt: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("spotifyAuth").first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    }
    return null;
  },
});

export const getCachedTrack = internalQuery({
  args: { trackId: v.string() },
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
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("trackMetadata")
      .withIndex("by_trackId", (q) => q.eq("trackId", args.trackId))
      .first();
    if (!row) return null;
    return {
      trackId: row.trackId,
      name: row.name,
      artists: row.artists,
      album: row.album,
      imageUrl: row.imageUrl,
      previewUrl: row.previewUrl,
      durationMs: row.durationMs,
    };
  },
});

export const cacheTrack = internalMutation({
  args: {
    trackId: v.string(),
    name: v.string(),
    artists: v.array(v.string()),
    album: v.string(),
    imageUrl: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    durationMs: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("trackMetadata")
      .withIndex("by_trackId", (q) => q.eq("trackId", args.trackId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, lastFetched: Date.now() });
    } else {
      await ctx.db.insert("trackMetadata", {
        ...args,
        lastFetched: Date.now(),
      });
    }
    return null;
  },
});
