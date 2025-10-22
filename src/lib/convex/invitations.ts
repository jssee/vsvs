import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Send a battle invitation to an email address.
 * If a user exists with the email, stores invitedUserId; otherwise stores invitedEmail.
 */
export const sendInvitation = mutation({
  args: {
    userId: v.id("user"), // inviter
    battleId: v.id("battle"),
    invitedEmail: v.string(),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const inviter = await ctx.db.get(args.userId);
    if (!inviter) return { success: false, message: "Inviter not found" };

    const battle = await ctx.db.get(args.battleId);
    if (!battle) return { success: false, message: "Battle not found" };

    if (battle.creatorId !== args.userId) {
      return {
        success: false,
        message: "Only battle creator can send invitations",
      };
    }

    if (battle.status !== "active") {
      return { success: false, message: "Cannot invite to a completed battle" };
    }

    const invitedUser = await ctx.db
      .query("user")
      .withIndex("by_email", (q) => q.eq("email", args.invitedEmail))
      .unique();

    if (invitedUser) {
      // Check if already in battle
      const existingPlayer = await ctx.db
        .query("player")
        .withIndex("by_battle_and_user", (q) =>
          q.eq("battleId", args.battleId).eq("userId", invitedUser._id),
        )
        .first();
      if (existingPlayer) {
        return { success: false, message: "User is already in this battle" };
      }

      // Check for existing pending invitation
      const duplicate = await ctx.db
        .query("invitation")
        .withIndex("by_invitedUserId", (q) =>
          q.eq("invitedUserId", invitedUser._id),
        )
        .filter((q) => q.eq(q.field("battleId"), args.battleId))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .first();
      if (duplicate) {
        return { success: false, message: "Invitation already sent" };
      }

      await ctx.db.insert("invitation", {
        battleId: args.battleId,
        inviterId: args.userId,
        invitedUserId: invitedUser._id,
        invitedEmail: undefined,
        status: "pending",
        invitedAt: Date.now(),
        respondedAt: undefined,
      });
    } else {
      // Check for existing pending invitation by email
      const duplicate = await ctx.db
        .query("invitation")
        .withIndex("by_invitedEmail", (q) =>
          q.eq("invitedEmail", args.invitedEmail),
        )
        .filter((q) => q.eq(q.field("battleId"), args.battleId))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .first();
      if (duplicate) {
        return { success: false, message: "Invitation already sent" };
      }

      await ctx.db.insert("invitation", {
        battleId: args.battleId,
        inviterId: args.userId,
        invitedUserId: undefined,
        invitedEmail: args.invitedEmail,
        status: "pending",
        invitedAt: Date.now(),
        respondedAt: undefined,
      });
    }

    return { success: true, message: "Invitation sent" };
  },
});

/**
 * List invitations for a user (by userId or by email).
 */
export const getMyInvitations = query({
  args: { userId: v.id("user") },
  returns: v.array(
    v.object({
      _id: v.id("invitation"),
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
    }),
  ),
  handler: async (ctx, args) => {
    const me = await ctx.db.get(args.userId);
    if (!me) return [];

    const direct = await ctx.db
      .query("invitation")
      .withIndex("by_invitedUserId", (q) => q.eq("invitedUserId", args.userId))
      .collect();

    const emailBased = me.email
      ? await ctx.db
          .query("invitation")
          .withIndex("by_invitedEmail", (q) => q.eq("invitedEmail", me.email))
          .collect()
      : [];

    // Merge, avoiding duplicates if both fields match
    const all = [...direct];
    for (const inv of emailBased) {
      if (!all.find((d) => d._id === inv._id)) all.push(inv);
    }
    return all;
  },
});

/**
 * Respond to an invitation (accept or decline)
 */
export const respondToInvitation = mutation({
  args: {
    userId: v.id("user"),
    invitationId: v.id("invitation"),
    response: v.union(v.literal("accepted"), v.literal("declined")),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    battleId: v.optional(v.id("battle")),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return { success: false, message: "User not found" };

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) return { success: false, message: "Invitation not found" };

    // Verify invitation belongs to this user
    const isRecipient =
      invitation.invitedUserId === args.userId ||
      (!!invitation.invitedEmail && invitation.invitedEmail === user.email);
    if (!isRecipient) {
      return {
        success: false,
        message: "Not authorized to respond to this invitation",
      };
    }

    const battle = await ctx.db.get(invitation.battleId);
    if (!battle) return { success: false, message: "Battle not found" };

    if (battle.status !== "active") {
      return { success: false, message: "This battle has ended" };
    }

    // Update invitation status
    await ctx.db.patch(args.invitationId, {
      status: args.response,
      respondedAt: Date.now(),
    });

    if (args.response === "accepted") {
      const currentPlayers = await ctx.db
        .query("player")
        .withIndex("by_battleId", (q) => q.eq("battleId", invitation.battleId))
        .collect();

      if (currentPlayers.length >= battle.maxPlayers) {
        return { success: false, message: "Battle is now full, cannot join" };
      }

      // Check not already joined via code or duplicate
      const existingPlayer = await ctx.db
        .query("player")
        .withIndex("by_battle_and_user", (q) =>
          q.eq("battleId", invitation.battleId).eq("userId", args.userId),
        )
        .first();
      if (!existingPlayer) {
        await ctx.db.insert("player", {
          battleId: invitation.battleId,
          userId: args.userId,
          joinedAt: Date.now(),
          totalStarsEarned: 0,
          stagesWon: 0,
        });
      }

      return {
        success: true,
        message: "Successfully joined the battle!",
        battleId: invitation.battleId,
      };
    }

    return { success: true, message: "Invitation declined" };
  },
});
