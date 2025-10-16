import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Add a new session to a battle
 * Uses explicit userId for auth (repo's custom auth pattern).
 */
export const addSession = mutation({
  args: {
    userId: v.id("user"),
    battleId: v.id("battle"),
    vibe: v.string(),
    description: v.optional(v.string()),
    submissionDeadline: v.number(),
    votingDeadline: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    sessionId: v.optional(v.id("vsSession")),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    const battle = await ctx.db.get(args.battleId);
    if (!battle) {
      return { success: false, message: "Battle not found" };
    }

    // Only creator can add sessions
    if (battle.creatorId !== args.userId) {
      return {
        success: false,
        message: "Only battle creator can add sessions",
      };
    }

    if (battle.status !== "active") {
      return {
        success: false,
        message: "Cannot add sessions to completed battles",
      };
    }

    // Validate deadlines
    if (args.votingDeadline <= args.submissionDeadline) {
      return {
        success: false,
        message: "Voting deadline must be after submission deadline",
      };
    }

    if (args.submissionDeadline <= Date.now()) {
      return {
        success: false,
        message: "Submission deadline must be in the future",
      };
    }

    // Get next session number
    const existingSessions = await ctx.db
      .query("vsSession")
      .withIndex("by_battleId", (q) => q.eq("battleId", args.battleId))
      .collect();

    const sessionNumber = existingSessions.length + 1;

    // Determine initial phase
    const phase = sessionNumber === 1 ? "submission" : ("pending" as const);

    const sessionId = await ctx.db.insert("vsSession", {
      battleId: args.battleId,
      sessionNumber,
      vibe: args.vibe,
      description: args.description,
      submissionDeadline: args.submissionDeadline,
      votingDeadline: args.votingDeadline,
      phase,
    });

    // If this is the first session, update battle's currentSessionId
    if (sessionNumber === 1) {
      await ctx.db.patch(args.battleId, {
        currentSessionId: sessionId,
      });
    }

    return {
      success: true,
      sessionId,
      message: `Session ${sessionNumber} added successfully`,
    };
  },
});

/**
 * Update session details (only allowed for pending sessions)
 */
export const updateSession = mutation({
  args: {
    userId: v.id("user"),
    sessionId: v.id("vsSession"),
    vibe: v.optional(v.string()),
    description: v.optional(v.string()),
    submissionDeadline: v.optional(v.number()),
    votingDeadline: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { success: false, message: "Session not found" };
    }

    const battle = await ctx.db.get(session.battleId);
    if (!battle) {
      return { success: false, message: "Battle not found" };
    }

    // Only creator can update sessions
    if (battle.creatorId !== args.userId) {
      return {
        success: false,
        message: "Only battle creator can update sessions",
      };
    }

    // Can only update pending sessions
    if (session.phase !== "pending") {
      return {
        success: false,
        message: "Can only update sessions that haven't started yet",
      };
    }

    // Validate new deadlines if provided
    const newSubmissionDeadline =
      args.submissionDeadline ?? session.submissionDeadline;
    const newVotingDeadline = args.votingDeadline ?? session.votingDeadline;

    if (newVotingDeadline <= newSubmissionDeadline) {
      return {
        success: false,
        message: "Voting deadline must be after submission deadline",
      };
    }

    if (newSubmissionDeadline <= Date.now()) {
      return {
        success: false,
        message: "Submission deadline must be in the future",
      };
    }

    // Update session
    const updates: Partial<{
      vibe: string;
      description: string;
      submissionDeadline: number;
      votingDeadline: number;
    }> = {};
    if (args.vibe !== undefined) updates.vibe = args.vibe;
    if (args.description !== undefined) updates.description = args.description;
    if (args.submissionDeadline !== undefined)
      updates.submissionDeadline = args.submissionDeadline;
    if (args.votingDeadline !== undefined)
      updates.votingDeadline = args.votingDeadline;

    await ctx.db.patch(args.sessionId, updates);

    return { success: true, message: "Session updated successfully" };
  },
});

/**
 * Get all sessions for a battle
 */
export const getBattleSessions = query({
  args: { battleId: v.id("battle") },
  returns: v.array(
    v.object({
      _id: v.id("vsSession"),
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
      submissionCount: v.number(),
      votingProgress: v.object({
        totalVoters: v.number(),
        votedCount: v.number(),
        remainingVoters: v.array(v.string()),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("vsSession")
      .withIndex("by_battleId", (q) => q.eq("battleId", args.battleId))
      .order("asc")
      .collect();

    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session) => {
        // Count submissions in this session
        const submissionCount = (
          await ctx.db
            .query("submission")
            .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
            .collect()
        ).length;
        // Voting progress
        const players = await ctx.db
          .query("player")
          .withIndex("by_battleId", (q) => q.eq("battleId", session.battleId))
          .collect();
        const totalVoters = players.length;
        const votedFlags = await Promise.all(
          players.map(async (p) => {
            const stars = await ctx.db
              .query("star")
              .withIndex("by_session_and_voter", (q) =>
                q.eq("sessionId", session._id).eq("voterId", p.userId),
              )
              .collect();
            return stars.length === 3;
          }),
        );
        const votedCount = votedFlags.filter(Boolean).length;
        const remainingVoters: string[] = [];

        return {
          _id: session._id,
          sessionNumber: session.sessionNumber,
          vibe: session.vibe,
          description: session.description,
          submissionDeadline: session.submissionDeadline,
          votingDeadline: session.votingDeadline,
          phase: session.phase,
          playlistUrl: session.playlistUrl,
          submissionCount,
          votingProgress: {
            totalVoters,
            votedCount,
            remainingVoters,
          },
        };
      }),
    );

    return sessionsWithDetails;
  },
});

/**
 * Get current active session for a battle
 */
export const getCurrentSession = query({
  args: { battleId: v.id("battle") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("vsSession"),
      sessionNumber: v.number(),
      vibe: v.string(),
      description: v.optional(v.string()),
      submissionDeadline: v.number(),
      votingDeadline: v.number(),
      phase: v.union(
        v.literal("submission"),
        v.literal("voting"),
        v.literal("completed"),
      ),
      playlistUrl: v.optional(v.string()),
      timeRemaining: v.object({
        phase: v.string(),
        milliseconds: v.number(),
        expired: v.boolean(),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle || !battle.currentSessionId) return null;

    const session = await ctx.db.get(battle.currentSessionId);
    if (!session || session.phase === "pending") return null;

    const now = Date.now();
    let timeRemaining:
      | { phase: string; milliseconds: number; expired: boolean }
      | undefined;

    switch (session.phase) {
      case "submission":
        timeRemaining = {
          phase: "submission",
          milliseconds: session.submissionDeadline - now,
          expired: session.submissionDeadline <= now,
        };
        break;
      case "voting":
        timeRemaining = {
          phase: "voting",
          milliseconds: session.votingDeadline - now,
          expired: session.votingDeadline <= now,
        };
        break;
      case "completed":
        timeRemaining = {
          phase: "completed",
          milliseconds: 0,
          expired: false,
        };
        break;
    }

    return {
      _id: session._id,
      sessionNumber: session.sessionNumber,
      vibe: session.vibe,
      description: session.description,
      submissionDeadline: session.submissionDeadline,
      votingDeadline: session.votingDeadline,
      phase: session.phase as "submission" | "voting" | "completed",
      playlistUrl: session.playlistUrl,
      timeRemaining: timeRemaining!,
    };
  },
});
