import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { generateInviteCode } from "../utils/invite-codes";
import type { Id } from "./_generated/dataModel";

/**
 * Create a new battle
 */
export const createBattle = mutation({
  args: {
    userId: v.id("user"),
    name: v.string(),
    maxPlayers: v.number(),
    doubleSubmissions: v.boolean(),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  returns: v.object({
    battleId: v.id("battles"),
    inviteCode: v.string(),
  }),
  handler: async (ctx, args) => {
    // Basic validation
    if (args.name.length < 1 || args.name.length > 50) {
      throw new Error("Name must be between 1 and 50 characters");
    }
    if (args.maxPlayers < 2 || args.maxPlayers > 20) {
      throw new Error("Max players must be between 2 and 20");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Generate unique invite code
    let inviteCode = "";
    while (true) {
      const candidate = generateInviteCode();
      const existing = await ctx.db
        .query("battles")
        .withIndex("by_inviteCode", (q) => q.eq("inviteCode", candidate))
        .first();
      if (!existing) {
        inviteCode = candidate;
        break;
      }
    }

    const battleId = await ctx.db.insert("battles", {
      name: args.name,
      creatorId: args.userId,
      status: "active",
      visibility: args.visibility,
      maxPlayers: args.maxPlayers,
      doubleSubmissions: args.doubleSubmissions,
      inviteCode,
      createdAt: Date.now(),
    });

    // Add creator as first player
    await ctx.db.insert("battlePlayers", {
      battleId,
      userId: args.userId,
      joinedAt: Date.now(),
      totalStarsEarned: 0,
      sessionsWon: 0,
    });

    return { battleId, inviteCode };
  },
});

/**
 * Get battle details by ID
 */
export const getBattle = query({
  args: {
    battleId: v.id("battles"),
    userId: v.optional(v.id("user")),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("battles"),
      name: v.string(),
      creatorId: v.id("user"),
      status: v.union(v.literal("active"), v.literal("completed")),
      visibility: v.union(v.literal("public"), v.literal("private")),
      maxPlayers: v.number(),
      doubleSubmissions: v.boolean(),
      inviteCode: v.string(),
      currentSessionId: v.optional(v.id("vsSessions")),
      createdAt: v.number(),
      playerCount: v.number(),
      canJoin: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle) return null;

    const playerCount = (
      await ctx.db
        .query("battlePlayers")
        .withIndex("by_battleId", (q) => q.eq("battleId", args.battleId))
        .collect()
    ).length;

    let canJoin = false;
    if (args.userId && battle.status === "active" && playerCount < battle.maxPlayers) {
      const uid = args.userId; // narrow for TS
      const existingPlayer = await ctx.db
        .query("battlePlayers")
        .withIndex("by_battle_and_user", (q) =>
          q.eq("battleId", args.battleId).eq("userId", uid),
        )
        .first();
      canJoin = !existingPlayer;
    }

    return { ...battle, playerCount, canJoin };
  },
});

/**
 * Get battles created by a user
 */
export const getMyBattles = query({
  args: { userId: v.id("user") },
  returns: v.array(
    v.object({
      _id: v.id("battles"),
      name: v.string(),
      status: v.union(v.literal("active"), v.literal("completed")),
      playerCount: v.number(),
      maxPlayers: v.number(),
      createdAt: v.number(),
      currentSessionNumber: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const battles = await ctx.db
      .query("battles")
      .withIndex("by_creatorId", (q) => q.eq("creatorId", args.userId))
      .order("desc")
      .collect();

    const results = [] as Array<{
      _id: Id<"battles">;
      name: string;
      status: "active" | "completed";
      playerCount: number;
      maxPlayers: number;
      createdAt: number;
      currentSessionNumber?: number;
    }>;

    for (const battle of battles) {
      const playerCount = (
        await ctx.db
          .query("battlePlayers")
          .withIndex("by_battleId", (q) => q.eq("battleId", battle._id))
          .collect()
      ).length;

      let currentSessionNumber: number | undefined;
      if (battle.currentSessionId) {
        const currentSession = await ctx.db.get(battle.currentSessionId);
        currentSessionNumber = currentSession?.sessionNumber;
      }

      results.push({
        _id: battle._id,
        name: battle.name,
        status: battle.status,
        playerCount,
        maxPlayers: battle.maxPlayers,
        createdAt: battle.createdAt,
        currentSessionNumber,
      });
    }

    return results;
  },
});
