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
  const sessionId = params.sessionId as Id<"vsSessions">;

  const battle = await convex.query(api.battles.getBattle, {
    battleId,
    userId: locals.user?._id,
  });
  if (!battle) throw error(404, "Battle not found");

  const sessions = await convex.query(api.sessions.getBattleSessions, {
    battleId,
  });
  const session = sessions.find((s) => s._id === sessionId);
  if (!session) throw error(404, "Session not found");

  // Compute time remaining similar to getCurrentSession
  const now = Date.now();
  let timeRemaining: { phase: string; milliseconds: number; expired: boolean } =
    { phase: session.phase, milliseconds: 0, expired: false };
  if (session.phase === "submission") {
    timeRemaining = {
      phase: "submission",
      milliseconds: session.submissionDeadline - now,
      expired: session.submissionDeadline <= now,
    };
  } else if (session.phase === "voting") {
    timeRemaining = {
      phase: "voting",
      milliseconds: session.votingDeadline - now,
      expired: session.votingDeadline <= now,
    };
  } else if (session.phase === "completed") {
    timeRemaining = { phase: "completed", milliseconds: 0, expired: false };
  }

  const sessionSubmissions = await convex.query(
    api.submissions.getSessionSubmissions,
    {
      sessionId,
      currentUserId: locals.user?._id,
    },
  );

  type MySubmissionsType = Awaited<
    ReturnType<
      typeof convex.query<typeof api.submissions.getMySessionSubmissions>
    >
  >;
  let mySubmissions: MySubmissionsType = [];
  let votingState: null | {
    starsRemaining: number;
    votedSubmissions: string[];
    canVote: boolean;
  } = null;

  if (locals.user) {
    mySubmissions = await convex.query(
      api.submissions.getMySessionSubmissions,
      {
        sessionId,
        userId: locals.user._id,
      },
    );
    votingState = await convex.query(api.voting.getMyVotingState, {
      sessionId,
      userId: locals.user._id,
    });
  }

  return {
    battle,
    session: { ...session, timeRemaining },
    sessionSubmissions,
    mySubmissions,
    votingState,
    user: locals.user,
    submitSongForm: await superValidate(zod4(submitSongSchema)),
    removeSubmissionForm: await superValidate(zod4(removeSubmissionSchema)),
    updateSubmissionForm: await superValidate(zod4(updateSubmissionSchema)),
    awardStarForm: await superValidate(zod4(awardStarSchema)),
    removeStarForm: await superValidate(zod4(removeStarSchema)),
    generatePlaylistForm: await superValidate(zod4(generatePlaylistSchema)),
  };
};

export const actions = {
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
