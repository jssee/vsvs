import { fail, error, type ActionFailure } from "@sveltejs/kit";
import * as z from "zod";
import {
  superValidate,
  message,
  type SuperValidated,
} from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { Result } from "typescript-result";

import { getAuth, requireAuth } from "$lib/server/auth-helpers";
import { api } from "$lib/convex/_generated/api";
import type { Id } from "$lib/convex/_generated/dataModel";
import type { Actions, PageServerLoad, ActionData } from "./$types";

const submitSongSchema = z.object({
  stageId: z.string().min(1, "Stage is required"),
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
  stageId: z.string().min(1, "Stage is required"),
});

export const load: PageServerLoad = async (event) => {
  const { params } = event;
  const { client, user } = await getAuth(event);

  // Create an unauthenticated client if needed
  const convexClient =
    client || (await import("$lib/convex-client")).getConvexClient();

  const battleId = params.id as Id<"battle">;
  const stageId = params.stageId as Id<"stage">;

  const battle = await convexClient.query(api.battle.getBattle, {
    battleId,
    userId: user?._id,
  });
  if (!battle) throw error(404, "Battle not found");

  const stages = await convexClient.query(api.stage.getBattleStages, {
    battleId,
  });
  const stage = stages.find((s) => s._id === stageId);
  if (!stage) throw error(404, "Stage not found");

  // Compute time remaining similar to getCurrentStage
  const now = Date.now();
  let timeRemaining: { phase: string; milliseconds: number; expired: boolean } =
    { phase: stage.phase, milliseconds: 0, expired: false };
  if (stage.phase === "submission") {
    timeRemaining = {
      phase: "submission",
      milliseconds: stage.submissionDeadline - now,
      expired: stage.submissionDeadline <= now,
    };
  } else if (stage.phase === "voting") {
    timeRemaining = {
      phase: "voting",
      milliseconds: stage.votingDeadline - now,
      expired: stage.votingDeadline <= now,
    };
  } else if (stage.phase === "completed") {
    timeRemaining = { phase: "completed", milliseconds: 0, expired: false };
  }

  const stageSubmissions = await convexClient.query(
    api.submission.getStageSubmissions,
    {
      stageId,
      currentUserId: user?._id,
    },
  );

  type MySubmissionsType = Awaited<
    ReturnType<
      typeof convexClient.query<typeof api.submission.getMyStageSubmissions>
    >
  >;
  let mySubmissions: MySubmissionsType = [];
  let votingState: null | {
    starsRemaining: number;
    votedSubmissions: string[];
    canVote: boolean;
  } = null;

  if (user) {
    mySubmissions = await convexClient.query(
      api.submission.getMyStageSubmissions,
      {
        stageId,
        userId: user._id,
      },
    );
    votingState = await convexClient.query(api.voting.getMyVotingState, {
      stageId,
      userId: user._id,
    });
  }

  return {
    battle,
    stage: { ...stage, timeRemaining },
    stageSubmissions,
    mySubmissions,
    votingState,
    user,
    submitSongForm: await superValidate(zod4(submitSongSchema)),
    removeSubmissionForm: await superValidate(zod4(removeSubmissionSchema)),
    updateSubmissionForm: await superValidate(zod4(updateSubmissionSchema)),
    awardStarForm: await superValidate(zod4(awardStarSchema)),
    removeStarForm: await superValidate(zod4(removeStarSchema)),
    generatePlaylistForm: await superValidate(zod4(generatePlaylistSchema)),
  };
};

export const actions = {
  submitSong: async (event) => {
    const { request } = event;
    const { client, user } = await requireAuth(event);

    const form = await superValidate(request, zod4(submitSongSchema));
    if (!form.valid) return fail(400, { form });

    const result = Result.try(
      async () =>
        await client.mutation(api.submission.submitSong, {
          userId: user._id,
          stageId: form.data.stageId as Id<"stage">,
          spotifyUrl: form.data.spotifyUrl,
        }),
    );

    return result.fold(
      () => message(form, "Song submitted successfully"),
      (err) => error(400, { message: err.message }),
    );
  },
  removeSubmission: async (event) => {
    const { request } = event;
    const { client, user } = await requireAuth(event);

    const form = await superValidate(request, zod4(removeSubmissionSchema));
    if (!form.valid) return fail(400, { form });

    const result = Result.try(
      async () =>
        await client.mutation(api.submission.removeSubmission, {
          userId: user._id,
          submissionId: form.data.submissionId as Id<"submission">,
        }),
    );

    return result.fold(
      () => message(form, "Submission removed successfully"),
      (err) => error(400, { message: err.message }),
    );
  },
  updateSubmission: async (event) => {
    const { request } = event;
    const { client, user } = await requireAuth(event);

    const form = await superValidate(request, zod4(updateSubmissionSchema));
    if (!form.valid) return fail(400, { form });

    const result = Result.try(
      async () =>
        await client.mutation(api.submission.updateSubmissionUrl, {
          userId: user._id,
          submissionId: form.data.submissionId as Id<"submission">,
          spotifyUrl: form.data.spotifyUrl,
        }),
    );

    return result.fold(
      () => message(form, "Submission updated successfully"),
      (err) => error(400, { message: err.message }),
    );
  },
  awardStar: async (event) => {
    const { request } = event;
    const { client, user } = await requireAuth(event);

    const form = await superValidate(request, zod4(awardStarSchema));
    if (!form.valid) return fail(400, { form });

    const result = Result.try(
      async () =>
        await client.mutation(api.voting.awardStar, {
          userId: user._id,
          submissionId: form.data.submissionId as Id<"submission">,
        }),
    );

    return result.fold(
      () => message(form, "Star awarded successfully"),
      (err) => error(400, { message: err.message }),
    );
  },
  removeStar: async (event) => {
    const { request } = event;
    const { client, user } = await requireAuth(event);

    const form = await superValidate(request, zod4(removeStarSchema));
    if (!form.valid) return fail(400, { form });

    const result = Result.try(
      async () =>
        await client.mutation(api.voting.removeStar, {
          userId: user._id,
          submissionId: form.data.submissionId as Id<"submission">,
        }),
    );

    return result.fold(
      () => message(form, "Star removed successfully"),
      (err) => error(400, { message: err.message }),
    );
  },
  generatePlaylistNow: async (event) => {
    const { request } = event;
    const { client, user } = await requireAuth(event);

    const form = await superValidate(request, zod4(generatePlaylistSchema));
    if (!form.valid) return fail(400, { form });

    const result = Result.try(
      async () =>
        await client.action(api.spotify_actions.generatePlaylistNow, {
          userId: user._id,
          stageId: form.data.stageId as Id<"stage">,
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
