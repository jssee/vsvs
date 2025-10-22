import { redirect, fail, error } from "@sveltejs/kit";
import * as z from "zod";
import { superValidate, message } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { Result } from "typescript-result";

import { requireAuth } from "$lib/server/auth-helpers";
import { api } from "$lib/convex/_generated/api";
import type { Actions, PageServerLoad } from "./$types";
import type { Id } from "$lib/convex/_generated/dataModel";
import { parseLocalDateTimeToUtcMs } from "$lib/time";

const formSchema = z.object({
  vibe: z.string().min(1, "Vibe is required").max(100, "Vibe too long"),
  description: z.string().optional(),
  submissionLocal: z.string().min(1, "Submission deadline required"),
  votingLocal: z.string().min(1, "Voting deadline required"),
  // Minutes to add to local time to get UTC (Date.getTimezoneOffset())
  tzOffset: z.coerce
    .number()
    .refine((n) => Number.isFinite(n), "Invalid timezone offset"),
});

export const load: PageServerLoad = async (event) => {
  const { params } = event;
  const { client, user } = await requireAuth(event);

  const battle = await client.query(api.battle.getBattle, {
    battleId: params.id as Id<"battle">,
    userId: user._id,
  });
  if (!battle) throw error(404, "Battle not found");

  return {
    battle,
    form: await superValidate(zod4(formSchema)),
  };
};

export const actions = {
  createStage: async (event) => {
    const { request, params } = event;
    const { client, user } = await requireAuth(event);

    const form = await superValidate(request, zod4(formSchema));
    if (!form.valid) return fail(400, { form });

    const submissionDeadline = parseLocalDateTimeToUtcMs(
      form.data.submissionLocal,
      form.data.tzOffset,
    );
    const votingDeadline = parseLocalDateTimeToUtcMs(
      form.data.votingLocal,
      form.data.tzOffset,
    );

    if (
      !Number.isFinite(submissionDeadline) ||
      !Number.isFinite(votingDeadline)
    ) {
      return fail(400, { message: "Invalid deadline format" });
    }
    if (votingDeadline <= submissionDeadline) {
      return fail(400, {
        message: "Voting deadline must be after submission deadline",
      });
    }

    const result = Result.try(
      async () =>
        await client.mutation(api.stage.addStage, {
          userId: user._id,
          battleId: params.id as Id<"battle">,
          vibe: form.data.vibe,
          description: form.data.description,
          submissionDeadline,
          votingDeadline,
        }),
    );

    return result.fold(
      (response) => {
        if (!response.success || !response.stageId) {
          // Surface Convex validation/auth messages instead of redirecting with an undefined stageId
          return message(form, response.message, { status: 400 });
        }
        return redirect(302, `/battles/${params.id}/stage/${response.stageId}`);
      },
      (err) => error(400, { message: err.message }),
    );
  },
} satisfies Actions;
