import { fail, error } from "@sveltejs/kit";
import { z } from "zod";
import { getConvexClient } from "$lib/server/convex-client";
import { api } from "$lib/server/convex/_generated/api";
import type { Id } from "$lib/server/convex/_generated/dataModel";

export const load = async ({ params, locals }) => {
  const convex = getConvexClient();
  const battleId = params.id as Id<"battles">;
  const battle = await convex.query(api.battles.getBattle, {
    battleId,
    userId: locals.user?._id,
  });
  if (!battle) throw error(404, "Battle not found");
  const players = await convex.query(api.players.getBattlePlayers, { battleId });
  const sessions = await convex.query(api.sessions.getBattleSessions, { battleId });
  const currentSession = await convex.query(api.sessions.getCurrentSession, { battleId });
  let sessionSubmissions: Array<any> = [];
  let mySubmissions: Array<any> = [];
  let votingState: null | { starsRemaining: number; votedSubmissions: string[]; canVote: boolean } = null;
  if (currentSession) {
    sessionSubmissions = await convex.query(api.submissions.getSessionSubmissions, {
      sessionId: currentSession._id as Id<"vsSessions">,
      currentUserId: locals.user?._id,
    });
    if (locals.user) {
      mySubmissions = await convex.query(api.submissions.getMySessionSubmissions, {
        sessionId: currentSession._id as Id<"vsSessions">,
        userId: locals.user._id,
      });
      votingState = await convex.query(api.voting.getMyVotingState, {
        sessionId: currentSession._id as Id<"vsSessions">,
        userId: locals.user._id,
      });
    }
  }
  return { battle, players, sessions, currentSession, sessionSubmissions, mySubmissions, votingState, user: locals.user };
};

export const actions = {
  invite: async ({ request, params, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });
    const form = await request.formData();
    const schema = z.object({ email: z.string().email("Invalid email") });
    const parsed = schema.safeParse({ email: String(form.get("email") || "").trim() });
    if (!parsed.success) return fail(400, { message: parsed.error.issues[0].message });
    const convex = getConvexClient();
    const result = await convex.mutation(api.invitations.sendInvitation, {
      userId: locals.user._id,
      battleId: params.id as Id<"battles">,
      invitedEmail: parsed.data.email,
    });
    if (!result.success) {
      return fail(400, { message: result.message });
    }
    return { success: true };
  },
  addSession: async ({ request, params, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });
    const form = await request.formData();
    const schema = z.object({
      vibe: z.string().min(1, "Vibe is required").max(100, "Vibe too long"),
      description: z.string().optional(),
      submissionDeadline: z.string().min(1, "Submission deadline required"),
      votingDeadline: z.string().min(1, "Voting deadline required"),
    });
    const parsed = schema.safeParse({
      vibe: String(form.get("vibe") || "").trim(),
      description: (String(form.get("description") || "").trim() || undefined) as any,
      submissionDeadline: String(form.get("submissionDeadline") || "").trim(),
      votingDeadline: String(form.get("votingDeadline") || "").trim(),
    });
    if (!parsed.success) return fail(400, { message: parsed.error.issues[0].message });

    const submissionDeadline = Date.parse(parsed.data.submissionDeadline);
    const votingDeadline = Date.parse(parsed.data.votingDeadline);
    if (Number.isNaN(submissionDeadline) || Number.isNaN(votingDeadline)) {
      return fail(400, { message: "Invalid deadline format" });
    }
    if (votingDeadline <= submissionDeadline) {
      return fail(400, { message: "Voting deadline must be after submission deadline" });
    }

    const convex = getConvexClient();
    const result = await convex.mutation(api.sessions.addSession, {
      userId: locals.user._id,
      battleId: params.id as Id<"battles">,
      vibe: parsed.data.vibe,
      description: parsed.data.description,
      submissionDeadline,
      votingDeadline,
    });

    if (!result.success) {
      return fail(400, { message: result.message });
    }

    return { success: true };
  },
  submitSong: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });
    const form = await request.formData();
    const schema = z.object({
      sessionId: z.string().min(1, "Session is required"),
      spotifyUrl: z
        .string()
        .min(1, "URL is required")
        .refine((s) => /spotify\.com\/track\/[a-zA-Z0-9]{22}/.test(s) || /^spotify:track:[a-zA-Z0-9]{22}$/.test(s), {
          message: "Must be a Spotify track URL",
        }),
    });
    const parsed = schema.safeParse({
      sessionId: String(form.get("sessionId") || "").trim(),
      spotifyUrl: String(form.get("spotifyUrl") || "").trim(),
    });
    if (!parsed.success) return fail(400, { message: parsed.error.issues[0].message });
    const convex = getConvexClient();
    const result = await convex.mutation(api.submissions.submitSong, {
      userId: locals.user._id,
      sessionId: parsed.data.sessionId as Id<"vsSessions">,
      spotifyUrl: parsed.data.spotifyUrl,
    });
    if (!result.success) return fail(400, { message: result.message });
    return { success: true };
  },
  removeSubmission: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });
    const form = await request.formData();
    const schema = z.object({ submissionId: z.string().min(1, "Submission ID required") });
    const parsed = schema.safeParse({ submissionId: String(form.get("submissionId") || "").trim() });
    if (!parsed.success) return fail(400, { message: parsed.error.issues[0].message });
    const convex = getConvexClient();
    const result = await convex.mutation(api.submissions.removeSubmission, {
      userId: locals.user._id,
      submissionId: parsed.data.submissionId as Id<"submissions">,
    });
    if (!result.success) return fail(400, { message: result.message });
    return { success: true };
  },
  updateSubmission: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });
    const form = await request.formData();
    const schema = z.object({
      submissionId: z.string().min(1, "Submission ID required"),
      spotifyUrl: z
        .string()
        .min(1, "URL is required")
        .refine((s) => /spotify\.com\/track\/[a-zA-Z0-9]{22}/.test(s) || /^spotify:track:[a-zA-Z0-9]{22}$/.test(s), {
          message: "Must be a Spotify track URL",
        }),
    });
    const parsed = schema.safeParse({
      submissionId: String(form.get("submissionId") || "").trim(),
      spotifyUrl: String(form.get("spotifyUrl") || "").trim(),
    });
    if (!parsed.success) return fail(400, { message: parsed.error.issues[0].message });
    const convex = getConvexClient();
    const result = await convex.mutation(api.submissions.updateSubmissionUrl, {
      userId: locals.user._id,
      submissionId: parsed.data.submissionId as Id<"submissions">,
      spotifyUrl: parsed.data.spotifyUrl,
    });
    if (!result.success) return fail(400, { message: result.message });
    return { success: true };
  },
  awardStar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });
    const form = await request.formData();
    const schema = z.object({ submissionId: z.string().min(1, "Submission ID required") });
    const parsed = schema.safeParse({ submissionId: String(form.get("submissionId") || "").trim() });
    if (!parsed.success) return fail(400, { message: parsed.error.issues[0].message });
    const convex = getConvexClient();
    const result = await convex.mutation(api.voting.awardStar, {
      userId: locals.user._id,
      submissionId: parsed.data.submissionId as Id<"submissions">,
    });
    if (!result.success) return fail(400, { message: result.message });
    return { success: true };
  },
  removeStar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });
    const form = await request.formData();
    const schema = z.object({ submissionId: z.string().min(1, "Submission ID required") });
    const parsed = schema.safeParse({ submissionId: String(form.get("submissionId") || "").trim() });
    if (!parsed.success) return fail(400, { message: parsed.error.issues[0].message });
    const convex = getConvexClient();
    const result = await convex.mutation(api.voting.removeStar, {
      userId: locals.user._id,
      submissionId: parsed.data.submissionId as Id<"submissions">,
    });
    if (!result.success) return fail(400, { message: result.message });
    return { success: true };
  },
};
