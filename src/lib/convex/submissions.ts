import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { validateSpotifyUrl, normalizeSpotifyUrl } from "../utils/spotify-urls";
import { decideSubmissionOrder } from "../server/utils/submission-logic";
import type { Id } from "./_generated/dataModel";

/**
 * Submit a song to the current session
 * Uses explicit userId (custom auth pattern for this repo)
 */
export const submitSong = mutation({
  args: {
    userId: v.id("user"),
    sessionId: v.id("vsSessions"),
    spotifyUrl: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    submissionId: v.optional(v.id("submissions")),
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

    // Check if session is in submission phase
    if (session.phase !== "submission") {
      return {
        success: false,
        message:
          session.phase === "pending"
            ? "Submission period hasn't started yet"
            : "Submission period has ended",
      };
    }

    // Check if submission deadline has passed
    if (Date.now() > session.submissionDeadline) {
      return { success: false, message: "Submission deadline has passed" };
    }

    const battle = await ctx.db.get(session.battleId);
    if (!battle) {
      return { success: false, message: "Battle not found" };
    }

    // Check if user is a player in this battle
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

    // Validate Spotify URL
    const urlValidation = validateSpotifyUrl(args.spotifyUrl);
    if (!urlValidation.isValid) {
      return { success: false, message: urlValidation.error! };
    }

    const normalizedUrl = normalizeSpotifyUrl(args.spotifyUrl);

    // Check for duplicate song in this session
    const existingSubmission = await ctx.db
      .query("submissions")
      .withIndex("by_session_and_url", (q) =>
        q.eq("sessionId", args.sessionId).eq("spotifyUrl", normalizedUrl),
      )
      .first();

    if (existingSubmission) {
      const existingUser = await ctx.db.get(existingSubmission.userId);
      return {
        success: false,
        message: `This song was already submitted by ${existingUser?.username || "another user"}`,
      };
    }

    // Get user's existing submissions for this session
    const userSubmissions = await ctx.db
      .query("submissions")
      .withIndex("by_session_and_user", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", args.userId),
      )
      .collect();

    // Determine submission order
    const orderDecision = decideSubmissionOrder(
      userSubmissions.length,
      battle.doubleSubmissions,
    );
    if (!orderDecision.ok) {
      return { success: false, message: orderDecision.message };
    }
    const submissionOrder = orderDecision.order;

    // Create submission
    const submissionId = await ctx.db.insert("submissions", {
      sessionId: args.sessionId,
      userId: args.userId,
      spotifyUrl: normalizedUrl,
      submissionOrder,
      submittedAt: Date.now(),
      starsReceived: 0,
    });

    const orderText = battle.doubleSubmissions
      ? submissionOrder === 1
        ? " (1st song)"
        : " (2nd song)"
      : "";

    return {
      success: true,
      submissionId,
      message: `Song submitted successfully${orderText}!`,
    };
  },
});

/**
 * Get all submissions for a session
 */
export const getSessionSubmissions = query({
  args: {
    sessionId: v.id("vsSessions"),
    currentUserId: v.optional(v.id("user")),
  },
  returns: v.array(
    v.object({
      _id: v.id("submissions"),
      userId: v.id("user"),
      username: v.string(),
      spotifyUrl: v.string(),
      submissionOrder: v.number(),
      submittedAt: v.number(),
      starsReceived: v.number(),
      isCurrentUser: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const submissionsWithDetails = await Promise.all(
      submissions.map(async (submission) => {
        const user = await ctx.db.get(submission.userId);

        return {
          _id: submission._id,
          userId: submission.userId,
          username: user?.username || "Unknown User",
          spotifyUrl: submission.spotifyUrl,
          submissionOrder: submission.submissionOrder,
          submittedAt: submission.submittedAt,
          starsReceived: submission.starsReceived,
          isCurrentUser: args.currentUserId
            ? submission.userId === args.currentUserId
            : false,
        };
      }),
    );

    // Sort by submission time
    return submissionsWithDetails.sort((a, b) => a.submittedAt - b.submittedAt);
  },
});

/**
 * Get current user's submissions for a session
 */
export const getMySessionSubmissions = query({
  args: { sessionId: v.id("vsSessions"), userId: v.id("user") },
  returns: v.array(
    v.object({
      _id: v.id("submissions"),
      spotifyUrl: v.string(),
      submissionOrder: v.number(),
      submittedAt: v.number(),
      starsReceived: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_session_and_user", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", args.userId),
      )
      .collect();

    return submissions
      .map((submission) => ({
        _id: submission._id,
        spotifyUrl: submission.spotifyUrl,
        submissionOrder: submission.submissionOrder,
        submittedAt: submission.submittedAt,
        starsReceived: submission.starsReceived,
      }))
      .sort((a, b) => a.submissionOrder - b.submissionOrder);
  },
});

/**
 * Remove a submission (only before deadline)
 */
export const removeSubmission = mutation({
  args: { userId: v.id("user"), submissionId: v.id("submissions") },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
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

    // Check if user owns this submission
    if (submission.userId !== args.userId) {
      return {
        success: false,
        message: "You can only remove your own submissions",
      };
    }

    const session = await ctx.db.get(submission.sessionId);
    if (!session) {
      return { success: false, message: "Session not found" };
    }

    // Check if still in submission phase
    if (session.phase !== "submission") {
      return {
        success: false,
        message: "Cannot remove submission after submission period ends",
      };
    }

    // Check if submission deadline has passed
    if (Date.now() > session.submissionDeadline) {
      return {
        success: false,
        message: "Cannot remove submission after deadline",
      };
    }

    // Remove the submission
    await ctx.db.delete(args.submissionId);

    return { success: true, message: "Submission removed successfully" };
  },
});

/**
 * Update a submission's Spotify URL (before deadline, owner only)
 */
export const updateSubmissionUrl = mutation({
  args: {
    userId: v.id("user"),
    submissionId: v.id("submissions"),
    spotifyUrl: v.string(),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return { success: false, message: "User not found" };

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return { success: false, message: "Submission not found" };

    if (submission.userId !== args.userId) {
      return {
        success: false,
        message: "You can only edit your own submissions",
      };
    }

    const session = await ctx.db.get(submission.sessionId);
    if (!session) return { success: false, message: "Session not found" };

    if (session.phase !== "submission") {
      return {
        success: false,
        message: "Cannot edit after submission period ends",
      };
    }

    if (Date.now() > session.submissionDeadline) {
      return { success: false, message: "Cannot edit after deadline" };
    }

    const urlValidation = validateSpotifyUrl(args.spotifyUrl);
    if (!urlValidation.isValid) {
      return { success: false, message: urlValidation.error! };
    }

    const normalizedUrl = normalizeSpotifyUrl(args.spotifyUrl);

    // If same as current, accept no-op
    if (normalizedUrl === submission.spotifyUrl) {
      return { success: true, message: "No changes" };
    }

    // Check for duplicate in session
    const duplicate = await ctx.db
      .query("submissions")
      .withIndex("by_session_and_url", (q) =>
        q.eq("sessionId", submission.sessionId).eq("spotifyUrl", normalizedUrl),
      )
      .first();
    if (duplicate && duplicate._id !== args.submissionId) {
      const dupUser = await ctx.db.get(duplicate.userId);
      return {
        success: false,
        message: `This song was already submitted by ${dupUser?.username || "another user"}`,
      };
    }

    await ctx.db.patch(args.submissionId, { spotifyUrl: normalizedUrl });
    return { success: true, message: "Submission updated" };
  },
});

/**
 * Get submission statistics for a session
 */
export const getSessionSubmissionStats = query({
  args: { sessionId: v.id("vsSessions") },
  returns: v.object({
    totalSubmissions: v.number(),
    uniqueSubmitters: v.number(),
    submissionsByUser: v.array(
      v.object({
        userId: v.id("user"),
        username: v.string(),
        submissionCount: v.number(),
        submissions: v.array(
          v.object({
            _id: v.id("submissions"),
            submissionOrder: v.number(),
            submittedAt: v.number(),
          }),
        ),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const userSubmissions = new Map<
      Id<"user">,
      {
        user: { _id: Id<"user">; username: string } | null;
        submissions: Array<{
          _id: Id<"submissions">;
          submissionOrder: number;
          submittedAt: number;
        }>;
      }
    >();

    for (const submission of submissions) {
      const userId = submission.userId;

      if (!userSubmissions.has(userId)) {
        const user = await ctx.db.get(userId);
        userSubmissions.set(userId, {
          user: user ? { _id: user._id, username: user.username } : null,
          submissions: [],
        });
      }

      userSubmissions.get(userId)!.submissions.push({
        _id: submission._id,
        submissionOrder: submission.submissionOrder,
        submittedAt: submission.submittedAt,
      });
    }

    const submissionsByUser = Array.from(userSubmissions.entries()).map(
      ([userId, data]) => ({
        userId,
        username: data.user?.username || "Unknown User",
        submissionCount: data.submissions.length,
        submissions: data.submissions.sort(
          (a, b) => a.submissionOrder - b.submissionOrder,
        ),
      }),
    );

    return {
      totalSubmissions: submissions.length,
      uniqueSubmitters: userSubmissions.size,
      submissionsByUser: submissionsByUser.sort((a, b) =>
        a.username.localeCompare(b.username),
      ),
    };
  },
});
