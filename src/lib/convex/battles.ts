import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { generateInviteCode } from "../utils/invite-codes";
import type { Id } from "./_generated/dataModel";

/**
 * Create a new battle
 */
export const createBattle = mutation({
  args: {
    userId: v.id("profile"),
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
    userId: v.optional(v.id("profile")),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("battles"),
      name: v.string(),
      creatorId: v.id("profile"),
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
    if (
      args.userId &&
      battle.status === "active" &&
      playerCount < battle.maxPlayers
    ) {
      const uid = args.userId; // narrow for TS
      const existingPlayer = await ctx.db
        .query("battlePlayers")
        .withIndex("by_battle_and_user", (q) =>
          q.eq("battleId", args.battleId).eq("userId", uid),
        )
        .first();
      canJoin = !existingPlayer;
    }

    return {
      _id: battle._id,
      name: battle.name,
      creatorId: battle.creatorId,
      status: battle.status,
      visibility: battle.visibility,
      maxPlayers: battle.maxPlayers,
      doubleSubmissions: battle.doubleSubmissions,
      inviteCode: battle.inviteCode,
      currentSessionId: battle.currentSessionId,
      createdAt: battle.createdAt,
      playerCount,
      canJoin,
    };
  },
});

/**
 * Get battles for a user (owner or player)
 */
export const getMyBattles = query({
  args: { userId: v.id("profile") },
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
    // Collect battles where the user is a player
    const memberships = await ctx.db
      .query("battlePlayers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const battleIds = new Set<Id<"battles">>(
      memberships.map((m) => m.battleId),
    );

    // Also include battles the user created (in case of legacy data where
    // the creator might not have a battlePlayers row)
    const created = await ctx.db
      .query("battles")
      .withIndex("by_creatorId", (q) => q.eq("creatorId", args.userId))
      .collect();
    for (const b of created) battleIds.add(b._id);

    const results = [] as Array<{
      _id: Id<"battles">;
      name: string;
      status: "active" | "completed";
      playerCount: number;
      maxPlayers: number;
      createdAt: number;
      currentSessionNumber?: number;
    }>;

    for (const id of battleIds) {
      const battle = await ctx.db.get(id);
      if (!battle) continue;

      const playerCount = (
        await ctx.db
          .query("battlePlayers")
          .withIndex("by_battleId", (q) => q.eq("battleId", id))
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

    // Sort newest first for stable order
    results.sort((a, b) => b.createdAt - a.createdAt);

    return results;
  },
});
