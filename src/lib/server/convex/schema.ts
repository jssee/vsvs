import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  user: defineTable({
    email: v.string(),
    password: v.string(),
  }).index("by_email", ["email"]),

  session: defineTable({
    sessionId: v.string(),
    userId: v.id("user"),
    expiresAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session_id", ["sessionId"]),

  friendship: defineTable({
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
  battles: defineTable({
    name: v.string(),
    creatorId: v.id("user"),
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

  battlePlayers: defineTable({
    battleId: v.id("battles"),
    userId: v.id("user"),
    joinedAt: v.number(),
    totalStarsEarned: v.number(),
    sessionsWon: v.number(),
  })
    .index("by_battleId", ["battleId"])
    .index("by_userId", ["userId"])
    .index("by_battle_and_user", ["battleId", "userId"]),

  invitations: defineTable({
    battleId: v.id("battles"),
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
