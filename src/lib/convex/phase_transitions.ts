import { internalMutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Check and advance stage phases (called by cron job)
 */
export const checkPhaseTransitions = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Find stages that need phase transitions
    const activeStages = await ctx.db
      .query("stage")
      .filter((q) =>
        q.or(
          q.eq(q.field("phase"), "submission"),
          q.eq(q.field("phase"), "voting"),
        ),
      )
      .collect();

    for (const stage of activeStages) {
      if (stage.phase === "submission" && stage.submissionDeadline <= now) {
        // Advance to voting phase
        await ctx.db.patch(stage._id, { phase: "voting" });

        // Schedule playlist generation
        await ctx.scheduler.runAfter(
          0,
          internal.spotify_actions.generateStagePlaylist,
          {
            stageId: stage._id,
          },
        );
      } else if (stage.phase === "voting") {
        // Check if voting should end
        const shouldEndVoting =
          stage.votingDeadline <= now ||
          (await checkAllPlayersVoted(ctx, stage._id));

        if (shouldEndVoting) {
          // Advance to completed phase
          await ctx.db.patch(stage._id, { phase: "completed" });

          // Calculate stage winner and update stats (no-op until later phase)
          await ctx.scheduler.runAfter(
            0,
            internal.phase_transitions.calculateStageWinner,
            {
              stageId: stage._id,
            },
          );

          // Check if this completes the battle or advances next stage
          await ctx.scheduler.runAfter(
            0,
            internal.phase_transitions.handleStageCompletion,
            {
              stageId: stage._id,
            },
          );
        }
      }
    }

    return null;
  },
});

/**
 * Check if all players in a stage have voted
 * Placeholder until the voting system exists; returns false to rely on deadlines.
 */
async function checkAllPlayersVoted(
  ctx: MutationCtx,
  stageId: Id<"stage">,
): Promise<boolean> {
  const stage = await ctx.db.get(stageId);
  if (!stage) return false;
  const players = await ctx.db
    .query("player")
    .withIndex("by_battleId", (q) => q.eq("battleId", stage.battleId))
    .collect();
  if (players.length === 0) return false;
  for (const p of players) {
    const stars = await ctx.db
      .query("star")
      .withIndex("by_stage_and_voter", (q) =>
        q.eq("stageId", stageId).eq("voterId", p.userId),
      )
      .collect();
    if (stars.length < 3) return false;
  }
  return true;
}

/**
 * Handle stage completion - advance next stage or end battle
 */
export const handleStageCompletion = internalMutation({
  args: { stageId: v.id("stage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId);
    if (!stage) return null;

    const battle = await ctx.db.get(stage.battleId);
    if (!battle) return null;

    // Find next stage
    const nextStage = await ctx.db
      .query("stage")
      .withIndex("by_battleId_and_stageNumber", (q) =>
        q
          .eq("battleId", stage.battleId)
          .eq("stageNumber", stage.stageNumber + 1),
      )
      .first();

    if (nextStage) {
      // Advance next stage to submission phase
      await ctx.db.patch(nextStage._id, { phase: "submission" });

      // Update battle's current stage
      await ctx.db.patch(stage.battleId, {
        currentStageId: nextStage._id,
      });
    } else {
      // No more stages - battle is complete
      await ctx.db.patch(stage.battleId, {
        status: "completed",
        currentStageId: undefined,
      });

      // Calculate battle champion (no-op until later phase)
      await ctx.scheduler.runAfter(
        0,
        internal.phase_transitions.calculateBattleChampion,
        {
          battleId: stage.battleId,
        },
      );
    }

    return null;
  },
});

/**
 * Calculate stage winner based on stars received
 * Placeholder for future phase.
 */
export const calculateStageWinner = internalMutation({
  args: { stageId: v.id("stage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId);
    if (!stage) return null;

    // Aggregate stars per user for this stage
    const submissions = await ctx.db
      .query("submission")
      .withIndex("by_stageId", (q) => q.eq("stageId", args.stageId))
      .collect();

    const userTotals = new Map<
      Id<"user">,
      { totalStars: number; submissionIds: string[] }
    >();
    for (const sub of submissions) {
      const key = sub.userId;
      const entry = userTotals.get(key) || { totalStars: 0, submissionIds: [] };
      entry.totalStars += sub.starsReceived;
      entry.submissionIds.push(sub._id);
      userTotals.set(key, entry);
    }

    // Update players' totalStarsEarned with stars received this stage
    for (const [userId, { totalStars }] of userTotals) {
      const player = await ctx.db
        .query("player")
        .withIndex("by_battle_and_user", (q) =>
          q.eq("battleId", stage.battleId).eq("userId", userId),
        )
        .first();
      if (player) {
        await ctx.db.patch(player._id, {
          totalStarsEarned: player.totalStarsEarned + totalStars,
        });
      }
    }

    // Determine winner(s)
    const max =
      userTotals.size > 0
        ? Math.max(...Array.from(userTotals.values()).map((v) => v.totalStars))
        : 0;
    const winners = Array.from(userTotals.entries()).filter(
      ([, v]) => v.totalStars === max,
    );
    for (const [userId] of winners) {
      const player = await ctx.db
        .query("player")
        .withIndex("by_battle_and_user", (q) =>
          q.eq("battleId", stage.battleId).eq("userId", userId),
        )
        .first();
      if (player) {
        await ctx.db.patch(player._id, { stagesWon: player.stagesWon + 1 });
      }
    }

    return null;
  },
});

/**
 * Calculate battle champion when battle ends
 * Placeholder for future phase.
 */
export const calculateBattleChampion = internalMutation({
  args: { battleId: v.id("battle") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const _players = await ctx.db
      .query("player")
      .withIndex("by_battleId", (q) => q.eq("battleId", args.battleId))
      .collect();

    // Find player(s) with most total stars - future enhancement
    // const maxStars = _players.length > 0 ? Math.max(..._players.map((p) => p.totalStarsEarned)) : 0;
    // const champions = _players.filter((p) => p.totalStarsEarned === maxStars);
    // Could patch battle or players; left as future enhancement
    return null;
  },
});
