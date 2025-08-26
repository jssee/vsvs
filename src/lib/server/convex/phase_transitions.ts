import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Check and advance session phases (called by cron job)
 */
export const checkPhaseTransitions = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Find sessions that need phase transitions
    const activeSessions = await ctx.db
      .query("vsSessions")
      .filter((q) =>
        q.or(
          q.eq(q.field("phase"), "submission"),
          q.eq(q.field("phase"), "voting"),
        ),
      )
      .collect();

    for (const session of activeSessions) {
      if (session.phase === "submission" && session.submissionDeadline <= now) {
        // Advance to voting phase
        await ctx.db.patch(session._id, { phase: "voting" });

        // Schedule playlist generation (stubbed; implemented in later phase)
        await ctx.scheduler.runAfter(0, internal.spotify.generateSessionPlaylist, {
          sessionId: session._id,
        });
      } else if (session.phase === "voting") {
        // Check if voting should end
        const shouldEndVoting = session.votingDeadline <= now || (await checkAllPlayersVoted(ctx, session._id));

        if (shouldEndVoting) {
          // Advance to completed phase
          await ctx.db.patch(session._id, { phase: "completed" });

          // Calculate session winner and update stats (no-op until later phase)
          await ctx.scheduler.runAfter(0, internal.phase_transitions.calculateSessionWinner, {
            sessionId: session._id,
          });

          // Check if this completes the battle or advances next session
          await ctx.scheduler.runAfter(0, internal.phase_transitions.handleSessionCompletion, {
            sessionId: session._id,
          });
        }
      }
    }

    return null;
  },
});

/**
 * Check if all players in a session have voted
 * Placeholder until the voting system exists; returns false to rely on deadlines.
 */
async function checkAllPlayersVoted(ctx: any, sessionId: string): Promise<boolean> {
  // Voting system not implemented yet in Phase 2
  return false;
}

/**
 * Handle session completion - advance next session or end battle
 */
export const handleSessionCompletion = internalMutation({
  args: { sessionId: v.id("vsSessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const battle = await ctx.db.get(session.battleId);
    if (!battle) return null;

    // Find next session
    const nextSession = await ctx.db
      .query("vsSessions")
      .withIndex("by_battleId_and_sessionNumber", (q) =>
        q.eq("battleId", session.battleId).eq("sessionNumber", session.sessionNumber + 1),
      )
      .first();

    if (nextSession) {
      // Advance next session to submission phase
      await ctx.db.patch(nextSession._id, { phase: "submission" });

      // Update battle's current session
      await ctx.db.patch(session.battleId, {
        currentSessionId: nextSession._id,
      });
    } else {
      // No more sessions - battle is complete
      await ctx.db.patch(session.battleId, {
        status: "completed",
        currentSessionId: undefined,
      });

      // Calculate battle champion (no-op until later phase)
      await ctx.scheduler.runAfter(0, internal.phase_transitions.calculateBattleChampion, {
        battleId: session.battleId,
      });
    }

    return null;
  },
});

/**
 * Calculate session winner based on stars received
 * Placeholder for future phase.
 */
export const calculateSessionWinner = internalMutation({
  args: { sessionId: v.id("vsSessions") },
  returns: v.null(),
  handler: async () => {
    return null;
  },
});

/**
 * Calculate battle champion when battle ends
 * Placeholder for future phase.
 */
export const calculateBattleChampion = internalMutation({
  args: { battleId: v.id("battles") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("battlePlayers")
      .withIndex("by_battleId", (q) => q.eq("battleId", args.battleId))
      .collect();

    // Find player(s) with most total stars
    const maxStars = players.length > 0 ? Math.max(...players.map((p) => p.totalStarsEarned)) : 0;
    const _champions = players.filter((p) => p.totalStarsEarned === maxStars);
    // Could patch battle or players; left as future enhancement
    return null;
  },
});
