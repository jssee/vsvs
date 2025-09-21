import { fail, error } from "@sveltejs/kit";
import * as z from "zod";
import { superValidate, message } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { Result } from "typescript-result";

import { getConvexClient } from "$lib/convex-client";
import { api } from "$lib/convex/_generated/api";
import type { Id } from "$lib/convex/_generated/dataModel";
import type { Actions, PageServerLoad } from "./$types";

const convex = getConvexClient();

const inviteSchema = z.object({
  email: z.string().email("Invalid email"),
});

const addSessionSchema = z.object({
  vibe: z.string().min(1, "Vibe is required").max(100, "Vibe too long"),
  description: z.string().optional(),
  submissionDeadline: z.string().min(1, "Submission deadline required"),
  votingDeadline: z.string().min(1, "Voting deadline required"),
});

const submitSongSchema = z.object({
  sessionId: z.string().min(1, "Session is required"),
  spotifyUrl: z
    .string()
    .min(1, "URL is required")
    .refine(
      (s) =>
        /spotify\.com\/track\/[a-zA-Z0-9]{22}/.test(s) ||
        /^spotify:track:[a-zA-Z0-9]{22}$/.test(s),
      {
        message: "Must be a Spotify track URL",
      },
    ),
});

const removeSubmissionSchema = z.object({
  submissionId: z.string().min(1, "Submission ID required"),
});

const updateSubmissionSchema = z.object({
  submissionId: z.string().min(1, "Submission ID required"),
  spotifyUrl: z
    .string()
    .min(1, "URL is required")
    .refine(
      (s) =>
        /spotify\.com\/track\/[a-zA-Z0-9]{22}/.test(s) ||
        /^spotify:track:[a-zA-Z0-9]{22}$/.test(s),
      {
        message: "Must be a Spotify track URL",
      },
    ),
});

const awardStarSchema = z.object({
  submissionId: z.string().min(1, "Submission ID required"),
});

const removeStarSchema = z.object({
  submissionId: z.string().min(1, "Submission ID required"),
});

const generatePlaylistSchema = z.object({
  sessionId: z.string().min(1, "Session is required"),
});

export const load: PageServerLoad = async ({ params, locals }) => {
  const battleId = params.id as Id<"battles">;
  const battle = await convex.query(api.battles.getBattle, {
    battleId,
    userId: locals.user?._id,
  });
  if (!battle) throw error(404, "Battle not found");
  const players = await convex.query(api.players.getBattlePlayers, {
    battleId,
  });
  const sessions = await convex.query(api.sessions.getBattleSessions, {
    battleId,
  });
  const currentSession = await convex.query(api.sessions.getCurrentSession, {
    battleId,
  });
  let sessionSubmissions: Array<any> = [];
  let mySubmissions: Array<any> = [];
  let votingState: null | {
    starsRemaining: number;
    votedSubmissions: string[];
    canVote: boolean;
  } = null;
  if (currentSession) {
    sessionSubmissions = await convex.query(
      api.submissions.getSessionSubmissions,
      {
        sessionId: currentSession._id as Id<"vsSessions">,
        currentUserId: locals.user?._id,
      },
    );
    if (locals.user) {
      mySubmissions = await convex.query(
        api.submissions.getMySessionSubmissions,
        {
          sessionId: currentSession._id as Id<"vsSessions">,
          userId: locals.user._id,
        },
      );
      votingState = await convex.query(api.voting.getMyVotingState, {
        sessionId: currentSession._id as Id<"vsSessions">,
        userId: locals.user._id,
      });
    }
  }
  return {
    battle,
    players,
    sessions,
    currentSession,
    sessionSubmissions,
    mySubmissions,
    votingState,
    user: locals.user,
    inviteForm: await superValidate(zod4(inviteSchema)),
    addSessionForm: await superValidate(zod4(addSessionSchema)),
    submitSongForm: await superValidate(zod4(submitSongSchema)),
    removeSubmissionForm: await superValidate(zod4(removeSubmissionSchema)),
    updateSubmissionForm: await superValidate(zod4(updateSubmissionSchema)),
    awardStarForm: await superValidate(zod4(awardStarSchema)),
    removeStarForm: await superValidate(zod4(removeStarSchema)),
    generatePlaylistForm: await superValidate(zod4(generatePlaylistSchema)),
  };
};

export const actions = {
  invite: async ({ request, params, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });

    const form = await superValidate(request, zod4(inviteSchema));
    if (!form.valid) return fail(400, { form });

    const result = Result.try(
      async () =>
        await convex.mutation(api.invitations.sendInvitation, {
          userId: locals.user!._id,
          battleId: params.id as Id<"battles">,
          invitedEmail: form.data.email,
        }),
    );

    return result.fold(
      () => message(form, "Invitation sent successfully"),
      (err) => error(400, { message: err.message }),
    );
  },
  addSession: async ({ request, params, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });

    const form = await superValidate(request, zod4(addSessionSchema));
    if (!form.valid) return fail(400, { form });

    const submissionDeadline = Date.parse(form.data.submissionDeadline);
    const votingDeadline = Date.parse(form.data.votingDeadline);
    if (Number.isNaN(submissionDeadline) || Number.isNaN(votingDeadline)) {
      return fail(400, { message: "Invalid deadline format" });
    }
    if (votingDeadline <= submissionDeadline) {
      return fail(400, {
        message: "Voting deadline must be after submission deadline",
      });
    }

    const result = Result.try(
      async () =>
        await convex.mutation(api.sessions.addSession, {
          userId: locals.user!._id,
          battleId: params.id as Id<"battles">,
          vibe: form.data.vibe,
          description: form.data.description,
          submissionDeadline,
          votingDeadline,
        }),
    );

    return result.fold(
      () => message(form, "Session created successfully"),
      (err) => error(400, { message: err.message }),
    );
  },
  submitSong: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });

    const form = await superValidate(request, zod4(submitSongSchema));
    if (!form.valid) return fail(400, { form });

    const result = Result.try(
      async () =>
        await convex.mutation(api.submissions.submitSong, {
          userId: locals.user!._id,
          sessionId: form.data.sessionId as Id<"vsSessions">,
          spotifyUrl: form.data.spotifyUrl,
        }),
    );

    return result.fold(
      () => message(form, "Song submitted successfully"),
      (err) => error(400, { message: err.message }),
    );
  },
  removeSubmission: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });

    const form = await superValidate(request, zod4(removeSubmissionSchema));
    if (!form.valid) return fail(400, { form });

    const result = Result.try(
      async () =>
        await convex.mutation(api.submissions.removeSubmission, {
          userId: locals.user!._id,
          submissionId: form.data.submissionId as Id<"submissions">,
        }),
    );

    return result.fold(
      () => message(form, "Submission removed successfully"),
      (err) => error(400, { message: err.message }),
    );
  },
  updateSubmission: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });

    const form = await superValidate(request, zod4(updateSubmissionSchema));
    if (!form.valid) return fail(400, { form });

    const result = Result.try(
      async () =>
        await convex.mutation(api.submissions.updateSubmissionUrl, {
          userId: locals.user!._id,
          submissionId: form.data.submissionId as Id<"submissions">,
          spotifyUrl: form.data.spotifyUrl,
        }),
    );

    return result.fold(
      () => message(form, "Submission updated successfully"),
      (err) => error(400, { message: err.message }),
    );
  },
  awardStar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });

    const form = await superValidate(request, zod4(awardStarSchema));
    if (!form.valid) return fail(400, { form });

    const result = Result.try(
      async () =>
        await convex.mutation(api.voting.awardStar, {
          userId: locals.user!._id,
          submissionId: form.data.submissionId as Id<"submissions">,
        }),
    );

    return result.fold(
      () => message(form, "Star awarded successfully"),
      (err) => error(400, { message: err.message }),
    );
  },
  removeStar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });

    const form = await superValidate(request, zod4(removeStarSchema));
    if (!form.valid) return fail(400, { form });

    const result = Result.try(
      async () =>
        await convex.mutation(api.voting.removeStar, {
          userId: locals.user!._id,
          submissionId: form.data.submissionId as Id<"submissions">,
        }),
    );

    return result.fold(
      () => message(form, "Star removed successfully"),
      (err) => error(400, { message: err.message }),
    );
  },
  generatePlaylistNow: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });

    const form = await superValidate(request, zod4(generatePlaylistSchema));
    if (!form.valid) return fail(400, { form });

    const result = Result.try(
      async () =>
        await convex.action(api.spotify_actions.generatePlaylistNow, {
          userId: locals.user!._id,
          sessionId: form.data.sessionId as Id<"vsSessions">,
        }),
    );

    return result.fold(
      (data) => ({
        form,
        playlistUrl: data.playlistUrl,
      }),
      (err) => error(400, { message: err.message }),
    );
  },
} satisfies Actions;
