import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Award a star to a submission
 */
export const awardStar = mutation({
  args: {
    userId: v.id("user"),
    submissionId: v.id("submissions"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    starsRemaining: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      return { success: false, message: "Submission not found" };
    }

    const session = await ctx.db.get(submission.sessionId);
    if (!session) {
      return { success: false, message: "Session not found" };
    }

    // Must be in voting phase and before deadline
    if (session.phase !== "voting") {
      return {
        success: false,
        message:
          session.phase === "submission"
            ? "Voting hasn't started yet"
            : "Voting period has ended",
      };
    }
    if (Date.now() > session.votingDeadline) {
      return { success: false, message: "Voting deadline has passed" };
    }

    // Must be battle participant
    const player = await ctx.db
      .query("battlePlayers")
      .withIndex("by_battle_and_user", (q) =>
        q.eq("battleId", session.battleId).eq("userId", args.userId),
      )
      .first();
    if (!player) {
      return {
        success: false,
        message: "You are not a participant in this battle",
      };
    }

    // Cannot vote for own submission
    if (submission.userId === args.userId) {
      return {
        success: false,
        message: "You cannot vote for your own submission",
      };
    }

    // Count existing stars by this voter in this session
    const existingStars = await ctx.db
      .query("stars")
      .withIndex("by_session_and_voter", (q) =>
        q.eq("sessionId", submission.sessionId).eq("voterId", args.userId),
      )
      .collect();

    if (existingStars.length >= 3) {
      return {
        success: false,
        message: "You have already used all 3 stars for this session",
      };
    }

    // Insert star and update submission count
    await ctx.db.insert("stars", {
      sessionId: submission.sessionId,
      voterId: args.userId,
      submissionId: args.submissionId,
      votedAt: Date.now(),
    });
    await ctx.db.patch(args.submissionId, {
      starsReceived: submission.starsReceived + 1,
    });

    // Trigger a background phase check to possibly auto-complete
    await ctx.scheduler.runAfter(
      0,
      internal.phase_transitions.checkPhaseTransitions,
      {},
    );

    const starsRemaining = 2 - existingStars.length;
    return {
      success: true,
      message: `Star awarded! You have ${starsRemaining} stars remaining.`,
      starsRemaining,
    };
  },
});

/**
 * Remove a star from a submission (undo vote)
 */
export const removeStar = mutation({
  args: {
    userId: v.id("user"),
    submissionId: v.id("submissions"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    starsRemaining: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      return { success: false, message: "Submission not found" };
    }

    const session = await ctx.db.get(submission.sessionId);
    if (!session) {
      return { success: false, message: "Session not found" };
    }

    if (session.phase !== "voting") {
      return {
        success: false,
        message: "Cannot change votes outside voting period",
      };
    }
    if (Date.now() > session.votingDeadline) {
      return { success: false, message: "Voting deadline has passed" };
    }

    // Find user's star for this submission
    const starToRemove = await ctx.db
      .query("stars")
      .withIndex("by_session_and_voter", (q) =>
        q.eq("sessionId", submission.sessionId).eq("voterId", args.userId),
      )
      .filter((q) => q.eq(q.field("submissionId"), args.submissionId))
      .first();
    if (!starToRemove) {
      return {
        success: false,
        message: "You haven't voted for this submission",
      };
    }

    await ctx.db.delete(starToRemove._id);
    await ctx.db.patch(args.submissionId, {
      starsReceived: Math.max(0, submission.starsReceived - 1),
    });

    // Trigger background check
    await ctx.scheduler.runAfter(
      0,
      internal.phase_transitions.checkPhaseTransitions,
      {},
    );

    const remainingStars = await ctx.db
      .query("stars")
      .withIndex("by_session_and_voter", (q) =>
        q.eq("sessionId", submission.sessionId).eq("voterId", args.userId),
      )
      .collect();
    const starsRemaining = 3 - remainingStars.length;

    return {
      success: true,
      message: `Star removed! You have ${starsRemaining} stars remaining.`,
      starsRemaining,
    };
  },
});

/**
 * Get voting state for current user in a session
 */
export const getMyVotingState = query({
  args: { sessionId: v.id("vsSessions"), userId: v.id("user") },
  returns: v.object({
    starsRemaining: v.number(),
    votedSubmissions: v.array(v.id("submissions")),
    canVote: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session)
      return { starsRemaining: 0, votedSubmissions: [], canVote: false };

    // Ensure participant
    const player = await ctx.db
      .query("battlePlayers")
      .withIndex("by_battle_and_user", (q) =>
        q.eq("battleId", session.battleId).eq("userId", args.userId),
      )
      .first();
    if (!player)
      return { starsRemaining: 0, votedSubmissions: [], canVote: false };

    const userStars = await ctx.db
      .query("stars")
      .withIndex("by_session_and_voter", (q) =>
        q.eq("sessionId", args.sessionId).eq("voterId", args.userId),
      )
      .collect();

    const votedSubmissions = userStars.map((s) => s.submissionId);
    const starsRemaining = Math.max(0, 3 - userStars.length);
    const canVote =
      session.phase === "voting" &&
      Date.now() <= session.votingDeadline &&
      starsRemaining > 0;

    return { starsRemaining, votedSubmissions, canVote };
  },
});

/**
 * Get voting summary for a session
 */
export const getSessionVotingSummary = query({
  args: { sessionId: v.id("vsSessions") },
  returns: v.object({
    totalVoters: v.number(),
    completedVoters: v.number(),
    votingProgress: v.number(),
    submissionResults: v.array(
      v.object({
        submissionId: v.id("submissions"),
        userId: v.id("user"),
        username: v.string(),
        spotifyUrl: v.string(),
        submissionOrder: v.number(),
        starsReceived: v.number(),
        voters: v.array(v.string()),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return {
        totalVoters: 0,
        completedVoters: 0,
        votingProgress: 0,
        submissionResults: [],
      };
    }

    const battlePlayers = await ctx.db
      .query("battlePlayers")
      .withIndex("by_battleId", (q) => q.eq("battleId", session.battleId))
      .collect();
    const totalVoters = battlePlayers.length;

    const progress = await Promise.all(
      battlePlayers.map(async (p) => {
        const stars = await ctx.db
          .query("stars")
          .withIndex("by_session_and_voter", (q) =>
            q.eq("sessionId", args.sessionId).eq("voterId", p.userId),
          )
          .collect();
        return stars.length;
      }),
    );
    const completedVoters = progress.filter((c) => c === 3).length;
    const votingProgress =
      totalVoters > 0 ? Math.round((completedVoters / totalVoters) * 100) : 0;

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const submissionResults = await Promise.all(
      submissions.map(async (sub) => {
        const user = await ctx.db.get(sub.userId);
        const stars = await ctx.db
          .query("stars")
          .withIndex("by_submissionId", (q) => q.eq("submissionId", sub._id))
          .collect();
        const voters = await Promise.all(
          stars.map(async (s) => {
            const voter = await ctx.db.get(s.voterId);
            return voter?.username || "Unknown";
          }),
        );
        return {
          submissionId: sub._id,
          userId: sub.userId,
          username: user?.username || "Unknown",
          spotifyUrl: sub.spotifyUrl,
          submissionOrder: sub.submissionOrder,
          starsReceived: sub.starsReceived,
          voters,
        };
      }),
    );

    return { totalVoters, completedVoters, votingProgress, submissionResults };
  },
});
