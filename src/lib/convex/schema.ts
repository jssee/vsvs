import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Profile table - stores app-specific user data
  // Better Auth manages authentication (passwords, sessions, etc.) in the 'users' table
  // This table only stores app-specific profile data
  profile: defineTable({
    email: v.string(),
    username: v.string(), // Display name and handle for mentions
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"]),

  // Note: Session management is handled by Better Auth
  // No need for a custom session table

  friendship: defineTable({
    requesterId: v.id("profile"),
    recipientId: v.id("profile"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
    ),
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_requester", ["requesterId"])
    .index("by_recipient", ["recipientId"])
    .index("by_requester_and_recipient", ["requesterId", "recipientId"])
    .index("by_status", ["status"]),

  // Battles core schema
  battles: defineTable({
    name: v.string(),
    creatorId: v.id("profile"),
    status: v.union(v.literal("active"), v.literal("completed")),
    visibility: v.union(v.literal("public"), v.literal("private")),
    maxPlayers: v.number(),
    doubleSubmissions: v.boolean(),
    inviteCode: v.string(),
    currentSessionId: v.optional(v.id("vsSessions")),
    createdAt: v.number(),
  })
    .index("by_creatorId", ["creatorId"])
    .index("by_inviteCode", ["inviteCode"])
    .index("by_status", ["status"])
    .index("by_visibility_and_status", ["visibility", "status"]),

  vsSessions: defineTable({
    battleId: v.id("battles"),
    sessionNumber: v.number(),
    vibe: v.string(),
    description: v.optional(v.string()),
    submissionDeadline: v.number(),
    votingDeadline: v.number(),
    phase: v.union(
      v.literal("pending"),
      v.literal("submission"),
      v.literal("voting"),
      v.literal("completed"),
    ),
    playlistUrl: v.optional(v.string()),
    spotifyPlaylistId: v.optional(v.string()),
  })
    .index("by_battleId", ["battleId"])
    .index("by_battleId_and_sessionNumber", ["battleId", "sessionNumber"]),

  // Song submissions per session
  submissions: defineTable({
    sessionId: v.id("vsSessions"),
    userId: v.id("profile"),
    spotifyUrl: v.string(),
    submissionOrder: v.number(), // 1 or 2 for double submissions
    submittedAt: v.number(),
    starsReceived: v.number(), // Updated by voting system
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_session_and_user", ["sessionId", "userId"])
    .index("by_session_and_url", ["sessionId", "spotifyUrl"])
    .index("by_userId", ["userId"]),

  // Voting stars per session
  stars: defineTable({
    sessionId: v.id("vsSessions"),
    voterId: v.id("profile"),
    submissionId: v.id("submissions"),
    votedAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_session_and_voter", ["sessionId", "voterId"])
    .index("by_submissionId", ["submissionId"])
    .index("by_voterId", ["voterId"]),

  // Spotify app tokens (single record for app account)
  spotifyAuth: defineTable({
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
  }),

  // Optional cache of track metadata
  trackMetadata: defineTable({
    trackId: v.string(),
    name: v.string(),
    artists: v.array(v.string()),
    album: v.string(),
    imageUrl: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    durationMs: v.number(),
    lastFetched: v.number(),
  }).index("by_trackId", ["trackId"]),

  battlePlayers: defineTable({
    battleId: v.id("battles"),
    userId: v.id("profile"),
    joinedAt: v.number(),
    totalStarsEarned: v.number(),
    sessionsWon: v.number(),
  })
    .index("by_battleId", ["battleId"])
    .index("by_userId", ["userId"])
    .index("by_battle_and_user", ["battleId", "userId"]),

  invitations: defineTable({
    battleId: v.id("battles"),
    inviterId: v.id("profile"),
    invitedUserId: v.optional(v.id("profile")),
    invitedEmail: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
    ),
    invitedAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_battleId", ["battleId"])
    .index("by_invitedUserId", ["invitedUserId"])
    .index("by_invitedEmail", ["invitedEmail"])
    .index("by_status", ["status"]),
});
