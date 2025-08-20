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
});
