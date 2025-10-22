import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Add a new stage to a battle
 * Uses explicit userId for auth (repo's custom auth pattern).
 */
export const addStage = mutation({
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
    stageId: v.optional(v.id("stage")),
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

    // Only creator can add stages
    if (battle.creatorId !== args.userId) {
      return {
        success: false,
        message: "Only battle creator can add stages",
      };
    }

    if (battle.status !== "active") {
      return {
        success: false,
        message: "Cannot add stages to completed battles",
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

    // Get next stage number
    const existingStages = await ctx.db
      .query("stage")
      .withIndex("by_battleId", (q) => q.eq("battleId", args.battleId))
      .collect();

    const stageNumber = existingStages.length + 1;

    // Determine initial phase
    const phase = stageNumber === 1 ? "submission" : ("pending" as const);

    const stageId = await ctx.db.insert("stage", {
      battleId: args.battleId,
      stageNumber,
      vibe: args.vibe,
      description: args.description,
      submissionDeadline: args.submissionDeadline,
      votingDeadline: args.votingDeadline,
      phase,
    });

    // If this is the first stage, update battle's currentStageId
    if (stageNumber === 1) {
      await ctx.db.patch(args.battleId, {
        currentStageId: stageId,
      });
    }

    return {
      success: true,
      stageId,
      message: `Stage ${stageNumber} added successfully`,
    };
  },
});

/**
 * Update stage details (only allowed for pending stages)
 */
export const updateStage = mutation({
  args: {
    userId: v.id("user"),
    stageId: v.id("stage"),
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

    const stage = await ctx.db.get(args.stageId);
    if (!stage) {
      return { success: false, message: "Stage not found" };
    }

    const battle = await ctx.db.get(stage.battleId);
    if (!battle) {
      return { success: false, message: "Battle not found" };
    }

    // Only creator can update stages
    if (battle.creatorId !== args.userId) {
      return {
        success: false,
        message: "Only battle creator can update stages",
      };
    }

    // Can only update pending stages
    if (stage.phase !== "pending") {
      return {
        success: false,
        message: "Can only update stages that haven't started yet",
      };
    }

    // Validate new deadlines if provided
    const newSubmissionDeadline =
      args.submissionDeadline ?? stage.submissionDeadline;
    const newVotingDeadline = args.votingDeadline ?? stage.votingDeadline;

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

    // Update stage
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

    await ctx.db.patch(args.stageId, updates);

    return { success: true, message: "Stage updated successfully" };
  },
});

/**
 * Get all stages for a battle
 */
export const getBattleStages = query({
  args: { battleId: v.id("battle") },
  returns: v.array(
    v.object({
      _id: v.id("stage"),
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
      submissionCount: v.number(),
      votingProgress: v.object({
        totalVoters: v.number(),
        votedCount: v.number(),
        remainingVoters: v.array(v.string()),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const stages = await ctx.db
      .query("stage")
      .withIndex("by_battleId", (q) => q.eq("battleId", args.battleId))
      .order("asc")
      .collect();

    const stagesWithDetails = await Promise.all(
      stages.map(async (stage) => {
        // Count submissions in this stage
        const submissionCount = (
          await ctx.db
            .query("submission")
            .withIndex("by_stageId", (q) => q.eq("stageId", stage._id))
            .collect()
        ).length;
        // Voting progress
        const players = await ctx.db
          .query("player")
          .withIndex("by_battleId", (q) => q.eq("battleId", stage.battleId))
          .collect();
        const totalVoters = players.length;
        const votedFlags = await Promise.all(
          players.map(async (p) => {
            const stars = await ctx.db
              .query("star")
              .withIndex("by_stage_and_voter", (q) =>
                q.eq("stageId", stage._id).eq("voterId", p.userId),
              )
              .collect();
            return stars.length === 3;
          }),
        );
        const votedCount = votedFlags.filter(Boolean).length;
        const remainingVoters: string[] = [];

        return {
          _id: stage._id,
          stageNumber: stage.stageNumber,
          vibe: stage.vibe,
          description: stage.description,
          submissionDeadline: stage.submissionDeadline,
          votingDeadline: stage.votingDeadline,
          phase: stage.phase,
          playlistUrl: stage.playlistUrl,
          submissionCount,
          votingProgress: {
            totalVoters,
            votedCount,
            remainingVoters,
          },
        };
      }),
    );

    return stagesWithDetails;
  },
});

/**
 * Get current active stage for a battle
 */
export const getCurrentStage = query({
  args: { battleId: v.id("battle") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("stage"),
      stageNumber: v.number(),
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
    if (!battle || !battle.currentStageId) return null;

    const stage = await ctx.db.get(battle.currentStageId);
    if (!stage || stage.phase === "pending") return null;

    const now = Date.now();
    let timeRemaining:
      | { phase: string; milliseconds: number; expired: boolean }
      | undefined;

    switch (stage.phase) {
      case "submission":
        timeRemaining = {
          phase: "submission",
          milliseconds: stage.submissionDeadline - now,
          expired: stage.submissionDeadline <= now,
        };
        break;
      case "voting":
        timeRemaining = {
          phase: "voting",
          milliseconds: stage.votingDeadline - now,
          expired: stage.votingDeadline <= now,
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
      _id: stage._id,
      stageNumber: stage.stageNumber,
      vibe: stage.vibe,
      description: stage.description,
      submissionDeadline: stage.submissionDeadline,
      votingDeadline: stage.votingDeadline,
      phase: stage.phase as "submission" | "voting" | "completed",
      playlistUrl: stage.playlistUrl,
      timeRemaining: timeRemaining!,
    };
  },
});
