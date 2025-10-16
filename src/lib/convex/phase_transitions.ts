import { internalMutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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
      .query("vsSession")
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

        // Schedule playlist generation
        await ctx.scheduler.runAfter(
          0,
          internal.spotify_actions.generateSessionPlaylist,
          {
            sessionId: session._id,
          },
        );
      } else if (session.phase === "voting") {
        // Check if voting should end
        const shouldEndVoting =
          session.votingDeadline <= now ||
          (await checkAllPlayersVoted(ctx, session._id));

        if (shouldEndVoting) {
          // Advance to completed phase
          await ctx.db.patch(session._id, { phase: "completed" });

          // Calculate session winner and update stats (no-op until later phase)
          await ctx.scheduler.runAfter(
            0,
            internal.phase_transitions.calculateSessionWinner,
            {
              sessionId: session._id,
            },
          );

          // Check if this completes the battle or advances next session
          await ctx.scheduler.runAfter(
            0,
            internal.phase_transitions.handleSessionCompletion,
            {
              sessionId: session._id,
            },
          );
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
async function checkAllPlayersVoted(
  ctx: MutationCtx,
  sessionId: Id<"vsSession">,
): Promise<boolean> {
  const session = await ctx.db.get(sessionId);
  if (!session) return false;
  const players = await ctx.db
    .query("player")
    .withIndex("by_battleId", (q) => q.eq("battleId", session.battleId))
    .collect();
  if (players.length === 0) return false;
  for (const p of players) {
    const stars = await ctx.db
      .query("star")
      .withIndex("by_session_and_voter", (q) =>
        q.eq("sessionId", sessionId).eq("voterId", p.userId),
      )
      .collect();
    if (stars.length < 3) return false;
  }
  return true;
}

/**
 * Handle session completion - advance next session or end battle
 */
export const handleSessionCompletion = internalMutation({
  args: { sessionId: v.id("vsSession") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const battle = await ctx.db.get(session.battleId);
    if (!battle) return null;

    // Find next session
    const nextSession = await ctx.db
      .query("vsSession")
      .withIndex("by_battleId_and_sessionNumber", (q) =>
        q
          .eq("battleId", session.battleId)
          .eq("sessionNumber", session.sessionNumber + 1),
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
      await ctx.scheduler.runAfter(
        0,
        internal.phase_transitions.calculateBattleChampion,
        {
          battleId: session.battleId,
        },
      );
    }

    return null;
  },
});

/**
 * Calculate session winner based on stars received
 * Placeholder for future phase.
 */
export const calculateSessionWinner = internalMutation({
  args: { sessionId: v.id("vsSession") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // Aggregate stars per user for this session
    const submissions = await ctx.db
      .query("submission")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
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

    // Update players' totalStarsEarned with stars received this session
    for (const [userId, { totalStars }] of userTotals) {
      const player = await ctx.db
        .query("player")
        .withIndex("by_battle_and_user", (q) =>
          q.eq("battleId", session.battleId).eq("userId", userId),
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
          q.eq("battleId", session.battleId).eq("userId", userId),
        )
        .first();
      if (player) {
        await ctx.db.patch(player._id, { sessionsWon: player.sessionsWon + 1 });
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
