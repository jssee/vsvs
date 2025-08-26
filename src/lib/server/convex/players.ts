import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Get all players in a battle
 */
export const getBattlePlayers = query({
  args: { battleId: v.id("battles") },
  returns: v.array(
    v.object({
      _id: v.id("battlePlayers"),
      userId: v.id("user"),
      userEmail: v.string(),
      joinedAt: v.number(),
      totalStarsEarned: v.number(),
      sessionsWon: v.number(),
      isCreator: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle) return [];

    const players = await ctx.db
      .query("battlePlayers")
      .withIndex("by_battleId", (q) => q.eq("battleId", args.battleId))
      .collect();

    const results = [] as Array<{
      _id: Id<"battlePlayers">;
      userId: Id<"user">;
      userEmail: string;
      joinedAt: number;
      totalStarsEarned: number;
      sessionsWon: number;
      isCreator: boolean;
    }>;

    for (const p of players) {
      const user = await ctx.db.get(p.userId);
      results.push({
        _id: p._id,
        userId: p.userId,
        userEmail: user?.email ?? "Unknown",
        joinedAt: p.joinedAt,
        totalStarsEarned: p.totalStarsEarned,
        sessionsWon: p.sessionsWon,
        isCreator: p.userId === battle.creatorId,
      });
    }

    return results.sort((a, b) => b.totalStarsEarned - a.totalStarsEarned);
  },
});

/**
 * Join a battle via invite code
 */
export const joinBattleByCode = mutation({
  args: { inviteCode: v.string(), userId: v.id("user") },
  returns: v.object({
    success: v.boolean(),
    battleId: v.optional(v.id("battles")),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    const battle = await ctx.db
      .query("battles")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!battle) {
      return { success: false, message: "Invalid invite code" };
    }

    if (battle.status !== "active") {
      return { success: false, message: "This battle has ended" };
    }

    const existingPlayer = await ctx.db
      .query("battlePlayers")
      .withIndex("by_battle_and_user", (q) =>
        q.eq("battleId", battle._id).eq("userId", args.userId),
      )
      .first();
    if (existingPlayer) {
      return {
        success: true,
        battleId: battle._id,
        message: "You're already in this battle",
      };
    }

    const currentPlayers = await ctx.db
      .query("battlePlayers")
      .withIndex("by_battleId", (q) => q.eq("battleId", battle._id))
      .collect();

    if (currentPlayers.length >= battle.maxPlayers) {
      return { success: false, message: "This battle is full" };
    }

    await ctx.db.insert("battlePlayers", {
      battleId: battle._id,
      userId: args.userId,
      joinedAt: Date.now(),
      totalStarsEarned: 0,
      sessionsWon: 0,
    });

    return {
      success: true,
      battleId: battle._id,
      message: "Successfully joined the battle!",
    };
  },
});
