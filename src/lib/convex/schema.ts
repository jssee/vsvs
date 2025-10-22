import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User table - synced from Better Auth
  // Better Auth manages authentication (passwords, sessions, etc.)
  // This table only stores app-specific user data
  user: defineTable({
    email: v.string(),
    username: v.string(), // Display name and handle for mentions
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"]),

  // Note: Session management is handled by Better Auth
  // No need for a custom session table

  friend: defineTable({
    requesterId: v.id("user"),
    recipientId: v.id("user"),
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
  battle: defineTable({
    name: v.string(),
    creatorId: v.id("user"),
    status: v.union(v.literal("active"), v.literal("completed")),
    visibility: v.union(v.literal("public"), v.literal("private")),
    maxPlayers: v.number(),
    doubleSubmissions: v.boolean(),
    inviteCode: v.string(),
    currentStageId: v.optional(v.id("stage")),
    createdAt: v.number(),
  })
    .index("by_creatorId", ["creatorId"])
    .index("by_inviteCode", ["inviteCode"])
    .index("by_status", ["status"])
    .index("by_visibility_and_status", ["visibility", "status"]),

  stage: defineTable({
    battleId: v.id("battle"),
    stageNumber: v.number(),
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
    .index("by_battleId_and_stageNumber", ["battleId", "stageNumber"]),

  // Song submissions per stage
  submission: defineTable({
    stageId: v.id("stage"),
    userId: v.id("user"),
    spotifyUrl: v.string(),
    submissionOrder: v.number(), // 1 or 2 for double submissions
    submittedAt: v.number(),
    starsReceived: v.number(), // Updated by voting system
  })
    .index("by_stageId", ["stageId"])
    .index("by_stage_and_user", ["stageId", "userId"])
    .index("by_stage_and_url", ["stageId", "spotifyUrl"])
    .index("by_userId", ["userId"]),

  // Voting stars per stage
  star: defineTable({
    stageId: v.id("stage"),
    voterId: v.id("user"),
    submissionId: v.id("submission"),
    votedAt: v.number(),
  })
    .index("by_stageId", ["stageId"])
    .index("by_stage_and_voter", ["stageId", "voterId"])
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

  player: defineTable({
    battleId: v.id("battle"),
    userId: v.id("user"),
    joinedAt: v.number(),
    totalStarsEarned: v.number(),
    stagesWon: v.number(),
  })
    .index("by_battleId", ["battleId"])
    .index("by_userId", ["userId"])
    .index("by_battle_and_user", ["battleId", "userId"]),

  invitation: defineTable({
    battleId: v.id("battle"),
    inviterId: v.id("user"),
    invitedUserId: v.optional(v.id("user")),
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
